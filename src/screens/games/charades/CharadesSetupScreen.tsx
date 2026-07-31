import React, { useEffect, useRef, useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Rajdhani_700Bold,
    useFonts,
} from "@expo-google-fonts/rajdhani";

import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";

const THEME_MODE = "night" as const;

export default function CharadesSetupScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const [roundTimeSeconds, setRoundTimeSeconds] = useState(60);
    const [totalRounds, setTotalRounds] = useState(5);

    const popSoundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        void loadSounds();

        return () => {
            void unloadSounds();
        };
    }, []);

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const popSound = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/pop.mp3"),
            );

            popSoundRef.current = popSound.sound;
        } catch (error) {
            console.log("Charades setup sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await popSoundRef.current?.stopAsync().catch(() => { });
            await popSoundRef.current?.unloadAsync().catch(() => { });

            popSoundRef.current = null;
        } catch (error) {
            console.log("Charades setup unload error:", error);
        }
    };

    const playPop = async () => {
        try {
            if (!popSoundRef.current) {
                return;
            }

            await popSoundRef.current.setPositionAsync(0);
            await popSoundRef.current.playAsync();
        } catch (error) {
            console.log("Charades setup play error:", error);
        }
    };

    const handleRoundTimePress = async (seconds: number) => {
        await playPop();
        setRoundTimeSeconds(seconds);
    };

    const handleRoundsPress = async (numberOfRounds: number) => {
        await playPop();
        setTotalRounds(numberOfRounds);
    };

    const startGame = async () => {
        await playPop();

        navigation.navigate("CharadesPlay", {
            roundTimeSeconds,
            totalRounds,
            teamOneScore: 0,
            teamTwoScore: 0,
            currentTeam: 1,
            round: 1,
        });
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GameScreenWrapper themeMode={THEME_MODE}>
            <View style={styles.topRow}>
                <GameBackButton themeMode={THEME_MODE} />

                <View style={styles.headerCopy}>
                    <Text style={styles.eyebrow}>PARTY GAMES</Text>
                    <Text style={styles.screenTitle}>Charades</Text>
                </View>

                <View style={styles.headerIcon}>
                    <Ionicons
                        name="body-outline"
                        size={22}
                        color="#22D3EE"
                    />
                </View>
            </View>

            <View
                style={[
                    styles.center,
                    {
                        paddingBottom:
                            Platform.OS === "android"
                                ? Math.max(insets.bottom + 70, 90)
                                : insets.bottom + 50,
                    },
                ]}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Ionicons
                            name="people"
                            size={29}
                            color="#22D3EE"
                        />
                    </View>

                    <View style={styles.heroCopy}>
                        <Text style={styles.title}>Game Setup</Text>

                        <Text style={styles.subtitle}>
                            Act out student life, school moments, and funny
                            situations while your team tries to guess.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons
                            name="timer-outline"
                            size={19}
                            color="#22D3EE"
                        />

                        <Text style={styles.sectionTitle}>
                            Round Time
                        </Text>
                    </View>

                    <View style={styles.optionGrid}>
                        {[30, 60, 90, 120].map((seconds) => {
                            const selected =
                                roundTimeSeconds === seconds;

                            return (
                                <TouchableOpacity
                                    key={seconds}
                                    style={[
                                        styles.optionButton,
                                        selected &&
                                        styles.selectedOption,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        handleRoundTimePress(seconds)
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selected &&
                                            styles.selectedOptionText,
                                        ]}
                                    >
                                        {seconds < 60
                                            ? `${seconds}s`
                                            : `${seconds / 60} min`}
                                    </Text>

                                    {selected && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={18}
                                            color="#03131A"
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons
                            name="layers-outline"
                            size={19}
                            color="#C084FC"
                        />

                        <Text style={styles.sectionTitle}>
                            Total Rounds
                        </Text>
                    </View>

                    <View style={styles.optionGrid}>
                        {[3, 5, 7].map((numberOfRounds) => {
                            const selected =
                                totalRounds === numberOfRounds;

                            return (
                                <TouchableOpacity
                                    key={numberOfRounds}
                                    style={[
                                        styles.optionButton,
                                        selected &&
                                        styles.selectedRoundsOption,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        handleRoundsPress(
                                            numberOfRounds,
                                        )
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selected &&
                                            styles.selectedOptionText,
                                        ]}
                                    >
                                        {numberOfRounds} Rounds
                                    </Text>

                                    {selected && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={18}
                                            color="#13051B"
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>
                            ROUND TIME
                        </Text>

                        <Text style={styles.summaryValue}>
                            {roundTimeSeconds < 60
                                ? `${roundTimeSeconds}s`
                                : `${roundTimeSeconds / 60} min`}
                        </Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>
                            ROUNDS
                        </Text>

                        <Text style={styles.summaryValue}>
                            {totalRounds}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.startButton}
                    activeOpacity={0.9}
                    onPress={startGame}
                >
                    <View style={styles.startIcon}>
                        <Ionicons
                            name="play"
                            size={19}
                            color="#03131A"
                        />
                    </View>

                    <Text style={styles.startText}>
                        Start Charades
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={21}
                        color="#03131A"
                    />
                </TouchableOpacity>
            </View>
        </GameScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },

    headerCopy: {
        flex: 1,
        marginLeft: 14,
    },

    eyebrow: {
        color: "#22D3EE",
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.8,
    },

    screenTitle: {
        color: "#FFFFFF",
        fontSize: 28,
        lineHeight: 30,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        marginTop: -2,
    },

    headerIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "rgba(34,211,238,0.08)",
        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.30)",
        alignItems: "center",
        justifyContent: "center",
    },

    center: {
        flex: 1,
        justifyContent: "center",
    },

    heroCard: {
        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#070B14",

        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.22)",

        paddingHorizontal: 15,
        paddingVertical: 15,

        marginBottom: 24,
    },

    heroIcon: {
        width: 55,
        height: 55,
        borderRadius: 18,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(34,211,238,0.10)",

        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.34)",

        marginRight: 13,
    },

    heroCopy: {
        flex: 1,
    },

    title: {
        color: "#FFFFFF",

        fontSize: 24,
        lineHeight: 26,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,

        marginBottom: 4,
    },

    subtitle: {
        color: "#CBD5E1",

        fontSize: 13,
        lineHeight: 18,
    },

    section: {
        marginBottom: 22,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",

        marginBottom: 11,
    },

    sectionTitle: {
        color: "#FFFFFF",

        fontSize: 18,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,

        marginLeft: 7,
    },

    optionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },

    optionButton: {
        flex: 1,
        minWidth: "45%",
        height: 53,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,

        backgroundColor: "#070B14",

        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        borderRadius: 17,
    },

    selectedOption: {
        backgroundColor: "#22D3EE",
        borderColor: "#22D3EE",

        shadowColor: "#22D3EE",
        shadowOpacity: 0.24,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    selectedRoundsOption: {
        backgroundColor: "#C084FC",
        borderColor: "#C084FC",

        shadowColor: "#C084FC",
        shadowOpacity: 0.24,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    optionText: {
        color: "#FFFFFF",

        fontSize: 15,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },

    selectedOptionText: {
        color: "#03131A",
    },

    summaryCard: {
        width: "100%",
        height: 70,

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#070B14",

        borderRadius: 19,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.09)",

        marginBottom: 17,
    },

    summaryItem: {
        flex: 1,
        alignItems: "center",
    },

    summaryDivider: {
        width: 1,
        height: 35,
        backgroundColor: "rgba(255,255,255,0.10)",
    },

    summaryLabel: {
        color: "#94A3B8",

        fontSize: 10,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.2,

        marginBottom: 2,
    },

    summaryValue: {
        color: "#FFFFFF",

        fontSize: 20,

        fontFamily: "Rajdhani_700Bold",
    },

    startButton: {
        width: "100%",
        height: 59,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#22D3EE",

        borderRadius: 19,

        paddingHorizontal: 15,

        shadowColor: "#22D3EE",
        shadowOpacity: 0.25,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 6,
    },

    startIcon: {
        width: 31,
        height: 31,
        borderRadius: 15.5,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(3,19,26,0.12)",

        marginRight: 9,
    },

    startText: {
        flex: 1,

        color: "#03131A",

        fontSize: 18,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,

        textAlign: "center",
    },
});