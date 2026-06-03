import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
    RouteProp,
    useNavigation,
    useRoute,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import * as WebBrowser from "expo-web-browser";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import YoutubePlayer from "react-native-youtube-iframe";

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

    const [post, setPost] = useState<Post | null>(null);
    const [blocks, setBlocks] = useState<PostBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rippleAnim1 = useRef(new Animated.Value(0)).current;
    const rippleAnim2 = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);
    const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const rippleLoop1Ref = useRef<Animated.CompositeAnimation | null>(null);
    const rippleLoop2Ref = useRef<Animated.CompositeAnimation | null>(null);
    const rippleDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const screenFade = useRef(new Animated.Value(0)).current;
    const heroFade = useRef(new Animated.Value(0)).current;
    const heroTranslate = useRef(new Animated.Value(18)).current;
    const headerFade = useRef(new Animated.Value(0)).current;
    const headerTranslate = useRef(new Animated.Value(18)).current;

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

                const postResponse = await fetch(`${API_BASE_URL}/api/posts/slug/${slug}`);
                const postJson = await postResponse.json();

                const fetchedPost: Post = postJson;
                const fetchedBlocks: PostBlock[] = (postJson.blocks || []).sort(
                    (a: PostBlock, b: PostBlock) => a.order_index - b.order_index
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
                    block.block_type
                )
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
                message: `${post.title}\n\n${post.summary}\n\nRead on Just Move`,
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
            ])
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
            ])
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
            ])
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

            const response = await fetch(`${API_BASE_URL}/api/article-narration`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
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
                    <Text style={styles.blockHeader}>
                        {block.input}
                    </Text>
                );

            case "subheader":
                return (
                    <Text style={styles.subheader}>
                        {block.input}
                    </Text>
                );

            case "paragraph":
                return (
                    <Text style={styles.paragraph}>
                        {block.input}
                    </Text>
                );

            case "image":
                return (
                    <Pressable
                        style={styles.mediaBlock}
                        onPress={() => setPreviewImage(block.input)}
                    >
                        <Image
                            source={{ uri: block.input }}
                            style={styles.blockImage}
                            resizeMode="contain"
                            onError={() => console.log("Block image failed:", block.input)}
                        />
                    </Pressable>
                );

            case "caption":
                return (
                    <Text style={styles.caption}>
                        {block.input}
                    </Text>
                );

            case "quote":
                return (
                    <View style={styles.quoteContainer}>
                        <View style={styles.quoteAccent} />
                        <Text style={styles.quoteText}>{block.input}</Text>
                    </View>
                );

            case "link":
                return (
                    <Pressable
                        style={styles.linkCard}
                        onPress={() => openExternalLink(block.input)}
                    >
                        <Ionicons name="link-outline" size={18} color="#3CF2FF" />
                        <Text style={styles.linkText} numberOfLines={1}>
                            {block.input}
                        </Text>
                    </Pressable>
                );

            case "pgn":
                return (
                    <View style={styles.pgnContainer}>
                        <Text style={styles.pgnLabel}>PGN</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <Text style={styles.pgnText}>{block.input}</Text>
                        </ScrollView>
                    </View>
                );

            case "video": {
                const youtubeId = getYoutubeId(block.input);

                if (!youtubeId) {
                    return (
                        <Pressable
                            style={styles.videoPreviewCard}
                            onPress={() => openExternalLink(block.input)}
                        >
                            <View style={styles.videoFallback}>
                                <Ionicons name="play-circle-outline" size={42} color="#FFFFFF" />
                                <Text style={styles.videoOverlayText}>OPEN VIDEO</Text>
                            </View>
                        </Pressable>
                    );
                }

                return (
                    <View style={styles.articleVideoCard}>
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
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingOrb}>
                        <ActivityIndicator size="small" color="#3CF2FF" />
                    </View>
                    <Text style={styles.loadingText}>Loading article feed...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Article not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <Animated.View style={[styles.screen, { opacity: screenFade }]}>
                <ScrollView
                    ref={scrollRef}
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.topRow}>
                        <View style={styles.leftActions}>
                            <Pressable
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            </Pressable>

                            {!!post.category && (
                                <View style={styles.categoryChip}>
                                    <Text style={styles.categoryChipText}>{post.category}</Text>
                                </View>
                            )}

                            {!!post.content_type && (
                                <View style={styles.typeChip}>
                                    <Text style={styles.typeChipText}>{post.content_type}</Text>
                                </View>
                            )}
                        </View>

                        <Pressable style={styles.shareButton} onPress={handleShare}>
                            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
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
                                style={styles.heroImage}
                                resizeMode="contain"
                            />
                            <View pointerEvents="none" style={styles.heroGlow} />
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


                        <Text style={styles.title}>{post.title}</Text>

                        {!!post.summary && <Text style={styles.summary}>{post.summary}</Text>}

                        <View style={styles.metaCard}>
                            <Ionicons name="person-circle-outline" size={17} color="#3CF2FF" />
                            <Text style={styles.metaText}>
                                {post.author || "Just Move"} · {displayDate}
                            </Text>
                        </View>

                        <Pressable
                            onPress={handleToggleNarration}
                            style={({ pressed }) => [
                                styles.aiChip,
                                isPlaying && styles.aiChipActive,
                                pressed && styles.aiChipPressed,
                            ]}
                        >
                            {isGeneratingNarration ? (
                                <ActivityIndicator color="#3CF2FF" size="small" />
                            ) : (
                                <Ionicons
                                    name={isPlaying ? "volume-high" : "sparkles-outline"}
                                    size={14}
                                    color="#3CF2FF"
                                />
                            )}

                            <Text style={styles.aiDisclosure}>
                                {isGeneratingNarration
                                    ? "Preparing narration..."
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
                            <Ionicons name="close" size={30} color="#fff" />
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
                    style={styles.scrollTopArrow}
                >
                    <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
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
                            (isPlaying || isGeneratingNarration) && styles.ttsButtonActive,
                            pressed && styles.ttsButtonPressed,
                        ]}
                    >
                        {isGeneratingNarration ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Ionicons
                                name={isPlaying ? "volume-high" : "volume-medium"}
                                size={24}
                                color="#FFFFFF"
                            />
                        )}
                    </Pressable>
                </Animated.View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000000",
    },
    screen: {
        flex: 1,
        backgroundColor: "#000000",
    },
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    contentContainer: {
        paddingBottom: Platform.OS === "android" ? vs(190) : vs(120),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000000",
    },
    loadingOrb: {
        width: s(54),
        height: s(54),
        borderRadius: s(27),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#06131D",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.45)",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    loadingText: {
        color: "#A7F7FF",
        fontSize: ms(12),
        fontWeight: "800",
        marginTop: vs(12),
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    errorText: {
        color: "#FFFFFF",
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
        backgroundColor: "#070B12",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.32)",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    },
    categoryChip: {
        backgroundColor: "#050D15",
        borderColor: "rgba(60,242,255,0.35)",
        borderWidth: 1,
        paddingHorizontal: s(12),
        paddingVertical: vs(6),
        borderRadius: s(999),
    },
    categoryChipText: {
        color: "#3CF2FF",
        fontSize: ms(11.5),
        fontWeight: "900",
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    typeChip: {
        backgroundColor: "#070B12",
        borderColor: "rgba(255,255,255,0.18)",
        borderWidth: 1,
        paddingHorizontal: s(12),
        paddingVertical: vs(6),
        borderRadius: s(999),
    },
    typeChipText: {
        color: "#FFFFFF",
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
        backgroundColor: "#070B12",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
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
        backgroundColor: "#020304",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.22)",
    },
    heroGlow: {
        position: "absolute",
        left: s(26),
        right: s(26),
        bottom: -vs(8),
        height: vs(20),
        backgroundColor: "rgba(60,242,255,0.11)",
        borderRadius: s(999),
    },
    headerSection: {
        paddingHorizontal: s(17),
        paddingTop: vs(18),
    },
    liveSignalRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: vs(10),
    },
    signalDot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
        backgroundColor: "#3CF2FF",
        marginRight: s(8),
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.8,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
    },
    signalText: {
        color: "#7DF7FF",
        fontSize: ms(10.5),
        fontWeight: "900",
        letterSpacing: 1.2,
    },
    title: {
        color: "#FFFFFF",
        fontSize: ms(30),
        lineHeight: ms(37),
        fontWeight: "900",
        marginBottom: vs(11),
        letterSpacing: 0.35,
        textShadowColor: "rgba(60,242,255,0.36)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 14,
    },
    summary: {
        color: "#D7E3F5",
        fontSize: ms(15.5),
        lineHeight: ms(24),
        marginBottom: vs(14),
        fontWeight: "500",
    },
    metaCard: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "#050A10",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: s(999),
        paddingHorizontal: s(11),
        paddingVertical: vs(7),
        marginBottom: vs(8),
        gap: s(6),
    },
    metaText: {
        color: "#B7C7D9",
        fontSize: ms(12),
        fontWeight: "700",
    },
    aiChip: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(60,242,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.25)",
        borderRadius: s(999),
        paddingHorizontal: s(10),
        paddingVertical: vs(6),
        gap: s(6),
    },
    aiDisclosure: {
        color: "#9AFBFF",
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
        color: "#FFFFFF",
        fontSize: ms(24),
        lineHeight: ms(31),
        fontWeight: "900",
        marginTop: vs(22),
        marginBottom: vs(11),
        letterSpacing: 0.35,
        textShadowColor: "rgba(60,242,255,0.25)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subheader: {
        color: "#EAFDFF",
        fontSize: ms(20),
        lineHeight: ms(27),
        fontWeight: "900",
        marginTop: vs(20),
        marginBottom: vs(10),
        letterSpacing: 0.25,
    },
    paragraph: {
        color: "#F2F6FF",
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
        backgroundColor: "#03070D",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.18)",
    },
    blockImage: {
        width: "100%",
        height: vs(250),
        borderRadius: s(20),
        backgroundColor: "#03070D",
    },
    caption: {
        color: "#96A6BA",
        fontSize: ms(12.5),
        lineHeight: ms(18),
        marginBottom: vs(15),
        marginTop: vs(5),
        fontWeight: "600",
    },
    quoteContainer: {
        flexDirection: "row",
        backgroundColor: "#050A10",
        borderRadius: s(20),
        paddingVertical: vs(15),
        paddingHorizontal: s(15),
        marginVertical: vs(13),
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.22)",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    },
    quoteAccent: {
        width: s(4),
        borderRadius: s(999),
        backgroundColor: "#3CF2FF",
        marginRight: s(12),
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.7,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
    },
    quoteText: {
        flex: 1,
        color: "#F8FCFF",
        fontSize: ms(16),
        lineHeight: ms(25),
        fontStyle: "italic",
        fontWeight: "700",
    },
    pgnContainer: {
        backgroundColor: "#04080E",
        borderRadius: s(20),
        padding: s(14),
        marginVertical: vs(13),
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.2)",
    },
    pgnLabel: {
        color: "#3CF2FF",
        fontSize: ms(12),
        fontWeight: "900",
        marginBottom: vs(8),
        letterSpacing: 1,
    },
    pgnText: {
        color: "#E6ECF8",
        fontSize: ms(13),
        lineHeight: ms(20),
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    linkCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(8),
        backgroundColor: "#050A10",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.24)",
        borderRadius: s(18),
        paddingHorizontal: s(14),
        paddingVertical: vs(13),
        marginVertical: vs(11),
    },
    linkText: {
        flex: 1,
        color: "#DDFBFF",
        fontSize: ms(14),
        fontWeight: "800",
    },
    imagePreviewOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
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
        backgroundColor: "#04080E",
        position: "relative",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.2)",
    },
    videoPreviewImage: {
        width: "100%",
        height: "100%",
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.28)",
    },
    videoOverlayText: {
        color: "#FFFFFF",
        fontSize: ms(11),
        fontWeight: "900",
        letterSpacing: 1.5,
        marginTop: vs(5),
    },
    videoFallback: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#04080E",
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
        backgroundColor: "#050B12",
        borderWidth: 1.5,
        borderColor: "rgba(60,242,255,0.45)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    ttsButtonActive: {
        backgroundColor: "#06202B",
        borderColor: "#3CF2FF",
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
        backgroundColor: "#3CF2FF",
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
        backgroundColor: "rgba(5,10,16,0.82)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
    },
    aiChipPressed: {
        opacity: 0.75,
        transform: [{ scale: 0.98 }],
    },
    aiChipActive: {
        backgroundColor: "rgba(60,242,255,0.15)",
        borderColor: "rgba(60,242,255,0.65)",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: 7,
    },
    articleVideoCard: {
        width: "100%",
        height: vs(210),
        borderRadius: s(18),
        overflow: "hidden",
        marginVertical: vs(13),
        backgroundColor: "#000000",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.2)",
    },

    youtubeWebView: {
        backgroundColor: "#000000",
    },
});