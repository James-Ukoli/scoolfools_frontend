import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Post = {
    _id: string;
    title: string;
    summary: string;
    image: string;
    createdAt: string;
    category_type: string;
};

const TRENDING_CATEGORIES = [
    "All",
    "Tournaments",
    "Drama",
    "Pros",
    "Online",
    "Rising Stars",
];

const mockTrendingPosts: Post[] = [
    {
        _id: "1",
        title: "Caruana Wins Dramatic FIDE Candidates Opener",
        summary:
            "Fabiano Caruana defeats Ding Liren in a tense round one battle and sets the tone early.",
        image:
            "https://images.unsplash.com/photo-1580541832626-2a7131ee809f?q=80&w=1200&auto=format&fit=crop",
        createdAt: "2026-03-09T10:00:00.000Z",
        category_type: "Tournaments",
    },
    {
        _id: "2",
        title: "Praggnanandhaa Stuns Nakamura in Online Showdown",
        summary:
            "The young star delivers a sharp performance in a fast paced online match.",
        image:
            "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1200&auto=format&fit=crop",
        createdAt: "2026-03-09T08:30:00.000Z",
        category_type: "Online",
    },
    {
        _id: "3",
        title: "Chess Scandal Rocks Vienna Open",
        summary:
            "A controversy at the event sparks debate across the chess world and online community.",
        image:
            "https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?q=80&w=1200&auto=format&fit=crop",
        createdAt: "2026-03-09T07:00:00.000Z",
        category_type: "Drama",
    },
    {
        _id: "4",
        title: "Nodirbek Keeps Rising After Another Strong Event",
        summary:
            "Another convincing performance adds fuel to the growing belief that he is ready for the biggest stage.",
        image:
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
        createdAt: "2026-03-09T06:15:00.000Z",
        category_type: "Rising Stars",
    },
    {
        _id: "5",
        title: "Hikaru Talks Form, Focus, and the State of Classical Chess",
        summary:
            "The chess star gives fresh thoughts on competition, schedule balance, and preparation.",
        image:
            "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop",
        createdAt: "2026-03-09T05:30:00.000Z",
        category_type: "Pros",
    },
];

function formatTimeAgo(dateString: string) {
    const now = new Date().getTime();
    const postTime = new Date(dateString).getTime();
    const diffMs = now - postTime;

    const minutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const days = Math.floor(diffMs / 1000 / 60 / 60 / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function getCategoryBadgeStyle(category: string) {
    switch (category) {
        case "Drama":
            return {
                backgroundColor: "#6F102B",
                borderColor: "#A61B44",
            };
        case "Tournaments":
            return {
                backgroundColor: "#7A6500",
                borderColor: "#CFAF1A",
            };
        case "Online":
            return {
                backgroundColor: "#0F5B3A",
                borderColor: "#23C16B",
            };
        case "Pros":
            return {
                backgroundColor: "#183A63",
                borderColor: "#4D9BFF",
            };
        case "Rising Stars":
            return {
                backgroundColor: "#5D2475",
                borderColor: "#B86EF2",
            };
        default:
            return {
                backgroundColor: "#2A2A2A",
                borderColor: "#555555",
            };
    }
}

export default function BlogsScreen({ navigation }: any) {
    const [selectedCategory, setSelectedCategory] = useState("All");

    const filteredPosts = useMemo(() => {
        const sortedPosts = [...mockTrendingPosts].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        if (selectedCategory === "All") return sortedPosts;

        return sortedPosts.filter(
            (post) => post.category_type === selectedCategory
        );
    }, [selectedCategory]);

    const featuredPost = filteredPosts[0];
    const topStories = filteredPosts.slice(1);

    const handleOpenPost = (post: Post) => {
        if (navigation?.navigate) {
            navigation.navigate("PostScreen", { postId: post._id });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Blogs</Text>

                    <TouchableOpacity onPress={() => { }}>
                        <Text style={styles.headerIcon}>⌕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                >
                    {TRENDING_CATEGORIES.map((category) => {
                        const active = selectedCategory === category;

                        return (
                            <TouchableOpacity
                                key={category}
                                onPress={() => setSelectedCategory(category)}
                                style={[styles.tabPill, active && styles.activeTabPill]}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.tabText, active && styles.activeTabText]}>
                                    {category}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {featuredPost ? (
                    <>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleOpenPost(featuredPost)}
                            style={styles.featuredWrapper}
                        >
                            <View style={styles.featuredCard}>
                                <ImageBackground
                                    source={{ uri: featuredPost.image }}
                                    style={styles.featuredImageArea}
                                    imageStyle={styles.featuredImage}
                                    resizeMode="cover"
                                />

                                <View style={styles.featuredInfoBox}>
                                    <View
                                        style={[
                                            styles.categoryBadge,
                                            getCategoryBadgeStyle(featuredPost.category_type),
                                        ]}
                                    >
                                        <Text style={styles.categoryBadgeText}>
                                            {featuredPost.category_type}
                                        </Text>
                                    </View>

                                    <Text style={styles.featuredTitle} numberOfLines={2}>
                                        {featuredPost.title}
                                    </Text>

                                    <Text style={styles.featuredSummary} numberOfLines={2}>
                                        {featuredPost.summary}
                                    </Text>

                                    <Text style={styles.featuredMeta}>
                                        {formatTimeAgo(featuredPost.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        {topStories.length > 0 && (
                            <Text style={styles.sectionTitle}>Top Stories</Text>
                        )}

                        {topStories.map((post) => (
                            <TouchableOpacity
                                key={post._id}
                                style={styles.storyRow}
                                activeOpacity={0.85}
                                onPress={() => handleOpenPost(post)}
                            >
                                <Image source={{ uri: post.image }} style={styles.storyImage} />

                                <View style={styles.storyContent}>
                                    <Text style={styles.storyTitle} numberOfLines={2}>
                                        {post.title}
                                    </Text>

                                    <Text style={styles.storySummary} numberOfLines={2}>
                                        {post.summary}
                                    </Text>

                                    <View style={styles.storyMetaRow}>
                                        <View
                                            style={[
                                                styles.categoryBadgeSmall,
                                                getCategoryBadgeStyle(post.category_type),
                                            ]}
                                        >
                                            <Text style={styles.categoryBadgeSmallText}>
                                                {post.category_type}
                                            </Text>
                                        </View>

                                        <Text style={styles.storyMetaText}>
                                            {formatTimeAgo(post.createdAt)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            No trending posts in this category yet.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000000",
    },
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerRow: {
        marginTop: 6,
        marginBottom: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerIcon: {
        color: "#F4D03F",
        fontSize: 28,
        fontWeight: "800",
        width: 34,
        textAlign: "center",
    },
    headerTitle: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "900",
    },
    tabsContainer: {
        paddingBottom: 18,
        paddingRight: 12,
    },
    tabPill: {
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: "#171717",
        borderWidth: 1.4,
        borderColor: "#2B2B2B",
        marginRight: 12,
    },
    activeTabPill: {
        backgroundColor: "#97D81E",
        borderColor: "#B7F03A",
    },
    tabText: {
        color: "#EAEAEA",
        fontSize: 14,
        fontWeight: "800",
    },
    activeTabText: {
        color: "#111111",
    },
    featuredWrapper: {
        marginBottom: 28,
    },
    featuredCard: {
        height: 360,
        justifyContent: "space-between",
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#171717",
    },
    featuredImage: {
        borderRadius: 28,
    },
    featuredImageArea: {
        height: 170,
        backgroundColor: "#1A1A1A",
    },
    featuredInfoBox: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: "#111111",
    },
    featuredTopFade: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.16)",
    },
    featuredContent: {
        backgroundColor: "rgba(0,0,0,0.62)",
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 18,
    },
    featuredTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "900",
        lineHeight: 24,
        marginTop: 10,
    },
    featuredSummary: {
        color: "#DDDDDD",
        fontSize: 14,
        lineHeight: 20,
        marginTop: 10,
    },
    featuredMeta: {
        color: "#D0D0D0",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 14,
    },
    sectionTitle: {
        color: "#F4D03F",
        fontSize: 28,
        fontWeight: "900",
        marginBottom: 16,
    },
    storyRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 22,
    },
    storyImage: {
        width: 112,
        height: 112,
        borderRadius: 20,
        marginRight: 14,
        backgroundColor: "#1F1F1F",
    },
    storyContent: {
        flex: 1,
        minHeight: 112,
        justifyContent: "space-between",
    },
    storyTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "900",
        lineHeight: 24,
        marginBottom: 6,
    },
    storySummary: {
        color: "#C8C8C8",
        fontSize: 14,
        lineHeight: 19,
        marginBottom: 10,
    },
    storyMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
    },
    storyMetaText: {
        color: "#CFCFCF",
        fontSize: 13,
        fontWeight: "700",
    },
    categoryBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOpacity: 0.32,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    categoryBadgeText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "900",
    },
    categoryBadgeSmall: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1.2,
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    categoryBadgeSmallText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "900",
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyStateText: {
        color: "#BDBDBD",
        fontSize: 16,
        fontWeight: "700",
    },
});