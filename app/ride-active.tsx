import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    ActivityIndicator, 
    Alert, 
    Dimensions, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { updateRideStatus, getRideStatus } from '../services/api';
import { wsManager } from '../services/websocket';
import { LOCATION_UPDATE_INTERVAL, GOOGLE_API_KEY } from '../constants/config';
import MapViewDirections from 'react-native-maps-directions';

const { width, height } = Dimensions.get('window');

const MAP_STYLE = [
    { "featureType": "poi.business", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi.park", "elementType": "labels.text", "stylers": [{ "visibility": "off" }] }
];

export default function RideActiveScreen() {
    const { rideId, pickupLat, pickupLng, pickupAddress, dropLat, dropLng } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [heading, setHeading] = useState<number>(0);
    const [status, setStatus] = useState<'ACCEPTED' | 'STARTED' | 'COMPLETED'>('ACCEPTED');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [rideData, setRideData] = useState<any>(null);
    const [passengerLocation, setPassengerLocation] = useState<{ lat: number, lng: number } | null>(null);
    
    // Fetch initial ride status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getRideStatus(Number(rideId));
                setRideData(data);
                if (data.status === 'STARTED') {
                    setStatus('STARTED');
                } else if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
                    router.replace('/home');
                }
            } catch (err) {
                console.error('Failed to fetch ride status:', err);
            }
        };
        fetchStatus();
    }, [rideId]);

    // Subscribe to location updates
    useEffect(() => {
        let locationSubscription: any;
        let headingSubscription: any;

        (async () => {
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            if (locStatus !== 'granted') return;

            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 1000,
                    distanceInterval: 5,
                },
                (newLoc) => {
                    setLocation(newLoc);
                    if (user) {
                        wsManager.sendLocationUpdate(user.id, newLoc.coords.latitude, newLoc.coords.longitude);
                    }
                }
            );

            headingSubscription = await Location.watchHeadingAsync((h) => {
                setHeading(h.trueHeading);
            });
        })();

        return () => {
            if (locationSubscription) locationSubscription.remove();
            if (headingSubscription) headingSubscription.remove();
        };
    }, [user]);

    // WebSocket: Listen for RIDE_CANCELLED
    useEffect(() => {
        const unsubscribe = wsManager.onMessage((data) => {
            if (data.event === 'RIDE_CANCELLED' && Number(data.rideId) === Number(rideId)) {
                Alert.alert(
                    "Ride Cancelled",
                    "The passenger has cancelled this ride.",
                    [{ text: "OK", onPress: () => router.replace('/home') }]
                );
            }
            if (data.event === 'USER_LOCATION' && Number(data.rideId) === Number(rideId)) {
                setPassengerLocation({ lat: data.lat, lng: data.lng });
            }
        });
        return () => unsubscribe();
    }, [rideId]);

    const handleStartRide = async () => {
        if (!otp || otp.length < 4) {
            Alert.alert("Error", "Please enter a valid OTP");
            return;
        }

        setLoading(true);
        try {
            await updateRideStatus(Number(rideId), 'STARTED', Number(otp));
            setStatus('STARTED');
            Alert.alert("Success", "Ride started successfully!");
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to start ride");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRide = async () => {
        setLoading(true);
        try {
            await updateRideStatus(Number(rideId), 'COMPLETED');
            setStatus('COMPLETED');
            Alert.alert(
                "Ride Completed",
                "You have successfully completed the ride.",
                [{ text: "Home", onPress: () => router.replace('/home') }]
            );
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to complete ride");
        } finally {
            setLoading(false);
        }
    };

    const centerOnMarkers = useCallback(() => {
        if (!location) return;
        
        const coordinates = [
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            { latitude: Number(pickupLat), longitude: Number(pickupLng) }
        ];

        if (passengerLocation) {
            coordinates.push({ latitude: passengerLocation.lat, longitude: passengerLocation.lng });
        }

        if (dropLat && dropLng) {
            coordinates.push({ latitude: Number(dropLat), longitude: Number(dropLng) });
        }

        mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
        });
    }, [location, pickupLat, pickupLng, passengerLocation, dropLat, dropLng]);

    useEffect(() => {
        if (location) {
            centerOnMarkers();
        }
    }, [location, passengerLocation, dropLat, dropLng]);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={MAP_STYLE}
                initialRegion={{
                    latitude: Number(pickupLat) || 23.1890861,
                    longitude: Number(pickupLng) || 77.4337776,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                {/* Driver Marker */}
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        flat
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={[styles.navArrow, { transform: [{ rotate: `${heading}deg` }] }]}>
                            <MaterialCommunityIcons name="navigation" size={24} color="black" />
                        </View>
                    </Marker>
                )}

                {/* Pickup Marker */}
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

                {/* Passenger Marker */}
                {passengerLocation && (
                    <Marker
                        coordinate={{
                            latitude: passengerLocation.lat,
                            longitude: passengerLocation.lng,
                        }}
                        title="Passenger's Live Location"
                    >
                        <View style={styles.passengerMarker}>
                            <Ionicons name="person" size={20} color="white" />
                        </View>
                    </Marker>
                )}

                {/* Destination Marker */}
                {dropLat && dropLng && (
                    <Marker
                        coordinate={{
                            latitude: Number(dropLat),
                            longitude: Number(dropLng),
                        }}
                        title="Destination"
                    >
                        <Ionicons name="location" size={35} color={Theme.colors.orange} />
                    </Marker>
                )}

                {/* Directions */}
                {location && (
                    <MapViewDirections
                        origin={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        destination={
                            status === 'ACCEPTED'
                                ? { latitude: Number(pickupLat), longitude: Number(pickupLng) }
                                : { latitude: Number(dropLat), longitude: Number(dropLng) }
                        }
                        apikey={GOOGLE_API_KEY}
                        strokeWidth={4}
                        strokeColor={Theme.colors.black}
                    />
                )}
            </MapView>

            <TouchableOpacity 
                style={[styles.backButton, { top: insets.top + 10 }]}
                onPress={() => Alert.alert("Active Trip", "You cannot leave this screen while in an active trip.")}
            >
                <Ionicons name="shield-checkmark" size={24} color={Theme.colors.green} />
            </TouchableOpacity>

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                    pointerEvents="box-none"
                >
                    <View style={styles.card}>
                        <View style={styles.handle} />
                        
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.statusLabel}>
                                    {status === 'ACCEPTED' ? 'EN ROUTE TO PICKUP' : 'TRIP IN PROGRESS'}
                                </Text>
                                <Text style={styles.passengerName}>
                                    {rideData?.user?.name || "Passenger"}
                                </Text>
                                <Text style={styles.addressText} numberOfLines={1}>
                                    {pickupAddress || (rideData ? `${rideData.pickupLocationLat}, ${rideData.pickupLocationLng}` : "Pickup Point")}
                                </Text>
                            </View>
                            <View style={styles.userIcon}>
                                <Ionicons name="person" size={24} color="white" />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {status === 'ACCEPTED' ? (
                            <View style={styles.otpSection}>
                                <Text style={styles.infoText}>Enter OTP provided by passenger</Text>
                                <TextInput
                                    style={styles.otpInput}
                                    placeholder="0 0 0 0"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholderTextColor={Theme.colors.lightGray}
                                />
                                <TouchableOpacity 
                                    style={styles.primaryButton}
                                    onPress={handleStartRide}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>START RIDE</Text>}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.otpSection}>
                                <Text style={styles.infoText}>Dropping off passenger at destination</Text>
                                <TouchableOpacity 
                                    style={[styles.primaryButton, { backgroundColor: Theme.colors.black }]}
                                    onPress={handleCompleteRide}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>COMPLETE RIDE</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.surface,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    navArrow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Theme.colors.green,
    },
    pickupMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Theme.colors.green + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickupMarkerInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Theme.colors.green,
    },
    passengerMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Theme.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    card: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingTop: 12,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#DDD',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusLabel: {
        color: Theme.colors.green,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    passengerName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Theme.colors.black,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 18,
        fontWeight: '700',
        color: Theme.colors.black,
        width: width * 0.7,
    },
    userIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Theme.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 20,
    },
    otpSection: {
        alignItems: 'center',
    },
    infoText: {
        color: Theme.colors.gray,
        fontSize: 14,
        marginBottom: 16,
    },
    otpInput: {
        width: '100%',
        height: 60,
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 10,
        color: Theme.colors.black,
        marginBottom: 24,
    },
    primaryButton: {
        width: '100%',
        height: 56,
        backgroundColor: Theme.colors.green,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    buttonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});
