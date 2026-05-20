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
                    <Text key={block._id} style={styles.blockHeader}>
                        {block.input}
                    </Text>
                );

            case "subheader":
                return (
                    <Text key={block._id} style={styles.subheader}>
                        {block.input}
                    </Text>
                );

            case "paragraph":
                return (
                    <Text key={block._id} style={styles.paragraph}>
                        {block.input}
                    </Text>
                );

            case "image":
                return (
                    <Pressable
                        key={block._id}
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
                    <Text key={block._id} style={styles.caption}>
                        {block.input}
                    </Text>
                );

            case "quote":
                return (
                    <View key={block._id} style={styles.quoteContainer}>
                        <View style={styles.quoteAccent} />
                        <Text style={styles.quoteText}>{block.input}</Text>
                    </View>
                );

            case "link":
                return (
                    <Pressable
                        key={block._id}
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
                    <View key={block._id} style={styles.pgnContainer}>
                        <Text style={styles.pgnLabel}>PGN</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <Text style={styles.pgnText}>{block.input}</Text>
                        </ScrollView>
                    </View>
                );

            case "video": {
                const youtubeId = getYoutubeId(block.input);
                const thumbnailUrl = youtubeId
                    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
                    : null;

                return (
                    <Pressable
                        key={block._id}
                        style={styles.videoPreviewCard}
                        onPress={() => openExternalLink(block.input)}
                    >
                        {thumbnailUrl ? (
                            <Image
                                source={{ uri: thumbnailUrl }}
                                style={styles.videoPreviewImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.videoFallback}>
                                <Ionicons name="play-circle-outline" size={42} color="#FFFFFF" />
                            </View>
                        )}

                        <View style={styles.videoOverlay}>
                            <Ionicons name="play-circle" size={56} color="#FFFFFF" />
                        </View>
                    </Pressable>
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
                    <ActivityIndicator size="small" color="#3CF2FF" />
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
                    <Image
                        source={{ uri: post.cover_image_url }}
                        style={styles.heroImage}
                    />
                )}

                <View style={styles.headerSection}>
                    <Text style={styles.title}>{post.title}</Text>

                    {!!post.summary && <Text style={styles.summary}>{post.summary}</Text>}

                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                            {post.author || "Just Move"} · {displayDate}
                        </Text>
                    </View>

                    <Text style={styles.aiDisclosure}>
                        AI audio narration available
                    </Text>
                </View>

                <View style={styles.articleBody}>{blocks.map(renderBlock)}</View>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#050816",
    },
    container: {
        flex: 1,
        backgroundColor: "#050816",
    },
    contentContainer: {
        paddingBottom: Platform.OS === "android" ? vs(190) : vs(120),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "#FFFFFF",
        fontSize: ms(16),
        fontWeight: "600",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: s(16),
        paddingTop: vs(6),
        paddingBottom: vs(10),
    },
    leftActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(8),
        flexShrink: 1,
    },
    backButton: {
        width: s(38),
        height: s(38),
        borderRadius: s(19),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#121C31",
        borderWidth: 1,
        borderColor: "#21385F",
    },
    categoryChip: {
        backgroundColor: "#0F1B35",
        borderColor: "#1C335D",
        borderWidth: 1,
        paddingHorizontal: s(12),
        paddingVertical: vs(6),
        borderRadius: s(999),
    },
    categoryChipText: {
        color: "#3CF2FF",
        fontSize: ms(12),
        fontWeight: "700",
    },
    typeChip: {
        backgroundColor: "#0D1629",
        borderColor: "#21446E",
        borderWidth: 1,
        paddingHorizontal: s(12),
        paddingVertical: vs(6),
        borderRadius: s(999),
    },
    typeChipText: {
        color: "#8CCBFF",
        fontSize: ms(12),
        fontWeight: "700",
        textTransform: "capitalize",
    },
    shareButton: {
        width: s(38),
        height: s(38),
        borderRadius: s(19),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#121C31",
        borderWidth: 1,
        borderColor: "#21385F",
    },
    heroImage: {
        width: "100%",
        height: vs(215),
        backgroundColor: "#10182B",
    },
    headerSection: {
        paddingHorizontal: s(16),
        paddingTop: vs(16),
    },
    title: {
        color: "#FFFFFF",
        fontSize: ms(28),
        lineHeight: ms(34),
        fontWeight: "900",
        marginBottom: vs(10),
    },
    summary: {
        color: "#B8C2D6",
        fontSize: ms(15),
        lineHeight: ms(22),
        marginBottom: vs(12),
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: vs(8),
    },
    metaText: {
        color: "#7E8AA3",
        fontSize: ms(12),
        fontWeight: "600",
    },
    aiDisclosure: {
        color: "#6FB8FF",
        fontSize: ms(11),
        fontWeight: "700",
        marginTop: vs(2),
        marginBottom: vs(2),
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    articleBody: {
        paddingHorizontal: s(16),
        paddingTop: vs(12),
    },
    blockHeader: {
        color: "#FFFFFF",
        fontSize: ms(24),
        lineHeight: ms(30),
        fontWeight: "900",
        marginTop: vs(18),
        marginBottom: vs(10),
    },
    subheader: {
        color: "#FFFFFF",
        fontSize: ms(20),
        lineHeight: ms(26),
        fontWeight: "800",
        marginTop: vs(18),
        marginBottom: vs(10),
    },
    paragraph: {
        color: "#D8DEEA",
        fontSize: ms(16),
        lineHeight: ms(27),
        marginBottom: vs(14),
    },
    mediaBlock: {
        marginTop: vs(12),
        marginBottom: vs(8),
    },
    blockImage: {
        width: "100%",
        height: vs(240),
        borderRadius: s(18),
        backgroundColor: "#10182B",
    },
    caption: {
        color: "#8E9AB2",
        fontSize: ms(12),
        lineHeight: ms(17),
        marginBottom: vs(14),
        marginTop: vs(4),
    },
    quoteContainer: {
        flexDirection: "row",
        backgroundColor: "#0B1222",
        borderRadius: s(18),
        paddingVertical: vs(14),
        paddingHorizontal: s(14),
        marginVertical: vs(12),
        borderWidth: 1,
        borderColor: "#15233F",
    },
    quoteAccent: {
        width: s(4),
        borderRadius: s(999),
        backgroundColor: "#3CF2FF",
        marginRight: s(12),
    },
    quoteText: {
        flex: 1,
        color: "#F1F5FF",
        fontSize: ms(16),
        lineHeight: ms(24),
        fontStyle: "italic",
        fontWeight: "600",
    },
    pgnContainer: {
        backgroundColor: "#0C1220",
        borderRadius: s(18),
        padding: s(14),
        marginVertical: vs(12),
        borderWidth: 1,
        borderColor: "#1A2743",
    },
    pgnLabel: {
        color: "#3CF2FF",
        fontSize: ms(12),
        fontWeight: "800",
        marginBottom: vs(8),
        letterSpacing: 0.5,
    },
    pgnText: {
        color: "#E6ECF8",
        fontSize: ms(13),
        lineHeight: ms(20),
        fontFamily: "Courier",
    },
    linkCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(8),
        backgroundColor: "#0D1629",
        borderWidth: 1,
        borderColor: "#193155",
        borderRadius: s(16),
        paddingHorizontal: s(14),
        paddingVertical: vs(12),
        marginVertical: vs(10),
    },
    linkText: {
        flex: 1,
        color: "#CFE9FF",
        fontSize: ms(14),
        fontWeight: "600",
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
        height: vs(220),
        borderRadius: s(18),
        overflow: "hidden",
        marginVertical: vs(12),
        backgroundColor: "#11192C",
        position: "relative",
    },
    videoPreviewImage: {
        width: "100%",
        height: "100%",
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.18)",
    },
    videoFallback: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#11192C",
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
        backgroundColor: "#14233F",
        borderWidth: 1.5,
        borderColor: "#274E7A",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 7,
    },
    ttsButtonActive: {
        backgroundColor: "#17304F",
        borderColor: "#3CF2FF",
    },
    ttsButtonPressed: {
        opacity: 0.88,
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
    },
});