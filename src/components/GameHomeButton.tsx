import React from "react";
import {
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

type TimeTheme = "day" | "night";

type Props = {
    themeMode?: TimeTheme;
};

export default function GameHomeButton({
    themeMode = "day",
}: Props) {
    const navigation =
        useNavigation<any>();

    const isNight =
        themeMode === "night";

    return (
        <TouchableOpacity
            style={[
                styles.homeButton,
                {
                    backgroundColor: isNight
                        ? "#0B1A4A"
                        : "#06B6D4",

                    borderColor: isNight
                        ? "#1C3D8F"
                        : "#0891B2",

                    shadowColor: isNight
                        ? "#000000"
                        : "#06B6D4",
                },
            ]}
            activeOpacity={0.85}
            onPress={() =>
                navigation.navigate(
                    "MainTabs",
                    {
                        screen: "Home",
                    }
                )
            }
        >
            <Ionicons
                name="home"
                size={20}
                color="#FFFFFF"
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    homeButton: {
        width: 58,
        height: 58,
        borderRadius: 29,

        alignItems: "center",
        justifyContent: "center",

        borderWidth: 1.5,

        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.28,
        shadowRadius: 8,

        elevation: 8,
    },
});