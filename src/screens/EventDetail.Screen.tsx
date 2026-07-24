import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

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

type DisplayStatus =
    | "Scheduled"
    | "Happening Now"
    | "Completed"
    | "Canceled"
    | "Postponed";

const getEventTheme = (mode: TimeTheme) => {
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
            primaryButtonText: "#07111F",
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
        primaryButtonText: "#07111F",
        shadow: "#22D3EE",
    };
};

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

function formatDateTime(value: string | null | undefined, timezone?: string) {
    if (!value) return "Time TBA";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time TBA";

    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: timezone || undefined,
            weekday: "short",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
        }).format(date);
    } catch {
        return date.toLocaleString("en-US", {
            weekday: "short",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }
}

function formatDuration(minutes?: number | null) {
    if (!minutes || minutes <= 0) return null;

    const hours = minutes / 60;

    if (Number.isInteger(hours)) {
        return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    return `${hours.toFixed(1)} hours`;
}

function normalizeUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();

    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    return `https://${trimmed}`;
}

export default function EventDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { mode: themeMode } = useTimeTheme();
    const theme = getEventTheme(themeMode);

    const event: EventItem | undefined = route.params?.event;
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    const openLink = async (rawUrl?: string | null) => {
        if (!rawUrl) return;

        try {
            const url = normalizeUrl(rawUrl);

            if (!url) {
                Alert.alert("Invalid link", "This link is empty.");
                return;
            }

            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            console.log("Failed to open event link:", rawUrl, error);
            Alert.alert("Error", "This link could not be opened.");
        }
    };

    if (!event) {
        return (
            <SafeAreaView
                style={[
                    styles.safeArea,
                    { backgroundColor: theme.background },
                ]}
            >
                <View style={styles.centered}>
                    <Ionicons
                        name="calendar-outline"
                        size={42}
                        color={theme.cyan}
                    />
                    <Text style={[styles.errorTitle, { color: theme.text }]}>
                        Event not found
                    </Text>
                    <Pressable
                        style={[
                            styles.errorBackButton,
                            { backgroundColor: theme.cyan },
                        ]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text
                            style={[
                                styles.errorBackText,
                                { color: theme.primaryButtonText },
                            ]}
                        >
                            Go Back
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const displayStatus = getDisplayStatus(event, now);
    const statusColor =
        displayStatus === "Happening Now"
            ? theme.green
            : displayStatus === "Canceled"
                ? theme.red
                : displayStatus === "Postponed"
                    ? theme.amber
                    : displayStatus === "Completed"
                        ? theme.completed
                        : theme.cyan;

    const imageUrl = event.cover_image_url || event.card_image_url || null;
    const duration = event.end_time_is_estimated
        ? formatDuration(event.estimated_duration_minutes)
        : null;

    const showSummary =
        Boolean(event.summary?.trim()) &&
        event.summary?.trim() !== event.description?.trim();

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
            >
                <View style={styles.heroWrap}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={[
                                styles.heroPlaceholder,
                                { backgroundColor: theme.imagePlaceholder },
                            ]}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={54}
                                color={theme.muted}
                            />
                        </View>
                    )}

                    <View style={styles.heroShade} />

                    <Pressable
                        style={[
                            styles.backButton,
                            {
                                backgroundColor:
                                    themeMode === "day"
                                        ? "rgba(255,255,255,0.92)"
                                        : "rgba(2,6,23,0.88)",
                                borderColor: theme.border,
                            },
                        ]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={theme.text}
                        />
                    </Pressable>

                    <View style={styles.heroBadges}>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    borderColor: statusColor,
                                    backgroundColor:
                                        themeMode === "day"
                                            ? "rgba(255,255,255,0.94)"
                                            : "rgba(2,6,23,0.88)",
                                },
                            ]}
                        >
                            {displayStatus === "Happening Now" ? (
                                <View
                                    style={[
                                        styles.liveDot,
                                        { backgroundColor: statusColor },
                                    ]}
                                />
                            ) : null}

                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    { color: statusColor },
                                ]}
                            >
                                {displayStatus}
                            </Text>
                        </View>

                        {event.is_sponsored ? (
                            <View
                                style={[
                                    styles.sponsoredBadge,
                                    {
                                        backgroundColor:
                                            themeMode === "day"
                                                ? "rgba(255,255,255,0.94)"
                                                : "rgba(2,6,23,0.88)",
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.sponsoredBadgeText,
                                        { color: theme.text },
                                    ]}
                                >
                                    Sponsored
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.pageContent}>
                    <Text style={[styles.title, { color: theme.text }]}>
                        {event.title}
                    </Text>

                    {event.is_sponsored && event.sponsor_name ? (
                        <Text
                            style={[
                                styles.sponsorLine,
                                { color: theme.muted },
                            ]}
                        >
                            Presented by {event.sponsor_name}
                        </Text>
                    ) : null}

                    {showSummary ? (
                        <Text
                            style={[
                                styles.summaryText,
                                { color: theme.textSoft },
                            ]}
                        >
                            {event.summary}
                        </Text>
                    ) : null}

                    <View
                        style={[
                            styles.infoCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <View style={styles.infoItem}>
                            <View
                                style={[
                                    styles.infoIcon,
                                    { backgroundColor: theme.cardSoft },
                                ]}
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={20}
                                    color={theme.cyan}
                                />
                            </View>

                            <View style={styles.infoTextWrap}>
                                <Text
                                    style={[
                                        styles.infoLabel,
                                        { color: theme.muted },
                                    ]}
                                >
                                    Starts
                                </Text>
                                <Text
                                    style={[
                                        styles.infoValue,
                                        { color: theme.text },
                                    ]}
                                >
                                    {formatDateTime(
                                        event.start_at,
                                        event.timezone
                                    )}
                                </Text>
                            </View>
                        </View>

                        <View
                            style={[
                                styles.divider,
                                { backgroundColor: theme.border },
                            ]}
                        />

                        <View style={styles.infoItem}>
                            <View
                                style={[
                                    styles.infoIcon,
                                    { backgroundColor: theme.cardSoft },
                                ]}
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={theme.yellow}
                                />
                            </View>

                            <View style={styles.infoTextWrap}>
                                <Text
                                    style={[
                                        styles.infoLabel,
                                        { color: theme.muted },
                                    ]}
                                >
                                    {duration
                                        ? "Estimated Duration"
                                        : "Ends"}
                                </Text>
                                <Text
                                    style={[
                                        styles.infoValue,
                                        { color: theme.text },
                                    ]}
                                >
                                    {duration ||
                                        formatDateTime(
                                            event.end_at,
                                            event.timezone
                                        )}
                                </Text>
                            </View>
                        </View>

                        {event.location ? (
                            <>
                                <View
                                    style={[
                                        styles.divider,
                                        { backgroundColor: theme.border },
                                    ]}
                                />

                                <View style={styles.infoItem}>
                                    <View
                                        style={[
                                            styles.infoIcon,
                                            {
                                                backgroundColor:
                                                    theme.cardSoft,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="location-outline"
                                            size={20}
                                            color={theme.red}
                                        />
                                    </View>

                                    <View style={styles.infoTextWrap}>
                                        <Text
                                            style={[
                                                styles.infoLabel,
                                                { color: theme.muted },
                                            ]}
                                        >
                                            Location
                                        </Text>
                                        <Text
                                            style={[
                                                styles.infoValue,
                                                { color: theme.text },
                                            ]}
                                        >
                                            {event.location}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        ) : null}
                    </View>

                    {event.description ? (
                        <View style={styles.section}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { color: theme.text },
                                ]}
                            >
                                About This Event
                            </Text>
                            <Text
                                style={[
                                    styles.descriptionText,
                                    { color: theme.textSoft },
                                ]}
                            >
                                {event.description}
                            </Text>
                        </View>
                    ) : null}

                    {event.broadcaster ? (
                        <View style={styles.section}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { color: theme.text },
                                ]}
                            >
                                Broadcast
                            </Text>

                            <View
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.actionIcon,
                                        { backgroundColor: theme.cardSoft },
                                    ]}
                                >
                                    <Ionicons
                                        name="tv-outline"
                                        size={24}
                                        color={theme.cyan}
                                    />
                                </View>

                                <View style={styles.actionContent}>
                                    <Text
                                        style={[
                                            styles.actionLabel,
                                            { color: theme.muted },
                                        ]}
                                    >
                                        Watch on
                                    </Text>
                                    <Text
                                        style={[
                                            styles.actionTitle,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {event.broadcaster}
                                    </Text>
                                </View>

                                {event.broadcast_url ? (
                                    <Pressable
                                        style={[
                                            styles.smallActionButton,
                                            { backgroundColor: theme.cyan },
                                        ]}
                                        onPress={() =>
                                            openLink(event.broadcast_url)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.smallActionButtonText,
                                                {
                                                    color: theme.primaryButtonText,
                                                },
                                            ]}
                                        >
                                            Watch
                                        </Text>
                                        <Ionicons
                                            name="open-outline"
                                            size={15}
                                            color={theme.primaryButtonText}
                                        />
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

                    {event.promo_url ? (
                        <View style={styles.section}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { color: theme.text },
                                ]}
                            >
                                {event.is_sponsored
                                    ? "Featured Promotion"
                                    : "Event Link"}
                            </Text>

                            <Pressable
                                style={[
                                    styles.promoCard,
                                    {
                                        backgroundColor: theme.cardSoft,
                                        borderColor: theme.borderStrong,
                                        shadowColor: theme.shadow,
                                    },
                                ]}
                                onPress={() => openLink(event.promo_url)}
                            >
                                <View style={styles.promoContent}>
                                    {event.is_sponsored ? (
                                        <Text
                                            style={[
                                                styles.promoEyebrow,
                                                { color: theme.cyan },
                                            ]}
                                        >
                                            SPONSORED
                                        </Text>
                                    ) : null}

                                    <Text
                                        style={[
                                            styles.promoTitle,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {event.promo_label || "Learn More"}
                                    </Text>

                                    {event.sponsor_name ? (
                                        <Text
                                            style={[
                                                styles.promoSponsor,
                                                { color: theme.textSoft },
                                            ]}
                                        >
                                            From {event.sponsor_name}
                                        </Text>
                                    ) : null}
                                </View>

                                <View
                                    style={[
                                        styles.promoButton,
                                        { backgroundColor: theme.cyan },
                                    ]}
                                >
                                    <Ionicons
                                        name="arrow-forward"
                                        size={20}
                                        color={theme.primaryButtonText}
                                    />
                                </View>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
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
        paddingBottom: Platform.OS === "android" ? 190 : 90,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontFamily: "Rajdhani_700Bold",
        marginTop: 12,
    },
    errorBackButton: {
        marginTop: 18,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 999,
    },
    errorBackText: {
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
    },
    heroWrap: {
        height: 270,
        position: "relative",
        overflow: "hidden",
    },
    heroImage: {
        width: "100%",
        height: "100%",
    },
    heroPlaceholder: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    heroShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.15)",
    },
    backButton: {
        position: "absolute",
        top: 14,
        left: 16,
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    heroBadges: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 14,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    statusBadge: {
        minHeight: 30,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 5,
        gap: 6,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    sponsoredBadge: {
        minHeight: 30,
        justifyContent: "center",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 5,
    },
    sponsoredBadgeText: {
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    pageContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    title: {
        fontSize: 31,
        lineHeight: 36,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
    },
    sponsorLine: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        marginTop: 5,
    },
    summaryText: {
        fontSize: 16,
        lineHeight: 23,
        marginTop: 12,
    },
    infoCard: {
        borderWidth: 1,
        borderRadius: 22,
        paddingHorizontal: 15,
        paddingVertical: 4,
        marginTop: 20,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
    },
    infoIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    infoTextWrap: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
        textTransform: "uppercase",
        letterSpacing: 0.7,
        marginBottom: 3,
    },
    infoValue: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: "Rajdhani_700Bold",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 54,
    },
    section: {
        marginTop: 26,
    },
    sectionTitle: {
        fontSize: 23,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
        marginBottom: 11,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 23,
    },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 20,
        padding: 13,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    actionContent: {
        flex: 1,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    actionTitle: {
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        marginTop: 2,
    },
    smallActionButton: {
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderRadius: 999,
        paddingHorizontal: 13,
    },
    smallActionButtonText: {
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
    },
    promoCard: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    promoContent: {
        flex: 1,
    },
    promoEyebrow: {
        fontSize: 10,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1,
        marginBottom: 4,
    },
    promoTitle: {
        fontSize: 20,
        fontFamily: "Rajdhani_700Bold",
    },
    promoSponsor: {
        fontSize: 12,
        marginTop: 3,
    },
    promoButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 12,
    },
});