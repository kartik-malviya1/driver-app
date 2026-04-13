import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';

export default function AccountScreen() {
    const { user, signOut } = useAuth();
    const { resetOnboarding } = useOnboarding();
    const router = useRouter();

    const handleSignOut = async () => {
        await resetOnboarding();
        await signOut();
        router.replace('/(auth)/phone');
    };

    const renderMenuItem = (icon: string, title: string, subtitle?: string, color: string = Theme.colors.black, onPress?: () => void) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, {
                    backgroundColor: color === Theme.colors.danger ? Theme.colors.dangerPale :
                        color === Theme.colors.orange ? Theme.colors.orangePale : Theme.colors.greenPale
                }]}>
                    <MaterialCommunityIcons name={icon as any} size={22} color={color} />
                </View>
                <View>
                    <Text style={[styles.menuItemTitle, { color }]}>{title}</Text>
                    {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.lightGray} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.navigate("/checklist")} style={styles.backButton}>
                    <Ionicons name="close" size={26} color={Theme.colors.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Account</Text>
            </View>

            <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || 'Driver Partner'}</Text>
                        <Text style={styles.userEmail}>Driver ID: {user?.id}</Text>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color={Theme.colors.orange} />
                            <Text style={styles.ratingText}>4.95</Text>
                        </View>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>1,254</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                    <View style={[styles.statBox, styles.statSeparator]}>
                        <Text style={styles.statValue}>2.5</Text>
                        <Text style={styles.statLabel}>Years</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>98%</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                </View>

                {/* Menu */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    {renderMenuItem('wallet-outline', 'Earnings', 'Weekly overview', Theme.colors.green)}
                    {renderMenuItem('shield-check-outline', 'Safety', 'Security & Insurance', Theme.colors.green)}
                    {renderMenuItem('cog-outline', 'Settings', 'Preferences & Language', Theme.colors.orange)}
                </View>

                <View style={styles.divider} />

                <View style={styles.section}>
                    {renderMenuItem('logout', 'Sign Out', 'Logout from your account', Theme.colors.danger, handleSignOut)}
                </View>

                {/* <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                >
                    <Text style={styles.signOutText}>Log Out</Text>
                </TouchableOpacity> */}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 18,
        color: Theme.colors.black,
    },
    scrollContent: {
        paddingBottom: 48,
    },
    profileCard: {
        flexDirection: 'row',
        padding: 24,
        alignItems: 'center',
        backgroundColor: Theme.colors.white,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Theme.colors.green,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Theme.colors.greenPale,
    },
    avatarText: {
        color: Theme.colors.white,
        fontSize: 32,
        fontWeight: 'bold',
    },
    userInfo: {
        marginLeft: 20,
        flex: 1,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
        color: Theme.colors.black,
    },
    userEmail: {
        fontSize: 14,
        color: Theme.colors.gray,
        marginBottom: 10,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.orangePale,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: Theme.colors.orange,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
        color: Theme.colors.orange,
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        backgroundColor: Theme.colors.greenPale,
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: Theme.colors.green + '33',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statSeparator: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: Theme.colors.green + '44',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
        color: Theme.colors.green,
    },
    statLabel: {
        fontSize: 11,
        color: Theme.colors.gray,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    section: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        color: Theme.colors.lightGray,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    divider: {
        height: 8,
        backgroundColor: Theme.colors.surface,
        marginVertical: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    menuItemSubtitle: {
        fontSize: 13,
        color: Theme.colors.lightGray,
        marginTop: 2,
    },
    signOutButton: {
        marginTop: 24,
        marginHorizontal: 20,
        height: 56,
        backgroundColor: Theme.colors.surface,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.danger + '55',
    },
    signOutText: {
        color: Theme.colors.danger,
        fontSize: 16,
        fontWeight: '700',
    }
});