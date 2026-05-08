import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
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
    const [editingScores, setEditingScores] = useState(false);

    const [wordIndex, setWordIndex] = useState(0);
    const [usedIndexes, setUsedIndexes] = useState<number[]>([]);

    const techAlienRef = useRef<Audio.Sound | null>(null);
    const tickingRef = useRef<Audio.Sound | null>(null);
    const cashRegisterRef = useRef<Audio.Sound | null>(null);
    const gameOverRef = useRef<Audio.Sound | null>(null);
    const popRef = useRef<Audio.Sound | null>(null);

    const playedTenRef = useRef(false);
    const playedFiveRef = useRef(false);

    const winnerScale = useRef(new Animated.Value(0.85)).current;
    const winnerOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        pickNewWord();
        loadSounds();

        return () => {
            unloadSounds();
        };
    }, []);

    useEffect(() => {
        if (gameOver) {
            winnerScale.setValue(0.85);
            winnerOpacity.setValue(0);

            Animated.parallel([
                Animated.timing(winnerOpacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.spring(winnerScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 90,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [gameOver]);

    useEffect(() => {
        if (!running || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;

                if (next === 10 && !playedTenRef.current) {
                    playSound(techAlienRef.current);
                    playedTenRef.current = true;
                }

                if (next === 5 && !playedFiveRef.current) {
                    playSound(tickingRef.current);
                    playedFiveRef.current = true;
                }

                if (next <= 0) {
                    setRunning(false);
                    setRoundOver(true);
                    setEditingScores(false);
                    stopSound(tickingRef.current);
                    playSound(cashRegisterRef.current);
                    return 0;
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [running, timeLeft]);

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const techAlien = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/techaliensound.mp3")
            );

            const ticking = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/clock-ticking-fast.mp3")
            );

            const cashRegister = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/soniccashregister.mp3")
            );

            const gameOverSound = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/gameover.mp3")
            );

            const pop = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/pop.mp3")
            );

            techAlienRef.current = techAlien.sound;
            tickingRef.current = ticking.sound;
            cashRegisterRef.current = cashRegister.sound;
            gameOverRef.current = gameOverSound.sound;
            popRef.current = pop.sound;
        } catch (error) {
            console.log("Charades play sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await techAlienRef.current?.unloadAsync();
            await tickingRef.current?.unloadAsync();
            await cashRegisterRef.current?.unloadAsync();
            await gameOverRef.current?.unloadAsync();
            await popRef.current?.unloadAsync();
        } catch (error) {
            console.log("Charades play sound unload error:", error);
        }
    };

    const playSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Charades play sound error:", error);
        }
    };

    const stopSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.stopAsync();
            await sound.setPositionAsync(0);
        } catch (error) {
            console.log("Charades play sound stop error:", error);
        }
    };

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
        stopSound(tickingRef.current);
        playSound(cashRegisterRef.current);

        playedTenRef.current = false;
        playedFiveRef.current = false;

        setTimeLeft(roundTimeSeconds);
        setRunning(true);
        setRoundOver(false);
        setEditingScores(false);
        pickNewWord();

        if (roundTimeSeconds <= 10) {
            playSound(techAlienRef.current);
            playedTenRef.current = true;
        }

        if (roundTimeSeconds <= 5) {
            playSound(tickingRef.current);
            playedFiveRef.current = true;
        }
    };

    const handleEditScore = (team: Team, amount: number) => {
        if (running || !roundOver || gameOver || !editingScores) return;

        playSound(popRef.current);

        if (team === 1) {
            setTeamOneScore((prev) => Math.max(0, prev + amount));
        } else {
            setTeamTwoScore((prev) => Math.max(0, prev + amount));
        }
    };

    const toggleEditScores = () => {
        if (!roundOver || running || gameOver) return;

        playSound(popRef.current);
        setEditingScores((prev) => !prev);
    };

    const nextRound = () => {
        playSound(popRef.current);
        setEditingScores(false);

        if (currentTeam === 1) {
            setCurrentTeam(2);
            setTimeLeft(roundTimeSeconds);
            setRunning(false);
            setRoundOver(false);
            stopSound(tickingRef.current);
            pickNewWord();
            return;
        }

        if (round >= totalRounds) {
            playSound(gameOverRef.current);
            setGameOver(true);
            return;
        }

        setCurrentTeam(1);
        setRound((prev) => prev + 1);
        setTimeLeft(roundTimeSeconds);
        setRunning(false);
        setRoundOver(false);
        stopSound(tickingRef.current);
        pickNewWord();
    };

    const resetGame = () => {
        playSound(popRef.current);
        stopSound(tickingRef.current);

        setTeamOneScore(0);
        setTeamTwoScore(0);
        setCurrentTeam(1);
        setRound(1);
        setTimeLeft(roundTimeSeconds);
        setRunning(false);
        setRoundOver(false);
        setGameOver(false);
        setEditingScores(false);
        setUsedIndexes([]);
        playedTenRef.current = false;
        playedFiveRef.current = false;
        pickNewWord();
    };

    const winnerText =
        teamOneScore > teamTwoScore
            ? "Team 1 Wins!"
            : teamTwoScore > teamOneScore
                ? "Team 2 Wins!"
                : "It's a Tie!";

    const canEditScores = editingScores && roundOver && !running && !gameOver;

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Charades</Text>
            </View>

            <View style={styles.scoreRow}>
                <View style={[styles.scoreCard, currentTeam === 1 && styles.activeScoreCard]}>
                    <Text style={styles.scoreLabel}>Team 1</Text>

                    <View style={styles.scoreEditRow}>
                        {canEditScores && (
                            <TouchableOpacity
                                style={styles.scoreEditButton}
                                activeOpacity={0.85}
                                onPress={() => handleEditScore(1, -1)}
                            >
                                <Text style={styles.scoreEditText}>−</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.scoreText}>{teamOneScore}</Text>

                        {canEditScores && (
                            <TouchableOpacity
                                style={styles.scoreEditButton}
                                activeOpacity={0.85}
                                onPress={() => handleEditScore(1, 1)}
                            >
                                <Text style={styles.scoreEditText}>+</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={[styles.scoreCard, currentTeam === 2 && styles.activeScoreCard]}>
                    <Text style={styles.scoreLabel}>Team 2</Text>

                    <View style={styles.scoreEditRow}>
                        {canEditScores && (
                            <TouchableOpacity
                                style={styles.scoreEditButton}
                                activeOpacity={0.85}
                                onPress={() => handleEditScore(2, -1)}
                            >
                                <Text style={styles.scoreEditText}>−</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.scoreText}>{teamTwoScore}</Text>

                        {canEditScores && (
                            <TouchableOpacity
                                style={styles.scoreEditButton}
                                activeOpacity={0.85}
                                onPress={() => handleEditScore(2, 1)}
                            >
                                <Text style={styles.scoreEditText}>+</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {gameOver ? (
                <View style={styles.center}>
                    <Animated.View
                        style={[
                            styles.gameOverCard,
                            {
                                opacity: winnerOpacity,
                                transform: [{ scale: winnerScale }],
                            },
                        ]}
                    >
                        <Text style={styles.gameOverTitle}>Game Over</Text>

                        <Text style={styles.winnerText}>{winnerText}</Text>

                        <Text style={styles.finalScoreText}>
                            Final Score: {teamOneScore} - {teamTwoScore}
                        </Text>

                        <TouchableOpacity style={styles.startButton} onPress={resetGame}>
                            <Text style={styles.startText}>Play Again</Text>
                            <Ionicons name="refresh" size={20} color="#000" />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            ) : (
                <View style={styles.center}>
                    <Text style={styles.roundText}>
                        Round {round} of {totalRounds} • Team {currentTeam}
                    </Text>

                    <Text
                        style={[
                            styles.timerText,
                            timeLeft <= 10 && running && styles.warningTimerText,
                            timeLeft <= 5 && running && styles.dangerTimerText,
                        ]}
                    >
                        {formatTime(timeLeft)}
                    </Text>

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
                                        ? "Edit points if needed, then pass to Team 2."
                                        : round >= totalRounds
                                            ? "Edit points if needed, then see winner."
                                            : "Edit points if needed. Next round starts with Team 1."}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.wordLabel}>Act this out</Text>
                                <Text style={styles.wordText}>{charadesWords[wordIndex]}</Text>
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

                            <TouchableOpacity style={styles.correctButton} onPress={handleCorrect}>
                                <Text style={styles.correctText}>Correct</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {roundOver && (
                        <>
                            <TouchableOpacity style={styles.startButton} onPress={nextRound}>
                                <Text style={styles.startText}>
                                    {currentTeam === 2 && round >= totalRounds
                                        ? "See Winner"
                                        : "Next Team"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.editButton}
                                activeOpacity={0.85}
                                onPress={toggleEditScores}
                            >
                                <Text style={styles.editButtonText}>
                                    {editingScores ? "Done Editing" : "Edit Scores"}
                                </Text>
                            </TouchableOpacity>
                        </>
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
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },
    screenTitle: {
        color: "#FFF",
        fontSize: 26,
        fontWeight: "800",
        marginLeft: 14,
    },
    scoreRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
    },
    scoreCard: {
        flex: 1,
        backgroundColor: "#050816",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#12203A",
        padding: 12,
        alignItems: "center",
    },
    activeScoreCard: {
        borderColor: "#FFD166",
    },
    scoreLabel: {
        color: "#AAB2C0",
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 4,
    },
    scoreEditRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    scoreEditButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
        alignItems: "center",
        justifyContent: "center",
    },
    scoreEditText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "900",
    },
    scoreText: {
        color: "#FFF",
        fontSize: 26,
        fontWeight: "900",
        minWidth: 30,
        textAlign: "center",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    roundText: {
        color: "#FFF",
        fontSize: 17,
        fontWeight: "900",
        marginBottom: 8,
    },
    timerText: {
        color: "#3CF2FF",
        fontSize: 46,
        fontWeight: "900",
        marginBottom: 18,
    },
    warningTimerText: {
        color: "#FFD166",
    },
    dangerTimerText: {
        color: "#FF6B6B",
    },
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
    wordLabel: {
        color: "#AAB2C0",
        fontSize: 14,
        marginBottom: 10,
    },
    wordText: {
        color: "#FFF",
        fontSize: 30,
        fontWeight: "900",
        textAlign: "center",
    },
    readyText: {
        color: "#FFF",
        fontSize: 26,
        fontWeight: "900",
        textAlign: "center",
    },
    readySubText: {
        color: "#AAB2C0",
        marginTop: 6,
        textAlign: "center",
        lineHeight: 20,
    },
    startButton: {
        height: 56,
        borderRadius: 28,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        marginBottom: 12,
        flexDirection: "row",
        gap: 8,
    },
    startText: {
        color: "#000",
        fontWeight: "900",
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
    },
    skipButton: {
        flex: 1,
        backgroundColor: "#0B1220",
        padding: 16,
        borderRadius: 20,
    },
    skipText: {
        color: "#FFF",
        textAlign: "center",
        fontWeight: "900",
    },
    correctButton: {
        flex: 1,
        backgroundColor: "#FFD166",
        padding: 16,
        borderRadius: 20,
    },
    correctText: {
        textAlign: "center",
        fontWeight: "900",
    },
    editButton: {
        marginTop: 2,
        marginBottom: 6,
    },
    editButtonText: {
        color: "#FFD166",
        fontSize: 15,
        fontWeight: "800",
    },
    resetButton: {
        marginTop: 10,
    },
    resetText: {
        color: "#AAA",
    },
    gameOverCard: {
        width: "100%",
        backgroundColor: "#071426",
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#3CF2FF",
        padding: 26,
        alignItems: "center",
    },
    gameOverTitle: {
        fontSize: 32,
        color: "#FFF",
        fontWeight: "900",
        marginBottom: 10,
    },
    winnerText: {
        fontSize: 28,
        color: "#FFD166",
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 8,
    },
    finalScoreText: {
        color: "#AAA",
        marginTop: 8,
        marginBottom: 24,
    },
});