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

export default function GameBackButton({
    themeMode = "day",
}: Props) {
    const navigation =
        useNavigation<any>();

    const isNight =
        themeMode === "night";

    return (
        <TouchableOpacity
            onPress={() =>
                navigation.goBack()
            }
            style={[
                styles.backButton,
                {
                    backgroundColor: isNight
                        ? "#0B1220"
                        : "#FFFFFF",

                    borderColor: isNight
                        ? "#16233B"
                        : "#D8E2EC",

                    shadowOpacity: isNight
                        ? 0
                        : 0.08,
                },
            ]}
            activeOpacity={0.8}
        >
            <Ionicons
                name="arrow-back"
                size={24}
                color={
                    isNight
                        ? "#FFFFFF"
                        : "#07111F"
                }
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,

        alignItems: "center",
        justifyContent: "center",

        borderWidth: 1,

        shadowColor: "#07111F",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowRadius: 7,

        elevation: 3,
    },
});