import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Theme } from '../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    loading = false,
    variant = 'primary',
    disabled = false
}) => {
    const isSecondary = variant === 'secondary';
    const isDanger = variant === 'danger';

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isSecondary ? styles.secondaryButton : isDanger ? styles.dangerButton : styles.primaryButton,
                (disabled || loading) && styles.disabledButton
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={isSecondary ? Theme.colors.green : Theme.colors.white} />
            ) : (
                <Text style={[
                    styles.text,
                    isSecondary ? styles.secondaryText : isDanger ? styles.dangerText : styles.primaryText
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginVertical: 10,
    },
    primaryButton: {
        backgroundColor: Theme.colors.green,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Theme.colors.green,
    },
    dangerButton: {
        backgroundColor: Theme.colors.danger,
    },
    disabledButton: {
        backgroundColor: Theme.colors.green + '88',
    },
    text: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    primaryText: {
        color: Theme.colors.white,
    },
    secondaryText: {
        color: Theme.colors.green,
    },
    dangerText: {
        color: Theme.colors.white,
    },
});