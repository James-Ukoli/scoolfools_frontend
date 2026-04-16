import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    RefreshControl,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";

type MonthlyDivision = "pro" | "women";
type QuarterlyCategory = "countries" | "colleges" | "influencers";

type MonthlyRankingItem = {
    rank: number;
    player_name: string;
    country_code?: string;
};

type MonthlyRankingResponse = {
    success: boolean;
    ranking?: {
        _id: string;
        division: MonthlyDivision;
        month: string;
        status: string;
        items: MonthlyRankingItem[];
        created_at: string;
        updated_at: string;
    };
};

type QuarterlyEntry = {
    rank: number;
    name: string;
    meta?: {
        country_code?: string;
        platform?: string;
        handle?: string;
        url?: string;
    };
    note?: string | null;
};

type QuarterlyRankingItem = {
    _id: string;
    category: QuarterlyCategory;
    year: number;
    quarter: number;
    title: string;
    description?: string | null;
    entries: QuarterlyEntry[];
    status: string;
    createdAt: string;
    updatedAt: string;
};

type QuarterlyRankingResponse = {
    success: boolean;
    items: QuarterlyRankingItem[];
};

type MovementType = "up" | "down" | "same" | "new";

type DisplayRow = {
    rank: number;
    name: string;
    rightLabel?: string;
    movementType: MovementType;
    movementValue?: number;
    imageUrl?: string | null;
    metaText?: string;
    isInfluencer?: boolean;
};

const API_BASE =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;


const REFRESH_COLOR = "#FF4FD8";

const MONTH_OPTIONS = [
    { label: "Jan", value: 1 },
    { label: "Feb", value: 2 },
    { label: "Mar", value: 3 },
    { label: "Apr", value: 4 },
    { label: "May", value: 5 },
    { label: "Jun", value: 6 },
    { label: "Jul", value: 7 },
    { label: "Aug", value: 8 },
    { label: "Sep", value: 9 },
    { label: "Oct", value: 10 },
    { label: "Nov", value: 11 },
    { label: "Dec", value: 12 },
];

function formatMonthParam(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

function getPreviousMonth(year: number, month: number) {
    if (month === 1) {
        return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
}

function getNextMonth(year: number, month: number) {
    if (month === 12) {
        return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
}

function getPreviousQuarter(year: number, quarter: number) {
    if (quarter === 1) {
        return { year: year - 1, quarter: 4 };
    }
    return { year, quarter: quarter - 1 };
}

function getNextQuarter(year: number, quarter: number) {
    if (quarter === 4) {
        return { year: year + 1, quarter: 1 };
    }
    return { year, quarter: quarter + 1 };
}

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizeHandle(handle?: string) {
    if (!handle) return "";
    return handle.replace(/^@+/, "").trim();
}

function getQuarterlyIdentity(entry: QuarterlyEntry) {
    const cleanHandle = sanitizeHandle(entry.meta?.handle);
    return cleanHandle || entry.name;
}

function getMovementBadgeData(
    currentName: string,
    currentRank: number,
    previousList: { name: string; rank: number }[]
): { movementType: MovementType; movementValue?: number } {
    const previousItem = previousList.find((item) => item.name === currentName);

    if (!previousItem) {
        return { movementType: "new" };
    }

    const diff = previousItem.rank - currentRank;

    if (diff > 0) {
        return { movementType: "up", movementValue: diff };
    }

    if (diff < 0) {
        return { movementType: "down", movementValue: Math.abs(diff) };
    }

    return { movementType: "same", movementValue: 0 };
}

function getMovementText(type: MovementType, value?: number) {
    if (type === "new") return "NEW";
    if (type === "same") return "—";
    if (type === "up") return `+${value ?? 0}`;
    return `-${value ?? 0}`;
}

function getFlagCode(countryCode?: string) {
    if (!countryCode) return null;

    const map: Record<string, string> = {
        USA: "us",
        NOR: "no",
        UZB: "uz",
        NED: "nl",
        GER: "de",
        IND: "in",
        FRA: "fr",
        CHN: "cn",
        UKR: "ua",
        POL: "pl",
        KAZ: "kz",
        SUI: "ch",
        RUS: "ru",
    };

    return map[countryCode] ?? null;
}

function getFlagUrl(countryCode?: string) {
    const code = getFlagCode(countryCode);
    if (!code) return null;
    return `https://flagcdn.com/w40/${code}.png`;
}

function getPlatformLogoUrl(platform?: string) {
    if (!platform) return null;

    const normalized = platform.trim().toLowerCase();

    const map: Record<string, string> = {
        youtube: "https://img.icons8.com/color/48/youtube-play.png",
        twitch: "https://img.icons8.com/color/48/twitch--v1.png",
        instagram: "https://img.icons8.com/fluency/48/instagram-new.png",
        x: "https://img.icons8.com/ios-filled/50/ffffff/twitterx--v1.png",
        twitter: "https://img.icons8.com/ios-filled/50/ffffff/twitterx--v1.png",
        tiktok: "https://img.icons8.com/color/48/tiktok--v1.png",
        kick: "https://img.icons8.com/fluency/48/video-call.png",
    };

    return map[normalized] ?? null;
}

export default function PowerRankingsScreen() {
    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);
    const pendingRestoreScrollRef = useRef<number | null>(null);

    const [monthlyDivision, setMonthlyDivision] =
        useState<MonthlyDivision>("pro");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

    const [monthlyYear, setMonthlyYear] = useState(currentYear);
    const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);

    const [quarterlyCategory, setQuarterlyCategory] =
        useState<QuarterlyCategory>("countries");
    const [quarterlyYear, setQuarterlyYear] = useState(currentYear);
    const [quarterlyQuarter, setQuarterlyQuarter] = useState(currentQuarter);

    const [monthlyRows, setMonthlyRows] = useState<DisplayRow[]>([]);
    const [quarterlyRows, setQuarterlyRows] = useState<DisplayRow[]>([]);

    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [quarterlyLoading, setQuarterlyLoading] = useState(false);

    const [monthlyError, setMonthlyError] = useState("");
    const [quarterlyError, setQuarterlyError] = useState("");

    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const monthlyTitle = useMemo(() => {
        const monthLabel =
            MONTH_OPTIONS.find((m) => m.value === monthlyMonth)?.label ?? "";
        return `${titleCase(monthlyDivision)} • ${monthLabel} ${monthlyYear}`;
    }, [monthlyDivision, monthlyMonth, monthlyYear]);

    const quarterlyTitle = useMemo(() => {
        return `${titleCase(quarterlyCategory)} • Q${quarterlyQuarter} ${quarterlyYear}`;
    }, [quarterlyCategory, quarterlyQuarter, quarterlyYear]);

    const fetchMonthly = useCallback(async () => {
        try {
            setMonthlyLoading(true);
            setMonthlyError("");

            const currentMonthParam = formatMonthParam(monthlyYear, monthlyMonth);
            const prev = getPreviousMonth(monthlyYear, monthlyMonth);
            const previousMonthParam = formatMonthParam(prev.year, prev.month);

            const currentUrl = `${API_BASE}/api/power-rankings/month/${currentMonthParam}?division=${monthlyDivision}`;
            const previousUrl = `${API_BASE}/api/power-rankings/month/${previousMonthParam}?division=${monthlyDivision}`;

            const [currentRes, previousRes] = await Promise.all([
                fetch(currentUrl),
                fetch(previousUrl),
            ]);

            const currentJson: MonthlyRankingResponse = await currentRes.json();

            let previousJson: MonthlyRankingResponse | null = null;
            if (previousRes.ok) {
                previousJson = await previousRes.json();
            }

            const currentItems = currentJson?.ranking?.items ?? [];
            const previousItems = previousJson?.ranking?.items ?? [];

            const previousList = previousItems.map((item) => ({
                name: item.player_name,
                rank: item.rank,
            }));

            const normalizedRows: DisplayRow[] = currentItems.map((item) => {
                const movement = getMovementBadgeData(
                    item.player_name,
                    item.rank,
                    previousList
                );

                return {
                    rank: item.rank,
                    name: item.player_name,
                    rightLabel: item.country_code,
                    movementType: movement.movementType,
                    movementValue: movement.movementValue,
                    imageUrl: getFlagUrl(item.country_code),
                    metaText: item.country_code,
                    isInfluencer: false,
                };
            });

            setMonthlyRows(normalizedRows);
        } catch {
            setMonthlyRows([]);
            setMonthlyError("Could not load monthly rankings.");
        } finally {
            setMonthlyLoading(false);
        }
    }, [monthlyDivision, monthlyYear, monthlyMonth]);

    const fetchQuarterly = useCallback(async () => {
        try {
            setQuarterlyLoading(true);
            setQuarterlyError("");

            const res = await fetch(`${API_BASE}/api/power-rankings/quarterly`);
            const json: QuarterlyRankingResponse = await res.json();
            const allItems = json?.items ?? [];

            const selected = allItems.find(
                (item) =>
                    item.category === quarterlyCategory &&
                    item.year === quarterlyYear &&
                    item.quarter === quarterlyQuarter
            );

            const prev = getPreviousQuarter(quarterlyYear, quarterlyQuarter);

            const previous = allItems.find(
                (item) =>
                    item.category === quarterlyCategory &&
                    item.year === prev.year &&
                    item.quarter === prev.quarter
            );

            const currentEntries = selected?.entries ?? [];
            const previousEntries = previous?.entries ?? [];

            const previousList = previousEntries.map((entry) => ({
                name: getQuarterlyIdentity(entry),
                rank: entry.rank,
            }));

            const normalizedRows: DisplayRow[] = currentEntries.map((entry) => {
                const identity = getQuarterlyIdentity(entry);
                const cleanHandle = sanitizeHandle(entry.meta?.handle);
                const isInfluencer = quarterlyCategory === "influencers";
                const flagUrl = getFlagUrl(entry.meta?.country_code);
                const platformLogo = getPlatformLogoUrl(entry.meta?.platform);

                const movement = getMovementBadgeData(
                    identity,
                    entry.rank,
                    previousList
                );

                return {
                    rank: entry.rank,
                    name: isInfluencer ? (cleanHandle || entry.name) : entry.name,
                    rightLabel: isInfluencer ? undefined : entry.meta?.country_code,
                    movementType: movement.movementType,
                    movementValue: movement.movementValue,
                    imageUrl: isInfluencer ? platformLogo : flagUrl,
                    metaText: isInfluencer ? undefined : entry.meta?.country_code,
                    isInfluencer,
                };
            });

            setQuarterlyRows(normalizedRows);
        } catch {
            setQuarterlyRows([]);
            setQuarterlyError("Could not load quarterly rankings.");
        } finally {
            setQuarterlyLoading(false);
        }
    }, [quarterlyCategory, quarterlyYear, quarterlyQuarter]);

    const fetchAllRankings = useCallback(async () => {
        await Promise.all([fetchMonthly(), fetchQuarterly()]);
    }, [fetchMonthly, fetchQuarterly]);

    useEffect(() => {
        const run = async () => {
            await fetchAllRankings();
            setInitialLoading(false);
        };
        run();
    }, [fetchAllRankings]);

    useEffect(() => {
        if (!quarterlyLoading && pendingRestoreScrollRef.current != null) {
            const y = pendingRestoreScrollRef.current;
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ y, animated: false });
                pendingRestoreScrollRef.current = null;
            });
        }
    }, [quarterlyLoading, quarterlyRows]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchAllRankings();
            await new Promise((resolve) => setTimeout(resolve, 700));
        } finally {
            setRefreshing(false);
        }
    }, [fetchAllRankings]);

    const preserveScroll = () => {
        pendingRestoreScrollRef.current = scrollYRef.current;
    };

    const goMonthlyBack = () => {
        preserveScroll();
        const prev = getPreviousMonth(monthlyYear, monthlyMonth);
        setMonthlyYear(prev.year);
        setMonthlyMonth(prev.month);
    };

    const goMonthlyForward = () => {
        preserveScroll();
        const next = getNextMonth(monthlyYear, monthlyMonth);
        setMonthlyYear(next.year);
        setMonthlyMonth(next.month);
    };

    const goQuarterlyBack = () => {
        preserveScroll();
        const prev = getPreviousQuarter(quarterlyYear, quarterlyQuarter);
        setQuarterlyYear(prev.year);
        setQuarterlyQuarter(prev.quarter);
    };

    const goQuarterlyForward = () => {
        preserveScroll();
        const next = getNextQuarter(quarterlyYear, quarterlyQuarter);
        setQuarterlyYear(next.year);
        setQuarterlyQuarter(next.quarter);
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
    };

    const renderRows = (
        rows: DisplayRow[],
        loading: boolean,
        errorMessage: string
    ) => {
        if (loading) {
            return (
                <View style={styles.centerState}>
                    <ActivityIndicator size="small" color={REFRESH_COLOR} />
                    <Text style={styles.stateText}>Loading...</Text>
                </View>
            );
        }

        if (errorMessage) {
            return (
                <View style={styles.centerState}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            );
        }

        if (!rows.length) {
            return (
                <View style={styles.centerState}>
                    <Text style={styles.stateText}>No rankings found.</Text>
                </View>
            );
        }

        return (
            <View style={styles.rankingsCard}>
                {rows.map((row) => {
                    return (
                        <View key={`${row.rank}-${row.name}`} style={styles.rankRow}>
                            <Text style={styles.rankNumber}>{row.rank}</Text>

                            <View style={styles.rankMain}>
                                <View style={styles.nameLine}>
                                    {row.imageUrl ? (
                                        <Image
                                            source={{ uri: row.imageUrl }}
                                            style={row.isInfluencer ? styles.platformImage : styles.flagImage}
                                        />
                                    ) : null}

                                    <Text style={styles.rankName} numberOfLines={1}>
                                        {row.name}
                                    </Text>
                                </View>

                                {!!row.metaText && (
                                    <Text
                                        style={[
                                            styles.rankMeta,
                                            row.isInfluencer && styles.rankMetaInfluencer,
                                        ]}
                                    >
                                        {row.metaText}
                                    </Text>
                                )}
                            </View>

                            <View
                                style={[
                                    styles.movementBadge,
                                    row.movementType === "up" && styles.movementUp,
                                    row.movementType === "down" && styles.movementDown,
                                    row.movementType === "same" && styles.movementSame,
                                    row.movementType === "new" && styles.movementNew,
                                ]}
                            >
                                <Text style={styles.movementText}>
                                    {getMovementText(row.movementType, row.movementValue)}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    if (initialLoading) {
        return (
            <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
                <AppHeader />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={REFRESH_COLOR} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
            <AppHeader />

            {refreshing && (
                <View style={styles.refreshIndicator}>
                    <ActivityIndicator size="small" color={REFRESH_COLOR} />
                </View>
            )}

            <ScrollView
                ref={scrollRef}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={REFRESH_COLOR}
                        colors={[REFRESH_COLOR]}
                        progressBackgroundColor="#111111"
                    />
                }
            >
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Power Rankings 🥇 </Text>
                </View>

                <View style={styles.sectionBlock}>
                    {/* <Text style={styles.sectionTitle}>{monthlyTitle}</Text> */}

                    <View style={styles.topControlRow}>
                        <View style={styles.divisionCompact}>
                            {(["pro", "women"] as MonthlyDivision[]).map((division) => {
                                const active = monthlyDivision === division;
                                return (
                                    <TouchableOpacity
                                        key={division}
                                        style={[
                                            styles.compactPill,
                                            active && styles.compactPillActive,
                                        ]}
                                        onPress={() => {
                                            preserveScroll();
                                            setMonthlyDivision(division);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.compactPillText,
                                                active && styles.compactPillTextActive,
                                            ]}
                                        >
                                            {titleCase(division)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.monthNavCompact}>
                            <TouchableOpacity style={styles.arrowButton} onPress={goMonthlyBack}>
                                <Text style={styles.arrowText}>‹</Text>
                            </TouchableOpacity>

                            <View style={styles.periodValueBox}>
                                <Text style={styles.periodValueText}>
                                    {MONTH_OPTIONS.find((m) => m.value === monthlyMonth)?.label}{" "}
                                    {monthlyYear}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.arrowButton}
                                onPress={goMonthlyForward}
                            >
                                <Text style={styles.arrowText}>›</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {renderRows(monthlyRows, monthlyLoading, monthlyError)}
                </View>

                <View style={styles.sponsorBlock}>
                    <Text style={styles.sponsorLabel}>Sponsored by CyberGlobe, LLC</Text>
                    <Text style={styles.sponsorSubtext}>
                        "Lets Build Helpful Software Applications, TOGETHER"
                    </Text>
                </View>

                <View style={styles.sectionBlock}>
                    {/* <Text style={styles.sectionTitle}>{quarterlyTitle}</Text> */}

                    <View style={styles.topControlRowQuarterly}>
                        <View style={styles.categoryCompact}>
                            {(
                                ["countries", "colleges", "influencers"] as QuarterlyCategory[]
                            ).map((category) => {
                                const active = quarterlyCategory === category;
                                return (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.compactPill,
                                            active && styles.compactPillActive,
                                        ]}
                                        onPress={() => {
                                            preserveScroll();
                                            setQuarterlyCategory(category);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.compactPillText,
                                                active && styles.compactPillTextActive,
                                            ]}
                                        >
                                            {titleCase(category)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.monthNavCompact}>
                            <TouchableOpacity
                                style={styles.arrowButton}
                                onPress={goQuarterlyBack}
                            >
                                <Text style={styles.arrowText}>‹</Text>
                            </TouchableOpacity>

                            <View style={styles.periodValueBox}>
                                <Text style={styles.periodValueText}>
                                    Q{quarterlyQuarter} {quarterlyYear}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.arrowButton}
                                onPress={goQuarterlyForward}
                            >
                                <Text style={styles.arrowText}>›</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {renderRows(quarterlyRows, quarterlyLoading, quarterlyError)}
                </View>
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
        paddingBottom: 42,
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
    headerRow: {
        marginTop: 4,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        color: "#ff00b7",
        fontSize: 25,
        fontWeight: "900",
        textAlign: "center",

        letterSpacing: 2,
        textTransform: "uppercase",

        marginTop: 12,   // space from logo/nav
        marginBottom: 10, // space before filters
        paddingHorizontal: 16, // prevents edge crowding

        textShadowColor: "#ff00b7",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
    },
    sectionBlock: {
        marginBottom: 12,
    },
    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
        marginBottom: 8,
        textAlign: "center",
    },
    topControlRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        gap: 6,
    },
    topControlRowQuarterly: {
        flexDirection: "column",
        marginBottom: 8,
        gap: 6,
    },
    divisionCompact: {
        flexDirection: "row",
        gap: 5,
    },
    categoryCompact: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 5,
    },
    compactPill: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "#151515",
        borderWidth: 1,
        borderColor: "#282828",
    },
    compactPillActive: {
        backgroundColor: "#2EE7FF",
        borderColor: "#63F0FF",
    },
    compactPillText: {
        color: "#F1F1F1",
        fontSize: 11,
        fontWeight: "800",
    },
    compactPillTextActive: {
        color: "#081018",
    },
    monthNavCompact: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "flex-end",
    },
    arrowButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#121212",
        borderWidth: 1,
        borderColor: "#262626",
        alignItems: "center",
        justifyContent: "center",
    },
    arrowText: {
        color: "#F4D03F",
        fontSize: 16,
        fontWeight: "900",
        lineHeight: 16,
    },
    periodValueBox: {
        minWidth: 100,
        marginHorizontal: 6,
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 10,
        backgroundColor: "#101010",
        borderWidth: 1,
        borderColor: "#1E1E1E",
        alignItems: "center",
    },
    periodValueText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
    },
    sponsorBlock: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
        marginBottom: 14,
        paddingVertical: 6,
    },
    sponsorLabel: {
        color: "#2EE7FF",
        fontSize: 12,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: 0.3,
        marginBottom: 3,
    },
    sponsorSubtext: {
        color: "#CFCFCF",
        fontSize: 11,
        fontWeight: "700",
        textAlign: "center",
    },
    centerState: {
        paddingVertical: 16,
        alignItems: "center",
    },
    stateText: {
        color: "#CFCFCF",
        fontSize: 12,
        fontWeight: "700",
        marginTop: 8,
    },
    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
    },
    rankingsCard: {
        backgroundColor: "#0C0C0C",
        borderRadius: 16,
        paddingVertical: 1,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: "#171717",
    },
    rankRow: {
        minHeight: 32,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 2,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#141414",
    },
    rankNumber: {
        width: 20,
        color: "#F4D03F",
        fontSize: 12,
        fontWeight: "900",
        marginRight: 8,
    },
    rankMain: {
        flex: 1,
        marginRight: 8,
    },
    nameLine: {
        flexDirection: "row",
        alignItems: "center",
    },
    flagImage: {
        width: 14,
        height: 10,
        borderRadius: 2,
        marginRight: 6,
        backgroundColor: "#1A1A1A",
    },
    platformImage: {
        width: 14,
        height: 14,
        borderRadius: 3,
        marginRight: 6,
        backgroundColor: "#1A1A1A",
    },
    rankName: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
        lineHeight: 13,
        flexShrink: 1,
    },
    rankMeta: {
        color: "#9B9B9B",
        fontSize: 9,
        fontWeight: "700",
        marginTop: 1,
        letterSpacing: 0.3,
        marginLeft: 20,
    },
    rankMetaInfluencer: {
        marginLeft: 20,
    },
    movementBadge: {
        minWidth: 38,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    movementUp: {
        backgroundColor: "rgba(46,231,165,0.12)",
        borderColor: "#2EE7A5",
    },
    movementDown: {
        backgroundColor: "rgba(255,92,92,0.12)",
        borderColor: "#FF5C5C",
    },
    movementSame: {
        backgroundColor: "rgba(156,163,175,0.12)",
        borderColor: "#9CA3AF",
    },
    movementNew: {
        backgroundColor: "rgba(46,231,255,0.12)",
        borderColor: "#2EE7FF",
    },
    movementText: {
        color: "#FFFFFF",
        fontSize: 9.5,
        fontWeight: "900",
    },
});