import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import GameBackButton from "../../components/GameBackButton";
import GameHomeButton from "../../components/GameHomeButton";
import GameScreenWrapper from "../../components/GameScreenWrapper";

const games = [
    {
        title: "Chess Charades",
        description: "Act out chess words, players, openings, and funny chess moments.",
        icon: "body-outline",
        color: "#FFD166",
        route: "CharadesSetup",
    },
    {
        title: "Most Likely",
        description: "Swipe through funny chess prompts and vote who fits best.",
        icon: "people-outline",
        color: "#3CF2FF",
        route: "MostLikely",
    },
    {
        title: "Impostor",
        description: "Everyone sees the chess card except one hidden impostor.",
        icon: "eye-outline",
        color: "#FF6B6B",
        route: "ImpostorSetup",
    },
    {
        title: "Just Move Clock",
        description: "A chaotic chess clock party mode built for fast decisions.",
        icon: "timer-outline",
        color: "#7CFF6B",
        route: "JustMoveClock",
    },
];

export default function GameHomeScreen() {
    const navigation = useNavigation<any>();

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Party Games</Text>
            </View>

            <Text style={styles.subtitle}>
                Pick a game mode and bring chess energy to the room. ♟️🔥
            </Text>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {games.map((game) => (
                    <TouchableOpacity
                        key={game.title}
                        style={styles.gameCard}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate(game.route)}
                    >
                        <View style={styles.gameLeft}>
                            <View
                                style={[
                                    styles.iconBubble,
                                    { borderColor: game.color },
                                ]}
                            >
                                <Ionicons
                                    name={game.icon as any}
                                    size={24}
                                    color={game.color}
                                />
                            </View>

                            <View style={styles.gameTextWrap}>
                                <Text style={styles.gameTitle}>{game.title}</Text>
                                <Text style={styles.gameDescription}>
                                    {game.description}
                                </Text>
                            </View>
                        </View>

                        <Ionicons
                            name="chevron-forward"
                            size={22}
                            color="#8A8F98"
                        />
                    </TouchableOpacity>
                ))}

                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                <GameHomeButton />
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
    subtitle: {
        color: "#AAB2C0",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 18,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 140,
    },
    gameCard: {
        minHeight: 96,
        backgroundColor: "#050816",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#12203A",
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    gameLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        paddingRight: 12,
    },
    iconBubble: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1220",
        borderWidth: 1.5,
        marginRight: 14,
    },
    gameTextWrap: {
        flex: 1,
    },
    gameTitle: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "800",
        marginBottom: 5,
    },
    gameDescription: {
        color: "#AAB2C0",
        fontSize: 13.5,
        lineHeight: 19,
    },
    bottomSpacer: {
        height: 30,
    },
    fixedHomeButtonWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 18,
        alignItems: "center",
        justifyContent: "center",
    },
});