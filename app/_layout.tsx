import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Theme } from '../constants/theme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { OnboardingProvider, useOnboarding } from '../hooks/useOnboarding';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

function RootLayoutNav() {
    const { session, loading: authLoading } = useAuth();
    const { state: onboarding, loading: onboardingLoading } = useOnboarding();
    const segments = useSegments() as unknown as string[];
    const router = useRouter();

    useEffect(() => {
        if (authLoading || onboardingLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';
        const onSplash = segments.length === 0;

        // If user is authenticated
        if (session) {
            if (onboarding.isOnboardingDone) {
                if (inAuthGroup || inOnboardingGroup || onSplash) {
                    router.replace('/home');
                }
            } else {
                if (segments[0] === 'home' || inAuthGroup || onSplash) {
                    if (onboarding.vehicleType) {
                        router.replace('/(onboarding)/checklist');
                    } else {
                        router.replace('/(onboarding)/vehicle-type');
                    }
                }
            }
        }
        // If user is NOT logged in
        if (!session) {
            if (segments[0] === 'home') {
                router.replace('/');
            }
        }
    }, [session, authLoading, onboardingLoading, segments, onboarding.isOnboardingDone]);

    if (authLoading || onboardingLoading) {
        return (
            
    <GluestackUIProvider mode="dark">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.white }}>
                <ActivityIndicator size="large" color={Theme.colors.green} />
            </View>
    </GluestackUIProvider>
  
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Theme.colors.white },
                animation: 'slide_from_right',
            }}
        >
            {/* Splash */}
            <Stack.Screen name="index" options={{ animation: 'fade' }} />

            {/* Main app */}
            <Stack.Screen name="home" />
            <Stack.Screen name="account" options={{ presentation: 'modal' }} />

            {/* Auth group */}
            <Stack.Screen name="(auth)/phone" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/otp" />
            <Stack.Screen name="(auth)/signup" />

            {/* Onboarding group — NOT protected */}
            <Stack.Screen name="(onboarding)/vehicle-type" />
            <Stack.Screen name="(onboarding)/checklist" />
            <Stack.Screen name="(onboarding)/upload" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GluestackUIProvider mode="light">
            <AuthProvider>
                <OnboardingProvider>
                    <StatusBar style="dark" />
                    <RootLayoutNav />
                </OnboardingProvider>
            </AuthProvider>
            </GluestackUIProvider>
        </GestureHandlerRootView>
    );
}