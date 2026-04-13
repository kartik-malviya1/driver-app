import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';
import { DocKey, DocStatus, useOnboarding } from '../../hooks/useOnboarding';
import { signup as apiSignup } from '../../services/api';

interface DocItem {
    key: DocKey;
    label: string;
    description?: string;
}

const DOC_ITEMS: DocItem[] = [
    { key: 'profile_photo', label: 'Profile photo' },
    { key: 'aadhaar', label: 'Aadhaar Card' },
    { key: 'rc', label: 'Registration Certificate (RC)' },
    { key: 'driving_license', label: 'Driving License - Front' },
    { key: 'language', label: 'Preferred language' },
];

const TOTAL_STEPS = DOC_ITEMS.length;

function StatusLabel({ status, isNext }: { status: DocStatus; isNext: boolean }) {
    if (status === 'completed') {
        return <Text style={styles.statusCompleted}>Completed</Text>;
    }
    if (status === 'in_review') {
        return <Text style={styles.statusReview}>In review</Text>;
    }
    if (isNext) {
        return <Text style={styles.statusNext}>Recommended next step</Text>;
    }
    return null;
}

export default function ChecklistScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { resetOnboarding } = useOnboarding();

    const handleSignOut = async () => {
        await resetOnboarding();
        await signOut();
        router.replace('/(auth)/login');
    };
    const { state, completedCount, pendingCount, nextPendingDoc, completeOnboarding } = useOnboarding();
    const { loginWithToken } = useAuth();
    const [isFinishing, setIsFinishing] = React.useState(false);

    const handleFinish = async () => {
        if (pendingCount > 0 || isFinishing) return;

        setIsFinishing(true);
        try {
            const signupData = {
                name: state.fullName || '',
                email: state.email || '',
                phoneNumber: state.phone || '',
                vehicleNumber: state.vehicleNumber || '',
                licenseNumber: state.licenseNumber || '',
                licensePhotoUrl: state.licensePhotoUrl || '',
                AadhaarCardPhotoUrl: state.aadhaarCardPhotoUrl || '',
                photoUrl: state.photoUrl || '',
            };

            const result = await apiSignup(signupData);

            // 1. Log in with returned JWT
            await loginWithToken(result.token, result.user);

            // 2. Mark onboarding as done
            await completeOnboarding();

            // 3. Go home
            router.replace('/home');
        } catch (err: any) {
            console.error('Final signup error:', err);
            Alert.alert('Registration Failed', err.message || 'Could not complete registration. Please try again.');
        } finally {
            setIsFinishing(false);
        }
    };

    const firstName = state.fullName?.split(' ')[0] ?? 'Driver';
    const completedSegments = DOC_ITEMS.filter(d => state.docs[d.key] !== 'pending').length;

    const handleDocPress = (docKey: DocKey, status: DocStatus) => {
        if (status === 'completed') return;
        router.push(`/(onboarding)/upload?doc=${docKey}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Top bar */}
            <View style={styles.topBar}>
                <View style={styles.miniLogo}>
                    <Text style={{ fontSize: 20 }}>🛺</Text>
                </View>
                <TouchableOpacity style={styles.helpBtn}>
                    <Text style={styles.helpText} onPress={() => handleSignOut()} >Help</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Subtitle */}
                <Text style={styles.subtitle}>Signing up for</Text>
                <View style={styles.contextRow}>
                    <Text style={styles.contextText}>Auto Rickshaw • Trips • 🛺</Text>
                    <Text style={styles.chevron}>▾</Text>
                </View>

                {/* Greeting */}
                <Text style={styles.greeting}>Welcome, {firstName}</Text>
                <Text style={styles.stepsRemaining}>
                    {pendingCount === 0
                        ? 'All steps complete! Your account is being reviewed.'
                        : `Complete ${pendingCount} more step${pendingCount !== 1 ? 's' : ''} to start earning.`}
                </Text>

                {/* Progress bar */}
                <View style={styles.progressBar}>
                    {DOC_ITEMS.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSegment,
                                i < completedSegments ? styles.progressSegmentFilled : styles.progressSegmentEmpty,
                                i < DOC_ITEMS.length - 1 && { marginRight: 4 },
                            ]}
                        />
                    ))}
                </View>

                {/* Checklist */}
                <View style={styles.checklist}>
                    {DOC_ITEMS.map((doc) => {
                        const status = state.docs[doc.key];
                        const isNext = doc.key === nextPendingDoc;
                        const isDone = status === 'completed';

                        return (
                            <TouchableOpacity
                                key={doc.key}
                                style={[styles.checklistItem, isDone && styles.checklistItemDone]}
                                onPress={() => handleDocPress(doc.key, status)}
                                activeOpacity={isDone ? 1 : 0.7}
                            >
                                <View style={styles.checklistLeft}>
                                    <Text style={[
                                        styles.checklistLabel,
                                        isDone && styles.checklistLabelDone,
                                        status === 'in_review' && styles.checklistLabelReview,
                                    ]}>
                                        {doc.label}
                                    </Text>
                                    <StatusLabel status={status} isNext={isNext} />
                                </View>
                                <Text style={styles.chevronRight}>›</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Finish Button floating at bottom right */}
            {pendingCount === 0 && (
                <View style={styles.fabContainer}>
                    <TouchableOpacity 
                        style={[styles.fab, isFinishing && { opacity: 0.8 }]} 
                        onPress={handleFinish} 
                        activeOpacity={0.85}
                        disabled={isFinishing}
                    >
                        {isFinishing ? (
                            <ActivityIndicator color={Theme.colors.white} style={{ marginRight: 8 }} />
                        ) : null}
                        <Text style={styles.fabText}>
                            {isFinishing ? 'Registering...' : 'Next ➔'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.white,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    miniLogo: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Theme.colors.greenPale,
        borderWidth: 1,
        borderColor: Theme.colors.green + '44',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    helpText: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.darkGray,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    subtitle: {
        fontSize: 13,
        color: Theme.colors.gray,
        marginBottom: 4,
    },
    contextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
    },
    contextText: {
        fontSize: 15,
        fontWeight: '700',
        color: Theme.colors.black,
        marginRight: 6,
    },
    chevron: {
        fontSize: 14,
        color: Theme.colors.gray,
    },
    greeting: {
        fontSize: 34,
        fontWeight: '800',
        color: Theme.colors.black,
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    stepsRemaining: {
        fontSize: 15,
        color: Theme.colors.gray,
        lineHeight: 22,
        marginBottom: 22,
    },
    progressBar: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    progressSegment: {
        flex: 1,
        height: 5,
        borderRadius: 3,
    },
    progressSegmentFilled: {
        backgroundColor: Theme.colors.green,
    },
    progressSegmentEmpty: {
        backgroundColor: Theme.colors.border,
    },
    checklist: {
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    checklistItemDone: {
        opacity: 0.6,
    },
    checklistLeft: {
        flex: 1,
    },
    checklistLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Theme.colors.black,
        marginBottom: 3,
    },
    checklistLabelDone: {
        color: Theme.colors.darkGray,
        fontWeight: '400',
    },
    checklistLabelReview: {
        color: Theme.colors.lightGray,
        fontWeight: '400',
    },
    statusNext: {
        fontSize: 13,
        color: '#1A73E8',
        fontWeight: '600',
    },
    statusReview: {
        fontSize: 13,
        color: Theme.colors.review,
    },
    statusCompleted: {
        fontSize: 13,
        color: Theme.colors.complete,
        fontWeight: '600',
    },
    chevronRight: {
        fontSize: 26,
        color: Theme.colors.lightGray,
        fontWeight: '300',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        right: 24,
    },
    fab: {
        backgroundColor: Theme.colors.black,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
    },
    fabText: {
        color: Theme.colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
