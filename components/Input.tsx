import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Theme } from '../constants/theme';

interface InputProps extends TextInputProps {
    label: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
            <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
                <TextInput
                    style={styles.input}
                    placeholderTextColor={Theme.colors.lightGray}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.darkGray,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    labelFocused: {
        color: Theme.colors.green,
    },
    inputContainer: {
        backgroundColor: Theme.colors.surface,
        borderRadius: 10,
        paddingHorizontal: 16,
        height: 56,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Theme.colors.border,
    },
    inputContainerFocused: {
        borderColor: Theme.colors.green,
        backgroundColor: Theme.colors.greenPale,
    },
    input: {
        fontSize: 16,
        color: Theme.colors.black,
    },
});