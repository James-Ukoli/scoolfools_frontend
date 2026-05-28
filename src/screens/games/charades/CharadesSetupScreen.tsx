import React, { useEffect, useRef, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";

export default function CharadesSetupScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [roundTimeSeconds, setRoundTimeSeconds] = useState(60);
    const [totalRounds, setTotalRounds] = useState(5);

    const popSoundRef = useRef<Audio.Sound | null>(null);

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

            const popSound = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/pop.mp3")
            );

            popSoundRef.current = popSound.sound;
        } catch (error) {
            console.log("Charades setup sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await popSoundRef.current?.unloadAsync();
        } catch (error) {
            console.log("Charades setup unload error:", error);
        }
    };

    const playPop = async () => {
        try {
            if (!popSoundRef.current) return;

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

    const handleRoundsPress = async (num: number) => {
        await playPop();
        setTotalRounds(num);
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

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Charades</Text>
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
                <Text style={styles.title}>Game Setup</Text>

                <Text style={styles.subtitle}>
                    Act out the chess word. Your team guesses before time runs out.
                </Text>

                <Text style={styles.sectionTitle}>Round Time</Text>

                <View style={styles.optionGrid}>
                    {[30, 60, 90, 120].map((seconds) => (
                        <TouchableOpacity
                            key={seconds}
                            style={[
                                styles.optionButton,
                                roundTimeSeconds === seconds &&
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
                                    roundTimeSeconds === seconds &&
                                    styles.selectedOptionText,
                                ]}
                            >
                                {seconds < 60
                                    ? `${seconds}s`
                                    : `${seconds / 60} min`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Total Rounds</Text>

                <View style={styles.optionGrid}>
                    {[3, 5, 7].map((num) => (
                        <TouchableOpacity
                            key={num}
                            style={[
                                styles.optionButton,
                                totalRounds === num &&
                                styles.selectedOption,
                            ]}
                            activeOpacity={0.85}
                            onPress={() =>
                                handleRoundsPress(num)
                            }
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    totalRounds === num &&
                                    styles.selectedOptionText,
                                ]}
                            >
                                {num} Rounds
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

    screenTitle: {
        color: "#FFFFFF",
        fontSize: 26,
        fontWeight: "800",
        marginLeft: 14,
    },

    center: {
        flex: 1,
        justifyContent: "center",
    },

    title: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 10,
    },

    subtitle: {
        color: "#AAB2C0",
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: 28,
    },

    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "900",
        marginBottom: 12,
    },

    optionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 28,
    },

    optionButton: {
        flex: 1,
        minWidth: "45%",
        height: 52,
        borderRadius: 26,
        backgroundColor: "#050816",
        borderWidth: 1,
        borderColor: "#12203A",
        alignItems: "center",
        justifyContent: "center",
    },

    selectedOption: {
        backgroundColor: "#FFD166",
        borderColor: "#FFD166",
    },

    optionText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },

    selectedOptionText: {
        color: "#000000",
    },

    startButton: {
        height: 58,
        borderRadius: 29,
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