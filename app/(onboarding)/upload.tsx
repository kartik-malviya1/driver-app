import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';
import { DocKey, useOnboarding } from '../../hooks/useOnboarding';

type UploadPhase = 'idle' | 'uploading' | 'verifying' | 'done';

const DOC_META: Record<DocKey, { label: string; icon: string; instructions: string }> = {
    profile_photo: {
        label: 'Profile Photo',
        icon: '🤳',
        instructions: 'Take a clear selfie in good lighting. Look directly at the camera and remove sunglasses.',
    },
    aadhaar: {
        label: 'Aadhaar Card',
        icon: '🪪',
        instructions: 'Capture the front of your Aadhaar card. Make sure all text and the photo are clearly visible.',
    },
    rc: {
        label: 'Registration Certificate (RC)',
        icon: '📋',
        instructions: 'Upload the RC book of your vehicle. Ensure the registration number and owner details are visible.',
    },
    driving_license: {
        label: 'Driving License',
        icon: '🚗',
        instructions: 'Capture the front of your driving license. Ensure the validity date and license class are visible.',
    },
    language: {
        label: 'Preferred Language',
        icon: '🌐',
        instructions: 'Select your preferred language for navigating and communicating with riders.',
    },
};

function LoadingOverlay({ phase }: { phase: 'uploading' | 'verifying' }) {
    return (
        <View style={styles.loadingOverlay}>
            <StatusBar style="dark" />
            <ActivityIndicator size={64} color={Theme.colors.green} style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>
                {phase === 'uploading' ? 'Uploading your document...' : 'Verifying your document...'}
            </Text>
        </View>
    );
}

export default function UploadScreen() {
    const router = useRouter();
    const { doc } = useLocalSearchParams<{ doc: DocKey }>();
    const { updateDocStatus } = useOnboarding();

    const [phase, setPhase] = useState<UploadPhase>('idle');
    const [pickedImage, setPickedImage] = useState<string | null>(null);

    const meta = DOC_META[doc] ?? DOC_META['profile_photo'];

    const handlePickPhoto = () => {
        // Simulate picking a photo — in production use expo-image-picker
        Alert.alert(
            'Simulate Upload',
            'In production this opens the camera/gallery. Simulating a successful upload now.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Simulate Upload',
                    onPress: () => runUploadFlow(),
                },
            ]
        );
    };

    const runUploadFlow = async () => {
        // Step 1: Uploading
        setPhase('uploading');
        await delay(500);

        // Step 2: Verifying
        setPhase('verifying');
        await delay(500);

        // Step 3: Mark as in_review in AsyncStorage
        await updateDocStatus(doc, 'in_review');
        setPhase('done');

        // Go back to checklist
        router.replace('/(onboarding)/checklist');
    };

    if (phase === 'uploading' || phase === 'verifying') {
        return <LoadingOverlay phase={phase} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{meta.label}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.docIconContainer}>
                    <Text style={styles.docIconEmoji}>{meta.icon}</Text>
                </View>

                <Text style={styles.docTitle}>{meta.label}</Text>
                <Text style={styles.docInstructions}>{meta.instructions}</Text>

                {/* Upload area */}
                <TouchableOpacity style={styles.uploadArea} onPress={handlePickPhoto} activeOpacity={0.85}>
                    <Text style={styles.uploadAreaIcon}>📷</Text>
                    <Text style={styles.uploadAreaTitle}>Tap to upload</Text>
                    <Text style={styles.uploadAreaSubtitle}>Photo or document</Text>
                </TouchableOpacity>

                {/* Tips */}
                <View style={styles.tipsBox}>
                    <Text style={styles.tipsTitle}>📌 Tips for a good upload</Text>
                    <Text style={styles.tipItem}>• Use good lighting — avoid shadows</Text>
                    <Text style={styles.tipItem}>• All text must be clearly readable</Text>
                    <Text style={styles.tipItem}>• Keep edges of the document in frame</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        fontSize: 20,
        color: Theme.colors.black,
        fontWeight: '700',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Theme.colors.black,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    docIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 22,
        backgroundColor: Theme.colors.greenPale,
        borderWidth: 1.5,
        borderColor: Theme.colors.green + '44',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        alignSelf: 'center',
    },
    docIconEmoji: {
        fontSize: 40,
    },
    docTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Theme.colors.black,
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    docInstructions: {
        fontSize: 15,
        color: Theme.colors.gray,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: Theme.colors.green,
        borderStyle: 'dashed',
        borderRadius: 18,
        paddingVertical: 36,
        alignItems: 'center',
        backgroundColor: Theme.colors.greenPale,
        marginBottom: 28,
    },
    uploadAreaIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    uploadAreaTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Theme.colors.green,
        marginBottom: 4,
    },
    uploadAreaSubtitle: {
        fontSize: 13,
        color: Theme.colors.gray,
    },
    tipsBox: {
        backgroundColor: Theme.colors.orangePale,
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
        borderColor: Theme.colors.orange + '33',
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Theme.colors.orange,
        marginBottom: 10,
    },
    tipItem: {
        fontSize: 13,
        color: Theme.colors.darkGray,
        lineHeight: 22,
    },
    // Loading overlay — matches screenshots exactly
    loadingOverlay: {
        flex: 1,
        backgroundColor: Theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingSpinner: {
        marginBottom: 28,
        transform: [{ scale: 1.4 }],
    },
    loadingText: {
        fontSize: 20,
        fontWeight: '700',
        color: Theme.colors.black,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
});
