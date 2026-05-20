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
    Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as StoreReview from "expo-store-review";
import ConfettiCannon from "react-native-confetti-cannon";
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

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const SUPPORTER_GOAL = 50000;

export default function HomeScreen() {
    const navigation = useNavigation<any>();

    const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
    const [featuredStories, setFeaturedStories] = useState<any[]>([]);
    const [countdownEvent, setCountdownEvent] = useState<any>(null);

    const [loadingHome, setLoadingHome] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [gamesPackagePurchased, setGamesPackagePurchased] = useState(false);

    const [supporterCount, setSupporterCount] = useState(0);

    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

    const fetchSupporterProgress = async () => {
        try {
            if (!API_BASE_URL) return;

            const response = await fetch(
                `${API_BASE_URL}/api/auth/supporter-progress`
            );

            const data = await response.json();

            if (data?.success) {
                setSupporterCount(Number(data.subscribedUsers || 0));
            }
        } catch (error) {
            console.log("Supporter progress error:", error);
        }
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
            setShowConfetti(true);
            await fetchSupporterProgress();

            Alert.alert(
                "Subscribed 🎉",
                "Welcome to Just Move Supporters ♟️🔥"
            );
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
            if (!API_BASE_URL) return;

            const [postsRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/posts?is_featured=true&limit=10`),
                fetch(`${API_BASE_URL}/api/events`),
            ]);

            const postsJson = await postsRes.json();
            const eventsJson = await eventsRes.json();

            const allFeaturedPosts = (postsJson.data || []).sort((a: any, b: any) => {
                return (
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );
            });

            setFeaturedPosts(allFeaturedPosts.slice(0, 3));
            setFeaturedStories(allFeaturedPosts.slice(3, 10));

            const publishedEvents = (eventsJson.data || []).filter(
                (event: any) => event.is_published
            );

            setCountdownEvent(publishedEvents[0] || null);
        } catch (error) {
            console.log("Home data fetch error:", error);
        } finally {
            setLoadingHome(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
        fetchEntitlements();
        fetchSupporterProgress();
        loadBlogSubscription();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async () => {
                await activateBlogSubscriptionOnBackend();
            },
            onPurchaseError: (error: any) => {
                console.log("Home subscription listener error:", error);
                setLoadingSubscription(false);
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
            await fetchSupporterProgress();
        } finally {
            setRefreshing(false);
        }
    }, [fetchHomeData]);

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader />

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
                        supporterCount={supporterCount}
                        isSubscribed={isSubscribed}
                        onOpenBlogPaywall={() => setPaywallVisible(true)}
                    />

                    <EventCountdownCard
                        event={countdownEvent}
                        loading={loadingHome}
                    />

                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionTitle2}>
                            More Featured Stories...
                        </Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <HorizontalPostsRow
                        posts={featuredStories}
                        loading={loadingHome}
                        isSubscribed={isSubscribed}
                        onRequireSubscription={() => setPaywallVisible(true)}
                    />

                    <PartyGamesPromo
                        navigation={navigation}
                        gamesPackagePurchased={gamesPackagePurchased}
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
                            Support Just Move
                        </Text>

                        <Text style={styles.paywallSubtitle}>
                            Help support independent chess journalism and modern chess media.
                        </Text>

                        <View style={styles.priceBox}>
                            <Text style={styles.freeTrialText}>
                                1 Month Free
                            </Text>

                            <Text style={styles.priceText}>
                                Then {subscriptionProduct?.localizedPrice || "$5.99"}/year
                            </Text>
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
                            Cancel anytime.
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

function SupportGrowthBanner({
    supporterCount,
    isSubscribed,
    onOpenBlogPaywall,
}: any) {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.6)).current;

    const progress = Math.min(supporterCount / SUPPORTER_GOAL, 1);

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 1800,
            easing: Easing.out(Easing.exp),
            useNativeDriver: false,
        }).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.55,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [progress]);

    const width = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    const handleRatePress = async () => {
        try {
            const available = await StoreReview.isAvailableAsync();

            if (available) {
                await StoreReview.requestReview();
            }
        } catch (error) {
            console.log("Review popup error:", error);
        }
    };

    const handleSharePress = async () => {
        try {
            await Share.share({
                message:
                    "Follow chess like a sport on Just Move ♟️🔥 https://linktr.ee/justmovechess",
            });
        } catch (error) {
            console.log("Share error:", error);
        }
    };

    return (
        <View style={styles.supportMissionCard}>
            <View style={styles.supportTopRow}>
                <Ionicons
                    name="rocket"
                    size={18}
                    color="#39C0ED"
                />

                <Text style={styles.supportMissionTitle}>
                    Building the Future of Chess Media ♟️
                </Text>
            </View>

            <Text style={styles.supportMissionSubtitle}>
                Help Just Move reach 50,000 supporters.
            </Text>

            <View style={styles.progressOuterWrap}>
                <View style={styles.progressBarWrap}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width,
                            },
                        ]}
                    />
                </View>
            </View>

            <View style={styles.progressMetaRow}>
                <Text style={styles.progressCount}>
                    {supporterCount.toLocaleString()} Supporters
                </Text>

                <Text style={styles.progressGoal}>
                    Goal: 50,000
                </Text>
            </View>

            {!isSubscribed ? (
                <TouchableOpacity
                    style={styles.supportSubscribeButton}
                    onPress={onOpenBlogPaywall}
                    activeOpacity={0.9}
                >
                    <Ionicons
                        name="flash"
                        size={18}
                        color="#050816"
                    />

                    <Text style={styles.supportSubscribeText}>
                        Start Free Month
                    </Text>
                </TouchableOpacity>
            ) : (
                <Animated.View
                    style={[
                        styles.supportActionsRow,
                        {
                            opacity: glowAnim,
                        },
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSharePress}
                    >
                        <Text style={styles.shareGlowText}>
                            Share App
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleRatePress}
                    >
                        <Text style={styles.rateGlowText}>
                            Rate & Review
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

function PartyGamesPromo({ navigation, gamesPackagePurchased }: any) {
    return (
        <TouchableOpacity
            activeOpacity={0.92}
            style={styles.partyGamesCard}
            onPress={() => navigation.navigate("GameHome")}
        >
            <View style={styles.partyGamesTopRow}>
                <View style={styles.partyGamesLeft}>
                    <Ionicons
                        name="game-controller"
                        size={20}
                        color="#C084FF"
                    />

                    <Text style={styles.partyGamesTitle}>
                        Party Games 🎉
                    </Text>
                </View>

                <View style={styles.inlineGamesRow}>
                    <Ionicons name="happy-outline" size={16} color="#39C0ED" />
                    <Ionicons name="people-outline" size={16} color="#35D07F" />
                    <Ionicons name="help-outline" size={16} color="#FFD166" />
                    <Ionicons name="timer-outline" size={16} color="#FF7A7A" />
                </View>
            </View>

            <Text style={styles.partyGamesSubtitle}>
                {gamesPackagePurchased
                    ? "Share videos of your group playing Just Move Party Games ♟️🔥"
                    : "Fun social games for chess friends, clubs, and tournaments."}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000",
    },

    container: {
        flex: 1,
        backgroundColor: "#000",
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
        color: "#FFF",
        fontSize: ms(23),
        fontWeight: "900",
        marginBottom: vs(8),
    },

    sectionTitle2: {
        color: "#FFF",
        fontSize: ms(16),
        fontWeight: "900",
        marginBottom: vs(8),
    },

    sectionAccentLine: {
        width: s(58),
        height: vs(3),
        borderRadius: 999,
        backgroundColor: "#1FD8FF",
    },

    supportMissionCard: {
        backgroundColor: "#07111F",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#39C0ED",
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 18,
    },

    supportTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },

    supportMissionTitle: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "900",
        flex: 1,
    },

    supportMissionSubtitle: {
        color: "#BFD8E8",
        fontSize: 12,
        marginBottom: 12,
    },

    progressOuterWrap: {
        alignItems: "center",
        marginTop: 4,
    },

    progressBarWrap: {
        width: "72%",
        height: 8,
        backgroundColor: "#0E1625",
        borderRadius: 999,
        overflow: "hidden",
    },

    progressFill: {
        height: "100%",
        backgroundColor: "#39C0ED",
        borderRadius: 999,

        shadowColor: "#39C0ED",
        shadowOpacity: 0.9,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 10,
    },

    progressMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },

    progressCount: {
        color: "#FFF",
        fontWeight: "800",
        fontSize: 12,
    },

    progressGoal: {
        color: "#9FB7C7",
        fontWeight: "700",
        fontSize: 12,
    },

    supportSubscribeButton: {
        backgroundColor: "#39C0ED",
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 13,
        flexDirection: "row",
        gap: 8,
    },

    supportSubscribeText: {
        color: "#050816",
        fontWeight: "900",
        fontSize: 14,
    },

    supportActionsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 30,
        marginTop: 18,
    },

    shareGlowText: {
        color: "#7CFF7C",
        fontSize: 15,
        fontWeight: "900",
        textShadowColor: "#7CFF7C",
        textShadowRadius: 12,
        textShadowOffset: {
            width: 0,
            height: 0,
        },
    },

    rateGlowText: {
        color: "#C084FF",
        fontSize: 15,
        fontWeight: "900",
        textShadowColor: "#C084FF",
        textShadowRadius: 12,
        textShadowOffset: {
            width: 0,
            height: 0,
        },
    },

    partyGamesCard: {
        backgroundColor: "#101320",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#7746FF",
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginTop: 28,
    },

    partyGamesTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    partyGamesLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    inlineGamesRow: {
        flexDirection: "row",
        gap: 10,
    },

    partyGamesTitle: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "900",
    },

    partyGamesSubtitle: {
        color: "#B8BED0",
        fontSize: 12,
        marginTop: 8,
        lineHeight: 16,
    },

    paywallOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
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
        paddingBottom: 22,
        alignItems: "center",
    },

    closeButton: {
        position: "absolute",
        top: 12,
        right: 14,
        zIndex: 10,
    },

    closeButtonText: {
        color: "#FFFFFF",
        fontSize: 28,
    },

    paywallEmoji: {
        fontSize: 40,
        marginBottom: 10,
    },

    paywallTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 8,
    },

    paywallSubtitle: {
        color: "#C9D4E5",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 16,
    },

    priceBox: {
        width: "100%",
        backgroundColor: "#101827",
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 18,
    },

    freeTrialText: {
        color: "#39C0ED",
        fontSize: 25,
        fontWeight: "900",
    },

    priceText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
        marginTop: 4,
    },

    subscribeButton: {
        width: "100%",
        height: 50,
        borderRadius: 16,
        backgroundColor: "#39C0ED",
        alignItems: "center",
        justifyContent: "center",
    },

    subscribeButtonText: {
        color: "#050816",
        fontSize: 15,
        fontWeight: "900",
    },

    paywallFinePrint: {
        color: "#7F8CA3",
        fontSize: 11,
        marginTop: 12,
    },
});