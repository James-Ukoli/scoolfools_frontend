import React, { useState } from "react";
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
import AppHeader from "../components/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const PRIVACY_POLICY_URL =
    "https://docs.google.com/document/d/1aouqTuruJxHGwKUf7yoNg3KgyZhksN9j9idc23HoQSE/edit?usp=sharing";
const TERMS_URL =
    "https://docs.google.com/document/d/157PCh_AwbA-Yd76I-5hDVmWCEaJva2Vsmh_X2CkdFN4/edit?usp=sharing";

export default function MenuScreen() {
    const navigation = useNavigation<any>();
    const [aboutVisible, setAboutVisible] = useState(false);

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

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
                            console.log("DELETE ACCOUNT RESPONSE:", data);

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

    if (!fontsLoaded) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <AppHeader />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader />

            <View style={styles.content}>
                <View style={styles.hero}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroEyebrow}>JUST MOVE</Text>
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
                            icon="information-circle-outline"
                            color="#3CF2FF"
                            title="About Just Move"
                            onPress={() => setAboutVisible(true)}
                        />

                        <MenuItem
                            icon="mail-outline"
                            color="#3CF2FF"
                            title="Contact Us"
                            onPress={() => navigation.navigate("ContactUs")}
                        />

                        <MenuItem
                            icon="notifications-outline"
                            color="#3CF2FF"
                            title="Notifications"
                            onPress={() => navigation.navigate("Notifications")}
                        />

                        <MenuItem
                            icon="calendar-outline"
                            color="#3CF2FF"
                            title="Events"
                            onPress={() => navigation.navigate("EventsScreen")}
                        />

                        <MenuItem
                            icon="game-controller-outline"
                            color="#FFD166"
                            title="Chess Party Games! 🎉"
                            onPress={() => navigation.navigate("GameHome")}
                        />
                    </View>

                    <View style={styles.sectionGap} />

                    <View style={styles.card}>
                        <MenuItem
                            icon="document-text-outline"
                            color="#3CF2FF"
                            title="Privacy Policy"
                            onPress={() => handleOpenLink(PRIVACY_POLICY_URL, "Privacy Policy")}
                        />

                        <MenuItem
                            icon="shield-checkmark-outline"
                            color="#3CF2FF"
                            title="Terms & Conditions"
                            onPress={() => handleOpenLink(TERMS_URL, "Terms & Conditions")}
                        />
                    </View>

                    <View style={styles.sectionGap} />

                    <View style={styles.card}>
                        <MenuItem
                            icon="log-out-outline"
                            color="#FFD166"
                            title="Logout"
                            onPress={handleLogout}
                        />

                        <MenuItem
                            icon="trash-outline"
                            color="#FF6B6B"
                            title="Delete Account"
                            danger
                            last
                            onPress={handleDeleteAccount}
                        />
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

            <Modal
                visible={aboutVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAboutVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>About Just Move</Text>

                            <Pressable
                                onPress={() => setAboutVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={22} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            <Text style={styles.modalBody}>
                                Just Move is a home for casual chess fans to follow trending
                                stories, blogs, major events, TV content, and power rankings in one place.
                            </Text>

                            <Text style={styles.modalBody}>
                                The app is built to make chess feel easier to follow, more modern,
                                and more connected to the culture around the game.
                            </Text>

                            <Text style={styles.modalBody}>
                                Whether you want quick updates, event countdowns, or fresh opinions
                                around the chess world, Just Move is designed to keep things simple
                                and fun.
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
}: {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    title: string;
    onPress: () => void;
    danger?: boolean;
    last?: boolean;
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

            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },

    hero: {
        minHeight: 78,
        borderRadius: 24,
        backgroundColor: "#070A10",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.22)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        marginBottom: 18,
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
        marginRight: 13,
    },
    heroTextWrap: {
        flex: 1,
    },
    heroEyebrow: {
        color: "#3CF2FF",
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.8,
    },
    screenTitle: {
        color: "#FFFFFF",
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
        backgroundColor: "#050816",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#12203A",
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
        borderBottomColor: "#101A2E",
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
        backgroundColor: "#0B1220",
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    menuText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginLeft: 13,
    },
    deleteText: {
        color: "#FF6B6B",
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
        backgroundColor: "#0B1A4A",
        borderWidth: 1.5,
        borderColor: "#3CF2FF",
        shadowColor: "#3CF2FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
        elevation: 8,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.72)",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    modalCard: {
        backgroundColor: "#050816",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#3CF2FF",
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
        borderBottomColor: "#101A2E",
    },
    modalTitle: {
        color: "#FFFFFF",
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
        backgroundColor: "#0B1220",
    },
    modalScrollContent: {
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    modalBody: {
        color: "#D7DBE3",
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 16,
    },
});