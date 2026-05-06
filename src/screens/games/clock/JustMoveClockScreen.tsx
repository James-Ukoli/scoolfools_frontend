import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { justMoveClockConfig } from "../../../../assets/data/justMoveClock";

type Player = 1 | 2;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function JustMoveClockScreen() {
    const [activePlayer, setActivePlayer] = useState<Player>(1);
    const [timeLeft, setTimeLeft] = useState(0);
    const [running, setRunning] = useState(false);
    const [showJustMove, setShowJustMove] = useState(false);
    const [winner, setWinner] = useState<Player | null>(null);
    const [loser, setLoser] = useState<Player | null>(null);

    const warningSoundRef = useRef<Audio.Sound | null>(null);
    const tickingSoundRef = useRef<Audio.Sound | null>(null);
    const clickSoundRef = useRef<Audio.Sound | null>(null);
    const gameOverSoundRef = useRef<Audio.Sound | null>(null);
    const pacmanSoundRef = useRef<Audio.Sound | null>(null);

    const hasPlayedWarningRef = useRef(false);

    const pulseAnim = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.85)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;

    const getRandomSeconds = () => {
        const { minSeconds, maxSeconds } = justMoveClockConfig;
        return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    };

    useEffect(() => {
        loadSounds();

        return () => {
            unloadSounds();
        };
    }, []);

    useEffect(() => {
        if (running) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 750,
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 750,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(0);
        }
    }, [running]);

    useEffect(() => {
        if (winner) {
            modalScale.setValue(0.85);
            modalOpacity.setValue(0);

            Animated.parallel([
                Animated.timing(modalOpacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.spring(modalScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 90,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [winner]);

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const warning = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/techaliensound.mp3")
            );

            const ticking = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/clock-ticking-fast.mp3")
            );

            const click = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/scribblenauts-button-click.mp3")
            );

            const gameOver = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/gameover.mp3")
            );

            const pacman = await Audio.Sound.createAsync(
                require("../../../../assets/sounds/pacman-die.mp3")
            );

            warningSoundRef.current = warning.sound;
            tickingSoundRef.current = ticking.sound;
            clickSoundRef.current = click.sound;
            gameOverSoundRef.current = gameOver.sound;
            pacmanSoundRef.current = pacman.sound;
        } catch (e) {
            console.log("Sound load error:", e);
        }
    };

    const unloadSounds = async () => {
        try {
            await warningSoundRef.current?.unloadAsync();
            await tickingSoundRef.current?.unloadAsync();
            await clickSoundRef.current?.unloadAsync();
            await gameOverSoundRef.current?.unloadAsync();
            await pacmanSoundRef.current?.unloadAsync();
        } catch (e) {
            console.log("Sound unload error:", e);
        }
    };

    const playSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (e) {
            console.log("Sound play error:", e);
        }
    };

    const stopSound = async (sound: Audio.Sound | null) => {
        if (!sound) return;

        try {
            await sound.stopAsync();
            await sound.setPositionAsync(0);
        } catch (e) {
            console.log("Sound stop error:", e);
        }
    };

    const playWarningSounds = async () => {
        playSound(warningSoundRef.current);
        playSound(tickingSoundRef.current);
    };

    const playGameOverSounds = async () => {
        await stopSound(tickingSoundRef.current);
        await playSound(gameOverSoundRef.current);

        setTimeout(() => {
            playSound(pacmanSoundRef.current);
        }, 250);
    };

    const startClock = () => {
        const newTime = getRandomSeconds();

        stopSound(tickingSoundRef.current);

        setWinner(null);
        setLoser(null);
        setTimeLeft(newTime);
        setRunning(true);
        setShowJustMove(newTime <= justMoveClockConfig.warningSecond);

        hasPlayedWarningRef.current = false;

        if (newTime <= justMoveClockConfig.warningSecond) {
            playWarningSounds();
            hasPlayedWarningRef.current = true;
        }
    };

    const switchTurn = (player: Player) => {
        if (!running) return;
        if (player !== activePlayer) return;

        playSound(clickSoundRef.current);
        stopSound(tickingSoundRef.current);

        const nextPlayer: Player = activePlayer === 1 ? 2 : 1;
        const newTime = getRandomSeconds();

        setActivePlayer(nextPlayer);
        setTimeLeft(newTime);
        setShowJustMove(newTime <= justMoveClockConfig.warningSecond);

        hasPlayedWarningRef.current = false;

        if (newTime <= justMoveClockConfig.warningSecond) {
            playWarningSounds();
            hasPlayedWarningRef.current = true;
        }
    };

    const handleTimeout = () => {
        const winningPlayer: Player = activePlayer === 1 ? 2 : 1;

        setRunning(false);
        setShowJustMove(false);
        setTimeLeft(0);
        setWinner(winningPlayer);
        setLoser(activePlayer);

        playGameOverSounds();
    };

    const resetClock = () => {
        stopSound(tickingSoundRef.current);

        setActivePlayer(1);
        setTimeLeft(0);
        setRunning(false);
        setShowJustMove(false);
        setWinner(null);
        setLoser(null);
        hasPlayedWarningRef.current = false;
    };

    useEffect(() => {
        if (!running || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeout();
                    return 0;
                }

                if (
                    prev - 1 === justMoveClockConfig.warningSecond &&
                    !hasPlayedWarningRef.current
                ) {
                    setShowJustMove(true);
                    playWarningSounds();
                    hasPlayedWarningRef.current = true;
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [running, timeLeft, activePlayer]);

    const activeBackground = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#0B1A2F", "#102B4D"],
    });

    const activeBorder = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#3CF2FF", "#FFD166"],
    });

    const renderPlayerClock = (player: Player) => {
        const isActive = activePlayer === player;
        const isTopPlayer = player === 2;

        return (
            <AnimatedTouchable
                activeOpacity={0.9}
                style={[
                    styles.playerPanel,
                    isTopPlayer && styles.topPanel,
                    isActive && running && styles.activePanel,
                    isActive &&
                    running && {
                        backgroundColor: activeBackground,
                        borderColor: activeBorder,
                    },
                    isActive && running && showJustMove && styles.warningPanel,
                ]}
                onPress={() => switchTurn(player)}
            >
                <Text style={styles.playerLabel}>Player {player}</Text>

                {isActive && running ? (
                    <>
                        <Text
                            style={[
                                styles.timerText,
                                showJustMove && styles.warningTimerText,
                            ]}
                        >
                            {timeLeft}
                        </Text>

                        <Text style={styles.turnText}>
                            {showJustMove ? "JUST MOVE!" : "Your move"}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.notTurnText}>Not your turn</Text>
                        <Text style={styles.tapHint}>Wait for opponent</Text>
                    </>
                )}
            </AnimatedTouchable>
        );
    };

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Just Move Clock</Text>
            </View>

            <View style={styles.clockWrap}>
                {renderPlayerClock(2)}

                <View style={styles.middleControls}>
                    {!running ? (
                        <TouchableOpacity
                            style={styles.startButton}
                            activeOpacity={0.9}
                            onPress={startClock}
                        >
                            <Text style={styles.startText}>
                                {timeLeft === 0 ? "Start" : "Start Again"}
                            </Text>
                            <Ionicons name="play" size={18} color="#000000" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.pauseButton}
                            activeOpacity={0.9}
                            onPress={() => setRunning(false)}
                        >
                            <Text style={styles.pauseText}>Pause</Text>
                            <Ionicons name="pause" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.resetButton}
                        activeOpacity={0.85}
                        onPress={resetClock}
                    >
                        <Ionicons name="refresh" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {renderPlayerClock(1)}
            </View>

            <Modal visible={winner !== null} transparent animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.winnerModal,
                            {
                                opacity: modalOpacity,
                                transform: [{ scale: modalScale }],
                            },
                        ]}
                    >
                        <Text style={styles.modalKicker}>TIMEOUT</Text>

                        <Text style={styles.modalTitle}>
                            Player {winner} Wins!
                        </Text>

                        <Text style={styles.modalSubtitle}>
                            Player {loser} did not move in time.
                        </Text>

                        <TouchableOpacity
                            style={styles.modalButton}
                            activeOpacity={0.9}
                            onPress={resetClock}
                        >
                            <Text style={styles.modalButtonText}>Play Again</Text>
                            <Ionicons name="refresh" size={18} color="#000000" />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
        </GameScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "800",
        marginLeft: 14,
    },
    clockWrap: {
        flex: 1,
        justifyContent: "space-between",
        paddingBottom: 18,
    },
    playerPanel: {
        flex: 1,
        backgroundColor: "#050816",
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: "#12203A",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
    },
    topPanel: {
        transform: [{ rotate: "180deg" }],
    },
    activePanel: {
        shadowColor: "#3CF2FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 10,
    },
    warningPanel: {
        shadowColor: "#FFD166",
        shadowOpacity: 0.65,
        shadowRadius: 18,
        elevation: 14,
    },
    playerLabel: {
        color: "#AAB2C0",
        fontSize: 15,
        fontWeight: "900",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    timerText: {
        color: "#3CF2FF",
        fontSize: 86,
        fontWeight: "900",
        lineHeight: 96,
    },
    warningTimerText: {
        color: "#FFD166",
    },
    turnText: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "900",
        marginTop: 8,
    },
    notTurnText: {
        color: "#7A8599",
        fontSize: 28,
        fontWeight: "900",
        textAlign: "center",
    },
    tapHint: {
        color: "#4F5A6F",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 10,
    },
    middleControls: {
        height: 74,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    startButton: {
        height: 48,
        borderRadius: 24,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 28,
    },
    startText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
    },
    pauseButton: {
        height: 48,
        borderRadius: 24,
        backgroundColor: "#0B1220",
        borderWidth: 1,
        borderColor: "#16233B",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 28,
    },
    pauseText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "900",
    },
    resetButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#0B1A4A",
        borderWidth: 1,
        borderColor: "#1C3D8F",
        alignItems: "center",
        justifyContent: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.78)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
    },
    winnerModal: {
        width: "100%",
        backgroundColor: "#071426",
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#3CF2FF",
        padding: 26,
        alignItems: "center",
    },
    modalKicker: {
        color: "#FF6B6B",
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    modalTitle: {
        color: "#FFFFFF",
        fontSize: 34,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 10,
    },
    modalSubtitle: {
        color: "#B8C4D6",
        fontSize: 16,
        fontWeight: "700",
        textAlign: "center",
        lineHeight: 23,
        marginBottom: 24,
    },
    modalButton: {
        height: 52,
        borderRadius: 26,
        backgroundColor: "#3CF2FF",
        paddingHorizontal: 28,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    modalButtonText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
    },
});