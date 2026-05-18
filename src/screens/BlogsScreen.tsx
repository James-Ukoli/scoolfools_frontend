import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const BLOG_CATEGORIES = [
    "All",
    "Culture",
    "Entertainment",
    "Future of Chess",
    "Community",
    "Education",
];

const INITIAL_VISIBLE_STORIES = 6;
const LOAD_MORE_COUNT = 6;

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

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
        case "Culture":
            return { backgroundColor: "#4A1F5E", borderColor: "#9B5DE5" };
        case "Entertainment":
            return { backgroundColor: "#6A1B2E", borderColor: "#FF5C8A" };
        case "Future of Chess":
            return { backgroundColor: "#0E3C4D", borderColor: "#39C0ED" };
        case "Community":
            return { backgroundColor: "#165B36", borderColor: "#35D07F" };
        case "Education":
            return { backgroundColor: "#6A5200", borderColor: "#F4D03F" };
        default:
            return { backgroundColor: "#2A2A2A", borderColor: "#555555" };
    }
}

export default function BlogsScreen({ navigation }: any) {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [visibleStoriesCount, setVisibleStoriesCount] = useState(INITIAL_VISIBLE_STORIES);
    const [loadingMore, setLoadingMore] = useState(false);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

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

    const fetchBlogPosts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts`);
            const json: PostsApiResponse = await response.json();

            const blogPosts = (json.data || [])
                .filter((post) => post.content_type === "blog")
                .sort((a, b) => {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return dateB - dateA;
                });

            setPosts(blogPosts);
        } catch (error) {
            console.log("Error fetching blog posts:", error);
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

    const activateBlogSubscriptionOnBackend = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                throw new Error("Missing token or API base URL");
            }

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me/activate-blog-subscription`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to activate subscription");
            }

            setIsSubscribed(true);
            setPaywallVisible(false);

            Alert.alert("Subscribed 🎉", "You now have access to Just Move blogs.");
        } catch (error) {
            console.log("Activate blog subscription error:", error);

            Alert.alert(
                "Purchase Complete",
                "Purchase worked, but saving the subscription to your account failed."
            );
        } finally {
            setLoadingSubscription(false);
        }
    };

    const handleSubscribePress = async () => {
        try {
            setLoadingSubscription(true);
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
        fetchBlogPosts();
        fetchEntitlements();
        loadBlogSubscription();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async () => {
                await activateBlogSubscriptionOnBackend();
            },
            onPurchaseError: (error: any) => {
                setLoadingSubscription(false);
                console.log("Blog subscription listener error:", error);
            },
        });

        return () => {
            cleanupIAP();
        };
    }, [fetchBlogPosts]);

    useEffect(() => {
        setVisibleStoriesCount(INITIAL_VISIBLE_STORIES);
    }, [selectedCategory]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchBlogPosts();
            await fetchEntitlements();
            setVisibleStoriesCount(INITIAL_VISIBLE_STORIES);
            await new Promise((resolve) => setTimeout(resolve, 700));
        } finally {
            setRefreshing(false);
        }
    }, [fetchBlogPosts]);

    const filteredPosts = useMemo(() => {
        if (selectedCategory === "All") return posts;
        return posts.filter((post) => post.category === selectedCategory);
    }, [posts, selectedCategory]);

    const featuredPost = filteredPosts[0];
    const topStories = filteredPosts.slice(1);
    const visibleTopStories = topStories.slice(0, visibleStoriesCount);
    const hasMoreStories = visibleStoriesCount < topStories.length;

    const handleOpenPost = (post: Post) => {
        if (!isSubscribed) {
            setPaywallVisible(true);
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

    if (loading) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#39C0ED" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <AppHeader />

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color="#39C0ED" />
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#39C0ED"
                        colors={["#39C0ED"]}
                        progressBackgroundColor="#111111"
                    />
                }
            >
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Blogs</Text>
                </View>

                {!isSubscribed && (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.supportBanner}
                        onPress={() => setPaywallVisible(true)}
                    >
                        <Text style={styles.supportBannerTitle}>
                            Support Just Move Blogs ♟️
                        </Text>
                        <Text style={styles.supportBannerText}>
                            Start with 1 month free and help shape the future of chess media for only $5.99/year ♟️
                        </Text>
                    </TouchableOpacity>
                )}

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                >
                    {BLOG_CATEGORIES.map((category) => {
                        const active = selectedCategory === category;

                        return (
                            <TouchableOpacity
                                key={category}
                                onPress={() => setSelectedCategory(category)}
                                style={[styles.tabPill, active && styles.activeTabPill]}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.tabText, active && styles.activeTabText]}>
                                    {category}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {featuredPost ? (
                    <>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleOpenPost(featuredPost)}
                            style={styles.featuredWrapper}
                        >
                            <View style={styles.featuredCard}>
                                <ImageBackground
                                    source={{ uri: featuredPost.cover_image_url }}
                                    style={styles.featuredImageArea}
                                    imageStyle={styles.featuredImage}
                                    resizeMode="cover"
                                >
                                    {!isSubscribed && (
                                        <View style={styles.lockOverlay}>
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

                                <View style={styles.featuredInfoBox}>
                                    <Text style={styles.featuredTitle} numberOfLines={2}>
                                        {featuredPost.title}
                                    </Text>

                                    <Text style={styles.featuredSummary} numberOfLines={1}>
                                        {featuredPost.summary}
                                    </Text>

                                    <Text style={styles.featuredMeta}>
                                        {formatTimeAgo(featuredPost.created_at)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {topStories.length > 0 && (
                            <Text style={styles.sectionTitle}>Latest Blogs</Text>
                        )}

                        {visibleTopStories.map((post) => (
                            <TouchableOpacity
                                key={post._id}
                                style={styles.storyRow}
                                activeOpacity={0.85}
                                onPress={() => handleOpenPost(post)}
                            >
                                <View>
                                    <Image
                                        source={{ uri: post.cover_image_url }}
                                        style={styles.storyImage}
                                    />
                                    {!isSubscribed && (
                                        <View style={styles.storyLockBadge}>
                                            <Text style={styles.storyLockBadgeText}>🔒</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.storyContent}>
                                    <Text style={styles.storyTitle} numberOfLines={2}>
                                        {post.title}
                                    </Text>

                                    <Text style={styles.storySummary} numberOfLines={2}>
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

                                        <Text style={styles.storyMetaText}>
                                            {formatTimeAgo(post.created_at)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {loadingMore && (
                            <View style={styles.loadMoreWrap}>
                                <ActivityIndicator size="small" color="#39C0ED" />
                                <Text style={styles.loadMoreText}>Loading more blogs...</Text>
                            </View>
                        )}

                        {!loadingMore && hasMoreStories && (
                            <View style={styles.loadMoreHintWrap}>
                                <Text style={styles.loadMoreHintText}>
                                    Scroll for more blogs
                                </Text>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            No blog posts in this category yet.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={paywallVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPaywallVisible(false)}
            >
                <View style={styles.paywallOverlay}>
                    <Pressable
                        style={styles.paywallBackdrop}
                        onPress={() => setPaywallVisible(false)}
                    />

                    <View style={styles.paywallCard}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setPaywallVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>

                        <Text style={styles.paywallEmoji}>♟️</Text>

                        <Text style={styles.paywallTitle}>
                            Support Just Move Blogs
                        </Text>

                        <Text style={styles.paywallSubtitle}>
                            Help support independent chess journalism and the future of
                            modern chess media.
                        </Text>

                        <View style={styles.priceBox}>
                            <Text style={styles.freeTrialText}>1 Month Free</Text>
                            <Text style={styles.priceText}>
                                Then {subscriptionProduct?.localizedPrice || "$5.99"}/year
                            </Text>
                        </View>

                        <View style={styles.benefitsBox}>
                            <Text style={styles.benefitText}>✓ Exclusive blogs and stories</Text>
                            <Text style={styles.benefitText}>✓ Support independent chess coverage</Text>
                            <Text style={styles.benefitText}>✓ Help grow modern chess media</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.subscribeButton}
                            activeOpacity={0.9}
                            onPress={handleSubscribePress}
                            disabled={loadingSubscription}
                        >
                            {loadingSubscription ? (
                                <ActivityIndicator color="#050816" />
                            ) : (
                                <Text style={styles.subscribeButtonText}>
                                    Start Free Month
                                </Text>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.paywallFinePrint}>
                            Cancel anytime. Subscription renews yearly after the free trial.
                        </Text>
                    </View>
                </View>
            </Modal>
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
    headerRow: {
        marginTop: 6,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        color: "#39C0ED",
        fontSize: 28,
        fontWeight: "900",
        textAlign: "center",
        letterSpacing: 2,
        textTransform: "uppercase",
        paddingHorizontal: 16,
        textShadowColor: "#39C0ED",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
    },
    supportBanner: {
        backgroundColor: "#101827",
        borderColor: "#39C0ED",
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginBottom: 14,
    },
    supportBannerTitle: {
        color: "#39C0ED",
        fontSize: 16,
        fontWeight: "900",
        marginBottom: 4,
    },
    supportBannerText: {
        color: "#D6D6D6",
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
        backgroundColor: "#171717",
        borderWidth: 1.2,
        borderColor: "#2B2B2B",
        marginRight: 8,
    },
    activeTabPill: {
        backgroundColor: "#39C0ED",
        borderColor: "#7FDBFF",
    },
    tabText: {
        color: "#EAEAEA",
        fontSize: 12,
        fontWeight: "800",
    },
    activeTabText: {
        color: "#111111",
    },
    featuredWrapper: {
        marginBottom: 20,
    },
    featuredCard: {
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#111111",
        borderWidth: 0.8,
        borderColor: "rgba(57,192,237,0.28)",
        shadowColor: "#39C0ED",
        shadowOpacity: 0.14,
        shadowRadius: 14,
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
    lockOverlay: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "rgba(0,0,0,0.72)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#39C0ED",
    },
    lockText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "900",
    },
    featuredBadgeOverlay: {
        position: "absolute",
        left: 14,
        bottom: 12,
    },
    featuredInfoBox: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: "#111111",
    },
    featuredTitle: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
        lineHeight: 21,
        marginTop: 2,
    },
    featuredSummary: {
        color: "#D6D6D6",
        fontSize: 13,
        lineHeight: 17,
        marginTop: 6,
    },
    featuredMeta: {
        color: "#BFC7D4",
        fontSize: 12,
        fontWeight: "700",
        marginTop: 8,
    },
    sectionTitle: {
        color: "#39C0ED",
        fontSize: 24,
        fontWeight: "900",
        marginBottom: 14,
    },
    storyRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    storyImage: {
        width: 96,
        height: 96,
        borderRadius: 16,
        marginRight: 12,
        backgroundColor: "#1F1F1F",
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
        borderColor: "#39C0ED",
    },
    storyLockBadgeText: {
        fontSize: 12,
    },
    storyContent: {
        flex: 1,
        minHeight: 96,
        justifyContent: "space-between",
        paddingVertical: 1,
    },
    storyTitle: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
        lineHeight: 21,
        marginBottom: 5,
    },
    storySummary: {
        color: "#C8C8C8",
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
        color: "#CFCFCF",
        fontSize: 12,
        fontWeight: "700",
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
        fontSize: 11,
        fontWeight: "900",
    },
    categoryBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    categoryBadgeSmallText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "900",
    },
    loadMoreWrap: {
        paddingVertical: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    loadMoreText: {
        color: "#AFC7D6",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 8,
    },
    loadMoreHintWrap: {
        paddingTop: 6,
        paddingBottom: 10,
        alignItems: "center",
    },
    loadMoreHintText: {
        color: "#7E96A5",
        fontSize: 12,
        fontWeight: "700",
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyStateText: {
        color: "#BDBDBD",
        fontSize: 16,
        fontWeight: "700",
    },
    paywallOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 26,
    },
    paywallBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.82)",
    },
    paywallCard: {
        width: "100%",
        backgroundColor: "#070A16",
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: "#39C0ED",
        paddingHorizontal: 22,
        paddingTop: 26,
        paddingBottom: 20,
        alignItems: "center",
        shadowColor: "#39C0ED",
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
        backgroundColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
    },
    closeButtonText: {
        color: "#FFFFFF",
        fontSize: 26,
        lineHeight: 28,
        fontWeight: "700",
    },
    paywallEmoji: {
        fontSize: 42,
        marginBottom: 10,
    },
    paywallTitle: {
        color: "#FFFFFF",
        fontSize: 23,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 8,
    },
    paywallSubtitle: {
        color: "#C9D4E5",
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
    },
    priceBox: {
        width: "100%",
        backgroundColor: "#101827",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1E4660",
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 16,
    },
    freeTrialText: {
        color: "#39C0ED",
        fontSize: 26,
        fontWeight: "900",
    },
    priceText: {
        color: "#FFFFFF",
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
        color: "#FFFFFF",
        fontSize: 13.5,
        fontWeight: "800",
        marginBottom: 8,
    },
    subscribeButton: {
        width: "100%",
        height: 50,
        borderRadius: 16,
        backgroundColor: "#39C0ED",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    subscribeButtonText: {
        color: "#050816",
        fontSize: 15,
        fontWeight: "900",
    },
    paywallFinePrint: {
        color: "#7E96A5",
        fontSize: 11,
        lineHeight: 16,
        textAlign: "center",
        fontWeight: "600",
    },
});