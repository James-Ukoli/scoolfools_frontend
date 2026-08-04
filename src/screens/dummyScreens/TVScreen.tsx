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

type StreamType =
    | "Live"
    | "Podcast"
    | "Video"
    | "Highlight";

type LiveStatus =
    | "upcoming"
    | "live"
    | "ended";

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

const PLAYER_HEIGHT =
    PLAYER_WIDTH * (9 / 16);

const MEDIA_CARD_WIDTH = Math.min(
    SCREEN_WIDTH * 0.76,
    300,
);

const MEDIA_THUMBNAIL_HEIGHT =
    MEDIA_CARD_WIDTH * (9 / 16);

const MEDIA_CARD_GAP = 12;

const professorFoolsAvatar = require(
    "../../assets/images/profileimages/professorFools.png",
);

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
        shadow: "rgba(0,0,0,0.35)",
    };
};

const toDisplayType = (
    type?: RawTVItem["type"],
): StreamType => {
    if (type === "podcast") {
        return "Podcast";
    }

    if (type === "video") {
        return "Video";
    }

    if (type === "highlight") {
        return "Highlight";
    }

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

const getNewestByCreatedAt = (
    items: StreamItem[],
) => {
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
        id:
            item._id ||
            item.id ||
            `${item.title}-${index}`,
        title: item.title,
        subtitle:
            item.subtitle ||
            "ScoolFools TV",
        type: displayType,
        youtubeUrl: item.youtube_url,
        thumbnail:
            item.thumbnail_url ||
            getYoutubeThumbnail(
                item.youtube_url,
            ),
        createdAt,
        description:
            item.description || "",
        professorFoolsComment:
            item.professor_fools_comment || "",
        liveStatus:
            item.live_status || "upcoming",
        duration:
            item.duration || undefined,
    };
};

const formatPublishedDate = (
    createdAt: string,
) => {
    const createdDate = new Date(createdAt);
    const now = new Date();

    const differenceMs =
        now.getTime() -
        createdDate.getTime();

    const differenceMinutes =
        Math.floor(
            differenceMs / 60000,
        );

    if (differenceMinutes < 1) {
        return "Just now";
    }

    if (differenceMinutes < 60) {
        return `${differenceMinutes}m ago`;
    }

    const differenceHours =
        Math.floor(
            differenceMinutes / 60,
        );

    if (differenceHours < 24) {
        return `${differenceHours}h ago`;
    }

    const differenceDays =
        Math.floor(
            differenceHours / 24,
        );

    if (differenceDays < 7) {
        return `${differenceDays}d ago`;
    }

    return createdDate.toLocaleDateString();
};

const getThumbnailLabel = (
    item: StreamItem,
) => {
    if (item.type === "Live") {
        if (item.liveStatus === "live") {
            return "LIVE";
        }

        if (item.liveStatus === "ended") {
            return "REPLAY";
        }

        return "UPCOMING";
    }

    return (
        item.duration ||
        formatPublishedDate(item.createdAt)
    );
};

const getTypeIcon = (
    item: StreamItem,
) => {
    if (item.type === "Podcast") {
        return "headphones";
    }

    if (item.type === "Live") {
        return "access-point";
    }

    if (item.type === "Highlight") {
        return "star-four-points";
    }

    return "play-circle-outline";
};

export default function TVScreen() {
    const { mode: themeMode } =
        useTimeTheme();

    const theme = useMemo(
        () => getTheme(themeMode),
        [themeMode],
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme],
    );

    const [streams, setStreams] =
        useState<StreamItem[]>([]);

    const [
        selectedStream,
        setSelectedStream,
    ] = useState<StreamItem | null>(
        null,
    );

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [
        professorCommentOpen,
        setProfessorCommentOpen,
    ] = useState(false);

    const fetchTVContent =
        useCallback(async () => {
            try {
                if (!API_BASE_URL) {
                    console.log(
                        "Missing API base URL for TV content.",
                    );
                    return;
                }

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/tv`,
                    );

                if (!response.ok) {
                    throw new Error(
                        `TV request failed with status ${response.status}`,
                    );
                }

                const json: TVApiResponse =
                    await response.json();

                let fetchedItems:
                    RawTVItem[] = [];

                if (Array.isArray(json)) {
                    fetchedItems = json;
                } else if (
                    Array.isArray(json?.data)
                ) {
                    fetchedItems =
                        json.data;
                }

                const normalizedItems =
                    fetchedItems
                        .map(
                            (
                                item,
                                index,
                            ) =>
                                normalizeTVItem(
                                    item,
                                    index,
                                ),
                        )
                        .filter(
                            Boolean,
                        ) as StreamItem[];

                const sortedItems =
                    getNewestByCreatedAt(
                        normalizedItems,
                    );

                setStreams(sortedItems);

                setSelectedStream(
                    (current) => {
                        if (current) {
                            const stillExists =
                                sortedItems.find(
                                    (
                                        item,
                                    ) =>
                                        item.id ===
                                        current.id,
                                );

                            if (
                                stillExists
                            ) {
                                return stillExists;
                            }
                        }

                        const newestWatch =
                            sortedItems.find(
                                (
                                    item,
                                ) =>
                                    item.type !==
                                    "Podcast",
                            );

                        return (
                            newestWatch ||
                            sortedItems[0] ||
                            null
                        );
                    },
                );
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

    const onRefresh =
        useCallback(async () => {
            setRefreshing(true);
            await fetchTVContent();
        }, [fetchTVContent]);

    const latestWatch =
        useMemo(() => {
            return getNewestByCreatedAt(
                streams.filter(
                    (item) =>
                        item.type !==
                        "Podcast",
                ),
            ).slice(0, 3);
        }, [streams]);

    const latestPodcasts =
        useMemo(() => {
            return getNewestByCreatedAt(
                streams.filter(
                    (item) =>
                        item.type ===
                        "Podcast",
                ),
            ).slice(0, 3);
        }, [streams]);

    const handleSelectStream = (
        item: StreamItem,
    ) => {
        setSelectedStream(item);
        setProfessorCommentOpen(false);
    };

    const renderMediaCard = (
        item: StreamItem,
        accentColor: string,
    ) => {
        const selected =
            item.id ===
            selectedStream?.id;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() =>
                    handleSelectStream(
                        item,
                    )
                }
                style={styles.mediaCard}
            >
                <View
                    style={
                        styles.mediaThumbnailWrap
                    }
                >
                    {item.thumbnail ? (
                        <Image
                            source={{
                                uri: item.thumbnail,
                            }}
                            style={
                                styles.mediaThumbnail
                            }
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
                                size={36}
                                color={
                                    theme.muted
                                }
                            />
                        </View>
                    )}

                    <View
                        style={
                            styles.thumbnailBadge
                        }
                    >
                        <Text
                            style={
                                styles.thumbnailBadgeText
                            }
                        >
                            {getThumbnailLabel(
                                item,
                            )}
                        </Text>
                    </View>
                </View>

                <View
                    style={
                        styles.mediaCardInfo
                    }
                >
                    <View
                        style={
                            styles.mediaTypeRow
                        }
                    >
                        <View
                            style={
                                styles.mediaTypeLeft
                            }
                        >
                            <MaterialCommunityIcons
                                name={
                                    getTypeIcon(
                                        item,
                                    ) as any
                                }
                                size={14}
                                color={
                                    accentColor
                                }
                            />

                            <Text
                                style={[
                                    styles.mediaTypeText,
                                    {
                                        color:
                                            accentColor,
                                    },
                                ]}
                            >
                                {item.type}
                            </Text>
                        </View>

                        <MaterialCommunityIcons
                            name={
                                selected
                                    ? "check-circle"
                                    : "chevron-right"
                            }
                            size={21}
                            color={
                                selected
                                    ? accentColor
                                    : theme.muted
                            }
                        />
                    </View>

                    <Text
                        style={
                            styles.mediaTitle
                        }
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>

                    <Text
                        style={
                            styles.mediaSubtitle
                        }
                        numberOfLines={1}
                    >
                        {item.subtitle}
                    </Text>

                    <Text
                        style={
                            styles.mediaDate
                        }
                    >
                        {formatPublishedDate(
                            item.createdAt,
                        )}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView
                edges={[
                    "left",
                    "right",
                ]}
                style={styles.safeArea}
            >
                <View
                    style={
                        styles.loadingContainer
                    }
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
                showsVerticalScrollIndicator={
                    false
                }
                refreshControl={
                    <RefreshControl
                        refreshing={
                            refreshing
                        }
                        onRefresh={
                            onRefresh
                        }
                        tintColor={
                            theme.cyan
                        }
                        colors={[
                            theme.cyan,
                        ]}
                        progressBackgroundColor={
                            theme.card
                        }
                    />
                }
            >
                {streams.length === 0 ||
                    !selectedStream ? (
                    <View
                        style={
                            styles.emptyWrap
                        }
                    >
                        <MaterialCommunityIcons
                            name="television-off"
                            size={46}
                            color={
                                theme.muted
                            }
                        />

                        <Text
                            style={
                                styles.emptyTitle
                            }
                        >
                            No TV content yet
                        </Text>

                        <Text
                            style={
                                styles.emptyText
                            }
                        >
                            Videos, broadcasts,
                            highlights, and
                            podcasts will appear
                            here.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View
                            style={
                                styles.featuredHeader
                            }
                        >
                            <View
                                style={
                                    styles.simpleTopHeading
                                }
                            >
                                <MaterialCommunityIcons
                                    name={
                                        selectedStream.type ===
                                            "Podcast"
                                            ? "microphone"
                                            : "television-play"
                                    }
                                    size={25}
                                    color={
                                        selectedStream.type ===
                                            "Podcast"
                                            ? theme.purple
                                            : theme.cyan
                                    }
                                />

                                <Text
                                    style={
                                        styles.simpleTopHeadingText
                                    }
                                >
                                    {selectedStream.type ===
                                        "Podcast"
                                        ? "Latest Podcasts"
                                        : "Latest Watch"}
                                </Text>
                            </View>
                        </View>

                        <View
                            style={
                                styles.heroCard
                            }
                        >
                            <View
                                style={
                                    styles.playerWrap
                                }
                            >
                                <YoutubePlayer
                                    height={
                                        PLAYER_HEIGHT
                                    }
                                    width={
                                        PLAYER_WIDTH
                                    }
                                    videoId={getYoutubeId(
                                        selectedStream.youtubeUrl,
                                    )}
                                    play={false}
                                    webViewStyle={
                                        styles.youtubeWebView
                                    }
                                    initialPlayerParams={{
                                        controls:
                                            true,
                                        modestbranding:
                                            true,
                                        rel: false,
                                        playsinline:
                                            true,
                                    }}
                                />
                            </View>

                            <View
                                style={
                                    styles.heroInfo
                                }
                            >
                                <Text
                                    style={
                                        styles.heroTitle
                                    }
                                    numberOfLines={
                                        2
                                    }
                                >
                                    {
                                        selectedStream.title
                                    }
                                </Text>

                                <Text
                                    style={
                                        styles.heroSubtitle
                                    }
                                    numberOfLines={
                                        1
                                    }
                                >
                                    {
                                        selectedStream.subtitle
                                    }
                                </Text>
                            </View>
                        </View>

                        <View
                            style={
                                styles.contextCard
                            }
                        >
                            <View
                                style={
                                    styles.descriptionHeadingRow
                                }
                            >
                                <MaterialCommunityIcons
                                    name="text-box-outline"
                                    size={19}
                                    color={
                                        theme.cyan
                                    }
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
                                activeOpacity={
                                    0.85
                                }
                                onPress={() =>
                                    setProfessorCommentOpen(
                                        (
                                            current,
                                        ) =>
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
                                        Professor
                                        Fools
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
                                    color={
                                        theme.cyan
                                    }
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

                        <View
                            style={
                                styles.sectionBlock
                            }
                        >
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
                                    <MaterialCommunityIcons
                                        name="play-circle"
                                        size={32}
                                        color={
                                            theme.cyan
                                        }
                                        style={
                                            styles.sectionHeadingIcon
                                        }
                                    />

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
                                            Latest
                                            Watch
                                        </Text>
                                    </View>
                                </View>

                                {latestWatch.length >
                                    1 && (
                                        <Text
                                            style={
                                                styles.swipeLabel
                                            }
                                        >
                                            SWIPE
                                        </Text>
                                    )}
                            </View>

                            {latestWatch.length >
                                0 ? (
                                <ScrollView
                                    horizontal
                                    nestedScrollEnabled
                                    showsHorizontalScrollIndicator={
                                        false
                                    }
                                    decelerationRate="fast"
                                    snapToInterval={
                                        MEDIA_CARD_WIDTH +
                                        MEDIA_CARD_GAP
                                    }
                                    snapToAlignment="start"
                                    contentContainerStyle={
                                        styles.horizontalListContent
                                    }
                                >
                                    {latestWatch.map(
                                        (
                                            item,
                                        ) =>
                                            renderMediaCard(
                                                item,
                                                theme.cyan,
                                            ),
                                    )}
                                </ScrollView>
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
                                        No watch
                                        content yet.
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View
                            style={
                                styles.sectionBlock
                            }
                        >
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
                                    <MaterialCommunityIcons
                                        name="headphones"
                                        size={31}
                                        color={
                                            theme.purple
                                        }
                                        style={
                                            styles.sectionHeadingIcon
                                        }
                                    />

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
                                            Latest
                                            Podcasts
                                        </Text>
                                    </View>
                                </View>

                                {latestPodcasts.length >
                                    1 && (
                                        <Text
                                            style={
                                                styles.swipeLabel
                                            }
                                        >
                                            SWIPE
                                        </Text>
                                    )}
                            </View>

                            {latestPodcasts.length >
                                0 ? (
                                <ScrollView
                                    horizontal
                                    nestedScrollEnabled
                                    showsHorizontalScrollIndicator={
                                        false
                                    }
                                    decelerationRate="fast"
                                    snapToInterval={
                                        MEDIA_CARD_WIDTH +
                                        MEDIA_CARD_GAP
                                    }
                                    snapToAlignment="start"
                                    contentContainerStyle={
                                        styles.horizontalListContent
                                    }
                                >
                                    {latestPodcasts.map(
                                        (
                                            item,
                                        ) =>
                                            renderMediaCard(
                                                item,
                                                theme.purple,
                                            ),
                                    )}
                                </ScrollView>
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
                                        No podcasts
                                        yet.
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
            backgroundColor:
                theme.safeBg,
        },

        container: {
            flex: 1,
            backgroundColor: theme.bg,
        },

        contentContainer: {
            paddingHorizontal:
                CONTENT_HORIZONTAL_PADDING,
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
            fontFamily:
                "Rajdhani_700Bold",
            letterSpacing: 0.2,
            marginLeft: 9,
        },

        heroCard: {
            overflow: "hidden",
            backgroundColor:
                theme.card,
            borderRadius: 23,
            borderWidth: 1,
            borderColor:
                theme.border,
            marginBottom: 14,
            shadowColor:
                theme.shadow,
            shadowOpacity:
                theme.mode === "day"
                    ? 0.12
                    : 0.28,
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
            backgroundColor:
                "#000000",
            overflow: "hidden",
            alignSelf: "center",
        },

        youtubeWebView: {
            backgroundColor:
                "#000000",
            margin: 0,
            padding: 0,
        },

        heroInfo: {
            paddingHorizontal: 15,
            paddingTop: 13,
            paddingBottom: 15,
        },

        heroTitle: {
            color: theme.text,
            fontSize: 24,
            lineHeight: 28,
            fontFamily:
                "Rajdhani_700Bold",
            letterSpacing: 0.2,
            marginBottom: 4,
        },

        heroSubtitle: {
            color: theme.subtext,
            fontSize: 14,
            fontWeight: "700",
        },

        contextCard: {
            backgroundColor:
                theme.card,
            borderRadius: 19,
            borderWidth: 1,
            borderColor:
                theme.border,
            paddingHorizontal: 15,
            paddingVertical: 14,
            marginBottom: 24,
            shadowColor:
                theme.shadow,
            shadowOpacity:
                theme.mode === "day"
                    ? 0.07
                    : 0.18,
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
            fontFamily:
                "Rajdhani_700Bold",
            marginLeft: 7,
        },

        descriptionText: {
            color: theme.subtext,
            fontSize: 11.5,
            lineHeight: 17,
        },

        contextDivider: {
            height: 1,
            backgroundColor:
                theme.border,
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
            backgroundColor:
                theme.cyanSoft,
            borderWidth: 1,
            borderColor:
                theme.cyan,
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
            fontFamily:
                "Rajdhani_700Bold",
        },

        professorLabel: {
            color: theme.cyan,
            fontSize: 9.5,
            lineHeight: 13,
            fontFamily:
                "Rajdhani_700Bold",
            letterSpacing: 0.8,
        },

        professorCommentBox: {
            backgroundColor:
                theme.cyanSoft,
            borderLeftWidth: 3,
            borderLeftColor:
                theme.cyan,
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

        sectionBlock: {
            marginBottom: 25,
        },

        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            marginBottom: 12,
        },

        sectionTitleRow: {
            flexDirection: "row",
            alignItems: "center",
        },

        sectionHeadingIcon: {
            marginRight: 10,
        },

        sectionEyebrow: {
            color: theme.cyan,
            fontSize: 10,
            fontFamily:
                "Rajdhani_700Bold",
            letterSpacing: 1.4,
        },

        sectionTitle: {
            color: theme.text,
            fontSize: 21,
            lineHeight: 23,
            fontFamily:
                "Rajdhani_700Bold",
        },

        swipeLabel: {
            color: theme.muted,
            fontSize: 9.5,
            fontFamily:
                "Rajdhani_700Bold",
            letterSpacing: 1.1,
        },

        horizontalListContent: {
            paddingRight: 4,
        },

        mediaCard: {
            width: MEDIA_CARD_WIDTH,
            backgroundColor:
                theme.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor:
                theme.border,
            overflow: "hidden",
            marginRight:
                MEDIA_CARD_GAP,
            shadowColor:
                theme.shadow,
            shadowOpacity:
                theme.mode === "day"
                    ? 0.07
                    : 0.16,
            shadowRadius: 9,
            shadowOffset: {
                width: 0,
                height: 5,
            },
            elevation: 3,
        },

        mediaThumbnailWrap: {
            width: "100%",
            height:
                MEDIA_THUMBNAIL_HEIGHT,
            overflow: "hidden",
            backgroundColor:
                theme.card2,
            position: "relative",
        },

        mediaThumbnail: {
            width: "100%",
            height: "100%",
        },

        thumbnailFallback: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                theme.card2,
        },

        thumbnailBadge: {
            position: "absolute",
            right: 7,
            bottom: 7,
            backgroundColor:
                "rgba(0,0,0,0.82)",
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
        },

        thumbnailBadgeText: {
            color: "#FFFFFF",
            fontSize: 9.5,
            fontWeight: "800",
        },

        mediaCardInfo: {
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 12,
        },

        mediaTypeRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            marginBottom: 7,
        },

        mediaTypeLeft: {
            flexDirection: "row",
            alignItems: "center",
        },

        mediaTypeText: {
            fontSize: 10,
            fontFamily:
                "Rajdhani_700Bold",
            textTransform:
                "uppercase",
            letterSpacing: 0.6,
            marginLeft: 5,
        },

        mediaTitle: {
            color: theme.text,
            fontSize: 17,
            lineHeight: 20,
            fontFamily:
                "Rajdhani_700Bold",
            marginBottom: 4,
            minHeight: 40,
        },

        mediaSubtitle: {
            color: theme.subtext,
            fontSize: 11.5,
            fontWeight: "700",
            marginBottom: 5,
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
            backgroundColor:
                theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor:
                theme.border,
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
            fontFamily:
                "Rajdhani_700Bold",
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