import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function IntroVideoScreen({ navigation }: any) {
    const handleReset = async () => {
        try {
            await AsyncStorage.multiRemove(["token", "user"]);

            navigation.reset({
                index: 0,
                routes: [{ name: "GoogleSignIn" }],
            });
        } catch (error) {
            console.log(error);

            Alert.alert(
                "Error",
                "Failed to reset login."
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>
                    Welcome to ScoolFools
                </Text>

                <Text style={styles.subtitle}>
                    The intro video screen will be built after
                    profile setup.
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleReset}
                    activeOpacity={0.85}
                >
                    <Text style={styles.buttonText}>
                        Reset Login (Temporary)
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#06B6D4",
    },

    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    title: {
        color: "#07111F",
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
    },

    subtitle: {
        color: "#07111F",
        fontSize: 16,
        marginTop: 10,
        marginBottom: 40,
        textAlign: "center",
    },

    button: {
        backgroundColor: "#FACC15",
        paddingHorizontal: 28,
        height: 54,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },

    buttonText: {
        color: "#07111F",
        fontSize: 16,
        fontWeight: "900",
    },
});