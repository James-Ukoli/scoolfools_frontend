import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import GameBackButton from "../../../components/GameBackButton";
import GameScreenWrapper from "../../../components/GameScreenWrapper";
import { mostLikelyPrompts } from "../../../../assets/data/mostlikely";

export default function MostLikelyScreen() {
    const [index, setIndex] = useState(0);

    const handleNext = () => {
        setIndex((prev) => (prev + 1) % mostLikelyPrompts.length);
    };

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Most Likely</Text>
            </View>

            <View style={styles.center}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.card}
                    onPress={handleNext}
                >
                    <Text style={styles.prompt}>
                        {mostLikelyPrompts[index]}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Tap card to continue
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
    card: {
        width: "100%",
        minHeight: 260,
        borderRadius: 28,
        backgroundColor: "#050816",
        borderWidth: 1.5,
        borderColor: "#1A2A4A",
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    prompt: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        lineHeight: 30,
    },
    hint: {
        color: "#7A8599",
        marginTop: 18,
        fontSize: 13,
    },
});