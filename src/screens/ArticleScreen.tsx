import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import * as WebBrowser from "expo-web-browser";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import YoutubePlayer from "react-native-youtube-iframe";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { finishTransaction } from "react-native-iap";
import ConfettiCannon from "react-native-confetti-cannon";
import BlogsPaywallModal from "../components/BlogsPaywallModal";
import {
    initializeIAP,
    getBlogsSubscriptionProduct,
    buyBlogsSubscription,
    setupPurchaseListeners,
    cleanupIAP,
} from "../services/iap";

type TimeTheme = "day" | "night";

type PostBlock = {
    _id: string;
    post_id: string;
    block_type:
    | "header"
    | "subheader"
    | "paragraph"
    | "image"
    | "video"
    | "caption"
    | "quote"
    | "pgn"
    | "link";
    input: string;
    order_index: number;
    created_at?: string;
    updated_at?: string;
};

type Post = {
    _id: string;
    title: string;
    summary: string;
    cover_image_url: string;
    author?: string;
    category?: string;
    slug: string;
    published_at: string | null;
    created_at: string;
    content_type?: string;
    blocks?: PostBlock[];
};

type ArticleRouteParams = {
    ArticleScreen: {
        slug: string;
    };
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getArticleTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            bg: "#F8FAFC",
            card: "#FFFFFF",
            cardAlt: "#F1F5F9",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border: "rgba(7,17,31,0.10)",
            borderStrong: "rgba(6,182,212,0.28)",
            cyan: "#06B6D4",
            cyanSoft: "rgba(6,182,212,0.10)",
            yellow: "#FACC15",
            shadow: "#06B6D4",
            icon: "#07111F",
            previewBg: "#000000",
        };
    }

    return {
        bg: "#020617",
        card: "#090D14",
        cardAlt: "#050A10",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.10)",
        borderStrong: "rgba(34,211,238,0.30)",
        cyan: "#22D3EE",
        cyanSoft: "rgba(34,211,238,0.10)",
        yellow: "#FACC15",
        shadow: "#22D3EE",
        icon: "#FFFFFF",
        previewBg: "#000000",
    };
};

function FadeInBlock({
    index,
    children,
}: {
    index: number;
    children: React.ReactNode;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(22)).current;
    const scale = useRef(new Animated.Value(0.985)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 560,
                delay: index * 75,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 560,
                delay: index * 75,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 1,
                duration: 560,
                delay: index * 75,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, opacity, scale, translateY]);

    return (
        <Animated.View
            style={{
                opacity,
                transform: [{ translateY }, { scale }],
            }}
        >
            {children}
        </Animated.View>
    );
}

export default function ArticleScreen() {
    const route = useRoute<RouteProp<ArticleRouteParams, "ArticleScreen">>();
    const navigation = useNavigation<any>();
    const { slug } = route.params;

    const [themeMode, setThemeMode] = useState<TimeTheme>(getCurrentThemeMode());
    const theme = getArticleTheme(themeMode);

    const [post, setPost] = useState<Post | null>(null);
    const [blocks, setBlocks] = useState<PostBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rippleAnim1 = useRef(new Animated.Value(0)).current;
    const rippleAnim2 = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);
    const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const rippleLoop1Ref = useRef<Animated.CompositeAnimation | null>(null);
    const rippleLoop2Ref = useRef<Animated.CompositeAnimation | null>(null);
    const rippleDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    const screenFade = useRef(new Animated.Value(0)).current;
    const heroFade = useRef(new Animated.Value(0)).current;
    const heroTranslate = useRef(new Animated.Value(18)).current;
    const headerFade = useRef(new Animated.Value(0)).current;
    const headerTranslate = useRef(new Animated.Value(18)).current;

    const updateStoredSubscriptionState = useCallback(
        async (subscribed: boolean) => {
            const storedUserRaw = await AsyncStorage.getItem("user");
            if (!storedUserRaw) return;

            try {
                const storedUser = JSON.parse(storedUserRaw);

                await AsyncStorage.setItem(
                    "user",
                    JSON.stringify({
                        ...storedUser,
                        isSubscribed: subscribed,
                    }),
                );
            } catch (error) {
                console.log("Stored subscription update error:", error);
            }
        },
        [],
    );

    const fetchEntitlements = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token || !API_BASE_URL) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok && data?.success) {
                const subscribed = !!data?.entitlements?.isSubscribed;
                setIsSubscribed(subscribed);
                await updateStoredSubscriptionState(subscribed);
            }
        } catch (error) {
            console.log("Article entitlement fetch error:", error);
        }
    }, [updateStoredSubscriptionState]);

    const loadSubscriptionProduct = async () => {
        try {
            await initializeIAP();
            const product = await getBlogsSubscriptionProduct();
            setSubscriptionProduct(product);
        } catch (error) {
            console.log("Article subscription load error:", error);
        }
    };

    const verifySubscriptionOnBackend = useCallback(
        async (purchase: any) => {
            try {
                const token = await AsyncStorage.getItem("token");

                if (!token || !API_BASE_URL) {
                    throw new Error("Missing token or API base URL");
                }

                const response = await fetch(
                    `${API_BASE_URL}/api/subscriptions/verify`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            platform: Platform.OS === "ios" ? "ios" : "android",
                            productId:
                                purchase?.productId || purchase?.productIdIOS || "sfs_399_2y",
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
                    },
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.message || "Failed to verify subscription");
                }

                await finishTransaction({
                    purchase,
                    isConsumable: false,
                });

                const subscribed = !!data?.isSubscribed;
                setIsSubscribed(subscribed);
                setPaywallVisible(false);
                await updateStoredSubscriptionState(subscribed);
                await fetchEntitlements();

                if (subscribed) {
                    setShowConfetti(true);
                    Alert.alert(
                        "Narration Unlocked 🎉",
                        "AI narration is now available for every article.",
                    );
                }
            } catch (error) {
                console.log("Article subscription verification error:", error);

                Alert.alert(
                    "Purchase Complete",
                    "Your purchase was received, but it could not be verified with your account.",
                );
            } finally {
                setLoadingSubscription(false);
            }
        },
        [fetchEntitlements, updateStoredSubscriptionState],
    );

    const handleSubscribePress = async () => {
        try {
            setLoadingSubscription(true);
            await initializeIAP();
            await buyBlogsSubscription();
        } catch (error) {
            setLoadingSubscription(false);
            console.log("Article subscription request error:", error);

            Alert.alert(
                "Subscription Failed",
                "Something went wrong while starting the subscription.",
            );
        }
    };

    const openNarrationPaywall = () => {
        setPaywallVisible(true);
        void loadSubscriptionProduct();
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setThemeMode(getCurrentThemeMode());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        void fetchEntitlements();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async (purchase: any) => {
                await verifySubscriptionOnBackend(purchase);
            },
            onPurchaseError: (error: any) => {
                setLoadingSubscription(false);
                console.log("Article subscription listener error:", error);
            },
        });

        return () => {
            void cleanupIAP();
        };
    }, [fetchEntitlements, verifySubscriptionOnBackend]);

    useEffect(() => {
        Animated.sequence([
            Animated.timing(screenFade, {
                toValue: 1,
                duration: 280,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(heroFade, {
                    toValue: 1,
                    duration: 620,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(heroTranslate, {
                    toValue: 0,
                    duration: 620,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(headerFade, {
                    toValue: 1,
                    duration: 640,
                    delay: 130,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(headerTranslate, {
                    toValue: 0,
                    duration: 640,
                    delay: 130,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, [headerFade, headerTranslate, heroFade, heroTranslate, screenFade]);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                setLoading(true);

                const postResponse = await fetch(
                    `${API_BASE_URL}/api/posts/slug/${slug}`,
                );
                const postJson = await postResponse.json();

                const fetchedPost: Post = postJson;
                const fetchedBlocks: PostBlock[] = (postJson.blocks || []).sort(
                    (a: PostBlock, b: PostBlock) => a.order_index - b.order_index,
                );

                setPost(fetchedPost);
                setBlocks(fetchedBlocks);
            } catch (error) {
                console.log("Error fetching article:", error);
                Alert.alert("Error", "Failed to load article.");
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [slug]);

    const displayDate = useMemo(() => {
        if (!post) return "";
        const sourceDate = post.published_at || post.created_at;
        return new Date(sourceDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }, [post]);

    const articleSpeechText = useMemo(() => {
        if (!post) return "";

        const readableBlocks = blocks
            .filter((block) =>
                ["header", "subheader", "paragraph", "caption", "quote"].includes(
                    block.block_type,
                ),
            )
            .map((block) => block.input?.trim())
            .filter(Boolean);

        return readableBlocks.join(". ");
    }, [post, blocks]);

    const isPlaying = !!playerStatus?.playing;

    const handleShare = async () => {
        if (!post) return;

        try {
            await Share.share({
                title: post.title,
                message: `${post.title}\n\n${post.summary}\n\nRead on ScoolFools`,
            });
        } catch (error) {
            console.log("Share error:", error);
        }
    };

    const normalizeUrl = (rawUrl: string) => {
        const trimmed = rawUrl.trim();

        if (!trimmed) return "";

        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }

        if (
            trimmed.includes("youtube.com/") ||
            trimmed.includes("youtu.be/") ||
            trimmed.includes("www.youtube.com/") ||
            trimmed.includes("m.youtube.com/")
        ) {
            return `https://${trimmed}`;
        }

        if (trimmed.startsWith("www.")) {
            return `https://${trimmed}`;
        }

        return trimmed;
    };

    const openExternalLink = async (rawUrl: string) => {
        try {
            const url = normalizeUrl(rawUrl);

            if (!url) {
                Alert.alert("Invalid link", "This link is empty.");
                return;
            }

            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            console.log("Could not open link:", error);
            Alert.alert("Error", "Could not open link.");
        }
    };

    const getYoutubeId = (rawUrl: string) => {
        try {
            const url = normalizeUrl(rawUrl);

            if (url.includes("youtube.com/shorts/")) {
                return url.split("shorts/")[1]?.split("?")[0] || null;
            }

            if (url.includes("youtube.com/watch?v=")) {
                return url.split("v=")[1]?.split("&")[0] || null;
            }

            if (url.includes("youtu.be/")) {
                return url.split("youtu.be/")[1]?.split("?")[0] || null;
            }

            return null;
        } catch {
            return null;
        }
    };

    const stopSpeakingAnimation = () => {
        pulseLoopRef.current?.stop();
        rippleLoop1Ref.current?.stop();
        rippleLoop2Ref.current?.stop();

        if (rippleDelayTimeoutRef.current) {
            clearTimeout(rippleDelayTimeoutRef.current);
            rippleDelayTimeoutRef.current = null;
        }

        pulseAnim.stopAnimation();
        rippleAnim1.stopAnimation();
        rippleAnim2.stopAnimation();

        pulseAnim.setValue(1);
        rippleAnim1.setValue(0);
        rippleAnim2.setValue(0);
    };

    const startSpeakingAnimation = () => {
        stopSpeakingAnimation();

        pulseLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );

        rippleLoop1Ref.current = Animated.loop(
            Animated.sequence([
                Animated.timing(rippleAnim1, {
                    toValue: 1,
                    duration: 1600,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(rippleAnim1, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ]),
        );

        rippleLoop2Ref.current = Animated.loop(
            Animated.sequence([
                Animated.timing(rippleAnim2, {
                    toValue: 1,
                    duration: 1600,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(rippleAnim2, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ]),
        );

        pulseLoopRef.current.start();
        rippleLoop1Ref.current.start();

        rippleDelayTimeoutRef.current = setTimeout(() => {
            rippleLoop2Ref.current?.start();
        }, 450);
    };

    useEffect(() => {
        if (isPlaying) {
            startSpeakingAnimation();
        } else {
            stopSpeakingAnimation();
        }
    }, [isPlaying]);

    useEffect(() => {
        return () => {
            stopSpeakingAnimation();
        };
    }, []);

    useEffect(() => {
        try {
            if (playerStatus?.playing) {
                player.pause();
            }
        } catch (error) {
            console.log("Player slug cleanup pause skipped:", error);
        }

        setCurrentAudioUrl(null);
        stopSpeakingAnimation();
    }, [slug]);

    const handleToggleNarration = async () => {
        if (!post) return;

        if (!isSubscribed) {
            openNarrationPaywall();
            return;
        }

        if (isPlaying) {
            try {
                player.pause();
            } catch (error) {
                console.log("Pause failed:", error);
            }
            return;
        }

        try {
            setIsGeneratingNarration(true);

            const token = await AsyncStorage.getItem("token");

            if (!token) {
                throw new Error("Your session has expired. Please sign in again.");
            }

            const response = await fetch(`${API_BASE_URL}/api/article-narration`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    slug: post.slug,
                    title: post.title,
                    summary: post.summary,
                    text: articleSpeechText,
                }),
            });

            const json = await response.json();

            if (!response.ok || !json.audioUrl) {
                throw new Error(json?.error || "Narration generation failed.");
            }

            const fullAudioUrl = json.audioUrl.startsWith("http")
                ? json.audioUrl
                : `${API_BASE_URL}${json.audioUrl}`;

            setCurrentAudioUrl(fullAudioUrl);

            player.replace(fullAudioUrl);
            player.play();
        } catch (error) {
            console.log("Narration error:", error);
            Alert.alert("Error", "Could not play article narration.");
        } finally {
            setIsGeneratingNarration(false);
        }
    };

    const renderBlock = (block: PostBlock) => {
        switch (block.block_type) {
            case "header":
                return (
                    <Text
                        style={[
                            styles.blockHeader,
                            {
                                color: theme.text,
                                textShadowColor:
                                    themeMode === "night"
                                        ? "rgba(34,211,238,0.25)"
                                        : "transparent",
                            },
                        ]}
                    >
                        {block.input}
                    </Text>
                );

            case "subheader":
                return (
                    <Text style={[styles.subheader, { color: theme.text }]}>
                        {block.input}
                    </Text>
                );

            case "paragraph":
                return (
                    <Text style={[styles.paragraph, { color: theme.textSoft }]}>
                        {block.input}
                    </Text>
                );

            case "image":
                return (
                    <Pressable
                        style={[
                            styles.mediaBlock,
                            {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.borderStrong,
                            },
                        ]}
                        onPress={() => setPreviewImage(block.input)}
                    >
                        <Image
                            source={{ uri: block.input }}
                            style={[styles.blockImage, { backgroundColor: theme.cardAlt }]}
                            resizeMode="contain"
                            onError={() => console.log("Block image failed:", block.input)}
                        />
                    </Pressable>
                );

            case "caption":
                return (
                    <Text style={[styles.caption, { color: theme.muted }]}>
                        {block.input}
                    </Text>
                );

            case "quote":
                return (
                    <View
                        style={[
                            styles.quoteContainer,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.borderStrong,
                                shadowColor: theme.shadow,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.quoteAccent,
                                {
                                    backgroundColor: theme.cyan,
                                    shadowColor: theme.cyan,
                                },
                            ]}
                        />
                        <Text style={[styles.quoteText, { color: theme.text }]}>
                            {block.input}
                        </Text>
                    </View>
                );

            case "link":
                return (
                    <Pressable
                        style={[
                            styles.linkCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.borderStrong,
                            },
                        ]}
                        onPress={() => openExternalLink(block.input)}
                    >
                        <Ionicons name="link-outline" size={18} color={theme.cyan} />
                        <Text
                            style={[styles.linkText, { color: theme.text }]}
                            numberOfLines={1}
                        >
                            {block.input}
                        </Text>
                    </Pressable>
                );

            case "pgn":
                return (
                    <View
                        style={[
                            styles.pgnContainer,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.borderStrong,
                            },
                        ]}
                    >
                        <Text style={[styles.pgnLabel, { color: theme.cyan }]}>PGN</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <Text style={[styles.pgnText, { color: theme.textSoft }]}>
                                {block.input}
                            </Text>
                        </ScrollView>
                    </View>
                );

            case "video": {
                const youtubeId = getYoutubeId(block.input);

                if (!youtubeId) {
                    return (
                        <Pressable
                            style={[
                                styles.videoPreviewCard,
                                {
                                    backgroundColor: theme.cardAlt,
                                    borderColor: theme.borderStrong,
                                },
                            ]}
                            onPress={() => openExternalLink(block.input)}
                        >
                            <View
                                style={[
                                    styles.videoFallback,
                                    { backgroundColor: theme.cardAlt },
                                ]}
                            >
                                <Ionicons
                                    name="play-circle-outline"
                                    size={42}
                                    color={theme.icon}
                                />
                                <Text style={[styles.videoOverlayText, { color: theme.text }]}>
                                    OPEN VIDEO
                                </Text>
                            </View>
                        </Pressable>
                    );
                }

                return (
                    <View
                        style={[
                            styles.articleVideoCard,
                            {
                                backgroundColor: "#000000",
                                borderColor: theme.borderStrong,
                            },
                        ]}
                    >
                        <YoutubePlayer
                            height={vs(210)}
                            width={s(340)}
                            videoId={youtubeId}
                            play={false}
                            webViewStyle={styles.youtubeWebView}
                            initialPlayerParams={{
                                controls: true,
                                modestbranding: true,
                                rel: false,
                                playsinline: true,
                            }}
                        />
                    </View>
                );
            }

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
                <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
                    <View
                        style={[
                            styles.loadingOrb,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.borderStrong,
                                shadowColor: theme.shadow,
                            },
                        ]}
                    >
                        <ActivityIndicator size="small" color={theme.cyan} />
                    </View>
                    <Text style={[styles.loadingText, { color: theme.cyan }]}>
                        Loading article feed...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
                <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
                    <Text style={[styles.errorText, { color: theme.text }]}>
                        Article not found.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={["top"]}
            style={[styles.safeArea, { backgroundColor: theme.bg }]}
        >
            <Animated.View
                style={[
                    styles.screen,
                    {
                        opacity: screenFade,
                        backgroundColor: theme.bg,
                    },
                ]}
            >
                <ScrollView
                    ref={scrollRef}
                    style={[styles.container, { backgroundColor: theme.bg }]}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.topRow}>
                        <View style={styles.leftActions}>
                            <Pressable
                                style={[
                                    styles.backButton,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: theme.borderStrong,
                                        shadowColor: theme.shadow,
                                    },
                                ]}
                                onPress={() => navigation.goBack()}
                            >
                                <Ionicons name="arrow-back" size={20} color={theme.icon} />
                            </Pressable>

                            {!!post.category && (
                                <View
                                    style={[
                                        styles.categoryChip,
                                        {
                                            backgroundColor: theme.card,
                                            borderColor: theme.borderStrong,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[styles.categoryChipText, { color: theme.cyan }]}
                                    >
                                        {post.category}
                                    </Text>
                                </View>
                            )}

                            {!!post.content_type && (
                                <View
                                    style={[
                                        styles.typeChip,
                                        {
                                            backgroundColor: theme.card,
                                            borderColor: theme.border,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.typeChipText, { color: theme.text }]}>
                                        {post.content_type}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Pressable
                            style={[
                                styles.shareButton,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.border,
                                },
                            ]}
                            onPress={handleShare}
                        >
                            <Ionicons
                                name="share-social-outline"
                                size={18}
                                color={theme.icon}
                            />
                        </Pressable>
                    </View>

                    {!!post.cover_image_url && (
                        <Animated.View
                            style={[
                                styles.heroShell,
                                {
                                    opacity: heroFade,
                                    transform: [{ translateY: heroTranslate }],
                                },
                            ]}
                        >
                            <Image
                                source={{ uri: post.cover_image_url }}
                                style={[
                                    styles.heroImage,
                                    {
                                        backgroundColor: theme.cardAlt,
                                        borderColor: theme.borderStrong,
                                    },
                                ]}
                                resizeMode="contain"
                            />
                            <View
                                pointerEvents="none"
                                style={[
                                    styles.heroGlow,
                                    {
                                        backgroundColor:
                                            themeMode === "day"
                                                ? "rgba(6,182,212,0.10)"
                                                : "rgba(34,211,238,0.11)",
                                    },
                                ]}
                            />
                        </Animated.View>
                    )}

                    <Animated.View
                        style={[
                            styles.headerSection,
                            {
                                opacity: headerFade,
                                transform: [{ translateY: headerTranslate }],
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: theme.text,
                                    textShadowColor:
                                        themeMode === "night"
                                            ? "rgba(34,211,238,0.35)"
                                            : "transparent",
                                },
                            ]}
                        >
                            {post.title}
                        </Text>

                        {!!post.summary && (
                            <Text style={[styles.summary, { color: theme.textSoft }]}>
                                {post.summary}
                            </Text>
                        )}

                        <View
                            style={[
                                styles.metaCard,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name="person-circle-outline"
                                size={17}
                                color={theme.cyan}
                            />
                            <Text style={[styles.metaText, { color: theme.muted }]}>
                                {post.author || "ScoolFools"} · {displayDate}
                            </Text>
                        </View>

                        <Pressable
                            onPress={handleToggleNarration}
                            style={({ pressed }) => [
                                styles.aiChip,
                                {
                                    backgroundColor: theme.cyanSoft,
                                    borderColor: theme.borderStrong,
                                },
                                isPlaying && {
                                    backgroundColor: theme.cyanSoft,
                                    borderColor: theme.cyan,
                                    shadowColor: theme.shadow,
                                },
                                pressed && styles.aiChipPressed,
                            ]}
                        >
                            {isGeneratingNarration ? (
                                <ActivityIndicator color={theme.cyan} size="small" />
                            ) : (
                                <Ionicons
                                    name={
                                        !isSubscribed
                                            ? "lock-closed-outline"
                                            : isPlaying
                                                ? "volume-high"
                                                : "sparkles-outline"
                                    }
                                    size={14}
                                    color={theme.cyan}
                                />
                            )}

                            <Text style={[styles.aiDisclosure, { color: theme.cyan }]}>
                                {isGeneratingNarration
                                    ? "Preparing narration..."
                                    : !isSubscribed
                                        ? "Unlock AI narration"
                                        : isPlaying
                                            ? "Narration playing"
                                            : "Tap for AI narration"}
                            </Text>
                        </Pressable>
                    </Animated.View>

                    <View style={styles.articleBody}>
                        {blocks.map((block, index) => (
                            <FadeInBlock key={block._id} index={index + 4}>
                                {renderBlock(block)}
                            </FadeInBlock>
                        ))}
                    </View>
                </ScrollView>

                {previewImage && (
                    <View style={styles.imagePreviewOverlay}>
                        <Pressable
                            style={styles.closePreview}
                            onPress={() => setPreviewImage(null)}
                        >
                            <Ionicons name="close" size={30} color="#FFFFFF" />
                        </Pressable>

                        <ScrollView
                            style={{ flex: 1, width: "100%" }}
                            contentContainerStyle={styles.zoomContainer}
                            maximumZoomScale={3}
                            minimumZoomScale={1}
                            centerContent
                        >
                            <Image
                                source={{ uri: previewImage }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        </ScrollView>
                    </View>
                )}

                <Pressable
                    onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                    style={[
                        styles.scrollTopArrow,
                        {
                            backgroundColor:
                                themeMode === "day"
                                    ? "rgba(255,255,255,0.92)"
                                    : "rgba(5,10,16,0.82)",
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Ionicons name="arrow-up" size={24} color={theme.icon} />
                </Pressable>

                <Animated.View
                    style={[
                        styles.ttsButtonWrapper,
                        {
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                >
                    {isPlaying && (
                        <>
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.ttsRipple,
                                    {
                                        backgroundColor: theme.cyan,
                                        opacity: rippleAnim1.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.35, 0],
                                        }),
                                        transform: [
                                            {
                                                scale: rippleAnim1.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [1, 1.9],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            />
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.ttsRipple,
                                    {
                                        backgroundColor: theme.cyan,
                                        opacity: rippleAnim2.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.24, 0],
                                        }),
                                        transform: [
                                            {
                                                scale: rippleAnim2.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [1, 2.15],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            />
                        </>
                    )}

                    <Pressable
                        onPress={handleToggleNarration}
                        style={({ pressed }) => [
                            styles.ttsButton,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.borderStrong,
                                shadowColor: theme.shadow,
                            },
                            (isPlaying || isGeneratingNarration) && {
                                backgroundColor: themeMode === "day" ? theme.cyan : "#06202B",
                                borderColor: theme.cyan,
                            },
                            pressed && styles.ttsButtonPressed,
                        ]}
                    >
                        {isGeneratingNarration ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Ionicons
                                name={
                                    !isSubscribed
                                        ? "lock-closed"
                                        : isPlaying
                                            ? "volume-high"
                                            : "volume-medium"
                                }
                                size={24}
                                color={
                                    isPlaying || themeMode === "night" ? "#FFFFFF" : theme.icon
                                }
                            />
                        )}
                    </Pressable>
                </Animated.View>
            </Animated.View>

            <BlogsPaywallModal
                visible={paywallVisible}
                onClose={() => setPaywallVisible(false)}
                onSubscribe={handleSubscribePress}
                loading={loadingSubscription}
                localizedPrice={subscriptionProduct?.localizedPrice ?? null}
                billingPeriodLabel="every 6 months"
                buttonLabel="Unlock AI Narration"
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

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    screen: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: Platform.OS === "android" ? vs(190) : vs(120),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingOrb: {
        width: s(54),
        height: s(54),
        borderRadius: s(27),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    loadingText: {
        fontSize: ms(12),
        fontWeight: "800",
        marginTop: vs(12),
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    errorText: {
        fontSize: ms(16),
        fontWeight: "700",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: s(16),
        paddingTop: vs(6),
        paddingBottom: vs(12),
    },
    leftActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(8),
        flexShrink: 1,
    },
    backButton: {
        width: s(39),
        height: s(39),
        borderRadius: s(19.5),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    },
    categoryChip: {
        borderWidth: 1,
        paddingHorizontal: s(12),
        paddingVertical: vs(6),
        borderRadius: s(999),
    },
    categoryChipText: {
        fontSize: ms(11.5),
        fontWeight: "900",
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    typeChip: {
        borderWidth: 1,
        paddingHorizontal: s(12),
        paddingVertical: vs(6),
        borderRadius: s(999),
    },
    typeChipText: {
        fontSize: ms(11.5),
        fontWeight: "800",
        textTransform: "capitalize",
        letterSpacing: 0.5,
    },
    shareButton: {
        width: s(39),
        height: s(39),
        borderRadius: s(19.5),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    heroShell: {
        width: "100%",
        paddingHorizontal: s(12),
        marginTop: vs(2),
        marginBottom: vs(4),
    },
    heroImage: {
        width: "100%",
        height: vs(255),
        borderRadius: s(22),
        borderWidth: 1,
    },
    heroGlow: {
        position: "absolute",
        left: s(26),
        right: s(26),
        bottom: -vs(8),
        height: vs(20),
        borderRadius: s(999),
    },
    headerSection: {
        paddingHorizontal: s(17),
        paddingTop: vs(18),
    },
    title: {
        fontSize: ms(30),
        lineHeight: ms(37),
        fontWeight: "900",
        marginBottom: vs(11),
        letterSpacing: 0.35,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 14,
    },
    summary: {
        fontSize: ms(15.5),
        lineHeight: ms(24),
        marginBottom: vs(14),
        fontWeight: "500",
    },
    metaCard: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: s(999),
        paddingHorizontal: s(11),
        paddingVertical: vs(7),
        marginBottom: vs(8),
        gap: s(6),
    },
    metaText: {
        fontSize: ms(12),
        fontWeight: "700",
    },
    aiChip: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: s(999),
        paddingHorizontal: s(10),
        paddingVertical: vs(6),
        gap: s(6),
    },
    aiDisclosure: {
        fontSize: ms(10.5),
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    articleBody: {
        paddingHorizontal: s(17),
        paddingTop: vs(18),
    },
    blockHeader: {
        fontSize: ms(24),
        lineHeight: ms(31),
        fontWeight: "900",
        marginTop: vs(22),
        marginBottom: vs(11),
        letterSpacing: 0.35,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subheader: {
        fontSize: ms(20),
        lineHeight: ms(27),
        fontWeight: "900",
        marginTop: vs(20),
        marginBottom: vs(10),
        letterSpacing: 0.25,
    },
    paragraph: {
        fontSize: ms(16.2),
        lineHeight: ms(28),
        marginBottom: vs(16),
        fontWeight: "500",
        letterSpacing: 0.1,
    },
    mediaBlock: {
        marginTop: vs(14),
        marginBottom: vs(10),
        borderRadius: s(20),
        overflow: "hidden",
        borderWidth: 1,
    },
    blockImage: {
        width: "100%",
        height: vs(250),
        borderRadius: s(20),
    },
    caption: {
        fontSize: ms(12.5),
        lineHeight: ms(18),
        marginBottom: vs(15),
        marginTop: vs(5),
        fontWeight: "600",
    },
    quoteContainer: {
        flexDirection: "row",
        borderRadius: s(20),
        paddingVertical: vs(15),
        paddingHorizontal: s(15),
        marginVertical: vs(13),
        borderWidth: 1,
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    },
    quoteAccent: {
        width: s(4),
        borderRadius: s(999),
        marginRight: s(12),
        shadowOpacity: 0.7,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
    },
    quoteText: {
        flex: 1,
        fontSize: ms(16),
        lineHeight: ms(25),
        fontStyle: "italic",
        fontWeight: "700",
    },
    pgnContainer: {
        borderRadius: s(20),
        padding: s(14),
        marginVertical: vs(13),
        borderWidth: 1,
    },
    pgnLabel: {
        fontSize: ms(12),
        fontWeight: "900",
        marginBottom: vs(8),
        letterSpacing: 1,
    },
    pgnText: {
        fontSize: ms(13),
        lineHeight: ms(20),
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    linkCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(8),
        borderWidth: 1,
        borderRadius: s(18),
        paddingHorizontal: s(14),
        paddingVertical: vs(13),
        marginVertical: vs(11),
    },
    linkText: {
        flex: 1,
        fontSize: ms(14),
        fontWeight: "800",
    },
    imagePreviewOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    previewImage: {
        width: "100%",
        height: vs(500),
    },
    zoomContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    closePreview: {
        position: "absolute",
        top: 60,
        right: 20,
        zIndex: 10,
    },
    videoPreviewCard: {
        height: vs(225),
        borderRadius: s(20),
        overflow: "hidden",
        marginVertical: vs(13),
        position: "relative",
        borderWidth: 1,
    },
    videoOverlayText: {
        fontSize: ms(11),
        fontWeight: "900",
        letterSpacing: 1.5,
        marginTop: vs(5),
    },
    videoFallback: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    ttsButtonWrapper: {
        position: "absolute",
        right: s(20),
        bottom: Platform.OS === "android" ? vs(86) : vs(24),
        width: s(64),
        height: s(64),
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    ttsButton: {
        width: s(60),
        height: s(60),
        borderRadius: s(30),
        borderWidth: 1.5,
        justifyContent: "center",
        alignItems: "center",
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    ttsButtonPressed: {
        opacity: 0.88,
        transform: [{ scale: 0.97 }],
    },
    ttsRipple: {
        position: "absolute",
        width: s(60),
        height: s(60),
        borderRadius: s(30),
    },
    scrollTopArrow: {
        position: "absolute",
        left: s(22),
        bottom: Platform.OS === "android" ? vs(100) : vs(36),
        zIndex: 999,
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    aiChipPressed: {
        opacity: 0.75,
        transform: [{ scale: 0.98 }],
    },
    articleVideoCard: {
        width: "100%",
        height: vs(210),
        borderRadius: s(18),
        overflow: "hidden",
        marginVertical: vs(13),
        borderWidth: 1,
    },
    youtubeWebView: {
        backgroundColor: "#000000",
    },
});
