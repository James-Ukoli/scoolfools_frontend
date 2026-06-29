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
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import { useNotifications } from "../context/NotificationsContext";
import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const { featuredEnabled, alertsEnabled, loading, toggleFeatured, toggleAlerts } =
        useNotifications();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingScreen}>
                    <ActivityIndicator size="small" color="#3CF2FF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader />

            <View style={styles.container}>
                <View style={styles.hero}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Feather name="arrow-left" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroEyebrow}>JUST MOVE</Text>
                        <Text style={styles.title}>Notifications</Text>
                    </View>
                </View>

                <Text style={styles.subtitle}>
                    Choose which chess updates you want pushed to your phone.
                </Text>

                <NotificationCard
                    icon="star-outline"
                    iconColor="#F4D03F"
                    title="Featured Posts"
                    description="Get notified when a featured article or major story goes live."
                    enabled={featuredEnabled}
                    loading={loading}
                    onToggle={toggleFeatured}
                />

                <NotificationCard
                    icon="flash-outline"
                    iconColor="#3CF2FF"
                    title="Breaking Alerts"
                    description="Breaking news, live games, results, announcements, and urgent chess updates."
                    enabled={alertsEnabled}
                    loading={loading}
                    onToggle={toggleAlerts}
                />
            </View>
        </SafeAreaView>
    );
}

function NotificationCard({
    icon,
    iconColor,
    title,
    description,
    enabled,
    loading,
    onToggle,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    description: string;
    enabled: boolean;
    loading: boolean;
    onToggle: () => void;
}) {
    return (
        <View style={[styles.card, enabled && styles.cardEnabled]}>
            <View style={styles.cardTopRow}>
                <View style={[styles.iconBubble, { borderColor: `${iconColor}55` }]}>
                    <Ionicons name={icon} size={22} color={iconColor} />
                </View>

                <View style={styles.cardTextWrap}>
                    <Text style={styles.label}>{title}</Text>
                    <Text style={styles.helper}>{description}</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="small" color="#3CF2FF" />
                ) : (
                    <Switch
                        value={enabled}
                        onValueChange={onToggle}
                        trackColor={{
                            false: "#1B2A4A",
                            true: "#164E63",
                        }}
                        thumbColor={enabled ? "#3CF2FF" : "#8A8F98"}
                        ios_backgroundColor="#1B2A4A"
                    />
                )}
            </View>

            <View style={styles.statusRow}>
                <View
                    style={[
                        styles.statusDot,
                        { backgroundColor: enabled ? "#3CF2FF" : "#4B5563" },
                    ]}
                />

                <Text style={styles.statusText}>
                    {enabled ? "Enabled" : "Disabled"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000000",
    },
    loadingScreen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    container: {
        flex: 1,
        padding: 16,
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
        marginBottom: 14,
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
    title: {
        color: "#FFFFFF",
        fontSize: 31,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
        marginTop: -2,
    },
    subtitle: {
        color: "#9AA8C3",
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 18,
    },

    card: {
        backgroundColor: "#050816",
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: "#12203A",
        marginBottom: 16,
    },
    cardEnabled: {
        borderColor: "rgba(60,242,255,0.32)",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBubble: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#0B1220",
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    cardTextWrap: {
        flex: 1,
        paddingRight: 10,
    },
    label: {
        color: "#FFFFFF",
        fontSize: 19,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginBottom: 3,
    },
    helper: {
        color: "#8EA0BF",
        fontSize: 13,
        lineHeight: 18,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 13,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#101A2E",
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        marginRight: 7,
    },
    statusText: {
        color: "#AAB4C3",
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },
});