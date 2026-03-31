import React from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

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

function formatDateTime(dateString?: string) {
    if (!dateString) return null;

    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function normalizeUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();

    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    if (
        trimmed.includes("youtube.com/") ||
        trimmed.includes("youtu.be/") ||
        trimmed.includes("www.youtube.com/") ||
        trimmed.includes("m.youtube.com/") ||
        trimmed.startsWith("www.")
    ) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

export default function EventDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const event: EventItem = route.params?.event;

    const openLink = async (rawUrl?: string) => {
        if (!rawUrl) return;

        try {
            const url = normalizeUrl(rawUrl);

            if (!url) {
                Alert.alert("Invalid link", "This link is empty.");
                return;
            }

            console.log("Opening event URL:", url);
            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            console.log("Failed to open URL:", rawUrl, error);
            Alert.alert("Error", "Could not open link.");
        }
    };

    if (!event) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Event not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const topRounds = (event.rounds || []).slice(0, 5);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topBar}>
                    <Pressable
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>

                <Image
                    source={{ uri: event.cover_image_url || event.card_image_url }}
                    style={styles.heroImage}
                    resizeMode="cover"
                />

                <View style={styles.headerSection}>
                    <View style={styles.chipsRow}>
                        {!!event.type && (
                            <View style={styles.typeChip}>
                                <Text style={styles.typeChipText}>{event.type}</Text>
                            </View>
                        )}

                        {!!event.status && (
                            <View style={styles.statusChip}>
                                <Text style={styles.statusChipText}>{event.status}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.title}>{event.title}</Text>

                    <Text style={styles.dateText}>
                        {formatDateRange(event.start_at, event.end_at)}
                    </Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color="#F4D03F" />
                        <Text style={styles.locationText}>{event.location}</Text>
                    </View>

                    {!!event.summary && (
                        <Text style={styles.summaryText}>{event.summary}</Text>
                    )}

                    {!!event.status_note && (
                        <View style={styles.noteCard}>
                            <Text style={styles.noteTitle}>Event Note</Text>
                            <Text style={styles.noteText}>{event.status_note}</Text>
                        </View>
                    )}
                </View>

                {!!event.official_url && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Official</Text>

                        <Pressable
                            style={styles.linkCard}
                            onPress={() => openLink(event.official_url)}
                        >
                            <Ionicons name="globe-outline" size={18} color="#2EE7FF" />
                            <Text style={styles.linkText}>Official Event Website</Text>
                        </Pressable>
                    </View>
                )}

                {!!event.main_broadcaster && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Main Broadcast</Text>

                        <Pressable
                            style={styles.linkCard}
                            onPress={() => openLink(event.main_broadcaster?.url)}
                        >
                            <Ionicons name="play-circle-outline" size={18} color="#2EE7FF" />
                            <View style={styles.linkContent}>
                                <Text style={styles.linkTitle}>
                                    {event.main_broadcaster.name}
                                </Text>
                                <Text style={styles.linkSubtext}>
                                    {event.main_broadcaster.platform}
                                    {event.main_broadcaster.broadcast_start_at
                                        ? ` · ${formatDateTime(
                                            event.main_broadcaster.broadcast_start_at
                                        )}`
                                        : ""}
                                </Text>
                            </View>
                        </Pressable>
                    </View>
                )}

                {!!event.other_broadcasters?.length && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Other Coverage</Text>

                        {event.other_broadcasters.map((item, index) => (
                            <Pressable
                                key={`${item.url}-${index}`}
                                style={styles.linkCard}
                                onPress={() => openLink(item.url)}
                            >
                                <Ionicons name="tv-outline" size={18} color="#2EE7FF" />
                                <View style={styles.linkContent}>
                                    <Text style={styles.linkTitle}>{item.name}</Text>
                                    <Text style={styles.linkSubtext}>
                                        {item.platform}
                                        {item.broadcast_start_at
                                            ? ` · ${formatDateTime(item.broadcast_start_at)}`
                                            : ""}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                {!!event.game_platforms?.length && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Watch Live Games</Text>

                        {event.game_platforms.map((platform, index) => (
                            <Pressable
                                key={`${platform.url}-${index}`}
                                style={styles.linkCard}
                                onPress={() => openLink(platform.url)}
                            >
                                <Ionicons
                                    name="game-controller-outline"
                                    size={18}
                                    color="#2EE7FF"
                                />
                                <View style={styles.linkContent}>
                                    <Text style={styles.linkTitle}>{platform.name}</Text>
                                    {!!platform.notes && (
                                        <Text style={styles.linkSubtext}>{platform.notes}</Text>
                                    )}
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                {!!topRounds.length && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Rounds</Text>

                        {topRounds.map((round) => (
                            <View key={round.round_number} style={styles.roundCard}>
                                <Text style={styles.roundTitle}>{round.label}</Text>
                                <Text style={styles.roundTime}>
                                    {formatDateTime(round.start_at)}
                                </Text>
                                {!!round.notes && (
                                    <Text style={styles.roundNotes}>{round.notes}</Text>
                                )}
                            </View>
                        ))}

                        {event.rounds && event.rounds.length > 5 && (
                            <Text style={styles.moreRoundsText}>
                                + {event.rounds.length - 5} more rounds in this event
                            </Text>
                        )}
                    </View>
                )}

                {!!event.tags?.length && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tags</Text>
                        <View style={styles.tagsWrap}>
                            {event.tags.map((tag, index) => (
                                <View key={`${tag}-${index}`} style={styles.tagChip}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
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
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    topBar: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 10,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#121C31",
        borderWidth: 1,
        borderColor: "#21385F",
    },
    heroImage: {
        width: "100%",
        height: 215,
        backgroundColor: "#151515",
    },
    headerSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    chipsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    typeChip: {
        backgroundColor: "#0D1629",
        borderColor: "#21446E",
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    typeChipText: {
        color: "#8CCBFF",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    statusChip: {
        backgroundColor: "#201807",
        borderColor: "#5C4610",
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusChipText: {
        color: "#F4D03F",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    title: {
        color: "#FFFFFF",
        fontSize: 28,
        lineHeight: 34,
        fontWeight: "900",
        marginBottom: 10,
    },
    dateText: {
        color: "#F4D03F",
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    locationText: {
        flex: 1,
        color: "#D8DEEA",
        fontSize: 14,
        lineHeight: 20,
        marginLeft: 8,
    },
    summaryText: {
        color: "#C8D0DF",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    noteCard: {
        backgroundColor: "#0A101D",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#182841",
        padding: 14,
    },
    noteTitle: {
        color: "#2EE7FF",
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 8,
    },
    noteText: {
        color: "#E8EEF8",
        fontSize: 14,
        lineHeight: 21,
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    sectionTitle: {
        color: "#F4D03F",
        fontSize: 20,
        fontWeight: "900",
        marginBottom: 12,
    },
    linkCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#0D1629",
        borderWidth: 1,
        borderColor: "#193155",
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    linkContent: {
        flex: 1,
        marginLeft: 10,
    },
    linkText: {
        color: "#CFE9FF",
        fontSize: 14,
        fontWeight: "700",
    },
    linkTitle: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 3,
    },
    linkSubtext: {
        color: "#AEB8C8",
        fontSize: 12,
        lineHeight: 17,
    },
    roundCard: {
        backgroundColor: "#0A101D",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#182841",
        padding: 14,
        marginBottom: 10,
    },
    roundTitle: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 4,
    },
    roundTime: {
        color: "#2EE7FF",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 6,
    },
    roundNotes: {
        color: "#BCC6D6",
        fontSize: 13,
        lineHeight: 18,
    },
    moreRoundsText: {
        color: "#8FA2BE",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 4,
    },
    tagsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tagChip: {
        backgroundColor: "#101827",
        borderWidth: 1,
        borderColor: "#22334E",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    tagText: {
        color: "#D4DCE9",
        fontSize: 12,
        fontWeight: "700",
    },
});