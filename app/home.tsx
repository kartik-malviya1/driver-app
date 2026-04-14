import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RideRequestModal from '../components/RideRequestModal';
import { LOCATION_UPDATE_INTERVAL } from '../constants/config';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { acceptRide as acceptRideApi, getActiveRide } from '../services/api';
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
    rider_rating?: number;
    pickup_distance_text?: string;
    trip_duration_text?: string;
    trip_distance_text?: string;
}

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY;

const MAP_STYLE = [
    {
        "featureType": "poi.business",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text",
        "stylers": [{ "visibility": "off" }]
    }
];

export default function HomeScreen() {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [heading, setHeading] = useState<number>(0);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [showRideRequest, setShowRideRequest] = useState<boolean>(false);
    const [currentRide, setCurrentRide] = useState<Ride | null>(null);
    const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const snapPoints = useMemo(() =>
        isOnline ? ['13%', '45%', '90%'] : ['13%'],
        [isOnline]);

    // ─── Location Permissions & Tracking ───
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);

            // ─── CHECK FOR ACTIVE RIDE ───
            // If driver has an active ride, redirect them to RideActiveScreen
            try {
                const activeRide = await getActiveRide();
                if (activeRide && activeRide.id) {
                    router.replace({
                        pathname: '/ride-active',
                        params: {
                            rideId: String(activeRide.id),
                            pickupLat: String(activeRide.pickupLocationLat),
                            pickupLng: String(activeRide.pickupLocationLng),
                            pickupAddress: activeRide.pickup_address || "",
                            dropLat: String(activeRide.dropLocationLat),
                            dropLng: String(activeRide.dropLocationLng)
                        }
                    });
                }
            } catch (err) {
                console.log('No active ride for driver or error:', err);
            }

            // Watch position for movement
            const locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 500,
                    distanceInterval: 1,
                },
                (newLoc) => {
                    setLocation(newLoc);
                }
            );

            // Watch heading
            const headingSubscription = await Location.watchHeadingAsync((h) => {
                setHeading(h.trueHeading);
            });

            return () => {
                locationSubscription.remove();
                headingSubscription.remove();
            };
        })();
    }, []);

    // ─── WebSocket: Listen for ride requests ───
    useEffect(() => {
        if (!isOnline) return;

        const unsubscribe = wsManager.onMessage(async (data) => {
            if (data.event === 'NEW_RIDE_REQUEST' && !showRideRequest) {
                console.log('New ride request received:', data);

                // Enrich with address data if we have coords
                let pickupAddress = `${data.pickup?.lat}, ${data.pickup?.lng}`;
                let destAddress = `${data.drop?.lat}, ${data.drop?.lng}`;

                if (GOOGLE_MAPS_APIKEY && location) {
                    try {
                        const driverCoords = `${location.coords.latitude},${location.coords.longitude}`;
                        const pickupCoords = `${data.pickup?.lat},${data.pickup?.lng}`;
                        const dropCoords = `${data.drop?.lat},${data.drop?.lng}`;

                        // Get distance + geocode in parallel
                        const [distRes, pickupGeo, destGeo] = await Promise.all([
                            fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${driverCoords}|${pickupCoords}&destinations=${pickupCoords}|${dropCoords}&key=${GOOGLE_MAPS_APIKEY}`).then(r => r.json()),
                            fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${pickupCoords}&key=${GOOGLE_MAPS_APIKEY}`).then(r => r.json()),
                            fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${dropCoords}&key=${GOOGLE_MAPS_APIKEY}`).then(r => r.json()),
                        ]);

                        if (pickupGeo.status === 'OK') pickupAddress = pickupGeo.results[0].formatted_address;
                        if (destGeo.status === 'OK') destAddress = destGeo.results[0].formatted_address;

                        const driverToPickup = distRes?.rows?.[0]?.elements?.[0];
                        const tripDetails = distRes?.rows?.[1]?.elements?.[1];

                        const enrichedRide: Ride = {
                            id: String(data.rideId),
                            status: 'REQUESTED',
                            pickup_address: pickupAddress,
                            destination_address: destAddress,
                            pickup_lat: data.pickup?.lat,
                            pickup_lng: data.pickup?.lng,
                            destination_lat: data.drop?.lat,
                            destination_lng: data.drop?.lng,
                            price: data.price || 0,
                            pickup_distance_text: driverToPickup?.duration?.text || 'Nearby',
                            trip_duration_text: tripDetails?.duration?.text || '',
                            trip_distance_text: tripDetails?.distance?.text || '',
                        };

                        setCurrentRide(enrichedRide);
                        setShowRideRequest(true);
                    } catch (err) {
                        console.error('Error enriching ride data:', err);
                        // Show with raw coords
                        setCurrentRide({
                            id: String(data.rideId),
                            status: 'REQUESTED',
                            pickup_address: pickupAddress,
                            destination_address: destAddress,
                            pickup_lat: data.pickup?.lat,
                            pickup_lng: data.pickup?.lng,
                            destination_lat: data.drop?.lat,
                            destination_lng: data.drop?.lng,
                            price: data.price || 0,
                        });
                        setShowRideRequest(true);
                    }
                } else {
                    // No Google Maps API key — show raw data
                    setCurrentRide({
                        id: String(data.rideId),
                        status: 'REQUESTED',
                        pickup_address: pickupAddress,
                        destination_address: destAddress,
                        pickup_lat: data.pickup?.lat,
                        pickup_lng: data.pickup?.lng,
                        destination_lat: data.drop?.lat,
                        destination_lng: data.drop?.lng,
                        price: data.price || 0,
                    });
                    setShowRideRequest(true);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [isOnline, showRideRequest, location]);

    // ─── Bottom sheet initial snap ───
    useEffect(() => {
        const timer = setTimeout(() => {
            bottomSheetRef.current?.snapToIndex(0);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const centerOnUser = useCallback(() => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    }, [location]);

    // ─── Go Online / Offline ───
    const toggleOnline = async () => {
        if (isUpdatingStatus) return;

        const nextState = !isOnline;
        setIsUpdatingStatus(true);

        if (nextState) {
            // Going ONLINE
            if (!user || !location) {
                console.log('Cannot go online: User or location missing');
                setIsUpdatingStatus(false);
                return;
            }

            try {
                // Connect WebSocket and register as driver
                wsManager.connect(user.id);

                // Start sending location updates at interval
                locationIntervalRef.current = setInterval(() => {
                    if (location) {
                        wsManager.sendLocationUpdate(
                            user.id,
                            location.coords.latitude,
                            location.coords.longitude
                        );
                    }
                }, LOCATION_UPDATE_INTERVAL);

                setIsOnline(true);
            } catch (err) {
                console.error('Failed to go online:', err);
            }
        } else {
            // Going OFFLINE
            wsManager.disconnect();

            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = null;
            }

            bottomSheetRef.current?.snapToIndex(0);
            setIsOnline(false);
        }

        setIsUpdatingStatus(false);
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            wsManager.disconnect();
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
            }
        };
    }, []);

    const renderHeader = () => (
        <View style={[styles.headerContainer, { top: insets.top + 10 }]}>
            <TouchableOpacity
                style={styles.circleButton}
                onPress={() => router.push('/account')}
            >
                <Ionicons name="menu" size={24} color={Theme.colors.black} />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>57</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.earningsPill}>
                <Text style={styles.earningsText}>
                    <Text style={{ color: Theme.colors.orange }}>₹</Text>96.66
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleButton}>
                <Ionicons name="search" size={24} color={Theme.colors.black} />
            </TouchableOpacity>
        </View>
    );

    const renderFloatingButtons = () => (
        <>
            <TouchableOpacity style={[styles.floatingLeft, { top: height * 0.5 }]}>
                <View style={[styles.circleButton, styles.shadow]}>
                    <Ionicons name="shield-checkmark" size={24} color={Theme.colors.green} />
                </View>
            </TouchableOpacity>

            <View style={styles.rightButtonsContainer}>
                <TouchableOpacity
                    style={[styles.squareButton, styles.shadow, { marginBottom: 15 }]}
                    onPress={centerOnUser}
                >
                    <MaterialCommunityIcons name="crosshairs-gps" size={26} color={Theme.colors.green} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.squareButton, styles.shadow]}>
                    <Ionicons name="bar-chart" size={24} color={Theme.colors.orange} />
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={MAP_STYLE}
                initialRegion={{
                    latitude: location?.coords.latitude || 23.1890861,
                    longitude: location?.coords.longitude || 77.4337776,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                showsUserLocation={false}
                rotateEnabled={true}
                pitchEnabled={true}
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
                        <View style={[styles.navigationArrowContainer, { transform: [{ rotate: `${heading}deg` }] }]}>
                            <View style={styles.navigationArrowOuter}>
                                <View style={styles.navigationArrowInner}>
                                    <MaterialCommunityIcons name="navigation" size={20} color="black" />
                                </View>
                            </View>
                        </View>
                    </Marker>
                )}
            </MapView>

            {renderHeader()}
            {renderFloatingButtons()}

            {!isOnline && (
                <TouchableOpacity
                    style={[styles.goButtonContainer, { bottom: '18%' }]}
                    onPress={toggleOnline}
                    disabled={isUpdatingStatus}
                >
                    <View style={styles.goButtonOuter}>
                        <View style={styles.goButtonInner}>
                            {isUpdatingStatus ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.goText}>GO</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            )}

            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={{ backgroundColor: '#CCC', width: 40 }}
                style={{ zIndex: 100 }}
                enableContentPanningGesture={isOnline}
                enableHandlePanningGesture={isOnline}
            >
                <BottomSheetView style={styles.bottomSheetContent}>
                    <View style={styles.bottomSheetHeader}>
                        <TouchableOpacity style={styles.bottomSheetIcon}>
                            <MaterialCommunityIcons name="tune" size={28} color="black" />
                        </TouchableOpacity>

                        <Text style={styles.offlineText}>
                            {isOnline ? "You're online" : "You're offline"}
                        </Text>

                        <TouchableOpacity style={styles.bottomSheetIcon}>
                            <MaterialCommunityIcons name="menu" size={28} color="black" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.offlineDetails}>
                        <View style={styles.separator} />
                        <Text style={styles.offlineSubtitle}>
                            {isOnline
                                ? "Searching for trips near you. Stay on the map to receive requests."
                                : "You are currently offline. Tap GO to start accepting rides."}
                        </Text>

                        {isOnline && (
                            <TouchableOpacity
                                style={styles.flatStopButton}
                                onPress={toggleOnline}
                                disabled={isUpdatingStatus}
                            >
                                {isUpdatingStatus ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.flatStopButtonText}>GO OFFLINE</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </BottomSheetView>
            </BottomSheet>

            <RideRequestModal
                isVisible={showRideRequest}
                ride={currentRide}
                onAccept={async (rideId) => {
                    console.log('Ride accepted:', rideId);
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
                                    otp: String(response.otp)
                                }
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
        backgroundColor: Theme.colors.white,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    circleButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: Theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    shadow: {
        elevation: 4,
        shadowColor: Theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: Theme.colors.orange,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Theme.colors.white,
    },
    badgeText: {
        color: Theme.colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    earningsPill: {
        backgroundColor: Theme.colors.black,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Theme.colors.darkGray,
    },
    earningsText: {
        color: Theme.colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    floatingLeft: {
        position: 'absolute',
        left: 20,
        zIndex: 5,
    },
    rightButtonsContainer: {
        position: 'absolute',
        right: 20,
        top: height * 0.42,
        zIndex: 5,
    },
    squareButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: Theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navigationArrowContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navigationArrowOuter: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Theme.colors.white,
        borderWidth: 2,
        borderColor: Theme.colors.green,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: Theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    navigationArrowInner: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    goButtonContainer: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 5,
    },
    goButtonOuter: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: Theme.colors.green + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    goButtonInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Theme.colors.green,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    goText: {
        color: Theme.colors.white,
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    bottomSheetBackground: {
        backgroundColor: Theme.colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 10,
        shadowColor: Theme.colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    bottomSheetContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 60,
    },
    bottomSheetIcon: {
        padding: 5,
    },
    offlineText: {
        fontSize: 20,
        fontWeight: '600',
        color: Theme.colors.black,
        flex: 1,
        textAlign: 'center',
    },
    offlineDetails: {
        marginTop: 10,
        alignItems: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: Theme.colors.border,
        width: '100%',
        marginBottom: 20,
    },
    offlineSubtitle: {
        color: Theme.colors.gray,
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        lineHeight: 22,
    },
    flatStopButton: {
        backgroundColor: Theme.colors.orange,
        width: '100%',
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    flatStopButtonText: {
        color: Theme.colors.white,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    }
});