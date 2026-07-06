import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    Image,
    ActivityIndicator,
    RefreshControl,
    Platform,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Modal,
    Pressable,
    Alert,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../components/AppHeader";
import {
    initializeIAP,
    getBlogsSubscriptionProduct,
    buyBlogsSubscription,
    setupPurchaseListeners,
    cleanupIAP,
} from "../services/iap";
import { finishTransaction } from "react-native-iap";
import ConfettiCannon from "react-native-confetti-cannon";
import { useFonts, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";

type ContentTab = "trending" | "blog";
type TimeTheme = "day" | "night";

type Post = {
    _id: string;
    title: string;
    summary: string;
    cover_image_url: string;
    created_at: string;
    published_at?: string | null;
    category: string;
    content_type: string;
    slug: string;
};

type PostsApiResponse = {
    data: Post[];
    meta?: {
        page: number;
        limit: number;
        total: number;
    };
};

const TRENDING_CATEGORIES = [
    "All",
    "Tournaments",
    "Drama",
    "Pros",
    "Online",
    "Rising Stars",
    "Breaking News",
];

const BLOG_CATEGORIES = [
    "All",
    "Culture",
    "Hot Takes",
    "Future of Chess",
    "Entertainment",
    "Community",
    "Education",
];

const INITIAL_VISIBLE_STORIES = 6;
const LOAD_MORE_COUNT = 6;

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getScreenTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            mode,
            bg: "#F8FAFC",
            card: "#FFFFFF",
            cardSoft: "#ECFEFF",
            elevated: "#FFFFFF",
            border: "rgba(7,17,31,0.10)",
            borderStrong: "rgba(6,182,212,0.28)",
            text: "#07111F",
            textSoft: "#334155",
            muted: "#64748B",
            cyan: "#06B6D4",
            cyanSoft: "rgba(6,182,212,0.12)",
            yellow: "#FACC15",
            yellowSoft: "rgba(250,204,21,0.16)",
            tabTrack: "#E2E8F0",
            pill: "#FFFFFF",
            pillBorder: "rgba(7,17,31,0.12)",
            shadow: "#06B6D4",
            modalBackdrop: "rgba(2,6,23,0.58)",
            refreshBg: "#FFFFFF",
        };
    }

    return {
        mode,
        bg: "#020617",
        card: "#090D14",
        cardSoft: "#07111F",
        elevated: "#0F172A",
        border: "rgba(255,255,255,0.10)",
        borderStrong: "rgba(34,211,238,0.30)",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        cyan: "#22D3EE",
        cyanSoft: "rgba(34,211,238,0.13)",
        yellow: "#FACC15",
        yellowSoft: "rgba(250,204,21,0.12)",
        tabTrack: "#101417",
        pill: "#111827",
        pillBorder: "rgba(255,255,255,0.10)",
        shadow: "#22D3EE",
        modalBackdrop: "rgba(0,0,0,0.82)",
        refreshBg: "#111827",
    };
};

function formatTimeAgo(dateString: string) {
    const now = new Date();
    const postDate = new Date(dateString);

    const diffMs = now.getTime() - postDate.getTime();
    const minutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const days = Math.floor(diffMs / 1000 / 60 / 60 / 24);

    if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days <= 6) return `${days}d ago`;

    return postDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function getCategoryBadgeStyle(category: string) {
    switch (category) {
        case "Drama":
            return { backgroundColor: "#6F102B", borderColor: "#A61B44" };
        case "Tournaments":
            return { backgroundColor: "#7A6500", borderColor: "#CFAF1A" };
        case "Online":
            return { backgroundColor: "#0F5B3A", borderColor: "#23C16B" };
        case "Pros":
            return { backgroundColor: "#183A63", borderColor: "#4D9BFF" };
        case "Breaking News":
            return { backgroundColor: "#450A0A", borderColor: "#DC2626" };
        case "Rising Stars":
            return { backgroundColor: "#5D2475", borderColor: "#B86EF2" };
        case "Culture":
            return { backgroundColor: "#4A1F5E", borderColor: "#9B5DE5" };
        case "Entertainment":
            return { backgroundColor: "#6A1B2E", borderColor: "#FF5C8A" };
        case "Future of Chess":
            return { backgroundColor: "#0E3C4D", borderColor: "#39C0ED" };
        case "Community":
            return { backgroundColor: "#165B36", borderColor: "#35D07F" };
        case "Hot Takes":
            return { backgroundColor: "#000000", borderColor: "#ff0000" };
        case "Education":
            return { backgroundColor: "#6A5200", borderColor: "#F4D03F" };
        default:
            return { backgroundColor: "#2A2A2A", borderColor: "#555555" };
    }
}

export default function TrendingScreen({ navigation }: any) {
    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const [themeMode, setThemeMode] = useState<TimeTheme>(getCurrentThemeMode());
    const theme = getScreenTheme(themeMode);

    const [activeTab, setActiveTab] = useState<ContentTab>("trending");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [visibleStoriesCount, setVisibleStoriesCount] = useState(INITIAL_VISIBLE_STORIES);
    const [loadingMore, setLoadingMore] = useState(false);

    const [showConfetti, setShowConfetti] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const feedFadeAnim = useRef(new Animated.Value(1)).current;

    const activeColor = activeTab === "trending" ? theme.yellow : theme.cyan;
    const categories = activeTab === "trending" ? TRENDING_CATEGORIES : BLOG_CATEGORIES;

    useEffect(() => {
        const interval = setInterval(() => {
            setThemeMode(getCurrentThemeMode());
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

    const animateFeed = useCallback(() => {
        feedFadeAnim.setValue(0);

        Animated.timing(feedFadeAnim, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
        }).start();
    }, [feedFadeAnim]);

    const fetchEntitlements = async () => {
        try {
            const token = await getToken();
            if (!token || !API_BASE_URL) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data?.success) {
                setIsSubscribed(!!data?.entitlements?.isSubscribed);
            }
        } catch (error) {
            console.log("Blog entitlement fetch error:", error);
        }
    };

    const fetchPosts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts`);
            const json: PostsApiResponse = await response.json();

            const allPosts = (json.data || [])
                .filter(
                    (post) =>
                        post.content_type === "trending" || post.content_type === "blog"
                )
                .sort((a, b) => {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return dateB - dateA;
                });

            setPosts(allPosts);
        } catch (error) {
            console.log("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBlogSubscription = async () => {
        try {
            await initializeIAP();
            const product = await getBlogsSubscriptionProduct();
            setSubscriptionProduct(product);
        } catch (error) {
            console.log("Blog subscription load error:", error);
        }
    };

    const verifyBlogSubscriptionOnBackend = async (purchase: any) => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                throw new Error("Missing token or API base URL");
            }

            const response = await fetch(`${API_BASE_URL}/api/subscriptions/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    platform: Platform.OS === "ios" ? "ios" : "android",
                    productId:
                        purchase?.productId ||
                        purchase?.productIdIOS ||
                        "jms_599_1y",
                    transactionId:
                        purchase?.transactionId ||
                        purchase?.transactionIdIOS ||
                        purchase?.id ||
                        null,
                    purchaseToken:
                        purchase?.purchaseToken ||
                        purchase?.purchaseTokenAndroid ||
                        null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to verify subscription");
            }

            await finishTransaction({
                purchase,
                isConsumable: false,
            });

            setIsSubscribed(!!data.isSubscribed);
            setPaywallVisible(false);
            setShowConfetti(true);

            await fetchEntitlements();

            Alert.alert("Subscribed 🎉", "You now have access to ScoolFools Blogs.");
        } catch (error) {
            console.log("Verify blog subscription error:", error);

            Alert.alert(
                "Purchase Complete",
                "Purchase worked, but verifying the subscription with your account failed."
            );
        } finally {
            setLoadingSubscription(false);
        }
    };

    const handleSubscribePress = async () => {
        try {
            setLoadingSubscription(true);

            await initializeIAP();
            await buyBlogsSubscription();
        } catch (error) {
            setLoadingSubscription(false);
            console.log("Blog subscription request error:", error);

            Alert.alert(
                "Subscription Failed",
                "Something went wrong while starting the subscription."
            );
        }
    };

    useEffect(() => {
        fetchPosts();
        fetchEntitlements();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async (purchase: any) => {
                await verifyBlogSubscriptionOnBackend(purchase);
            },
            onPurchaseError: (error: any) => {
                setLoadingSubscription(false);
                console.log("Blog subscription listener error:", error);
            },
        });

        return () => {
            cleanupIAP();
        };
    }, [fetchPosts]);

    useEffect(() => {
        setVisibleStoriesCount(INITIAL_VISIBLE_STORIES);
        setSelectedCategory("All");
        animateFeed();
    }, [activeTab, animateFeed]);

    useEffect(() => {
        animateFeed();
    }, [selectedCategory, animateFeed]);

    const handleTabPress = (tab: ContentTab) => {
        setActiveTab(tab);

        Animated.spring(slideAnim, {
            toValue: tab === "trending" ? 0 : 1,
            useNativeDriver: false,
            tension: 75,
            friction: 9,
        }).start();
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchPosts();
            await fetchEntitlements();
            setVisibleStoriesCount(INITIAL_VISIBLE_STORIES);
            await new Promise((resolve) => setTimeout(resolve, 700));
        } finally {
            setRefreshing(false);
        }
    }, [fetchPosts]);

    const filteredPosts = useMemo(() => {
        const currentPosts = posts.filter((post) => post.content_type === activeTab);

        if (selectedCategory === "All") return currentPosts;

        return currentPosts.filter((post) => post.category === selectedCategory);
    }, [posts, activeTab, selectedCategory]);

    const featuredPost = filteredPosts[0];
    const topStories = filteredPosts.slice(1);
    const visibleTopStories = topStories.slice(0, visibleStoriesCount);
    const hasMoreStories = visibleStoriesCount < topStories.length;

    const handleOpenPost = (post: Post) => {
        if (post.content_type === "blog" && !isSubscribed) {
            setPaywallVisible(true);
            loadBlogSubscription();
            return;
        }

        navigation.navigate("ArticleScreen", { slug: post.slug });
    };

    const loadMoreStories = useCallback(async () => {
        if (loadingMore || !hasMoreStories) return;

        setLoadingMore(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        setVisibleStoriesCount((prev) => prev + LOAD_MORE_COUNT);
        setLoadingMore(false);
    }, [loadingMore, hasMoreStories]);

    const handleScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const paddingToBottom = 220;

            const isNearBottom =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom;

            if (isNearBottom && hasMoreStories && !loadingMore) {
                loadMoreStories();
            }
        },
        [hasMoreStories, loadingMore, loadMoreStories]
    );

    const sliderTranslate = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const feedTranslateY = feedFadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
    });

    if (loading || !fontsLoaded) {
        return (
            <SafeAreaView
                edges={["left", "right"]}
                style={[styles.safeArea, { backgroundColor: theme.bg }]}
            >
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={activeColor} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={["left", "right"]}
            style={[styles.safeArea, { backgroundColor: theme.bg }]}
        >
            <AppHeader />

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color={activeColor} />
                </View>
            )}

            <ScrollView
                style={[styles.container, { backgroundColor: theme.bg }]}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={activeColor}
                        colors={[activeColor]}
                        progressBackgroundColor={theme.refreshBg}
                    />
                }
            >
                <View
                    style={[
                        styles.mainTabsOuter,
                        {
                            backgroundColor: theme.tabTrack,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.mainTabSlider,
                            {
                                backgroundColor:
                                    activeTab === "trending"
                                        ? theme.yellow
                                        : theme.cyan,
                                borderColor:
                                    activeTab === "trending"
                                        ? "rgba(250,204,21,0.60)"
                                        : theme.borderStrong,
                                shadowColor: activeColor,
                                transform: [{ translateX: sliderTranslate }],
                            },
                        ]}
                    />

                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.mainTabButton}
                        onPress={() => handleTabPress("trending")}
                    >
                        <Text
                            style={[
                                styles.mainTabText,
                                { color: theme.textSoft },
                                activeTab === "trending" && {
                                    color: "#07111F",
                                    textShadowColor: "transparent",
                                },
                            ]}
                        >
                            Trending
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.mainTabButton}
                        onPress={() => handleTabPress("blog")}
                    >
                        <Text
                            style={[
                                styles.mainTabText,
                                { color: theme.textSoft },
                                activeTab === "blog" && {
                                    color: "white",
                                    textShadowColor: theme.cyan,
                                },
                            ]}
                        >
                            Blogs
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === "blog" && !isSubscribed && (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[
                            styles.supportBanner,
                            {
                                backgroundColor: theme.cardSoft,
                                borderColor: theme.cyan,
                                shadowColor: theme.cyan,
                            },
                        ]}
                        onPress={() => {
                            setPaywallVisible(true);
                            loadBlogSubscription();
                        }}
                    >
                        <Text style={[styles.supportBannerTitle, { color: theme.cyan }]}>
                            Support Scool Fools Blogs ♟️
                        </Text>
                        <Text style={[styles.supportBannerText, { color: theme.textSoft }]}>
                            Start with 1 month free and help shape the future of chess media for only $5.99/year ♟️
                        </Text>
                    </TouchableOpacity>
                )}

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                >
                    {categories.map((category) => {
                        const active = selectedCategory === category;

                        return (
                            <TouchableOpacity
                                key={category}
                                onPress={() => setSelectedCategory(category)}
                                style={[
                                    styles.tabPill,
                                    {
                                        backgroundColor: theme.pill,
                                        borderColor: theme.pillBorder,
                                    },
                                    active && {
                                        backgroundColor: activeColor,
                                        borderColor: activeColor,
                                    },
                                ]}
                                activeOpacity={0.85}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        { color: theme.textSoft },
                                        active && { color: "#07111F" },
                                    ]}
                                >
                                    {category}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Animated.View
                    style={{
                        opacity: feedFadeAnim,
                        transform: [{ translateY: feedTranslateY }],
                    }}
                >
                    {featuredPost ? (
                        <>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => handleOpenPost(featuredPost)}
                                style={styles.featuredWrapper}
                            >
                                <View
                                    style={[
                                        styles.featuredCard,
                                        {
                                            backgroundColor: theme.card,
                                            borderColor:
                                                activeTab === "trending"
                                                    ? "rgba(250,204,21,0.34)"
                                                    : theme.borderStrong,
                                            shadowColor: activeColor,
                                        },
                                    ]}
                                >
                                    <ImageBackground
                                        source={{ uri: featuredPost.cover_image_url }}
                                        style={styles.featuredImageArea}
                                        imageStyle={styles.featuredImage}
                                        resizeMode="cover"
                                    >
                                        {activeTab === "blog" && !isSubscribed && (
                                            <View
                                                style={[
                                                    styles.lockOverlay,
                                                    {
                                                        borderColor: theme.cyan,
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.lockText}>🔒 Supporter Blog</Text>
                                            </View>
                                        )}

                                        <View style={styles.featuredBadgeOverlay}>
                                            <View
                                                style={[
                                                    styles.categoryBadge,
                                                    getCategoryBadgeStyle(featuredPost.category),
                                                ]}
                                            >
                                                <Text style={styles.categoryBadgeText}>
                                                    {featuredPost.category}
                                                </Text>
                                            </View>
                                        </View>
                                    </ImageBackground>

                                    <View
                                        style={[
                                            styles.featuredInfoBox,
                                            { backgroundColor: theme.card },
                                        ]}
                                    >
                                        <Text
                                            style={[styles.featuredTitle, { color: theme.text }]}
                                            numberOfLines={2}
                                        >
                                            {featuredPost.title}
                                        </Text>

                                        <Text
                                            style={[styles.featuredSummary, { color: theme.textSoft }]}
                                            numberOfLines={1}
                                        >
                                            {featuredPost.summary}
                                        </Text>

                                        <Text style={[styles.featuredMeta, { color: theme.muted }]}>
                                            {formatTimeAgo(featuredPost.created_at)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {topStories.length > 0 && (
                                <Text style={[styles.sectionTitle, { color: activeColor }]}>
                                    {activeTab === "trending" ? "Recent Stories" : "Latest Blogs"}
                                </Text>
                            )}

                            {visibleTopStories.map((post) => (
                                <TouchableOpacity
                                    key={post._id}
                                    style={[
                                        styles.storyRow,
                                        {
                                            backgroundColor: theme.card,
                                            borderColor: theme.border,
                                        },
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => handleOpenPost(post)}
                                >
                                    <View>
                                        <Image
                                            source={{ uri: post.cover_image_url }}
                                            style={styles.storyImage}
                                        />

                                        {activeTab === "blog" && !isSubscribed && (
                                            <View
                                                style={[
                                                    styles.storyLockBadge,
                                                    {
                                                        borderColor: theme.cyan,
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.storyLockBadgeText}>🔒</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.storyContent}>
                                        <Text
                                            style={[styles.storyTitle, { color: theme.text }]}
                                            numberOfLines={2}
                                        >
                                            {post.title}
                                        </Text>

                                        <Text
                                            style={[styles.storySummary, { color: theme.textSoft }]}
                                            numberOfLines={2}
                                        >
                                            {post.summary}
                                        </Text>

                                        <View style={styles.storyMetaRow}>
                                            <View
                                                style={[
                                                    styles.categoryBadgeSmall,
                                                    getCategoryBadgeStyle(post.category),
                                                ]}
                                            >
                                                <Text style={styles.categoryBadgeSmallText}>
                                                    {post.category}
                                                </Text>
                                            </View>

                                            <Text style={[styles.storyMetaText, { color: theme.muted }]}>
                                                {formatTimeAgo(post.created_at)}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {loadingMore && (
                                <View style={styles.loadMoreWrap}>
                                    <ActivityIndicator size="small" color={activeColor} />
                                    <Text style={[styles.loadMoreText, { color: activeColor }]}>
                                        Loading more {activeTab === "trending" ? "stories" : "blogs"}...
                                    </Text>
                                </View>
                            )}

                            {!loadingMore && hasMoreStories && (
                                <View style={styles.loadMoreHintWrap}>
                                    <Text style={[styles.loadMoreHintText, { color: theme.muted }]}>
                                        Scroll for more {activeTab === "trending" ? "stories" : "blogs"}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyStateText, { color: theme.muted }]}>
                                No {activeTab === "trending" ? "trending posts" : "blog posts"} in this category yet.
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            <Modal
                visible={paywallVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPaywallVisible(false)}
            >
                <View style={styles.paywallOverlay}>
                    <Pressable
                        style={[
                            styles.paywallBackdrop,
                            { backgroundColor: theme.modalBackdrop },
                        ]}
                        onPress={() => setPaywallVisible(false)}
                    />

                    <View
                        style={[
                            styles.paywallCard,
                            {
                                backgroundColor: theme.elevated,
                                borderColor: theme.cyan,
                                shadowColor: theme.cyan,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.closeButton,
                                {
                                    backgroundColor:
                                        theme.mode === "day" ? "#E2E8F0" : "#111827",
                                },
                            ]}
                            onPress={() => setPaywallVisible(false)}
                        >
                            <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
                        </TouchableOpacity>

                        <Text style={styles.paywallEmoji}>♟️</Text>

                        <Text style={[styles.paywallTitle, { color: theme.text }]}>
                            Support ScoolFools Blogs
                        </Text>

                        <Text style={[styles.paywallSubtitle, { color: theme.textSoft }]}>
                            Help support independent chess journalism and the future of modern chess media.
                        </Text>

                        <View
                            style={[
                                styles.priceBox,
                                {
                                    backgroundColor: theme.cardSoft,
                                    borderColor: theme.borderStrong,
                                },
                            ]}
                        >
                            <Text style={[styles.freeTrialText, { color: theme.cyan }]}>
                                1 Month Free
                            </Text>
                            <Text style={[styles.priceText, { color: theme.text }]}>
                                Then {subscriptionProduct?.localizedPrice || "$5.99"}/year
                            </Text>
                        </View>

                        <View style={styles.benefitsBox}>
                            <Text style={[styles.benefitText, { color: theme.text }]}>
                                ✓ Exclusive blogs and stories
                            </Text>
                            <Text style={[styles.benefitText, { color: theme.text }]}>
                                ✓ Support independent chess coverage
                            </Text>
                            <Text style={[styles.benefitText, { color: theme.text }]}>
                                ✓ Help grow modern chess media
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.subscribeButton, { backgroundColor: theme.cyan }]}
                            activeOpacity={0.9}
                            onPress={handleSubscribePress}
                            disabled={loadingSubscription}
                        >
                            {loadingSubscription ? (
                                <ActivityIndicator color="#07111F" />
                            ) : (
                                <Text style={styles.subscribeButtonText}>
                                    Start Free Month
                                </Text>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.paywallFinePrint, { color: theme.muted }]}>
                            Cancel anytime. Subscription renews yearly after the free trial.
                        </Text>
                    </View>
                </View>
            </Modal>

            {showConfetti && (
                <ConfettiCannon
                    count={140}
                    origin={{ x: -10, y: 0 }}
                    fadeOut
                    explosionSpeed={350}
                    fallSpeed={2600}
                    onAnimationEnd={() => setShowConfetti(false)}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    refreshIndicator: {
        alignItems: "center",
        paddingVertical: 6,
    },

    mainTabsOuter: {
        height: 50,
        borderRadius: 999,
        borderWidth: 1,
        padding: 4,
        marginTop: 14,
        marginBottom: 14,
        flexDirection: "row",
        position: "relative",
        overflow: "hidden",
    },
    mainTabSlider: {
        position: "absolute",
        top: 4,
        left: 4,
        width: "50%",
        height: 42,
        borderRadius: 999,
        borderWidth: 1,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    mainTabButton: {
        flex: 1,
        height: 42,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    mainTabText: {
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.55,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },

    supportBanner: {
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 13,
        paddingHorizontal: 14,
        marginBottom: 14,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    supportBannerTitle: {
        fontSize: 19,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
        marginBottom: 4,
    },
    supportBannerText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "700",
    },

    tabsContainer: {
        paddingBottom: 14,
        paddingRight: 10,
    },
    tabPill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1.2,
        marginRight: 8,
    },
    tabText: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },

    featuredWrapper: {
        marginBottom: 20,
    },
    featuredCard: {
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    featuredImage: {
        borderRadius: 0,
    },
    featuredImageArea: {
        height: 230,
        backgroundColor: "#1A1A1A",
        justifyContent: "flex-end",
    },
    featuredBadgeOverlay: {
        position: "absolute",
        left: 14,
        bottom: 12,
    },
    featuredInfoBox: {
        paddingHorizontal: 14,
        paddingTop: 11,
        paddingBottom: 12,
    },
    featuredTitle: {
        fontSize: 22,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        lineHeight: 25,
        marginTop: 2,
    },
    featuredSummary: {
        fontSize: 13,
        lineHeight: 17,
        marginTop: 6,
    },
    featuredMeta: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
        marginTop: 8,
    },

    categoryBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1.2,
    },
    categoryBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },

    sectionTitle: {
        fontSize: 25,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
        marginBottom: 14,
    },

    storyRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
        borderRadius: 18,
        padding: 10,
        borderWidth: 1,
    },
    storyImage: {
        width: 96,
        height: 96,
        borderRadius: 16,
        marginRight: 12,
        backgroundColor: "#1F1F1F",
    },
    storyContent: {
        flex: 1,
        minHeight: 96,
        justifyContent: "space-between",
        paddingVertical: 1,
    },
    storyTitle: {
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
        lineHeight: 21,
        marginBottom: 5,
    },
    storySummary: {
        fontSize: 13,
        lineHeight: 17,
        marginBottom: 8,
    },
    storyMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    storyMetaText: {
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
    },
    categoryBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    categoryBadgeSmallText: {
        color: "#FFFFFF",
        fontSize: 10.5,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },

    lockOverlay: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "rgba(0,0,0,0.72)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
    },
    lockText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },
    storyLockBadge: {
        position: "absolute",
        top: 6,
        right: 18,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    storyLockBadgeText: {
        fontSize: 12,
    },

    loadMoreWrap: {
        paddingVertical: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    loadMoreText: {
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
        marginTop: 8,
    },
    loadMoreHintWrap: {
        paddingTop: 6,
        paddingBottom: 10,
        alignItems: "center",
    },
    loadMoreHintText: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyStateText: {
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },

    paywallOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 26,
    },
    paywallBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    paywallCard: {
        width: "100%",
        borderRadius: 28,
        borderWidth: 1.5,
        paddingHorizontal: 22,
        paddingTop: 26,
        paddingBottom: 20,
        alignItems: "center",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 14,
    },
    closeButton: {
        position: "absolute",
        top: 12,
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    closeButtonText: {
        fontSize: 26,
        lineHeight: 28,
        fontWeight: "700",
    },
    paywallEmoji: {
        fontSize: 42,
        marginBottom: 10,
    },
    paywallTitle: {
        fontSize: 25,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        textAlign: "center",
        marginBottom: 8,
    },
    paywallSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
    },
    priceBox: {
        width: "100%",
        borderRadius: 18,
        borderWidth: 1,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 16,
    },
    freeTrialText: {
        fontSize: 30,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },
    priceText: {
        fontSize: 13,
        fontWeight: "800",
        marginTop: 4,
        opacity: 0.9,
    },
    benefitsBox: {
        width: "100%",
        marginBottom: 18,
    },
    benefitText: {
        fontSize: 13.5,
        fontWeight: "800",
        marginBottom: 8,
    },
    subscribeButton: {
        width: "100%",
        height: 50,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    subscribeButtonText: {
        color: "#07111F",
        fontSize: 16,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },
    paywallFinePrint: {
        fontSize: 11,
        lineHeight: 16,
        textAlign: "center",
        fontWeight: "600",
    },
});