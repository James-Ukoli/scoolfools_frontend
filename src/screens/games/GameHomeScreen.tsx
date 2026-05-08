import React, { useEffect, useRef } from "react";
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
        sound: "charades",
    },
    {
        title: "Most Likely",
        description: "Swipe through funny chess prompts and vote who fits best.",
        icon: "people-outline",
        color: "#3CF2FF",
        route: "MostLikely",
        sound: "mostlikely",
    },
    {
        title: "Impostor",
        description: "Everyone sees the chess card except one hidden impostor.",
        icon: "eye-outline",
        color: "#FF6B6B",
        route: "ImpostorSetup",
        sound: "impostor",
    },
    {
        title: "Just Move Clock",
        description: "A chaotic chess clock party mode built for fast decisions.",
        icon: "timer-outline",
        color: "#7CFF6B",
        route: "JustMoveClock",
        sound: "clock",
    },
];

export default function GameHomeScreen() {
    const navigation = useNavigation<any>();

    const charadesSoundRef = useRef<Audio.Sound | null>(null);
    const mostLikelySoundRef = useRef<Audio.Sound | null>(null);
    const impostorSoundRef = useRef<Audio.Sound | null>(null);
    const clockSoundRef = useRef<Audio.Sound | null>(null);

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

            const charades = await Audio.Sound.createAsync(
                require("../../../assets/sounds/soniccashregister.mp3")
            );

            const mostLikely = await Audio.Sound.createAsync(
                require("../../../assets/sounds/card-flip.mp3")
            );

            const impostor = await Audio.Sound.createAsync(
                require("../../../assets/sounds/amongus2.mp3")
            );

            const clock = await Audio.Sound.createAsync(
                require("../../../assets/sounds/scribblenauts-button-click.mp3")
            );

            charadesSoundRef.current = charades.sound;
            mostLikelySoundRef.current = mostLikely.sound;
            impostorSoundRef.current = impostor.sound;
            clockSoundRef.current = clock.sound;
        } catch (error) {
            console.log("Game home sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await charadesSoundRef.current?.unloadAsync();
            await mostLikelySoundRef.current?.unloadAsync();
            await impostorSoundRef.current?.unloadAsync();
            await clockSoundRef.current?.unloadAsync();
        } catch (error) {
            console.log("Game home sound unload error:", error);
        }
    };

    const playSound = async (soundType: string) => {
        try {
            let sound: Audio.Sound | null = null;

            if (soundType === "charades") {
                sound = charadesSoundRef.current;
            }

            if (soundType === "mostlikely") {
                sound = mostLikelySoundRef.current;
            }

            if (soundType === "impostor") {
                sound = impostorSoundRef.current;
            }

            if (soundType === "clock") {
                sound = clockSoundRef.current;
            }

            if (!sound) return;

            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Game home sound play error:", error);
        }
    };

    const handleGamePress = async (route: string, soundType: string) => {
        await playSound(soundType);

        setTimeout(() => {
            navigation.navigate(route);
        }, 120);
    };

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
                        onPress={() => handleGamePress(game.route, game.sound)}
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