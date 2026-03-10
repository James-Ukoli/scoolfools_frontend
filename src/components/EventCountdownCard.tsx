import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { s, vs, ms } from "react-native-size-matters";

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

type EventCountdownCardProps = {
    event: EventItem | null;
    loading?: boolean;
};

export default function EventCountdownCard({
    event,
    loading = false,
}: EventCountdownCardProps) {
    const navigation = useNavigation<any>();
    const [nowTick, setNowTick] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNowTick(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const roundState = useMemo(() => {
        if (!event) return null;

        const now = nowTick;
        const rounds = [...(event.rounds || [])].sort(
            (a, b) =>
                new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        );

        const eventStart = new Date(event.start_at).getTime();

        if (now < eventStart) {
            return {
                mode: "event",
                targetDate: event.start_at,
                label: "Coming Up",
                title: event.title,
            };
        }

        const activeRound = rounds.find((round) => {
            const roundStart = new Date(round.start_at).getTime();
            const roundEnd = round.end_at
                ? new Date(round.end_at).getTime()
                : roundStart + 6 * 60 * 60 * 1000;

            return now >= roundStart && now < roundEnd;
        });

        if (activeRound) {
            return {
                mode: "round-live",
                targetDate: activeRound.end_at || activeRound.start_at,
                label: "Live Now",
                title: activeRound.label,
            };
        }

        const nextRound = rounds.find(
            (round) => new Date(round.start_at).getTime() > now
        );

        if (nextRound) {
            return {
                mode: "round-upcoming",
                targetDate: nextRound.start_at,
                label: "Next Round",
                title: nextRound.label,
            };
        }

        return {
            mode: "event",
            targetDate: event.end_at,
            label: "Event Ending",
            title: event.title,
        };
    }, [event, nowTick]);

    const timeLeft = useMemo(() => {
        if (!roundState?.targetDate) {
            return {
                days: "00",
                hours: "00",
                minutes: "00",
                seconds: "00",
            };
        }

        const now = nowTick;
        const target = new Date(roundState.targetDate).getTime();
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
    }, [roundState, nowTick]);

    const handleOpenEvent = () => {
        if (!event) return;
        navigation.navigate("EventDetailScreen", { event });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3CF2FF" />
            </View>
        );
    }

    if (!event || !roundState) {
        return null;
    }

    return (
        <Pressable style={styles.card} onPress={handleOpenEvent}>
            <Image
                source={{
                    uri: event.card_image_url || event.cover_image_url,
                }}
                style={styles.eventImage}
                resizeMode="cover"
            />

            <View style={styles.content}>
                <Text style={styles.label}>{roundState.label}</Text>

                <Text style={styles.eventTitle} numberOfLines={2}>
                    {roundState.mode === "event" ? event.title : roundState.title}
                </Text>

                <View style={styles.timerRow}>
                    <TimerBox value={timeLeft.days} label="Days" />
                    <TimerBox value={timeLeft.hours} label="Hours" />
                    <TimerBox value={timeLeft.minutes} label="Minutes" />
                    <TimerBox value={timeLeft.seconds} label="Seconds" />
                </View>
            </View>
        </Pressable>
    );
}

function TimerBox({
    value,
    label,
}: {
    value: string;
    label: string;
}) {
    return (
        <View style={styles.timerBox}>
            <Text style={styles.timerNumber}>{value}</Text>
            <Text style={styles.timerLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        height: vs(110),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: vs(18),
    },
    card: {
        backgroundColor: "#000000",
        borderRadius: s(20),
        paddingHorizontal: s(12),
        paddingVertical: vs(10),
        marginBottom: vs(18),
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    eventImage: {
        width: s(82),
        height: vs(62),
        borderRadius: s(12),
        marginRight: s(12),
        backgroundColor: "#1A1A1A",
    },
    content: {
        flex: 1,
        justifyContent: "center",
    },
    label: {
        color: "#3CF2FF",
        fontSize: ms(11),
        fontWeight: "700",
        marginBottom: vs(2),
    },
    eventTitle: {
        color: "#FFFFFF",
        fontSize: ms(14),
        fontWeight: "800",
        lineHeight: ms(18),
        marginBottom: vs(8),
    },
    timerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(4),
    },
    timerBox: {
        flex: 1,
        backgroundColor: "#0B1224",
        borderRadius: s(8),
        paddingVertical: vs(4),
        paddingHorizontal: s(3),
        alignItems: "center",
        justifyContent: "center",
    },
    timerNumber: {
        color: "#3CF2FF",
        fontSize: ms(11),
        fontWeight: "800",
        marginBottom: vs(1),
    },
    timerLabel: {
        color: "#AAB4C3",
        fontSize: ms(6.5),
        fontWeight: "600",
    },
});