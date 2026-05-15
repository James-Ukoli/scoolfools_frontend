import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Animated,
    TouchableOpacity,
    Easing,
    Modal,
    Pressable,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppHeader from "../components/AppHeader";
import FeaturedCarousel from "../components/FeaturedCarousel";
import EventCountdownCard from "../components/EventCountdownCard";
import HorizontalPostsRow from "../components/HorizontalPostsRow";
import { s, vs, ms } from "react-native-size-matters";
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
    is_featured: boolean;
    created_at: string;
    published_at: string | null;
    slug: string;
    author?: string;
    category?: string;
    content_type?: string;
};

type Broadcaster = {
    name: string;
    platform: string;
    url: string;
    broadcast_start_at?: string;
};

type GamePlatform = {
    name: string;
    url: string;
    is_official: boolean;
    notes?: string;
};

type Round = {
    round_number: number;
    label: string;
    start_at: string;
    end_at: string | null;
    broadcast_start_at?: string;
    is_rest_day: boolean;
    status: string;
    notes?: string;
};

type EventItem = {
    _id: string;
    title: string;
    slug: string;
    summary?: string;
    type: string;
    location: string;
    start_at: string;
    end_at: string;
    timezone: string;
    cover_image_url: string;
    card_image_url?: string;
    official_url?: string;
    standingsUrl?: string;
    tags: string[];
    is_published: boolean;
    is_featured: boolean;
    featured_priority?: number;
    sort_boost?: number;
    status: string;
    live_mode?: string;
    current_day?: number | null;
    current_round?: number | null;
    round_label?: string | null;
    status_note?: string | null;
    last_status_update_at?: string | null;
    main_broadcaster?: Broadcaster;
    other_broadcasters?: Broadcaster[];
    game_platforms?: GamePlatform[];
    rounds?: Round[];
    createdAt: string;
    updatedAt: string;
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

export default function HomeScreen() {
    const navigation = useNavigation<any>();

    const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
    const [featuredStories, setFeaturedStories] = useState<Post[]>([]);
    const [countdownEvent, setCountdownEvent] = useState<EventItem | null>(null);

    const [loadingHome, setLoadingHome] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [gamesPackagePurchased, setGamesPackagePurchased] = useState(false);

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
                setGamesPackagePurchased(!!data?.entitlements?.gamesPackagePurchased);
            }
        } catch (error) {
            console.log("Home entitlement fetch error:", error);
        }
    };

    const loadBlogSubscription = async () => {
        try {
            await initializeIAP();

            const product = await getBlogsSubscriptionProduct();
            setSubscriptionProduct(product);
        } catch (error) {
            console.log("Home blog subscription load error:", error);
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
            console.log("Activate home blog subscription error:", error);

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
            console.log("Home blog subscription request error:", error);

            Alert.alert(
                "Subscription Failed",
                "Something went wrong while starting the subscription."
            );
        }
    };

    const fetchHomeData = useCallback(async () => {
        try {
            const [postsRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/posts?is_featured=true&limit=10`),
                fetch(`${API_BASE_URL}/api/events`),
            ]);

            const postsJson = await postsRes.json();
            const eventsJson = await eventsRes.json();

            const allFeaturedPosts = (postsJson.data || []).sort((a: Post, b: Post) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA;
            });

            setFeaturedPosts(allFeaturedPosts.slice(0, 3));
            setFeaturedStories(allFeaturedPosts.slice(3, 10));

            const publishedEvents = (eventsJson.data || [])
                .filter((event: EventItem) => event.is_published)
                .sort(
                    (a: EventItem, b: EventItem) =>
                        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
                );

            const now = Date.now();

            const upcomingEvents = publishedEvents.filter(
                (event: EventItem) => new Date(event.end_at).getTime() >= now
            );

            const featuredUpcoming = upcomingEvents
                .filter((event: EventItem) => event.is_featured)
                .sort((a: EventItem, b: EventItem) => {
                    const priorityA = a.featured_priority ?? 0;
                    const priorityB = b.featured_priority ?? 0;

                    if (priorityA !== priorityB) return priorityB - priorityA;

                    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
                });

            setCountdownEvent(
                featuredUpcoming[0] || upcomingEvents[0] || publishedEvents[0] || null
            );
        } catch (error) {
            console.log("Error fetching home data:", error);
        } finally {
            setLoadingHome(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
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
                console.log("Home subscription listener error:", error);
            },
        });

        return () => {
            cleanupIAP();
        };
    }, [fetchHomeData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchHomeData();
            await fetchEntitlements();
            await new Promise((resolve) => setTimeout(resolve, 900));
        } catch (error) {
            console.log("HOME REFRESH ERROR:", error);
        } finally {
            setRefreshing(false);
        }
    }, [fetchHomeData]);

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader />

                {refreshing && (
                    <View style={styles.refreshIndicator}>
                        <ActivityIndicator size="small" color="#2EE7FF" />
                    </View>
                )}

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#2EE7FF"
                            colors={["#2EE7FF"]}
                            progressBackgroundColor="#0B1224"
                        />
                    }
                >
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionTitle}>Featured Stories</Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <FeaturedCarousel
                        posts={featuredPosts}
                        loading={loadingHome}
                        isSubscribed={isSubscribed}
                        onRequireSubscription={() => setPaywallVisible(true)}
                    />

                    <SupportGrowthBanner
                        navigation={navigation}
                        isSubscribed={isSubscribed}
                        gamesPackagePurchased={gamesPackagePurchased}
                        onOpenBlogPaywall={() => setPaywallVisible(true)}
                    />

                    <EventCountdownCard event={countdownEvent} loading={loadingHome} />

                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionTitle2}>More Featured Stories...</Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <HorizontalPostsRow
                        posts={featuredStories}
                        loading={loadingHome}
                        isSubscribed={isSubscribed}
                        onRequireSubscription={() => setPaywallVisible(true)}
                    />
                </ScrollView>
            </View>

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

function SupportGrowthBanner({
    navigation,
    isSubscribed,
    gamesPackagePurchased,
    onOpenBlogPaywall,
}: any) {
    const pulse = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const arrowFloat = useRef(new Animated.Value(0)).current;

    const showGamesButton = !gamesPackagePurchased;
    const showBlogsButton = !isSubscribed;
    const singleButton = showGamesButton !== showBlogsButton;

    useEffect(() => {
        if (!showGamesButton && !showBlogsButton) return;

        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulse, {
                        toValue: 1.018,
                        duration: 900,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulse, {
                        toValue: 1,
                        duration: 900,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(glow, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glow, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(arrowFloat, {
                        toValue: -4,
                        duration: 800,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(arrowFloat, {
                        toValue: 0,
                        duration: 800,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
            ])
        ).start();
    }, [showGamesButton, showBlogsButton]);

    if (!showGamesButton && !showBlogsButton) {
        return null;
    }

    const shadowOpacity = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.62],
    });

    const shadowRadius = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [7, 17],
    });

    return (
        <Animated.View
            style={[
                styles.supportCard,
                {
                    transform: [{ scale: pulse }],
                    shadowOpacity,
                    shadowRadius,
                },
            ]}
        >
            <View style={styles.supportTopRow}>
                <View style={styles.supportIconCircle}>
                    <Animated.View style={{ transform: [{ translateY: arrowFloat }] }}>
                        <Ionicons name="trending-up" size={22} color="#050816" />
                    </Animated.View>
                </View>

                <View style={styles.supportTextWrap}>
                    <Text style={styles.supportTitle}>Help Push Chess Forward</Text>

                    <Text style={styles.supportSubtitle}>
                        Support and help Just Move take chess to the next level.
                    </Text>
                </View>
            </View>

            <View style={styles.supportActionsRow}>
                {showGamesButton && (
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={[
                            styles.supportActionButton,
                            styles.gamesActionButton,
                            singleButton && styles.fullWidthSupportButton,
                        ]}
                        onPress={() => navigation.navigate("GameHome")}
                    >
                        <Ionicons
                            name="game-controller-outline"
                            size={18}
                            color="#D98CFF"
                        />

                        <Text style={styles.supportActionText}>
                            {singleButton
                                ? "Party Games with Chess Friends 🎉"
                                : "Party Games 🎉"}
                        </Text>
                    </TouchableOpacity>
                )}

                {showBlogsButton && (
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={[
                            styles.supportActionButton,
                            styles.blogsActionButton,
                            singleButton && styles.fullWidthSupportButton,
                        ]}
                        onPress={onOpenBlogPaywall}
                    >
                        <Ionicons
                            name="newspaper-outline"
                            size={18}
                            color="#FFD166"
                        />

                        <Text style={styles.supportActionText}>
                            {singleButton
                                ? "Exclusive Chess Blogs 📝"
                                : "Exclusive Blogs 📝"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
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

    scrollContent: {
        paddingHorizontal: s(16),
        paddingTop: vs(10),
        paddingBottom: vs(160),
    },

    sectionHeaderWrap: {
        marginBottom: vs(14),
    },

    sectionTitle: {
        color: "#FFFFFF",
        fontSize: ms(23),
        fontWeight: "900",
        letterSpacing: 0.2,
        marginBottom: vs(8),
    },

    sectionTitle2: {
        color: "#FFFFFF",
        fontSize: ms(16),
        fontWeight: "900",
        letterSpacing: 0.2,
        marginBottom: vs(8),
    },

    sectionAccentLine: {
        width: s(58),
        height: vs(3),
        borderRadius: 999,
        backgroundColor: "#1FD8FF",
        shadowColor: "#1FD8FF",
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },

    supportCard: {
        backgroundColor: "#07111F",
        borderRadius: ms(20),
        borderWidth: 1.2,
        borderColor: "rgba(57, 192, 237, 0.62)",
        paddingHorizontal: s(13),
        paddingVertical: vs(11),
        marginTop: vs(2),
        marginBottom: vs(14),
        shadowColor: "#39C0ED",
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },

    supportTopRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    supportIconCircle: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: "#39C0ED",
        alignItems: "center",
        justifyContent: "center",
        marginRight: s(11),
    },

    supportTextWrap: {
        flex: 1,
    },

    supportTitle: {
        color: "#FFFFFF",
        fontSize: ms(15.5),
        fontWeight: "900",
        marginBottom: vs(3),
    },

    supportSubtitle: {
        color: "#BFD8E8",
        fontSize: ms(11.5),
        fontWeight: "700",
        lineHeight: ms(16),
    },

    supportActionsRow: {
        flexDirection: "row",
        gap: s(9),
        marginTop: vs(10),
    },

    supportActionButton: {
        flex: 1,
        height: vs(38),
        borderRadius: ms(13),
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: s(6),
    },

    fullWidthSupportButton: {
        flex: 1,
    },

    gamesActionButton: {
        backgroundColor: "rgba(119, 70, 255, 0.16)",
        borderWidth: 1,
        borderColor: "rgba(217, 140, 255, 0.7)",
    },

    blogsActionButton: {
        backgroundColor: "rgba(255, 209, 102, 0.13)",
        borderWidth: 1,
        borderColor: "rgba(255, 209, 102, 0.75)",
    },

    supportActionText: {
        color: "#FFFFFF",
        fontSize: ms(10),
        fontWeight: "900",
        textAlign: "center",
    },

    refreshIndicator: {
        alignItems: "center",
        paddingVertical: vs(6),
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