import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function GameHomeButton() {
    const navigation = useNavigation<any>();

    return (
        <TouchableOpacity
            style={styles.homeButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
        >
            <Ionicons name="home" size={20} color="#FFFFFF" />
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
        backgroundColor: "#0B1A4A",
        borderWidth: 1.5,
        borderColor: "#1C3D8F",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 8,
    },
});