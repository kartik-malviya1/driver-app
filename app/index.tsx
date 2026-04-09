import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();
     const [selectedLang, setSelectedLang] = useState('EN');
    const [open, setOpen] = useState(false);

    const languages = [
        { label: 'English', value: 'EN' },
        { label: 'Hindi', value: 'HI' },
        { label: 'Marathi', value: 'MR' },
    ];

    const handleSelect = (lang:string) => {
        setSelectedLang(lang);
        setOpen(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4C430" />

            {/* Header */}
            <View style={styles.header}>
    <View style={styles.langWrapper}>
        <TouchableOpacity
            style={styles.langSelector}
            onPress={() => setOpen(!open)}
        >
            <Text style={styles.langText}>{selectedLang}</Text>
            <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={16}
                color="#111"
            />
        </TouchableOpacity>

        {open && (
            <View style={styles.dropdown}>
                {languages.map((item) => (
                    <TouchableOpacity
                        key={item.value}
                        style={styles.dropdownItem}
                        onPress={() => handleSelect(item.value)}
                    >
                        <Text style={styles.dropdownText}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        )}
    </View>
</View>

            {/* HERO TEXT */}
            <View style={styles.content}>
                <Text style={styles.title}>Auto</Text>
                <Text style={styles.title}>Rickshaw</Text>

                <Text style={styles.tagline}>
                    The fastest way to get around your city
                </Text>
            </View>

            {/* IMAGE */}
            <Image
                source={require('../assets/images/autosplash.png')}
                style={styles.image}
                resizeMode="contain"
            />

            {/* CTA */}
            <View style={styles.ctaSection}>
                <TouchableOpacity
                    style={styles.getStartedBtn}
                    onPress={() => router.push('/(auth)/phone')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.getStartedText}>Get started</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4C430',
    },
  
    langWrapper: {
    position: 'relative', 
},

    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 10,
    },

    langSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    langText: {
        fontSize: 13,
        color: '#111',
        fontWeight: '600',
    },

  dropdown: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: '#000000',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 999,
    width: 120,
},

    dropdownItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },

    dropdownText: {
        fontSize: 13,
        color: '#ffff',
    },

    content: {
        paddingHorizontal: 24,
        marginTop: 40,
    },

    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#111',
        lineHeight: 52,
    },

    tagline: {
        fontSize: 15,
        color: '#222',
        marginTop: 14,
        maxWidth: '75%',
        lineHeight: 22,
    },

    image: {
        position: 'absolute',
        bottom: 120,
        right: 25,
        width: width * 1.2,
        height: width * 1.2,
    },

    ctaSection: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
    },

    getStartedBtn: {
        height: 54,
        backgroundColor: '#111', // Uber style dark CTA
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    getStartedText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});