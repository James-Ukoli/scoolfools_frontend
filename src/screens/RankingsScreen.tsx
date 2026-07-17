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
import { getCollegeLogo } from "../../assets/data/collegeLogos";

type Sport =
    | "college-chess"
    | "basketball"
    | "football"
    | "volleyball";

type Cadence = "weekly" | "quarterly";
type PeriodType = "week" | "quarter";
type RankingStatus = "draft" | "published";

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
    sport: Sport;
    division?: string | null;
    season: string;
    cadence: Cadence;
    period_type: PeriodType;
    period_number: number;
    period_label?: string | null;
    title: string;
    description?: string | null;
    entries: RankingEntry[];
    status: RankingStatus;
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

const API_BASE =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const ACCENT = "#06B6D4";

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

function getTopRowStyle(rank: number) {
    if (rank === 1) return styles.goldRow;
    if (rank === 2) return styles.silverRow;
    if (rank === 3) return styles.bronzeRow;
    return null;
}

function getTopRankStyle(rank: number) {
    if (rank === 1) return styles.goldRank;
    if (rank === 2) return styles.silverRank;
    if (rank === 3) return styles.bronzeRank;
    return null;
}

function getTopNameStyle(rank: number) {
    if (rank === 1) return styles.goldName;
    if (rank === 2) return styles.silverName;
    if (rank === 3) return styles.bronzeName;
    return null;
}

function RankingRow({ entry }: { entry: RankingEntry }) {
    const logoSource = getCollegeLogo(entry.logo_key);
    const movement = getMovement(entry);

    return (
        <View style={[styles.rankRow, getTopRowStyle(entry.rank)]}>
            <Text style={[styles.rankNumber, getTopRankStyle(entry.rank)]}>
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
                    <View style={styles.logoFallback}>
                        <Text style={styles.logoFallbackText}>🎓</Text>
                    </View>
                )}
            </View>

            <View style={styles.teamInfo}>
                <Text
                    style={[styles.teamName, getTopNameStyle(entry.rank)]}
                    numberOfLines={2}
                >
                    {entry.team_name}
                </Text>

                {!!entry.record && (
                    <Text style={styles.recordText}>Record: {entry.record}</Text>
                )}

                {!!entry.note && (
                    <Text style={styles.noteText} numberOfLines={1}>
                        {entry.note}
                    </Text>
                )}
            </View>

            <View
                style={[
                    styles.movementBadge,
                    movement.type === "up" && styles.movementUp,
                    movement.type === "down" && styles.movementDown,
                    movement.type === "same" && styles.movementSame,
                    movement.type === "new" && styles.movementNew,
                ]}
            >
                <Text
                    style={[
                        styles.movementText,
                        movement.type === "up" && styles.movementUpText,
                        movement.type === "down" && styles.movementDownText,
                        movement.type === "same" && styles.movementSameText,
                        movement.type === "new" && styles.movementNewText,
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
                setError("API URL is missing from the Expo environment variables.");
                setRanking(null);
                setLoading(false);
                return;
            }

            try {
                if (showMainLoader) {
                    setLoading(true);
                }

                setError("");

                const payload = await fetchJson(
                    `${API_BASE}/api/sports-power-rankings/${sport}/latest`
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

                const payload = await fetchJson(
                    `${API_BASE}/sports-power-rankings/${selectedSport}/period/${periodNumber}`
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
                <View style={styles.stateCard}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={styles.stateText}>Loading rankings...</Text>
                </View>
            );
        }

        if (error && !ranking) {
            return (
                <View style={styles.stateCard}>
                    <Text style={styles.errorTitle}>Rankings unavailable</Text>
                    <Text style={styles.errorText}>{error}</Text>

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

        if (!ranking || !ranking.entries?.length) {
            return (
                <View style={styles.stateCard}>
                    <Text style={styles.emptyTitle}>
                        No {getSportTitle(selectedSport)} rankings yet
                    </Text>

                    <Text style={styles.stateText}>
                        The latest published ranking will appear here.
                    </Text>
                </View>
            );
        }

        return (
            <>
                {!!error && (
                    <View style={styles.inlineError}>
                        <Text style={styles.inlineErrorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.rankingsCard}>
                    {ranking.entries
                        .slice()
                        .sort((a, b) => a.rank - b.rank)
                        .map((entry) => (
                            <RankingRow
                                key={`${ranking._id}-${entry.rank}-${entry.team_name}`}
                                entry={entry}
                            />
                        ))}
                </View>
            </>
        );
    };

    if (!fontsLoaded) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />

                <View style={styles.fullPageLoader}>
                    <ActivityIndicator size="small" color={ACCENT} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <AppHeader />

            <ScrollView
                ref={scrollRef}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={ACCENT}
                        colors={[ACCENT]}
                        progressBackgroundColor="#0B1018"
                    />
                }
            >
                <View style={styles.titleBlock}>
                    <Text style={styles.eyebrow}>SPORTSZONE</Text>
                    <Text style={styles.pageTitle}>Power Rankings</Text>
                    <Text style={styles.pageSubtitle}>
                        College teams ranked by current performance.
                    </Text>
                </View>

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
                                    active && styles.sportTabActive,
                                ]}
                                onPress={() => handleSportChange(sport.value)}
                            >
                                <Text
                                    style={[
                                        styles.sportTabIcon,
                                        active && styles.sportTabIconActive,
                                    ]}
                                >
                                    {sport.icon}
                                </Text>

                                <Text
                                    style={[
                                        styles.sportTabText,
                                        active && styles.sportTabTextActive,
                                    ]}
                                >
                                    {sport.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.periodCard}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={previousDisabled}
                        style={[
                            styles.periodArrowButton,
                            previousDisabled && styles.periodArrowDisabled,
                        ]}
                        onPress={goToPreviousPeriod}
                    >
                        <Text
                            style={[
                                styles.periodArrowText,
                                previousDisabled && styles.periodArrowTextDisabled,
                            ]}
                        >
                            ‹
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.periodCenter}>
                        <Text style={styles.periodTitle}>{periodLabel}</Text>

                        {!!ranking?.season && (
                            <Text style={styles.periodSeason}>
                                Season {ranking.season}
                                {ranking.is_season_final ? " • Final" : ""}
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={nextDisabled}
                        style={[
                            styles.periodArrowButton,
                            nextDisabled && styles.periodArrowDisabled,
                        ]}
                        onPress={goToNextPeriod}
                    >
                        {changingPeriod ? (
                            <ActivityIndicator size="small" color={ACCENT} />
                        ) : (
                            <Text
                                style={[
                                    styles.periodArrowText,
                                    nextDisabled && styles.periodArrowTextDisabled,
                                ]}
                            >
                                ›
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {!!ranking?.title && (
                    <View style={styles.rankingHeader}>
                        <View style={styles.rankingHeaderText}>
                            <Text style={styles.rankingTitle}>{ranking.title}</Text>

                            {!!ranking.description && (
                                <Text
                                    style={styles.rankingDescription}
                                    numberOfLines={2}
                                >
                                    {ranking.description}
                                </Text>
                            )}
                        </View>

                        <View style={styles.publishedPill}>
                            <View style={styles.publishedDot} />
                            <Text style={styles.publishedText}>Published</Text>
                        </View>
                    </View>
                )}

                {renderRankings()}
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
        paddingTop: 10,
        paddingBottom: 120,
    },

    fullPageLoader: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    titleBlock: {
        marginBottom: 12,
    },

    eyebrow: {
        color: ACCENT,
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 2.2,
    },

    pageTitle: {
        color: "#FFFFFF",
        fontSize: 30,
        lineHeight: 34,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },

    pageSubtitle: {
        color: "#8F9AAA",
        fontSize: 13.5,
        lineHeight: 18,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 2,
    },

    sportTabs: {
        paddingBottom: 12,
        gap: 8,
    },

    sportTab: {
        minHeight: 42,
        paddingHorizontal: 15,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#253041",
        backgroundColor: "#080C13",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },

    sportTabActive: {
        backgroundColor: ACCENT,
        borderColor: ACCENT,
        shadowColor: ACCENT,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },

    sportTabIcon: {
        color: "#FFFFFF",
        fontSize: 16,
    },

    sportTabIconActive: {
        color: "#041014",
    },

    sportTabText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.2,
    },

    sportTabTextActive: {
        color: "#041014",
    },

    periodCard: {
        minHeight: 60,
        borderRadius: 18,
        backgroundColor: "#080D15",
        borderWidth: 1,
        borderColor: "#1D2B3B",
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },

    periodArrowButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#101824",
        borderWidth: 1,
        borderColor: "#2A3A4B",
        alignItems: "center",
        justifyContent: "center",
    },

    periodArrowDisabled: {
        opacity: 0.35,
    },

    periodArrowText: {
        color: ACCENT,
        fontSize: 31,
        lineHeight: 32,
        fontFamily: "Rajdhani_700Bold",
        marginTop: -2,
    },

    periodArrowTextDisabled: {
        color: "#6B7280",
    },

    periodCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },

    periodTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },

    periodSeason: {
        color: "#8490A1",
        fontSize: 11.5,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 1,
    },

    rankingHeader: {
        paddingHorizontal: 2,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },

    rankingHeaderText: {
        flex: 1,
    },

    rankingTitle: {
        color: "#FFFFFF",
        fontSize: 21,
        lineHeight: 24,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.2,
    },

    rankingDescription: {
        color: "#8F9AAA",
        fontSize: 12.5,
        lineHeight: 17,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 2,
    },

    publishedPill: {
        minHeight: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "rgba(34,197,94,0.55)",
        backgroundColor: "rgba(34,197,94,0.12)",
        paddingHorizontal: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    publishedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#22C55E",
    },

    publishedText: {
        color: "#68E391",
        fontSize: 11.5,
        fontFamily: "Rajdhani_700Bold",
    },

    rankingsCard: {
        overflow: "hidden",
        borderRadius: 20,
        backgroundColor: "#070B11",
        borderWidth: 1,
        borderColor: "#1A2634",
    },

    rankRow: {
        minHeight: 70,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#203040",
    },

    goldRow: {
        backgroundColor: "rgba(250,204,21,0.055)",
    },

    silverRow: {
        backgroundColor: "rgba(203,213,225,0.045)",
    },

    bronzeRow: {
        backgroundColor: "rgba(249,115,22,0.05)",
    },

    rankNumber: {
        width: 34,
        color: "#FFFFFF",
        fontSize: 22,
        textAlign: "center",
        fontFamily: "Rajdhani_700Bold",
    },

    goldRank: {
        color: "#FACC15",
        textShadowColor: "rgba(250,204,21,0.7)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },

    silverRank: {
        color: "#E2E8F0",
        textShadowColor: "rgba(226,232,240,0.55)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },

    bronzeRank: {
        color: "#FB923C",
        textShadowColor: "rgba(251,146,60,0.5)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },

    logoWrap: {
        width: 52,
        height: 52,
        marginLeft: 6,
        marginRight: 10,
        alignItems: "center",
        justifyContent: "center",
    },

    collegeLogo: {
        width: 48,
        height: 48,
    },

    logoFallback: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#111A25",
        borderWidth: 1,
        borderColor: "#26384B",
        alignItems: "center",
        justifyContent: "center",
    },

    logoFallbackText: {
        fontSize: 22,
    },

    teamInfo: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
    },

    teamName: {
        color: "#FFFFFF",
        fontSize: 17.5,
        lineHeight: 20,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.15,
    },

    goldName: {
        color: "#FACC15",
    },

    silverName: {
        color: "#E2E8F0",
    },

    bronzeName: {
        color: "#FB923C",
    },

    recordText: {
        color: "#A7B1BF",
        fontSize: 12.5,
        lineHeight: 16,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 2,
    },

    noteText: {
        color: "#738095",
        fontSize: 11.5,
        lineHeight: 15,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 1,
    },

    movementBadge: {
        minWidth: 48,
        height: 30,
        borderRadius: 15,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },

    movementUp: {
        backgroundColor: "rgba(57,255,20,0.09)",
        borderColor: "rgba(57,255,20,0.5)",
    },

    movementDown: {
        backgroundColor: "rgba(255,76,76,0.09)",
        borderColor: "rgba(255,76,76,0.5)",
    },

    movementSame: {
        backgroundColor: "rgba(148,163,184,0.08)",
        borderColor: "rgba(148,163,184,0.34)",
    },

    movementNew: {
        backgroundColor: "rgba(6,182,212,0.1)",
        borderColor: "rgba(6,182,212,0.55)",
    },

    movementText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
    },

    movementUpText: {
        color: "#39FF14",
    },

    movementDownText: {
        color: "#FF5C5C",
    },

    movementSameText: {
        color: "#A7B1BF",
    },

    movementNewText: {
        color: ACCENT,
        fontSize: 11.5,
    },

    stateCard: {
        minHeight: 180,
        borderRadius: 20,
        backgroundColor: "#070B11",
        borderWidth: 1,
        borderColor: "#1A2634",
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: "center",
        justifyContent: "center",
    },

    stateText: {
        color: "#8F9AAA",
        fontSize: 13.5,
        lineHeight: 19,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
        marginTop: 9,
    },

    emptyTitle: {
        color: "#FFFFFF",
        fontSize: 19,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
    },

    errorTitle: {
        color: "#FFFFFF",
        fontSize: 19,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
        marginBottom: 6,
    },

    errorText: {
        color: "#FF7676",
        fontSize: 13,
        lineHeight: 18,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
    },

    retryButton: {
        minWidth: 110,
        height: 40,
        borderRadius: 20,
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 16,
        paddingHorizontal: 18,
    },

    retryButtonText: {
        color: "#041014",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
    },

    inlineError: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,92,92,0.45)",
        backgroundColor: "rgba(255,92,92,0.08)",
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 10,
    },

    inlineErrorText: {
        color: "#FF8B8B",
        fontSize: 12.5,
        lineHeight: 17,
        fontFamily: "Rajdhani_600SemiBold",
        textAlign: "center",
    },
});
