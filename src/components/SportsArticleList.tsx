import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Sport =
    | "college-chess"
    | "basketball"
    | "football"
    | "volleyball";

type Post = {
    _id: string;
    title: string;
    summary?: string | null;
    cover_image_url?: string | null;
    created_at?: string;
    published_at?: string | null;
    category: string;
    content_type: string;
    slug: string;
};

type PostsApiResponse = {
    data?: Post[];
    posts?: Post[];
    success?: boolean;
    message?: string;
};

type SportsArticleTheme = {
    card: string;
    cardAlt: string;
    border: string;
    borderSoft?: string;
    text: string;
    muted: string;
    subtle?: string;
};

type SportsArticleListProps = {
    selectedSport: Sport;
    navigation: any;
    theme: SportsArticleTheme;
    refreshKey?: number;
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const ACCENT = "#06B6D4";

const SPORT_CATEGORY_MAP: Record<Sport, string> = {
    "college-chess": "Chess",
    basketball: "Basketball",
    football: "Football",
    volleyball: "Volleyball",
};

const SPORT_TITLE_MAP: Record<Sport, string> = {
    "college-chess": "Chess",
    basketball: "Basketball",
    football: "Football",
    volleyball: "Volleyball",
};

const SPORT_EMOJI_MAP: Record<Sport, string> = {
    "college-chess": "♟",
    basketball: "🏀",
    football: "🏈",
    volleyball: "🏐",
};

const INITIAL_VISIBLE_ARTICLES = 5;

function formatTimeAgo(dateString?: string | null) {
    if (!dateString) return "";

    const postDate = new Date(dateString);

    if (Number.isNaN(postDate.getTime())) {
        return "";
    }

    const now = new Date();
    const differenceMs = now.getTime() - postDate.getTime();

    const minutes = Math.floor(differenceMs / 1000 / 60);
    const hours = Math.floor(differenceMs / 1000 / 60 / 60);
    const days = Math.floor(differenceMs / 1000 / 60 / 60 / 24);

    if (minutes < 60) {
        return `${Math.max(minutes, 1)}m ago`;
    }

    if (hours < 24) {
        return `${hours}h ago`;
    }

    if (days <= 6) {
        return `${days}d ago`;
    }

    return postDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function getPostDate(post: Post) {
    return post.published_at || post.created_at || "";
}

function getCategoryStyle(category: string) {
    switch (category) {
        case "Basketball":
            return {
                backgroundColor: "#7C2D12",
                borderColor: "#FB923C",
            };

        case "Football":
            return {
                backgroundColor: "#14532D",
                borderColor: "#4ADE80",
            };

        case "Volleyball":
            return {
                backgroundColor: "#4C1D95",
                borderColor: "#C084FC",
            };

        case "Chess":
            return {
                backgroundColor: "#1E3A5F",
                borderColor: "#38BDF8",
            };

        default:
            return {
                backgroundColor: "#164E63",
                borderColor: ACCENT,
            };
    }
}

export default function SportsArticleList({
    selectedSport,
    navigation,
    theme,
    refreshKey = 0,
}: SportsArticleListProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [visibleCount, setVisibleCount] = useState(
        INITIAL_VISIBLE_ARTICLES
    );

    const sportCategory = SPORT_CATEGORY_MAP[selectedSport];
    const sportTitle = SPORT_TITLE_MAP[selectedSport];
    const sportEmoji = SPORT_EMOJI_MAP[selectedSport];

    const fetchSportsPosts = useCallback(async () => {
        if (!API_BASE_URL) {
            setPosts([]);
            setError("API URL is missing.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API_BASE_URL}/api/posts`);

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `Sports articles request failed (${response.status}).`
                );
            }

            const json: PostsApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    json?.message || "Could not load sports articles."
                );
            }

            const responsePosts = Array.isArray(json?.data)
                ? json.data
                : Array.isArray(json?.posts)
                    ? json.posts
                    : [];

            const sportsPosts = responsePosts
                .filter(
                    (post) =>
                        post.content_type === "sports"
                )
                .sort((a, b) => {
                    const dateA = new Date(
                        getPostDate(a)
                    ).getTime();

                    const dateB = new Date(
                        getPostDate(b)
                    ).getTime();

                    return dateB - dateA;
                });

            setPosts(sportsPosts);
        } catch (requestError) {
            setPosts([]);
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Could not load sports articles."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSportsPosts();
    }, [fetchSportsPosts, refreshKey]);

    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE_ARTICLES);
    }, [selectedSport]);

    const filteredPosts = useMemo(() => {
        return posts.filter(
            (post) =>
                post.content_type === "sports" &&
                post.category === sportCategory
        );
    }, [posts, sportCategory]);

    const featuredPost = filteredPosts[0] || null;

    const remainingPosts = filteredPosts.slice(1);

    const visiblePosts = remainingPosts.slice(
        0,
        visibleCount
    );

    const hasMore = visibleCount < remainingPosts.length;

    const handleOpenPost = (post: Post) => {
        navigation.navigate("ArticleScreen", {
            slug: post.slug,
        });
    };

    if (loading) {
        return (
            <View
                style={[
                    styles.stateCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                    },
                ]}
            >
                <ActivityIndicator
                    size="small"
                    color={ACCENT}
                />

                <Text
                    style={[
                        styles.stateText,
                        { color: theme.muted },
                    ]}
                >
                    Loading {sportTitle} stories...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View
                style={[
                    styles.stateCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.errorTitle,
                        { color: theme.text },
                    ]}
                >
                    Sports stories unavailable
                </Text>

                <Text
                    style={[
                        styles.errorText,
                        { color: theme.muted },
                    ]}
                >
                    {error}
                </Text>

                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.retryButton}
                    onPress={fetchSportsPosts}
                >
                    <Text style={styles.retryButtonText}>
                        Try Again
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <View>
                    <Text
                        style={[
                            styles.sectionEyebrow,
                            { color: ACCENT },
                        ]}
                    >
                        {sportEmoji} SPORTS
                    </Text>

                    <Text
                        style={[
                            styles.sectionTitle,
                            { color: theme.text },
                        ]}
                    >
                        Latest {sportTitle} Stories
                    </Text>
                </View>

                <Text
                    style={[
                        styles.articleCount,
                        {
                            color: theme.muted,
                            backgroundColor: theme.cardAlt,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    {filteredPosts.length}
                </Text>
            </View>

            {!featuredPost ? (
                <View
                    style={[
                        styles.emptyCard,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Text style={styles.emptyEmoji}>
                        {sportEmoji}
                    </Text>

                    <Text
                        style={[
                            styles.emptyTitle,
                            { color: theme.text },
                        ]}
                    >
                        No {sportTitle} articles yet
                    </Text>

                    <Text
                        style={[
                            styles.emptyDescription,
                            { color: theme.muted },
                        ]}
                    >
                        New {sportTitle.toLowerCase()} stories will
                        appear here.
                    </Text>
                </View>
            ) : (
                <>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() =>
                            handleOpenPost(featuredPost)
                        }
                        style={[
                            styles.featuredCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        {featuredPost.cover_image_url ? (
                            <ImageBackground
                                source={{
                                    uri: featuredPost.cover_image_url,
                                }}
                                style={styles.featuredImage}
                                imageStyle={
                                    styles.featuredImageStyle
                                }
                                resizeMode="cover"
                            >
                                <View
                                    style={
                                        styles.featuredImageOverlay
                                    }
                                />

                                <View
                                    style={[
                                        styles.featuredBadge,
                                        getCategoryStyle(
                                            featuredPost.category
                                        ),
                                    ]}
                                >
                                    <Text
                                        style={
                                            styles.featuredBadgeText
                                        }
                                    >
                                        {featuredPost.category}
                                    </Text>
                                </View>
                            </ImageBackground>
                        ) : (
                            <View
                                style={[
                                    styles.featuredImageFallback,
                                    {
                                        backgroundColor:
                                            theme.cardAlt,
                                    },
                                ]}
                            >
                                <Text
                                    style={
                                        styles.featuredFallbackEmoji
                                    }
                                >
                                    {sportEmoji}
                                </Text>

                                <View
                                    style={[
                                        styles.featuredBadge,
                                        getCategoryStyle(
                                            featuredPost.category
                                        ),
                                    ]}
                                >
                                    <Text
                                        style={
                                            styles.featuredBadgeText
                                        }
                                    >
                                        {featuredPost.category}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.featuredContent}>
                            <Text
                                style={[
                                    styles.featuredTitle,
                                    { color: theme.text },
                                ]}
                                numberOfLines={2}
                            >
                                {featuredPost.title}
                            </Text>

                            {!!featuredPost.summary && (
                                <Text
                                    style={[
                                        styles.featuredSummary,
                                        {
                                            color: theme.muted,
                                        },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {featuredPost.summary}
                                </Text>
                            )}

                            <Text
                                style={[
                                    styles.featuredMeta,
                                    { color: theme.muted },
                                ]}
                            >
                                {formatTimeAgo(
                                    getPostDate(featuredPost)
                                )}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {!!remainingPosts.length && (
                        <Text
                            style={[
                                styles.moreStoriesTitle,
                                { color: ACCENT },
                            ]}
                        >
                            More {sportTitle}
                        </Text>
                    )}

                    {visiblePosts.map((post) => (
                        <TouchableOpacity
                            key={post._id}
                            activeOpacity={0.85}
                            onPress={() =>
                                handleOpenPost(post)
                            }
                            style={[
                                styles.articleRow,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            {post.cover_image_url ? (
                                <Image
                                    source={{
                                        uri: post.cover_image_url,
                                    }}
                                    style={styles.articleImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.articleImageFallback,
                                        {
                                            backgroundColor:
                                                theme.cardAlt,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={
                                            styles.articleFallbackEmoji
                                        }
                                    >
                                        {sportEmoji}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.articleContent}>
                                <Text
                                    style={[
                                        styles.articleTitle,
                                        { color: theme.text },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {post.title}
                                </Text>

                                {!!post.summary && (
                                    <Text
                                        style={[
                                            styles.articleSummary,
                                            {
                                                color: theme.muted,
                                            },
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {post.summary}
                                    </Text>
                                )}

                                <View style={styles.articleMetaRow}>
                                    <View
                                        style={[
                                            styles.categoryBadge,
                                            getCategoryStyle(
                                                post.category
                                            ),
                                        ]}
                                    >
                                        <Text
                                            style={
                                                styles.categoryBadgeText
                                            }
                                        >
                                            {post.category}
                                        </Text>
                                    </View>

                                    <Text
                                        style={[
                                            styles.articleTime,
                                            {
                                                color: theme.muted,
                                            },
                                        ]}
                                    >
                                        {formatTimeAgo(
                                            getPostDate(post)
                                        )}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {hasMore && (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[
                                styles.loadMoreButton,
                                {
                                    backgroundColor:
                                        theme.cardAlt,
                                    borderColor: theme.border,
                                },
                            ]}
                            onPress={() =>
                                setVisibleCount(
                                    (previous) =>
                                        previous + 5
                                )
                            }
                        >
                            <Text
                                style={
                                    styles.loadMoreButtonText
                                }
                            >
                                Load More {sportTitle}
                            </Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 12,
        paddingHorizontal: 2,
    },

    sectionEyebrow: {
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.15,
        marginBottom: 1,
    },

    sectionTitle: {
        fontSize: 23,
        lineHeight: 26,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
    },

    articleCount: {
        minWidth: 31,
        height: 27,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 8,
        textAlign: "center",
        textAlignVertical: "center",
        fontSize: 12,
        lineHeight: 25,
        fontFamily: "Rajdhani_700Bold",
        overflow: "hidden",
    },

    featuredCard: {
        overflow: "hidden",
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 17,
    },

    featuredImage: {
        height: 190,
        justifyContent: "flex-end",
    },

    featuredImageStyle: {
        borderTopLeftRadius: 17,
        borderTopRightRadius: 17,
    },

    featuredImageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.10)",
    },

    featuredImageFallback: {
        height: 190,
        alignItems: "center",
        justifyContent: "center",
    },

    featuredFallbackEmoji: {
        fontSize: 54,
        opacity: 0.85,
    },

    featuredBadge: {
        alignSelf: "flex-start",
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: 12,
        marginBottom: 11,
    },

    featuredBadgeText: {
        color: "#FFFFFF",
        fontSize: 11.5,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },

    featuredContent: {
        paddingHorizontal: 13,
        paddingTop: 11,
        paddingBottom: 12,
    },

    featuredTitle: {
        fontSize: 21,
        lineHeight: 24,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.2,
    },

    featuredSummary: {
        fontSize: 12.5,
        lineHeight: 17,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 5,
    },

    featuredMeta: {
        fontSize: 11.5,
        fontFamily: "Rajdhani_700Bold",
        marginTop: 8,
    },

    moreStoriesTitle: {
        fontSize: 20,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.2,
        marginBottom: 10,
        paddingHorizontal: 2,
    },

    articleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        minHeight: 104,
        borderRadius: 16,
        borderWidth: 1,
        padding: 9,
        marginBottom: 11,
    },

    articleImage: {
        width: 91,
        height: 91,
        borderRadius: 13,
        marginRight: 11,
        backgroundColor: "#111827",
    },

    articleImageFallback: {
        width: 91,
        height: 91,
        borderRadius: 13,
        marginRight: 11,
        alignItems: "center",
        justifyContent: "center",
    },

    articleFallbackEmoji: {
        fontSize: 31,
    },

    articleContent: {
        flex: 1,
        minHeight: 91,
        justifyContent: "space-between",
        paddingVertical: 1,
    },

    articleTitle: {
        fontSize: 17,
        lineHeight: 19,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.15,
    },

    articleSummary: {
        fontSize: 11.5,
        lineHeight: 15,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 3,
        marginBottom: 5,
    },

    articleMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 7,
        marginTop: 5,
    },

    categoryBadge: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },

    categoryBadgeText: {
        color: "#FFFFFF",
        fontSize: 9.5,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
    },

    articleTime: {
        fontSize: 10.5,
        fontFamily: "Rajdhani_700Bold",
    },

    loadMoreButton: {
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 3,
    },

    loadMoreButtonText: {
        color: ACCENT,
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.2,
    },

    stateCard: {
        minHeight: 135,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: "center",
        justifyContent: "center",
    },

    stateText: {
        fontSize: 13,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 9,
    },

    errorTitle: {
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
    },

    errorText: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
        marginTop: 5,
    },

    retryButton: {
        minWidth: 104,
        height: 37,
        borderRadius: 19,
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        marginTop: 13,
    },

    retryButtonText: {
        color: "#041014",
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
    },

    emptyCard: {
        minHeight: 150,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyEmoji: {
        fontSize: 35,
        marginBottom: 7,
    },

    emptyTitle: {
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
    },

    emptyDescription: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
        marginTop: 4,
    },
});