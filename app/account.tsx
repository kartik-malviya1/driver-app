import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { getDriverAccount, type DriverAccountResponse } from '../services/api';

export default function AccountScreen() {
    const { user, signOut } = useAuth();
    const { resetOnboarding } = useOnboarding();
    const router = useRouter();

    const [accountData, setAccountData] = useState<DriverAccountResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadAccount = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getDriverAccount();
            setAccountData(data);
        } catch (err: any) {
            console.error('Failed to load account:', err);
            Alert.alert('Error', err?.message || 'Failed to load account details.');
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAccount(false);
    }, [loadAccount]);

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await resetOnboarding();
                        await signOut();
                        router.replace('/(auth)/phone');
                    }
                }
            ]
        );
    };

    const renderDetailRow = (icon: string, label: string, value: string, isLast = false) => (
        <View style={[styles.detailRow, !isLast && styles.rowDivider]}>
            <View style={styles.detailRowLeft}>
                <MaterialCommunityIcons name={icon as any} size={22} color={Theme.colors.gray} />
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );

    const renderMenuItem = (
        icon: string,
        title: string,
        subtitle?: string,
        iconColor: string = Theme.colors.black,
        onPress?: () => void,
        isLast = false
    ) => (
        <TouchableOpacity
            style={[styles.menuItem, !isLast && styles.rowDivider]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
                </View>
                <View>
                    <Text style={[
                        styles.menuItemTitle,
                        iconColor === Theme.colors.danger && { color: Theme.colors.danger }
                    ]}>
                        {title}
                    </Text>
                    {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            {iconColor !== Theme.colors.danger && (
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            )}
        </TouchableOpacity>
    );

    if (loading && !accountData) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" />
                <Text style={styles.centeredState}>
                    <ActivityIndicator size="large" color={Theme.colors.green} />
                </Text>
            </SafeAreaView>
        );
    }

    const profile = accountData?.profile;
    const stats = accountData?.stats;
    const ratingText = profile?.rating != null ? profile.rating.toFixed(2) : '--';
    const completedTrips = stats?.completedTrips ?? 0;
    const yearsOnPlatform = stats?.yearsOnPlatform ?? 0;
    const completionRateText = stats?.completionRate != null ? `${stats.completionRate}%` : '--';
    const lifetimeEarningsText = `₹${Math.round(stats?.lifetimeEarnings ?? 0).toLocaleString()}`;
    const initial = profile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'D';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />

            {/* Clean Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} /> {/* Spacer for balance */}
            </View>

            <ScrollView
                bounces={true}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadAccount(true)}
                        tintColor={Theme.colors.green}
                    />
                }
            >
                {/* Clean Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: profile?.status === 'ONLINE' ? Theme.colors.green : '#8E8E93' }
                        ]}>
                            <View style={styles.statusDot} />
                        </View>
                    </View>

                    <Text style={styles.userName}>{profile?.name || 'Driver Partner'}</Text>
                    <Text style={styles.userPhone}>{profile?.phoneNumber || 'No phone number'}</Text>

                    <View style={styles.ratingPill}>
                        <Ionicons name="star" size={15} color="#FFB800" />
                        <Text style={styles.ratingText}>{ratingText}</Text>
                    </View>
                </View>

                {/* Clean Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{completedTrips.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{yearsOnPlatform.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Years</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{completionRateText}</Text>
                        <Text style={styles.statLabel}>Completion</Text>
                    </View>
                </View>

                {/* Professional Details */}
                <Text style={styles.sectionHeading}>VEHICLE & LICENSE</Text>
                <View style={styles.card}>
                    {renderDetailRow('car-outline', 'Vehicle Number', profile?.vehicleNumber || 'Not provided')}
                    {renderDetailRow('card-account-details-outline', 'License Number', profile?.licenseNumber || 'Not provided')}
                    {renderDetailRow('shield-check-outline', 'Account Status', profile?.status || 'OFFLINE', true)}
                </View>

                {/* Account Dashboard */}
                <Text style={styles.sectionHeading}>ACCOUNT DASHBOARD</Text>
                <View style={styles.card}>
                    {renderMenuItem('wallet-outline', 'Earnings', `${lifetimeEarningsText} lifetime`, Theme.colors.green)}
                    {renderMenuItem('shield-check-outline', 'Safety', 'Security & Insurance', '#007AFF')}
                    {renderMenuItem('cog-outline', 'Settings', 'Preferences & Language', '#5856D6', undefined, true)}
                </View>

                {/* Sign Out Section */}
                <View style={[styles.card, styles.logoutCard]}>
                    {renderMenuItem('logout', 'Sign Out', undefined, Theme.colors.danger, handleSignOut, true)}
                </View>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F6F8',
    },
    centeredState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Theme.colors.white,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: Theme.colors.black,
    },
    scrollContent: {
        paddingBottom: 60,
    },

    /* Profile Header */
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: Theme.colors.white,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5EA',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarContainer: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: Theme.colors.green,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: Theme.colors.green,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    avatarText: {
        color: Theme.colors.white,
        fontSize: 38,
        fontWeight: '700',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 3,
        borderColor: Theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFF',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: Theme.colors.black,
        marginBottom: 6,
    },
    userPhone: {
        fontSize: 15.5,
        color: Theme.colors.gray,
        marginBottom: 14,
    },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFEBB8',
    },
    ratingText: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#D49A00',
        marginLeft: 6,
    },

    /* Stats Card */
    statsCard: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.white,
        marginHorizontal: 16,
        marginTop: -20,
        borderRadius: 18,
        paddingVertical: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E5EA',
        marginVertical: 4,
    },
    statValue: {
        fontSize: 21,
        fontWeight: '700',
        color: Theme.colors.black,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12.5,
        fontWeight: '600',
        color: Theme.colors.gray,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    /* Section & Cards */
    sectionHeading: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        marginLeft: 20,
        marginTop: 32,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    card: {
        backgroundColor: Theme.colors.white,
        borderRadius: 16,
        marginHorizontal: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    logoutCard: {
        marginTop: 28,
    },
    rowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5EA',
    },

    /* Detail Row */
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16.5,
        paddingHorizontal: 18,
    },
    detailRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailLabel: {
        fontSize: 15.5,
        color: Theme.colors.gray,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15.5,
        fontWeight: '600',
        color: Theme.colors.black,
    },

    /* Menu Item */
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14.5,
        paddingHorizontal: 18,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuItemTitle: {
        fontSize: 16.5,
        fontWeight: '600',
        color: Theme.colors.black,
    },
    menuItemSubtitle: {
        fontSize: 13.5,
        color: Theme.colors.gray,
        marginTop: 2,
    },

    versionText: {
        textAlign: 'center',
        color: '#AEAEB2',
        fontSize: 13,
        marginTop: 40,
        fontWeight: '500',
    }
});