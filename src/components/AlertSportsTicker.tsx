import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as WebBrowser from "expo-web-browser";

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
    link_url?: string;
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

const SCREEN_WIDTH = Dimensions.get("window").width;

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

function getTickerConfig(topicRaw?: string) {
    const topic = (topicRaw || "").toLowerCase();

    if (topic === "breaking") {
        return {
            label: "BREAKING",
            color: "#FF4D4F",
            icon: <Ionicons name="flash" size={15} color="#FF4D4F" />,
        };
    }

    return {
        label: "RESULTS",
        color: "#FFD84D",
        icon: (
            <MaterialCommunityIcons
                name="podium-gold"
                size={15}
                color="#FFD84D"
            />
        ),
    };
}

export default function AlertSportsTicker({
    refreshKey = 0,
}: {
    refreshKey?: number;
}) {
    const [tickerAlerts, setTickerAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    const textScrollAnim = useRef(new Animated.Value(0)).current;
    const cardFlipAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    const fetchTickerAlerts = useCallback(async () => {
        try {
            if (!API_BASE_URL) return;

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
                .filter((item) => {
                    const topic = (item.topic || item.type || "").toLowerCase();

                    return topic === "breaking" || topic === "results";
                })
                .sort((a, b) => {
                    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
                    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();

                    return bTime - aTime;
                })
                .slice(0, 5);

            setTickerAlerts(normalizedAlerts);
            setActiveIndex(0);
        } catch (error) {
            console.log("Ticker alerts fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickerAlerts();
    }, [fetchTickerAlerts, refreshKey]);

    useEffect(() => {
        if (tickerAlerts.length === 0) return;

        let isMounted = true;

        const runTickerCycle = () => {
            textScrollAnim.setValue(0);
            cardFlipAnim.setValue(0);
            opacityAnim.setValue(1);

            Animated.sequence([
                Animated.delay(2600),

                Animated.timing(textScrollAnim, {
                    toValue: -SCREEN_WIDTH * 1.25,
                    duration: 9800,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),

                Animated.delay(350),

                Animated.parallel([
                    Animated.timing(cardFlipAnim, {
                        toValue: 1,
                        duration: 360,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),

                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 240,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => {
                if (!isMounted) return;

                setActiveIndex((prev) => {
                    if (tickerAlerts.length <= 1) return prev;

                    return (prev + 1) % tickerAlerts.length;
                });

                setTimeout(() => {
                    if (!isMounted) return;

                    runTickerCycle();
                }, 120);
            });
        };

        runTickerCycle();

        return () => {
            isMounted = false;

            textScrollAnim.stopAnimation();
            cardFlipAnim.stopAnimation();
            opacityAnim.stopAnimation();
        };
    }, [tickerAlerts.length, activeIndex]);

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
            console.log("Open ticker alert error:", error);

            Alert.alert("Error", "Failed to open alert link.");
        }
    };

    if (loading) {
        return (
            <View style={styles.tickerOuterWrap}>
                <View style={styles.tickerWrap}>
                    <ActivityIndicator size="small" color="#39FF14" />
                </View>
            </View>
        );
    }

    if (tickerAlerts.length === 0) return null;

    const currentAlert = tickerAlerts[activeIndex];

    const topicConfig = getTickerConfig(
        currentAlert.topic || currentAlert.type
    );

    const timeAgo = getTimeAgo(currentAlert.createdAt);

    const hasLink = !!(currentAlert.link_url || currentAlert.link);

    const rotateX = cardFlipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "84deg"],
    });

    return (
        <View style={styles.tickerOuterWrap}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleOpenAlert(currentAlert)}
                disabled={!hasLink}
            >
                <Animated.View
                    style={[
                        styles.tickerWrap,
                        {
                            opacity: opacityAnim,
                            transform: [{ perspective: 900 }, { rotateX }],
                        },
                    ]}
                >
                    <View style={styles.topRow}>
                        <View style={styles.alertLabelRow}>
                            <Ionicons
                                name="radio-outline"
                                size={13}
                                color="#39FF14"
                            />

                            <Text style={styles.alertLabelText}>
                                What's Happening?
                            </Text>
                        </View>

                        <View style={styles.topicPill}>
                            {topicConfig.icon}

                            <Text
                                style={[
                                    styles.topicText,
                                    { color: topicConfig.color },
                                ]}
                            >
                                {topicConfig.label}
                            </Text>

                            {!!timeAgo && (
                                <Text style={styles.timeText}>
                                    • {timeAgo}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.marqueeWindow}>
                        <Animated.Text
                            numberOfLines={1}
                            style={[
                                styles.marqueeText,
                                {
                                    transform: [
                                        {
                                            translateX: textScrollAnim,
                                        },
                                    ],
                                },
                            ]}
                        >
                            {currentAlert.title}
                        </Animated.Text>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    tickerOuterWrap: {
        marginTop: 2,
        marginBottom: 14,
    },

    tickerWrap: {
        minHeight: 50,
        backgroundColor: "#050A12",
        borderWidth: 0,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        overflow: "hidden",
        elevation: 0,
    },

    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },

    alertLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    alertLabelText: {
        color: "#39FF14",
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 1,
    },

    topicPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    topicText: {
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 1,
    },

    timeText: {
        color: "#8A8F98",
        fontSize: 11,
        fontWeight: "800",
    },

    marqueeWindow: {
        height: 26,
        justifyContent: "center",
        overflow: "hidden",
    },

    marqueeText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "900",
        letterSpacing: 0.1,
        width: SCREEN_WIDTH * 2.8,
    },
});