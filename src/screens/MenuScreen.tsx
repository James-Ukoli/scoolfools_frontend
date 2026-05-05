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
    const [partyGamesVisible, setPartyGamesVisible] = useState(false);

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

    const handleNotifications = () => {
        navigation.navigate("Notifications");
    };

    const handleEvents = () => {
        navigation.navigate("EventsScreen");
    };

    const handlePartyGames = () => {
        navigation.navigate("GameHome");
    };

    const handleContactUs = () => {
        navigation.navigate("ContactUs");
    };

    const handlePrivacyPolicy = () => {
        handleOpenLink(PRIVACY_POLICY_URL, "Privacy Policy");
    };

    const handleTerms = () => {
        handleOpenLink(TERMS_URL, "Terms & Conditions");
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

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader />

            <View style={styles.content}>
                <View style={styles.topRow}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Text style={styles.screenTitle}>Menu</Text>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={() => setAboutVisible(true)}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={22}
                                    color="#3CF2FF"
                                />
                                <Text style={styles.menuText}>About Just Move</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handleContactUs}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons name="mail-outline" size={22} color="#3CF2FF" />
                                <Text style={styles.menuText}>Contact Us</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handleNotifications}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons
                                    name="notifications-outline"
                                    size={22}
                                    color="#3CF2FF"
                                />
                                <Text style={styles.menuText}>Notifications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handleEvents}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={22}
                                    color="#3CF2FF"
                                />
                                <Text style={styles.menuText}>Events</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handlePartyGames}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons
                                    name="game-controller-outline"
                                    size={22}
                                    color="#FFD166"
                                />
                                <Text style={styles.menuText}>Chess Party Games! 🎉</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handlePrivacyPolicy}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons
                                    name="document-text-outline"
                                    size={22}
                                    color="#3CF2FF"
                                />
                                <Text style={styles.menuText}>Privacy Policy</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handleTerms}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons
                                    name="shield-checkmark-outline"
                                    size={22}
                                    color="#3CF2FF"
                                />
                                <Text style={styles.menuText}>Terms & Conditions</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.85}
                            onPress={handleLogout}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons name="log-out-outline" size={22} color="#FFD166" />
                                <Text style={styles.menuText}>Logout</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, styles.lastMenuItem]}
                            activeOpacity={0.85}
                            onPress={handleDeleteAccount}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                                <Text style={styles.deleteText}>Delete Account</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>

                <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.homeButton}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                    >
                        <Ionicons name="home" size={20} color="#FFFFFF" />
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
                                stories, blogs, major events, and power rankings in one place.
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

            <Modal
                visible={partyGamesVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPartyGamesVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chess Party Games! 🎉</Text>
                            <Pressable
                                onPress={() => setPartyGamesVisible(false)}
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
                                Party games for you and your chess friends are coming soon.
                            </Text>

                            <Text style={styles.modalBody}>
                                We’re cooking up fun social games built for chess fans, hangouts,
                                and good vibes.
                            </Text>

                            <Text style={styles.modalBody}>
                                Stay tuned for a future update. ♟️🔥
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
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
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
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
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 26,
        fontWeight: "800",
        marginLeft: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 140,
    },
    card: {
        backgroundColor: "#050816",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#12203A",
        overflow: "hidden",
    },
    menuItem: {
        minHeight: 62,
        paddingHorizontal: 18,
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
    menuText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 14,
    },
    deleteText: {
        color: "#FF6B6B",
        fontSize: 16,
        fontWeight: "700",
        marginLeft: 14,
    },
    bottomSpacer: {
        height: 30,
    },
    fixedHomeButtonWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    homeButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1A4A",
        borderWidth: 1.5,
        borderColor: "#1C3D8F",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
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
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#163055",
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
        fontSize: 20,
        fontWeight: "800",
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