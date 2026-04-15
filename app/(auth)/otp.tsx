import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { sendOtp, verifyOtp } from '../../services/api';

export default function OtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ phoneNumber: string; exists: string }>();
    const { loginWithToken } = useAuth();
    const { completeOnboarding } = useOnboarding();
    const inputRef = useRef<TextInput>(null);

    const phoneNumber = params.phoneNumber || '';
    const userExists = params.exists === '1';

    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const isValid = otp.length === 4;

    const handleContinue = async () => {
        if (!isValid || loading) return;

        setError('');
        setLoading(true);

        try {
            const result = await verifyOtp(phoneNumber, otp);

            if (result.exists && result.token && result.user) {
                // Existing user — login directly
                await loginWithToken(result.token, result.user);
                await completeOnboarding();
                router.replace('/home');
            } else {
                // New user — go to signup
                router.push({
                    pathname: '/(auth)/signup',
                    params: { phoneNumber },
                });
            }
        } catch (err: any) {
            console.log('OTP verification error:', err);
            setError(err.message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resending) return;
        setResending(true);
        setError('');

        try {
            await sendOtp(phoneNumber);
            Alert.alert('OTP Sent', 'A new OTP has been sent to your phone. Check backend console.');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend OTP.');
        } finally {
            setResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Enter OTP</Text>
                    <Text style={styles.subtitle}>
                        We've sent a 4-digit code to{' '}
                        <Text style={{ fontWeight: '700', color: Theme.colors.black }}>
                            {phoneNumber}
                        </Text>
                        .{' '}
                        {userExists
                            ? 'Verify to login to your account.'
                            : 'Verify to create your account.'}
                    </Text>

                    {/* OTP Input Box */}
                    <TouchableOpacity
                        style={styles.phoneBox}
                        activeOpacity={0.9}
                        onPress={() => inputRef.current?.focus()}
                    >
                        <OtpInput
                            numberOfDigits={4}
                            focusColor="green"
                            hideStick
                            blurOnFilled
                            type="numeric"
                            onTextChange={(text: string) => {
                                setOtp(text);
                                setError('');
                            }}
                            onFilled={(text: string) => {
                                setOtp(text);
                            }}
                        />
                    </TouchableOpacity>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Text style={styles.disclaimer}>
                        Didn't receive a code?{' '}
                        <Text
                            style={styles.link}
                            onPress={handleResend}
                        >
                            {resending ? 'Sending...' : 'Resend'}
                        </Text>
                    </Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.continueBtn,
                            (!isValid || loading) && styles.continueBtnDisabled,
                        ]}
                        onPress={handleContinue}
                        disabled={!isValid || loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.continueBtnText}>
                            {loading ? 'Verifying...' : 'Continue →'}
                        </Text>
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
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
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
        borderColor: Theme.colors.green,
        height: 64,
        paddingHorizontal: 16,
        marginBottom: 20,
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
        backgroundColor: '#D0D0D0',
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    continueBtnText: {
        color: Theme.colors.white,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
