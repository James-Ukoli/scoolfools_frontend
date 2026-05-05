import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { justMoveClockConfig } from "../../../../assets/data/justMoveClock";

type Player = 1 | 2;

export default function JustMoveClockScreen() {
    const [activePlayer, setActivePlayer] = useState<Player>(1);
    const [timeLeft, setTimeLeft] = useState(0);
    const [running, setRunning] = useState(false);
    const [showJustMove, setShowJustMove] = useState(false);

    const getRandomSeconds = () => {
        const { minSeconds, maxSeconds } = justMoveClockConfig;
        return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    };

    const startClock = () => {
        const newTime = getRandomSeconds();

        setTimeLeft(newTime);
        setRunning(true);
        setShowJustMove(newTime <= justMoveClockConfig.warningSecond);
    };

    const switchTurn = (player: Player) => {
        if (!running) {
            return;
        }

        if (player !== activePlayer) {
            return;
        }

        const nextPlayer: Player = activePlayer === 1 ? 2 : 1;

        setActivePlayer(nextPlayer);
        const newTime = getRandomSeconds();

        setTimeLeft(newTime);
        setShowJustMove(newTime <= justMoveClockConfig.warningSecond);
    };

    const resetClock = () => {
        setActivePlayer(1);
        setTimeLeft(0);
        setRunning(false);
        setShowJustMove(false);
    };

    useEffect(() => {
        if (!running || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setRunning(false);
                    setShowJustMove(false);
                    return 0;
                }

                if (prev - 1 === justMoveClockConfig.warningSecond) {
                    setShowJustMove(true);
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [running, timeLeft]);

    const renderPlayerClock = (player: Player) => {
        const isActive = activePlayer === player;
        const isTopPlayer = player === 2;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[
                    styles.playerPanel,
                    isActive && running && styles.activePanel,
                    isTopPlayer && styles.topPanel,
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
                        <Text style={styles.tapHint}>
                            Wait for opponent
                        </Text>
                    </>
                )}
            </TouchableOpacity>
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
        borderColor: "#3CF2FF",
        shadowColor: "#3CF2FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
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
});