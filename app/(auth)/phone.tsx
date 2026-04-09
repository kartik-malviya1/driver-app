import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function PhoneScreen() {
    const router = useRouter();
    const { savePhone } = useOnboarding();
    const [phone, setPhone] = useState('');
    const [countryCode] = useState('+91');
    const inputRef = useRef<TextInput>(null);

    const isValid = phone.replace(/\s/g, '').length === 10;

    const handleContinue = async () => {
        if (!isValid) return;
        await savePhone(`${countryCode}${phone.replace(/\s/g, '')}`);
        router.push('/(auth)/otp');
    };

    const formatPhone = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 5) return digits;
        return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Mini brand top */}
                <View style={styles.topBar}>
                    <View style={styles.miniLogo}>
                        <Text style={{ fontSize: 20 }}>🛺</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={styles.step}>Step 1 of 4</Text>
                    <Text style={styles.title}>What's your{'\n'}phone number?</Text>
                    <Text style={styles.subtitle}>
                        We'll use this to keep your account safe and send trip notifications
                    </Text>

                    {/* Phone Input Box */}
                    <TouchableOpacity
                        style={styles.phoneBox}
                        activeOpacity={0.9}
                        onPress={() => inputRef.current?.focus()}
                    >
                        <View style={styles.countryCodeBox}>
                            <Text style={styles.flagText}>🇮🇳</Text>
                            <Text style={styles.countryCodeText}>{countryCode}</Text>
                        </View>
                        <View style={styles.divider} />
                        <TextInput
                            ref={inputRef}
                            style={styles.phoneInput}
                            value={phone}
                            onChangeText={(t) => setPhone(formatPhone(t))}
                            keyboardType="phone-pad"
                            placeholder="98765 43210"
                            placeholderTextColor={Theme.colors.lightGray}
                            maxLength={11}
                            autoFocus
                        />
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.link}>Terms of Service</Text>
                        {' '}and{' '}
                        <Text style={styles.link}>Privacy Policy</Text>
                    </Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
                        onPress={handleContinue}
                        disabled={!isValid}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.continueBtnText}>Continue →</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.white,
    },
    inner: {
        flex: 1,
    },
    topBar: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 6,
    },
    miniLogo: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Theme.colors.greenPale,
        borderWidth: 1,
        borderColor: Theme.colors.green + '44',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    step: {
        fontSize: 13,
        fontWeight: '600',
        color: Theme.colors.green,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 14,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Theme.colors.black,
        lineHeight: 40,
        marginBottom: 14,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: Theme.colors.gray,
        lineHeight: 22,
        marginBottom: 36,
    },
    phoneBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Theme.colors.green,
        height: 64,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    countryCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    flagText: {
        fontSize: 22,
        marginRight: 8,
    },
    countryCodeText: {
        fontSize: 17,
        fontWeight: '700',
        color: Theme.colors.black,
    },
    divider: {
        width: 1.5,
        height: 28,
        backgroundColor: Theme.colors.border,
        marginRight: 12,
    },
    phoneInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        color: Theme.colors.black,
        letterSpacing: 1,
    },
    disclaimer: {
        fontSize: 13,
        color: Theme.colors.lightGray,
        lineHeight: 19,
    },
    link: {
        color: Theme.colors.green,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    continueBtn: {
        height: 60,
        backgroundColor: Theme.colors.green,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueBtnDisabled: {
        backgroundColor: Theme.colors.green + '88',
    },
    continueBtnText: {
        color: Theme.colors.white,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
