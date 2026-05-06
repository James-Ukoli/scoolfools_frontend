import React, { useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";

export default function ImpostorSetupScreen() {
    const navigation = useNavigation<any>();

    const [players, setPlayers] = useState(10);
    const [guessTimeSeconds, setGuessTimeSeconds] = useState(120);
    const [votingTimeSeconds, setVotingTimeSeconds] = useState(30);

    const popSoundRef = useRef<Audio.Sound | null>(null);
    const startSoundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        loadSounds();

        return () => {
            unloadSounds();
        };
    }, []);

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const pop = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/pop.mp3")
            );

            const start = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/amongus2.mp3")
            );

            popSoundRef.current = pop.sound;
            startSoundRef.current = start.sound;
        } catch (error) {
            console.log("Impostor setup sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await popSoundRef.current?.unloadAsync();
            await startSoundRef.current?.unloadAsync();
        } catch (error) {
            console.log("Impostor setup sound unload error:", error);
        }
    };

    const playSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Impostor setup sound play error:", error);
        }
    };

    const decreasePlayers = () => {
        playSound(popSoundRef.current);

        if (players > 3) {
            setPlayers(players - 1);
        }
    };

    const increasePlayers = () => {
        playSound(popSoundRef.current);

        if (players < 12) {
            setPlayers(players + 1);
        }
    };

    const selectGuessTime = (seconds: number) => {
        playSound(popSoundRef.current);
        setGuessTimeSeconds(seconds);
    };

    const selectVotingTime = (seconds: number) => {
        playSound(popSoundRef.current);
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

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Impostor</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Game Setup</Text>

                <Text style={styles.subtitle}>
                    Everyone gets the same chess word except one hidden impostor.
                </Text>

                <Text style={styles.sectionTitle}>Players</Text>

                <View style={styles.counterCard}>
                    <TouchableOpacity
                        style={styles.counterButton}
                        activeOpacity={0.85}
                        onPress={decreasePlayers}
                    >
                        <Ionicons name="remove" size={26} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.playerCountWrap}>
                        <Text style={styles.playerCount}>{players}</Text>
                        <Text style={styles.playerLabel}>Players</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.counterButton}
                        activeOpacity={0.85}
                        onPress={increasePlayers}
                    >
                        <Ionicons name="add" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Discussion Time</Text>

                <View style={styles.timeOptions}>
                    {[60, 120, 180, 300].map((seconds) => (
                        <TouchableOpacity
                            key={seconds}
                            style={[
                                styles.timeOption,
                                guessTimeSeconds === seconds &&
                                styles.selectedTimeOption,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => selectGuessTime(seconds)}
                        >
                            <Text
                                style={[
                                    styles.timeOptionText,
                                    guessTimeSeconds === seconds &&
                                    styles.selectedTimeOptionText,
                                ]}
                            >
                                {seconds / 60} min
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Voting Time</Text>

                <View style={styles.votingOptions}>
                    {[30, 60].map((seconds) => (
                        <TouchableOpacity
                            key={seconds}
                            style={[
                                styles.timeOption,
                                votingTimeSeconds === seconds &&
                                styles.selectedVotingOption,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => selectVotingTime(seconds)}
                        >
                            <Text
                                style={[
                                    styles.timeOptionText,
                                    votingTimeSeconds === seconds &&
                                    styles.selectedTimeOptionText,
                                ]}
                            >
                                {seconds === 30 ? "30 sec" : "1 min"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.startButton}
                    activeOpacity={0.9}
                    onPress={startGame}
                >
                    <Text style={styles.startText}>Start Game</Text>

                    <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#000000"
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
        marginBottom: 6,
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 26,
        fontWeight: "800",
        marginLeft: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    title: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "900",
        textAlign: "center",
        lineHeight: 30,
        marginBottom: 8,
    },
    subtitle: {
        color: "#AAB2C0",
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        marginBottom: 18,
    },
    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
        marginBottom: 10,
    },
    counterCard: {
        backgroundColor: "#050816",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#12203A",
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    counterButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
        alignItems: "center",
        justifyContent: "center",
    },
    playerCountWrap: {
        alignItems: "center",
    },
    playerCount: {
        color: "#FFFFFF",
        fontSize: 42,
        fontWeight: "900",
    },
    playerLabel: {
        color: "#7A8599",
        fontSize: 14,
        fontWeight: "700",
        marginTop: -2,
    },
    timeOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18,
    },
    votingOptions: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 22,
    },
    timeOption: {
        flex: 1,
        minWidth: "45%",
        height: 50,
        borderRadius: 25,
        backgroundColor: "#050816",
        borderWidth: 1,
        borderColor: "#12203A",
        alignItems: "center",
        justifyContent: "center",
    },
    selectedTimeOption: {
        backgroundColor: "#3CF2FF",
        borderColor: "#3CF2FF",
    },
    selectedVotingOption: {
        backgroundColor: "#FFD166",
        borderColor: "#FFD166",
    },
    timeOptionText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },
    selectedTimeOptionText: {
        color: "#000000",
    },
    startButton: {
        height: 54,
        borderRadius: 27,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    startText: {
        color: "#000000",
        fontSize: 17,
        fontWeight: "900",
    },
});