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

type AlertItem = RawAlertItem & {
    id: string;
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

function getTopicConfig(topicRaw?: string) {
    const topic = (topicRaw || "announcement").toLowerCase();

    if (topic === "breaking") {
        return {
            label: "Breaking",
            color: "#FF4D4F",
            bg: "#19070A",
            border: "#3B1016",
            icon: <Ionicons name="flash" size={15} color="#FF4D4F" />,
        };
    }

    if (topic === "event") {
        return {
            label: "Event",
            color: "#3CF2FF",
            bg: "#061419",
            border: "#12353D",
            icon: <Ionicons name="calendar-outline" size={15} color="#3CF2FF" />,
        };
    }

    if (topic === "results") {
        return {
            label: "Results",
            color: "#FFD84D",
            bg: "#171203",
            border: "#3E320E",
            icon: (
                <MaterialCommunityIcons
                    name="podium-gold"
                    size={15}
                    color="#FFD84D"
                />
            ),
        };
    }

    if (topic === "game") {
        return {
            label: "Live Game",
            color: "#A78BFA",
            bg: "#10091F",
            border: "#2E2051",
            icon: <FontAwesome6 name="chess-pawn" size={13} color="#A78BFA" />,
        };
    }

    if (topic === "promotion") {
        return {
            label: "Promotion",
            color: "#39FF14",
            bg: "#071807",
            border: "#1F4E19",
            icon: <Ionicons name="pricetag-outline" size={15} color="#39FF14" />,
        };
    }

    return {
        label: "Announcement",
        color: "#FF8A3D",
        bg: "#190C04",
        border: "#3D1E0B",
        icon: <Ionicons name="megaphone-outline" size={15} color="#FF8A3D" />,
    };
}

function normalizeUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();

    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) return trimmed;

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
                {alerts.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Ionicons name="megaphone-outline" size={38} color="#8A8F98" />
                        <Text style={styles.emptyTitle}>No alerts yet</Text>
                        <Text style={styles.emptyText}>
                            Important updates will show up here.
                        </Text>
                    </View>
                ) : (
                    alerts.map((item, index) => {
                        const topicConfig = getTopicConfig(item.topic || item.type);
                        const timeAgo = getTimeAgo(item.createdAt);
                        const description =
                            item.description || item.message || "No description available.";
                        const destination = item.link_url || item.link;
                        const isLinked = !!destination;

                        return (
                            <TouchableOpacity
                                key={`${item.id}-${item.createdAt || index}`}
                                activeOpacity={0.86}
                                onPress={() => handleOpenAlert(item)}
                                style={styles.alertCard}
                            >
                                <View
                                    style={[
                                        styles.cornerDot,
                                        {
                                            backgroundColor: topicConfig.color,
                                            shadowColor: topicConfig.color,
                                        },
                                    ]}
                                />
                                <View style={styles.metaRow}>
                                    <View
                                        style={[
                                            styles.topicBadge,
                                            {
                                                backgroundColor: topicConfig.bg,
                                                borderColor: topicConfig.border,
                                            },
                                        ]}
                                    >
                                        {topicConfig.icon}
                                        <Text
                                            style={[
                                                styles.topicText,
                                                { color: topicConfig.color },
                                            ]}
                                        >
                                            {topicConfig.label}
                                        </Text>
                                    </View>

                                    <Text style={styles.timeText}>{timeAgo}</Text>

                                    {isLinked && (
                                        <View style={styles.linkBadge}>
                                            <Ionicons
                                                name="open-outline"
                                                size={12}
                                                color="#9AA3B2"
                                            />
                                            <Text style={styles.linkBadgeText}>LINK</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.alertTitle} numberOfLines={3}>
                                    {item.title}
                                </Text>

                                <Text style={styles.alertDescription} numberOfLines={4}>
                                    {description}
                                </Text>

                                {isLinked && (
                                    <View style={styles.tapRow}>
                                        <Text style={styles.tapText}>Tap to open</Text>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={14}
                                            color="#39FF14"
                                        />
                                    </View>
                                )}
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
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 34,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    alertCard: {
        position: "relative",

        backgroundColor: "#0E0F12",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#1F2430",

        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 20,

        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },

        elevation: 3,
    },
    cornerDot: {
        position: "absolute",

        top: 16,
        right: 16,

        width: 10,
        height: 10,

        borderRadius: 999,

        shadowOpacity: 0.8,
        shadowRadius: 6,

        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 6,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 9,
        gap: 8,
    },
    topicBadge: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    topicText: {
        fontSize: 10.5,
        fontWeight: "900",
        letterSpacing: 1,
        marginLeft: 5,
        textTransform: "uppercase",
    },
    timeText: {
        color: "#8D96A8",
        fontSize: 12,
        fontWeight: "700",
    },
    linkBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#151923",
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 4,
    },
    linkBadgeText: {
        color: "#9AA3B2",
        fontSize: 9.5,
        fontWeight: "900",
        letterSpacing: 0.8,
        marginLeft: 3,
    },
    alertTitle: {
        color: "#F5F7FB",
        fontSize: 16,
        fontWeight: "900",
        lineHeight: 22,
        letterSpacing: 0.1,
        marginBottom: 7,
    },
    alertDescription: {
        color: "#C0C6D0",
        fontSize: 14,
        fontWeight: "500",
        lineHeight: 20,
    },
    tapRow: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginTop: 10,
    },
    tapText: {
        color: "#39FF14",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.4,
        marginRight: 3,
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
        fontWeight: "900",
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