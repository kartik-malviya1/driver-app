import { useRouter } from 'expo-router';
import { CheckCircle2Icon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';

import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Theme } from '../../constants/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
    const router = useRouter();
    const { state, saveFullName, savePhone } = useOnboarding();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Pre-fill phone if it was entered in the phone step
    useEffect(() => {
        if (state.phone) {
            // Strip country code prefix for display
            const stripped = state.phone.startsWith('+91')
                ? state.phone.slice(3)
                : state.phone;
            setPhone(stripped);
        }
    }, [state.phone]);

    const cameFromPhoneStep = !!state.phone;

    const handleSignup = async () => {
        if (!email || !password || !fullName) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        user_type: 'driver',
                        phone: cameFromPhoneStep ? state.phone : `+91${phone}`,
                    },
                },
            });

            if (error) {
                Alert.alert('Signup Error', error.message);
            } else {
                // Persist name for onboarding checklist
                await saveFullName(fullName);
                // Persist phone if entered here (not from phone step)
                if (!cameFromPhoneStep && phone.length === 10) {
                    await savePhone(`+91${phone}`);
                }

                router.replace('/(onboarding)/vehicle-type');
            }
        } catch (err) {
            console.error('Unexpected signup error:', err);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = fullName.length > 0 && email.length > 0 && password.length >= 6;

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Mini brand */}
                    <View style={styles.miniLogo}>
                        <Text style={{ fontSize: 22 }}>🛺</Text>
                    </View>

                    <View style={styles.headerContainer}>
                        <Text style={styles.step}>Step 2 of 4</Text>
                        <Text style={styles.headerText}>Create your account</Text>
                        <Text style={styles.subheader}>Join thousands of drivers earning with AutoDrive</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Input
                            label="Full Name"
                            placeholder="John Doe"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                        />

                        <Input
                            label="Email address"
                            placeholder="name@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        {/* Phone — pre-filled if came from phone screen, editable otherwise */}
                        <View style={styles.phoneWrapper}>
                            <Text style={styles.label}>Mobile number</Text>

                            <View style={styles.phoneBox}>
                                <Text style={styles.phoneText}>+91 {phone}</Text>

                                {cameFromPhoneStep && (
                                    <View className='flex-row items-center gap-1 rounded-full px-2 py-1'>
                                        <CheckCircle2Icon size={22} color={Theme.colors.green} />
                                    </View>
                                )}
                            </View>
                        </View>
                        <Input
                            label="Password"
                            placeholder="Create a password (min 6 characters)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <Button
                            title="Create Account"
                            onPress={handleSignup}
                            disabled={!isFormValid}
                            loading={loading}
                        />

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                                <Text style={styles.linkText}>Log In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Theme.colors.white,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    phoneWrapper: {
        marginBottom: 16,
    },

    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        color: Theme.colors.gray,
    },

    phoneBox: {
        height: 56,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
    },

    phoneText: {
        fontSize: 16,
        fontWeight: '500',
        color: Theme.colors.gray,
    },

    // verifiedBadge: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     gap: 6,
    // },

    verifiedText: {
        fontSize: 13,
        fontWeight: '600',
        color: Theme.colors.green,
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
        marginBottom: 28,
    },
    headerContainer: {
        marginBottom: 30,
        alignItems: 'center',
    },
    step: {
        fontSize: 13,
        fontWeight: '600',
        color: Theme.colors.green,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    headerText: {
        fontSize: 30,
        fontWeight: '800',
        color: Theme.colors.black,
        lineHeight: 38,
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subheader: {
        fontSize: 15,
        color: Theme.colors.gray,
        lineHeight: 30,
    },
    formContainer: {
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    footerText: {
        fontSize: 15,
        color: Theme.colors.gray,
    },
    linkText: {
        fontSize: 15,
        color: Theme.colors.green,
        fontWeight: '700',
    },
});