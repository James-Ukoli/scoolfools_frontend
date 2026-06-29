// HomeScreen.tsx

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
import AlertSportsTicker from "../components/AlertSportsTicker";
import { finishTransaction } from "react-native-iap";

import { s, vs, ms } from "react-native-size-matters";

import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

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

const SUPPORTER_MILESTONES = [100, 1000, 10000, 50000];

export default function HomeScreen() {
    const navigation = useNavigation<any>();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

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
                    productId: purchase?.productId || "jms_599_1y",
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

            Alert.alert("Subscribed 🎉", "Welcome to Just Move Supporters ♟️🔥");
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
        try {
            setLoadingSubscription(true);

            const sessionIsValid = await ensureValidSessionBeforePurchase();

            if (!sessionIsValid) {
                setLoadingSubscription(false);
                return;
            }

            await buyBlogsSubscription();
        } catch (error: any) {
            setLoadingSubscription(false);
            console.log("Home blog subscription request error:", error);

            if (error?.message === "SESSION_EXPIRED") {
                await handleExpiredSession();
                return;
            }

            Alert.alert(
                "Subscription Failed",
                "Something went wrong while starting the subscription."
            );
        }
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
                    "Follow chess like a sport on Just Move ♟️🔥 https://linktr.ee/justmovechess",
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

    if (!fontsLoaded) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <View style={styles.container}>
                    <AppHeader />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#2EE7FF" />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

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
                        onRequireSubscription={async () => {
                            setPaywallVisible(true);
                            await loadBlogSubscription();
                        }}
                    />

                    {/* <AlertSportsTicker refreshKey={alertsRefreshKey} /> */}

                    <SupportGrowthBanner
                        supporterCount={supporterCount}
                        isSubscribed={isSubscribed}
                        onOpenBlogPaywall={async () => {
                            setPaywallVisible(true);
                            await loadBlogSubscription();
                        }}
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
                        onRequireSubscription={async () => {
                            setPaywallVisible(true);
                            await loadBlogSubscription();
                        }}
                    />

                    <PartyGamesPromo
                        navigation={navigation}
                        gamesPackagePurchased={gamesPackagePurchased}
                    />

                    {isSubscribed && (
                        <SupporterBottomActions
                            onSharePress={handleSharePress}
                            onRatePress={handleRatePress}
                        />
                    )}
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

                        <Text style={styles.paywallTitle}>Support Just Move</Text>

                        <Text style={styles.paywallSubtitle}>
                            Help support independent chess journalism and modern chess media.
                        </Text>

                        <View style={styles.priceBox}>
                            <Text style={styles.freeTrialText}>1 Month Free</Text>

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
                                <Text style={styles.subscribeButtonText}>Start Free Month</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.paywallFinePrint}>Cancel anytime.</Text>
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
        <View style={styles.supportMissionCard}>
            <View style={styles.supportTopRow}>
                <Ionicons name="rocket" size={17} color="#39C0ED" />

                <Text style={styles.supportMissionTitle}>
                    Just Move Supporters ♟️
                </Text>
            </View>

            <Text style={styles.supportMissionSubtitle}>
                {isSubscribed
                    ? "Thank you for helping us push chess forward."
                    : "Help us build the future of chess media."}
            </Text>

            <View style={styles.progressBarWrap}>
                <Animated.View style={[styles.progressFill, { width }]} />
            </View>

            <View style={styles.progressMetaRow}>
                <Text style={styles.progressCount}>
                    {supporterCount.toLocaleString()} Supporters
                </Text>

                <Text style={styles.progressGoal}>
                    Goal: {currentGoal.toLocaleString()}
                </Text>
            </View>

            {!isSubscribed && (
                <TouchableOpacity
                    style={styles.supportSubscribeButton}
                    onPress={onOpenBlogPaywall}
                    activeOpacity={0.9}
                >
                    <Ionicons name="flash" size={16} color="#050816" />
                    <Text style={styles.supportSubscribeText}>Start Free Month</Text>
                </TouchableOpacity>
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
                    <Ionicons name="game-controller" size={20} color="#C084FF" />

                    <Text style={styles.partyGamesTitle}>Party Games 🎉</Text>
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

function SupporterBottomActions({ onSharePress, onRatePress }: any) {
    return (
        <View style={styles.bottomActionsCard}>
            <Text style={styles.bottomActionsTitle}>Support Just Move</Text>

            <View style={styles.bottomActionsRow}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.bottomShareButton}
                    onPress={onSharePress}
                >
                    <Ionicons name="share-social" size={17} color="#050816" />
                    <Text style={styles.bottomShareText}>Share App</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.bottomRateButton}
                    onPress={onRatePress}
                >
                    <Ionicons name="star" size={17} color="#050816" />
                    <Text style={styles.bottomRateText}>Rate & Review</Text>
                </TouchableOpacity>
            </View>
        </View>
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
        color: "#FFF",
        fontSize: ms(23),
        fontFamily: "Rajdhani_700Bold",
        marginBottom: vs(8),
        letterSpacing: 0.4,
    },

    sectionTitle2: {
        color: "#FFF",
        fontSize: ms(18),
        fontFamily: "Rajdhani_700Bold",
        marginBottom: vs(8),
        letterSpacing: 0.35,
    },

    sectionAccentLine: {
        width: s(58),
        height: vs(3),
        borderRadius: 999,
        backgroundColor: "#1FD8FF",
    },

    supportMissionCard: {
        backgroundColor: "#07111F",
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 13,
        marginBottom: 16,
    },

    supportTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 4,
    },

    supportMissionTitle: {
        color: "#FFF",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        flex: 1,
    },

    supportMissionSubtitle: {
        color: "#BFD8E8",
        fontSize: 11.5,
        marginBottom: 9,
        fontWeight: "700",
    },

    progressBarWrap: {
        width: "100%",
        height: 7,
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
        marginTop: 8,
    },

    progressCount: {
        color: "#FFF",
        fontWeight: "800",
        fontSize: 11.5,
    },

    progressGoal: {
        color: "#9FB7C7",
        fontWeight: "700",
        fontSize: 11.5,
    },

    supportSubscribeButton: {
        backgroundColor: "#39C0ED",
        height: 36,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        flexDirection: "row",
        gap: 7,
    },

    supportSubscribeText: {
        color: "#050816",
        fontWeight: "900",
        fontSize: 13,
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
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },

    partyGamesSubtitle: {
        color: "#B8BED0",
        fontSize: 12,
        marginTop: 8,
        lineHeight: 16,
    },

    bottomActionsCard: {
        marginTop: 18,
        backgroundColor: "#07111F",
        borderRadius: 18,
        paddingVertical: 13,
        paddingHorizontal: 13,
    },

    bottomActionsTitle: {
        color: "#FFFFFF",
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
        backgroundColor: "#35D07F",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
    },

    bottomRateButton: {
        flex: 1,
        height: 42,
        borderRadius: 14,
        backgroundColor: "#C084FF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
    },

    bottomShareText: {
        color: "#050816",
        fontSize: 12.5,
        fontWeight: "900",
    },

    bottomRateText: {
        color: "#050816",
        fontSize: 12.5,
        fontWeight: "900",
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
        fontSize: 24,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
        marginBottom: 8,
        letterSpacing: 0.4,
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
        fontSize: 28,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
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