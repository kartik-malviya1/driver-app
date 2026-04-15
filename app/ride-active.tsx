import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { updateRideStatus, getRideStatus } from "../services/api";
import { wsManager } from "../services/websocket";
import { GOOGLE_API_KEY } from "../constants/config";
import MapViewDirections from "react-native-maps-directions";

const { width } = Dimensions.get("window");

const MAP_STYLE = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
];

// ─── Inline Toast ────────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
}

const TOAST_COLORS: Record<ToastVariant, string> = {
  success: "#2E8536",
  error: "#D32F2F",
  info: "#1A73E8",
  warning: "#E65100",
};

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: "checkmark-circle",
  error: "close-circle",
  info: "information-circle",
  warning: "warning",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function RideActiveScreen() {
  const {
    rideId,
    pickupLat,
    pickupLng,
    pickupAddress,
    dropLat,
    dropLng,
    otp: routeOtp,
    userName: routeUserName,
  } = useLocalSearchParams<{
    rideId: string;
    pickupLat: string;
    pickupLng: string;
    pickupAddress?: string;
    dropLat: string;
    dropLng: string;
    otp?: string;
    userName?: string;
  }>();

  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [status, setStatus] = useState<"ACCEPTED" | "STARTED" | "COMPLETED">("ACCEPTED");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [rideData, setRideData] = useState<any>(null);
  const [passengerLoc, setPassengerLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [rideCancelled, setRideCancelled] = useState(false);
  const cancelCountdown = useRef<ReturnType<typeof setInterval> | null>(null);
  const [redirectSecs, setRedirectSecs] = useState(4);

  // ── Toast ──
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    variant: "info",
  });
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 3000) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ visible: true, message, variant });
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast((prev) => ({ ...prev, visible: false })));
      }, duration);
    },
    [toastAnim],
  );

  // ── Fetch ride data ──
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getRideStatus(Number(rideId));
        console.log("Fetched ride status:", data);
        setRideData(data);
        
        // Handle nested ride object from your JSON response
        const currentStatus = data.ride?.status || data.status;
        
        if (currentStatus === "STARTED") {
          setStatus("STARTED");
        } else if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
          router.replace("/home");
        }
      } catch (err) {
        console.error("Failed to fetch ride status:", err);
      }
    };
    fetchStatus();
  }, [rideId]);

  // ── Location tracking ──
  useEffect(() => {
    let locationSub: any;
    let headingSub: any;

    (async () => {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") return;

      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (newLoc) => {
          setLocation(newLoc);
          if (user) {
            wsManager.sendLocationUpdate(
              user.id,
              newLoc.coords.latitude,
              newLoc.coords.longitude,
            );
          }
        },
      );
      headingSub = await Location.watchHeadingAsync((h) => setHeading(h.trueHeading));
    })();

    return () => {
      locationSub?.remove();
      headingSub?.remove();
    };
  }, [user]);

  // ── WebSocket events ──
  useEffect(() => {
    const unsubscribe = wsManager.onMessage((data) => {
      if (data.event === "RIDE_CANCELLED" && Number(data.rideId) === Number(rideId)) {
        setRideCancelled(true);
        setRedirectSecs(4);
        cancelCountdown.current = setInterval(() => {
          setRedirectSecs((prev) => {
            if (prev <= 1) {
              clearInterval(cancelCountdown.current!);
              router.replace("/home");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      if (data.event === "USER_LOCATION" && Number(data.rideId) === Number(rideId)) {
        setPassengerLoc({ lat: data.lat, lng: data.lng });
      }
    });
    return () => {
      unsubscribe();
      if (cancelCountdown.current) clearInterval(cancelCountdown.current);
    };
  }, [rideId]);

  // ── Actions ──
  const handleStartRide = async () => {
    if (!otp || otp.length < 4) {
      showToast("Please enter the 4-digit OTP provided by the rider.", "error");
      return;
    }
    setLoading(true);
    try {
      await updateRideStatus(Number(rideId), "STARTED", Number(otp));
      setStatus("STARTED");
      showToast("Ride started! Head to the destination.", "success");
    } catch (err: any) {
      showToast(err.message || "Incorrect OTP. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    setLoading(true);
    try {
      await updateRideStatus(Number(rideId), "COMPLETED");
      setStatus("COMPLETED");
      setRideCompleted(true);
      showToast("Ride completed! Great job 🎉", "success", 3000);
      setTimeout(() => router.replace("/home"), 3200);
    } catch (err: any) {
      showToast(err.message || "Failed to complete ride.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Map fitting ──
  const centerOnMarkers = useCallback(() => {
    if (!location) return;
    const coordinates = [
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      { latitude: Number(pickupLat), longitude: Number(pickupLng) },
    ];
    if (passengerLoc) {
      coordinates.push({
        latitude: passengerLoc.lat,
        longitude: passengerLoc.lng,
      });
    }
    if (dropLat && dropLng) {
      coordinates.push({
        latitude: Number(dropLat),
        longitude: Number(dropLng),
      });
    }
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 380, left: 50 },
      animated: true,
    });
  }, [location, pickupLat, pickupLng, passengerLoc, dropLat, dropLng]);

  useEffect(() => {
    if (location) centerOnMarkers();
  }, [location, passengerLoc]);

  // Derived display values pulling from the correct API nested structures
  const rideObj = rideData?.ride || {};
  const displayName = rideData?.userName?.trim() || routeUserName || "Rider";
  const displayPickup = rideObj.pickupAddress || pickupAddress || "Fetching pickup location...";
  const displayDrop = rideObj.dropAddress || "Fetching drop-off location...";
  const tripPrice = rideObj.price ? `₹${rideObj.price}` : null;

  const statusColor = status === "ACCEPTED" ? Theme.colors.green : Theme.colors.orange;
  const statusLabel = status === "ACCEPTED" ? "EN ROUTE TO PICKUP" : "TRIP IN PROGRESS";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Map ──────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={MAP_STYLE}
        initialRegion={{
          latitude: Number(pickupLat) || 23.1916,
          longitude: Number(pickupLng) || 77.4335,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Driver */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            flat
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.navArrow,
                { transform: [{ rotate: `${heading}deg` }] },
              ]}
            >
              <MaterialCommunityIcons
                name="navigation"
                size={20}
                color={Theme.colors.green}
              />
            </View>
          </Marker>
        )}

        {/* Pickup */}
        <Marker
          coordinate={{
            latitude: Number(pickupLat),
            longitude: Number(pickupLng),
          }}
          title="Pickup Point"
        >
          <View style={styles.pickupMarker}>
            <View style={styles.pickupMarkerInner} />
          </View>
        </Marker>

        {/* Passenger (live) */}
        {passengerLoc && (
          <Marker
            coordinate={{
              latitude: passengerLoc.lat,
              longitude: passengerLoc.lng,
            }}
            title={`${displayName}'s Location`}
          >
            <View style={styles.passengerMarker}>
              <Ionicons name="person" size={16} color="white" />
            </View>
          </Marker>
        )}

        {/* Destination */}
        {dropLat && dropLng && (
          <Marker
            coordinate={{
              latitude: Number(dropLat),
              longitude: Number(dropLng),
            }}
            title="Destination"
          >
            <View style={styles.destMarker}>
              <Ionicons name="location" size={18} color="white" />
            </View>
          </Marker>
        )}

        {/* Route */}
        {location && (
          <MapViewDirections
            origin={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            destination={
              status === "ACCEPTED"
                ? { latitude: Number(pickupLat), longitude: Number(pickupLng) }
                : { latitude: Number(dropLat), longitude: Number(dropLng) }
            }
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor={status === "ACCEPTED" ? Theme.colors.green : Theme.colors.orange}
          />
        )}
      </MapView>

      {/* ── Shield badge (top-left) ───────────────── */}
      <View style={[styles.shieldBadge, { top: insets.top + 10 }]}>
        <Ionicons name="shield-checkmark" size={18} color={Theme.colors.green} />
        <Text style={styles.shieldText}>Active Trip</Text>
      </View>

      {/* ── Inline Toast ──────────────────────────── */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            {
              top: insets.top + 60,
              backgroundColor: TOAST_COLORS[toast.variant],
            },
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name={TOAST_ICONS[toast.variant] as any} size={18} color="white" />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      {/* ── Bottom Card ───────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          pointerEvents="box-none"
        >
          <View style={styles.card}>
            <View style={styles.handle} />

            {/* Header Row: Status Pill & Price */}
            <View style={styles.headerRow}>
              <View style={[styles.statusPill, { backgroundColor: statusColor + "18" }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              {tripPrice && (
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>{tripPrice}</Text>
                </View>
              )}
            </View>

            {/* Rider info */}
            <View style={styles.riderRow}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{displayName}</Text>
                <Text style={styles.riderSubText}>Passenger</Text>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Ionicons name="call" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Visual Address Route Section */}
            <View style={styles.routeContainer}>
              <View style={styles.routeTimeline}>
                <View style={styles.pickupDot} />
                <View style={styles.routeLine} />
                <View style={styles.dropDot} />
              </View>
              <View style={styles.routeAddresses}>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>PICKUP</Text>
                  <Text style={styles.addressValue} numberOfLines={2}>{displayPickup}</Text>
                </View>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>DROP-OFF</Text>
                  <Text style={styles.addressValue} numberOfLines={2}>{displayDrop}</Text>
                </View>
              </View>
            </View>

            {/* OTP / Complete section */}
            {status === "ACCEPTED" ? (
              <View style={styles.actionSection}>
                <View style={styles.actionTextWrapper}>
                  <Text style={styles.sectionTitle}>Enter Rider OTP</Text>
                  <Text style={styles.sectionSub}>Ask the rider for their 4-digit code</Text>
                </View>
                <TextInput
                  style={styles.otpInput}
                  placeholder="• • • •"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                  placeholderTextColor={Theme.colors.lightGray}
                />
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    otp.length === 4 && styles.primaryButtonActive,
                  ]}
                  onPress={handleStartRide}
                  disabled={loading || otp.length < 4}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={styles.btnInner}>
                      <Ionicons name="play-circle" size={20} color="white" />
                      <Text style={styles.buttonText}>START RIDE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionSection}>
                <View style={styles.actionTextWrapper}>
                  <Text style={styles.sectionTitle}>Reach Drop-off</Text>
                  <Text style={styles.sectionSub}>Safely drop off {displayName}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: Theme.colors.orange }]}
                  onPress={handleCompleteRide}
                  disabled={loading || rideCompleted}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={styles.btnInner}>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.buttonText}>COMPLETE RIDE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Shield badge
  shieldBadge: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    gap: 6,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  shieldText: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.green,
  },

  // Toast
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: width - 40,
    zIndex: 999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },

  // Map markers
  navArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Theme.colors.green,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  pickupMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.green + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  pickupMarkerInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Theme.colors.green,
  },
  passengerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.black,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  destMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.orange,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  // Bottom card
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  priceContainer: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.black,
  },

  // Rider info
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  riderAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  riderAvatarText: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.black,
    marginBottom: 2,
  },
  riderSubText: {
    fontSize: 13,
    color: Theme.colors.gray,
    fontWeight: "600",
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.green,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Theme.colors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 16,
  },

  // Route Address Section
  routeContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  routeTimeline: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.green,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  dropDot: {
    width: 10,
    height: 10,
    backgroundColor: Theme.colors.orange,
    marginBottom: 4,
  },
  routeAddresses: {
    flex: 1,
    gap: 16,
  },
  addressBlock: {
    justifyContent: "center",
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.gray,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  addressValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Theme.colors.black,
    lineHeight: 20,
  },

  // Action section
  actionSection: {
    gap: 12,
  },
  actionTextWrapper: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.black,
  },
  sectionSub: {
    fontSize: 14,
    color: Theme.colors.gray,
    marginTop: 2,
  },
  otpInput: {
    width: "100%",
    height: 56,
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 12,
    color: Theme.colors.black,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
  },
  primaryButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#E0E0E0",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 4,
  },
  primaryButtonActive: {
    backgroundColor: Theme.colors.green,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});