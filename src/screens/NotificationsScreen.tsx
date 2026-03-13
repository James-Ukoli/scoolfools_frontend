import React from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import { useNotifications } from "../context/NotificationsContext";

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const { enabled, expoPushToken, loading, toggleNotifications } = useNotifications();

    const handleToggle = async () => {
        try {
            await toggleNotifications();
        } catch (error: any) {
            console.log("Error toggling notifications:", error);
            Alert.alert(
                "Error",
                error?.message
                    ? String(error.message)
                    : JSON.stringify(error, null, 2)
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader />

            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="arrow-left" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Text style={styles.title}>Notifications</Text>
                </View>

                <Text style={styles.subtitle}>
                    Turn on alerts for new featured posts in Just Move.
                </Text>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.textWrap}>
                            <Text style={styles.label}>Featured post alerts</Text>
                            <Text style={styles.helper}>
                                Receive a push notification when a featured article goes live.
                            </Text>
                        </View>

                        {loading ? (
                            <ActivityIndicator color="#4DA3FF" />
                        ) : (
                            <Switch value={enabled} onValueChange={handleToggle} />
                        )}
                    </View>
                </View>

                {/* <View style={styles.debugBox}>
                    <Text style={styles.debugTitle}>Debug token</Text>
                    <Text style={styles.debugText}>
                        {expoPushToken ?? "No push token yet"}
                    </Text>
                </View> */}
            </View>

            <TouchableOpacity
                style={styles.homeButton}
                onPress={() => navigation.navigate("MainTabs")}
            >
                <Feather name="home" size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000000",
    },
    container: {
        flex: 1,
        padding: 16,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "700",
    },
    subtitle: {
        color: "#9AA8C3",
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    card: {
        backgroundColor: "#0B1224",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#1B2A4A",
        marginBottom: 18,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    textWrap: {
        flex: 1,
    },
    label: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    helper: {
        color: "#8EA0BF",
        fontSize: 13,
        lineHeight: 18,
    },
    debugBox: {
        backgroundColor: "#08101F",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#12203A",
    },
    debugTitle: {
        color: "#4DA3FF",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 8,
    },
    debugText: {
        color: "#DCE6F7",
        fontSize: 12,
    },
    homeButton: {
        position: "absolute",
        right: 20,
        bottom: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        alignItems: "center",
        justifyContent: "center",
    },
});