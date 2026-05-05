import React, { useEffect, useState } from "react";
import { RouteProp, useRoute } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { charadesWords } from "../../../../assets/data/charades";

type Team = 1 | 2;

type RouteParams = {
    CharadesPlay: {
        roundTimeSeconds: number;
        totalRounds: number;
        teamOneScore: number;
        teamTwoScore: number;
        currentTeam: Team;
        round: number;
    };
};

export default function CharadesPlayScreen() {
    const route = useRoute<RouteProp<RouteParams, "CharadesPlay">>();

    const roundTimeSeconds = route.params?.roundTimeSeconds || 60;
    const totalRounds = route.params?.totalRounds || 5;

    const [teamOneScore, setTeamOneScore] = useState(route.params?.teamOneScore || 0);
    const [teamTwoScore, setTeamTwoScore] = useState(route.params?.teamTwoScore || 0);
    const [currentTeam, setCurrentTeam] = useState<Team>(route.params?.currentTeam || 1);
    const [round, setRound] = useState(route.params?.round || 1);

    const [timeLeft, setTimeLeft] = useState(roundTimeSeconds);
    const [running, setRunning] = useState(false);
    const [roundOver, setRoundOver] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const [wordIndex, setWordIndex] = useState(0);
    const [usedIndexes, setUsedIndexes] = useState<number[]>([]);

    useEffect(() => {
        pickNewWord();
    }, []);

    useEffect(() => {
        if (!running || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setRunning(false);
                    setRoundOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [running, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const pickNewWord = () => {
        let nextIndex = Math.floor(Math.random() * charadesWords.length);

        if (usedIndexes.length < charadesWords.length) {
            while (usedIndexes.includes(nextIndex)) {
                nextIndex = Math.floor(Math.random() * charadesWords.length);
            }
        }

        setWordIndex(nextIndex);
        setUsedIndexes((prev) => [...prev, nextIndex]);
    };

    const handleCorrect = () => {
        if (!running) return;

        if (currentTeam === 1) {
            setTeamOneScore((prev) => prev + 1);
        } else {
            setTeamTwoScore((prev) => prev + 1);
        }

        pickNewWord();
    };

    const handleSkip = () => {
        if (!running) return;
        pickNewWord();
    };

    const startRound = () => {
        setTimeLeft(roundTimeSeconds);
        setRunning(true);
        setRoundOver(false);
        pickNewWord();
    };

    // ✅ FIXED ROUND LOGIC
    const nextRound = () => {
        // If Team 1 just finished → switch to Team 2 SAME round
        if (currentTeam === 1) {
            setCurrentTeam(2);
            setTimeLeft(roundTimeSeconds);
            setRunning(false);
            setRoundOver(false);
            pickNewWord();
            return;
        }

        // If Team 2 finished LAST round → end game
        if (round >= totalRounds) {
            setGameOver(true);
            return;
        }

        // Otherwise → next round starts with Team 1
        setCurrentTeam(1);
        setRound((prev) => prev + 1);
        setTimeLeft(roundTimeSeconds);
        setRunning(false);
        setRoundOver(false);
        pickNewWord();
    };

    const resetGame = () => {
        setTeamOneScore(0);
        setTeamTwoScore(0);
        setCurrentTeam(1);
        setRound(1);
        setTimeLeft(roundTimeSeconds);
        setRunning(false);
        setRoundOver(false);
        setGameOver(false);
        setUsedIndexes([]);
        pickNewWord();
    };

    const winnerText =
        teamOneScore > teamTwoScore
            ? "Team 1 Wins!"
            : teamTwoScore > teamOneScore
                ? "Team 2 Wins!"
                : "It's a Tie!";

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Charades</Text>
            </View>

            <View style={styles.scoreRow}>
                <View style={[styles.scoreCard, currentTeam === 1 && styles.activeScoreCard]}>
                    <Text style={styles.scoreLabel}>Team 1</Text>
                    <Text style={styles.scoreText}>{teamOneScore}</Text>
                </View>

                <View style={[styles.scoreCard, currentTeam === 2 && styles.activeScoreCard]}>
                    <Text style={styles.scoreLabel}>Team 2</Text>
                    <Text style={styles.scoreText}>{teamTwoScore}</Text>
                </View>
            </View>

            {gameOver ? (
                <View style={styles.center}>
                    <Text style={styles.gameOverTitle}>Game Over</Text>

                    <View style={styles.wordCard}>
                        <Text style={styles.winnerText}>{winnerText}</Text>
                        <Text style={styles.finalScoreText}>
                            Final Score: {teamOneScore} - {teamTwoScore}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.startButton} onPress={resetGame}>
                        <Text style={styles.startText}>Play Again</Text>
                        <Ionicons name="refresh" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.center}>
                    <Text style={styles.roundText}>
                        Round {round} of {totalRounds} • Team {currentTeam}
                    </Text>

                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

                    <View style={styles.wordCard}>
                        {!running && !roundOver ? (
                            <>
                                <Text style={styles.readyText}>Ready?</Text>
                                <Text style={styles.readySubText}>
                                    Team {currentTeam}, get set.
                                </Text>
                            </>
                        ) : roundOver ? (
                            <>
                                <Text style={styles.readyText}>Round Over</Text>
                                <Text style={styles.readySubText}>
                                    {currentTeam === 1
                                        ? "Pass to Team 2."
                                        : round >= totalRounds
                                            ? "Tap below to see winner."
                                            : "Next round starts with Team 1."}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.wordLabel}>Act this out</Text>
                                <Text style={styles.wordText}>
                                    {charadesWords[wordIndex]}
                                </Text>
                            </>
                        )}
                    </View>

                    {!running && !roundOver && (
                        <TouchableOpacity style={styles.startButton} onPress={startRound}>
                            <Text style={styles.startText}>Start Round</Text>
                        </TouchableOpacity>
                    )}

                    {running && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                                <Text style={styles.skipText}>Skip</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.correctButton}
                                onPress={handleCorrect}
                            >
                                <Text style={styles.correctText}>Correct</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {roundOver && (
                        <TouchableOpacity style={styles.startButton} onPress={nextRound}>
                            <Text style={styles.startText}>
                                {currentTeam === 2 && round >= totalRounds
                                    ? "See Winner"
                                    : "Next Team"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                </View>
            )}
        </GameScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    screenTitle: { color: "#FFF", fontSize: 26, fontWeight: "800", marginLeft: 14 },

    scoreRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    scoreCard: {
        flex: 1,
        backgroundColor: "#050816",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#12203A",
        padding: 12,
        alignItems: "center",
    },
    activeScoreCard: { borderColor: "#FFD166" },
    scoreLabel: { color: "#AAB2C0", fontSize: 13, fontWeight: "800" },
    scoreText: { color: "#FFF", fontSize: 26, fontWeight: "900" },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    roundText: { color: "#FFF", fontSize: 17, fontWeight: "900", marginBottom: 8 },
    timerText: { color: "#3CF2FF", fontSize: 46, fontWeight: "900", marginBottom: 18 },

    wordCard: {
        width: "100%",
        minHeight: 220,
        borderRadius: 28,
        backgroundColor: "#050816",
        borderWidth: 1.5,
        borderColor: "#12203A",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        marginBottom: 20,
    },

    wordLabel: { color: "#AAB2C0", fontSize: 14, marginBottom: 10 },
    wordText: { color: "#FFF", fontSize: 30, fontWeight: "900", textAlign: "center" },

    readyText: { color: "#FFF", fontSize: 26, fontWeight: "900" },
    readySubText: { color: "#AAB2C0", marginTop: 6, textAlign: "center" },

    startButton: {
        height: 56,
        borderRadius: 28,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        marginBottom: 12,
    },
    startText: { color: "#000", fontWeight: "900" },

    actionRow: { flexDirection: "row", gap: 10, width: "100%" },
    skipButton: { flex: 1, backgroundColor: "#0B1220", padding: 16, borderRadius: 20 },
    skipText: { color: "#FFF", textAlign: "center", fontWeight: "900" },

    correctButton: { flex: 1, backgroundColor: "#FFD166", padding: 16, borderRadius: 20 },
    correctText: { textAlign: "center", fontWeight: "900" },

    resetButton: { marginTop: 10 },
    resetText: { color: "#AAA" },

    gameOverTitle: { fontSize: 32, color: "#FFF", fontWeight: "900" },
    winnerText: { fontSize: 28, color: "#FFD166", fontWeight: "900" },
    finalScoreText: { color: "#AAA", marginTop: 8 },
});