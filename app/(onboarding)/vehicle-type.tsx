import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

interface VehicleOption {
    id: string;
    label: string;
    description: string;
    emoji: string;
    tags: ('Trips' | 'Fleet')[];
}

const VEHICLE_OPTIONS: VehicleOption[] = [

    {
        id: 'bike',
        label: 'Bike',
        description: 'You wish to drive a motorcycle or scooter',
        emoji: '🏍️',
        tags: ['Trips'],
    },
    {
        id: 'auto_rickshaw',
        label: 'Auto rickshaw',
        description: 'You wish to drive an Auto Rickshaw',
        emoji: '🛺',
        tags: ['Trips'],
    },
];

const TagBadge = ({ label }: { label: string }) => (
    <View style={styles.tagBadge}>
        <Text style={styles.tagIcon}>{label === 'Trips' ? '🧑' : '🏢'}</Text>
        <Text style={styles.tagText}>{label}</Text>
    </View>
);

export default function VehicleTypeScreen() {
    const router = useRouter();
    const { saveVehicleType } = useOnboarding();
    const [selected, setSelected] = useState<string>('auto_rickshaw');

    const handleContinue = async () => {
        await saveVehicleType(selected);
        router.replace('/(onboarding)/checklist');
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
                    <Text style={styles.helpText}>Help</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.step}>Step 3 of 4</Text>
                <Text style={styles.title}>Choose how you want{'\n'}to earn</Text>

                <View style={styles.optionsList}>
                    {VEHICLE_OPTIONS.map((v) => {
                        const isSelected = selected === v.id;
                        return (
                            <TouchableOpacity
                                key={v.id}
                                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                onPress={() => setSelected(v.id)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.optionLeft}>
                                    {/* Tags */}
                                    <View style={styles.tagsRow}>
                                        {v.tags.map(tag => (
                                            <TagBadge key={tag} label={tag} />
                                        ))}
                                    </View>
                                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                        {v.label}
                                    </Text>
                                    <Text style={styles.optionDesc}>{v.description}</Text>
                                </View>
                                <Text style={styles.optionEmoji}>{v.emoji}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Continue button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
                    <Text style={styles.continueBtnText}>Continue</Text>
                </TouchableOpacity>
            </View>
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
        paddingTop: 28,
        paddingBottom: 24,
    },
    step: {
        fontSize: 13,
        fontWeight: '600',
        color: Theme.colors.green,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Theme.colors.black,
        lineHeight: 36,
        letterSpacing: -0.5,
        marginBottom: 28,
    },
    optionsList: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Theme.colors.border,
        padding: 16,
        backgroundColor: Theme.colors.white,
    },
    optionCardSelected: {
        borderColor: Theme.colors.green,
        backgroundColor: Theme.colors.greenPale,
    },
    optionLeft: {
        flex: 1,
        paddingRight: 12,
    },
    tagsRow: {
        flexDirection: 'row',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 6,
    },
    tagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(46, 133, 54, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '700',
        color: Theme.colors.green,
    },
    optionLabel: {
        fontSize: 17,
        fontWeight: '700',
        color: Theme.colors.black,
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: Theme.colors.green,
    },
    optionDesc: {
        fontSize: 13,
        color: Theme.colors.gray,
        lineHeight: 18,
    },
    optionEmoji: {
        fontSize: 44,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        backgroundColor: Theme.colors.white,
    },
    continueBtn: {
        height: 60,
        backgroundColor: Theme.colors.black,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueBtnText: {
        color: Theme.colors.white,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
