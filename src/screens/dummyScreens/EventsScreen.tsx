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

type TimeTheme = "day" | "night";

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

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getEventsTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            bg: "#F8FAFC",
            card: "#FFFFFF",
            cardAlt: "#ECFEFF",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border: "rgba(7,17,31,0.10)",
            borderStrong: "rgba(6,182,212,0.28)",
            cyan: "#06B6D4",
            yellow: "#FACC15",
            red: "#EF4444",
            completedCard: "#F1F5F9",
            completedBadge: "#E2E8F0",
            completedText: "#475569",
            countdownBox: "#ECFEFF",
            countdownBorder: "rgba(6,182,212,0.22)",
            homeBg: "#06B6D4",
            homeIcon: "#07111F",
            shadow: "#06B6D4",
            refreshBg: "#FFFFFF",
        };
    }

    return {
        bg: "#020617",
        card: "#090D14",
        cardAlt: "#07111F",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.10)",
        borderStrong: "rgba(34,211,238,0.30)",
        cyan: "#22D3EE",
        yellow: "#FACC15",
        red: "#EF4444",
        completedCard: "#090909",
        completedBadge: "#2A2A2A",
        completedText: "#CFCFCF",
        countdownBox: "#04152D",
        countdownBorder: "#0E2A52",
        homeBg: "#0B1A4A",
        homeIcon: "#FFFFFF",
        shadow: "#22D3EE",
        refreshBg: "#111827",
    };
};

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
    const [themeMode, setThemeMode] = useState<TimeTheme>(getCurrentThemeMode());
    const theme = getEventsTheme(themeMode);

    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [countdownTick, setCountdownTick] = useState(Date.now());
    const [showCompleted, setShowCompleted] = useState(false);

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/events`);
            const json: EventsApiResponse = await response.json();

            const fetchedEvents = (json.data || [])
                .filter((event) => event.is_published)
                .sort(
                    (a, b) =>
                        new Date(a.start_at).getTime() -
                        new Date(b.start_at).getTime()
                );

            setEvents(fetchedEvents);
        } catch (error) {
            console.log("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setThemeMode(getCurrentThemeMode());
        }, 60000);

        return () => clearInterval(interval);
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

    const {
        currentEvents,
        upcomingEvents,
        completedThisYearEvents,
        countdownEvent,
    } = useMemo(() => {
        const now = countdownTick;
        const currentYear = new Date(now).getFullYear();

        const sorted = [...events].sort(
            (a, b) =>
                new Date(a.start_at).getTime() -
                new Date(b.start_at).getTime()
        );

        const current = sorted.filter((event) => {
            const start = new Date(event.start_at).getTime();
            const end = new Date(event.end_at).getTime();
            return start <= now && end >= now;
        });

        const upcoming = sorted.filter(
            (event) => new Date(event.start_at).getTime() > now
        );

        const completedThisYear = sorted
            .filter((event) => {
                const end = new Date(event.end_at);
                return end.getTime() < now && end.getFullYear() === currentYear;
            })
            .sort(
                (a, b) =>
                    new Date(b.end_at).getTime() -
                    new Date(a.end_at).getTime()
            );

        return {
            currentEvents: current,
            upcomingEvents: upcoming,
            completedThisYearEvents: completedThisYear,
            countdownEvent: upcoming[0] || null,
        };
    }, [events, countdownTick]);

    const groupedUpcomingEntries = useMemo(() => {
        return Object.entries(groupEventsByMonth(upcomingEvents)).sort(
            ([, eventsA], [, eventsB]) =>
                new Date(eventsA[0].start_at).getTime() -
                new Date(eventsB[0].start_at).getTime()
        );
    }, [upcomingEvents]);

    const groupedCompletedEntries = useMemo(() => {
        return Object.entries(groupEventsByMonth(completedThisYearEvents)).sort(
            ([, eventsA], [, eventsB]) =>
                new Date(eventsB[0].end_at).getTime() -
                new Date(eventsA[0].end_at).getTime()
        );
    }, [completedThisYearEvents]);

    const countdown = countdownEvent
        ? getCountdownParts(countdownEvent.start_at)
        : { days: "00", hours: "00", minutes: "00", seconds: "00" };

    const openEvent = (event: EventItem) => {
        navigation.navigate("EventDetailScreen", { event });
    };

    const renderEventCard = (
        event: EventItem,
        options?: {
            isCurrent?: boolean;
            isCountdownEvent?: boolean;
            isCompleted?: boolean;
        }
    ) => {
        const isCurrent = options?.isCurrent;
        const isCountdownEvent = options?.isCountdownEvent;
        const isCompleted = options?.isCompleted;

        return (
            <TouchableOpacity
                key={event._id}
                style={[
                    styles.eventCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                    },
                    isCurrent && {
                        backgroundColor:
                            themeMode === "day" ? "#FEF2F2" : "#120707",
                        borderColor: theme.red,
                        shadowColor: theme.red,
                        shadowOpacity: 0.25,
                    },
                    isCountdownEvent && {
                        backgroundColor: theme.cardAlt,
                        borderColor: theme.cyan,
                        shadowColor: theme.shadow,
                        shadowOpacity: 0.2,
                    },
                    isCompleted && {
                        opacity: 0.78,
                        backgroundColor: theme.completedCard,
                        borderColor: theme.border,
                    },
                ]}
                activeOpacity={0.9}
                onPress={() => openEvent(event)}
            >
                <Image
                    source={{
                        uri: event.card_image_url || event.cover_image_url,
                    }}
                    style={styles.eventImage}
                    resizeMode="cover"
                />

                <View style={styles.eventContent}>
                    {isCurrent && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveBadgeText}>
                                Currently Happening
                            </Text>
                        </View>
                    )}

                    {isCountdownEvent && (
                        <View
                            style={[
                                styles.nextBadge,
                                { backgroundColor: theme.cyan },
                            ]}
                        >
                            <Ionicons name="time-outline" size={13} color="#07111F" />
                            <Text style={styles.nextBadgeText}>Next Event</Text>
                        </View>
                    )}

                    {isCompleted && (
                        <View
                            style={[
                                styles.completedBadge,
                                { backgroundColor: theme.completedBadge },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.completedBadgeText,
                                    { color: theme.completedText },
                                ]}
                            >
                                Completed
                            </Text>
                        </View>
                    )}

                    <Text
                        style={[styles.eventTitle, { color: theme.text }]}
                        numberOfLines={2}
                    >
                        {event.title}
                    </Text>

                    <Text style={[styles.eventDate, { color: theme.yellow }]}>
                        {formatDateRange(event.start_at, event.end_at)}
                    </Text>

                    <Text
                        style={[styles.eventLocation, { color: theme.textSoft }]}
                        numberOfLines={2}
                    >
                        {event.location}
                    </Text>

                    {isCountdownEvent && (
                        <View style={styles.countdownRow}>
                            {[
                                ["Days", countdown.days],
                                ["Hours", countdown.hours],
                                ["Min", countdown.minutes],
                                ["Sec", countdown.seconds],
                            ].map(([label, value]) => (
                                <View
                                    key={label}
                                    style={[
                                        styles.countdownBox,
                                        {
                                            backgroundColor: theme.countdownBox,
                                            borderColor: theme.countdownBorder,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.countdownNumber,
                                            { color: theme.cyan },
                                        ]}
                                    >
                                        {value}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.countdownLabel,
                                            { color: theme.textSoft },
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView
                edges={["left", "right"]}
                style={[styles.safeArea, { backgroundColor: theme.bg }]}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.cyan} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={["left", "right"]}
            style={[styles.safeArea, { backgroundColor: theme.bg }]}
        >

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color={theme.cyan} />
                </View>
            )}

            <ScrollView
                style={[styles.container, { backgroundColor: theme.bg }]}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.cyan}
                        colors={[theme.cyan]}
                        progressBackgroundColor={theme.refreshBg}
                    />
                }
            >
                <View
                    style={[
                        styles.hero,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.borderStrong,
                            shadowColor: theme.shadow,
                        },
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[
                            styles.backButton,
                            {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.border,
                            },
                        ]}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={23} color={theme.text} />
                    </TouchableOpacity>

                    <View style={styles.heroTextWrap}>
                        <Text style={[styles.heroEyebrow, { color: theme.cyan }]}>
                            SCOOLFOOLS
                        </Text>
                        <Text style={[styles.screenTitle, { color: theme.text }]}>
                            Events
                        </Text>
                    </View>
                </View>

                {currentEvents.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            Currently Happening
                        </Text>

                        {currentEvents.map((event) =>
                            renderEventCard(event, { isCurrent: true })
                        )}
                    </View>
                )}

                {upcomingEvents.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            Upcoming
                        </Text>

                        {groupedUpcomingEntries.map(([monthLabel, monthEvents]) => (
                            <View key={monthLabel} style={styles.monthSection}>
                                <Text style={[styles.monthTitle, { color: theme.yellow }]}>
                                    {monthLabel}
                                </Text>

                                {monthEvents.map((event) =>
                                    renderEventCard(event, {
                                        isCountdownEvent:
                                            countdownEvent?._id === event._id,
                                    })
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {completedThisYearEvents.length > 0 && (
                    <View style={styles.completedSection}>
                        <TouchableOpacity
                            style={[
                                styles.completedToggle,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.border,
                                },
                            ]}
                            activeOpacity={0.85}
                            onPress={() => setShowCompleted((prev) => !prev)}
                        >
                            <View>
                                <Text
                                    style={[
                                        styles.completedToggleTitle,
                                        { color: theme.text },
                                    ]}
                                >
                                    Completed This Year
                                </Text>
                                <Text
                                    style={[
                                        styles.completedToggleSubtitle,
                                        { color: theme.muted },
                                    ]}
                                >
                                    {completedThisYearEvents.length} event
                                    {completedThisYearEvents.length === 1 ? "" : "s"}
                                </Text>
                            </View>

                            <Ionicons
                                name={showCompleted ? "chevron-up" : "chevron-down"}
                                size={22}
                                color={theme.text}
                            />
                        </TouchableOpacity>

                        {showCompleted &&
                            groupedCompletedEntries.map(([monthLabel, monthEvents]) => (
                                <View key={monthLabel} style={styles.monthSection}>
                                    <Text
                                        style={[
                                            styles.monthTitle,
                                            { color: theme.yellow },
                                        ]}
                                    >
                                        {monthLabel}
                                    </Text>

                                    {monthEvents.map((event) =>
                                        renderEventCard(event, { isCompleted: true })
                                    )}
                                </View>
                            ))}
                    </View>
                )}
            </ScrollView>

            <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                <TouchableOpacity
                    style={[
                        styles.homeButton,
                        {
                            backgroundColor: theme.homeBg,
                            borderColor: theme.cyan,
                            shadowColor: theme.shadow,
                        },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                >
                    <Ionicons name="home" size={21} color={theme.homeIcon} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === "android" ? 210 : 120,
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
    hero: {
        minHeight: 78,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        marginTop: 6,
        marginBottom: 18,
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        marginRight: 13,
    },
    heroTextWrap: {
        flex: 1,
    },
    heroEyebrow: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.8,
    },
    screenTitle: {
        fontSize: 32,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.55,
        marginTop: -2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 26,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
        marginBottom: 12,
    },
    monthSection: {
        marginBottom: 22,
    },
    monthTitle: {
        fontSize: 24,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        marginBottom: 12,
    },
    eventCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
    eventImage: {
        width: 94,
        height: 104,
        borderRadius: 16,
        marginRight: 12,
        backgroundColor: "#1A1A1A",
    },
    eventContent: {
        flex: 1,
        minHeight: 104,
        justifyContent: "center",
        paddingVertical: 2,
    },
    liveBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EF4444",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 8,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
    },
    liveBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    nextBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 8,
    },
    nextBadgeText: {
        color: "#07111F",
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    completedBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 8,
    },
    completedBadgeText: {
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    eventTitle: {
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
        lineHeight: 21,
        marginBottom: 6,
    },
    eventDate: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
        marginBottom: 6,
    },
    eventLocation: {
        fontSize: 13,
        lineHeight: 17,
    },
    countdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
        marginTop: 12,
    },
    countdownBox: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 8,
        alignItems: "center",
        borderWidth: 1,
    },
    countdownNumber: {
        fontSize: 20,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginBottom: 2,
    },
    countdownLabel: {
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },
    completedSection: {
        marginTop: 4,
        marginBottom: 24,
    },
    completedToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 14,
    },
    completedToggleTitle: {
        fontSize: 20,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },
    completedToggleSubtitle: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
        marginTop: 3,
    },
    fixedHomeButtonWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: Platform.OS === "android" ? 78 : 18,
        alignItems: "center",
        justifyContent: "center",
    },
    homeButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
        elevation: 8,
    },
});