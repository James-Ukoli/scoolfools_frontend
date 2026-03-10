import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
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
import { WebView } from "react-native-webview";
import { s, vs, ms } from "react-native-size-matters";

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

const API_BASE_URL = "http://localhost:5002/api";

export default function ArticleScreen() {
    const route = useRoute<RouteProp<ArticleRouteParams, "ArticleScreen">>();
    const navigation = useNavigation<any>();
    const { slug } = route.params;

    const [post, setPost] = useState<Post | null>(null);
    const [blocks, setBlocks] = useState<PostBlock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                setLoading(true);

                const postResponse = await fetch(`${API_BASE_URL}/posts/slug/${slug}`);
                const postJson = await postResponse.json();

                console.log("POST JSON RESPONSE:", postJson);

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

    const openExternalLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert("Invalid link", "This link cannot be opened.");
                return;
            }
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert("Error", "Could not open link.");
        }
    };

    const getYoutubeEmbedUrl = (url: string) => {
        try {
            if (url.includes("youtube.com/shorts/")) {
                const id = url.split("shorts/")[1]?.split("?")[0];
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }

            if (url.includes("youtube.com/watch?v=")) {
                const id = url.split("v=")[1]?.split("&")[0];
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }

            if (url.includes("youtu.be/")) {
                const id = url.split("youtu.be/")[1]?.split("?")[0];
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }

            return null;
        } catch {
            return null;
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
                    <View key={block._id} style={styles.mediaBlock}>
                        <Image
                            source={{ uri: block.input }}
                            style={styles.blockImage}
                            onError={() => console.log("Block image failed:", block.input)}
                        />
                    </View>
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
                const youtubeEmbedUrl = getYoutubeEmbedUrl(block.input);

                if (youtubeEmbedUrl) {
                    return (
                        <View key={block._id} style={styles.videoContainer}>
                            <WebView
                                source={{ uri: youtubeEmbedUrl }}
                                style={styles.webview}
                                javaScriptEnabled
                                domStorageEnabled
                                allowsFullscreenVideo
                            />
                        </View>
                    );
                }

                return (
                    <Pressable
                        key={block._id}
                        style={styles.linkCard}
                        onPress={() => openExternalLink(block.input)}
                    >
                        <Ionicons name="play-circle-outline" size={18} color="#3CF2FF" />
                        <Text style={styles.linkText} numberOfLines={1}>
                            Open Video
                        </Text>
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
                        onError={() =>
                            console.log("Hero image failed:", post.cover_image_url)
                        }
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
                </View>

                <View style={styles.articleBody}>{blocks.map(renderBlock)}</View>
            </ScrollView>
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
        paddingBottom: vs(40),
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
        height: vs(210),
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
    videoContainer: {
        height: vs(220),
        borderRadius: s(18),
        overflow: "hidden",
        marginVertical: vs(12),
        backgroundColor: "#000000",
    },
    webview: {
        flex: 1,
        backgroundColor: "#000000",
    },
});