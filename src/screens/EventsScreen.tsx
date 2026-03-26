import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppHeader from "../components/AppHeader";

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

type EventsApiResponse = {
    success: boolean;
    page: number;
    limit: number;
    total: number;
    data: EventItem[];
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

function formatMonthYear(dateString: string) {
    return new Date(dateString).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });
}

function formatDateRange(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    const startMonth = start.toLocaleString("en-US", { month: "short" });
    const endMonth = end.toLocaleString("en-US", { month: "short" });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}–${endDay}, ${year}`;
    }

    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

function getCountdownParts(targetDateString: string) {
    const now = new Date().getTime();
    const target = new Date(targetDateString).getTime();
    const diff = Math.max(target - now, 0);

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return {
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
    };
}

function groupEventsByMonth(events: EventItem[]) {
    return events.reduce((acc: Record<string, EventItem[]>, event) => {
        const key = formatMonthYear(event.start_at);
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {});
}

export default function EventsScreen({ navigation }: any) {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [countdownTick, setCountdownTick] = useState(Date.now());

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/events`);
            const json: EventsApiResponse = await response.json();

            const fetchedEvents = (json.data || [])
                .filter((event) => event.is_published)
                .sort(
                    (a, b) =>
                        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
                );

            setEvents(fetchedEvents);
        } catch (error) {
            console.log("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdownTick(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchEvents();
            await new Promise((resolve) => setTimeout(resolve, 700));
        } finally {
            setRefreshing(false);
        }
    }, [fetchEvents]);

    const { heroEvent, remainingEvents } = useMemo(() => {
        const now = Date.now();

        const upcomingEvents = events.filter(
            (event) => new Date(event.start_at).getTime() >= now
        );

        const sortedUpcoming = [...upcomingEvents].sort(
            (a, b) =>
                new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        );

        const hero = sortedUpcoming[0] || events[0] || null;

        const rest = hero
            ? events.filter((event) => event._id !== hero._id)
            : [];

        return {
            heroEvent: hero,
            remainingEvents: rest,
        };
    }, [events, countdownTick]);

    const groupedEvents = useMemo(() => {
        return groupEventsByMonth(remainingEvents);
    }, [remainingEvents]);

    const groupedEntries = useMemo(() => {
        return Object.entries(groupedEvents).sort(
            ([, eventsA], [, eventsB]) =>
                new Date(eventsA[0].start_at).getTime() -
                new Date(eventsB[0].start_at).getTime()
        );
    }, [groupedEvents]);

    const countdown = heroEvent
        ? getCountdownParts(heroEvent.start_at)
        : { days: "00", hours: "00", minutes: "00", seconds: "00" };

    const openEvent = (event: EventItem) => {
        navigation.navigate("EventDetailScreen", { event });
    };

    if (loading) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2EE7FF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <AppHeader />

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color="#2EE7FF" />
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
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
                <View style={styles.topRow}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Text style={styles.screenTitle}>Events</Text>
                </View>

                {heroEvent ? (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => openEvent(heroEvent)}
                        style={styles.heroWrapper}
                    >
                        <View style={styles.heroCard}>
                            <Image
                                source={{ uri: heroEvent.cover_image_url }}
                                style={styles.heroImage}
                                resizeMode="cover"
                                onError={() =>
                                    console.log(
                                        "Hero event image failed:",
                                        heroEvent.cover_image_url
                                    )
                                }
                            />

                            <View style={styles.heroInfoBox}>
                                <Text style={styles.heroTitle} numberOfLines={2}>
                                    {heroEvent.title}
                                </Text>

                                <Text style={styles.heroDateRange}>
                                    {formatDateRange(heroEvent.start_at, heroEvent.end_at)}
                                </Text>

                                <View style={styles.countdownRow}>
                                    <View style={styles.countdownBox}>
                                        <Text style={styles.countdownNumber}>{countdown.days}</Text>
                                        <Text style={styles.countdownLabel}>Days</Text>
                                    </View>

                                    <View style={styles.countdownBox}>
                                        <Text style={styles.countdownNumber}>{countdown.hours}</Text>
                                        <Text style={styles.countdownLabel}>Hours</Text>
                                    </View>

                                    <View style={styles.countdownBox}>
                                        <Text style={styles.countdownNumber}>{countdown.minutes}</Text>
                                        <Text style={styles.countdownLabel}>Minutes</Text>
                                    </View>

                                    <View style={styles.countdownBox}>
                                        <Text style={styles.countdownNumber}>{countdown.seconds}</Text>
                                        <Text style={styles.countdownLabel}>Seconds</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : null}

                {groupedEntries.map(([monthLabel, monthEvents]) => (
                    <View key={monthLabel} style={styles.monthSection}>
                        <Text style={styles.monthTitle}>{monthLabel}</Text>

                        {monthEvents.map((event) => (
                            <TouchableOpacity
                                key={event._id}
                                style={styles.eventRow}
                                activeOpacity={0.88}
                                onPress={() => openEvent(event)}
                            >
                                <Image
                                    source={{
                                        uri: event.card_image_url || event.cover_image_url,
                                    }}
                                    style={styles.eventImage}
                                    resizeMode="cover"
                                    onError={() =>
                                        console.log(
                                            "Event row image failed:",
                                            event.card_image_url || event.cover_image_url
                                        )
                                    }
                                />

                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle} numberOfLines={2}>
                                        {event.title}
                                    </Text>

                                    <Text style={styles.eventDate}>
                                        {formatDateRange(event.start_at, event.end_at)}
                                    </Text>

                                    <Text style={styles.eventLocation} numberOfLines={2}>
                                        {event.location}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                <TouchableOpacity
                    style={styles.homeButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                >
                    <Ionicons name="home" size={20} color="#FFFFFF" />
                </TouchableOpacity>
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
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    refreshIndicator: {
        alignItems: "center",
        paddingVertical: 6,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        marginBottom: 18,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 26,
        fontWeight: "800",
        marginLeft: 14,
    },
    heroWrapper: {
        marginBottom: 28,
    },
    heroCard: {
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#0D0D0D",
        shadowColor: "#1DA1F2",
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
        borderWidth: 1,
        borderColor: "#15233A",
    },
    heroImage: {
        width: "100%",
        height: 190,
        backgroundColor: "#181818",
    },
    heroInfoBox: {
        backgroundColor: "#0B0B0B",
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 18,
    },
    heroTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "900",
        lineHeight: 28,
        marginBottom: 10,
    },
    heroDateRange: {
        color: "#F4D03F",
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 14,
    },
    countdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    countdownBox: {
        flex: 1,
        backgroundColor: "#04152D",
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#0E2A52",
    },
    countdownNumber: {
        color: "#2EE7FF",
        fontSize: 22,
        fontWeight: "900",
        marginBottom: 4,
    },
    countdownLabel: {
        color: "#CAD4E3",
        fontSize: 12,
        fontWeight: "700",
    },
    monthSection: {
        marginBottom: 22,
    },
    monthTitle: {
        color: "#F4D03F",
        fontSize: 24,
        fontWeight: "900",
        marginBottom: 12,
    },
    eventRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    eventImage: {
        width: 92,
        height: 92,
        borderRadius: 16,
        marginRight: 12,
        backgroundColor: "#1A1A1A",
    },
    eventContent: {
        flex: 1,
        minHeight: 92,
        justifyContent: "space-between",
        paddingVertical: 2,
    },
    eventTitle: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
        lineHeight: 21,
        marginBottom: 6,
    },
    eventDate: {
        color: "#F4D03F",
        fontSize: 12,
        fontWeight: "800",
        marginBottom: 6,
    },
    eventLocation: {
        color: "#CFCFCF",
        fontSize: 13,
        lineHeight: 17,
    },
    fixedHomeButtonWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    homeButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1A4A",
        borderWidth: 1.5,
        borderColor: "#1C3D8F",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 8,
    },
});