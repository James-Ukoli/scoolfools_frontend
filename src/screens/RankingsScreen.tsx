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
    Platform,
    Animated,
    Easing,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import { Audio } from "expo-av";
import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

type MonthlyDivision = "pro" | "women";
type QuarterlyCategory = "countries" | "colleges";
type RankingView = MonthlyDivision | QuarterlyCategory;

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
    movementType: MovementType;
    movementValue?: number;
    imageUrl?: string | null;
    metaText?: string;
    isCollege?: boolean;
};

const API_BASE =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const REFRESH_COLOR = "#2EE7FF";

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

const VIEW_OPTIONS: {
    label: string;
    value: RankingView;
    type: "monthly" | "quarterly";
}[] = [
        { label: "Pro", value: "pro", type: "monthly" },
        { label: "Women", value: "women", type: "monthly" },
        { label: "Countries", value: "countries", type: "quarterly" },
        { label: "Colleges", value: "colleges", type: "quarterly" },
    ];

function formatMonthParam(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

function getPreviousMonth(year: number, month: number) {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
}

function getNextMonth(year: number, month: number) {
    if (month === 12) return { year: year + 1, month: 1 };
    return { year, month: month + 1 };
}

function getPreviousQuarter(year: number, quarter: number) {
    if (quarter === 1) return { year: year - 1, quarter: 4 };
    return { year, quarter: quarter - 1 };
}

function getNextQuarter(year: number, quarter: number) {
    if (quarter === 4) return { year: year + 1, quarter: 1 };
    return { year, quarter: quarter + 1 };
}

function getMovementBadgeData(
    currentName: string,
    currentRank: number,
    previousList: { name: string; rank: number }[]
): { movementType: MovementType; movementValue?: number } {
    const previousItem = previousList.find((item) => item.name === currentName);
    if (!previousItem) return { movementType: "new" };

    const diff = previousItem.rank - currentRank;
    if (diff > 0) return { movementType: "up", movementValue: diff };
    if (diff < 0) return { movementType: "down", movementValue: Math.abs(diff) };

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
        FIDE: "un",
        ARM: "am",
        AZE: "az",
        ESP: "es",
        ENG: "gb-eng",
        HUN: "hu",
        ROU: "ro",
        TUR: "tr",
        IRN: "ir",
        ARG: "ar",
        BRA: "br",
    };

    return map[countryCode] ?? null;
}

function getFlagUrl(countryCode?: string) {
    if (countryCode === "FIDE") return null;

    const code = getFlagCode(countryCode);
    if (!code) return null;

    return `https://flagcdn.com/w80/${code}.png`;
}

function getViewLabel(view: RankingView) {
    return VIEW_OPTIONS.find((option) => option.value === view)?.label ?? "Pro";
}

function isMonthlyView(view: RankingView): view is MonthlyDivision {
    return view === "pro" || view === "women";
}

function getMedalNameStyle(rank: number) {
    if (rank === 1) return styles.goldName;
    if (rank === 2) return styles.silverName;
    if (rank === 3) return styles.bronzeName;
    return null;
}

function getMedalRankStyle(rank: number) {
    if (rank === 1) return styles.goldRank;
    if (rank === 2) return styles.silverRank;
    if (rank === 3) return styles.bronzeRank;
    return null;
}

function RankingIcon({ row }: { row: DisplayRow }) {
    if (row.isCollege) {
        return (
            <View style={styles.emojiIcon}>
                <Text style={styles.emojiIconText}>🎓</Text>
            </View>
        );
    }

    if (row.metaText === "FIDE") {
        return (
            <View style={styles.emojiIcon}>
                <Text style={styles.knightIconText}>♞</Text>
            </View>
        );
    }

    if (row.imageUrl) {
        return <Image source={{ uri: row.imageUrl }} style={styles.flagImage} />;
    }

    return <View style={styles.flagFallback} />;
}

function AnimatedRankRow({ row, index }: { row: DisplayRow; index: number }) {
    const flip = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        flip.setValue(0);

        Animated.timing(flip, {
            toValue: 1,
            duration: 520,
            delay: index * 65,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [flip, index, row.name]);

    const rotateX = flip.interpolate({
        inputRange: [0, 1],
        outputRange: ["82deg", "0deg"],
    });

    const translateY = flip.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });

    const opacity = flip.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <Animated.View
            style={[
                styles.rankRow,
                row.rank === 1 ? styles.goldRow : null,
                row.rank === 2 ? styles.silverRow : null,
                row.rank === 3 ? styles.bronzeRow : null,
                {
                    opacity,
                    transform: [{ perspective: 900 }, { rotateX }, { translateY }],
                },
            ]}
        >
            <Text style={[styles.rankNumber, getMedalRankStyle(row.rank)]}>
                {row.rank}
            </Text>

            <View style={styles.rankMain}>
                <View style={styles.nameLine}>
                    <RankingIcon row={row} />

                    <View style={styles.nameStack}>
                        <Text
                            style={[
                                styles.rankName,
                                row.isCollege ? styles.collegeName : null,
                                getMedalNameStyle(row.rank),
                            ]}
                            numberOfLines={row.isCollege ? 2 : 1}
                        >
                            {row.name}
                        </Text>

                        {!!row.metaText && !row.isCollege && (
                            <Text style={styles.rankMeta} numberOfLines={1}>
                                {row.metaText}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            <View
                style={[
                    styles.movementBadge,
                    row.movementType === "up" ? styles.movementUp : null,
                    row.movementType === "down" ? styles.movementDown : null,
                    row.movementType === "same" ? styles.movementSame : null,
                    row.movementType === "new" ? styles.movementNew : null,
                ]}
            >
                <Text style={styles.movementText}>
                    {getMovementText(row.movementType, row.movementValue)}
                </Text>
            </View>
        </Animated.View>
    );
}

export default function PowerRankingsScreen() {
    const scrollRef = useRef<ScrollView>(null);

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

    const [selectedView, setSelectedView] = useState<RankingView>("pro");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);

    const [monthlyYear, setMonthlyYear] = useState(currentYear);
    const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);

    const [quarterlyYear, setQuarterlyYear] = useState(currentYear);
    const [quarterlyQuarter, setQuarterlyQuarter] = useState(currentQuarter);

    const [rows, setRows] = useState<DisplayRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const swooshSoundRef = useRef<Audio.Sound | null>(null);
    const [soundReady, setSoundReady] = useState(false);

    const heroGlow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(heroGlow, {
                    toValue: 1,
                    duration: 1800,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: false,
                }),
                Animated.timing(heroGlow, {
                    toValue: 0,
                    duration: 1800,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, [heroGlow]);

    useEffect(() => {
        let mounted = true;

        const loadSound = async () => {
            const { sound } = await Audio.Sound.createAsync(
                require("../../assets/sounds/swoosh.mp3")
            );

            if (mounted) {
                swooshSoundRef.current = sound;
                setSoundReady(true);
            }
        };

        loadSound();

        return () => {
            mounted = false;
            swooshSoundRef.current?.unloadAsync();
        };
    }, []);

    const playSwoosh = async () => {
        try {
            const sound = swooshSoundRef.current;
            if (!sound) return;

            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch {
            // ignore sound errors
        }
    };

    const periodTitle = useMemo(() => {
        if (isMonthlyView(selectedView)) {
            const monthLabel =
                MONTH_OPTIONS.find((month) => month.value === monthlyMonth)?.label ?? "";
            return `${monthLabel} ${monthlyYear}`;
        }

        return `Q${quarterlyQuarter} ${quarterlyYear}`;
    }, [selectedView, monthlyMonth, monthlyYear, quarterlyQuarter, quarterlyYear]);

    const fetchMonthly = useCallback(
        async (division: MonthlyDivision) => {
            const currentMonthParam = formatMonthParam(monthlyYear, monthlyMonth);
            const prev = getPreviousMonth(monthlyYear, monthlyMonth);
            const previousMonthParam = formatMonthParam(prev.year, prev.month);

            const currentUrl = `${API_BASE}/api/power-rankings/month/${currentMonthParam}?division=${division}`;
            const previousUrl = `${API_BASE}/api/power-rankings/month/${previousMonthParam}?division=${division}`;

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

            return currentItems.map((item) => {
                const movement = getMovementBadgeData(
                    item.player_name,
                    item.rank,
                    previousList
                );

                return {
                    rank: item.rank,
                    name: item.player_name,
                    movementType: movement.movementType,
                    movementValue: movement.movementValue,
                    imageUrl: getFlagUrl(item.country_code),
                    metaText: item.country_code,
                    isCollege: false,
                };
            });
        },
        [monthlyYear, monthlyMonth]
    );

    const fetchQuarterly = useCallback(
        async (category: QuarterlyCategory) => {
            const res = await fetch(`${API_BASE}/api/power-rankings/quarterly`);
            const json: QuarterlyRankingResponse = await res.json();
            const allItems = json?.items ?? [];

            const selected = allItems.find(
                (item) =>
                    item.category === category &&
                    item.year === quarterlyYear &&
                    item.quarter === quarterlyQuarter
            );

            const prev = getPreviousQuarter(quarterlyYear, quarterlyQuarter);

            const previous = allItems.find(
                (item) =>
                    item.category === category &&
                    item.year === prev.year &&
                    item.quarter === prev.quarter
            );

            const currentEntries = selected?.entries ?? [];
            const previousEntries = previous?.entries ?? [];

            const previousList = previousEntries.map((entry) => ({
                name: entry.name,
                rank: entry.rank,
            }));

            return currentEntries.map((entry) => {
                const movement = getMovementBadgeData(entry.name, entry.rank, previousList);

                return {
                    rank: entry.rank,
                    name: entry.name,
                    movementType: movement.movementType,
                    movementValue: movement.movementValue,
                    imageUrl: getFlagUrl(entry.meta?.country_code),
                    metaText: entry.meta?.country_code,
                    isCollege: category === "colleges",
                };
            });
        },
        [quarterlyYear, quarterlyQuarter]
    );

    const fetchRankings = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            let nextRows: DisplayRow[] = [];

            if (isMonthlyView(selectedView)) {
                nextRows = await fetchMonthly(selectedView);
            } else {
                nextRows = await fetchQuarterly(selectedView);
            }

            setRows(nextRows);
        } catch {
            setRows([]);
            setError("Could not load rankings.");
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [selectedView, fetchMonthly, fetchQuarterly]);

    useEffect(() => {
        fetchRankings();
    }, [fetchRankings]);

    useEffect(() => {
        if (!soundReady) return;

        playSwoosh();
    }, [soundReady]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchRankings();
            await new Promise((resolve) => setTimeout(resolve, 500));
        } finally {
            setRefreshing(false);
        }
    }, [fetchRankings]);

    const onScroll = (_e: NativeSyntheticEvent<NativeScrollEvent>) => { };

    const goBack = async () => {
        await playSwoosh();

        if (isMonthlyView(selectedView)) {
            const prev = getPreviousMonth(monthlyYear, monthlyMonth);
            setMonthlyYear(prev.year);
            setMonthlyMonth(prev.month);
            return;
        }

        const prev = getPreviousQuarter(quarterlyYear, quarterlyQuarter);
        setQuarterlyYear(prev.year);
        setQuarterlyQuarter(prev.quarter);
    };

    const goForward = async () => {
        await playSwoosh();

        if (isMonthlyView(selectedView)) {
            const next = getNextMonth(monthlyYear, monthlyMonth);
            setMonthlyYear(next.year);
            setMonthlyMonth(next.month);
            return;
        }

        const next = getNextQuarter(quarterlyYear, quarterlyQuarter);
        setQuarterlyYear(next.year);
        setQuarterlyQuarter(next.quarter);
    };

    const renderRows = () => {
        if (loading) {
            return (
                <View style={styles.centerState}>
                    <ActivityIndicator size="small" color={REFRESH_COLOR} />
                    <Text style={styles.stateText}>Loading rankings...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centerState}>
                    <Text style={styles.errorText}>{error}</Text>
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
                {rows.map((row, index) => (
                    <AnimatedRankRow
                        key={`${selectedView}-${periodTitle}-${row.rank}-${row.name}`}
                        row={row}
                        index={index}
                    />
                ))}
            </View>
        );
    };

    const animatedHeroBorder = heroGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(46,231,255,0.22)", "rgba(244,208,63,0.4)"],
    });

    const animatedHeroShadow = heroGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ["#2EE7FF", "#F4D03F"],
    });

    if (initialLoading || !fontsLoaded) {
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
                <Animated.View
                    style={[
                        styles.hero,
                        {
                            borderColor: animatedHeroBorder,
                            shadowColor: animatedHeroShadow,
                        },
                    ]}
                >
                    <Text style={styles.heroEyebrow}>JUST MOVE</Text>
                    <Text style={styles.headerTitle}>POWER RANKINGS</Text>
                    <Text style={styles.heroSubtitle}>
                        {getViewLabel(selectedView)} • {periodTitle}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.infoButton}
                        onPress={() => setInfoOpen(true)}
                    >
                        <Text style={styles.infoButtonText}>i</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.controlsRow}>
                    <View style={styles.dropdownWrap}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.dropdownButton}
                            onPress={() => setDropdownOpen((prev) => !prev)}
                        >
                            <Text style={styles.dropdownValue}>
                                {getViewLabel(selectedView)}
                            </Text>

                            <Text style={styles.dropdownArrow}>
                                {dropdownOpen ? "⌃" : "⌄"}
                            </Text>
                        </TouchableOpacity>

                        {dropdownOpen && (
                            <View style={styles.dropdownMenu}>
                                {VIEW_OPTIONS.map((option) => {
                                    const active = selectedView === option.value;

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.dropdownItem,
                                                active ? styles.dropdownItemActive : null,
                                            ]}
                                            onPress={async () => {
                                                await playSwoosh();

                                                setSelectedView(option.value);
                                                setDropdownOpen(false);
                                                scrollRef.current?.scrollTo({ y: 0, animated: true });
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.dropdownItemText,
                                                    active ? styles.dropdownItemTextActive : null,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    <View style={styles.periodControl}>
                        <TouchableOpacity style={styles.arrowButton} onPress={goBack}>
                            <Text style={styles.arrowText}>‹</Text>
                        </TouchableOpacity>

                        <View style={styles.periodValueBox}>
                            <Text style={styles.periodValueText}>{periodTitle}</Text>
                        </View>

                        <TouchableOpacity style={styles.arrowButton} onPress={goForward}>
                            <Text style={styles.arrowText}>›</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {renderRows()}
            </ScrollView>

            <Modal visible={infoOpen} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>What are Power Rankings?</Text>

                        <Text style={styles.modalText}>
                            Just Move Power Rankings are based mainly on recent classical chess performance,
                            player or team activity, strength of opposition, consistency, and current form.
                            While classical chess carries the most weight in our rankings, strong performances
                            in rapid, blitz, and Fischer Random tournaments can also influence movement depending
                            on the strength and importance of the event. Rankings are designed to reflect who is
                            performing at the highest level right now across the competitive chess landscape.
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.modalCloseButton}
                            onPress={() => setInfoOpen(false)}
                        >
                            <Text style={styles.modalCloseText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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

    hero: {
        marginTop: 10,
        marginBottom: 14,
        minHeight: 112,
        borderRadius: 26,
        backgroundColor: "#070A10",
        borderWidth: 1.2,
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0.24,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        paddingHorizontal: 18,
        overflow: "hidden",
    },

    heroEyebrow: {
        color: "#2EE7FF",
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 2.2,
        marginBottom: 1,
    },

    headerTitle: {
        color: "#FFFFFF",
        fontSize: 30,
        fontFamily: "Rajdhani_700Bold",
        textAlign: "center",
        letterSpacing: 1.1,
        textShadowColor: "rgba(46,231,255,0.45)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
    },

    heroSubtitle: {
        color: "#F4D03F",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.5,
        marginTop: 2,
    },

    infoButton: {
        position: "absolute",
        right: 14,
        top: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#101827",
        borderWidth: 1,
        borderColor: "#2EE7FF",
        alignItems: "center",
        justifyContent: "center",
    },

    infoButtonText: {
        color: "#2EE7FF",
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
        fontStyle: "italic",
    },

    controlsRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 8,
        marginBottom: 12,
        zIndex: 30,
    },

    dropdownWrap: {
        flex: 0.9,
        position: "relative",
        zIndex: 40,
    },

    dropdownButton: {
        minHeight: 54,
        borderRadius: 18,
        backgroundColor: "#090D14",
        borderWidth: 1,
        borderColor: "rgba(46,231,255,0.18)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    dropdownValue: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
    },

    dropdownArrow: {
        color: "#F4D03F",
        fontSize: 22,
        fontFamily: "Rajdhani_700Bold",
    },

    dropdownMenu: {
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        borderRadius: 18,
        backgroundColor: "#0B0F17",
        borderWidth: 1,
        borderColor: "#263241",
        overflow: "hidden",
        zIndex: 50,
    },

    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#171D28",
    },

    dropdownItemActive: {
        backgroundColor: "rgba(46,231,255,0.13)",
    },

    dropdownItemText: {
        color: "#E5E7EB",
        fontSize: 16,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },

    dropdownItemTextActive: {
        color: "#2EE7FF",
    },

    periodControl: {
        flex: 1.15,
        minHeight: 54,
        borderRadius: 18,
        backgroundColor: "#090D14",
        borderWidth: 1,
        borderColor: "rgba(244,208,63,0.18)",
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    arrowButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#141414",
        borderWidth: 1,
        borderColor: "#2A2A2A",
        alignItems: "center",
        justifyContent: "center",
    },

    arrowText: {
        color: "#F4D03F",
        fontSize: 25,
        fontFamily: "Rajdhani_700Bold",
        lineHeight: 27,
    },

    periodValueBox: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },

    periodValueText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
    },

    centerState: {
        paddingVertical: 24,
        alignItems: "center",
    },

    stateText: {
        color: "#CFCFCF",
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginTop: 8,
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        textAlign: "center",
    },

    rankingsCard: {
        backgroundColor: "#070707",
        borderRadius: 22,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: "#1E1E1E",
        overflow: "hidden",
    },

    rankRow: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 4,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: "#171717",
    },

    goldRow: {
        backgroundColor: "rgba(244,208,63,0.055)",
    },

    silverRow: {
        backgroundColor: "rgba(209,213,219,0.05)",
    },

    bronzeRow: {
        backgroundColor: "rgba(205,127,50,0.055)",
    },

    rankNumber: {
        width: 32,
        color: "#ffffff",
        fontSize: 20,
        fontFamily: "Rajdhani_700Bold",
        marginRight: 7,
        textAlign: "center",
    },

    goldRank: {
        color: "#F8D84A",
        textShadowColor: "#F8D84A",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },

    silverRank: {
        color: "#E5E7EB",
        textShadowColor: "#E5E7EB",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },

    bronzeRank: {
        color: "#D99A56",
        textShadowColor: "#CD7F32",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
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
        width: 26,
        height: 26,
        borderRadius: 13,
        marginRight: 9,
        backgroundColor: "#1A1A1A",
        borderWidth: 1,
        borderColor: "#2A2A2A",
    },

    flagFallback: {
        width: 26,
        height: 26,
        borderRadius: 13,
        marginRight: 9,
        backgroundColor: "#151515",
        borderWidth: 1,
        borderColor: "#2A2A2A",
    },

    emojiIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        marginRight: 9,
        backgroundColor: "#151515",
        borderWidth: 1,
        borderColor: "#2A2A2A",
        alignItems: "center",
        justifyContent: "center",
    },

    emojiIconText: {
        fontSize: 15,
    },

    knightIconText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
    },

    nameStack: {
        flex: 1,
    },

    rankName: {
        color: "#FFFFFF",
        fontSize: 17,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.25,
        lineHeight: 19,
        flexShrink: 1,
    },

    collegeName: {
        fontSize: 15.5,
        lineHeight: 18,
    },

    goldName: {
        color: "#F8D84A",
        textShadowColor: "#F8D84A",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },

    silverName: {
        color: "#E5E7EB",
        textShadowColor: "#E5E7EB",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },

    bronzeName: {
        color: "#D99A56",
        textShadowColor: "#CD7F32",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },

    rankMeta: {
        color: "#9B9B9B",
        fontSize: 11.5,
        fontFamily: "Rajdhani_700Bold",
        marginTop: 1,
        letterSpacing: 0.5,
    },

    movementBadge: {
        minWidth: 44,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
    },

    movementUp: {
        backgroundColor: "rgba(46,231,165,0.13)",
        borderColor: "#2EE7A5",
    },

    movementDown: {
        backgroundColor: "rgba(255,92,92,0.13)",
        borderColor: "#FF5C5C",
    },

    movementSame: {
        backgroundColor: "rgba(156,163,175,0.12)",
        borderColor: "#9CA3AF",
    },

    movementNew: {
        backgroundColor: "rgba(46,231,255,0.13)",
        borderColor: "#2EE7FF",
    },

    movementText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.72)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
    },

    modalCard: {
        width: "100%",
        borderRadius: 24,
        backgroundColor: "#080B12",
        borderWidth: 1,
        borderColor: "#2EE7FF",
        padding: 20,
    },

    modalTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginBottom: 10,
    },

    modalText: {
        color: "#D1D5DB",
        fontSize: 13.5,
        fontWeight: "700",
        lineHeight: 21,
    },

    modalCloseButton: {
        marginTop: 18,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#2EE7FF",
        alignItems: "center",
        justifyContent: "center",
    },

    modalCloseText: {
        color: "#041014",
        fontSize: 16,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },
});