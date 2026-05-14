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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
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
    const navigation = useNavigation<any>();

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
        setRefreshing(true);

        try {
            await fetchHomeData();
            await new Promise((resolve) => setTimeout(resolve, 900));
        } catch (error) {
            console.log("HOME REFRESH ERROR:", error);
        } finally {
            setRefreshing(false);
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
                        <Text style={styles.sectionTitle}>Featured Stories</Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <FeaturedCarousel posts={featuredPosts} loading={loadingHome} />

                    <SupportGrowthBanner navigation={navigation} />

                    <EventCountdownCard event={countdownEvent} loading={loadingHome} />

                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionTitle2}>More Featured Stories...</Text>
                        <View style={styles.sectionAccentLine} />
                    </View>

                    <HorizontalPostsRow posts={featuredStories} loading={loadingHome} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

function SupportGrowthBanner({ navigation }: any) {
    const pulse = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const arrowFloat = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulse, {
                        toValue: 1.018,
                        duration: 900,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulse, {
                        toValue: 1,
                        duration: 900,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(glow, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glow, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(arrowFloat, {
                        toValue: -4,
                        duration: 800,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(arrowFloat, {
                        toValue: 0,
                        duration: 800,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
            ])
        ).start();
    }, []);

    const shadowOpacity = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.62],
    });

    const shadowRadius = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [7, 17],
    });

    return (
        <Animated.View
            style={[
                styles.supportCard,
                {
                    transform: [{ scale: pulse }],
                    shadowOpacity,
                    shadowRadius,
                },
            ]}
        >
            <View style={styles.supportTopRow}>
                <View style={styles.supportIconCircle}>
                    <Animated.View style={{ transform: [{ translateY: arrowFloat }] }}>
                        <Ionicons name="trending-up" size={22} color="#050816" />
                    </Animated.View>
                </View>

                <View style={styles.supportTextWrap}>
                    <Text style={styles.supportTitle}>Help Push Chess Forward</Text>

                    <Text style={styles.supportSubtitle}>
                        Support and help Just Move take chess to the next level.
                    </Text>
                </View>
            </View>

            <View style={styles.supportActionsRow}>
                <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.supportActionButton, styles.gamesActionButton]}
                    onPress={() => navigation.navigate("GameHome")}
                >
                    <Ionicons
                        name="game-controller-outline"
                        size={18}
                        color="#D98CFF"
                    />

                    <Text style={styles.supportActionText}>
                        Party Games 🎉
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.supportActionButton, styles.blogsActionButton]}
                    onPress={() => navigation.navigate("Blogs")}
                >
                    <Ionicons
                        name="newspaper-outline"
                        size={18}
                        color="#FFD166"
                    />

                    <Text style={styles.supportActionText}>
                        Exclusive Blogs 📝
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
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

    sectionTitle2: {
        color: "#FFFFFF",
        fontSize: ms(16),
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

    supportCard: {
        backgroundColor: "#07111F",
        borderRadius: ms(20),
        borderWidth: 1.2,
        borderColor: "rgba(57, 192, 237, 0.62)",
        paddingHorizontal: s(13),
        paddingVertical: vs(11),
        marginTop: vs(2),
        marginBottom: vs(14),
        shadowColor: "#39C0ED",
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },

    supportTopRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    supportIconCircle: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: "#39C0ED",
        alignItems: "center",
        justifyContent: "center",
        marginRight: s(11),
    },

    supportTextWrap: {
        flex: 1,
    },

    supportTitle: {
        color: "#FFFFFF",
        fontSize: ms(15.5),
        fontWeight: "900",
        marginBottom: vs(3),
    },

    supportSubtitle: {
        color: "#BFD8E8",
        fontSize: ms(11.5),
        fontWeight: "700",
        lineHeight: ms(16),
    },

    supportActionsRow: {
        flexDirection: "row",
        gap: s(9),
        marginTop: vs(10),
    },

    supportActionButton: {
        flex: 1,
        height: vs(38),
        borderRadius: ms(13),
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: s(6),
    },

    gamesActionButton: {
        backgroundColor: "rgba(119, 70, 255, 0.16)",
        borderWidth: 1,
        borderColor: "rgba(217, 140, 255, 0.7)",
    },

    blogsActionButton: {
        backgroundColor: "rgba(255, 209, 102, 0.13)",
        borderWidth: 1,
        borderColor: "rgba(255, 209, 102, 0.75)",
    },

    supportActionText: {
        color: "#FFFFFF",
        fontSize: ms(10),
        fontWeight: "900",
    },

    refreshIndicator: {
        alignItems: "center",
        paddingVertical: vs(6),
    },
});