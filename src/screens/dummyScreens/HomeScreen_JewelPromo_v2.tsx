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
    Image,
    ImageSourcePropType,
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


type StoredUser = {
    selectedAvatar?: string | null;
    providerAvatar?: string | null;
    avatar?: string | null;
};

const AVATAR_IMAGES: Record<string, ImageSourcePropType> = {
    basicBlue: require("../../assets/images/profileimages/basicBlue.png"),
    basicGreen: require("../../assets/images/profileimages/basicGreen.png"),
    basicOrange: require("../../assets/images/profileimages/basicOrange.png"),
    basicPink: require("../../assets/images/profileimages/basicPink.png"),
    basicPurple: require("../../assets/images/profileimages/basicPurple.png"),
    basicYellow: require("../../assets/images/profileimages/basicYellow.png"),
    diamondBoy: require("../../assets/images/profileimages/diamondBoy.png"),
    diamondGirl: require("../../assets/images/profileimages/diamondGirl.png"),
};

const DIAMOND_UPGRADE_MAP: Record<string, string> = {
    basicBlue: "diamondBoy",
    basicGreen: "diamondBoy",
    basicOrange: "diamondBoy",
    basicPurple: "diamondBoy",
    basicPink: "diamondGirl",
    basicYellow: "diamondGirl",
    diamondBoy: "diamondBoy",
    diamondGirl: "diamondGirl",
};

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
    const [selectedAvatar, setSelectedAvatar] = useState("basicBlue");

    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

    const loadSelectedAvatar = useCallback(async () => {
        try {
            const storedUser = await AsyncStorage.getItem("user");

            if (!storedUser) {
                setSelectedAvatar("basicBlue");
                return;
            }

            const parsedUser: StoredUser = JSON.parse(storedUser);

            const avatarId =
                parsedUser?.selectedAvatar ||
                (parsedUser?.avatar && !parsedUser.avatar.startsWith("http")
                    ? parsedUser.avatar
                    : null) ||
                "basicBlue";

            setSelectedAvatar(AVATAR_IMAGES[avatarId] ? avatarId : "basicBlue");
        } catch (error) {
            console.log("Home avatar load error:", error);
            setSelectedAvatar("basicBlue");
        }
    }, []);

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
        loadSelectedAvatar();

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
    }, [fetchHomeData, loadSelectedAvatar]);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            loadSelectedAvatar();
        });

        return unsubscribe;
    }, [loadSelectedAvatar, navigation]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchHomeData();
            await fetchEntitlements();
            await loadSelectedAvatar();
        } finally {
            setAlertsRefreshKey((prev) => prev + 1);
            setRefreshing(false);
        }
    }, [fetchHomeData, loadSelectedAvatar]);

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

                    <SupporterBenefitsBanner
                        isSubscribed={isSubscribed}
                        onOpenBlogPaywall={openBlogPaywall}
                        selectedAvatar={selectedAvatar}
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

function SupporterBenefitsBanner({
    isSubscribed,
    onOpenBlogPaywall,
    selectedAvatar,
    theme,
}: any) {
    const transitionAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const sparkleAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const glitterAnim = useRef(new Animated.Value(0)).current;

    const currentAvatarId = AVATAR_IMAGES[selectedAvatar]
        ? selectedAvatar
        : "basicBlue";

    const upgradedAvatarId =
        DIAMOND_UPGRADE_MAP[currentAvatarId] || "diamondBoy";

    const currentAvatarSource = AVATAR_IMAGES[currentAvatarId];
    const upgradedAvatarSource = AVATAR_IMAGES[upgradedAvatarId];

    const jewelThemes: Record<string, any> = {
        basicBlue: {
            background: "#075E9D",
            backgroundDeep: "#062F63",
            deepLayerHeight: "100%",
            deepLayerOpacity: 0.62,
            crystal: "rgba(120,225,255,0.24)",
            crystalSecondary: "rgba(255,215,0,0.20)",
            border: "#F6D56A",
            borderSoft: "#FFF2A8",
            eyebrowText: "#FFE47A",
            titleText: "#5BE7FF",
            subtitleText: "#FFFFFF",
            arrow: "#FFD85E",
            arrowIcon: "#06385F",
            sparkle: "#FFFFFF",
            sparkleAlt: "#FFE77A",
            avatarBackground: "rgba(205,246,255,0.22)",
            shadow: "#38D9FF",
        },
        basicGreen: {
            background: "#0F6A55",
            backgroundDeep: "#073C32",
            crystal: "rgba(138,255,208,0.24)",
            crystalSecondary: "rgba(255,215,0,0.16)",
            border: "#E5C85B",
            borderSoft: "#FFF2A8",
            accent: "#FFF0A6",
            text: "#FFFFFF",
            textSoft: "#D6FFF1",
            arrow: "#E5C85B",
            sparkle: "#FFF5B7",
            sparkleAlt: "#B8FFE8",
            avatarBackground: "rgba(211,255,240,0.17)",
            shadow: "#62F2C5",
        },
        basicOrange: {
            background: "#B9531E",
            backgroundDeep: "#6E2A0F",
            crystal: "rgba(255,205,133,0.28)",
            crystalSecondary: "rgba(255,236,184,0.18)",
            border: "#FFD27A",
            borderSoft: "#FFF0BF",
            accent: "#FFF2C7",
            text: "#FFFFFF",
            textSoft: "#FFE4C7",
            arrow: "#FFD27A",
            sparkle: "#FFF7D0",
            sparkleAlt: "#FFCAA1",
            avatarBackground: "rgba(255,226,190,0.18)",
            shadow: "#FF9E57",
        },
        basicPink: {
            background: "#C94D87",
            backgroundDeep: "#7C214E",
            crystal: "rgba(255,223,239,0.29)",
            crystalSecondary: "rgba(255,255,255,0.16)",
            border: "#FFD1E7",
            borderSoft: "#FFF2F8",
            accent: "#FFF3F9",
            text: "#FFFFFF",
            textSoft: "#FFE2EF",
            arrow: "#FFD1E7",
            sparkle: "#FFFFFF",
            sparkleAlt: "#FFD3EA",
            avatarBackground: "rgba(255,233,244,0.18)",
            shadow: "#FF86BB",
        },
        basicPurple: {
            background: "#6436A5",
            backgroundDeep: "#32155E",
            crystal: "rgba(216,183,255,0.27)",
            crystalSecondary: "rgba(255,215,0,0.15)",
            border: "#E7CB68",
            borderSoft: "#FFF0A9",
            accent: "#FFF1AD",
            text: "#FFFFFF",
            textSoft: "#EADFFF",
            arrow: "#E7CB68",
            sparkle: "#FFF5BC",
            sparkleAlt: "#E9D7FF",
            avatarBackground: "rgba(232,217,255,0.17)",
            shadow: "#BA8CFF",
        },
        basicYellow: {
            background: "#D94D91",
            backgroundDeep: "#8F245F",
            deepLayerHeight: "100%",
            deepLayerOpacity: 0.56,
            crystal: "rgba(255,220,241,0.30)",
            crystalSecondary: "rgba(255,255,255,0.18)",
            border: "#FFD3E9",
            borderSoft: "#FFF3FA",
            eyebrowText: "#FFF0F8",
            titleText: "#FFFFFF",
            subtitleText: "#FFFFFF",
            arrow: "#FFD5E9",
            arrowIcon: "#7E2455",
            sparkle: "#FFFFFF",
            sparkleAlt: "#FFEAF6",
            avatarBackground: "rgba(255,236,247,0.24)",
            shadow: "#FF8BC2",
        },
        diamondBoy: {
            background: "#C9D3E2",
            backgroundDeep: "#8592A8",
            crystal: "rgba(255,255,255,0.45)",
            crystalSecondary: "rgba(255,215,0,0.16)",
            border: "#D4AF37",
            borderSoft: "#FFF1A8",
            accent: "#735A0B",
            text: "#172033",
            textSoft: "#3E4A5F",
            arrow: "#D4AF37",
            sparkle: "#FFFFFF",
            sparkleAlt: "#FFF5B5",
            avatarBackground: "rgba(255,255,255,0.36)",
            shadow: "#D4AF37",
        },
        diamondGirl: {
            background: "#E7A2C3",
            backgroundDeep: "#AA4E7A",
            crystal: "rgba(255,255,255,0.35)",
            crystalSecondary: "rgba(255,229,167,0.18)",
            border: "#FFD8E9",
            borderSoft: "#FFF3FA",
            accent: "#7B234E",
            text: "#3E1028",
            textSoft: "#682D4A",
            arrow: "#FFD5E7",
            sparkle: "#FFFFFF",
            sparkleAlt: "#FFF0B8",
            avatarBackground: "rgba(255,255,255,0.28)",
            shadow: "#FF9FC8",
        },
    };

    const jewel = jewelThemes[currentAvatarId] || jewelThemes.basicBlue;

    useEffect(() => {
        if (isSubscribed) return;

        transitionAnim.setValue(0);
        glowAnim.setValue(0);
        sparkleAnim.setValue(0);
        shimmerAnim.setValue(0);
        glitterAnim.setValue(0);

        const transitionLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(700),
                Animated.timing(transitionAnim, {
                    toValue: 1,
                    duration: 650,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.delay(1500),
                Animated.timing(transitionAnim, {
                    toValue: 0,
                    duration: 550,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.delay(600),
            ])
        );

        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1300,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 1300,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        const sparkleLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(sparkleAnim, {
                    toValue: 1,
                    duration: 850,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(sparkleAnim, {
                    toValue: 0,
                    duration: 850,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        const shimmerLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(500),
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.delay(700),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );

        const glitterLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glitterAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glitterAnim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        transitionLoop.start();
        glowLoop.start();
        sparkleLoop.start();
        shimmerLoop.start();
        glitterLoop.start();

        return () => {
            transitionLoop.stop();
            glowLoop.stop();
            sparkleLoop.stop();
            shimmerLoop.stop();
            glitterLoop.stop();
        };
    }, [
        glitterAnim,
        glowAnim,
        isSubscribed,
        selectedAvatar,
        shimmerAnim,
        sparkleAnim,
        transitionAnim,
    ]);

    if (isSubscribed) return null;

    const basicAvatarStyle = {
        opacity: transitionAnim.interpolate({
            inputRange: [0, 0.55, 1],
            outputRange: [1, 0.15, 0],
        }),
        transform: [
            {
                scale: transitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.86],
                }),
            },
            {
                rotate: transitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "-7deg"],
                }),
            },
        ],
    };

    const diamondAvatarStyle = {
        opacity: transitionAnim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0.25, 1],
        }),
        transform: [
            {
                scale: transitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.72, 1.08],
                }),
            },
            {
                rotate: transitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["8deg", "0deg"],
                }),
            },
        ],
    };

    const upgradeFlashStyle = {
        opacity: transitionAnim.interpolate({
            inputRange: [0, 0.52, 0.76, 1],
            outputRange: [0, 0.92, 0.28, 0],
        }),
        transform: [
            {
                scale: transitionAnim.interpolate({
                    inputRange: [0, 0.65, 1],
                    outputRange: [0.6, 1.45, 1.8],
                }),
            },
        ],
    };

    const glowStyle = {
        opacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.22, 0.42],
        }),
        transform: [
            {
                scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.99, 1.025],
                }),
            },
        ],
    };

    const sparkleStyle = {
        opacity: sparkleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
        }),
        transform: [
            {
                scale: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.72, 1.2],
                }),
            },
            {
                rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "22deg"],
                }),
            },
        ],
    };

    const reverseSparkleStyle = {
        opacity: sparkleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.28],
        }),
        transform: [
            {
                scale: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.15, 0.72],
                }),
            },
            {
                rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["18deg", "-10deg"],
                }),
            },
        ],
    };

    const shimmerStyle = {
        opacity: shimmerAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.55, 0],
        }),
        transform: [
            {
                translateX: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-110, 380],
                }),
            },
            { rotate: "18deg" },
        ],
    };

    const glitterStyle = {
        opacity: glitterAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.22, 0.95],
        }),
        transform: [
            {
                scale: glitterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1.18],
                }),
            },
        ],
    };

    return (
        <TouchableOpacity
            style={[
                styles.supporterBenefitsCard,
                {
                    backgroundColor: jewel.background,
                    borderColor: jewel.border,
                    shadowColor: jewel.shadow,
                },
            ]}
            onPress={onOpenBlogPaywall}
            activeOpacity={0.9}
        >
            <View
                style={[
                    styles.jewelDeepLayer,
                    {
                        backgroundColor: jewel.backgroundDeep,
                        height: jewel.deepLayerHeight || "54%",
                        opacity: jewel.deepLayerOpacity ?? 0.68,
                    },
                ]}
            />

            <Animated.View
                style={[
                    styles.supporterGlow,
                    { backgroundColor: jewel.crystal },
                    glowStyle,
                ]}
            />

            <View
                style={[
                    styles.crystalShard,
                    styles.crystalShardOne,
                    { backgroundColor: jewel.crystal },
                ]}
            />
            <View
                style={[
                    styles.crystalShard,
                    styles.crystalShardTwo,
                    { backgroundColor: jewel.crystalSecondary },
                ]}
            />
            <View
                style={[
                    styles.crystalShard,
                    styles.crystalShardThree,
                    { backgroundColor: jewel.crystal },
                ]}
            />

            <Animated.View
                pointerEvents="none"
                style={[
                    styles.jewelShimmer,
                    { backgroundColor: jewel.borderSoft },
                    shimmerStyle,
                ]}
            />

            <Animated.Text
                pointerEvents="none"
                style={[
                    styles.glitterParticle,
                    styles.glitterTopLeft,
                    { color: jewel.sparkle },
                    glitterStyle,
                ]}
            >
                ✨
            </Animated.Text>
            <Animated.Text
                pointerEvents="none"
                style={[
                    styles.glitterParticle,
                    styles.glitterTopCenter,
                    { color: jewel.sparkleAlt },
                    reverseSparkleStyle,
                ]}
            >
                ✦
            </Animated.Text>
            <Animated.Text
                pointerEvents="none"
                style={[
                    styles.glitterParticle,
                    styles.glitterBottomCenter,
                    { color: jewel.sparkle },
                    glitterStyle,
                ]}
            >
                ◆
            </Animated.Text>
            <Animated.Text
                pointerEvents="none"
                style={[
                    styles.glitterParticle,
                    styles.glitterTopRight,
                    { color: jewel.sparkleAlt },
                    reverseSparkleStyle,
                ]}
            >
                ✨
            </Animated.Text>
            <Animated.Text
                pointerEvents="none"
                style={[
                    styles.glitterParticle,
                    styles.glitterBottomRight,
                    { color: jewel.sparkle },
                    glitterStyle,
                ]}
            >
                ✦
            </Animated.Text>

            <View
                style={[
                    styles.avatarUpgradeWrap,
                    {
                        backgroundColor: jewel.avatarBackground,
                        borderColor: jewel.borderSoft,
                    },
                ]}
            >
                <Animated.Image
                    source={currentAvatarSource}
                    style={[styles.upgradeAvatarImage, basicAvatarStyle]}
                    resizeMode="cover"
                    fadeDuration={0}
                />

                <Animated.Image
                    source={upgradedAvatarSource}
                    style={[
                        styles.upgradeAvatarImage,
                        styles.absoluteAvatar,
                        diamondAvatarStyle,
                    ]}
                    resizeMode="cover"
                    fadeDuration={0}
                />

                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.upgradeFlash,
                        { backgroundColor: jewel.sparkleAlt },
                        upgradeFlashStyle,
                    ]}
                />

                <Animated.Text
                    style={[
                        styles.supporterSparkle,
                        { color: jewel.sparkle },
                        sparkleStyle,
                    ]}
                >
                    ✦
                </Animated.Text>
            </View>

            <View style={styles.supporterBenefitsContent}>
                <Text
                    style={[
                        styles.supporterBenefitsEyebrow,
                        { color: jewel.eyebrowText || jewel.accent },
                    ]}
                >
                    STAND OUT FROM THE CROWD
                </Text>

                <Text
                    style={[
                        styles.supporterBenefitsTitle,
                        { color: jewel.titleText || jewel.text },
                    ]}
                    numberOfLines={1}
                >
                    Subscribe NOW 💎
                </Text>

                <Text
                    style={[
                        styles.supporterBenefitsSubtitle,
                        { color: jewel.subtitleText || jewel.textSoft },
                    ]}
                    numberOfLines={1}
                >
                    Make your Dumps Shine 🗑️✨
                </Text>
            </View>

            <View
                style={[
                    styles.supporterArrow,
                    {
                        backgroundColor: jewel.arrow,
                        borderColor: jewel.borderSoft,
                    },
                ]}
            >
                <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={jewel.arrowIcon || jewel.text}
                />
            </View>
        </TouchableOpacity>
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

    supporterBenefitsCard: {
        minHeight: 88,
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 13,
        marginBottom: 16,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },

    supporterGlow: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        borderRadius: 20,
    },

    avatarUpgradeWrap: {
        width: 54,
        height: 54,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 11,
        overflow: "hidden",
        shadowColor: "#FFFFFF",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 3,
    },

    upgradeAvatarImage: {
        width: 50,
        height: 50,
        borderRadius: 16,
    },

    absoluteAvatar: {
        position: "absolute",
    },

    upgradeFlash: {
        position: "absolute",
        width: 28,
        height: 28,
        borderRadius: 14,
    },

    supporterSparkle: {
        position: "absolute",
        right: 2,
        top: -1,
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
    },

    supporterBenefitsContent: {
        flex: 1,
        paddingRight: 8,
    },

    supporterBenefitsEyebrow: {
        fontSize: 9.5,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1,
        marginBottom: 2,
    },

    supporterBenefitsTitle: {
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
    },

    supporterBenefitsSubtitle: {
        fontSize: 10.5,
        fontWeight: "700",
        marginTop: 3,
    },

    supporterArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FFFFFF",
        shadowOpacity: 0.24,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 0 },
        elevation: 3,
    },

    jewelDeepLayer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "54%",
        opacity: 0.68,
    },

    crystalShard: {
        position: "absolute",
        borderRadius: 16,
        opacity: 0.72,
    },

    crystalShardOne: {
        width: 120,
        height: 52,
        right: 66,
        top: -23,
        transform: [{ rotate: "19deg" }],
    },

    crystalShardTwo: {
        width: 90,
        height: 48,
        left: 82,
        bottom: -29,
        transform: [{ rotate: "-16deg" }],
    },

    crystalShardThree: {
        width: 62,
        height: 92,
        right: -19,
        bottom: -35,
        transform: [{ rotate: "31deg" }],
    },

    jewelShimmer: {
        position: "absolute",
        top: -30,
        bottom: -30,
        width: 54,
        opacity: 0.34,
    },

    glitterParticle: {
        position: "absolute",
        zIndex: 8,
        textShadowColor: "rgba(255,255,255,0.75)",
        textShadowRadius: 7,
    },

    glitterTopLeft: {
        left: 7,
        top: 3,
        fontSize: 11,
    },

    glitterTopCenter: {
        left: "43%",
        top: 4,
        fontSize: 9,
    },

    glitterTopRight: {
        right: 8,
        top: 5,
        fontSize: 10,
    },

    glitterBottomCenter: {
        left: "59%",
        bottom: 4,
        fontSize: 8,
    },

    glitterBottomRight: {
        right: 51,
        bottom: 4,
        fontSize: 10,
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
