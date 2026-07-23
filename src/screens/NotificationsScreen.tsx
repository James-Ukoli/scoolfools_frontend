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

import { useNotifications } from "../context/NotificationsContext";
import {
    useTimeTheme,
    type TimeTheme,
} from "../context/TimeThemeContext";

const getNotificationTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            bg: "#F8FAFC",
            card: "#FFFFFF",
            cardAlt: "#ECFEFF",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border: "rgba(7,17,31,0.10)",
            borderStrong:
                "rgba(6,182,212,0.28)",
            cyan: "#06B6D4",
            yellow: "#FACC15",
            switchTrackOff: "#CBD5E1",
            iconBg: "#F1F5F9",
            shadow: "#06B6D4",
        };
    }

    return {
        bg: "#020617",
        card: "#090D14",
        cardAlt: "#07111F",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.10)",
        borderStrong:
            "rgba(34,211,238,0.30)",
        cyan: "#22D3EE",
        yellow: "#FACC15",
        switchTrackOff: "#1B2A4A",
        iconBg: "#0B1220",
        shadow: "#22D3EE",
    };
};

export default function NotificationsScreen() {
    const navigation =
        useNavigation<any>();

    const {
        featuredEnabled,
        alertsEnabled,
        loading,
        toggleFeatured,
        toggleAlerts,
    } = useNotifications();

    const { mode: themeMode } =
        useTimeTheme();

    const theme =
        getNotificationTheme(themeMode);

    return (
        <SafeAreaView
            edges={["left", "right"]}
            style={[
                styles.safeArea,
                {
                    backgroundColor:
                        theme.bg,
                },
            ]}
        >
            <View style={styles.container}>
                <View
                    style={[
                        styles.hero,
                        {
                            backgroundColor:
                                theme.card,
                            borderColor:
                                theme.borderStrong,
                            shadowColor:
                                theme.shadow,
                        },
                    ]}
                >
                    <TouchableOpacity
                        onPress={() =>
                            navigation.goBack()
                        }
                        style={[
                            styles.backButton,
                            {
                                backgroundColor:
                                    theme.cardAlt,
                                borderColor:
                                    theme.border,
                            },
                        ]}
                        activeOpacity={0.8}
                    >
                        <Feather
                            name="arrow-left"
                            size={22}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <View
                        style={
                            styles.heroTextWrap
                        }
                    >
                        <Text
                            style={[
                                styles.heroEyebrow,
                                {
                                    color:
                                        theme.cyan,
                                },
                            ]}
                        >
                            SCOOLFOOLS
                        </Text>

                        <Text
                            style={[
                                styles.title,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            Notifications
                        </Text>
                    </View>
                </View>

                <Text
                    style={[
                        styles.subtitle,
                        {
                            color:
                                theme.textSoft,
                        },
                    ]}
                >
                    Choose which updates you want pushed to your phone.
                </Text>

                <NotificationCard
                    icon="star-outline"
                    iconColor={theme.yellow}
                    title="Featured Posts"
                    description="Get notified when a featured article or major story goes live."
                    enabled={
                        featuredEnabled
                    }
                    loading={loading}
                    onToggle={
                        toggleFeatured
                    }
                    theme={theme}
                />

                <NotificationCard
                    icon="flash-outline"
                    iconColor={theme.cyan}
                    title="Breaking Alerts"
                    description="Breaking news, live games, results, announcements, and urgent updates."
                    enabled={alertsEnabled}
                    loading={loading}
                    onToggle={toggleAlerts}
                    theme={theme}
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
    theme,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    description: string;
    enabled: boolean;
    loading: boolean;
    onToggle: () => void;
    theme: ReturnType<
        typeof getNotificationTheme
    >;
}) {
    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor:
                        theme.card,
                    borderColor: enabled
                        ? theme.borderStrong
                        : theme.border,
                    shadowColor: enabled
                        ? theme.shadow
                        : "transparent",
                    shadowOpacity: enabled
                        ? 0.12
                        : 0,
                },
            ]}
        >
            <View style={styles.cardTopRow}>
                <View
                    style={[
                        styles.iconBubble,
                        {
                            backgroundColor:
                                theme.iconBg,
                            borderColor:
                                `${iconColor}55`,
                        },
                    ]}
                >
                    <Ionicons
                        name={icon}
                        size={22}
                        color={iconColor}
                    />
                </View>

                <View
                    style={
                        styles.cardTextWrap
                    }
                >
                    <Text
                        style={[
                            styles.label,
                            {
                                color:
                                    theme.text,
                            },
                        ]}
                    >
                        {title}
                    </Text>

                    <Text
                        style={[
                            styles.helper,
                            {
                                color:
                                    theme.textSoft,
                            },
                        ]}
                    >
                        {description}
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={theme.cyan}
                    />
                ) : (
                    <Switch
                        value={enabled}
                        onValueChange={
                            onToggle
                        }
                        trackColor={{
                            false:
                                theme.switchTrackOff,
                            true:
                                theme.cyan,
                        }}
                        thumbColor={
                            enabled
                                ? "#FFFFFF"
                                : theme.muted
                        }
                        ios_backgroundColor={
                            theme.switchTrackOff
                        }
                    />
                )}
            </View>

            <View
                style={[
                    styles.statusRow,
                    {
                        borderTopColor:
                            theme.border,
                    },
                ]}
            >
                <View
                    style={[
                        styles.statusDot,
                        {
                            backgroundColor:
                                enabled
                                    ? theme.cyan
                                    : theme.muted,
                        },
                    ]}
                />

                <Text
                    style={[
                        styles.statusText,
                        {
                            color:
                                theme.muted,
                        },
                    ]}
                >
                    {enabled
                        ? "Enabled"
                        : "Disabled"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
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
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        marginBottom: 14,
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        marginRight: 13,
    },
    heroTextWrap: {
        flex: 1,
    },
    heroEyebrow: {
        fontSize: 13,
        fontFamily:
            "Rajdhani_700Bold",
        letterSpacing: 1.8,
    },
    title: {
        fontSize: 31,
        fontFamily:
            "Rajdhani_700Bold",
        letterSpacing: 0.45,
        marginTop: -2,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 18,
    },
    card: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBubble: {
        width: 42,
        height: 42,
        borderRadius: 21,
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
        fontSize: 19,
        fontFamily:
            "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginBottom: 3,
    },
    helper: {
        fontSize: 13,
        lineHeight: 18,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 13,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        marginRight: 7,
    },
    statusText: {
        fontSize: 13,
        fontFamily:
            "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },
});