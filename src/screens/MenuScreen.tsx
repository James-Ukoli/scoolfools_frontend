import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppHeader from "../components/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

export default function MenuScreen() {
    const navigation = useNavigation<any>();

    const handleAbout = () => {
        Alert.alert(
            "About Just Move",
            "Just Move is a home for casual chess fans to follow trending stories, blogs, events, and power rankings."
        );
    };

    const handleNotifications = () => {
        Alert.alert(
            "Notifications",
            "Push notification settings will live here. For MVP, users will be notified only for featured posts."
        );
    };

    const handleDonate = () => {
        Alert.alert(
            "Donate",
            "Add your donation link here later, such as Buy Me a Coffee, Stripe, or your website donation page."
        );
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
                            // Replace this with your real auth token later
                            const token = await AsyncStorage.getItem("token");
                            const res = await fetch(`${API_BASE_URL}/auth/me`, {
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

                            Alert.alert("Account deleted");
                            navigation.navigate("GoogleSignIn");
                        } catch (error) {
                            console.log("Delete account error:", error);
                            Alert.alert("Error", "Failed to delete account.");
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

                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        activeOpacity={0.85}
                        onPress={handleAbout}
                    >
                        <View style={styles.menuLeft}>
                            <Ionicons name="information-circle-outline" size={22} color="#3CF2FF" />
                            <Text style={styles.menuText}>About Just Move</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        activeOpacity={0.85}
                        onPress={handleNotifications}
                    >
                        <View style={styles.menuLeft}>
                            <Ionicons name="notifications-outline" size={22} color="#3CF2FF" />
                            <Text style={styles.menuText}>Notifications</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#8A8F98" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        activeOpacity={0.85}
                        onPress={handleDonate}
                    >
                        <View style={styles.menuLeft}>
                            <Ionicons name="heart-outline" size={22} color="#3CF2FF" />
                            <Text style={styles.menuText}>Donate</Text>
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

                <TouchableOpacity
                    style={styles.homeButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                >
                    <Ionicons name="home" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={styles.footerText}>Just Move MVP</Text>
            </View>
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
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        marginRight: 12,
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "700",
    },
    card: {
        backgroundColor: "#050816",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#12203A",
        overflow: "hidden",
    },
    menuItem: {
        minHeight: 64,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#12203A",
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    menuLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 12,
    },
    deleteText: {
        color: "#FF6B6B",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 12,
    },
    footerText: {
        marginTop: 18,
        textAlign: "center",
        color: "#6F7A8A",
        fontSize: 13,
    },
    homeButton: {
        position: "absolute",
        right: 18,
        bottom: 24,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#12203A",
        borderWidth: 1,
        borderColor: "#24406F",
    },
});