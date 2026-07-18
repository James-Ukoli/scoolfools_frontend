import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    useFonts,
} from "@expo-google-fonts/rajdhani";

import AppHeader from "../components/AppHeader";
import RankingsLeaderCard from "../components/RankingsLeaderCard";
import { getCollegeLogo } from "../../assets/data/collegeLogos";

type Sport =
    | "college-chess"
    | "basketball"
    | "football"
    | "volleyball";

type ApiSport =
    | "college-chess"
    | "basketball"
    | "football"
    | "volleyball";

type Cadence = "weekly" | "quarterly";
type PeriodType = "week" | "quarter";

type RankingEntry = {
    rank: number;
    previous_rank?: number | null;
    team_name: string;
    logo_key?: string | null;
    record?: string | null;
    note?: string | null;
};

type SportsRanking = {
    _id: string;
    sport: string;
    division?: string | null;
    season: string;
    cadence: Cadence;
    period_type: PeriodType;
    period_number: number;
    period_label?: string | null;
    title?: string | null;
    description?: string | null;
    entries: RankingEntry[];
    status?: "draft" | "published";
    is_season_final?: boolean;
    published_at?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

type RankingApiResponse = {
    success?: boolean;
    ranking?: SportsRanking | null;
    item?: SportsRanking | null;
    data?: SportsRanking | null;
    message?: string;
    used_fallback?: boolean;
    requested_period?: number;
    returned_period?: number;
};

type MovementType = "up" | "down" | "same" | "new";

type Movement = {
    type: MovementType;
    label: string;
};

type Theme = {
    page: string;
    card: string;
    cardAlt: string;
    border: string;
    borderSoft: string;
    text: string;
    muted: string;
    subtle: string;
    tab: string;
    tabBorder: string;
    activeTab: string;
    activeTabText: string;
    toggle: string;
    arrow: string;
    arrowDisabled: string;
    goldRow: string;
    silverRow: string;
    bronzeRow: string;
    errorBackground: string;
    errorBorder: string;
    errorText: string;
};

const API_BASE =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const API_PATH = "/api/sports-power-rankings";
const ACCENT = "#06B6D4";

/**
 * This lets the UI continue using the simple "football" value while the
 * backend receives "college-football".
 *
 * If your backend enum uses a different exact value, change only this map.
 */
const API_SPORT_MAP: Record<Sport, ApiSport> = {
    "college-chess": "college-chess",
    basketball: "basketball",
    football: "football",
    volleyball: "volleyball",
};

const SPORT_OPTIONS: {
    label: string;
    value: Sport;
    icon: string;
}[] = [
        { label: "Chess", value: "college-chess", icon: "♟" },
        { label: "Basketball", value: "basketball", icon: "🏀" },
        { label: "Football", value: "football", icon: "🏈" },
        { label: "Volleyball", value: "volleyball", icon: "🏐" },
    ];

const LIGHT_THEME: Theme = {
    page: "#F7F9FC",
    card: "#FFFFFF",
    cardAlt: "#F4F7FA",
    border: "#DDE4EC",
    borderSoft: "#E8EDF3",
    text: "#101318",
    muted: "#667085",
    subtle: "#98A2B3",
    tab: "#FFFFFF",
    tabBorder: "#D5DEE8",
    activeTab: ACCENT,
    activeTabText: "#061014",
    toggle: "#FFFFFF",
    arrow: "#EAF7FA",
    arrowDisabled: "#F1F4F7",
    goldRow: "#FFFBEA",
    silverRow: "#F8FAFC",
    bronzeRow: "#FFF7F0",
    errorBackground: "#FFF2F2",
    errorBorder: "#FFC5C5",
    errorText: "#D92D20",
};

const DARK_THEME: Theme = {
    page: "#000000",
    card: "#070B11",
    cardAlt: "#0B1119",
    border: "#1A2634",
    borderSoft: "#172330",
    text: "#FFFFFF",
    muted: "#9AA6B6",
    subtle: "#6F7B8A",
    tab: "#080C13",
    tabBorder: "#253041",
    activeTab: ACCENT,
    activeTabText: "#041014",
    toggle: "#080D15",
    arrow: "#101824",
    arrowDisabled: "#0B1119",
    goldRow: "rgba(250,204,21,0.055)",
    silverRow: "rgba(203,213,225,0.045)",
    bronzeRow: "rgba(249,115,22,0.05)",
    errorBackground: "rgba(255,92,92,0.08)",
    errorBorder: "rgba(255,92,92,0.45)",
    errorText: "#FF8B8B",
};

function isNightTime(date = new Date()): boolean {
    const hour = date.getHours();

    // Light: 7:00 AM through 6:59 PM
    // Dark: 7:00 PM through 6:59 AM
    return hour < 7 || hour >= 19;
}

function millisecondsUntilNextThemeChange(date = new Date()): number {
    const next = new Date(date);
    const hour = date.getHours();

    if (hour < 7) {
        next.setHours(7, 0, 0, 0);
    } else if (hour < 19) {
        next.setHours(19, 0, 0, 0);
    } else {
        next.setDate(next.getDate() + 1);
        next.setHours(7, 0, 0, 0);
    }

    return Math.max(next.getTime() - date.getTime(), 1000);
}

function extractRanking(payload: RankingApiResponse): SportsRanking | null {
    return payload?.ranking ?? payload?.item ?? payload?.data ?? null;
}

function getMovement(entry: RankingEntry): Movement {
    if (
        entry.previous_rank === null ||
        entry.previous_rank === undefined ||
        entry.previous_rank <= 0
    ) {
        return {
            type: "new",
            label: "NEW",
        };
    }

    const difference = entry.previous_rank - entry.rank;

    if (difference > 0) {
        return {
            type: "up",
            label: `↑ ${difference}`,
        };
    }

    if (difference < 0) {
        return {
            type: "down",
            label: `↓ ${Math.abs(difference)}`,
        };
    }

    return {
        type: "same",
        label: "—",
    };
}

function getPeriodLabel(ranking: SportsRanking | null): string {
    if (!ranking) return "Latest";

    if (ranking.period_label?.trim()) {
        return ranking.period_label.trim();
    }

    if (ranking.period_type === "quarter") {
        return `Q${ranking.period_number} ${ranking.season}`;
    }

    return `Week ${ranking.period_number}`;
}

function getSportTitle(sport: Sport): string {
    return SPORT_OPTIONS.find((item) => item.value === sport)?.label ?? "Rankings";
}

function getRankColor(rank: number, isDark: boolean): string {
    if (rank === 1) return "#F2C400";
    if (rank === 2) return isDark ? "#E2E8F0" : "#667085";
    if (rank === 3) return "#F0782A";
    return isDark ? "#FFFFFF" : "#101318";
}

function RankingRow({
    entry,
    theme,
    isDark,
}: {
    entry: RankingEntry;
    theme: Theme;
    isDark: boolean;
}) {
    const logoSource = getCollegeLogo(entry.logo_key);
    const movement = getMovement(entry);

    const rowBackground =
        entry.rank === 1
            ? theme.goldRow
            : entry.rank === 2
                ? theme.silverRow
                : entry.rank === 3
                    ? theme.bronzeRow
                    : theme.card;

    const rankColor = getRankColor(entry.rank, isDark);

    const movementColors =
        movement.type === "up"
            ? {
                text: "#20C900",
                border: isDark
                    ? "rgba(57,255,20,0.45)"
                    : "rgba(32,201,0,0.38)",
                background: isDark
                    ? "rgba(57,255,20,0.08)"
                    : "rgba(32,201,0,0.07)",
            }
            : movement.type === "down"
                ? {
                    text: "#F04438",
                    border: isDark
                        ? "rgba(255,76,76,0.45)"
                        : "rgba(240,68,56,0.34)",
                    background: isDark
                        ? "rgba(255,76,76,0.08)"
                        : "rgba(240,68,56,0.06)",
                }
                : movement.type === "new"
                    ? {
                        text: ACCENT,
                        border: "rgba(6,182,212,0.45)",
                        background: "rgba(6,182,212,0.08)",
                    }
                    : {
                        text: theme.muted,
                        border: theme.border,
                        background: theme.cardAlt,
                    };

    return (
        <View
            style={[
                styles.rankRow,
                {
                    backgroundColor: rowBackground,
                    borderBottomColor: theme.borderSoft,
                },
            ]}
        >
            <Text style={[styles.rankNumber, { color: rankColor }]}>
                {entry.rank}
            </Text>

            <View style={styles.logoWrap}>
                {logoSource ? (
                    <Image
                        source={logoSource}
                        style={styles.collegeLogo}
                        resizeMode="contain"
                    />
                ) : (
                    <View
                        style={[
                            styles.logoFallback,
                            {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text style={styles.logoFallbackText}>🎓</Text>
                    </View>
                )}
            </View>

            <View style={styles.teamInfo}>
                <Text
                    style={[
                        styles.teamName,
                        {
                            color:
                                entry.rank <= 3
                                    ? rankColor
                                    : theme.text,
                        },
                    ]}
                    numberOfLines={1}
                >
                    {entry.team_name}
                </Text>

                {!!entry.record && (
                    <Text
                        style={[styles.recordText, { color: theme.muted }]}
                        numberOfLines={1}
                    >
                        {entry.record}
                    </Text>
                )}
            </View>

            <View
                style={[
                    styles.movementBadge,
                    {
                        backgroundColor: movementColors.background,
                        borderColor: movementColors.border,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.movementText,
                        {
                            color: movementColors.text,
                            fontSize: movement.type === "new" ? 10.5 : 12.5,
                        },
                    ]}
                >
                    {movement.label}
                </Text>
            </View>
        </View>
    );
}

export default function RankingsScreen() {
    const scrollRef = useRef<ScrollView>(null);

    const [isDark, setIsDark] = useState(() => isNightTime());
    const theme = isDark ? DARK_THEME : LIGHT_THEME;

    const [fontsLoaded] = useFonts({
        Rajdhani_600SemiBold,
        Rajdhani_700Bold,
    });

    const [selectedSport, setSelectedSport] =
        useState<Sport>("college-chess");

    const [ranking, setRanking] = useState<SportsRanking | null>(null);
    const [latestPeriod, setLatestPeriod] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [changingPeriod, setChangingPeriod] = useState(false);
    const [error, setError] = useState("");

    const periodLabel = useMemo(() => getPeriodLabel(ranking), [ranking]);

    const sortedEntries = useMemo(() => {
        return (ranking?.entries ?? [])
            .slice()
            .sort((a, b) => a.rank - b.rank);
    }, [ranking]);

    const leader = sortedEntries[0] ?? null;
    const remainingEntries = sortedEntries.slice(1);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | null = null;

        const scheduleThemeUpdate = () => {
            setIsDark(isNightTime());

            timeout = setTimeout(() => {
                scheduleThemeUpdate();
            }, millisecondsUntilNextThemeChange());
        };

        scheduleThemeUpdate();

        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, []);

    const fetchJson = useCallback(
        async (url: string): Promise<RankingApiResponse> => {
            const response = await fetch(url);
            const contentType = response.headers.get("content-type") ?? "";

            if (!contentType.includes("application/json")) {
                const body = await response.text();

                throw new Error(
                    response.ok
                        ? "The server returned an invalid response."
                        : `Request failed (${response.status}). ${body.slice(0, 80)}`
                );
            }

            const payload: RankingApiResponse = await response.json();

            if (!response.ok || payload.success === false) {
                throw new Error(payload.message || "Could not load rankings.");
            }

            return payload;
        },
        []
    );

    const fetchLatestRanking = useCallback(
        async (sport: Sport, showMainLoader = true) => {
            if (!API_BASE) {
                setError("API URL is missing.");
                setRanking(null);
                setLoading(false);
                return;
            }

            try {
                if (showMainLoader) {
                    setLoading(true);
                }

                setError("");

                const apiSport = API_SPORT_MAP[sport];

                const payload = await fetchJson(
                    `${API_BASE}${API_PATH}/${apiSport}/latest`
                );

                const nextRanking = extractRanking(payload);

                setRanking(nextRanking);
                setLatestPeriod(nextRanking?.period_number ?? null);
            } catch (requestError) {
                setRanking(null);
                setLatestPeriod(null);
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Could not load rankings."
                );
            } finally {
                if (showMainLoader) {
                    setLoading(false);
                }
            }
        },
        [fetchJson]
    );

    const fetchRankingPeriod = useCallback(
        async (periodNumber: number) => {
            if (!API_BASE || !ranking || changingPeriod) return;

            const isQuarterly = ranking.period_type === "quarter";

            if (periodNumber < 1) return;
            if (isQuarterly && periodNumber > 4) return;

            try {
                setChangingPeriod(true);
                setError("");

                const apiSport = API_SPORT_MAP[selectedSport];

                const payload = await fetchJson(
                    `${API_BASE}${API_PATH}/${apiSport}/period/${periodNumber}`
                );

                const nextRanking = extractRanking(payload);

                if (!nextRanking) {
                    throw new Error("No ranking was found for that period.");
                }

                setRanking(nextRanking);
                scrollRef.current?.scrollTo({ y: 0, animated: true });
            } catch (requestError) {
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Could not load that ranking period."
                );
            } finally {
                setChangingPeriod(false);
            }
        },
        [changingPeriod, fetchJson, ranking, selectedSport]
    );

    useEffect(() => {
        fetchLatestRanking(selectedSport);
    }, [fetchLatestRanking, selectedSport]);

    const handleSportChange = (sport: Sport) => {
        if (sport === selectedSport) return;

        setSelectedSport(sport);
        setRanking(null);
        setLatestPeriod(null);
        setError("");

        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await fetchLatestRanking(selectedSport, false);
        } finally {
            setRefreshing(false);
        }
    }, [fetchLatestRanking, selectedSport]);

    const goToPreviousPeriod = () => {
        if (!ranking) return;
        fetchRankingPeriod(ranking.period_number - 1);
    };

    const goToNextPeriod = () => {
        if (!ranking) return;
        fetchRankingPeriod(ranking.period_number + 1);
    };

    const previousDisabled =
        !ranking ||
        changingPeriod ||
        ranking.period_number <= 1;

    const nextDisabled =
        !ranking ||
        changingPeriod ||
        (latestPeriod !== null && ranking.period_number >= latestPeriod) ||
        (ranking.period_type === "quarter" && ranking.period_number >= 4);

    const renderRankings = () => {
        if (loading) {
            return (
                <View
                    style={[
                        styles.stateCard,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <ActivityIndicator size="small" color={ACCENT} />
                </View>
            );
        }

        if (error && !ranking) {
            return (
                <View
                    style={[
                        styles.stateCard,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Text style={[styles.errorTitle, { color: theme.text }]}>
                        Rankings unavailable
                    </Text>

                    <Text style={[styles.errorText, { color: theme.errorText }]}>
                        {error}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.retryButton}
                        onPress={() => fetchLatestRanking(selectedSport)}
                    >
                        <Text style={styles.retryButtonText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!ranking || !sortedEntries.length || !leader) {
            return (
                <View
                    style={[
                        styles.stateCard,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                        No {getSportTitle(selectedSport)} rankings yet
                    </Text>
                </View>
            );
        }

        return (
            <>
                {!!error && (
                    <View
                        style={[
                            styles.inlineError,
                            {
                                backgroundColor: theme.errorBackground,
                                borderColor: theme.errorBorder,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.inlineErrorText,
                                { color: theme.errorText },
                            ]}
                        >
                            {error}
                        </Text>
                    </View>
                )}

                <RankingsLeaderCard
                    entry={leader}
                    sport={selectedSport}
                    theme={theme}
                    isDark={isDark}
                    logoSource={getCollegeLogo(leader.logo_key)}
                />

                {!!remainingEntries.length && (
                    <View
                        style={[
                            styles.rankingsCard,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        {remainingEntries.map((entry) => (
                            <RankingRow
                                key={`${ranking._id}-${entry.rank}-${entry.team_name}`}
                                entry={entry}
                                theme={theme}
                                isDark={isDark}
                            />
                        ))}
                    </View>
                )}
            </>
        );
    };

    if (!fontsLoaded) {
        return (
            <SafeAreaView
                edges={["left", "right"]}
                style={[styles.safeArea, { backgroundColor: theme.page }]}
            >
                <AppHeader />

                <View style={styles.fullPageLoader}>
                    <ActivityIndicator size="small" color={ACCENT} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={["left", "right"]}
            style={[styles.safeArea, { backgroundColor: theme.page }]}
        >
            <AppHeader />

            <ScrollView
                ref={scrollRef}
                style={[styles.container, { backgroundColor: theme.page }]}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={ACCENT}
                        colors={[ACCENT]}
                        progressBackgroundColor={theme.card}
                    />
                }
            >
                <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sportTabs}
                >
                    {SPORT_OPTIONS.map((sport) => {
                        const active = selectedSport === sport.value;

                        return (
                            <TouchableOpacity
                                key={sport.value}
                                activeOpacity={0.85}
                                style={[
                                    styles.sportTab,
                                    {
                                        backgroundColor: active
                                            ? theme.activeTab
                                            : theme.tab,
                                        borderColor: active
                                            ? theme.activeTab
                                            : theme.tabBorder,
                                    },
                                ]}
                                onPress={() => handleSportChange(sport.value)}
                            >
                                <Text style={styles.sportTabIcon}>
                                    {sport.icon}
                                </Text>

                                <Text
                                    style={[
                                        styles.sportTabText,
                                        {
                                            color: active
                                                ? theme.activeTabText
                                                : theme.text,
                                        },
                                    ]}
                                >
                                    {sport.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View
                    style={[
                        styles.periodCard,
                        {
                            backgroundColor: theme.toggle,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={previousDisabled}
                        style={[
                            styles.periodArrowButton,
                            {
                                backgroundColor: previousDisabled
                                    ? theme.arrowDisabled
                                    : theme.arrow,
                                borderColor: theme.border,
                            },
                            previousDisabled && styles.disabledControl,
                        ]}
                        onPress={goToPreviousPeriod}
                    >
                        <Text
                            style={[
                                styles.periodArrowText,
                                {
                                    color: previousDisabled
                                        ? theme.subtle
                                        : ACCENT,
                                },
                            ]}
                        >
                            ‹
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.periodTitle, { color: theme.text }]}>
                        {periodLabel}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={nextDisabled}
                        style={[
                            styles.periodArrowButton,
                            {
                                backgroundColor: nextDisabled
                                    ? theme.arrowDisabled
                                    : theme.arrow,
                                borderColor: theme.border,
                            },
                            nextDisabled && styles.disabledControl,
                        ]}
                        onPress={goToNextPeriod}
                    >
                        {changingPeriod ? (
                            <ActivityIndicator size="small" color={ACCENT} />
                        ) : (
                            <Text
                                style={[
                                    styles.periodArrowText,
                                    {
                                        color: nextDisabled
                                            ? theme.subtle
                                            : ACCENT,
                                    },
                                ]}
                            >
                                ›
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {renderRankings()}
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
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 105,
    },

    fullPageLoader: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    sportTabs: {
        gap: 7,
        paddingBottom: 8,
    },

    sportTab: {
        height: 38,
        paddingHorizontal: 13,
        borderRadius: 19,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    sportTabIcon: {
        fontSize: 15,
    },

    sportTabText: {
        fontSize: 14.5,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.1,
    },

    periodCard: {
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 9,
    },

    periodArrowButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    disabledControl: {
        opacity: 0.55,
    },

    periodArrowText: {
        fontSize: 27,
        lineHeight: 28,
        fontFamily: "Rajdhani_700Bold",
        marginTop: -2,
    },

    periodTitle: {
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
    },

    rankingsCard: {
        overflow: "hidden",
        borderRadius: 16,
        borderWidth: 1,
    },

    rankRow: {
        minHeight: 57,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },

    rankNumber: {
        width: 29,
        fontSize: 20,
        textAlign: "center",
        fontFamily: "Rajdhani_700Bold",
    },

    logoWrap: {
        width: 42,
        height: 42,
        marginLeft: 4,
        marginRight: 8,
        alignItems: "center",
        justifyContent: "center",
    },

    collegeLogo: {
        width: 40,
        height: 40,
    },

    logoFallback: {
        width: 38,
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    logoFallbackText: {
        fontSize: 19,
    },

    teamInfo: {
        flex: 1,
        minWidth: 0,
        paddingRight: 6,
    },

    teamName: {
        fontSize: 16.5,
        lineHeight: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.1,
    },

    recordText: {
        fontSize: 11.5,
        lineHeight: 14,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 1,
    },

    movementBadge: {
        minWidth: 44,
        height: 27,
        borderRadius: 14,
        paddingHorizontal: 7,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    movementText: {
        fontFamily: "Rajdhani_700Bold",
    },

    stateCard: {
        minHeight: 145,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 22,
        paddingVertical: 24,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyTitle: {
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
    },

    errorTitle: {
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
        marginBottom: 5,
    },

    errorText: {
        fontSize: 12.5,
        lineHeight: 17,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
    },

    retryButton: {
        minWidth: 104,
        height: 37,
        borderRadius: 19,
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 14,
        paddingHorizontal: 16,
    },

    retryButtonText: {
        color: "#041014",
        fontSize: 14.5,
        fontFamily: "Rajdhani_700Bold",
    },

    inlineError: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 8,
    },

    inlineErrorText: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
    },
});
