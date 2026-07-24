import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
    useTimeTheme,
    type TimeTheme,
} from "../context/TimeThemeContext";

type EventStatus = "scheduled" | "canceled" | "postponed";

type EventItem = {
    _id: string;
    title: string;
    slug: string;
    summary?: string | null;
    description: string;
    location?: string | null;
    start_at: string;
    end_at: string | null;
    estimated_duration_minutes?: number | null;
    end_time_is_estimated?: boolean;
    timezone: string;
    card_image_url?: string | null;
    cover_image_url?: string | null;
    broadcaster?: string | null;
    broadcast_url?: string | null;
    promo_label?: string | null;
    promo_url?: string | null;
    is_sponsored: boolean;
    sponsor_name?: string | null;
    is_published: boolean;
    is_featured: boolean;
    status: EventStatus;
    createdAt?: string;
    updatedAt?: string;
};

type EventsApiResponse = {
    success?: boolean;
    events?: EventItem[];
    data?: EventItem[] | { events?: EventItem[] };
    results?: EventItem[];
};

type DisplayStatus =
    | "Scheduled"
    | "Happening Now"
    | "Completed"
    | "Canceled"
    | "Postponed";

type MonthGroup = {
    monthNumber: number;
    monthLabel: string;
    events: EventItem[];
};

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const getEventsTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            background: "#F8FAFC",
            card: "#FFFFFF",
            cardSoft: "#ECFEFF",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border: "rgba(7,17,31,0.10)",
            borderStrong: "rgba(6,182,212,0.28)",
            cyan: "#06B6D4",
            yellow: "#CA8A04",
            red: "#DC2626",
            green: "#16A34A",
            amber: "#D97706",
            completed: "#64748B",
            imagePlaceholder: "#E2E8F0",
            refreshBackground: "#FFFFFF",
            shadow: "#06B6D4",
        };
    }

    return {
        background: "#020617",
        card: "#090D14",
        cardSoft: "#07111F",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.10)",
        borderStrong: "rgba(34,211,238,0.30)",
        cyan: "#22D3EE",
        yellow: "#FACC15",
        red: "#F87171",
        green: "#4ADE80",
        amber: "#FBBF24",
        completed: "#94A3B8",
        imagePlaceholder: "#111827",
        refreshBackground: "#111827",
        shadow: "#22D3EE",
    };
};

function getEventDateParts(event: EventItem) {
    const date = new Date(event.start_at);

    if (Number.isNaN(date.getTime())) {
        return {
            year: 0,
            month: 0,
        };
    }

    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: event.timezone || undefined,
            year: "numeric",
            month: "numeric",
        }).formatToParts(date);

        return {
            year: Number(parts.find((part) => part.type === "year")?.value || 0),
            month: Number(
                parts.find((part) => part.type === "month")?.value || 0
            ),
        };
    } catch {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
        };
    }
}

function formatMonth(event: EventItem) {
    const date = new Date(event.start_at);

    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: event.timezone || undefined,
            month: "long",
        }).format(date);
    } catch {
        return date.toLocaleString("en-US", { month: "long" });
    }
}

function formatEventDate(event: EventItem) {
    const date = new Date(event.start_at);
    if (Number.isNaN(date.getTime())) return "Date TBA";

    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: event.timezone || undefined,
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
        }).format(date);
    } catch {
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }
}

function formatEstimatedDuration(minutes?: number | null) {
    if (!minutes || minutes <= 0) return null;

    const hours = minutes / 60;

    if (Number.isInteger(hours)) {
        return `Est. ${hours} hr${hours === 1 ? "" : "s"}`;
    }

    return `Est. ${hours.toFixed(1)} hrs`;
}

function getDisplayStatus(event: EventItem, now: number): DisplayStatus {
    if (event.status === "canceled") return "Canceled";
    if (event.status === "postponed") return "Postponed";

    const start = new Date(event.start_at).getTime();
    const end = event.end_at
        ? new Date(event.end_at).getTime()
        : Number.NaN;

    if (Number.isFinite(start) && now < start) return "Scheduled";
    if (Number.isFinite(end) && now <= end) return "Happening Now";
    if (Number.isFinite(end) && now > end) return "Completed";

    return "Scheduled";
}

function extractEvents(json: EventsApiResponse | EventItem[]) {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.events)) return json.events;
    if (Array.isArray(json.data)) return json.data;
    if (json.data && Array.isArray(json.data.events)) return json.data.events;
    if (Array.isArray(json.results)) return json.results;
    return [];
}

export default function EventsScreen({ navigation }: any) {
    const { mode: themeMode } = useTimeTheme();
    const theme = getEventsTheme(themeMode);

    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [now, setNow] = useState(Date.now());

    const fetchEvents = useCallback(async () => {
        setError("");

        try {
            if (!API_BASE_URL) {
                throw new Error("Event API URL is missing.");
            }

            const response = await fetch(
                `${API_BASE_URL}/api/events?scope=all&limit=250`
            );

            const json: EventsApiResponse | EventItem[] = await response.json();

            if (!response.ok) {
                const message =
                    !Array.isArray(json) && "message" in json
                        ? String((json as any).message)
                        : "Failed to load events.";

                throw new Error(message);
            }

            const fetchedEvents = extractEvents(json)
                .filter((event) => event.is_published)
                .sort(
                    (a, b) =>
                        new Date(a.start_at).getTime() -
                        new Date(b.start_at).getTime()
                );

            setEvents(fetchedEvents);
        } catch (fetchError: any) {
            console.log("Error fetching events:", fetchError);
            setError(fetchError?.message || "Unable to load events.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    const years = useMemo(() => {
        const uniqueYears = Array.from(
            new Set(
                events
                    .map((event) => getEventDateParts(event).year)
                    .filter(Boolean)
            )
        );

        return uniqueYears.sort((a, b) => b - a);
    }, [events]);

    useEffect(() => {
        if (!years.length) {
            setSelectedYear(null);
            return;
        }

        if (selectedYear && years.includes(selectedYear)) return;

        const currentYear = new Date().getFullYear();
        setSelectedYear(
            years.includes(currentYear)
                ? currentYear
                : [...years].reverse().find((year) => year > currentYear) ||
                years[0]
        );
    }, [selectedYear, years]);

    const monthGroups = useMemo<MonthGroup[]>(() => {
        if (!selectedYear) return [];

        const groups = new Map<number, MonthGroup>();

        events.forEach((event) => {
            const { year, month } = getEventDateParts(event);

            if (year !== selectedYear || !month) return;

            if (!groups.has(month)) {
                groups.set(month, {
                    monthNumber: month,
                    monthLabel: formatMonth(event),
                    events: [],
                });
            }

            groups.get(month)?.events.push(event);
        });

        return Array.from(groups.values())
            .sort((a, b) => a.monthNumber - b.monthNumber)
            .map((group) => ({
                ...group,
                events: group.events.sort(
                    (a, b) =>
                        new Date(a.start_at).getTime() -
                        new Date(b.start_at).getTime()
                ),
            }));
    }, [events, selectedYear]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchEvents();
        } finally {
            setRefreshing(false);
        }
    }, [fetchEvents]);

    const openEvent = (event: EventItem) => {
        navigation.navigate("EventDetailScreen", { event });
    };

    const getStatusColor = (status: DisplayStatus) => {
        switch (status) {
            case "Happening Now":
                return theme.green;
            case "Canceled":
                return theme.red;
            case "Postponed":
                return theme.amber;
            case "Completed":
                return theme.completed;
            default:
                return theme.cyan;
        }
    };

    const renderEventCard = (event: EventItem) => {
        const status = getDisplayStatus(event, now);
        const statusColor = getStatusColor(status);
        const imageUrl = event.card_image_url || event.cover_image_url || null;
        const duration = event.end_time_is_estimated
            ? formatEstimatedDuration(event.estimated_duration_minutes)
            : null;

        return (
            <TouchableOpacity
                key={event._id}
                style={[
                    styles.eventCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                    },
                ]}
                activeOpacity={0.88}
                onPress={() => openEvent(event)}
            >
                <View
                    style={[
                        styles.imageWrap,
                        { backgroundColor: theme.imagePlaceholder },
                    ]}
                >
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.eventImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons
                            name="calendar-outline"
                            size={30}
                            color={theme.muted}
                        />
                    )}
                </View>

                <View style={styles.eventContent}>
                    <View style={styles.badgeRow}>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    borderColor: statusColor,
                                    backgroundColor: `${statusColor}18`,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    { color: statusColor },
                                ]}
                            >
                                {status}
                            </Text>
                        </View>

                        {event.is_sponsored ? (
                            <View
                                style={[
                                    styles.sponsoredBadge,
                                    {
                                        backgroundColor: theme.cardSoft,
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.sponsoredBadgeText,
                                        { color: theme.textSoft },
                                    ]}
                                >
                                    Sponsored
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <Text
                        style={[styles.eventTitle, { color: theme.text }]}
                        numberOfLines={2}
                    >
                        {event.title}
                    </Text>

                    <View style={styles.metaRow}>
                        <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={theme.yellow}
                        />
                        <Text
                            style={[styles.eventDate, { color: theme.yellow }]}
                            numberOfLines={1}
                        >
                            {formatEventDate(event)}
                        </Text>
                    </View>

                    {event.location ? (
                        <View style={styles.metaRow}>
                            <Ionicons
                                name="location-outline"
                                size={14}
                                color={theme.textSoft}
                            />
                            <Text
                                style={[
                                    styles.metaText,
                                    { color: theme.textSoft },
                                ]}
                                numberOfLines={1}
                            >
                                {event.location}
                            </Text>
                        </View>
                    ) : null}

                    {event.broadcaster || duration ? (
                        <View style={styles.footerRow}>
                            {event.broadcaster ? (
                                <View style={styles.broadcastRow}>
                                    <Ionicons
                                        name="tv-outline"
                                        size={14}
                                        color={theme.cyan}
                                    />
                                    <Text
                                        style={[
                                            styles.broadcastText,
                                            { color: theme.cyan },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {event.broadcaster}
                                    </Text>
                                </View>
                            ) : (
                                <View />
                            )}

                            {duration ? (
                                <Text
                                    style={[
                                        styles.durationText,
                                        { color: theme.muted },
                                    ]}
                                >
                                    {duration}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={theme.muted}
                />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView
                edges={["left", "right"]}
                style={[
                    styles.safeArea,
                    { backgroundColor: theme.background },
                ]}
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
            style={[styles.safeArea, { backgroundColor: theme.background }]}
        >
            <ScrollView
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.cyan}
                        colors={[theme.cyan]}
                        progressBackgroundColor={theme.refreshBackground}
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
                                backgroundColor: theme.cardSoft,
                                borderColor: theme.border,
                            },
                        ]}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={23}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <View style={styles.heroTextWrap}>
                        <Text
                            style={[styles.heroEyebrow, { color: theme.cyan }]}
                        >
                            SCOOLFOOLS
                        </Text>
                        <Text
                            style={[styles.screenTitle, { color: theme.text }]}
                        >
                            Events
                        </Text>
                    </View>
                </View>

                {error ? (
                    <View
                        style={[
                            styles.messageCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Ionicons
                            name="alert-circle-outline"
                            size={22}
                            color={theme.red}
                        />
                        <View style={styles.messageTextWrap}>
                            <Text
                                style={[
                                    styles.messageTitle,
                                    { color: theme.text },
                                ]}
                            >
                                Events could not load
                            </Text>
                            <Text
                                style={[
                                    styles.messageBody,
                                    { color: theme.textSoft },
                                ]}
                            >
                                {error}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={fetchEvents}>
                            <Text
                                style={[
                                    styles.retryText,
                                    { color: theme.cyan },
                                ]}
                            >
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {years.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.yearSelector}
                    >
                        {years.map((year) => {
                            const selected = selectedYear === year;

                            return (
                                <TouchableOpacity
                                    key={year}
                                    onPress={() => setSelectedYear(year)}
                                    style={[
                                        styles.yearButton,
                                        {
                                            backgroundColor: "transparent",
                                            borderColor: selected
                                                ? theme.cyan
                                                : theme.border,
                                        },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.yearButtonText,
                                            {
                                                color: selected
                                                    ? theme.cyan
                                                    : theme.text,
                                            },
                                        ]}
                                    >
                                        {year}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : null}

                {monthGroups.map((group) => (
                    <View
                        key={`${selectedYear}-${group.monthNumber}`}
                        style={styles.monthSection}
                    >
                        <View style={styles.monthHeader}>
                            <Text
                                style={[
                                    styles.monthTitle,
                                    { color: theme.text },
                                ]}
                            >
                                {group.monthLabel}
                            </Text>
                            <Text
                                style={[
                                    styles.eventCount,
                                    { color: theme.muted },
                                ]}
                            >
                                {group.events.length} event
                                {group.events.length === 1 ? "" : "s"}
                            </Text>
                        </View>

                        {group.events.map(renderEventCard)}
                    </View>
                ))}

                {!error && events.length === 0 ? (
                    <View
                        style={[
                            styles.emptyCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={36}
                            color={theme.cyan}
                        />
                        <Text
                            style={[styles.emptyTitle, { color: theme.text }]}
                        >
                            No events yet
                        </Text>
                        <Text
                            style={[
                                styles.emptyBody,
                                { color: theme.textSoft },
                            ]}
                        >
                            Published events will appear here.
                        </Text>
                    </View>
                ) : null}

                {!error &&
                    events.length > 0 &&
                    selectedYear &&
                    monthGroups.length === 0 ? (
                    <View
                        style={[
                            styles.emptyCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[styles.emptyTitle, { color: theme.text }]}
                        >
                            No events in {selectedYear}
                        </Text>
                    </View>
                ) : null}
            </ScrollView>
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
        alignItems: "center",
        justifyContent: "center",
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
        elevation: 5,
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
    messageCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 10,
    },
    messageTextWrap: {
        flex: 1,
    },
    messageTitle: {
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
    },
    messageBody: {
        fontSize: 12,
        marginTop: 2,
    },
    retryText: {
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
    },
    yearSelector: {
        gap: 10,
        paddingBottom: 22,
    },
    yearButton: {
        minWidth: 78,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
    },
    yearButtonText: {
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },
    monthSection: {
        marginBottom: 24,
    },
    monthHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    monthTitle: {
        fontSize: 26,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },
    eventCount: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
    },
    eventCard: {
        minHeight: 126,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    imageWrap: {
        width: 98,
        height: 106,
        borderRadius: 16,
        marginRight: 12,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    eventImage: {
        width: "100%",
        height: "100%",
    },
    eventContent: {
        flex: 1,
        minHeight: 106,
        justifyContent: "center",
        paddingRight: 5,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 7,
    },
    statusBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusBadgeText: {
        fontSize: 10,
        fontFamily: "Rajdhani_700Bold",
        textTransform: "uppercase",
        letterSpacing: 0.35,
    },
    sponsoredBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    sponsoredBadgeText: {
        fontSize: 10,
        fontFamily: "Rajdhani_700Bold",
        textTransform: "uppercase",
        letterSpacing: 0.35,
    },
    eventTitle: {
        fontSize: 18,
        lineHeight: 21,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.2,
        marginBottom: 7,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 5,
    },
    eventDate: {
        flex: 1,
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.15,
    },
    metaText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 2,
    },
    broadcastRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    broadcastText: {
        flex: 1,
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
    },
    durationText: {
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 28,
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 21,
        fontFamily: "Rajdhani_700Bold",
        marginTop: 10,
    },
    emptyBody: {
        fontSize: 14,
        marginTop: 4,
        textAlign: "center",
    },
});