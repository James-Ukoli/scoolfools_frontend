import React, { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const mockEvents: EventItem[] = [
    {
        _id: "69a158e3e1f567fb19638f02",
        title: "FIDE Candidates Tournament 2026 (Open) — Cyprus",
        slug: "fide-candidates-2026-open-cyprus",
        type: "tournament",
        location: "Cap St Georges Hotel & Resort, Peyia (Paphos), Cyprus",
        start_at: "2026-03-28T00:00:00.000Z",
        end_at: "2026-04-16T23:59:59.000Z",
        timezone: "Europe/Nicosia",
        cover_image_url:
            "https://www.fide.com/wp-content/uploads/Candidates-2026-Open-1.jpg",
        official_url: "https://candidates2026.fide.com/",
        tags: [
            "FIDE",
            "Candidates",
            "World Championship cycle",
            "Open",
            "Cyprus",
            "Classical",
            "Double round-robin (8 players, 14 rounds)",
        ],
        is_published: true,
        is_featured: true,
        featured_priority: 100,
        sort_boost: 50,
        status: "scheduled",
        live_mode: "manual",
        current_day: null,
        current_round: null,
        round_label: null,
        status_note:
            "Open Candidates (8 players): Hikaru Nakamura (rating spot), Fabiano Caruana (2024 FIDE Circuit), Anish Giri (2025 Grand Swiss 1st), Praggnanandhaa R (2025 FIDE Circuit), Wei Yi (2025 World Cup finalist), Javokhir Sindarov (2025 World Cup winner), Andrey Esipenko (2025 World Cup 3rd), Matthias Bluebaum (2025 Grand Swiss 2nd). Venue: Cap St Georges Hotel & Resort, Cyprus.",
        last_status_update_at: null,
        main_broadcaster: {
            name: "FIDE (Official)",
            platform: "YouTube",
            url: "https://www.youtube.com/@FIDE_chess",
            broadcast_start_at: "2026-03-29T12:00:00.000Z",
        },
        other_broadcasters: [
            {
                name: "FIDE (Official Website)",
                platform: "Web",
                url: "https://candidates2026.fide.com/",
                broadcast_start_at: "2026-03-29T12:00:00.000Z",
            },
        ],
        game_platforms: [
            {
                name: "Chess.com Events (watch live games)",
                url: "https://www.chess.com/events",
                is_official: false,
                notes: "Chess.com typically lists major events under Events.",
            },
            {
                name: "Lichess Broadcasts (watch live games)",
                url: "https://lichess.org/broadcast",
                is_official: false,
                notes:
                    "Lichess broadcasts page for live tournament boards; exact Candidates page may appear closer to event.",
            },
        ],
        rounds: [
            {
                round_number: 1,
                label: "Round 1",
                start_at: "2026-03-29T12:30:00.000Z",
                end_at: null,
                broadcast_start_at: "2026-03-29T12:00:00.000Z",
                is_rest_day: false,
                status: "scheduled",
                notes: "Scheduled start listed as 15:30 on official schedule.",
            },
        ],
        createdAt: "2026-02-27T08:42:11.025Z",
        updatedAt: "2026-02-27T08:42:11.025Z",
    },
    {
        _id: "69a602a896ba721033a80594",
        title: "grenke Chess Open 2026 — Karlsruhe",
        slug: "grenke-chess-open-2026-karlsruhe-test",
        summary:
            "The grenke Chess Open is one of the world’s largest open chess festivals, held in Karlsruhe during Easter. The main event is a 9-round Swiss classical tournament with multiple rounds per day and extensive live coverage links.",
        type: "tournament",
        standingsUrl: "https://www.grenkechessopen.de/en/",
        location:
            "Congress Center Karlsruhe (Schwarzwaldhalle), Festplatz 5, 76137 Karlsruhe, Germany",
        start_at: "2026-04-02T16:30:00.000Z",
        end_at: "2026-04-06T23:59:59.000Z",
        timezone: "Europe/Berlin",
        cover_image_url:
            "https://www.freestyle-chess.com/wp-content/uploads/FC_Grenke_Thumbnail_v172.webp",
        card_image_url:
            "https://www.freestyle-chess.com/wp-content/uploads/FC_Grenke_Thumbnail_v172.webp",
        official_url: "https://www.grenkechessopen.de/en/",
        tags: [
            "grenke Chess Open",
            "Karlsruhe",
            "Open tournament",
            "9-round Swiss",
            "Easter",
            "Classical (Open)",
        ],
        is_published: true,
        is_featured: false,
        featured_priority: 120,
        sort_boost: 60,
        status: "scheduled",
        live_mode: "manual",
        current_day: null,
        current_round: null,
        round_label: null,
        status_note:
            "World’s largest open chess festival window (Apr 2–6, 2026). Timetable: Round 1 on Thu evening, then two rounds per day Fri–Mon (10:00 & 16:00 local). Venue: Congress Center Karlsruhe (Schwarzwaldhalle).",
        last_status_update_at: null,
        main_broadcaster: {
            name: "grenke Chess Open (Official Site)",
            platform: "Web",
            url: "https://www.grenkechessopen.de/en/",
            broadcast_start_at: "2026-04-02T16:00:00.000Z",
        },
        other_broadcasters: [],
        game_platforms: [
            {
                name: "Lichess Broadcasts (watch live games)",
                url: "https://lichess.org/broadcast",
                is_official: false,
                notes: "Broadcast pages typically appear near event time.",
            },
            {
                name: "Chess.com Events (watch live games)",
                url: "https://www.chess.com/events",
                is_official: false,
                notes: "Major events often appear under the Events directory.",
            },
        ],
        rounds: [
            {
                round_number: 1,
                label: "Round 1",
                start_at: "2026-04-02T16:30:00.000Z",
                end_at: null,
                broadcast_start_at: "2026-04-02T16:00:00.000Z",
                is_rest_day: false,
                status: "scheduled",
                notes: "Opening + Round 1 (approx. 18:30 local).",
            },
        ],
        createdAt: "2026-03-02T21:35:36.868Z",
        updatedAt: "2026-03-02T21:35:36.868Z",
    },
];

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
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(event);
        return acc;
    }, {});
}

export default function EventsScreen({ navigation }: any) {
    const sortedEvents = useMemo(() => {
        return [...mockEvents].sort(
            (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        );
    }, []);

    const heroEvent = sortedEvents[0];
    const remainingEvents = sortedEvents.slice(1);
    const groupedEvents = groupEventsByMonth(remainingEvents);

    const groupedEntries = Object.entries(groupedEvents).sort(
        ([, eventsA], [, eventsB]) =>
            new Date(eventsA[0].start_at).getTime() -
            new Date(eventsB[0].start_at).getTime()
    );

    const countdown = heroEvent
        ? getCountdownParts(heroEvent.start_at)
        : { days: "00", hours: "00", minutes: "00", seconds: "00" };

    const openEvent = (event: EventItem) => {
        navigation.navigate("EventDetailScreen", { event });
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

                    <Text style={styles.headerTitle}>Events</Text>

                    <View style={styles.headerSpacer} />
                </View>

                {heroEvent ? (
                    <>
                        <Text style={styles.sectionTitle}>Next Major Event</Text>

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
                                            <Text style={styles.countdownNumber}>
                                                {countdown.minutes}
                                            </Text>
                                            <Text style={styles.countdownLabel}>Minutes</Text>
                                        </View>

                                        <View style={styles.countdownBox}>
                                            <Text style={styles.countdownNumber}>
                                                {countdown.seconds}
                                            </Text>
                                            <Text style={styles.countdownLabel}>Seconds</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </>
                ) : null}

                {groupedEntries.map(([monthLabel, events]) => (
                    <View key={monthLabel} style={styles.monthSection}>
                        <Text style={styles.monthTitle}>{monthLabel}</Text>

                        {events.map((event) => (
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
    headerSpacer: {
        width: 34,
    },
    sectionTitle: {
        color: "#F4D03F",
        fontSize: 28,
        fontWeight: "900",
        marginBottom: 16,
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
        marginBottom: 26,
    },
    monthTitle: {
        color: "#F4D03F",
        fontSize: 24,
        fontWeight: "900",
        marginBottom: 14,
    },
    eventRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 18,
    },
    eventImage: {
        width: 108,
        height: 108,
        borderRadius: 18,
        marginRight: 14,
        backgroundColor: "#1A1A1A",
    },
    eventContent: {
        flex: 1,
        minHeight: 108,
        justifyContent: "space-between",
    },
    eventTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "900",
        lineHeight: 24,
        marginBottom: 8,
    },
    eventDate: {
        color: "#F4D03F",
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 8,
    },
    eventLocation: {
        color: "#CFCFCF",
        fontSize: 14,
        lineHeight: 19,
    },
});