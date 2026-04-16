import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as WebBrowser from "expo-web-browser";
import AppHeader from "../components/AppHeader";

type RawAlertItem = {
    _id?: string;
    id?: string;
    title: string;
    message?: string;
    description?: string;
    topic?: "breaking" | "event" | "results" | "game" | "announcement" | "promotion";
    type?: string;
    link?: string;
    link_url?: string;
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    updated_at?: string;
};

type AlertItem = {
    id: string;
    title: string;
    message?: string;
    description?: string;
    topic?: "breaking" | "event" | "results" | "game" | "announcement" | "promotion";
    type?: string;
    link?: string;
    link_url?: string;
    createdAt?: string;
    updatedAt?: string;
};

type AlertsApiResponse =
    | RawAlertItem[]
    | {
        success?: boolean;
        data?: RawAlertItem[];
    };

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

function getTimeAgo(dateString?: string) {
    if (!dateString) return "";

    const now = Date.now();
    const posted = new Date(dateString).getTime();

    if (Number.isNaN(posted)) return "";

    const diffMs = Math.max(now - posted, 0);

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function getTopicLabel(item: AlertItem) {
    const raw = item.topic || item.type || "announcement";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getTopicConfig(topicRaw?: string) {
    const topic = (topicRaw || "announcement").toLowerCase();

    if (topic === "breaking") {
        return {
            label: "Breaking",
            color: "#FF4D4F",
            bg: "#2A0F14",
            border: "#5A1E27",
            icon: <Ionicons name="flash" size={18} color="#FF4D4F" />,
        };
    }

    if (topic === "event") {
        return {
            label: "Event",
            color: "#3CF2FF",
            bg: "#071A24",
            border: "#184457",
            icon: <Ionicons name="calendar-outline" size={18} color="#3CF2FF" />,
        };
    }

    if (topic === "results") {
        return {
            label: "Results",
            color: "#FFD84D",
            bg: "#231C08",
            border: "#5B4814",
            icon: (
                <MaterialCommunityIcons
                    name="podium-gold"
                    size={18}
                    color="#FFD84D"
                />
            ),
        };
    }

    if (topic === "game") {
        return {
            label: "Live Game",
            color: "#8B5CF6",
            bg: "#1A1233",
            border: "#3A2A73",
            icon: <FontAwesome6 name="chess-pawn" size={16} color="#8B5CF6" />,
        };
    }

    if (topic === "promotion") {
        return {
            label: "Promotion",
            color: "#22C55E",
            bg: "#0D2014",
            border: "#1F5A34",
            icon: <Ionicons name="pricetag-outline" size={18} color="#22C55E" />,
        };
    }

    return {
        label: "Announcement",
        color: "#FF8A3D",
        bg: "#241208",
        border: "#5E2C11",
        icon: <Ionicons name="megaphone-outline" size={18} color="#FF8A3D" />,
    };
}

function normalizeUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();

    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    if (
        trimmed.includes("youtube.com/") ||
        trimmed.includes("youtu.be/") ||
        trimmed.includes("www.youtube.com/") ||
        trimmed.includes("m.youtube.com/") ||
        trimmed.startsWith("www.")
    ) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

export default function AlertsScreen() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAlerts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/alerts`);
            const json: AlertsApiResponse = await response.json();

            let fetchedAlerts: RawAlertItem[] = [];

            if (Array.isArray(json)) {
                fetchedAlerts = json;
            } else if (Array.isArray(json?.data)) {
                fetchedAlerts = json.data;
            }

            const normalizedAlerts: AlertItem[] = fetchedAlerts
                .map((item, index) => ({
                    ...item,
                    id: item._id || item.id || `${item.title}-${index}`,
                    createdAt: item.created_at || item.createdAt,
                    updatedAt: item.updated_at || item.updatedAt,
                    link_url: item.link_url || item.link,
                }))
                .sort((a, b) => {
                    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
                    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
                    return bTime - aTime;
                })
                .slice(0, 20);

            setAlerts(normalizedAlerts);
        } catch (error) {
            console.log("Error fetching alerts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAlerts();
    }, [fetchAlerts]);

    const handleOpenAlert = async (item: AlertItem) => {
        const destination = item.link_url || item.link;
        if (!destination) return;

        try {
            const normalizedDestination = normalizeUrl(destination);

            if (!normalizedDestination) {
                Alert.alert("Link unavailable", "This alert link is empty.");
                return;
            }

            console.log("Opening alert URL:", normalizedDestination);

            await WebBrowser.openBrowserAsync(normalizedDestination);
        } catch (error) {
            console.log("Open alert link error:", error);
            Alert.alert("Error", "Failed to open alert link.");
        }
    };

    if (loading) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#39FF14" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <AppHeader />

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color="#39FF14" />
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#39FF14"
                        colors={["#39FF14"]}
                        progressBackgroundColor="#0B1224"
                    />
                }
            >
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}> 🚨 Alerts 📢 🚨</Text>
                </View>

                {alerts.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Ionicons
                            name="megaphone-outline"
                            size={40}
                            color="#8A8F98"
                        />
                        <Text style={styles.emptyTitle}>No alerts yet</Text>
                        <Text style={styles.emptyText}>
                            Important updates will show up here.
                        </Text>
                    </View>
                ) : (
                    alerts.map((item, index) => {
                        const topicConfig = getTopicConfig(item.topic || item.type);
                        const topicLabel = topicConfig.label;
                        const timeAgo = getTimeAgo(item.createdAt);
                        const description =
                            item.description || item.message || "No description available.";
                        const destination = item.link_url || item.link;
                        const showWatchNow =
                            (item.topic || item.type || "").toLowerCase() === "game" &&
                            !!destination;

                        return (
                            <TouchableOpacity
                                key={`${item.id}-${item.createdAt || index}`}
                                activeOpacity={0.85}
                                onPress={() => handleOpenAlert(item)}
                                style={styles.alertCard}
                            >
                                <View style={styles.topMetaRow}>
                                    <View style={styles.topicWrap}>
                                        <View
                                            style={[
                                                styles.topicIconBox,
                                                {
                                                    backgroundColor: topicConfig.bg,
                                                    borderColor: topicConfig.border,
                                                },
                                            ]}
                                        >
                                            {topicConfig.icon}
                                        </View>

                                        <View style={styles.topicTextWrap}>
                                            <Text
                                                style={[styles.topicText, { color: topicConfig.color }]}
                                                numberOfLines={1}
                                            >
                                                {topicLabel}
                                            </Text>

                                            {!!timeAgo && (
                                                <Text style={styles.timeText} numberOfLines={1}>
                                                    {timeAgo}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {showWatchNow ? (
                                        <View style={styles.watchNowPill}>
                                            <Text style={styles.watchNowText}>🎥 WATCH NOW</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <Text style={styles.alertTitle} numberOfLines={2}>
                                    {item.title}
                                </Text>

                                <Text style={styles.alertDescription} numberOfLines={2}>
                                    {description}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>
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
        backgroundColor: "#000000",
    },
    contentContainer: {
        paddingBottom: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    refreshIndicator: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 6,
        paddingBottom: 2,
    },
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
    },
    headerTitle: {
        color: "#ffffff",
        fontSize: 24,
        fontWeight: "900",
        textAlign: "center",

        letterSpacing: 2,
        textTransform: "uppercase",
        paddingHorizontal: 16, // prevents edge crowding

        textShadowColor: "#ff0000",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
    },
    alertCard: {
        backgroundColor: "#141414",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: "#1E1E1E",
        borderBottomWidth: 1,
        borderBottomColor: "#090909",
    },
    topMetaRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    topicWrap: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        paddingRight: 10,
    },
    topicIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    topicTextWrap: {
        flex: 1,
        justifyContent: "center",
    },
    topicText: {
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 1,
    },
    timeText: {
        color: "#8A8F98",
        fontSize: 12,
        fontWeight: "500",
    },
    watchNowPill: {
        backgroundColor: "#1B1B1B",
        borderWidth: 1,
        borderColor: "#353535",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        marginLeft: 8,
    },
    watchNowText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 0.3,
    },
    alertTitle: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        lineHeight: 22,
        marginBottom: 6,
    },
    alertDescription: {
        color: "#C9CED6",
        fontSize: 14,
        lineHeight: 20,
        paddingRight: 10,
    },
    emptyWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 90,
        paddingHorizontal: 30,
    },
    emptyTitle: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "800",
        marginTop: 12,
        marginBottom: 8,
    },
    emptyText: {
        color: "#8A8F98",
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
    },
    bottomSpacer: {
        height: 20,
    },
});