import { useRouter } from 'expo-router';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';

/**
 * Login screen — now redirects to phone-based OTP flow.
 * Password-based login has been removed.
 */
export default function LoginScreen() {
    const router = useRouter();

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
                        <Text style={styles.subheaderText}>Sign in with your phone number to start accepting rides</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <TouchableOpacity
                            style={styles.phoneLoginBtn}
                            onPress={() => router.replace('/(auth)/phone')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.phoneLoginText}>Continue with Phone Number</Text>
                        </TouchableOpacity>

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
    phoneLoginBtn: {
        height: 56,
        backgroundColor: Theme.colors.green,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    phoneLoginText: {
        color: Theme.colors.white,
        fontSize: 16,
        fontWeight: '700',
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