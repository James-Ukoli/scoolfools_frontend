import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    RefreshControl,
    ActivityIndicator,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import FeaturedCarousel from "../components/FeaturedCarousel";
import EventCountdownCard from "../components/EventCountdownCard";
import HorizontalPostsRow from "../components/HorizontalPostsRow";
import { s, vs, ms } from "react-native-size-matters";

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

type Broadcaster = {
    name: string;
    platform: string;
    url: string;
    broadcast_start_at?: string;
};

type GamePlatform = {
    name: string;
    url: string;
    is_official: boolean;
    notes?: string;
};

type Round = {
    round_number: number;
    label: string;
    start_at: string;
    end_at: string | null;
    broadcast_start_at?: string;
    is_rest_day: boolean;
    status: string;
    notes?: string;
};

type EventItem = {
    _id: string;
    title: string;
    slug: string;
    summary?: string;
    type: string;
    location: string;
    start_at: string;
    end_at: string;
    timezone: string;
    cover_image_url: string;
    card_image_url?: string;
    official_url?: string;
    standingsUrl?: string;
    tags: string[];
    is_published: boolean;
    is_featured: boolean;
    featured_priority?: number;
    sort_boost?: number;
    status: string;
    live_mode?: string;
    current_day?: number | null;
    current_round?: number | null;
    round_label?: string | null;
    status_note?: string | null;
    last_status_update_at?: string | null;
    main_broadcaster?: Broadcaster;
    other_broadcasters?: Broadcaster[];
    game_platforms?: GamePlatform[];
    rounds?: Round[];
    createdAt: string;
    updatedAt: string;
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

export default function HomeScreen() {
    const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
    const [featuredStories, setFeaturedStories] = useState<Post[]>([]);
    const [countdownEvent, setCountdownEvent] = useState<EventItem | null>(null);

    const [loadingHome, setLoadingHome] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHomeData = useCallback(async () => {
        try {
            const [postsRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/posts?is_featured=true&limit=10`),
                fetch(`${API_BASE_URL}/api/events`),
            ]);

            const postsJson = await postsRes.json();
            const eventsJson = await eventsRes.json();

            const allFeaturedPosts = (postsJson.data || []).sort((a: Post, b: Post) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA;
            });

            setFeaturedPosts(allFeaturedPosts.slice(0, 3));
            setFeaturedStories(allFeaturedPosts.slice(3, 10));

            const publishedEvents = (eventsJson.data || [])
                .filter((event: EventItem) => event.is_published)
                .sort(
                    (a: EventItem, b: EventItem) =>
                        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
                );

            const now = Date.now();
            const upcomingEvents = publishedEvents.filter(
                (event: EventItem) => new Date(event.end_at).getTime() >= now
            );

            const featuredUpcoming = upcomingEvents
                .filter((event: EventItem) => event.is_featured)
                .sort((a: EventItem, b: EventItem) => {
                    const priorityA = a.featured_priority ?? 0;
                    const priorityB = b.featured_priority ?? 0;

                    if (priorityA !== priorityB) return priorityB - priorityA;

                    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
                });

            setCountdownEvent(
                featuredUpcoming[0] || upcomingEvents[0] || publishedEvents[0] || null
            );
        } catch (error) {
            console.log("Error fetching home data:", error);
        } finally {
            setLoadingHome(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

    const onRefresh = useCallback(async () => {
        console.log("HOME REFRESH STARTED");
        setRefreshing(true);

        try {
            await fetchHomeData();
            await new Promise((resolve) => setTimeout(resolve, 900));
        } catch (error) {
            console.log("HOME REFRESH ERROR:", error);
        } finally {
            setRefreshing(false);
            console.log("HOME REFRESH FINISHED");
        }
    }, [fetchHomeData]);

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader />

                {refreshing && (
                    <View style={styles.refreshIndicator}>
                        <ActivityIndicator size="small" color="#2EE7FF" />
                    </View>
                )}

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
                        <Text style={styles.sectionTitle}>Breaking News</Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <FeaturedCarousel posts={featuredPosts} loading={loadingHome} />

                    <EventCountdownCard event={countdownEvent} loading={loadingHome} />

                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionTitle}>Featured Stories</Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <HorizontalPostsRow posts={featuredStories} loading={loadingHome} />
                </ScrollView>
            </View>
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
    scrollContent: {
        paddingHorizontal: s(16),
        paddingTop: vs(10),
        paddingBottom: vs(160),
    },
    sectionHeaderWrap: {
        marginBottom: vs(14),
    },
    sectionTitle: {
        color: "#FFFFFF",
        fontSize: ms(23),
        fontWeight: "900",
        letterSpacing: 0.2,
        marginBottom: vs(8),
    },
    sectionAccentLine: {
        width: s(58),
        height: vs(3),
        borderRadius: 999,
        backgroundColor: "#1FD8FF",
        shadowColor: "#1FD8FF",
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    eventHeaderWrap: {
        alignItems: "center",
        marginTop: vs(2),
        marginBottom: vs(10),
    },
    sectionLabel: {
        fontSize: ms(14),
        fontWeight: "700",
        textAlign: "center",
        color: "#FF9A3C",
        letterSpacing: 0.5,
    },
    refreshIndicator: {
        alignItems: "center",
        paddingVertical: vs(6),
    },
});