import { Stack } from 'expo-router';
import React from 'react';
import { Theme } from '../../constants/theme';

// No auth protection — onboarding routes are freely accessible
export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Theme.colors.white },
                animation: 'slide_from_right',
            }}
        />
    );
}
