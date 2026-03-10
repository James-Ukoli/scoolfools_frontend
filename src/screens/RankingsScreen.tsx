import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
};

const API_BASE = "http://localhost:5002/api";

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

export default function PowerRankingsScreen({ navigation }: any) {
    const [monthlyDivision, setMonthlyDivision] =
        useState<MonthlyDivision>("pro");
    const [monthlyYear, setMonthlyYear] = useState(2026);
    const [monthlyMonth, setMonthlyMonth] = useState(3);

    const [quarterlyCategory, setQuarterlyCategory] =
        useState<QuarterlyCategory>("countries");
    const [quarterlyYear, setQuarterlyYear] = useState(2026);
    const [quarterlyQuarter, setQuarterlyQuarter] = useState(1);

    const [monthlyRows, setMonthlyRows] = useState<DisplayRow[]>([]);
    const [quarterlyRows, setQuarterlyRows] = useState<DisplayRow[]>([]);

    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [quarterlyLoading, setQuarterlyLoading] = useState(false);

    const [monthlyError, setMonthlyError] = useState("");
    const [quarterlyError, setQuarterlyError] = useState("");

    const monthlyTitle = useMemo(() => {
        const monthLabel =
            MONTH_OPTIONS.find((m) => m.value === monthlyMonth)?.label ?? "";
        return `${monthLabel} ${monthlyYear}`;
    }, [monthlyMonth, monthlyYear]);

    const quarterlyTitle = useMemo(() => {
        return `Q${quarterlyQuarter} ${quarterlyYear}`;
    }, [quarterlyQuarter, quarterlyYear]);

    useEffect(() => {
        const fetchMonthly = async () => {
            try {
                setMonthlyLoading(true);
                setMonthlyError("");

                const currentMonthParam = formatMonthParam(monthlyYear, monthlyMonth);
                const prev = getPreviousMonth(monthlyYear, monthlyMonth);
                const previousMonthParam = formatMonthParam(prev.year, prev.month);

                const currentUrl = `${API_BASE}/power-rankings/month/${currentMonthParam}?division=${monthlyDivision}`;
                const previousUrl = `${API_BASE}/power-rankings/month/${previousMonthParam}?division=${monthlyDivision}`;

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
                    };
                });

                setMonthlyRows(normalizedRows);
            } catch {
                setMonthlyRows([]);
                setMonthlyError("Could not load monthly rankings.");
            } finally {
                setMonthlyLoading(false);
            }
        };

        fetchMonthly();
    }, [monthlyDivision, monthlyYear, monthlyMonth]);

    useEffect(() => {
        const fetchQuarterly = async () => {
            try {
                setQuarterlyLoading(true);
                setQuarterlyError("");

                const res = await fetch(`${API_BASE}/power-rankings/quarterly`);
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
                    name: entry.name,
                    rank: entry.rank,
                }));

                const normalizedRows: DisplayRow[] = currentEntries.map((entry) => {
                    const movement = getMovementBadgeData(
                        entry.name,
                        entry.rank,
                        previousList
                    );

                    return {
                        rank: entry.rank,
                        name: entry.name,
                        rightLabel: entry.meta?.country_code,
                        movementType: movement.movementType,
                        movementValue: movement.movementValue,
                    };
                });

                setQuarterlyRows(normalizedRows);
            } catch {
                setQuarterlyRows([]);
                setQuarterlyError("Could not load quarterly rankings.");
            } finally {
                setQuarterlyLoading(false);
            }
        };

        fetchQuarterly();
    }, [quarterlyCategory, quarterlyYear, quarterlyQuarter]);

    const goMonthlyBack = () => {
        const prev = getPreviousMonth(monthlyYear, monthlyMonth);
        setMonthlyYear(prev.year);
        setMonthlyMonth(prev.month);
    };

    const goMonthlyForward = () => {
        const next = getNextMonth(monthlyYear, monthlyMonth);
        setMonthlyYear(next.year);
        setMonthlyMonth(next.month);
    };

    const goQuarterlyBack = () => {
        const prev = getPreviousQuarter(quarterlyYear, quarterlyQuarter);
        setQuarterlyYear(prev.year);
        setQuarterlyQuarter(prev.quarter);
    };

    const goQuarterlyForward = () => {
        const next = getNextQuarter(quarterlyYear, quarterlyQuarter);
        setQuarterlyYear(next.year);
        setQuarterlyQuarter(next.quarter);
    };

    const renderRows = (
        rows: DisplayRow[],
        loading: boolean,
        errorMessage: string
    ) => {
        if (loading) {
            return (
                <View style={styles.centerState}>
                    <ActivityIndicator size="small" color="#2EE7FF" />
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
                    const flagUrl = getFlagUrl(row.rightLabel);

                    return (
                        <View key={`${row.rank}-${row.name}`} style={styles.rankRow}>
                            <Text style={styles.rankNumber}>{row.rank}</Text>

                            <View style={styles.rankMain}>
                                <View style={styles.nameLine}>
                                    {flagUrl ? (
                                        <Image source={{ uri: flagUrl }} style={styles.flagImage} />
                                    ) : null}

                                    <Text style={styles.rankName} numberOfLines={1}>
                                        {row.name}
                                    </Text>
                                </View>

                                {!!row.rightLabel && (
                                    <Text style={styles.rankMeta}>{row.rightLabel}</Text>
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

                    <Text style={styles.headerTitle}>Power Rankings</Text>

                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>Monthly Rankings</Text>

                    <View style={styles.topControlRow}>
                        <View style={styles.divisionCompact}>
                            {(["pro", "women"] as MonthlyDivision[]).map((division) => {
                                const active = monthlyDivision === division;
                                return (
                                    <TouchableOpacity
                                        key={division}
                                        style={[styles.compactPill, active && styles.compactPillActive]}
                                        onPress={() => setMonthlyDivision(division)}
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
                                <Text style={styles.periodValueText}>{monthlyTitle}</Text>
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

                <View style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>Quarterly Rankings</Text>

                    <View style={styles.topControlRowQuarterly}>
                        <View style={styles.categoryCompact}>
                            {(
                                ["countries", "colleges", "influencers"] as QuarterlyCategory[]
                            ).map((category) => {
                                const active = quarterlyCategory === category;
                                return (
                                    <TouchableOpacity
                                        key={category}
                                        style={[styles.compactPill, active && styles.compactPillActive]}
                                        onPress={() => setQuarterlyCategory(category)}
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
                                <Text style={styles.periodValueText}>{quarterlyTitle}</Text>
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
        paddingBottom: 36,
    },
    headerRow: {
        marginTop: 4,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerIcon: {
        color: "#F4D03F",
        fontSize: 24,
        fontWeight: "800",
        width: 30,
        textAlign: "center",
    },
    headerTitle: {
        color: "#FFFFFF",
        fontSize: 21,
        fontWeight: "900",
    },
    headerSpacer: {
        width: 30,
    },
    sectionBlock: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "900",
        marginBottom: 10,
    },
    topControlRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        gap: 8,
    },
    topControlRowQuarterly: {
        flexDirection: "column",
        marginBottom: 10,
        gap: 8,
    },
    divisionCompact: {
        flexDirection: "row",
        gap: 6,
    },
    categoryCompact: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    compactPill: {
        paddingHorizontal: 11,
        paddingVertical: 7,
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
        fontSize: 12,
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
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#121212",
        borderWidth: 1,
        borderColor: "#262626",
        alignItems: "center",
        justifyContent: "center",
    },
    arrowText: {
        color: "#F4D03F",
        fontSize: 18,
        fontWeight: "900",
        lineHeight: 18,
    },
    periodValueBox: {
        minWidth: 116,
        marginHorizontal: 6,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "#101010",
        borderWidth: 1,
        borderColor: "#1E1E1E",
        alignItems: "center",
    },
    periodValueText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
    },
    centerState: {
        paddingVertical: 18,
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
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: "#171717",
    },
    rankRow: {
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 2,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#141414",
    },
    rankNumber: {
        width: 22,
        color: "#F4D03F",
        fontSize: 13,
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
        width: 16,
        height: 12,
        borderRadius: 2,
        marginRight: 6,
        backgroundColor: "#1A1A1A",
    },
    rankName: {
        color: "#FFFFFF",
        fontSize: 11.5,
        fontWeight: "800",
        lineHeight: 14,
        flexShrink: 1,
    },
    rankMeta: {
        color: "#9B9B9B",
        fontSize: 9.5,
        fontWeight: "700",
        marginTop: 1,
        letterSpacing: 0.3,
        marginLeft: 22,
    },
    movementBadge: {
        minWidth: 42,
        paddingHorizontal: 8,
        paddingVertical: 4,
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
        fontSize: 10,
        fontWeight: "900",
    },
});