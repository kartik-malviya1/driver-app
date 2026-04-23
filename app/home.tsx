import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RideRequestModal from '../components/RideRequestModal';
import { LOCATION_UPDATE_INTERVAL } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import {
    acceptRide as acceptRideApi,
    getActiveRide,
    getDriverHomeData,
    updateLocationRest,
    type DriverHomeResponse,
} from '../services/api';
import { wsManager } from '../services/websocket';

interface Ride {
    id: string;
    status: string;
    pickup_address: string;
    destination_address: string;
    pickup_lat: number;
    pickup_lng: number;
    destination_lat: number;
    destination_lng: number;
    price: number;
    payment_mode: string;
    rider_rating?: number;
    pickup_distance_text?: string;
    trip_duration_text?: string;
    trip_distance_text?: string;
}

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY;

// Brand colors matching SawariAuto rider app
const BRAND = {
    yellow: '#FFD400',
    black: '#1A1A1A',
    green: '#33B54A',
    greenDark: '#1D8C32',
    white: '#FFFFFF',
    gray: '#AAAAAA',
    lightGray: '#F8F8F8',
    border: '#F0F0F0',
    orange: '#FF6B35',
};

const MAP_STYLE = [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
];

export default function HomeScreen() {
    const { user, isOnline, setIsOnline } = useAuth();
    const insets = useSafeAreaInsets();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [heading, setHeading] = useState<number>(0);
    // const [isOnline, setIsOnline] = useState<boolean>(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [showRideRequest, setShowRideRequest] = useState<boolean>(false);
    const [currentRide, setCurrentRide] = useState<Ride | null>(null);
    const [homeData, setHomeData] = useState<DriverHomeResponse | null>(null);
    const [cancelledBanner, setCancelledBanner] = useState<string | null>(null);
    const cancelledBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showCancelBanner = useCallback((msg: string) => {
        if (cancelledBannerTimer.current) clearTimeout(cancelledBannerTimer.current);
        setCancelledBanner(msg);
        cancelledBannerTimer.current = setTimeout(() => setCancelledBanner(null), 4000);
    }, []);
    const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasCenteredOnUserRef = useRef(false);
    const badgeCount = homeData?.stats.lifetimeTrips ?? 0;
    const badgeText = badgeCount > 99 ? '99+' : String(badgeCount);
    const headerEarningsText = (homeData?.stats.todayEarnings ?? 0).toFixed(2);
    const todayTripsText = String(homeData?.stats.todayTrips ?? 0);
    const todayEarningsText = `₹${(homeData?.stats.todayEarnings ?? 0).toFixed(0)}`;
    const ratingText = homeData?.driver.rating != null ? `${homeData.driver.rating.toFixed(1)} ★` : '--';

    // Refs for WebSocket listener to avoid frequent resubs
    const locationRef = useRef(location);
    const showRideRequestRef = useRef(showRideRequest);
    const currentRideRef = useRef(currentRide);

    useEffect(() => { locationRef.current = location; }, [location]);
    useEffect(() => { showRideRequestRef.current = showRideRequest; }, [showRideRequest]);
    useEffect(() => { currentRideRef.current = currentRide; }, [currentRide]);

    // Pulse animation for GO button
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        if (!isOnline) pulse.start();
        else pulse.stop();
        return () => pulse.stop();
    }, [isOnline]);

    const snapPoints = useMemo(() =>
        isOnline ? ['14%', '42%', '88%'] : ['14%'],
        [isOnline]);

    // ─── Location Permissions & Tracking ───
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            try {
                const activeRide = await getActiveRide();
                if (activeRide && activeRide.id) {
                    router.replace({
                        pathname: '/ride-active',
                        params: {
                            rideId: String(activeRide.id),
                            pickupLat: String(activeRide.pickupLocationLat),
                            pickupLng: String(activeRide.pickupLocationLng),
                            pickupAddress: activeRide.pickup_address || '',
                            dropLat: String(activeRide.dropLocationLat),
                            dropLng: String(activeRide.dropLocationLng),
                        },
                    });
                }
            } catch (err) {
                console.log('No active ride:', err);
            }

            const locationSub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 1 },
                (newLoc) => setLocation(newLoc)
            );
            const headingSub = await Location.watchHeadingAsync((h) => setHeading(h.trueHeading));

            // Auto-reconnect WS if we are persistently online
            if (isOnline && user) {
                console.log('[Home] Persistently online, reconnecting WS...');
                wsManager.connect(user.id);
                if (loc) {
                    await updateLocationRest(user.id, loc.coords.latitude, loc.coords.longitude);
                }
                
                if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = setInterval(() => {
                    const curLoc = locationRef.current;
                    if (curLoc && user) {
                        wsManager.sendLocationUpdate(user.id, curLoc.coords.latitude, curLoc.coords.longitude);
                    }
                }, LOCATION_UPDATE_INTERVAL);
            }

            return () => {
                locationSub.remove();
                headingSub.remove();
            };
        })();
    }, []);

    const loadHomeData = useCallback(async () => {
        try {
            const data = await getDriverHomeData();
            setHomeData(data);
            return data;
        } catch (err) {
            console.log('Failed to load home data:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        loadHomeData();
    }, [loadHomeData]);

    // ─── WebSocket: ride requests ───
    useEffect(() => {
        if (!isOnline) return;
        console.log('[Home] Registering WebSocket message handler');
        const unsubscribe = wsManager.onMessage(async (data) => {
            console.log('[Home] Received WS event:', data.event);

            // ── Rider cancelled before driver accepted ──
            if (data.event === 'RIDE_CANCELLED') {
                if (showRideRequestRef.current && currentRideRef.current?.id === String(data.rideId)) {
                    setShowRideRequest(false);
                    setCurrentRide(null);
                }
                showCancelBanner('Rider cancelled the request.');
                return;
            }

            if (data.event === 'NEW_RIDE_REQUEST' && !showRideRequestRef.current) {
                const pickupLat: number = data.pickup?.lat;
                const pickupLng: number = data.pickup?.lng;
                const dropLat: number = data.drop?.lat;
                const dropLng: number = data.drop?.lng;
console.log('[Home] Ride request details:', { pickupLat, pickupLng, dropLat, dropLng, data });
                // 1. Show the modal immediately with what we have (addresses or coords)
                const rideBase = {
                    id: String(data.rideId),
                    status: 'REQUESTED',
                    pickup_address: data.pickupAddress || `${pickupLat}, ${pickupLng}`,
                    destination_address: data.dropAddress || `${dropLat}, ${dropLng}`,
                    pickup_lat: pickupLat,
                    pickup_lng: pickupLng,
                    destination_lat: dropLat,
                    destination_lng: dropLng,
                    price: data.price || 0,
                    payment_mode: data.paymentMode || 'CASH',
                };
                setCurrentRide(rideBase);
                setShowRideRequest(true);

                // 3. Optionally fetch distance / ETA from Google Maps (key-dependent)
                const curLoc = locationRef.current;
                if (GOOGLE_MAPS_APIKEY && curLoc) {
                    const fetchDistanceInfo = async () => {
                        try {
                            const driverCoords = `${curLoc.coords.latitude},${curLoc.coords.longitude}`;
                            const pickupCoords = `${pickupLat},${pickupLng}`;
                            const dropCoords = `${dropLat},${dropLng}`;
                            const distRes = await fetch(
                                `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${driverCoords}|${pickupCoords}&destinations=${pickupCoords}|${dropCoords}&key=${GOOGLE_MAPS_APIKEY}`
                            ).then(r => r.json());

                            const driverToPickup = distRes?.rows?.[0]?.elements?.[0];
                            const tripDetails = distRes?.rows?.[1]?.elements?.[1];

                            setCurrentRide(prev =>
                                prev && prev.id === String(data.rideId)
                                    ? {
                                          ...prev,
                                          pickup_distance_text: driverToPickup?.duration?.text || 'Nearby',
                                          trip_duration_text: tripDetails?.duration?.text || '',
                                          trip_distance_text: tripDetails?.distance?.text || '',
                                      }
                                    : prev
                            );
                        } catch (err) {
                            console.warn('[Home] Distance matrix fetch failed:', err);
                        }
                    };
                    fetchDistanceInfo();
                }
            }

        });
        return () => {
            console.log('[Home] Unsubscribing from WebSocket');
            unsubscribe();
        };
    }, [isOnline]); // Stable listener, only re-run if online status changes

    useEffect(() => {
        const timer = setTimeout(() => bottomSheetRef.current?.snapToIndex(0), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!location || !mapRef.current || hasCenteredOnUserRef.current) return;

        mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        }, 500);
        hasCenteredOnUserRef.current = true;
    }, [location]);

    const centerOnUser = useCallback(() => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 800);
        }
    }, [location]);

    const toggleOnline = async () => {
        if (isUpdatingStatus) return;
        const nextState = !isOnline;
        setIsUpdatingStatus(true);

        if (nextState) {
            // Refetch home data to check latest approval status
            const data = await loadHomeData();
            
            if (!data?.driver.isApproved) {
                Alert.alert(
                    'Account Pending Approval',
                    'Your documents are being reviewed. You will be able to go online once the admin approves your account.',
                    [{ text: 'OK' }]
                );
                setIsUpdatingStatus(false);
                return;
            }
            if (!user || !location) { setIsUpdatingStatus(false); return; }
            try {
                wsManager.connect(user.id);
                // Also send initial REST location update to ensure backend marks us as active
                await updateLocationRest(user.id, location.coords.latitude, location.coords.longitude);

                if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = setInterval(() => {
                    const curLoc = locationRef.current;
                    if (curLoc && user) {
                        wsManager.sendLocationUpdate(user.id, curLoc.coords.latitude, curLoc.coords.longitude);
                    }
                }, LOCATION_UPDATE_INTERVAL);
                await setIsOnline(true);
            } catch (err) {
                console.error('Failed to go online:', err);
            }
        } else {
            wsManager.disconnect();
            if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; }
            bottomSheetRef.current?.snapToIndex(0);
            await setIsOnline(false);
        }
        setIsUpdatingStatus(false);
    };

    useEffect(() => {
        return () => {
            wsManager.disconnect();
            if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        };
    }, []);

    const renderHeader = () => (
        <View style={[styles.headerContainer, { top: insets.top + 10 }]}>
            {/* Menu button with notification badge */}
            <TouchableOpacity
                style={styles.navBtn}
                onPress={() => router.push('/account')}
                activeOpacity={0.8}
            >
                <Ionicons name="menu" size={22} color={BRAND.black} />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
            </TouchableOpacity>

            {/* Brand pill — matches rider app */}
            <View style={styles.brandPill}>
                <Text style={styles.brandText}>
                    <Text style={styles.brandSawari}>Sawari</Text>
                    <Text style={styles.brandAuto}>Auto</Text>
                </Text>
                <View style={styles.driverTag}>
                    <Text style={styles.driverTagText}>DRIVER</Text>
                </View>
            </View>

            {/* Earnings pill */}
            <TouchableOpacity style={styles.earningsPill} activeOpacity={0.85}>
                <Text style={styles.earningsSymbol}>₹</Text>
                <Text style={styles.earningsValue}>{headerEarningsText}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFloatingButtons = () => (
        <View style={[styles.rightButtonsContainer, { bottom: height * 0.22 }]}>
            {/* Recenter */}
            <TouchableOpacity
                style={[styles.floatBtn, styles.shadow]}
                onPress={centerOnUser}
                activeOpacity={0.85}
            >
                <Ionicons name="navigate" size={20} color={BRAND.green} />
            </TouchableOpacity>

            {/* Stats */}
            <TouchableOpacity style={[styles.floatBtn, styles.shadow]} activeOpacity={0.85}>
                <Ionicons name="bar-chart" size={20} color={BRAND.black} />
            </TouchableOpacity>

            {/* Safety */}
            <TouchableOpacity style={[styles.floatBtn, styles.shadow]} activeOpacity={0.85}>
                <Ionicons name="shield-checkmark" size={20} color={BRAND.green} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                customMapStyle={MAP_STYLE}
                initialRegion={{
                    latitude: location?.coords.latitude || 21.1458,
                    longitude: location?.coords.longitude || 79.0882,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                showsUserLocation={false}
                rotateEnabled
                pitchEnabled
            >
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        flat
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={[styles.navArrowWrap, { transform: [{ rotate: `${heading}deg` }] }]}>
                            <View style={[
                                styles.navArrowOuter,
                                isOnline && { borderColor: BRAND.green, backgroundColor: BRAND.green + '15' }
                            ]}>
                                <MaterialCommunityIcons
                                    name="navigation"
                                    size={18}
                                    color={isOnline ? BRAND.green : BRAND.black}
                                />
                            </View>
                        </View>
                    </Marker>
                )}
            </MapView>

            {renderHeader()}
            {renderFloatingButtons()}

            {/* ── Cancellation Banner ── */}
            {cancelledBanner && (
                <View style={styles.cancelBanner}>
                    <Ionicons name="close-circle" size={18} color="white" />
                    <Text style={styles.cancelBannerText}>{cancelledBanner}</Text>
                </View>
            )}

            {/* GO Button — shown when offline */}
            {!isOnline && (
                <TouchableOpacity
                    style={styles.goButtonWrap}
                    onPress={toggleOnline}
                    disabled={isUpdatingStatus}
                    activeOpacity={0.9}
                >
                    <Animated.View style={[styles.goPulse, { transform: [{ scale: pulseAnim }] }]} />
                    <LinearGradient
                        colors={[BRAND.green, BRAND.greenDark]}
                        style={styles.goButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {isUpdatingStatus ? (
                            <ActivityIndicator color={BRAND.white} />
                        ) : (
                            <Text style={styles.goText}>GO</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandle}
                style={{ zIndex: 100 }}
                enableContentPanningGesture={isOnline}
                enableHandlePanningGesture={isOnline}
            >
                <BottomSheetView style={styles.sheetContent}>

                    {/* Status Row */}
                    <View style={styles.sheetStatusRow}>
                        <TouchableOpacity style={styles.sheetIconBtn}>
                            <MaterialCommunityIcons name="tune-variant" size={22} color={BRAND.black} />
                        </TouchableOpacity>

                        <View style={styles.statusCenter}>
                            <View style={[styles.statusDot, { backgroundColor: isOnline ? BRAND.green : BRAND.gray }]} />
                            <Text style={styles.statusText}>
                                {isOnline ? "You're online" : "You're offline"}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.sheetIconBtn}>
                            <MaterialCommunityIcons name="account-circle-outline" size={22} color={BRAND.black} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sheetDivider} />

                    {/* Subtitle */}
                    <Text style={styles.sheetSubtitle}>
                        {isOnline
                            ? 'Searching for trips near you. Stay on the map to receive requests.'
                            : 'Tap GO on the map to start accepting rides.'}
                    </Text>

                    {/* Online stats or offline CTA */}
                    {isOnline ? (
                        <>
                            {/* Today's stats strip */}
                            <View style={styles.statsStrip}>
                                <View style={styles.statBlock}>
                                    <Text style={styles.statValue}>{todayTripsText}</Text>
                                    <Text style={styles.statLabel}>TRIPS</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statBlock}>
                                    <Text style={[styles.statValue, { color: BRAND.green }]}>{todayEarningsText}</Text>
                                    <Text style={styles.statLabel}>EARNED</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statBlock}>
                                    <Text style={styles.statValue}>{ratingText}</Text>
                                    <Text style={styles.statLabel}>RATING</Text>
                                </View>
                            </View>

                            {/* Go Offline button */}
                            <TouchableOpacity
                                style={styles.offlineBtn}
                                onPress={toggleOnline}
                                disabled={isUpdatingStatus}
                                activeOpacity={0.85}
                            >
                                {isUpdatingStatus ? (
                                    <ActivityIndicator color={BRAND.white} />
                                ) : (
                                    <Text style={styles.offlineBtnText}>GO OFFLINE</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* Offline tip cards */
                        <View style={styles.tipRow}>
                            <View style={styles.tipCard}>
                                <Ionicons name="time-outline" size={20} color={BRAND.green} />
                                <Text style={styles.tipTitle}>Peak hours</Text>
                                <Text style={styles.tipSub}>8–10 AM, 5–8 PM</Text>
                            </View>
                            <View style={styles.tipCard}>
                                <Ionicons name="trending-up-outline" size={20} color={BRAND.yellow} />
                                <Text style={styles.tipTitle}>Surge active</Text>
                                <Text style={styles.tipSub}>Sitabuldi area</Text>
                            </View>
                        </View>
                    )}
                </BottomSheetView>
            </BottomSheet>

            <RideRequestModal
                isVisible={showRideRequest}
                ride={currentRide}
                onAccept={async (rideId) => {
                    try {
                        const response = await acceptRideApi(Number(rideId));
                        setShowRideRequest(false);
                        if (currentRide) {
                            router.push({
                                pathname: '/ride-active',
                                params: {
                                    rideId: String(rideId),
                                    pickupLat: String(currentRide.pickup_lat),
                                    pickupLng: String(currentRide.pickup_lng),
                                    pickupAddress: currentRide.pickup_address,
                                    dropLat: String(currentRide.destination_lat),
                                    dropLng: String(currentRide.destination_lng),
                                    otp: String(response.otp),
                                },
                            });
                        }
                    } catch (err) {
                        console.error('Failed to accept ride:', err);
                    }
                }}
                onClose={() => setShowRideRequest(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BRAND.lightGray,
    },

    // ─── Cancellation Banner ──────────────────────────────────
    cancelBanner: {
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#D32F2F',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        zIndex: 999,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        maxWidth: '88%',
    },
    cancelBannerText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        flexShrink: 1,
    },

    // ─── Header ───────────────────────────────────────────────
    headerContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: BRAND.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 5,
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: BRAND.orange,
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: BRAND.white,
        paddingHorizontal: 3,
    },
    badgeText: {
        color: BRAND.white,
        fontSize: 9,
        fontWeight: '900',
    },
    brandPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BRAND.white,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 22,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    brandText: {
        fontSize: 15,
        fontWeight: '900',
    },
    brandSawari: {
        color: BRAND.yellow,
    },
    brandAuto: {
        color: BRAND.black,
    },
    driverTag: {
        backgroundColor: BRAND.black,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    driverTagText: {
        color: BRAND.yellow,
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    earningsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BRAND.black,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 22,
        gap: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 5,
    },
    earningsSymbol: {
        color: BRAND.yellow,
        fontSize: 14,
        fontWeight: '800',
    },
    earningsValue: {
        color: BRAND.white,
        fontSize: 15,
        fontWeight: '800',
    },

    // ─── Floating right buttons ────────────────────────────────
    rightButtonsContainer: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
        gap: 10,
    },
    floatBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: BRAND.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.13,
        shadowRadius: 6,
        elevation: 5,
    },

    // ─── Marker ────────────────────────────────────────────────
    navArrowWrap: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navArrowOuter: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: BRAND.white,
        borderWidth: 2.5,
        borderColor: BRAND.gray,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
    },

    // ─── GO Button ─────────────────────────────────────────────
    goButtonWrap: {
        position: 'absolute',
        alignSelf: 'center',
        bottom: '20%',
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goPulse: {
        position: 'absolute',
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: BRAND.green + '30',
    },
    goButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: BRAND.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 10,
    },
    goText: {
        color: BRAND.white,
        fontSize: 21,
        fontWeight: '900',
        letterSpacing: 2,
    },

    // ─── Bottom Sheet ──────────────────────────────────────────
    sheetBackground: {
        backgroundColor: BRAND.white,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.09,
        shadowRadius: 16,
        elevation: 20,
    },
    sheetHandle: {
        backgroundColor: '#E0E0E0',
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    sheetContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sheetStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    sheetIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: BRAND.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '800',
        color: BRAND.black,
    },
    sheetDivider: {
        height: 1,
        backgroundColor: BRAND.border,
        marginVertical: 14,
    },
    sheetSubtitle: {
        fontSize: 13,
        color: BRAND.gray,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
        marginBottom: 18,
    },

    // ─── Stats strip (online) ─────────────────────────────────
    statsStrip: {
        flexDirection: 'row',
        backgroundColor: BRAND.lightGray,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 10,
        marginBottom: 16,
    },
    statBlock: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 17,
        fontWeight: '800',
        color: BRAND.black,
        marginBottom: 3,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: BRAND.gray,
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        backgroundColor: BRAND.border,
        marginVertical: 4,
    },

    // ─── Go Offline button ────────────────────────────────────
    offlineBtn: {
        backgroundColor: BRAND.black,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    offlineBtnText: {
        color: BRAND.white,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.5,
    },

    // ─── Offline tip cards ─────────────────────────────────────
    tipRow: {
        flexDirection: 'row',
        gap: 12,
    },
    tipCard: {
        flex: 1,
        backgroundColor: BRAND.lightGray,
        borderRadius: 14,
        padding: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: BRAND.border,
    },
    tipTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: BRAND.black,
    },
    tipSub: {
        fontSize: 12,
        color: BRAND.gray,
        fontWeight: '600',
    },
});
