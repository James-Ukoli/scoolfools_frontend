import React, { useEffect, useRef, useState } from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Rajdhani_700Bold,
    useFonts,
} from "@expo-google-fonts/rajdhani";

import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";

const THEME_MODE = "night" as const;

export default function ImpostorSetupScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const bottomSafePadding =
        Platform.OS === "android"
            ? Math.max(insets.bottom + 50, 80)
            : insets.bottom + 34;

    const [players, setPlayers] = useState(10);
    const [guessTimeSeconds, setGuessTimeSeconds] = useState(120);
    const [votingTimeSeconds, setVotingTimeSeconds] = useState(30);

    const popSoundRef = useRef<Audio.Sound | null>(null);
    const startSoundRef = useRef<Audio.Sound | null>(null);

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

            const pop = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/pop.mp3"),
            );

            const start = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/amongus2.mp3"),
            );

            popSoundRef.current = pop.sound;
            startSoundRef.current = start.sound;
        } catch (error) {
            console.log("Impostor setup sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await popSoundRef.current?.stopAsync().catch(() => { });
            await startSoundRef.current?.stopAsync().catch(() => { });

            await popSoundRef.current?.unloadAsync().catch(() => { });
            await startSoundRef.current?.unloadAsync().catch(() => { });

            popSoundRef.current = null;
            startSoundRef.current = null;
        } catch (error) {
            console.log("Impostor setup sound unload error:", error);
        }
    };

    const playSound = async (sound: Audio.Sound | null) => {
        if (!sound) {
            return;
        }

        try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Impostor setup sound play error:", error);
        }
    };

    const decreasePlayers = () => {
        void playSound(popSoundRef.current);

        setPlayers((currentPlayers) =>
            Math.max(3, currentPlayers - 1),
        );
    };

    const increasePlayers = () => {
        void playSound(popSoundRef.current);

        setPlayers((currentPlayers) =>
            Math.min(12, currentPlayers + 1),
        );
    };

    const selectGuessTime = (seconds: number) => {
        void playSound(popSoundRef.current);
        setGuessTimeSeconds(seconds);
    };

    const selectVotingTime = (seconds: number) => {
        void playSound(popSoundRef.current);
        setVotingTimeSeconds(seconds);
    };

    const startGame = async () => {
        await playSound(startSoundRef.current);

        navigation.navigate("ImpostorReveal", {
            players,
            guessTimeSeconds,
            votingTimeSeconds,
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
                    <Text style={styles.screenTitle}>Impostor</Text>
                </View>

                <View style={styles.headerIcon}>
                    <Ionicons
                        name="eye-outline"
                        size={22}
                        color="#FF3B30"
                    />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingBottom: bottomSafePadding,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={30}
                            color="#FF3B30"
                        />
                    </View>

                    <View style={styles.heroCopy}>
                        <Text style={styles.title}>Game Setup</Text>

                        <Text style={styles.subtitle}>
                            Everyone receives the same secret word except one
                            hidden impostor. Ask questions, discuss, and find
                            the suspicious player.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons
                            name="people-outline"
                            size={19}
                            color="#FF3B30"
                        />

                        <Text style={styles.sectionTitle}>Players</Text>
                    </View>

                    <View style={styles.counterCard}>
                        <TouchableOpacity
                            style={styles.counterButton}
                            activeOpacity={0.85}
                            onPress={decreasePlayers}
                        >
                            <Ionicons
                                name="remove"
                                size={27}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>

                        <View style={styles.playerCountWrap}>
                            <Text style={styles.playerCount}>
                                {players}
                            </Text>

                            <Text style={styles.playerLabel}>
                                PLAYERS
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.counterButton}
                            activeOpacity={0.85}
                            onPress={increasePlayers}
                        >
                            <Ionicons
                                name="add"
                                size={27}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons
                            name="chatbubbles-outline"
                            size={19}
                            color="#FF6B6B"
                        />

                        <Text style={styles.sectionTitle}>
                            Discussion Time
                        </Text>
                    </View>

                    <View style={styles.timeOptions}>
                        {[60, 120, 180, 300].map((seconds) => {
                            const selected =
                                guessTimeSeconds === seconds;

                            return (
                                <TouchableOpacity
                                    key={seconds}
                                    style={[
                                        styles.timeOption,
                                        selected &&
                                        styles.selectedDiscussionOption,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        selectGuessTime(seconds)
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.timeOptionText,
                                            selected &&
                                            styles.selectedTimeOptionText,
                                        ]}
                                    >
                                        {seconds / 60} min
                                    </Text>

                                    {selected && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={18}
                                            color="#210403"
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
                            name="finger-print-outline"
                            size={19}
                            color="#F97316"
                        />

                        <Text style={styles.sectionTitle}>
                            Voting Time
                        </Text>
                    </View>

                    <View style={styles.votingOptions}>
                        {[30, 60].map((seconds) => {
                            const selected =
                                votingTimeSeconds === seconds;

                            return (
                                <TouchableOpacity
                                    key={seconds}
                                    style={[
                                        styles.timeOption,
                                        selected &&
                                        styles.selectedVotingOption,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        selectVotingTime(seconds)
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.timeOptionText,
                                            selected &&
                                            styles.selectedTimeOptionText,
                                        ]}
                                    >
                                        {seconds === 30
                                            ? "30 sec"
                                            : "1 min"}
                                    </Text>

                                    {selected && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={18}
                                            color="#240B02"
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>PLAYERS</Text>
                        <Text style={styles.summaryValue}>{players}</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>DISCUSSION</Text>
                        <Text style={styles.summaryValue}>
                            {guessTimeSeconds / 60}m
                        </Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>VOTING</Text>
                        <Text style={styles.summaryValue}>
                            {votingTimeSeconds}s
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
                            color="#210403"
                        />
                    </View>

                    <Text style={styles.startText}>
                        Start Impostor
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={21}
                        color="#210403"
                    />
                </TouchableOpacity>
            </ScrollView>
        </GameScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },

    headerCopy: {
        flex: 1,
        marginLeft: 14,
    },

    eyebrow: {
        color: "#FF3B30",
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

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(255,59,48,0.09)",

        borderWidth: 1,
        borderColor: "rgba(255,59,48,0.34)",
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        flexGrow: 1,
        paddingTop: 10,
    },

    heroCard: {
        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#0D0708",

        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,59,48,0.25)",

        paddingHorizontal: 15,
        paddingVertical: 15,

        marginBottom: 22,
    },

    heroIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(255,59,48,0.10)",

        borderWidth: 1,
        borderColor: "rgba(255,59,48,0.35)",

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
        marginBottom: 21,
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

    counterCard: {
        minHeight: 98,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        backgroundColor: "#070B14",

        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255,59,48,0.22)",

        paddingHorizontal: 16,
        paddingVertical: 14,
    },

    counterButton: {
        width: 50,
        height: 50,
        borderRadius: 17,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#0B1220",

        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.11)",
    },

    playerCountWrap: {
        alignItems: "center",
    },

    playerCount: {
        color: "#FFFFFF",

        fontSize: 43,
        lineHeight: 45,

        fontFamily: "Rajdhani_700Bold",
    },

    playerLabel: {
        color: "#94A3B8",

        fontSize: 10.5,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.3,

        marginTop: -1,
    },

    timeOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },

    votingOptions: {
        flexDirection: "row",
        gap: 10,
    },

    timeOption: {
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

    selectedDiscussionOption: {
        backgroundColor: "#FF6B6B",
        borderColor: "#FF6B6B",

        shadowColor: "#FF6B6B",
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    selectedVotingOption: {
        backgroundColor: "#F97316",
        borderColor: "#F97316",

        shadowColor: "#F97316",
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    timeOptionText: {
        color: "#FFFFFF",

        fontSize: 15,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },

    selectedTimeOptionText: {
        color: "#210403",
    },

    summaryCard: {
        width: "100%",
        height: 72,

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
        height: 36,
        backgroundColor: "rgba(255,255,255,0.10)",
    },

    summaryLabel: {
        color: "#94A3B8",

        fontSize: 9.5,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.1,

        marginBottom: 2,
    },

    summaryValue: {
        color: "#FFFFFF",

        fontSize: 19,

        fontFamily: "Rajdhani_700Bold",
    },

    startButton: {
        width: "100%",
        height: 58,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#FF3B30",

        borderRadius: 19,

        paddingHorizontal: 15,

        shadowColor: "#FF3B30",
        shadowOpacity: 0.26,
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

        backgroundColor: "rgba(33,4,3,0.13)",

        marginRight: 9,
    },

    startText: {
        flex: 1,

        color: "#210403",

        fontSize: 18,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,

        textAlign: "center",
    },
});