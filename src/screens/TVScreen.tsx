import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { useFonts, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";

type StreamType = "Live" | "Podcast" | "Video" | "Highlight";
type LiveStatus = "upcoming" | "live" | "ended";
type TVMode = "watch" | "listen";
type TimeTheme = "day" | "night";

type RawTVItem = {
    _id?: string;
    id?: string;
    title?: string;
    subtitle?: string | null;
    type?: "live" | "podcast" | "video" | "highlight";
    source?: string | null;
    youtube_url?: string;
    thumbnail_url?: string | null;
    duration?: string | null;
    live_status?: LiveStatus;
    status?: "draft" | "published";
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
};

type TVApiResponse =
    | RawTVItem[]
    | {
        success?: boolean;
        data?: RawTVItem[];
    };

type StreamItem = {
    id: string;
    title: string;
    subtitle: string;
    type: StreamType;
    badge: string;
    badgeColor: string;
    youtubeUrl: string;
    thumbnail: string;
    createdAt: string;
    liveStatus?: LiveStatus;
    duration?: string;
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const SCREEN_WIDTH = Dimensions.get("window").width;
const PLAYER_WIDTH = SCREEN_WIDTH - 10;
const PLAYER_HEIGHT = PLAYER_WIDTH * 0.5625;

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            mode,
            safeBg: "#FFFFFF",
            bg: "#FFFFFF",
            card: "#FFFFFF",
            card2: "#F8FDFF",
            text: "#07111F",
            subtext: "#334155",
            muted: "#64748B",
            border: "rgba(7,17,31,0.10)",
            cyan: "#06B6D4",
            cyanDark: "#0891B2",
            yellow: "#FACC15",
            yellowText: "#A16207",
            red: "#E11D48",
            blue: "#0F172A",
            shadow: "rgba(6,182,212,0.22)",
            tabBg: "#FFFFFF",
            selectedCard: "rgba(6,182,212,0.07)",
            inactive: "#64748B",
            heroText: "#FFFFFF",
            heroSubtext: "#E0F2FE",
        };
    }

    return {
        mode,
        safeBg: "#020617",
        bg: "#020617",
        card: "#07111F",
        card2: "#0B1728",
        text: "#FFFFFF",
        subtext: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.10)",
        cyan: "#22D3EE",
        cyanDark: "#06B6D4",
        yellow: "#FACC15",
        yellowText: "#FACC15",
        red: "#E11D48",
        blue: "#0F172A",
        shadow: "rgba(34,211,238,0.18)",
        tabBg: "#07111F",
        selectedCard: "rgba(34,211,238,0.09)",
        inactive: "#94A3B8",
        heroText: "#FFFFFF",
        heroSubtext: "#E0F2FE",
    };
};

const BROADCAST_COLORS = ["#22D3EE", "#FACC15", "#2563EB", "#A855F7", "#22C55E"];

const getBroadcastColor = (index: number) => {
    return BROADCAST_COLORS[index % BROADCAST_COLORS.length];
};

const toDisplayType = (type?: RawTVItem["type"]): StreamType => {
    if (type === "podcast") return "Podcast";
    if (type === "video") return "Video";
    if (type === "highlight") return "Highlight";
    return "Live";
};

const getYoutubeId = (url?: string) => {
    if (!url || typeof url !== "string") return "";

    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&?]+)/
    );

    return match?.[1] || "";
};

const getYoutubeThumbnail = (url?: string) => {
    const youtubeId = getYoutubeId(url);
    if (!youtubeId) return "";
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
};

const normalizeTitleKey = (title: string) => {
    return title.trim().toLowerCase().replace(/\s+/g, " ");
};

const getNewestByCreatedAt = (items: StreamItem[]) => {
    return [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

const getGroupedLatestByTitle = (items: StreamItem[]) => {
    const grouped = new Map<string, StreamItem>();

    getNewestByCreatedAt(items).forEach((item) => {
        const key = `${item.type}-${normalizeTitleKey(item.title)}`;
        if (!grouped.has(key)) grouped.set(key, item);
    });

    return Array.from(grouped.values());
};

const getDisplayType = (type: StreamType) => {
    return type === "Live" ? "Broadcast" : type;
};

const getStatusLabel = (item?: StreamItem | null) => {
    if (!item) return "";

    if (item.type === "Live") {
        if (item.liveStatus === "live") return "Live Broadcast";
        if (item.liveStatus === "ended") return "Ended";
        return "Upcoming";
    }

    return item.duration || "Watch";
};

const normalizeTVItem = (item: RawTVItem, index: number): StreamItem | null => {
    if (!item.youtube_url || !item.title) return null;

    const displayType = toDisplayType(item.type);
    const createdAt =
        item.created_at ||
        item.createdAt ||
        item.updated_at ||
        item.updatedAt ||
        new Date().toISOString();

    return {
        id: item._id || item.id || `${item.title}-${index}`,
        title: item.title,
        subtitle: item.subtitle || item.source || "Scoolfools TV",
        type: displayType,
        badge: item.source || displayType,
        badgeColor: getBroadcastColor(index),
        youtubeUrl: item.youtube_url,
        thumbnail: item.thumbnail_url || getYoutubeThumbnail(item.youtube_url),
        createdAt,
        liveStatus: item.live_status || "upcoming",
        duration: item.duration || undefined,
    };
};

export default function TVScreen() {
    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const [themeMode] = useState<TimeTheme>(getCurrentThemeMode());
    const theme = useMemo(() => getTheme(themeMode), [themeMode]);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [streams, setStreams] = useState<StreamItem[]>([]);
    const [selectedMode, setSelectedMode] = useState<TVMode>("watch");
    const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [visibleCount, setVisibleCount] = useState(3);

    const sscAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const tickerAnim = useRef(new Animated.Value(0)).current;

    const activeAccent = selectedMode === "watch" ? theme.cyan : theme.yellow;

    const fetchTVContent = useCallback(async () => {
        try {
            if (!API_BASE_URL) {
                console.log("Missing API base URL for TV content.");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/tv`);
            const json: TVApiResponse = await response.json();

            let fetchedItems: RawTVItem[] = [];

            if (Array.isArray(json)) fetchedItems = json;
            else if (Array.isArray(json?.data)) fetchedItems = json.data;

            const normalizedItems = fetchedItems
                .map((item, index) => normalizeTVItem(item, index))
                .filter(Boolean) as StreamItem[];

            const sortedItems = getNewestByCreatedAt(normalizedItems);

            setStreams(sortedItems);

            setSelectedStream((current) => {
                if (current) {
                    const stillExists = sortedItems.find((item) => item.id === current.id);
                    if (stillExists) return stillExists;
                }

                const newestWatch = sortedItems.find((item) => item.type !== "Podcast");
                return newestWatch || sortedItems[0] || null;
            });
        } catch (error) {
            console.log("Error fetching TV content:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTVContent();
    }, [fetchTVContent]);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1700,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 1700,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, [glowAnim]);

    useEffect(() => {
        Animated.loop(
            Animated.timing(tickerAnim, {
                toValue: 1,
                duration: 18000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [tickerAnim]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTVContent();
    }, [fetchTVContent]);

    const sscTranslate = sscAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const animatedGlowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.14, 0.28],
    });

    const modeStreams = useMemo(() => {
        const filtered = streams.filter((item) =>
            selectedMode === "watch" ? item.type !== "Podcast" : item.type === "Podcast"
        );

        return getGroupedLatestByTitle(filtered);
    }, [streams, selectedMode]);

    const limitedModeStreams = modeStreams.slice(0, 10);
    const renderedStreams = limitedModeStreams.slice(0, visibleCount);
    const hasMoreStreams = visibleCount < limitedModeStreams.length;

    const broadcastOptions = useMemo(() => {
        if (!selectedStream) return [];

        return getNewestByCreatedAt(
            streams.filter(
                (item) =>
                    item.type === selectedStream.type &&
                    normalizeTitleKey(item.title) === normalizeTitleKey(selectedStream.title)
            )
        );
    }, [streams, selectedStream]);

    const animateSwitch = (nextMode: TVMode) => {
        const nextValue = nextMode === "watch" ? 0 : 1;

        Animated.spring(sscAnim, {
            toValue: nextValue,
            useNativeDriver: false,
            tension: 75,
            friction: 9,
        }).start();

        setSelectedMode(nextMode);
        setVisibleCount(3);

        const nextItems = streams.filter((item) =>
            nextMode === "watch" ? item.type !== "Podcast" : item.type === "Podcast"
        );

        const newestForMode = getGroupedLatestByTitle(nextItems)[0];
        if (newestForMode) setSelectedStream(newestForMode);
    };

    const getTypeBadgeStyle = (type: StreamType) => {
        if (type === "Podcast") {
            return {
                backgroundColor: "rgba(6,182,212,0.15)",
                borderColor: theme.cyan,
                color: theme.cyan,
            };
        }

        if (type === "Highlight") {
            return {
                backgroundColor: "rgba(250,204,21,0.22)",
                borderColor: theme.yellow,
                color: theme.yellowText,
            };
        }

        if (type === "Video") {
            return {
                backgroundColor: "rgba(37,99,235,0.14)",
                borderColor: "#2563EB",
                color: theme.mode === "day" ? "#2563EB" : "#93C5FD",
            };
        }

        return {
            backgroundColor: "rgba(6,182,212,0.15)",
            borderColor: theme.cyan,
            color: theme.cyan,
        };
    };

    const getStatusIcon = (item: StreamItem) => {
        if (item.type === "Podcast") return "headphones";
        if (item.type === "Live") return "access-point";
        return "clock-outline";
    };

    if (loading || !fontsLoaded) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.cyan} />
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
                        tintColor={activeAccent}
                        colors={[activeAccent]}
                        progressBackgroundColor={theme.card}
                    />
                }
            >
                {streams.length === 0 || !selectedStream ? (
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons
                            name="television-off"
                            size={46}
                            color={theme.muted}
                        />
                        <Text style={styles.emptyTitle}>No TV content yet</Text>
                        <Text style={styles.emptyText}>
                            Broadcasts, podcasts, videos, and highlights will show up here.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.segmentWrap}>
                            <Animated.View
                                style={[
                                    styles.segmentSlider,
                                    {
                                        transform: [{ translateX: sscTranslate }],
                                    },
                                ]}
                            />

                            <TouchableOpacity
                                activeOpacity={0.9}
                                style={styles.segmentButton}
                                onPress={() => selectedMode !== "watch" && animateSwitch("watch")}
                            >
                                <MaterialCommunityIcons
                                    name="play-circle"
                                    size={18}
                                    color={
                                        selectedMode === "watch"
                                            ? "#FFFFFF"
                                            : theme.inactive
                                    }
                                />
                                <Text
                                    style={[
                                        styles.segmentText,
                                        selectedMode === "watch" && styles.segmentTextActive,
                                    ]}
                                >
                                    Watch
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.9}
                                style={styles.segmentButton}
                                onPress={() => selectedMode !== "listen" && animateSwitch("listen")}
                            >
                                <MaterialCommunityIcons
                                    name="headphones"
                                    size={18}
                                    color={
                                        selectedMode === "listen"
                                            ? theme.mode === "night"
                                                ? "#FFFFFF"
                                                : "#07111F"
                                            : theme.inactive
                                    }
                                />
                                <Text
                                    style={[
                                        styles.segmentText,
                                        selectedMode === "listen" && styles.segmentTextActiveListen,
                                    ]}
                                >
                                    Listen
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.channelScroller}
                        >
                            {broadcastOptions.length > 0 ? (
                                broadcastOptions.map((stream, index) => {
                                    const active = stream.id === selectedStream.id;
                                    const color = index === 0 ? theme.cyan : theme.yellow;

                                    return (
                                        <TouchableOpacity
                                            key={stream.id}
                                            activeOpacity={0.85}
                                            onPress={() => setSelectedStream(stream)}
                                            style={[
                                                styles.channelPill,
                                                {
                                                    borderColor: color,
                                                    backgroundColor: active
                                                        ? color
                                                        : "transparent",
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.channelPillText,
                                                    {
                                                        color: active
                                                            ? "#07111F"
                                                            : color,
                                                    },
                                                ]}
                                            >
                                                {stream.badge}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <View />
                            )}
                        </ScrollView>

                        <Animated.View
                            style={[
                                styles.heroCard,
                                {
                                    shadowOpacity: theme.mode === "day" ? 0.14 : 0.22,
                                },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.heroGlow,
                                    {
                                        opacity: animatedGlowOpacity,
                                        backgroundColor: theme.cyan,
                                    },
                                ]}
                            />

                            <View style={styles.playerWrap}>
                                <YoutubePlayer
                                    height={PLAYER_HEIGHT}
                                    width={PLAYER_WIDTH}
                                    videoId={getYoutubeId(selectedStream.youtubeUrl)}
                                    play={false}
                                    webViewStyle={styles.youtubeWebView}
                                    initialPlayerParams={{
                                        controls: true,
                                        modestbranding: true,
                                        rel: false,
                                        playsinline: true,
                                    }}
                                />
                            </View>

                            <View style={styles.heroInfo}>
                                <View style={styles.liveRow}>
                                    <View
                                        style={[
                                            styles.liveDot,
                                            {
                                                backgroundColor:
                                                    selectedStream.type === "Live"
                                                        ? theme.yellow
                                                        : selectedStream.type === "Podcast"
                                                            ? theme.cyan
                                                            : "#60A5FA",
                                            },
                                        ]}
                                    />
                                    <Text style={styles.liveText}>
                                        {selectedStream.type === "Live"
                                            ? selectedStream.liveStatus === "live"
                                                ? "LIVE NOW"
                                                : selectedStream.liveStatus === "ended"
                                                    ? "ENDED"
                                                    : "UPCOMING"
                                            : selectedStream.type.toUpperCase()}
                                    </Text>
                                </View>

                                <Text style={styles.heroTitle} numberOfLines={2}>
                                    {selectedStream.title}
                                </Text>

                                <Text style={styles.heroSubtitle} numberOfLines={1}>
                                    {selectedStream.subtitle}
                                </Text>

                                <View style={styles.heroBottomRow}>
                                    <MaterialCommunityIcons
                                        name={
                                            selectedStream.type === "Live"
                                                ? "access-point"
                                                : selectedStream.type === "Podcast"
                                                    ? "headphones"
                                                    : "clock-outline"
                                        }
                                        size={17}
                                        color={theme.cyan}
                                    />

                                    <Text style={styles.heroStatusText}>
                                        {getStatusLabel(selectedStream)}
                                    </Text>

                                    <View style={{ flex: 1 }} />

                                    <TouchableOpacity style={styles.expandButton}>
                                        <MaterialCommunityIcons
                                            name="arrow-expand"
                                            size={18}
                                            color={theme.text}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.heroAccentBar}>
                                    <View style={styles.heroAccentCyan} />
                                    <View style={styles.heroAccentYellow} />
                                </View>
                            </View>
                        </Animated.View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {selectedMode === "watch" ? "LATEST WATCH" : "LATEST PODCASTS"}
                            </Text>

                            {hasMoreStreams && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() =>
                                        setVisibleCount((current) =>
                                            Math.min(current + 3, limitedModeStreams.length)
                                        )
                                    }
                                >
                                    <Text style={styles.viewAllText}>See more</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {renderedStreams.map((item) => {
                            const active =
                                item.id === selectedStream.id ||
                                (item.type === selectedStream.type &&
                                    normalizeTitleKey(item.title) ===
                                    normalizeTitleKey(selectedStream.title));

                            const typeBadge = getTypeBadgeStyle(item.type);

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.88}
                                    onPress={() => setSelectedStream(item)}
                                    style={[
                                        styles.videoRow,
                                        active && {
                                            borderColor: theme.cyan,
                                            backgroundColor: theme.selectedCard,
                                        },
                                    ]}
                                >
                                    {item.thumbnail ? (
                                        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                                    ) : (
                                        <View style={styles.thumbnailFallback}>
                                            <MaterialCommunityIcons
                                                name={
                                                    item.type === "Podcast"
                                                        ? "headphones"
                                                        : "television-play"
                                                }
                                                size={26}
                                                color={theme.muted}
                                            />
                                        </View>
                                    )}

                                    <View style={styles.videoContent}>
                                        <View
                                            style={[
                                                styles.typeBadge,
                                                {
                                                    backgroundColor: typeBadge.backgroundColor,
                                                    borderColor: typeBadge.borderColor,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeBadgeText,
                                                    { color: typeBadge.color },
                                                ]}
                                            >
                                                {getDisplayType(item.type)}
                                            </Text>
                                        </View>

                                        <Text style={styles.videoTitle} numberOfLines={2}>
                                            {item.title}
                                        </Text>

                                        <Text style={styles.videoSubtitle} numberOfLines={1}>
                                            {item.subtitle}
                                        </Text>

                                        <View style={styles.metaRow}>
                                            <MaterialCommunityIcons
                                                name={getStatusIcon(item)}
                                                size={13}
                                                color={theme.cyan}
                                            />
                                            <Text style={styles.metaText}>{getStatusLabel(item)}</Text>
                                        </View>
                                    </View>

                                    <MaterialCommunityIcons
                                        name="dots-vertical"
                                        size={22}
                                        color={theme.text}
                                    />
                                </TouchableOpacity>
                            );
                        })}

                        {hasMoreStreams && (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() =>
                                    setVisibleCount((current) =>
                                        Math.min(current + 3, limitedModeStreams.length)
                                    )
                                }
                                style={styles.seeMoreButton}
                            >
                                <Text style={styles.seeMoreButtonText}>See more</Text>
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={20}
                                    color={theme.cyan}
                                />
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof getTheme>) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.safeBg,
        },
        container: {
            flex: 1,
            backgroundColor: theme.bg,
        },
        contentContainer: {
            paddingHorizontal: 16,
            paddingBottom: 120,
            paddingTop: 14,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.bg,
        },

        segmentWrap: {
            height: 56,
            borderRadius: 999,
            backgroundColor: theme.tabBg,
            borderWidth: 1.4,
            borderColor: theme.border,
            padding: 4,
            marginBottom: 18,
            flexDirection: "row",
            position: "relative",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: theme.mode === "day" ? 0.08 : 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
        },
        segmentSlider: {
            position: "absolute",
            top: 4,
            left: 4,
            width: "50%",
            height: 48,
            borderRadius: 999,
            backgroundColor: theme.mode === "night" ? theme.card2 : theme.cyan,
            borderWidth: theme.mode === "night" ? 1.2 : 0,
            borderColor: theme.mode === "night" ? "rgba(255,255,255,0.78)" : "transparent",
            shadowColor: "#FFFFFF",
            shadowOpacity: theme.mode === "night" ? 0.42 : 0,
            shadowRadius: theme.mode === "night" ? 11 : 0,
            shadowOffset: { width: 0, height: 0 },
            elevation: theme.mode === "night" ? 5 : 0,
        },
        segmentButton: {
            flex: 1,
            height: 48,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 7,
            zIndex: 2,
        },
        segmentText: {
            color: theme.inactive,
            fontSize: 17,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.25,
        },
        segmentTextActive: {
            color: "#FFFFFF",
            textShadowColor: theme.mode === "night"
                ? "rgba(255,255,255,0.85)"
                : "transparent",
            textShadowRadius: theme.mode === "night" ? 8 : 0,
            textShadowOffset: { width: 0, height: 0 },
        },
        segmentTextActiveListen: {
            color: theme.mode === "night" ? "#FFFFFF" : "#07111F",
            textShadowColor: theme.mode === "night"
                ? "rgba(255,255,255,0.85)"
                : "transparent",
            textShadowRadius: theme.mode === "night" ? 8 : 0,
            textShadowOffset: { width: 0, height: 0 },
        },

        channelScroller: {
            paddingRight: 14,
            paddingBottom: 18,
            gap: 10,
        },
        channelPill: {
            borderWidth: 1.4,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 9,
            minWidth: 96,
            alignItems: "center",
            justifyContent: "center",
        },
        channelPillText: {
            fontSize: 12,
            fontFamily: "Rajdhani_700Bold",
            textTransform: "uppercase",
            letterSpacing: 0.55,
        },

        heroCard: {
            borderRadius: 24,
            backgroundColor: theme.card,
            borderWidth: 1.2,
            borderColor: theme.border,
            overflow: "hidden",
            marginBottom: 24,
            shadowColor: theme.cyan,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 12 },
            elevation: 6,
        },
        heroGlow: {
            position: "absolute",
            left: 18,
            right: 18,
            bottom: -14,
            height: 28,
            borderRadius: 999,
        },
        playerWrap: {
            width: "100%",
            height: PLAYER_HEIGHT,
            backgroundColor: "#000000",
            overflow: "hidden",
        },
        youtubeWebView: {
            backgroundColor: "#000000",
        },
        heroInfo: {
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 16,
        },
        liveRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginBottom: 8,
        },
        liveDot: {
            width: 9,
            height: 9,
            borderRadius: 999,
        },
        liveText: {
            color: theme.text,
            fontSize: 12,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.6,
        },
        heroTitle: {
            color: theme.text,
            fontSize: 25,
            fontFamily: "Rajdhani_700Bold",
            lineHeight: 29,
            letterSpacing: 0.2,
            marginBottom: 5,
        },
        heroSubtitle: {
            color: theme.subtext,
            fontSize: 15,
            fontWeight: "700",
            marginBottom: 14,
        },
        heroBottomRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        heroStatus: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        heroStatusText: {
            color: theme.cyan,
            fontSize: 13,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.2,
        },

        expandButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card2,
        },
        heroAccentBar: {
            height: 4,
            borderRadius: 999,
            overflow: "hidden",
            flexDirection: "row",
            marginTop: 15,
        },
        heroAccentCyan: {
            flex: 4,
            backgroundColor: theme.cyan,
        },
        heroAccentYellow: {
            flex: 1,
            backgroundColor: theme.yellow,
        },

        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        sectionTitle: {
            color: theme.text,
            fontSize: 22,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.4,
        },
        viewAllText: {
            color: theme.cyan,
            fontSize: 14,
            fontWeight: "800",
        },

        videoRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            borderRadius: 17,
            padding: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOpacity: theme.mode === "day" ? 0.06 : 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
        },
        thumbnail: {
            width: 126,
            height: 72,
            borderRadius: 12,
            backgroundColor: "#111111",
            marginRight: 12,
        },
        thumbnailFallback: {
            width: 126,
            height: 72,
            borderRadius: 12,
            backgroundColor: theme.card2,
            marginRight: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        videoContent: {
            flex: 1,
            paddingRight: 6,
        },
        typeBadge: {
            alignSelf: "flex-start",
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 9,
            paddingVertical: 3,
            marginBottom: 6,
        },
        typeBadgeText: {
            fontSize: 9.5,
            fontFamily: "Rajdhani_700Bold",
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        videoTitle: {
            color: theme.text,
            fontSize: 17,
            fontFamily: "Rajdhani_700Bold",
            lineHeight: 20,
            marginBottom: 3,
        },
        videoSubtitle: {
            color: theme.subtext,
            fontSize: 12.5,
            fontWeight: "700",
            marginBottom: 5,
        },
        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
        },
        metaText: {
            color: theme.muted,
            fontSize: 12,
            fontWeight: "700",
        },

        seeMoreButton: {
            minHeight: 48,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.cyan,
            backgroundColor: theme.card,
            marginTop: 2,
            marginBottom: 12,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
        },
        seeMoreButtonText: {
            color: theme.cyan,
            fontSize: 16,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.3,
        },

        emptyWrap: {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 90,
            paddingHorizontal: 26,
        },
        emptyTitle: {
            color: theme.text,
            fontSize: 22,
            fontFamily: "Rajdhani_700Bold",
            marginTop: 12,
            marginBottom: 8,
        },
        emptyText: {
            color: theme.muted,
            fontSize: 14,
            lineHeight: 21,
            textAlign: "center",
        },
    });