import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { OtpInput } from "react-native-otp-entry";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';

export default function PhoneScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isValid = otp.length === 6;

  const handleContinue = async () => {
    if (!isValid || loading) return;

    if (otp !== '123456') {
      setError('Invalid OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Fake API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      router.push('/(auth)/signup');
    } finally {
      setLoading(false);
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
            We've sent a one-time password (OTP) to your phone number Please enter it below to verify your number.
          </Text>

          {/* Otp Input Box */}
          <TouchableOpacity
            style={styles.phoneBox}
            activeOpacity={0.9}
            onPress={() => inputRef.current?.focus()}
          >
            <OtpInput
              numberOfDigits={6}
              focusColor="green"
              hideStick
              blurOnFilled
              type="numeric"
              onTextChange={(text: string) => {
                setOtp(text);
              }}
              onFilled={(text: string) => {
                setOtp(text);
                console.log(`OTP is ${text}`);
              }}
            />
          </TouchableOpacity>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Text style={styles.disclaimer}>
            Didn't receive a code?{' '}
            <Text style={styles.link} onPress={() => console.log('Resend OTP')}>
              Resend
            </Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!isValid || loading) && styles.continueBtnDisabled
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
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 6,
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  step: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.green,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
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
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  flagText: {
    fontSize: 22,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.black,
  },
  divider: {
    width: 1.5,
    height: 28,
    backgroundColor: Theme.colors.border,
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.black,
    letterSpacing: 1,
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
