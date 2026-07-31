import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    Rajdhani_700Bold,
    useFonts,
} from "@expo-google-fonts/rajdhani";

import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { mostLikelyPrompts } from "../../../../assets/data/mostlikely";

const THEME_MODE = "night" as const;

export default function MostLikelyScreen() {
    const insets = useSafeAreaInsets();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const bottomSafePadding =
        Platform.OS === "android"
            ? Math.max(insets.bottom + 50, 80)
            : insets.bottom + 34;

    const [deck, setDeck] = useState<number[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [prompt, setPrompt] = useState("");

    const flipAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const soundRef = useRef<Audio.Sound | null>(null);

    const shuffle = (array: number[]) => {
        const shuffledArray = [...array];

        for (let index = shuffledArray.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(
                Math.random() * (index + 1),
            );

            [shuffledArray[index], shuffledArray[randomIndex]] = [
                shuffledArray[randomIndex],
                shuffledArray[index],
            ];
        }

        return shuffledArray;
    };

    const formatPrompt = (text: string) => {
        if (!text) {
            return "Loading...";
        }

        const cleaned = text
            .replace(/^who is most likely to\s*/i, "")
            .replace(/\?$/, "")
            .trim();

        return (
            cleaned.charAt(0).toUpperCase() +
            cleaned.slice(1)
        );
    };

    useEffect(() => {
        const indices = mostLikelyPrompts.map(
            (_, index) => index,
        );

        const shuffled = shuffle(indices);

        setDeck(shuffled);
        setPrompt(mostLikelyPrompts[shuffled[0]]);

        void loadSound();

        return () => {
            void unloadSound();
        };
    }, []);

    const loadSound = async () => {
        try {
            const { sound } =
                await Audio.Sound.createAsync(
                    require("../../../../assets/sounds/card-flip.mp3"),
                );

            soundRef.current = sound;
        } catch (error) {
            console.log(
                "Most Likely sound load error:",
                error,
            );
        }
    };

    const unloadSound = async () => {
        try {
            await soundRef.current
                ?.stopAsync()
                .catch(() => { });

            await soundRef.current
                ?.unloadAsync()
                .catch(() => { });

            soundRef.current = null;
        } catch (error) {
            console.log(
                "Most Likely sound unload error:",
                error,
            );
        }
    };

    const playSound = async () => {
        try {
            if (!soundRef.current) {
                return;
            }

            await soundRef.current.replayAsync();
        } catch (error) {
            console.log(
                "Most Likely sound error:",
                error,
            );
        }
    };

    const getNextPrompt = () => {
        if (deck.length === 0) {
            return;
        }

        if (currentIndex >= deck.length - 1) {
            const indices = mostLikelyPrompts.map(
                (_, index) => index,
            );

            const shuffled = shuffle(indices);

            setDeck(shuffled);
            setCurrentIndex(0);
            setPrompt(mostLikelyPrompts[shuffled[0]]);
            return;
        }

        const nextIndex = currentIndex + 1;

        setCurrentIndex(nextIndex);
        setPrompt(mostLikelyPrompts[deck[nextIndex]]);
    };

    const handleNext = () => {
        void playSound();

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

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GameScreenWrapper themeMode={THEME_MODE}>
            <View style={styles.topRow}>
                <GameBackButton themeMode={THEME_MODE} />

                <View style={styles.headerCopy}>
                    <Text style={styles.eyebrow}>
                        PARTY GAMES
                    </Text>

                    <Text style={styles.screenTitle}>
                        Most Likely
                    </Text>
                </View>

                <View style={styles.headerIcon}>
                    <Ionicons
                        name="people-outline"
                        size={22}
                        color="#C084FC"
                    />
                </View>
            </View>

            <View
                style={[
                    styles.center,
                    {
                        paddingBottom: bottomSafePadding,
                    },
                ]}
            >
                <View style={styles.modePill}>
                    <Ionicons
                        name="hand-left-outline"
                        size={16}
                        color="#C084FC"
                    />

                    <Text style={styles.kicker}>
                        Point to your pick
                    </Text>
                </View>

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
                                    {
                                        perspective: 900,
                                    },
                                    {
                                        rotateY,
                                    },
                                    {
                                        scale: scaleAnim,
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.cardIcon}>
                            <Ionicons
                                name="people"
                                size={27}
                                color="#C084FC"
                            />
                        </View>

                        <Text style={styles.cardLabel}>
                            MOST LIKELY TO...
                        </Text>

                        <Text style={styles.prompt}>
                            {formatPrompt(prompt)}
                        </Text>

                        <View style={styles.tapHint}>
                            <Ionicons
                                name="finger-print-outline"
                                size={16}
                                color="#CBD5E1"
                            />

                            <Text style={styles.tapHintText}>
                                Tap card for next prompt
                            </Text>
                        </View>
                    </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleNext}
                    style={styles.nextButton}
                >
                    <Text style={styles.nextButtonText}>
                        Next Card
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#12051B"
                    />
                </TouchableOpacity>

                <View style={styles.hintCard}>
                    <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color="#C084FC"
                    />

                    <Text style={styles.hint}>
                        Read the prompt, then point to the person
                        who fits it best.
                    </Text>
                </View>
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

    headerCopy: {
        flex: 1,
        marginLeft: 14,
    },

    eyebrow: {
        color: "#C084FC",
        fontSize: 11,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.8,
    },

    screenTitle: {
        color: "#FFFFFF",
        fontSize: 28,
        lineHeight: 30,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        marginTop: -2,
    },

    headerIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(192,132,252,0.09)",

        borderWidth: 1,
        borderColor: "rgba(192,132,252,0.32)",
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    modePill: {
        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "rgba(192,132,252,0.08)",

        borderWidth: 1,
        borderColor: "rgba(192,132,252,0.28)",
        borderRadius: 999,

        paddingHorizontal: 12,
        paddingVertical: 7,

        marginBottom: 14,
    },

    kicker: {
        color: "#C084FC",

        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",

        letterSpacing: 1.2,
        textTransform: "uppercase",

        marginLeft: 7,
    },

    cardTouch: {
        width: "100%",
    },

    card: {
        width: "100%",
        minHeight: 280,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#0A0712",

        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: "rgba(192,132,252,0.56)",

        paddingHorizontal: 24,
        paddingVertical: 22,

        shadowColor: "#C084FC",
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.28,
        shadowRadius: 17,

        elevation: 8,
    },

    cardIcon: {
        width: 54,
        height: 54,
        borderRadius: 18,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(192,132,252,0.11)",

        borderWidth: 1,
        borderColor: "rgba(192,132,252,0.34)",

        marginBottom: 16,
    },

    cardLabel: {
        color: "#C084FC",

        fontSize: 13,

        fontFamily: "Rajdhani_700Bold",

        letterSpacing: 1.5,

        marginBottom: 17,
    },

    prompt: {
        color: "#FFFFFF",

        fontSize: 27,
        lineHeight: 34,

        fontFamily: "Rajdhani_700Bold",

        textAlign: "center",
    },

    tapHint: {
        flexDirection: "row",
        alignItems: "center",

        marginTop: 22,
    },

    tapHintText: {
        color: "#CBD5E1",

        fontSize: 12.5,

        marginLeft: 7,
    },

    nextButton: {
        width: "100%",
        height: 56,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#C084FC",

        borderRadius: 18,

        marginTop: 17,

        shadowColor: "#C084FC",
        shadowOpacity: 0.24,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 6,
    },

    nextButtonText: {
        color: "#12051B",

        fontSize: 18,

        fontFamily: "Rajdhani_700Bold",

        letterSpacing: 0.4,

        marginRight: 8,
    },

    hintCard: {
        width: "100%",

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#070B14",

        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",

        paddingHorizontal: 13,
        paddingVertical: 11,

        marginTop: 12,
    },

    hint: {
        flex: 1,

        color: "#CBD5E1",

        marginLeft: 8,

        fontSize: 13,
        lineHeight: 18,
    },
});