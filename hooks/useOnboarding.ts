import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const KEYS = {
    PHONE: '@driver_app/phone',
    VEHICLE_TYPE: '@driver_app/vehicle_type',
    DOCS: '@driver_app/docs',
    ONBOARDING_DONE: '@driver_app/onboarding_done',
    FULL_NAME: '@driver_app/full_name',
};

export type DocKey = 'profile_photo' | 'aadhaar' | 'rc' | 'driving_license' | 'language';
export type DocStatus = 'pending' | 'in_review' | 'completed';

export const DEFAULT_DOCS: Record<DocKey, DocStatus> = {
    profile_photo: 'pending',
    aadhaar: 'pending',
    rc: 'pending',
    driving_license: 'pending',
    language: 'completed',
};

export interface OnboardingState {
    phone: string | null;
    fullName: string | null;
    vehicleType: string | null;
    docs: Record<DocKey, DocStatus>;
    isOnboardingDone: boolean;
}

function useOnboardingBase() {
    const [state, setState] = useState<OnboardingState>({
        phone: null,
        fullName: null,
        vehicleType: null,
        docs: DEFAULT_DOCS,
        isOnboardingDone: false,
    });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const results = await AsyncStorage.multiGet([
                KEYS.PHONE, KEYS.VEHICLE_TYPE, KEYS.DOCS, KEYS.ONBOARDING_DONE, KEYS.FULL_NAME,
            ]);
            const map = Object.fromEntries(results.map(([k, v]) => [k, v]));
            let parsedDocs = map[KEYS.DOCS] ? JSON.parse(map[KEYS.DOCS] as string) : DEFAULT_DOCS;
            // Force language to be completed even if cached state says pending
            parsedDocs = { ...parsedDocs, language: 'completed' };

            setState({
                phone: map[KEYS.PHONE] ?? null,
                fullName: map[KEYS.FULL_NAME] ?? null,
                vehicleType: map[KEYS.VEHICLE_TYPE] ?? null,
                docs: parsedDocs,
                isOnboardingDone: map[KEYS.ONBOARDING_DONE] === 'true',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const savePhone = async (phone: string) => {
        await AsyncStorage.setItem(KEYS.PHONE, phone);
        setState(prev => ({ ...prev, phone }));
    };

    const saveFullName = async (fullName: string) => {
        await AsyncStorage.setItem(KEYS.FULL_NAME, fullName);
        setState(prev => ({ ...prev, fullName }));
    };

    const saveVehicleType = async (vehicleType: string) => {
        await AsyncStorage.setItem(KEYS.VEHICLE_TYPE, vehicleType);
        setState(prev => ({ ...prev, vehicleType }));
    };

    const updateDocStatus = async (doc: DocKey, status: DocStatus) => {
        const newDocs = { ...state.docs, [doc]: status };
        await AsyncStorage.setItem(KEYS.DOCS, JSON.stringify(newDocs));
        setState(prev => ({ ...prev, docs: newDocs }));
    };

    const completeOnboarding = async () => {
        await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
        setState(prev => ({ ...prev, isOnboardingDone: true }));
    };

    const resetOnboarding = async () => {
        await AsyncStorage.multiRemove(Object.values(KEYS));
        setState({ phone: null, fullName: null, vehicleType: null, docs: DEFAULT_DOCS, isOnboardingDone: false });
    };

    // Computed helpers
    const completedCount = Object.values(state.docs).filter(s => s === 'completed').length;
    const pendingCount = Object.values(state.docs).filter(s => s === 'pending').length;
    const nextPendingDoc = (Object.entries(state.docs) as [DocKey, DocStatus][])
        .find(([, s]) => s === 'pending')?.[0] ?? null;

    return {
        state,
        loading,
        completedCount,
        pendingCount,
        nextPendingDoc,
        savePhone,
        saveFullName,
        saveVehicleType,
        updateDocStatus,
        completeOnboarding,
        resetOnboarding,
        reload: load,
    };
}

const OnboardingContext = createContext<ReturnType<typeof useOnboardingBase> | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const onboarding = useOnboardingBase();
    return React.createElement(OnboardingContext.Provider, { value: onboarding }, children);
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}
