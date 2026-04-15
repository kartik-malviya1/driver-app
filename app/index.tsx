import Theme from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState("EN");
  const [open, setOpen] = useState(false);

  const languages = [
    { label: "English", value: "EN" },
    { label: "Hindi", value: "HI" },
    { label: "Marathi", value: "MR" },
  ];

  const handleSelect = (lang: string) => {
    setSelectedLang(lang);
    setOpen(false);
  };

  return (
    <LinearGradient
      colors={["#FFF176", "#FFD54F", "#FFC107"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* HEADER */}
        <View style={styles.header}>
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
                  <Text style={styles.dropdownText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.title}>
            Sawari <Text style={styles.titleLight}>Auto</Text>
          </Text>

          <Text style={styles.tagline}>
            Fast, reliable rides at your fingertips
          </Text>
        </View>

        {/* IMAGE */}
        <Image
          source={require("../assets/images/autosplash.png")}
          style={styles.image}
          resizeMode="contain"
        />

        {/* CTA */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={() => router.push("/(auth)/phone")}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  langSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  langText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },

  dropdown: {
    position: "absolute",
    top: 30,
    right: 6,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 6,
    width: 130,
  },

  dropdownItem: {
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  dropdownText: {
    color: "#fff",
    fontSize: 13,
  },

  hero: {
    marginTop: 80,
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 50,
    fontWeight: "900",
    color: Theme.colors.sawari,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },

  titleLight: {
    fontWeight: "800",
    color: "#123",
  },

  tagline: {
    marginTop: 14,
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    maxWidth: "75%",
  },

  image: {
    position: "absolute",
    bottom: 120,
    right: -40,
    width: width * 1.4,
    height: width * 1.4,
    opacity: 0.92,
  },

  ctaSection: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
  },

  getStartedBtn: {
    height: 56,
    backgroundColor: "#111",
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    // shadow for depth
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  getStartedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
