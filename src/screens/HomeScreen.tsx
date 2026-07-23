// HomeScreen.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    RefreshControl,
    Platform,
    Animated,
    TouchableOpacity,
    Easing,
    Alert,
    Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as StoreReview from "expo-store-review";
import ConfettiCannon from "react-native-confetti-cannon";
import FeaturedCarousel from "../components/FeaturedCarousel";
import EventCountdownCard from "../components/EventCountdownCard";
import HorizontalPostsRow from "../components/HorizontalPostsRow";
import BlogsPaywallModal from "../components/BlogsPaywallModal";
import { finishTransaction } from "react-native-iap";

import { s, vs, ms } from "react-native-size-matters";

import {
    initializeIAP,
    getBlogsSubscriptionProduct,
    buyBlogsSubscription,
    setupPurchaseListeners,
    cleanupIAP,
} from "../services/iap";
import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const SUPPORTER_MILESTONES = [100, 1000, 10000, 50000];

const getHomeTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            mode,
            bg: "#F8FAFC",
            card: "#FFFFFF",
            cardAlt: "#ECFEFF",
            cardDeep: "#F1F5F9",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border: "rgba(7,17,31,0.10)",
            borderStrong: "rgba(6,182,212,0.28)",
            cyan: "#06B6D4",
            cyanSoft: "rgba(6,182,212,0.12)",
            yellow: "#FACC15",
            purple: "#8B5CF6",
            green: "#22C55E",
            red: "#EF4444",
            shadow: "#06B6D4",
            modalBackdrop: "rgba(2,6,23,0.58)",
            refreshBg: "#FFFFFF",
            darkText: "#050816",
        };
    }

    return {
        mode,
        bg: "#020617",
        card: "#090D14",
        cardAlt: "#07111F",
        cardDeep: "#101827",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.10)",
        borderStrong: "rgba(34,211,238,0.30)",
        cyan: "#22D3EE",
        cyanSoft: "rgba(34,211,238,0.12)",
        yellow: "#FACC15",
        purple: "#C084FC",
        green: "#35D07F",
        red: "#FF7A7A",
        shadow: "#22D3EE",
        modalBackdrop: "rgba(0,0,0,0.82)",
        refreshBg: "#111827",
        darkText: "#050816",
    };
};

export default function HomeScreen() {
    const navigation = useNavigation<any>();

    const { mode: themeMode } = useTimeTheme();
    const theme = getHomeTheme(themeMode);

    const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
    const [featuredStories, setFeaturedStories] = useState<any[]>([]);
    const [countdownEvent, setCountdownEvent] = useState<any>(null);
    const [alertsRefreshKey, setAlertsRefreshKey] = useState(0);
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

    const handleExpiredSession = async () => {
        try {
            await AsyncStorage.multiRemove(["token", "user"]);

            setIsSubscribed(false);
            setGamesPackagePurchased(false);
            setPaywallVisible(false);
            setLoadingSubscription(false);

            Alert.alert(
                "Session Expired",
                "Please log in again before subscribing or restoring purchases."
            );

            navigation.reset({
                index: 0,
                routes: [{ name: "GoogleSignIn" }],
            });
        } catch (error) {
            console.log("Expired session cleanup error:", error);
        }
    };

    const fetchSupporterProgress = async () => {
        try {
            if (!API_BASE_URL) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/supporter-progress`);
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

            if (response.status === 401) {
                await handleExpiredSession();
                return;
            }

            const data = await response.json();

            if (data?.success) {
                setIsSubscribed(!!data?.entitlements?.isSubscribed);
                setGamesPackagePurchased(!!data?.entitlements?.gamesPackagePurchased);
            }
        } catch (error) {
            console.log("Home entitlement fetch error:", error);
        }
    };

    const ensureValidSessionBeforePurchase = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                await handleExpiredSession();
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                await handleExpiredSession();
                return false;
            }

            return true;
        } catch (error) {
            console.log("Session precheck error:", error);
            return true;
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

    const openBlogPaywall = async () => {
        setPaywallVisible(true);

        if (!subscriptionProduct) {
            await loadBlogSubscription();
        }
    };

    const verifyBlogSubscriptionOnBackend = async (purchase: any) => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                await handleExpiredSession();
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/subscriptions/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    platform: Platform.OS === "ios" ? "ios" : "android",
                    productId: purchase?.productId,
                    transactionId:
                        purchase?.transactionId ||
                        purchase?.transactionIdIOS ||
                        purchase?.id ||
                        null,
                    purchaseToken: purchase?.purchaseToken || null,
                }),
            });

            if (response.status === 401) {
                await handleExpiredSession();
                return;
            }

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
            await fetchSupporterProgress();

            Alert.alert("Subscribed 🎉");
        } catch (error) {
            console.log("Verify home blog subscription error:", error);

            Alert.alert(
                "Purchase Complete",
                "Purchase worked, but verifying the subscription with your account failed. Please log out, log back in, and restore purchases."
            );
        } finally {
            setLoadingSubscription(false);
        }
    };

    const handleSubscribePress = async () => {
        setLoadingSubscription(true);

        await buyBlogsSubscription({
            onSuccess: verifyBlogSubscriptionOnBackend,
            onError: (error: any) => {
                setLoadingSubscription(false);
                console.log("Subscription purchase error:", error);

                if (
                    error?.code === "user-cancelled" ||
                    error?.code === "E_USER_CANCELLED"
                ) {
                    return;
                }

                Alert.alert(
                    "Subscription Failed",
                    error?.message ||
                    "Something went wrong while processing your subscription.",
                );
            },
        });
    };
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
                    "Dump It Out on the #1 Place Where Students' Voices Are Heard.🎓 https://linktr.ee/scoolfools",
            });
        } catch (error) {
            console.log("Share error:", error);
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
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async (purchase: any) => {
                await verifyBlogSubscriptionOnBackend(purchase);
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
            setAlertsRefreshKey((prev) => prev + 1);
            setRefreshing(false);
        }
    }, [fetchHomeData]);

    return (
        <SafeAreaView
            edges={["left", "right"]}
            style={[styles.safeArea, { backgroundColor: theme.bg }]}
        >
            <View style={[styles.container, { backgroundColor: theme.bg }]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.cyan}
                            colors={[theme.cyan]}
                            progressBackgroundColor={theme.refreshBg}
                        />
                    }
                >
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            Featured Stories
                        </Text>
                        <View
                            style={[
                                styles.sectionAccentLine,
                                { backgroundColor: theme.cyan },
                            ]}
                        />
                    </View>

                    <FeaturedCarousel
                        posts={featuredPosts}
                        loading={loadingHome}
                        isSubscribed={isSubscribed}
                        onRequireSubscription={openBlogPaywall}
                    />

                    <SupportGrowthBanner
                        supporterCount={supporterCount}
                        isSubscribed={isSubscribed}
                        onOpenBlogPaywall={openBlogPaywall}
                        theme={theme}
                    />

                    <EventCountdownCard event={countdownEvent} loading={loadingHome} />

                    <View style={styles.sectionHeaderWrap}>
                        <Text style={[styles.sectionTitle2, { color: theme.text }]}>
                            More Featured Stories...
                        </Text>
                        <View
                            style={[
                                styles.sectionAccentLine,
                                { backgroundColor: theme.cyan },
                            ]}
                        />
                    </View>

                    <HorizontalPostsRow
                        posts={featuredStories}
                        loading={loadingHome}
                        isSubscribed={isSubscribed}
                        onRequireSubscription={openBlogPaywall}
                    />

                    <PartyGamesPromo
                        navigation={navigation}
                        gamesPackagePurchased={gamesPackagePurchased}
                        theme={theme}
                    />

                    {isSubscribed && (
                        <SupporterBottomActions
                            onSharePress={handleSharePress}
                            onRatePress={handleRatePress}
                            theme={theme}
                        />
                    )}
                </ScrollView>
            </View>

            <BlogsPaywallModal
                visible={paywallVisible}
                onClose={() => setPaywallVisible(false)}
                onSubscribe={handleSubscribePress}
                loading={loadingSubscription}
                localizedPrice={
                    subscriptionProduct?.displayPrice ||
                    subscriptionProduct?.localizedPrice ||
                    "$3.99"
                }
                billingPeriodLabel="every 6 months"
                buttonLabel="Unlock Premium Access"
                themeMode={themeMode}
            />

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
    theme,
}: any) {
    const progressAnim = useRef(new Animated.Value(0)).current;

    const currentGoal =
        SUPPORTER_MILESTONES.find((goal) => supporterCount < goal) || 50000;

    const progress = Math.min(supporterCount / currentGoal, 1);

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 1500,
            easing: Easing.out(Easing.exp),
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const width = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <View
            style={[
                styles.supportMissionCard,
                {
                    backgroundColor: theme.cardAlt,
                    borderColor: theme.borderStrong,
                },
            ]}
        >
            <View style={styles.supportTopRow}>
                <Ionicons name="rocket" size={17} color={theme.cyan} />

                <Text style={[styles.supportMissionTitle, { color: theme.text }]}>
                    ScoolFools Subscribers 🤪🎓
                </Text>
            </View>

            <Text style={[styles.supportMissionSubtitle, { color: theme.textSoft }]}>
                {isSubscribed
                    ? "Thank you for helping us push chess forward."
                    : "Help us build the future of chess media."}
            </Text>

            <View
                style={[
                    styles.progressBarWrap,
                    {
                        backgroundColor:
                            theme.mode === "day" ? "#E2E8F0" : "#0E1625",
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.progressFill,
                        {
                            width,
                            backgroundColor: theme.cyan,
                            shadowColor: theme.cyan,
                        },
                    ]}
                />
            </View>

            <View style={styles.progressMetaRow}>
                <Text style={[styles.progressCount, { color: theme.text }]}>
                    {supporterCount.toLocaleString()} Supporters
                </Text>

                <Text style={[styles.progressGoal, { color: theme.muted }]}>
                    Goal: {currentGoal.toLocaleString()}
                </Text>
            </View>

            {!isSubscribed && (
                <TouchableOpacity
                    style={[
                        styles.supportSubscribeButton,
                        { backgroundColor: theme.cyan },
                    ]}
                    onPress={onOpenBlogPaywall}
                    activeOpacity={0.9}
                >
                    <Ionicons name="flash" size={16} color={theme.darkText} />
                    <Text
                        style={[
                            styles.supportSubscribeText,
                            { color: theme.darkText },
                        ]}
                    >
                        Start Free Month
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function PartyGamesPromo({ navigation, gamesPackagePurchased, theme }: any) {
    return (
        <TouchableOpacity
            activeOpacity={0.92}
            style={[
                styles.partyGamesCard,
                {
                    backgroundColor: theme.card,
                    borderColor: theme.purple,
                },
            ]}
            onPress={() => navigation.navigate("GameHome")}
        >
            <View style={styles.partyGamesTopRow}>
                <View style={styles.partyGamesLeft}>
                    <Ionicons name="game-controller" size={20} color={theme.purple} />

                    <Text style={[styles.partyGamesTitle, { color: theme.text }]}>
                        Party Games 🎉
                    </Text>
                </View>

                <View style={styles.inlineGamesRow}>
                    <Ionicons name="happy-outline" size={16} color={theme.cyan} />
                    <Ionicons name="people-outline" size={16} color={theme.green} />
                    <Ionicons name="help-outline" size={16} color={theme.yellow} />
                    <Ionicons name="timer-outline" size={16} color={theme.red} />
                </View>
            </View>

            <Text style={[styles.partyGamesSubtitle, { color: theme.textSoft }]}>
                {gamesPackagePurchased
                    ? "Share videos of your group playing ScoolFools Party Games ♟️🔥"
                    : "Fun social games for chess friends, clubs, and tournaments."}
            </Text>
        </TouchableOpacity>
    );
}

function SupporterBottomActions({ onSharePress, onRatePress, theme }: any) {
    return (
        <View
            style={[
                styles.bottomActionsCard,
                {
                    backgroundColor: theme.cardAlt,
                    borderColor: theme.border,
                },
            ]}
        >
            <Text style={[styles.bottomActionsTitle, { color: theme.text }]}>
                Support ScoolFools
            </Text>

            <View style={styles.bottomActionsRow}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                        styles.bottomShareButton,
                        { backgroundColor: theme.green },
                    ]}
                    onPress={onSharePress}
                >
                    <Ionicons name="share-social" size={17} color={theme.darkText} />
                    <Text style={[styles.bottomShareText, { color: theme.darkText }]}>
                        Share App
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                        styles.bottomRateButton,
                        { backgroundColor: theme.purple },
                    ]}
                    onPress={onRatePress}
                >
                    <Ionicons name="star" size={17} color={theme.darkText} />
                    <Text style={[styles.bottomRateText, { color: theme.darkText }]}>
                        Rate & Review
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },

    container: {
        flex: 1,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
        fontSize: ms(23),
        fontFamily: "Rajdhani_700Bold",
        marginBottom: vs(8),
        letterSpacing: 0.4,
    },

    sectionTitle2: {
        fontSize: ms(18),
        fontFamily: "Rajdhani_700Bold",
        marginBottom: vs(8),
        letterSpacing: 0.35,
    },

    sectionAccentLine: {
        width: s(58),
        height: vs(3),
        borderRadius: 999,
    },

    supportMissionCard: {
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 13,
        marginBottom: 16,
        borderWidth: 1,
    },

    supportTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 4,
    },

    supportMissionTitle: {
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        flex: 1,
    },

    supportMissionSubtitle: {
        fontSize: 11.5,
        marginBottom: 9,
        fontWeight: "700",
    },

    progressBarWrap: {
        width: "100%",
        height: 7,
        borderRadius: 999,
        overflow: "hidden",
    },

    progressFill: {
        height: "100%",
        borderRadius: 999,
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
        marginTop: 8,
    },

    progressCount: {
        fontWeight: "800",
        fontSize: 11.5,
    },

    progressGoal: {
        fontWeight: "700",
        fontSize: 11.5,
    },

    supportSubscribeButton: {
        height: 36,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        flexDirection: "row",
        gap: 7,
    },

    supportSubscribeText: {
        fontWeight: "900",
        fontSize: 13,
    },

    partyGamesCard: {
        borderRadius: 18,
        borderWidth: 1,
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
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },

    partyGamesSubtitle: {
        fontSize: 12,
        marginTop: 8,
        lineHeight: 16,
    },

    bottomActionsCard: {
        marginTop: 18,
        borderRadius: 18,
        paddingVertical: 13,
        paddingHorizontal: 13,
        borderWidth: 1,
    },

    bottomActionsTitle: {
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        marginBottom: 10,
    },

    bottomActionsRow: {
        flexDirection: "row",
        gap: 10,
    },

    bottomShareButton: {
        flex: 1,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
    },

    bottomRateButton: {
        flex: 1,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
    },

    bottomShareText: {
        fontSize: 12.5,
        fontWeight: "900",
    },

    bottomRateText: {
        fontSize: 12.5,
        fontWeight: "900",
    },

});
