import React, { useEffect, useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { impostorWords } from "../../../../assets/data/impostor";

type RouteParams = {
    ImpostorReveal: {
        players: number;
        guessTimeSeconds: number;
    };
};

export default function ImpostorRevealScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, "ImpostorReveal">>();

    const players = route.params?.players || 4;
    const guessTimeSeconds = route.params?.guessTimeSeconds || 120;

    // ✅ FIX: Use useState so it ONLY runs once
    const [game] = useState(() => {
        const impostorIndex = Math.floor(Math.random() * players);
        const wordIndex = Math.floor(Math.random() * impostorWords.length);
        const word = impostorWords[wordIndex];

        return {
            impostorIndex,
            word,
        };
    });

    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [revealed, setRevealed] = useState(false);
    const [discussionStarted, setDiscussionStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(guessTimeSeconds);
    const [timerRunning, setTimerRunning] = useState(false);

    const isImpostor = currentPlayer - 1 === game.impostorIndex;

    useEffect(() => {
        if (!timerRunning || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setTimerRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timerRunning, timeLeft]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    };

    const handleNext = () => {
        if (currentPlayer >= players) {
            setDiscussionStarted(true);
            setTimerRunning(true);
            return;
        }

        setRevealed(false);
        setCurrentPlayer((prev) => prev + 1);
    };

    const toggleTimer = () => {
        if (timeLeft > 0) {
            setTimerRunning((prev) => !prev);
        }
    };

    const resetTimer = () => {
        setTimerRunning(false);
        setTimeLeft(guessTimeSeconds);
    };

    const playAgain = () => {
        navigation.replace("ImpostorSetup");
    };

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Impostor</Text>
            </View>

            {!discussionStarted ? (
                <View style={styles.center}>
                    <Text style={styles.playerText}>Player {currentPlayer}</Text>
                    <Text style={styles.instruction}>
                        Pass the phone to Player {currentPlayer}, then tap the card.
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.card,
                            revealed && isImpostor && styles.impostorCard,
                            revealed && !isImpostor && styles.wordCard,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => setRevealed(true)}
                    >
                        {!revealed ? (
                            <>
                                <Ionicons name="eye-off-outline" size={42} color="#3CF2FF" />
                                <Text style={styles.hiddenText}>Tap to reveal</Text>
                            </>
                        ) : (
                            <>
                                <Text
                                    style={[
                                        styles.revealLabel,
                                        isImpostor && styles.impostorLabel,
                                    ]}
                                >
                                    {isImpostor ? "YOU ARE THE" : "YOUR WORD IS"}
                                </Text>

                                <Text style={styles.revealText}>
                                    {isImpostor ? "IMPOSTOR" : game.word}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {revealed && (
                        <TouchableOpacity
                            style={styles.nextButton}
                            activeOpacity={0.9}
                            onPress={handleNext}
                        >
                            <Text style={styles.nextText}>
                                {currentPlayer >= players ? "Start Guess Timer" : "Hide & Pass"}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color="#000000" />
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={styles.center}>
                    <Text style={styles.title}>Find the Impostor</Text>
                    <Text style={styles.subtitle}>
                        Ask questions, defend yourself, and vote before time runs out.
                    </Text>

                    <View style={styles.timerCard}>
                        <Text style={styles.timerLabel}>Guess Timer</Text>

                        <Text
                            style={[
                                styles.timerText,
                                timeLeft === 0 && styles.timerDoneText,
                            ]}
                        >
                            {formatTime(timeLeft)}
                        </Text>

                        <Text style={styles.timerStatus}>
                            {timeLeft === 0
                                ? "Time is up!"
                                : timerRunning
                                    ? "Discussion is live"
                                    : "Timer paused"}
                        </Text>
                    </View>

                    <View style={styles.timerActions}>
                        <TouchableOpacity
                            style={styles.timerButton}
                            onPress={toggleTimer}
                        >
                            <Ionicons
                                name={timerRunning ? "pause" : "play"}
                                size={20}
                                color="#000000"
                            />
                            <Text style={styles.timerButtonText}>
                                {timerRunning ? "Pause" : "Play"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={resetTimer}
                        >
                            <Ionicons name="refresh" size={20} color="#FFFFFF" />
                            <Text style={styles.secondaryButtonText}>Reset</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.playAgainButton}
                        onPress={playAgain}
                    >
                        <Text style={styles.playAgainText}>Play Again</Text>
                    </TouchableOpacity>
                </View>
            )}
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
        alignItems: "center",
        paddingBottom: 60,
    },
    playerText: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "900",
        marginBottom: 8,
    },
    instruction: {
        color: "#AAB2C0",
        fontSize: 15,
        textAlign: "center",
        marginBottom: 24,
    },
    card: {
        width: "100%",
        minHeight: 280,
        borderRadius: 28,
        backgroundColor: "#050816",
        borderWidth: 1.5,
        borderColor: "#1A2A4A",
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    impostorCard: {
        borderColor: "#FF6B6B",
    },
    wordCard: {
        borderColor: "#3CF2FF",
    },
    hiddenText: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "900",
        marginTop: 14,
    },
    revealLabel: {
        color: "#AAB2C0",
        fontSize: 14,
        fontWeight: "900",
        marginBottom: 12,
    },
    impostorLabel: {
        color: "#FF6B6B",
    },
    revealText: {
        color: "#FFFFFF",
        fontSize: 34,
        fontWeight: "900",
        textAlign: "center",
    },
    nextButton: {
        height: 56,
        borderRadius: 28,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 28,
        marginTop: 22,
    },
    nextText: {
        color: "#000000",
        fontSize: 16,
        fontWeight: "900",
    },
    title: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "900",
        marginBottom: 10,
    },
    subtitle: {
        color: "#AAB2C0",
        fontSize: 15,
        textAlign: "center",
        marginBottom: 26,
    },
    timerCard: {
        width: "100%",
        backgroundColor: "#050816",
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: "#12203A",
        padding: 26,
        alignItems: "center",
        marginBottom: 22,
    },
    timerLabel: {
        color: "#AAB2C0",
        fontSize: 14,
        marginBottom: 10,
    },
    timerText: {
        color: "#3CF2FF",
        fontSize: 64,
        fontWeight: "900",
    },
    timerDoneText: {
        color: "#FF6B6B",
    },
    timerStatus: {
        color: "#FFFFFF",
        marginTop: 8,
    },
    timerActions: {
        width: "100%",
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    timerButton: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    timerButtonText: {
        color: "#000000",
        fontWeight: "900",
    },
    secondaryButton: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    secondaryButtonText: {
        color: "#FFFFFF",
        fontWeight: "900",
    },
    playAgainButton: {
        height: 54,
        borderRadius: 27,
        backgroundColor: "#0B1A4A",
        borderWidth: 1.5,
        borderColor: "#1C3D8F",
        paddingHorizontal: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    playAgainText: {
        color: "#FFFFFF",
        fontWeight: "900",
    },
});