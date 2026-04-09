import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Theme } from '../../constants/theme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    const { completeOnboarding } = useOnboarding();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                Alert.alert('Login Error', error.message);
            } else {
                console.log('Login successful');
                await completeOnboarding();
            }
        } catch (error) {
            console.error('Unexpected login error:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Brand Mark */}
                    <View style={styles.brandContainer}>
                        <View style={styles.brandIcon}>
                            <Text style={styles.brandIconText}>🛺</Text>
                        </View>
                        <Text style={styles.brandName}>Driver Partner</Text>
                    </View>

                    <View style={styles.headerContainer}>
                        <Text style={styles.headerText}>Welcome back</Text>
                        <Text style={styles.subheaderText}>Sign in to start accepting rides</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Input
                            label="Email"
                            placeholder="name@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Input
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <Button
                            title="Sign In"
                            onPress={handleLogin}
                            disabled={!email || !password}
                            loading={loading}
                        />

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/phone')}>
                                <Text style={styles.linkText}>Sign Up</Text>
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
        paddingTop: 20,
    },
    brandContainer: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 10,
    },
    brandIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: Theme.colors.greenPale,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: Theme.colors.green,
    },
    brandIconText: {
        fontSize: 38,
    },
    brandName: {
        fontSize: 15,
        fontWeight: '700',
        color: Theme.colors.green,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    headerContainer: {
        marginBottom: 36,
        marginTop: 36,
    },
    headerText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: Theme.colors.black,
        lineHeight: 36,
    },
    subheaderText: {
        fontSize: 16,
        color: Theme.colors.gray,
        marginTop: 6,
    },
    formContainer: {
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
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