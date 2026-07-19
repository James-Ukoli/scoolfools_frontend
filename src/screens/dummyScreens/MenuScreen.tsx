import React, { useMemo, useState } from "react";
import {
    Alert,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const PRIVACY_POLICY_URL =
    "https://docs.google.com/document/d/1aouqTuruJxHGwKUf7yoNg3KgyZhksN9j9idc23HoQSE/edit?usp=sharing";

const TERMS_URL =
    "https://docs.google.com/document/d/157PCh_AwbA-Yd76I-5hDVmWCEaJva2Vsmh_X2CkdFN4/edit?usp=sharing";

type ThemeMode = "day" | "night";

const getCurrentThemeMode = (): ThemeMode => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getMenuTheme = (mode: ThemeMode) => {
    const isDay = mode === "day";

    return {
        bg: isDay ? "#FFFFFF" : "#000000",
        card: isDay ? "#F8FAFC" : "#050816",
        hero: isDay ? "#FFFFFF" : "#070A10",
        bubble: isDay ? "#EAFBFF" : "#0B1220",
        text: isDay ? "#07111F" : "#FFFFFF",
        subtext: isDay ? "#475569" : "#D7DBE3",
        muted: isDay ? "#64748B" : "#8A8F98",
        border: isDay ? "rgba(7,17,31,0.10)" : "#12203A",
        divider: isDay ? "rgba(7,17,31,0.08)" : "#101A2E",
        cyan: "#06B6D4",
        yellow: "#FACC15",
        danger: "#FF6B6B",
        homeBg: isDay ? "#06B6D4" : "#0B1A4A",
    };
};

export default function MenuScreen() {
    const navigation = useNavigation<any>();
    const [aboutVisible, setAboutVisible] = useState(false);

    const themeMode = getCurrentThemeMode();
    const theme = useMemo(() => getMenuTheme(themeMode), [themeMode]);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const handleOpenLink = async (url: string, label: string) => {
        try {
            const supported = await Linking.canOpenURL(url);

            if (!supported) {
                Alert.alert("Link unavailable", `Unable to open ${label} right now.`);
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            console.log(`Open ${label} error:`, error);
            Alert.alert("Error", `Failed to open ${label}.`);
        }
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    try {
                        try {
                            await GoogleSignin.signOut();
                        } catch (error) {
                            console.log("Google sign out warning:", error);
                        }

                        await AsyncStorage.removeItem("token");
                        await AsyncStorage.removeItem("user");

                        navigation.replace("GoogleSignIn");
                    } catch (error) {
                        console.log("Logout error:", error);
                        Alert.alert("Error", "Failed to log out.");
                    }
                },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("token");

                            if (!token) {
                                throw new Error("No auth token found.");
                            }

                            const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                                method: "DELETE",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                },
                            });

                            const data = await res.json();

                            if (!res.ok) {
                                throw new Error(data?.message || "Failed to delete account");
                            }

                            try {
                                await GoogleSignin.signOut();
                            } catch (error) {
                                console.log("Google sign out warning:", error);
                            }

                            await AsyncStorage.removeItem("token");
                            await AsyncStorage.removeItem("user");

                            Alert.alert("Account deleted");
                            navigation.replace("GoogleSignIn");
                        } catch (error: any) {
                            console.log("Delete account error:", error);
                            Alert.alert("Error", error?.message || "Failed to delete account.");
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>

            <View style={styles.content}>
                <View style={styles.hero}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={22} color={theme.text} />
                    </TouchableOpacity>

                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroEyebrow}>SCOOLFOOLS</Text>
                        <Text style={styles.screenTitle}>Menu</Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <MenuItem
                            icon="person-circle-outline"
                            color={theme.cyan}
                            title="Account Settings"
                            onPress={() => navigation.navigate("AccountSettings")}
                            styles={styles}
                            theme={theme}
                        />
                        <MenuItem icon="information-circle-outline" color={theme.cyan} title="About ScoolFools" onPress={() => setAboutVisible(true)} styles={styles} theme={theme} />
                        <MenuItem icon="mail-outline" color={theme.cyan} title="Contact Us" onPress={() => navigation.navigate("ContactUs")} styles={styles} theme={theme} />
                        <MenuItem icon="notifications-outline" color={theme.cyan} title="Notifications" onPress={() => navigation.navigate("Notifications")} styles={styles} theme={theme} />
                        <MenuItem icon="calendar-outline" color={theme.cyan} title="Events" onPress={() => navigation.navigate("EventsScreen")} styles={styles} theme={theme} />
                        <MenuItem icon="game-controller-outline" color={theme.yellow} title="Party Games! 🎉" onPress={() => navigation.navigate("GameHome")} styles={styles} theme={theme} />
                    </View>

                    <View style={styles.sectionGap} />

                    <View style={styles.card}>
                        <MenuItem icon="document-text-outline" color={theme.cyan} title="Privacy Policy" onPress={() => handleOpenLink(PRIVACY_POLICY_URL, "Privacy Policy")} styles={styles} theme={theme} />
                        <MenuItem icon="shield-checkmark-outline" color={theme.cyan} title="Terms & Conditions" onPress={() => handleOpenLink(TERMS_URL, "Terms & Conditions")} styles={styles} theme={theme} last />
                    </View>

                    <View style={styles.sectionGap} />

                    <View style={styles.card}>
                        <MenuItem icon="log-out-outline" color={theme.yellow} title="Logout" onPress={handleLogout} styles={styles} theme={theme} />
                        <MenuItem icon="trash-outline" color={theme.danger} title="Delete Account" danger last onPress={handleDeleteAccount} styles={styles} theme={theme} />
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>

                <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.homeButton}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                    >
                        <Ionicons name="home" size={21} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>About ScoolFools</Text>

                            <Pressable onPress={() => setAboutVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={22} color={theme.text} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                            <Text style={styles.modalBody}>
                                ScoolFools is a student community app built for campus news, sports, rankings, TV content, and student culture.
                            </Text>

                            <Text style={styles.modalBody}>
                                The goal is to make school life feel more connected, more fun, and easier to follow.
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function MenuItem({
    icon,
    color,
    title,
    onPress,
    danger = false,
    last = false,
    styles,
    theme,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    title: string;
    onPress: () => void;
    danger?: boolean;
    last?: boolean;
    styles: ReturnType<typeof createStyles>;
    theme: ReturnType<typeof getMenuTheme>;
}) {
    return (
        <TouchableOpacity
            style={[styles.menuItem, last && styles.lastMenuItem]}
            activeOpacity={0.85}
            onPress={onPress}
        >
            <View style={styles.menuLeft}>
                <View style={[styles.iconBubble, { borderColor: `${color}55` }]}>
                    <Ionicons name={icon} size={21} color={color} />
                </View>

                <Text style={[styles.menuText, danger && styles.deleteText]}>
                    {title}
                </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </TouchableOpacity>
    );
}

const createStyles = (theme: ReturnType<typeof getMenuTheme>) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.bg,
        },
        content: {
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 12,
        },
        hero: {
            minHeight: 78,
            borderRadius: 24,
            backgroundColor: theme.hero,
            borderWidth: 1,
            borderColor: theme.cyan + "55",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            marginBottom: 18,
        },
        backButton: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.bubble,
            borderWidth: 1,
            borderColor: theme.border,
            marginRight: 13,
        },
        heroTextWrap: {
            flex: 1,
        },
        heroEyebrow: {
            color: theme.cyan,
            fontSize: 13,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 1.8,
        },
        screenTitle: {
            color: theme.text,
            fontSize: 32,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.6,
            marginTop: -2,
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            paddingBottom: Platform.OS === "android" ? 210 : 150,
        },
        card: {
            backgroundColor: theme.card,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: "hidden",
        },
        sectionGap: {
            height: 14,
        },
        menuItem: {
            minHeight: 64,
            paddingHorizontal: 15,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: theme.divider,
        },
        lastMenuItem: {
            borderBottomWidth: 0,
        },
        menuLeft: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            paddingRight: 12,
        },
        iconBubble: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.bubble,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        menuText: {
            color: theme.text,
            fontSize: 18,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.35,
            marginLeft: 13,
        },
        deleteText: {
            color: theme.danger,
        },
        bottomSpacer: {
            height: 30,
        },
        fixedHomeButtonWrap: {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: Platform.OS === "android" ? 78 : 28,
            alignItems: "center",
            justifyContent: "center",
        },
        homeButton: {
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.homeBg,
            borderWidth: 1.5,
            borderColor: theme.cyan,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.72)",
            justifyContent: "center",
            paddingHorizontal: 20,
        },
        modalCard: {
            backgroundColor: theme.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.cyan,
            maxHeight: "70%",
            overflow: "hidden",
        },
        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.divider,
        },
        modalTitle: {
            color: theme.text,
            fontSize: 24,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.4,
            flex: 1,
            paddingRight: 12,
        },
        closeButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.bubble,
        },
        modalScrollContent: {
            paddingHorizontal: 18,
            paddingVertical: 18,
        },
        modalBody: {
            color: theme.subtext,
            fontSize: 15,
            lineHeight: 24,
            marginBottom: 16,
        },
    });