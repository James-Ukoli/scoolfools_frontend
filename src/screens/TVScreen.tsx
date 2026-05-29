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
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

type StreamType = "Live" | "Podcast" | "Video" | "Highlight";
type LiveStatus = "upcoming" | "live" | "ended";

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
const PLAYER_WIDTH = SCREEN_WIDTH - 34;
const PLAYER_HEIGHT = PLAYER_WIDTH * 0.5625;

const BROADCAST_COLORS = ["#22D3EE", "#FACC15", "#FB923C", "#A855F7", "#22C55E"];

const CONTENT_TYPES: StreamType[] = ["Live", "Podcast", "Video", "Highlight"];

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

const getNewestByCreatedAt = (items: StreamItem[]) => {
    return [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

const getStatusLabel = (item?: StreamItem | null) => {
    if (!item) return "";

    if (item.type === "Live") {
        if (item.liveStatus === "live") return "Live";
        if (item.liveStatus === "ended") return "Ended";
        return "Upcoming";
    }

    return item.duration || "Watch";
};

const getStatusStyle = (item?: StreamItem | null) => {
    const label = getStatusLabel(item);

    if (label === "Live") {
        return {
            badgeStyle: styles.liveInlineBadge,
            textStyle: styles.liveInlineBadgeText,
            iconColor: "#FFFFFF",
        };
    }

    if (label === "Upcoming") {
        return {
            badgeStyle: styles.upcomingInlineBadge,
            textStyle: styles.upcomingInlineBadgeText,
            iconColor: "#FACC15",
        };
    }

    if (label === "Ended") {
        return {
            badgeStyle: styles.endedInlineBadge,
            textStyle: styles.endedInlineBadgeText,
            iconColor: "#9CA3AF",
        };
    }

    return {
        badgeStyle: styles.watchInlineBadge,
        textStyle: styles.watchInlineBadgeText,
        iconColor: "#D8B4FE",
    };
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
        subtitle: item.subtitle || item.source || "Just Move TV",
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
    const navigation = useNavigation<any>();

    const [streams, setStreams] = useState<StreamItem[]>([]);
    const [selectedType, setSelectedType] = useState<StreamType>("Live");
    const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const titleScrollAnim = useRef(new Animated.Value(0)).current;
    const tickerAnim = useRef(new Animated.Value(0)).current;

    const fetchTVContent = useCallback(async () => {
        try {
            if (!API_BASE_URL) {
                console.log("Missing API base URL for TV content.");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/tv`);
            const json: TVApiResponse = await response.json();

            let fetchedItems: RawTVItem[] = [];

            if (Array.isArray(json)) {
                fetchedItems = json;
            } else if (Array.isArray(json?.data)) {
                fetchedItems = json.data;
            }

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

                const newestLive = sortedItems.find((item) => item.type === "Live");
                return newestLive || sortedItems[0] || null;
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTVContent();
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
        if (!selectedStream) return;

        titleScrollAnim.setValue(0);

        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(1200),

                Animated.timing(titleScrollAnim, {
                    toValue: -160,
                    duration: 7000,
                    useNativeDriver: true,
                }),

                Animated.delay(800),

                Animated.timing(titleScrollAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [selectedStream]);

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

    const animatedBorderColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#8B5CF6", "#22C55E"],
    });

    const animatedShadowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#8B5CF6", "#22C55E"],
    });

    const animatedGlowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.38],
    });

    const filteredStreams = useMemo(() => {
        const newest = getNewestByCreatedAt(
            streams.filter((item) => item.type === selectedType)
        );

        if (selectedType !== "Live") {
            return newest.slice(0, 3);
        }

        const groupedByTitle: StreamItem[] = [];

        newest.forEach((item) => {
            const alreadyAdded = groupedByTitle.some(
                (existing) => existing.title === item.title
            );

            if (!alreadyAdded) {
                groupedByTitle.push(item);
            }
        });

        return groupedByTitle.slice(0, 3);
    }, [streams, selectedType]);

    const broadcastOptions = useMemo(() => {
        if (!selectedStream) return [];

        return getNewestByCreatedAt(
            streams.filter(
                (item) =>
                    item.type === selectedStream.type &&
                    item.title === selectedStream.title
            )
        );
    }, [streams, selectedStream]);

    const animateSwitch = (nextType: StreamType) => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 140,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 14,
                duration: 140,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setSelectedType(nextType);

            const newestForType = getNewestByCreatedAt(
                streams.filter((item) => item.type === nextType)
            )[0];

            if (newestForType) setSelectedStream(newestForType);

            slideAnim.setValue(-14);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 260,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 260,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const getIconName = (type: StreamType) => {
        if (type === "Live") return "television-play";
        if (type === "Podcast") return "headphones";
        if (type === "Video") return "movie-open-play";
        return "lightning-bolt";
    };

    const handlePromoPress = (type: "blogs" | "games") => {
        if (type === "blogs") {
            navigation.navigate("Trending");
            return;
        }

        navigation.navigate("GameHome");
    };

    if (loading) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#22C55E" />
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
                        tintColor="#22C55E"
                        colors={["#22C55E"]}
                        progressBackgroundColor="#0B1224"
                    />
                }
            >
                <View style={styles.heroHeader}>
                    <View style={styles.pageTitleRow}>
                        <MaterialCommunityIcons
                            name="television-play"
                            size={30}
                            color="#ffffff"
                        />

                        <Text style={styles.pageTitle}>TV</Text>
                    </View>
                </View>

                {streams.length === 0 || !selectedStream ? (
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons
                            name="television-off"
                            size={44}
                            color="#8A8F98"
                        />
                        <Text style={styles.emptyTitle}>No TV content yet</Text>
                        <Text style={styles.emptyText}>
                            Broadcasts, podcasts, videos, and highlights will show up here.
                        </Text>
                    </View>
                ) : (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.broadcastScroller}
                        >
                            {broadcastOptions.map((stream, index) => {
                                const active = stream.id === selectedStream.id;
                                const streamColor = getBroadcastColor(index);

                                return (
                                    <TouchableOpacity
                                        key={stream.id}
                                        activeOpacity={0.85}
                                        onPress={() =>
                                            setSelectedStream({
                                                ...stream,
                                                badgeColor: streamColor,
                                            })
                                        }
                                        style={[
                                            styles.broadcastPill,
                                            {
                                                borderColor: streamColor,
                                                backgroundColor: active
                                                    ? streamColor
                                                    : "rgba(255,255,255,0.035)",
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.broadcastPillText,
                                                { color: active ? "#03110A" : streamColor },
                                            ]}
                                        >
                                            {stream.badge}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.tvStage}>
                            <Animated.View
                                style={[
                                    styles.tvAmbientGlow,
                                    {
                                        opacity: animatedGlowOpacity,
                                        backgroundColor: animatedShadowColor,
                                    },
                                ]}
                            />

                            <Animated.View
                                style={[
                                    styles.tvOuterFrame,
                                    {
                                        borderColor: animatedBorderColor,
                                        shadowColor: animatedShadowColor,
                                    },
                                ]}
                            >
                                <View style={styles.cornerTopLeft} />
                                <View style={styles.cornerTopRight} />
                                <View style={styles.cornerBottomLeft} />
                                <View style={styles.cornerBottomRight} />

                                <Animated.View
                                    style={[
                                        styles.tvFrame,
                                        {
                                            borderColor: animatedBorderColor,
                                            shadowColor: animatedShadowColor,
                                        },
                                    ]}
                                >
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

                                    <View style={styles.tvInfoBar}>
                                        <View style={styles.tvIconCircle}>
                                            <MaterialCommunityIcons
                                                name="broadcast"
                                                size={22}
                                                color="#FFFFFF"
                                            />
                                        </View>

                                        <View style={styles.tvTextWrap}>
                                            <View style={styles.titleTickerContainer}>
                                                <Animated.Text
                                                    numberOfLines={1}
                                                    ellipsizeMode="clip"
                                                    style={[
                                                        styles.tvTitle,
                                                        {
                                                            transform: [
                                                                {
                                                                    translateX:
                                                                        selectedStream.title.length > 28
                                                                            ? titleScrollAnim
                                                                            : 0,
                                                                },
                                                            ],
                                                        },
                                                    ]}
                                                >
                                                    {selectedStream.title}
                                                </Animated.Text>
                                            </View>

                                            <View style={styles.tvSubtitleRow}>
                                                <Text style={styles.tvSubtitle} numberOfLines={1}>
                                                    {selectedStream.subtitle}
                                                </Text>

                                                <View
                                                    style={[
                                                        styles.inlineStatusBadge,
                                                        getStatusStyle(selectedStream).badgeStyle,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.inlineStatusBadgeText,
                                                            getStatusStyle(selectedStream).textStyle,
                                                        ]}
                                                    >
                                                        {getStatusLabel(selectedStream)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </Animated.View>
                            </Animated.View>
                        </View>

                        <View style={styles.typeGrid}>
                            {CONTENT_TYPES.map((type) => {
                                const active = selectedType === type;

                                return (
                                    <TouchableOpacity
                                        key={type}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            if (selectedType !== type) animateSwitch(type);
                                        }}
                                        style={[styles.typeCard, active && styles.activeTypeCard]}
                                    >
                                        <MaterialCommunityIcons
                                            name={getIconName(type)}
                                            size={28}
                                            color={active ? "#22C55E" : "#A7A7B7"}
                                        />

                                        <Text
                                            style={[
                                                styles.typeText,
                                                active && styles.activeTypeText,
                                            ]}
                                        >
                                            {type === "Live" ? "LIVE" : type.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>


                        <Animated.View
                            style={{
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            }}
                        >
                            <View style={styles.sectionHeader}>
                                <View>
                                    <Text style={styles.sectionEyebrow}>NOW PLAYING</Text>
                                    <Text style={styles.sectionTitle}>
                                        {selectedType === "Live" ? "Broadcasts" : selectedType}
                                    </Text>
                                </View>
                            </View>

                            {filteredStreams.length === 0 ? (
                                <View style={styles.emptyTypeWrap}>
                                    <Text style={styles.emptyTypeText}>
                                        No {selectedType.toLowerCase()} content yet.
                                    </Text>
                                </View>
                            ) : (
                                filteredStreams.map((item) => {
                                    const active = item.id === selectedStream.id;
                                    const statusStyle = getStatusStyle(item);

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.85}
                                            onPress={() => setSelectedStream(item)}
                                            style={[
                                                styles.streamRow,
                                                active && styles.activeStreamRow,
                                            ]}
                                        >
                                            {item.thumbnail ? (
                                                <Image
                                                    source={{ uri: item.thumbnail }}
                                                    style={styles.thumbnail}
                                                />
                                            ) : (
                                                <View style={styles.thumbnailFallback}>
                                                    <MaterialCommunityIcons
                                                        name="television-play"
                                                        size={24}
                                                        color="#8A8F98"
                                                    />
                                                </View>
                                            )}

                                            <View style={styles.streamContent}>
                                                <Text
                                                    style={styles.streamTitle}
                                                    numberOfLines={2}
                                                >
                                                    {item.title}
                                                </Text>

                                                <Text
                                                    style={styles.streamSubtitle}
                                                    numberOfLines={1}
                                                >
                                                    {item.subtitle}
                                                </Text>

                                                <View style={styles.streamBadgeRow}>
                                                    <View style={styles.statusBadge}>
                                                        <MaterialCommunityIcons
                                                            name={
                                                                item.type === "Live"
                                                                    ? "access-point"
                                                                    : "clock-outline"
                                                            }
                                                            size={12}
                                                            color={statusStyle.iconColor}
                                                        />

                                                        <Text
                                                            style={[
                                                                styles.statusBadgeText,
                                                                statusStyle.textStyle,
                                                            ]}
                                                        >
                                                            {getStatusLabel(item)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </Animated.View>
                    </>
                )}
                {/* <PromoTicker tickerAnim={tickerAnim} onPress={handlePromoPress} /> */}
            </ScrollView>
        </SafeAreaView>
    );
}

function PromoTicker({
    tickerAnim,
    onPress,
}: {
    tickerAnim: Animated.Value;
    onPress: (type: "blogs" | "games") => void;
}) {
    const translateX = tickerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [420, -550],
    });

    return (
        <View style={styles.planeTickerContainer}>
            <Animated.View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    transform: [{ translateX }],
                }}
            >
                <Text style={styles.planeEmoji}>✈️</Text>

                <TouchableOpacity
                    onPress={() => onPress("blogs")}
                    style={[styles.tickerBubble, styles.blogBubble]}
                >
                    <Text style={styles.tickerBubbleText}>
                        📚 Blogs
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onPress("games")}
                    style={[styles.tickerBubble, styles.gamesBubble]}
                >
                    <Text style={styles.tickerBubbleText}>
                        🎉 Party Games
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onPress("blogs")}
                    style={[styles.tickerBubble, styles.supportBubble]}
                >
                    <Text style={styles.tickerBubbleText}>
                        ⭐ Supporter
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
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
        paddingHorizontal: 16,
        paddingBottom: 42,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    heroHeader: {
        marginTop: 12,
        marginBottom: 16,
    },
    pageTitle: {
        color: "#FFFFFF",
        fontSize: 34,
        fontWeight: "900",
        textAlign: "center",
        letterSpacing: 1.4,
        textTransform: "uppercase",
    },
    pageTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    broadcastScroller: {
        paddingRight: 14,
        paddingBottom: 14,
        gap: 8,
    },
    broadcastPill: {
        borderWidth: 1.3,
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 7,
        minWidth: 76,
        alignItems: "center",
        justifyContent: "center",
    },
    broadcastPillText: {
        fontSize: 11,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tvStage: {
        position: "relative",
        marginBottom: 24,
    },
    tvAmbientGlow: {
        position: "absolute",
        left: 22,
        right: 22,
        bottom: -13,
        height: 34,
        borderRadius: 999,
        transform: [{ scaleX: 1.05 }],
    },
    tvOuterFrame: {
        borderWidth: 1,
        borderRadius: 30,
        padding: 5,
        backgroundColor: "#03040B",
        shadowOpacity: 0.3,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    tvFrame: {
        borderWidth: 1.4,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#050611",
        shadowOpacity: 0.3,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    cornerTopLeft: {
        position: "absolute",
        top: -2,
        left: 18,
        width: 34,
        height: 3,
        borderRadius: 999,
        backgroundColor: "#22D3EE",
        zIndex: 5,
    },
    cornerTopRight: {
        position: "absolute",
        top: -2,
        right: 18,
        width: 34,
        height: 3,
        borderRadius: 999,
        backgroundColor: "#22C55E",
        zIndex: 5,
    },
    cornerBottomLeft: {
        position: "absolute",
        bottom: -2,
        left: 18,
        width: 34,
        height: 3,
        borderRadius: 999,
        backgroundColor: "#A855F7",
        zIndex: 5,
    },
    cornerBottomRight: {
        position: "absolute",
        bottom: -2,
        right: 18,
        width: 34,
        height: 3,
        borderRadius: 999,
        backgroundColor: "#FACC15",
        zIndex: 5,
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
    tvInfoBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#070816",
        paddingHorizontal: 13,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.07)",
    },
    tvIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    tvTextWrap: {
        flex: 1,
        paddingRight: 8,
    },
    tvTitle: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "900",
        width: 600,
    },
    titleTickerContainer: {
        width: "100%",
        overflow: "hidden",
    },
    tvSubtitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    tvSubtitle: {
        color: "#BFA7FF",
        fontSize: 13,
        fontWeight: "800",
        flexShrink: 1,
    },
    inlineStatusBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    liveInlineBadge: {
        backgroundColor: "#E11D48",
    },
    upcomingInlineBadge: {
        backgroundColor: "#3A2A09",
        borderWidth: 1,
        borderColor: "#FACC15",
    },
    endedInlineBadge: {
        backgroundColor: "#27272A",
        borderWidth: 1,
        borderColor: "#3F3F46",
    },
    watchInlineBadge: {
        backgroundColor: "#1B112A",
    },
    inlineStatusBadgeText: {
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.4,
    },
    liveInlineBadgeText: {
        color: "#FFFFFF",
    },
    upcomingInlineBadgeText: {
        color: "#FACC15",
    },
    endedInlineBadgeText: {
        color: "#A1A1AA",
    },
    watchInlineBadgeText: {
        color: "#D8B4FE",
    },
    typeGrid: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 14,
    },
    typeCard: {
        flex: 1,
        height: 84,
        borderRadius: 18,
        backgroundColor: "#0B0D1A",
        borderWidth: 1.2,
        borderColor: "#1F2437",
        alignItems: "center",
        justifyContent: "center",
    },
    activeTypeCard: {
        borderColor: "#22C55E",
        backgroundColor: "#0B0D1A",
    },
    typeText: {
        color: "#A7A7B7",
        fontSize: 10,
        fontWeight: "900",
        textAlign: "center",
        marginTop: 8,
        letterSpacing: 0.3,
    },
    activeTypeText: {
        color: "#FFFFFF",
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    sectionEyebrow: {
        color: "#22C55E",
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 1.8,
        marginBottom: 3,
    },
    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 0.2,
    },
    streamRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#080916",
        borderRadius: 20,
        padding: 11,
        marginBottom: 13,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    activeStreamRow: {
        borderColor: "rgba(34,197,94,0.35)",
        backgroundColor: "rgba(34,197,94,0.03)",
    },
    thumbnail: {
        width: 124,
        height: 70,
        borderRadius: 12,
        backgroundColor: "#111111",
        marginRight: 12,
    },
    thumbnailFallback: {
        width: 124,
        height: 70,
        borderRadius: 12,
        backgroundColor: "#111111",
        marginRight: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    streamContent: {
        flex: 1,
    },
    streamTitle: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "900",
        lineHeight: 20,
        marginBottom: 4,
    },
    streamSubtitle: {
        color: "#AFA7C9",
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 8,
    },
    streamBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: "#1B112A",
        alignSelf: "flex-start",
    },
    statusBadgeText: {
        color: "#D8B4FE",
        fontSize: 8.5,
        fontWeight: "900",
    },
    emptyWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        paddingHorizontal: 26,
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
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
    },
    emptyTypeWrap: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        backgroundColor: "#080916",
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTypeText: {
        color: "#8A8F98",
        fontSize: 14,
        fontWeight: "700",
    },
    planeTickerContainer: {
        height: 48,
        justifyContent: "center",
        overflow: "hidden",
        marginBottom: 18,
    },

    planeEmoji: {
        fontSize: 30,
        marginRight: 12,
    },

    tickerBubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 10,
    },

    blogBubble: {
        backgroundColor: "rgba(34,211,238,0.16)",
        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.28)",
    },

    gamesBubble: {
        backgroundColor: "rgba(250,204,21,0.16)",
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.28)",
    },

    supportBubble: {
        backgroundColor: "rgba(34,197,94,0.16)",
        borderWidth: 1,
        borderColor: "rgba(34,197,94,0.28)",
    },

    tickerBubbleText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
    },
});