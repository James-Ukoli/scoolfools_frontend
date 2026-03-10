import React, { useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

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

type FeaturedCarouselProps = {
    posts: Post[];
    loading?: boolean;
};

export default function FeaturedCarousel({
    posts,
    loading = false,
}: FeaturedCarouselProps) {
    const navigation = useNavigation<any>();
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (event: any) => {
        const slideIndex = Math.round(
            event.nativeEvent.contentOffset.x / CARD_WIDTH
        );
        setActiveIndex(slideIndex);
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date().getTime();
        const postTime = new Date(dateString).getTime();
        const diffMs = now - postTime;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
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
        <View style={styles.wrapper}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH}
                snapToAlignment="start"
                disableIntervalMomentum
                contentContainerStyle={{ paddingRight: 0 }}
                bounces={false}
                onMomentumScrollEnd={handleScroll}
                renderItem={({ item }) => (
                    <View style={styles.cardContainer}>
                        <Pressable
                            style={styles.card}
                            onPress={() =>
                                navigation.navigate("ArticleScreen", {
                                    slug: item.slug,
                                })
                            }
                        >
                            <View style={styles.imageSection}>
                                <Image
                                    source={{ uri: item.cover_image_url }}
                                    style={styles.image}
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

                                <Text style={styles.timeText}>
                                    {getTimeAgo(item.created_at)}
                                </Text>
                            </View>
                        </Pressable>
                    </View>
                )}
            />

            <View style={styles.dotsContainer}>
                {posts.map((_, index) => (
                    <View
                        key={index}
                        style={[styles.dot, activeIndex === index && styles.activeDot]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: vs(18),
    },
    loadingContainer: {
        height: vs(240),
        justifyContent: "center",
        alignItems: "center",
    },
    cardContainer: {
        width: CARD_WIDTH,
    },
    card: {
        borderRadius: s(24),
        overflow: "hidden",
        backgroundColor: "#000000",
    },
    imageSection: {
        height: vs(180),
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
        left: s(16),
        right: s(16),
        bottom: vs(14),
    },
    title: {
        color: "#FFFFFF",
        fontSize: ms(18),
        fontWeight: "800",
        lineHeight: ms(22),
    },
    bottomSection: {
        backgroundColor: "#000000",
        paddingHorizontal: s(16),
        paddingTop: vs(10),
        paddingBottom: vs(10),
    },
    summary: {
        color: "#D3D9E6",
        fontSize: ms(14),
        lineHeight: ms(18),
        marginBottom: vs(4),
    },
    timeText: {
        color: "#AAB4C3",
        fontSize: ms(12),
        fontWeight: "600",
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: vs(8),
        paddingRight: s(8),
        gap: s(8),
    },
    dot: {
        width: s(6),
        height: s(6),
        borderRadius: 999,
        backgroundColor: "#586174",
    },
    activeDot: {
        backgroundColor: "#3CF2FF",
    },
});