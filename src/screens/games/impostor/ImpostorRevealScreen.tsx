import React, { useEffect, useRef, useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { impostorWords } from "../../../../assets/data/impostor";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RouteParams = {
    ImpostorReveal: {
        players: number;
        guessTimeSeconds: number;
        votingTimeSeconds: number;
    };
};

type GamePhase =
    | "reveal"
    | "discussion"
    | "voting"
    | "vote"
    | "impostorGuess"
    | "result";

type Winner = "crew" | "impostor";

const IMPOSTOR_GUESS_SECONDS = 15;

export default function ImpostorRevealScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, "ImpostorReveal">>();
    const insets = useSafeAreaInsets();

    const bottomSafePadding =
        Platform.OS === "android"
            ? Math.max(insets.bottom + 50, 76)
            : insets.bottom + 34;

    const players = route.params?.players || 4;
    const guessTimeSeconds = route.params?.guessTimeSeconds || 120;
    const votingTimeSeconds = route.params?.votingTimeSeconds || 30;

    const [game] = useState(() => {
        const impostorIndex = Math.floor(Math.random() * players);
        const wordIndex = Math.floor(Math.random() * impostorWords.length);

        return {
            impostorIndex,
            word: impostorWords[wordIndex],
        };
    });

    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [revealed, setRevealed] = useState(false);
    const [phase, setPhase] = useState<GamePhase>("reveal");
    const [timeLeft, setTimeLeft] = useState(guessTimeSeconds);
    const [timerRunning, setTimerRunning] = useState(false);
    const [selectedVote, setSelectedVote] = useState<number | null>(null);
    const [winner, setWinner] = useState<Winner | null>(null);
    const [resultMessage, setResultMessage] = useState("");

    const amongusStartRef = useRef<Audio.Sound | null>(null);
    const emergencyRef = useRef<Audio.Sound | null>(null);
    const techAlienRef = useRef<Audio.Sound | null>(null);
    const tickingRef = useRef<Audio.Sound | null>(null);
    const thirtySecondsRef = useRef<Audio.Sound | null>(null);
    const fiveSecondsRef = useRef<Audio.Sound | null>(null);
    const gameOverRef = useRef<Audio.Sound | null>(null);

    const playedTenRef = useRef(false);
    const playedFiveRef = useRef(false);
    const playedThirtyVoteRef = useRef(false);
    const playedFiveVoteRef = useRef(false);
    const playedFiveImpostorGuessRef = useRef(false);

    const resultScale = useRef(new Animated.Value(0.85)).current;
    const resultOpacity = useRef(new Animated.Value(0)).current;

    const impostorPlayer = game.impostorIndex + 1;
    const isImpostor = currentPlayer - 1 === game.impostorIndex;

    useEffect(() => {
        loadSounds();

        return () => {
            unloadSounds();
        };
    }, []);

    useEffect(() => {
        if (!timerRunning || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;

                if (phase === "discussion") {
                    if (next === 10 && !playedTenRef.current) {
                        playSound(techAlienRef.current);
                        playedTenRef.current = true;
                    }

                    if (next === 5 && !playedFiveRef.current) {
                        playSound(fiveSecondsRef.current);
                        playSound(tickingRef.current);
                        playedFiveRef.current = true;
                    }

                    if (next <= 0) {
                        startVoting();
                        return 0;
                    }
                }

                if (phase === "voting") {
                    if (next === 30 && !playedThirtyVoteRef.current) {
                        playSound(thirtySecondsRef.current);
                        playedThirtyVoteRef.current = true;
                    }

                    if (next === 5 && !playedFiveVoteRef.current) {
                        playSound(fiveSecondsRef.current);
                        playSound(tickingRef.current);
                        playedFiveVoteRef.current = true;
                    }

                    if (next <= 0) {
                        stopSound(tickingRef.current);
                        setTimerRunning(false);
                        setPhase("vote");
                        return 0;
                    }
                }

                if (phase === "impostorGuess") {
                    if (next === 5 && !playedFiveImpostorGuessRef.current) {
                        playSound(fiveSecondsRef.current);
                        playSound(tickingRef.current);
                        playedFiveImpostorGuessRef.current = true;
                    }

                    if (next <= 0) {
                        finishGame(
                            "crew",
                            `Player ${impostorPlayer} ran out of time and failed to guess the secret word.`
                        );
                        return 0;
                    }
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timerRunning, timeLeft, phase]);

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const amongusStart = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/amongus1.mp3")
            );
            const emergency = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/amongus-emergency.mp3")
            );
            const techAlien = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/techaliensound.mp3")
            );
            const ticking = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/clock-ticking-fast.mp3")
            );
            const thirtySeconds = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/30-s-left.mp3")
            );
            const fiveSeconds = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/5-second-countdown.mp3")
            );
            const gameOver = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/gameover.mp3")
            );

            amongusStartRef.current = amongusStart.sound;
            emergencyRef.current = emergency.sound;
            techAlienRef.current = techAlien.sound;
            tickingRef.current = ticking.sound;
            thirtySecondsRef.current = thirtySeconds.sound;
            fiveSecondsRef.current = fiveSeconds.sound;
            gameOverRef.current = gameOver.sound;
        } catch (error) {
            console.log("Impostor reveal sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await amongusStartRef.current?.unloadAsync();
            await emergencyRef.current?.unloadAsync();
            await techAlienRef.current?.unloadAsync();
            await tickingRef.current?.unloadAsync();
            await thirtySecondsRef.current?.unloadAsync();
            await fiveSecondsRef.current?.unloadAsync();
            await gameOverRef.current?.unloadAsync();
        } catch (error) {
            console.log("Impostor reveal sound unload error:", error);
        }
    };

    const playSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Impostor reveal sound play error:", error);
        }
    };

    const stopSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.stopAsync();
            await sound.setPositionAsync(0);
        } catch (error) {
            console.log("Impostor reveal sound stop error:", error);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    };

    const startDiscussion = () => {
        playedTenRef.current = false;
        playedFiveRef.current = false;

        setPhase("discussion");
        setTimeLeft(guessTimeSeconds);
        setTimerRunning(true);

        playSound(amongusStartRef.current);
    };

    const startVoting = () => {
        stopSound(tickingRef.current);

        playedThirtyVoteRef.current = false;
        playedFiveVoteRef.current = false;

        setPhase("voting");
        setTimeLeft(votingTimeSeconds);
        setTimerRunning(true);

        playSound(emergencyRef.current);

        if (votingTimeSeconds <= 30) {
            setTimeout(() => {
                playSound(thirtySecondsRef.current);
            }, 500);
            playedThirtyVoteRef.current = true;
        }
    };

    const startImpostorGuess = (votedPlayer: number) => {
        stopSound(tickingRef.current);

        playedFiveImpostorGuessRef.current = false;

        setSelectedVote(votedPlayer);
        setPhase("impostorGuess");
        setTimeLeft(IMPOSTOR_GUESS_SECONDS);
        setTimerRunning(true);

        playSound(emergencyRef.current);
    };

    const handleNext = () => {
        if (currentPlayer >= players) {
            startDiscussion();
            return;
        }

        setRevealed(false);
        setCurrentPlayer((prev) => prev + 1);
    };

    const handleVote = (player: number) => {
        setSelectedVote(player);

        if (player === impostorPlayer) {
            startImpostorGuess(player);
            return;
        }

        finishGame(
            "impostor",
            `The group voted Player ${player}, but Player ${impostorPlayer} was the real impostor.`
        );
    };

    const finishGame = (winnerValue: Winner, message: string) => {
        stopSound(tickingRef.current);

        setWinner(winnerValue);
        setResultMessage(message);
        setPhase("result");
        setTimerRunning(false);

        playSound(gameOverRef.current);

        resultScale.setValue(0.85);
        resultOpacity.setValue(0);

        Animated.parallel([
            Animated.timing(resultOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.spring(resultScale, {
                toValue: 1,
                friction: 5,
                tension: 90,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const playAgain = () => {
        stopSound(tickingRef.current);
        navigation.replace("ImpostorSetup");
    };

    const renderRevealPhase = () => (
        <View style={[styles.center, { paddingBottom: bottomSafePadding }]}>
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
                        {currentPlayer >= players ? "Start Discussion" : "Hide & Pass"}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#000000" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderTimerPhase = () => {
        const isDiscussion = phase === "discussion";

        return (
            <View style={[styles.center, { paddingBottom: bottomSafePadding }]}>
                <Text style={styles.title}>
                    {isDiscussion ? "Find the Impostor" : "Emergency Vote"}
                </Text>

                <Text style={styles.subtitle}>
                    {isDiscussion
                        ? "Take turns saying words related to the secret word. The impostor must blend in and later guess the secret word if they choose to before voting begins."
                        : "Get ready to point. Voting starts when the timer hits zero."}
                </Text>

                <View
                    style={[
                        styles.timerCard,
                        !isDiscussion && styles.emergencyCard,
                    ]}
                >
                    <Text style={styles.timerLabel}>
                        {isDiscussion ? "Discussion Timer" : "Voting Timer"}
                    </Text>

                    <Text
                        style={[
                            styles.timerText,
                            timeLeft <= 5 && styles.timerDangerText,
                            !isDiscussion && styles.votingTimerText,
                        ]}
                    >
                        {formatTime(timeLeft)}
                    </Text>

                    <Text style={styles.timerStatus}>
                        {isDiscussion
                            ? timeLeft <= 10
                                ? "Pressure is rising..."
                                : "Interrogation is live"
                            : timeLeft <= 5
                                ? "POINT NOW!"
                                : "Prepare your vote"}
                    </Text>
                </View>
            </View>
        );
    };

    const renderVotePhase = () => (
        <View style={[styles.voteScreen, { paddingBottom: bottomSafePadding }]}>
            <Text style={styles.title}>Vote Now</Text>

            <Text style={styles.subtitle}>
                Who do you think the impostor is?
            </Text>

            <ScrollView
                style={styles.voteScroll}
                contentContainerStyle={styles.voteGrid}
                showsVerticalScrollIndicator={false}
            >
                {Array.from({ length: players }, (_, index) => {
                    const player = index + 1;

                    return (
                        <TouchableOpacity
                            key={player}
                            style={styles.voteButton}
                            activeOpacity={0.85}
                            onPress={() => handleVote(player)}
                        >
                            <Text style={styles.voteButtonText}>
                                Player {player}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    const renderImpostorGuessPhase = () => (
        <View style={[styles.center, { paddingBottom: bottomSafePadding }]}>
            <Text style={styles.title}>Final Chance</Text>

            <Text style={styles.subtitle}>
                Player {impostorPlayer}, guess the secret word before time runs out.
            </Text>

            <View style={[styles.timerCard, styles.impostorGuessCard]}>
                <Text style={styles.timerLabel}>Impostor Guess Timer</Text>

                <Text
                    style={[
                        styles.timerText,
                        styles.impostorGuessTimerText,
                        timeLeft <= 5 && styles.timerDangerText,
                    ]}
                >
                    {formatTime(timeLeft)}
                </Text>

                <Text style={styles.timerStatus}>
                    {timeLeft <= 5 ? "GUESS NOW!" : "One final chance"}
                </Text>
            </View>

            <View style={styles.guessActions}>
                <TouchableOpacity
                    style={styles.wrongGuessButton}
                    activeOpacity={0.85}
                    onPress={() =>
                        finishGame(
                            "crew",
                            `Player ${impostorPlayer} was caught and failed to guess the secret word.`
                        )
                    }
                >
                    <Text style={styles.wrongGuessText}>Wrong Guess</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.correctGuessButton}
                    activeOpacity={0.85}
                    onPress={() =>
                        finishGame(
                            "impostor",
                            `Player ${impostorPlayer} was caught but guessed the secret word correctly.`
                        )
                    }
                >
                    <Text style={styles.correctGuessText}>Correct Guess</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderResultPhase = () => {
        const crewWon = winner === "crew";

        return (
            <View style={[styles.center, { paddingBottom: bottomSafePadding }]}>
                <Animated.View
                    style={[
                        styles.resultCard,
                        {
                            opacity: resultOpacity,
                            transform: [{ scale: resultScale }],
                        },
                    ]}
                >
                    <Text style={styles.resultKicker}>
                        {crewWon ? "CREW WINS" : "IMPOSTOR WINS"}
                    </Text>

                    <Text style={styles.resultTitle}>
                        {crewWon ? "Impostor Exposed!" : "Impostor Escaped!"}
                    </Text>

                    <Text style={styles.resultSubtitle}>
                        Player {impostorPlayer} was the impostor.
                    </Text>

                    <Text style={styles.resultSmallText}>{resultMessage}</Text>

                    <TouchableOpacity
                        style={styles.playAgainButton}
                        activeOpacity={0.9}
                        onPress={playAgain}
                    >
                        <Text style={styles.playAgainText}>Play Again</Text>
                        <Ionicons name="refresh" size={18} color="#000000" />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Impostor</Text>
            </View>

            {phase === "reveal" && renderRevealPhase()}
            {(phase === "discussion" || phase === "voting") && renderTimerPhase()}
            {phase === "vote" && renderVotePhase()}
            {phase === "impostorGuess" && renderImpostorGuessPhase()}
            {phase === "result" && renderResultPhase()}
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
        lineHeight: 22,
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
        letterSpacing: 1.2,
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
        textAlign: "center",
    },
    subtitle: {
        color: "#AAB2C0",
        fontSize: 15,
        textAlign: "center",
        marginBottom: 26,
        lineHeight: 22,
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
    emergencyCard: {
        borderColor: "#FF6B6B",
        backgroundColor: "#12070A",
    },
    impostorGuessCard: {
        borderColor: "#FFD166",
        backgroundColor: "#120F05",
    },
    timerLabel: {
        color: "#AAB2C0",
        fontSize: 14,
        fontWeight: "900",
        marginBottom: 10,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    timerText: {
        color: "#3CF2FF",
        fontSize: 64,
        fontWeight: "900",
    },
    votingTimerText: {
        color: "#FFD166",
    },
    impostorGuessTimerText: {
        color: "#FFD166",
    },
    timerDangerText: {
        color: "#FF6B6B",
    },
    timerStatus: {
        color: "#FFFFFF",
        marginTop: 8,
        fontSize: 15,
        fontWeight: "800",
        textAlign: "center",
    },
    voteScreen: {
        flex: 1,
    },
    voteScroll: {
        flex: 1,
        width: "100%",
    },
    voteGrid: {
        gap: 12,
        paddingBottom: 90,
    },
    voteButton: {
        height: 58,
        borderRadius: 29,
        backgroundColor: "#050816",
        borderWidth: 1.5,
        borderColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
    },
    voteButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
    },
    guessActions: {
        width: "100%",
        flexDirection: "row",
        gap: 12,
    },
    wrongGuessButton: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
        alignItems: "center",
        justifyContent: "center",
    },
    wrongGuessText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "900",
    },
    correctGuessButton: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#FFD166",
        alignItems: "center",
        justifyContent: "center",
    },
    correctGuessText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
    },
    resultCard: {
        width: "100%",
        backgroundColor: "#071426",
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#3CF2FF",
        padding: 26,
        alignItems: "center",
    },
    resultKicker: {
        color: "#FFD166",
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    resultTitle: {
        color: "#FFFFFF",
        fontSize: 34,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 10,
    },
    resultSubtitle: {
        color: "#B8C4D6",
        fontSize: 17,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 8,
    },
    resultSmallText: {
        color: "#7A8599",
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 21,
    },
    playAgainButton: {
        height: 52,
        borderRadius: 26,
        backgroundColor: "#3CF2FF",
        paddingHorizontal: 28,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    playAgainText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
    },
});