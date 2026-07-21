import React from "react";
import {
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TimeTheme = "day" | "night";

type Props = {
    children: React.ReactNode;
    themeMode?: TimeTheme;
};

export default function GameScreenWrapper({
    children,
    themeMode = "day",
}: Props) {
    const isNight = themeMode === "night";

    return (
        <SafeAreaView
            edges={["top"]}
            style={[
                styles.container,
                {
                    backgroundColor: isNight
                        ? "#000000"
                        : "#F8FAFC",
                },
            ]}
        >
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
});