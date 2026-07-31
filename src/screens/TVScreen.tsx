import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Dimensions,
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

import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

type StreamType = "Live" | "Podcast" | "Video" | "Highlight";
type LiveStatus = "upcoming" | "live" | "ended";

type RawTVItem = {
    _id?: string;
    id?: string;
    title?: string;
    subtitle?: string | null;
    type?: "live" | "podcast" | "video" | "highlight";
    description?: string | null;
    professor_fools_comment?: string | null;
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
    youtubeUrl: string;
    thumbnail: string;
    createdAt: string;
    description: string;
    professorFoolsComment: string;
    liveStatus?: LiveStatus;
    duration?: string;
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTENT_HORIZONTAL_PADDING = 16;
const PLAYER_WIDTH =
    SCREEN_WIDTH - CONTENT_HORIZONTAL_PADDING * 2;
const PLAYER_HEIGHT = PLAYER_WIDTH * (9 / 16);

const professorFoolsAvatar = require("../../assets/images/profileimages/professorFools.png");

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
            cyanSoft: "rgba(6,182,212,0.08)",
            purple: "#8B5CF6",
            purpleSoft: "rgba(139,92,246,0.08)",
            yellow: "#FACC15",
            red: "#E11D48",
            selectedCard: "rgba(6,182,212,0.07)",
            shadow: "rgba(15,23,42,0.12)",
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
        cyanSoft: "rgba(34,211,238,0.08)",
        purple: "#C084FC",
        purpleSoft: "rgba(192,132,252,0.08)",
        yellow: "#FACC15",
        red: "#FB7185",
        selectedCard: "rgba(34,211,238,0.09)",
        shadow: "rgba(0,0,0,0.35)",
    };
};

const toDisplayType = (
    type?: RawTVItem["type"],
): StreamType => {
    if (type === "podcast") return "Podcast";
    if (type === "video") return "Video";
    if (type === "highlight") return "Highlight";
    return "Live";
};

const getYoutubeId = (url?: string) => {
    if (!url || typeof url !== "string") {
        return "";
    }

    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&?]+)/,
    );

    return match?.[1] || "";
};

const getYoutubeThumbnail = (url?: string) => {
    const youtubeId = getYoutubeId(url);

    if (!youtubeId) {
        return "";
    }

    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
};

const getNewestByCreatedAt = (items: StreamItem[]) => {
    return [...items].sort(
        (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
    );
};

const normalizeTVItem = (
    item: RawTVItem,
    index: number,
): StreamItem | null => {
    if (!item.youtube_url || !item.title) {
        return null;
    }

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
        subtitle: item.subtitle || "ScoolFools TV",
        type: displayType,
        youtubeUrl: item.youtube_url,
        thumbnail:
            item.thumbnail_url ||
            getYoutubeThumbnail(item.youtube_url),
        createdAt,
        description: item.description || "",
        professorFoolsComment:
            item.professor_fools_comment || "",
        liveStatus: item.live_status || "upcoming",
        duration: item.duration || undefined,
    };
};

const formatPublishedDate = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();

    const differenceMs =
        now.getTime() - createdDate.getTime();

    const differenceMinutes = Math.floor(
        differenceMs / 60000,
    );

    if (differenceMinutes < 1) {
        return "Just now";
    }

    if (differenceMinutes < 60) {
        return `${differenceMinutes}m ago`;
    }

    const differenceHours = Math.floor(
        differenceMinutes / 60,
    );

    if (differenceHours < 24) {
        return `${differenceHours}h ago`;
    }

    const differenceDays = Math.floor(
        differenceHours / 24,
    );

    if (differenceDays < 7) {
        return `${differenceDays}d ago`;
    }

    return createdDate.toLocaleDateString();
};

const getStatusLabel = (item: StreamItem) => {
    if (item.type === "Live") {
        if (item.liveStatus === "live") {
            return "Live now";
        }

        if (item.liveStatus === "ended") {
            return "Replay";
        }

        return "Upcoming";
    }

    return item.duration || formatPublishedDate(item.createdAt);
};

export default function TVScreen() {
    const { mode: themeMode } = useTimeTheme();

    const theme = useMemo(
        () => getTheme(themeMode),
        [themeMode],
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme],
    );

    const [streams, setStreams] = useState<StreamItem[]>([]);
    const [selectedStream, setSelectedStream] =
        useState<StreamItem | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [
        professorCommentOpen,
        setProfessorCommentOpen,
    ] = useState(false);

    const fetchTVContent = useCallback(async () => {
        try {
            if (!API_BASE_URL) {
                console.log(
                    "Missing API base URL for TV content.",
                );
                return;
            }

            const response = await fetch(
                `${API_BASE_URL}/api/tv`,
            );

            const json: TVApiResponse =
                await response.json();

            let fetchedItems: RawTVItem[] = [];

            if (Array.isArray(json)) {
                fetchedItems = json;
            } else if (Array.isArray(json?.data)) {
                fetchedItems = json.data;
            }

            const normalizedItems = fetchedItems
                .map((item, index) =>
                    normalizeTVItem(item, index),
                )
                .filter(Boolean) as StreamItem[];

            const sortedItems =
                getNewestByCreatedAt(normalizedItems);

            setStreams(sortedItems);

            setSelectedStream((current) => {
                if (current) {
                    const stillExists = sortedItems.find(
                        (item) => item.id === current.id,
                    );

                    if (stillExists) {
                        return stillExists;
                    }
                }

                const newestWatch = sortedItems.find(
                    (item) => item.type !== "Podcast",
                );

                return (
                    newestWatch ||
                    sortedItems[0] ||
                    null
                );
            });
        } catch (error) {
            console.log(
                "Error fetching TV content:",
                error,
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchTVContent();
    }, [fetchTVContent]);

    useEffect(() => {
        setProfessorCommentOpen(false);
    }, [selectedStream?.id]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTVContent();
    }, [fetchTVContent]);

    const latestWatch = useMemo(() => {
        return getNewestByCreatedAt(
            streams.filter(
                (item) => item.type !== "Podcast",
            ),
        ).slice(0, 3);
    }, [streams]);

    const latestPodcasts = useMemo(() => {
        return getNewestByCreatedAt(
            streams.filter(
                (item) => item.type === "Podcast",
            ),
        ).slice(0, 3);
    }, [streams]);

    const handleSelectStream = (item: StreamItem) => {
        setSelectedStream(item);
        setProfessorCommentOpen(false);
    };

    const renderMediaRow = (
        item: StreamItem,
        accentColor: string,
    ) => {
        const selected =
            item.id === selectedStream?.id;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() =>
                    handleSelectStream(item)
                }
                style={[
                    styles.mediaRow,
                    selected && {
                        borderColor: accentColor,
                        backgroundColor:
                            theme.selectedCard,
                    },
                ]}
            >
                <View style={styles.thumbnailWrap}>
                    {item.thumbnail ? (
                        <Image
                            source={{
                                uri: item.thumbnail,
                            }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={
                                styles.thumbnailFallback
                            }
                        >
                            <MaterialCommunityIcons
                                name={
                                    item.type ===
                                        "Podcast"
                                        ? "headphones"
                                        : "television-play"
                                }
                                size={28}
                                color={theme.muted}
                            />
                        </View>
                    )}

                    <View style={styles.thumbnailBadge}>
                        <Text
                            style={
                                styles.thumbnailBadgeText
                            }
                        >
                            {item.type === "Live" &&
                                item.liveStatus === "live"
                                ? "LIVE"
                                : getStatusLabel(item)}
                        </Text>
                    </View>
                </View>

                <View style={styles.mediaCopy}>
                    <View
                        style={[
                            styles.typePill,
                            {
                                borderColor:
                                    accentColor,
                                backgroundColor:
                                    `${accentColor}14`,
                            },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={
                                item.type === "Podcast"
                                    ? "headphones"
                                    : item.type === "Live"
                                        ? "access-point"
                                        : item.type ===
                                            "Highlight"
                                            ? "star-four-points"
                                            : "play-circle-outline"
                            }
                            size={13}
                            color={accentColor}
                        />

                        <Text
                            style={[
                                styles.typePillText,
                                {
                                    color: accentColor,
                                },
                            ]}
                        >
                            {item.type === "Live"
                                ? "Broadcast"
                                : item.type}
                        </Text>
                    </View>

                    <Text
                        style={styles.mediaTitle}
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>

                    <Text
                        style={styles.mediaSubtitle}
                        numberOfLines={1}
                    >
                        {item.subtitle}
                    </Text>

                    <Text style={styles.mediaDate}>
                        {formatPublishedDate(
                            item.createdAt,
                        )}
                    </Text>
                </View>

                <MaterialCommunityIcons
                    name={
                        selected
                            ? "check-circle"
                            : "chevron-right"
                    }
                    size={22}
                    color={
                        selected
                            ? accentColor
                            : theme.muted
                    }
                />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView
                edges={["left", "right"]}
                style={styles.safeArea}
            >
                <View
                    style={styles.loadingContainer}
                >
                    <ActivityIndicator
                        size="small"
                        color={theme.cyan}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={["left", "right"]}
            style={styles.safeArea}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={
                    styles.contentContainer
                }
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.cyan}
                        colors={[theme.cyan]}
                        progressBackgroundColor={
                            theme.card
                        }
                    />
                }
            >
                {streams.length === 0 ||
                    !selectedStream ? (
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons
                            name="television-off"
                            size={46}
                            color={theme.muted}
                        />

                        <Text style={styles.emptyTitle}>
                            No TV content yet
                        </Text>

                        <Text style={styles.emptyText}>
                            Videos, broadcasts, highlights,
                            and podcasts will appear here.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.featuredHeader}>
                            <View style={styles.simpleTopHeading}>
                                <MaterialCommunityIcons
                                    name={
                                        selectedStream.type === "Podcast"
                                            ? "microphone"
                                            : "television-play"
                                    }
                                    size={25}
                                    color={theme.cyan}
                                />

                                <Text style={styles.simpleTopHeadingText}>
                                    {selectedStream.type === "Podcast"
                                        ? "Latest Podcasts"
                                        : "Latest Watch"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.heroCard}>
                            <View
                                style={styles.playerWrap}
                            >
                                <YoutubePlayer
                                    height={PLAYER_HEIGHT}
                                    width={PLAYER_WIDTH}
                                    videoId={getYoutubeId(
                                        selectedStream.youtubeUrl,
                                    )}
                                    play={false}
                                    webViewStyle={
                                        styles.youtubeWebView
                                    }
                                    initialPlayerParams={{
                                        controls: true,
                                        modestbranding: true,
                                        rel: false,
                                        playsinline: true,
                                    }}
                                />
                            </View>

                            <View style={styles.heroInfo}>
                                <View
                                    style={
                                        styles.heroTypeRow
                                    }
                                >
                                    <View
                                        style={[
                                            styles.heroTypePill,
                                            {
                                                backgroundColor:
                                                    selectedStream.type ===
                                                        "Podcast"
                                                        ? theme.purpleSoft
                                                        : theme.cyanSoft,
                                                borderColor:
                                                    selectedStream.type ===
                                                        "Podcast"
                                                        ? theme.purple
                                                        : theme.cyan,
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={
                                                selectedStream.type ===
                                                    "Podcast"
                                                    ? "headphones"
                                                    : "play-circle-outline"
                                            }
                                            size={14}
                                            color={
                                                selectedStream.type ===
                                                    "Podcast"
                                                    ? theme.purple
                                                    : theme.cyan
                                            }
                                        />

                                        <Text
                                            style={[
                                                styles.heroTypeText,
                                                {
                                                    color:
                                                        selectedStream.type ===
                                                            "Podcast"
                                                            ? theme.purple
                                                            : theme.cyan,
                                                },
                                            ]}
                                        >
                                            {selectedStream.type ===
                                                "Live"
                                                ? "Broadcast"
                                                : selectedStream.type}
                                        </Text>
                                    </View>

                                    <Text
                                        style={
                                            styles.heroStatusText
                                        }
                                    >
                                        {getStatusLabel(
                                            selectedStream,
                                        )}
                                    </Text>
                                </View>

                                <Text
                                    style={styles.heroTitle}
                                    numberOfLines={2}
                                >
                                    {selectedStream.title}
                                </Text>

                                <Text
                                    style={
                                        styles.heroSubtitle
                                    }
                                    numberOfLines={1}
                                >
                                    {selectedStream.subtitle}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.contextCard}>
                            <View
                                style={
                                    styles.descriptionHeadingRow
                                }
                            >
                                <MaterialCommunityIcons
                                    name="text-box-outline"
                                    size={19}
                                    color={theme.cyan}
                                />

                                <Text
                                    style={
                                        styles.contextHeading
                                    }
                                >
                                    Description
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.descriptionText
                                }
                            >
                                {selectedStream.description ||
                                    "No description has been added for this content yet."}
                            </Text>

                            <View
                                style={
                                    styles.contextDivider
                                }
                            />

                            <TouchableOpacity
                                style={
                                    styles.professorToggle
                                }
                                activeOpacity={0.85}
                                onPress={() =>
                                    setProfessorCommentOpen(
                                        (current) =>
                                            !current,
                                    )
                                }
                            >
                                <View
                                    style={
                                        styles.professorAvatarWrap
                                    }
                                >
                                    <Image
                                        source={
                                            professorFoolsAvatar
                                        }
                                        style={
                                            styles.professorAvatar
                                        }
                                        resizeMode="contain"
                                    />
                                </View>

                                <View
                                    style={
                                        styles.professorIdentity
                                    }
                                >
                                    <Text
                                        style={
                                            styles.professorName
                                        }
                                    >
                                        Professor Fools
                                    </Text>

                                    <Text
                                        style={
                                            styles.professorLabel
                                        }
                                    >
                                        {professorCommentOpen
                                            ? "TAP TO HIDE HIS TAKE"
                                            : "TAP TO READ HIS TAKE"}
                                    </Text>
                                </View>

                                <MaterialCommunityIcons
                                    name={
                                        professorCommentOpen
                                            ? "chevron-up"
                                            : "chevron-down"
                                    }
                                    size={24}
                                    color={theme.cyan}
                                />
                            </TouchableOpacity>

                            {professorCommentOpen && (
                                <View
                                    style={
                                        styles.professorCommentBox
                                    }
                                >
                                    <Text
                                        style={
                                            styles.professorComment
                                        }
                                    >
                                        {selectedStream.professorFoolsComment ||
                                            "Professor Fools has not commented on this one yet."}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.sectionBlock}>
                            <View
                                style={
                                    styles.sectionHeader
                                }
                            >
                                <View
                                    style={
                                        styles.sectionTitleRow
                                    }
                                >
                                    <View
                                        style={[
                                            styles.sectionIcon,
                                            {
                                                backgroundColor:
                                                    theme.cyanSoft,
                                                borderColor:
                                                    theme.cyan,
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name="play-circle"
                                            size={20}
                                            color={theme.cyan}
                                        />
                                    </View>

                                    <View>
                                        <Text
                                            style={
                                                styles.sectionEyebrow
                                            }
                                        >
                                            WATCH
                                        </Text>

                                        <Text
                                            style={
                                                styles.sectionTitle
                                            }
                                        >
                                            Latest Watch
                                        </Text>
                                    </View>
                                </View>

                                <Text
                                    style={
                                        styles.sectionCount
                                    }
                                >
                                    Latest 3
                                </Text>
                            </View>

                            {latestWatch.length > 0 ? (
                                latestWatch.map((item) =>
                                    renderMediaRow(
                                        item,
                                        theme.cyan,
                                    ),
                                )
                            ) : (
                                <View
                                    style={
                                        styles.emptySectionCard
                                    }
                                >
                                    <Text
                                        style={
                                            styles.emptySectionText
                                        }
                                    >
                                        No watch content yet.
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.sectionBlock}>
                            <View
                                style={
                                    styles.sectionHeader
                                }
                            >
                                <View
                                    style={
                                        styles.sectionTitleRow
                                    }
                                >
                                    <View
                                        style={[
                                            styles.sectionIcon,
                                            {
                                                backgroundColor:
                                                    theme.purpleSoft,
                                                borderColor:
                                                    theme.purple,
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name="headphones"
                                            size={20}
                                            color={theme.purple}
                                        />
                                    </View>

                                    <View>
                                        <Text
                                            style={[
                                                styles.sectionEyebrow,
                                                {
                                                    color:
                                                        theme.purple,
                                                },
                                            ]}
                                        >
                                            LISTEN
                                        </Text>

                                        <Text
                                            style={
                                                styles.sectionTitle
                                            }
                                        >
                                            Latest Podcasts
                                        </Text>
                                    </View>
                                </View>

                                <Text
                                    style={
                                        styles.sectionCount
                                    }
                                >
                                    Latest 3
                                </Text>
                            </View>

                            {latestPodcasts.length > 0 ? (
                                latestPodcasts.map(
                                    (item) =>
                                        renderMediaRow(
                                            item,
                                            theme.purple,
                                        ),
                                )
                            ) : (
                                <View
                                    style={
                                        styles.emptySectionCard
                                    }
                                >
                                    <Text
                                        style={
                                            styles.emptySectionText
                                        }
                                    >
                                        No podcasts yet.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (
    theme: ReturnType<typeof getTheme>,
) =>
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
            paddingTop: 14,
            paddingBottom: 125,
        },

        loadingContainer: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.bg,
        },

        featuredHeader: {
            marginBottom: 12,
        },

        simpleTopHeading: {
            flexDirection: "row",
            alignItems: "center",
        },

        simpleTopHeadingText: {
            color: theme.text,
            fontSize: 24,
            lineHeight: 27,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.2,
            marginLeft: 9,
        },

        sectionBlock: {
            marginBottom: 24,
        },

        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },

        sectionTitleRow: {
            flexDirection: "row",
            alignItems: "center",
        },

        sectionIcon: {
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            marginRight: 10,
        },

        sectionEyebrow: {
            color: theme.cyan,
            fontSize: 10,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 1.4,
        },

        sectionTitle: {
            color: theme.text,
            fontSize: 21,
            lineHeight: 23,
            fontFamily: "Rajdhani_700Bold",
        },

        sectionCount: {
            color: theme.muted,
            fontSize: 12,
            fontWeight: "700",
        },

        heroCard: {
            overflow: "hidden",
            backgroundColor: theme.card,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 14,
            shadowColor: theme.shadow,
            shadowOpacity:
                theme.mode === "day" ? 0.12 : 0.28,
            shadowRadius: 16,
            shadowOffset: {
                width: 0,
                height: 8,
            },
            elevation: 5,
        },

        playerWrap: {
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            backgroundColor: "#000000",
            overflow: "hidden",
            alignSelf: "center",
        },

        youtubeWebView: {
            backgroundColor: "#000000",
            margin: 0,
            padding: 0,
        },

        heroInfo: {
            paddingHorizontal: 15,
            paddingTop: 13,
            paddingBottom: 15,
        },

        heroTypeRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
        },

        heroTypePill: {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 9,
            paddingVertical: 4,
        },

        heroTypeText: {
            fontSize: 10,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginLeft: 5,
        },

        heroStatusText: {
            color: theme.muted,
            fontSize: 12,
            fontWeight: "700",
        },

        heroTitle: {
            color: theme.text,
            fontSize: 24,
            lineHeight: 28,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.2,
            marginBottom: 4,
        },

        heroSubtitle: {
            color: theme.subtext,
            fontSize: 14,
            fontWeight: "700",
        },

        contextCard: {
            backgroundColor: theme.card,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 15,
            paddingVertical: 14,
            marginBottom: 24,
            shadowColor: theme.shadow,
            shadowOpacity:
                theme.mode === "day" ? 0.07 : 0.18,
            shadowRadius: 10,
            shadowOffset: {
                width: 0,
                height: 5,
            },
            elevation: 3,
        },

        descriptionHeadingRow: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 7,
        },

        contextHeading: {
            color: theme.text,
            fontSize: 17,
            fontFamily: "Rajdhani_700Bold",
            marginLeft: 7,
        },

        descriptionText: {
            color: theme.subtext,
            fontSize: 11.5,
            lineHeight: 17,
        },

        contextDivider: {
            height: 1,
            backgroundColor: theme.border,
            marginVertical: 14,
        },

        professorToggle: {
            flexDirection: "row",
            alignItems: "center",
        },

        professorAvatarWrap: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: theme.cyanSoft,
            borderWidth: 1,
            borderColor: theme.cyan,
            marginRight: 10,
        },

        professorAvatar: {
            width: 41,
            height: 41,
        },

        professorIdentity: {
            flex: 1,
        },

        professorName: {
            color: theme.text,
            fontSize: 17,
            lineHeight: 19,
            fontFamily: "Rajdhani_700Bold",
        },

        professorLabel: {
            color: theme.cyan,
            fontSize: 9.5,
            lineHeight: 13,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.8,
        },

        professorCommentBox: {
            backgroundColor: theme.cyanSoft,
            borderLeftWidth: 3,
            borderLeftColor: theme.cyan,
            borderRadius: 10,
            paddingHorizontal: 11,
            paddingVertical: 10,
            marginTop: 12,
        },

        professorComment: {
            color: theme.text,
            fontSize: 11.5,
            lineHeight: 17,
        },

        mediaRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 9,
            marginBottom: 11,
            shadowColor: theme.shadow,
            shadowOpacity:
                theme.mode === "day" ? 0.06 : 0.14,
            shadowRadius: 8,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            elevation: 2,
        },

        thumbnailWrap: {
            width: 124,
            height: 74,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: theme.card2,
            marginRight: 11,
            position: "relative",
        },

        thumbnail: {
            width: "100%",
            height: "100%",
        },

        thumbnailFallback: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card2,
        },

        thumbnailBadge: {
            position: "absolute",
            right: 5,
            bottom: 5,
            backgroundColor: "rgba(0,0,0,0.82)",
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 3,
        },

        thumbnailBadgeText: {
            color: "#FFFFFF",
            fontSize: 9.5,
            fontWeight: "800",
        },

        mediaCopy: {
            flex: 1,
            paddingRight: 5,
        },

        typePill: {
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 7,
            paddingVertical: 3,
            marginBottom: 5,
        },

        typePillText: {
            fontSize: 9,
            fontFamily: "Rajdhani_700Bold",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginLeft: 4,
        },

        mediaTitle: {
            color: theme.text,
            fontSize: 16,
            lineHeight: 18,
            fontFamily: "Rajdhani_700Bold",
            marginBottom: 2,
        },

        mediaSubtitle: {
            color: theme.subtext,
            fontSize: 11.5,
            fontWeight: "700",
            marginBottom: 3,
        },

        mediaDate: {
            color: theme.muted,
            fontSize: 10.5,
            fontWeight: "700",
        },

        emptySectionCard: {
            minHeight: 70,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
        },

        emptySectionText: {
            color: theme.muted,
            fontSize: 13,
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