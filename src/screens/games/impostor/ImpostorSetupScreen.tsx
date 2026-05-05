import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";

export default function ImpostorSetupScreen() {
    const navigation = useNavigation<any>();
    const [players, setPlayers] = useState(4);
    const [guessTimeSeconds, setGuessTimeSeconds] = useState(120);

    const decreasePlayers = () => {
        if (players > 3) {
            setPlayers(players - 1);
        }
    };

    const increasePlayers = () => {
        if (players < 12) {
            setPlayers(players + 1);
        }
    };

    const startGame = () => {
        navigation.navigate("ImpostorReveal", {
            players,
            guessTimeSeconds,
        });
    };

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Impostor</Text>
            </View>

            <View style={styles.center}>
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
                        <Ionicons name="remove" size={28} color="#FFFFFF" />
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
                        <Ionicons name="add" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Guess Time</Text>

                <View style={styles.timeOptions}>
                    {[60, 120, 180, 300].map((seconds) => (
                        <TouchableOpacity
                            key={seconds}
                            style={[
                                styles.timeOption,
                                guessTimeSeconds === seconds && styles.selectedTimeOption,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => setGuessTimeSeconds(seconds)}
                        >
                            <Text
                                style={[
                                    styles.timeOptionText,
                                    guessTimeSeconds === seconds && styles.selectedTimeOptionText,
                                ]}
                            >
                                {seconds / 60} min
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
                    <Ionicons name="arrow-forward" size={20} color="#000000" />
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
        paddingBottom: 50,
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
    counterCard: {
        backgroundColor: "#050816",
        borderRadius: 26,
        borderWidth: 1,
        borderColor: "#12203A",
        padding: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 28,
    },
    counterButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
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
        fontSize: 54,
        fontWeight: "900",
    },
    playerLabel: {
        color: "#7A8599",
        fontSize: 14,
        fontWeight: "700",
        marginTop: -4,
    },
    timeOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 28,
    },
    timeOption: {
        flex: 1,
        minWidth: "45%",
        height: 48,
        borderRadius: 24,
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
    timeOptionText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },
    selectedTimeOptionText: {
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