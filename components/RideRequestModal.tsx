import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../constants/theme';

interface Ride {
    id: string;
    status: string;
    pickup_address: string;
    destination_address: string;
    price: number;
    rider_rating?: number;
    pickup_distance_text?: string;
    trip_duration_text?: string;
    trip_distance_text?: string;
}

interface RideRequestModalProps {
    isVisible: boolean;
    ride: Ride | null;
    onAccept: (rideId: string) => void;
    onClose: () => void;
}

const RideRequestModal = ({ isVisible, ride, onAccept, onClose }: RideRequestModalProps) => {
    if (!isVisible || !ride) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                {/* Header Tags & Close */}
                <View style={styles.header}>
                    <View style={styles.tagsContainer}>
                        <View style={[styles.tag, styles.rideTypeTag]}>
                            <Ionicons name="person" size={14} color="white" />
                            <Text style={styles.rideTypeText}>Auto Ride</Text>
                        </View>
                        <View style={[styles.tag, styles.exclusiveTag]}>
                            <Text style={styles.exclusiveText}>Nearby</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={Theme.colors.darkGray} />
                    </TouchableOpacity>
                </View>

                {/* Price and Rating */}
                <View style={styles.priceRatingContainer}>
                    <Text style={styles.price}>
                        ₹{new Intl.NumberFormat('en-IN').format(ride.price)}
                    </Text>
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color={Theme.colors.orange} />
                        <Text style={styles.ratingText}>{ride.rider_rating || '4.85'}</Text>
                    </View>
                </View>

                {/* Location Details */}
                <View style={styles.detailsContainer}>
                    <View style={styles.timelineContainer}>
                        <View style={styles.dot} />
                        <View style={styles.line} />
                        <View style={styles.square} />
                    </View>
                    <View style={styles.locationsContainer}>
                        <View style={styles.locationItem}>
                            <Text style={styles.locationTitle}>{ride.pickup_distance_text || '1 min'} away</Text>
                            <Text style={styles.address}>{ride.pickup_address}</Text>
                        </View>
                        <View style={[styles.locationItem, { marginTop: 15 }]}>
                            <Text style={styles.locationTitle}>{ride.trip_duration_text || '46 mins'} trip ({ride.trip_distance_text})</Text>
                            <Text style={styles.address}>{ride.destination_address}</Text>
                        </View>
                    </View>
                </View>

                {/* Accept Button */}
                <TouchableOpacity activeOpacity={0.8} onPress={() => onAccept(ride.id)} style={styles.acceptButton}>
                    <View style={styles.buttonTimerBackground} />
                    <Text style={styles.acceptButtonText}>Accept Ride</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        bottom: 40,
        left: 15,
        right: 15,
        zIndex: 1000,
    },
    container: {
        backgroundColor: Theme.colors.white,
        borderRadius: 20,
        padding: 20,
        shadowColor: Theme.colors.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    tagsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    rideTypeTag: {
        backgroundColor: Theme.colors.green,
    },
    rideTypeText: {
        color: Theme.colors.white,
        fontWeight: '700',
        fontSize: 14,
        marginLeft: 6,
    },
    exclusiveTag: {
        backgroundColor: Theme.colors.orangePale,
    },
    exclusiveText: {
        color: Theme.colors.orange,
        fontWeight: '600',
        fontSize: 14,
    },
    closeButton: {
        backgroundColor: Theme.colors.surface,
        borderRadius: 10,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceRatingContainer: {
        marginBottom: 20,
    },
    price: {
        fontSize: 44,
        fontWeight: 'bold',
        color: Theme.colors.black,
        letterSpacing: -1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ratingText: {
        fontSize: 17,
        fontWeight: '500',
        marginLeft: 6,
        color: Theme.colors.darkGray,
    },
    detailsContainer: {
        flexDirection: 'row',
        marginBottom: 25,
        paddingHorizontal: 5,
    },
    timelineContainer: {
        width: 20,
        alignItems: 'center',
        marginRight: 15,
        paddingVertical: 8,
    },
    dot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: Theme.colors.green,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: Theme.colors.border,
        marginVertical: 5,
    },
    square: {
        width: 9,
        height: 9,
        borderRadius: 2,
        backgroundColor: Theme.colors.orange,
    },
    locationsContainer: {
        flex: 1,
    },
    locationItem: {
        justifyContent: 'center',
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Theme.colors.black,
        lineHeight: 22,
    },
    address: {
        fontSize: 14,
        color: Theme.colors.gray,
        marginTop: 2,
        lineHeight: 20,
    },
    acceptButton: {
        backgroundColor: Theme.colors.green,
        height: 64,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    buttonTimerBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '35%',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    acceptButtonText: {
        color: Theme.colors.white,
        fontSize: 19,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});

export default RideRequestModal;