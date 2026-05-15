import React from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { s, vs, ms } from "react-native-size-matters";

type Post = {
    _id: string;
    title: string;
    summary: string;
    cover_image_url: string;
    slug: string;
    is_featured: boolean;
    created_at: string;
    published_at: string | null;
    author?: string;
    category?: string;
    content_type?: string;
};

type HorizontalPostsRowProps = {
    posts: Post[];
    loading?: boolean;
    isSubscribed?: boolean;
    onRequireSubscription?: () => void;
};

export default function HorizontalPostsRow({
    posts,
    loading = false,
    isSubscribed = false,
    onRequireSubscription,
}: HorizontalPostsRowProps) {
    const navigation = useNavigation<any>();

    const getTimeAgo = (dateString: string) => {
        const now = new Date().getTime();
        const postTime = new Date(dateString).getTime();
        const diffMs = now - postTime;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return "Just now";
        if (diffHours < 24) {
            return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
        }
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    };

    const handleOpenPost = (post: Post) => {
        const isBlog = post.content_type === "blog";

        if (isBlog && !isSubscribed) {
            onRequireSubscription?.();
            return;
        }

        navigation.navigate("ArticleScreen", {
            slug: post.slug,
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3CF2FF" />
            </View>
        );
    }

    if (!posts.length) {
        return null;
    }

    return (
        <FlatList
            data={posts}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
                <Pressable
                    style={styles.card}
                    onPress={() => handleOpenPost(item)}
                >
                    <View style={styles.imageSection}>
                        <Image
                            source={{ uri: item.cover_image_url }}
                            style={styles.image}
                            onError={() =>
                                console.log("Horizontal row image failed:", item.cover_image_url)
                            }
                        />

                        <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.82)"]}
                            style={styles.imageOverlay}
                        />

                        <View style={styles.titleContainer}>
                            <Text style={styles.title} numberOfLines={2}>
                                {item.title}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bottomSection}>
                        <Text
                            style={styles.summary}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {item.summary}
                        </Text>

                        <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
                    </View>
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        height: vs(220),
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        paddingRight: s(8),
    },
    card: {
        width: s(182),
        borderRadius: s(20),
        overflow: "hidden",
        backgroundColor: "#11192C",
        marginRight: s(12),
    },
    imageSection: {
        height: vs(155),
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    titleContainer: {
        position: "absolute",
        left: s(10),
        right: s(10),
        bottom: vs(10),
    },
    title: {
        color: "#FFFFFF",
        fontSize: ms(14),
        fontWeight: "800",
        lineHeight: ms(18),
    },
    bottomSection: {
        backgroundColor: "#11192C",
        paddingHorizontal: s(12),
        paddingTop: vs(10),
        paddingBottom: vs(10),
    },
    summary: {
        color: "#D3D9E6",
        fontSize: ms(12),
        lineHeight: ms(16),
        marginBottom: vs(8),
    },
    time: {
        color: "#AAB4C3",
        fontSize: ms(11),
        fontWeight: "600",
    },
});