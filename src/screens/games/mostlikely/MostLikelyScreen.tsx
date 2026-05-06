import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Audio } from "expo-av";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { mostLikelyPrompts } from "../../../../assets/data/mostlikely";

export default function MostLikelyScreen() {
    const [deck, setDeck] = useState<number[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [prompt, setPrompt] = useState("");

    const flipAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const soundRef = useRef<Audio.Sound | null>(null);

    const shuffle = (array: number[]) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const formatPrompt = (text: string) => {
        if (!text) return "Loading...";

        const cleaned = text
            .replace(/^who is most likely to\s*/i, "")
            .replace(/\?$/, "")
            .trim();

        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    useEffect(() => {
        const indices = mostLikelyPrompts.map((_, i) => i);
        const shuffled = shuffle(indices);

        setDeck(shuffled);
        setPrompt(mostLikelyPrompts[shuffled[0]]);

        loadSound();

        return () => {
            unloadSound();
        };
    }, []);

    const loadSound = async () => {
        const { sound } = await Audio.Sound.createAsync(
            require("../../../../assets/sounds/card-flip.mp3")
        );
        soundRef.current = sound;
    };

    const unloadSound = async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
        }
    };

    const playSound = async () => {
        if (soundRef.current) {
            try {
                await soundRef.current.replayAsync();
            } catch (e) {
                console.log("Sound error:", e);
            }
        }
    };

    const getNextPrompt = () => {
        if (deck.length === 0) return;

        if (currentIndex >= deck.length - 1) {
            const indices = mostLikelyPrompts.map((_, i) => i);
            const shuffled = shuffle(indices);

            setDeck(shuffled);
            setCurrentIndex(0);
            setPrompt(mostLikelyPrompts[shuffled[0]]);
            return;
        }

        const next = currentIndex + 1;
        setCurrentIndex(next);
        setPrompt(mostLikelyPrompts[deck[next]]);
    };

    const handleNext = () => {
        playSound(); // 🔊 play sound at start

        Animated.parallel([
            Animated.timing(flipAnim, {
                toValue: 90,
                duration: 140,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: 140,
                useNativeDriver: true,
            }),
        ]).start(() => {
            getNextPrompt();

            Animated.parallel([
                Animated.timing(flipAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 90,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const rotateY = flipAnim.interpolate({
        inputRange: [0, 90],
        outputRange: ["0deg", "90deg"],
    });

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Most Likely</Text>
            </View>

            <View style={styles.center}>
                <Text style={styles.kicker}>Chess Party Mode</Text>

                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={handleNext}
                    style={styles.cardTouch}
                >
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                transform: [
                                    { perspective: 900 },
                                    { rotateY },
                                    { scale: scaleAnim },
                                ],
                            },
                        ]}
                    >
                        <Text style={styles.cardLabel}>MOST LIKELY TO...</Text>

                        <Text style={styles.prompt}>
                            {formatPrompt(prompt)}
                        </Text>
                    </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleNext}
                    style={styles.nextButton}
                >
                    <Text style={styles.nextButtonText}>
                        Tap for next card
                    </Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Pick the person who fits the prompt best ♟️
                </Text>
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
        alignItems: "center",
        paddingBottom: 60,
    },
    kicker: {
        color: "#3CF2FF",
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginBottom: 12,
    },
    cardTouch: {
        width: "100%",
    },
    card: {
        width: "100%",
        height: 260,
        borderRadius: 28,
        backgroundColor: "#071426",
        borderWidth: 2,
        borderColor: "#3CF2FF",
        paddingHorizontal: 24,
        paddingVertical: 20,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3CF2FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    cardLabel: {
        color: "#FFD166",
        fontSize: 13,
        fontWeight: "900",
        letterSpacing: 1.4,
        marginBottom: 18,
    },
    prompt: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "900",
        textAlign: "center",
        lineHeight: 32,
    },
    nextButton: {
        marginTop: 16,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#3CF2FF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
    },
    nextButtonText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "900",
    },
    hint: {
        color: "#B8C4D6",
        marginTop: 12,
        fontSize: 14,
        textAlign: "center",
    },
});