import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { updateDriverAccount } from '../services/api';

const KEYS = {
    PHONE: '@driver_app/phone',
    VEHICLE_TYPE: '@driver_app/vehicle_type',
    VEHICLE_NUMBER: '@driver_app/vehicle_number',
    LICENSE_NUMBER: '@driver_app/license_number',
    LICENSE_URL: '@driver_app/license_url',
    AADHAAR_URL: '@driver_app/aadhaar_url',
    PHOTO_URL: '@driver_app/photo_url',
    RC_URL: '@driver_app/rc_url',
    DOCS: '@driver_app/docs',
    ONBOARDING_DONE: '@driver_app/onboarding_done',
    FULL_NAME: '@driver_app/full_name',
    EMAIL: '@driver_app/email',
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
    email: string | null;
    vehicleType: string | null;
    vehicleNumber: string | null;
    licenseNumber: string | null;
    licensePhotoUrl: string | null;
    aadhaarCardPhotoUrl: string | null;
    photoUrl: string | null;
    rcPhotoUrl: string | null;
    docs: Record<DocKey, DocStatus>;
    isOnboardingDone: boolean;
}

function useOnboardingBase() {
    const [state, setState] = useState<OnboardingState>({
        phone: null,
        fullName: null,
        email: null,
        vehicleType: null,
        vehicleNumber: null,
        licenseNumber: null,
        licensePhotoUrl: null,
        aadhaarCardPhotoUrl: null,
        photoUrl: null,
        rcPhotoUrl: null,
        docs: DEFAULT_DOCS,
        isOnboardingDone: false,
    });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const keys = [
                KEYS.PHONE, KEYS.VEHICLE_TYPE, KEYS.VEHICLE_NUMBER, KEYS.LICENSE_NUMBER,
                KEYS.LICENSE_URL, KEYS.AADHAAR_URL, KEYS.PHOTO_URL, KEYS.RC_URL,
                KEYS.DOCS, KEYS.ONBOARDING_DONE, KEYS.FULL_NAME, KEYS.EMAIL
            ];
            const results = await AsyncStorage.multiGet(keys);
            const map = Object.fromEntries(results.map(([k, v]) => [k, v]));
            let parsedDocs = map[KEYS.DOCS] ? JSON.parse(map[KEYS.DOCS] as string) : DEFAULT_DOCS;
            // Force language to be completed even if cached state says pending
            parsedDocs = { ...parsedDocs, language: 'completed' };

            setState({
                phone: map[KEYS.PHONE] ?? null,
                fullName: map[KEYS.FULL_NAME] ?? null,
                email: map[KEYS.EMAIL] ?? null,
                vehicleType: map[KEYS.VEHICLE_TYPE] ?? null,
                vehicleNumber: map[KEYS.VEHICLE_NUMBER] ?? null,
                licenseNumber: map[KEYS.LICENSE_NUMBER] ?? null,
                licensePhotoUrl: map[KEYS.LICENSE_URL] ?? null,
                aadhaarCardPhotoUrl: map[KEYS.AADHAAR_URL] ?? null,
                photoUrl: map[KEYS.PHOTO_URL] ?? null,
                rcPhotoUrl: map[KEYS.RC_URL] ?? null,
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

    const saveEmail = async (email: string) => {
        await AsyncStorage.setItem(KEYS.EMAIL, email);
        setState(prev => ({ ...prev, email }));
    };

    const saveVehicleType = async (vehicleType: string) => {
        await AsyncStorage.setItem(KEYS.VEHICLE_TYPE, vehicleType);
        setState(prev => ({ ...prev, vehicleType }));
    };

    const saveVehicleNumber = async (vehicleNumber: string) => {
        await AsyncStorage.setItem(KEYS.VEHICLE_NUMBER, vehicleNumber);
        setState(prev => ({ ...prev, vehicleNumber }));
    };

    const saveLicenseNumber = async (licenseNumber: string) => {
        await AsyncStorage.setItem(KEYS.LICENSE_NUMBER, licenseNumber);
        setState(prev => ({ ...prev, licenseNumber }));
    };

    const saveDocUrl = async (doc: DocKey, url: string) => {
        let key = '';
        if (doc === 'driving_license') key = KEYS.LICENSE_URL;
        else if (doc === 'aadhaar') key = KEYS.AADHAAR_URL;
        else if (doc === 'profile_photo') key = KEYS.PHOTO_URL;
        else if (doc === 'rc') key = KEYS.RC_URL;

        if (key) {
            await AsyncStorage.setItem(key, url);
            setState(prev => {
                const newState = { ...prev };
                if (doc === 'driving_license') newState.licensePhotoUrl = url;
                else if (doc === 'aadhaar') newState.aadhaarCardPhotoUrl = url;
                else if (doc === 'profile_photo') newState.photoUrl = url;
                else if (doc === 'rc') newState.rcPhotoUrl = url;
                return newState;
            });
        }
    };

    const updateDocStatus = async (doc: DocKey, status: DocStatus) => {
        const newDocs = { ...state.docs, [doc]: status };
        await AsyncStorage.setItem(KEYS.DOCS, JSON.stringify(newDocs));
        setState(prev => ({ ...prev, docs: newDocs }));
    };

    const completeOnboarding = async () => {
        try {
            const payload = {
                name: state.fullName || undefined,
                vehicleNumber: state.vehicleNumber || undefined,
                licenseNumber: state.licenseNumber || undefined,
                photoUrl: state.photoUrl || undefined,
                licensePhotoUrl: state.licensePhotoUrl || undefined,
                aadhaarCardPhotoUrl: state.aadhaarCardPhotoUrl || undefined,
                rcPhotoUrl: state.rcPhotoUrl || undefined,
            };

            // Only call update if there's something to update
            if (Object.values(payload).some(v => v !== undefined)) {
                await updateDriverAccount(payload);
            }
            
            await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
            setState(prev => ({ ...prev, isOnboardingDone: true }));
        } catch (error) {
            console.error('Failed to sync onboarding data with backend:', error);
            // We still mark it as done locally if it's a specific "already done" or validation error from server
            // but for now we let it throw so the UI can show an error
            throw error;
        }
    };

    const resetOnboarding = async () => {
        await AsyncStorage.multiRemove(Object.values(KEYS));
        setState({
            phone: null,
            fullName: null,
            email: null,
            vehicleType: null,
            vehicleNumber: null,
            licenseNumber: null,
            licensePhotoUrl: null,
            aadhaarCardPhotoUrl: null,
            photoUrl: null,
            rcPhotoUrl: null,
            docs: DEFAULT_DOCS,
            isOnboardingDone: false
        });
    };

    // Computed helpers
    const completedCount = Object.values(state.docs).filter(s => s === 'completed' || s === 'in_review').length;
    const pendingCount = Object.values(state.docs).filter(s => s === 'pending').length;
    const isFlowReady = pendingCount === 0 && !!state.fullName && !!state.vehicleNumber;
    const nextPendingDoc = (Object.entries(state.docs) as [DocKey, DocStatus][])
        .find(([, s]) => s === 'pending')?.[0] ?? null;

    return {
        state,
        loading,
        completedCount,
        pendingCount,
        isFlowReady,
        nextPendingDoc,
        savePhone,
        saveFullName,
        saveEmail,
        saveVehicleType,
        saveVehicleNumber,
        saveLicenseNumber,
        saveDocUrl,
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
