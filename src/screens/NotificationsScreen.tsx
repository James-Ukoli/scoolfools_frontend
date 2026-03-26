import React from "react";
import {
    ActivityIndicator,
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
    const { featuredEnabled, alertsEnabled, loading, toggleFeatured, toggleAlerts } =
        useNotifications();

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader />

            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                </View>

                <Text style={styles.subtitle}>
                    Customize which notifications you want to receive.
                </Text>

                {/* Featured */}
                <View style={styles.card}>
                    <Text style={styles.label}>Featured Posts</Text>
                    <Text style={styles.helper}>
                        Get notified when a featured article goes live.
                    </Text>
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Switch value={featuredEnabled} onValueChange={toggleFeatured} />
                    )}
                </View>

                {/* Alerts */}
                <View style={styles.card}>
                    <Text style={styles.label}>Alerts</Text>
                    <Text style={styles.helper}>
                        Breaking news, live games, results, and announcements.
                    </Text>
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Switch value={alertsEnabled} onValueChange={toggleAlerts} />
                    )}
                </View>
            </View>
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
        marginBottom: 12,
        gap: 12,
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
        marginBottom: 16,
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
        marginBottom: 10,
    },
});