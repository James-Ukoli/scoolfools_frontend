import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function ReviewerLoginScreen({ navigation }: any) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReviewerLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Missing Info", "Please enter email and password.");
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok || !data?.token) {
                throw new Error(data?.message || "Reviewer login failed");
            }

            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("user", JSON.stringify(data.user));

            navigation.replace("MainTabs");
        } catch (error: any) {
            Alert.alert(
                "Login Failed",
                error?.message || "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View>
                    <Text style={styles.title}>Reviewer Login</Text>
                    <Text style={styles.subtitle}>
                        Sign in with the review credentials provided for Google Play.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#8E8E93"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoCorrect={false}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#8E8E93"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleReviewerLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.loginButtonText}>Log In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    disabled={loading}
                >
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#000",
    },
    container: {
        flex: 1,
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 28,
    },
    title: {
        color: "#39FF14",
        fontSize: 28,
        fontWeight: "800",
        marginBottom: 10,
        textAlign: "center",
        textShadowColor: "#39FF14",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        color: "#8EA0BF",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 28,
        lineHeight: 20,
    },
    input: {
        height: 56,
        borderRadius: 16,
        backgroundColor: "#111",
        borderWidth: 1,
        borderColor: "#2A2A2A",
        paddingHorizontal: 16,
        color: "#FFF",
        fontSize: 16,
        marginBottom: 14,
    },
    loginButton: {
        height: 56,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 6,
    },
    loginButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "700",
    },
    backButton: {
        alignSelf: "center",
        marginTop: 20,
    },
    backButtonText: {
        color: "#8EA0BF",
        fontSize: 14,
        textDecorationLine: "underline",
        fontWeight: "600",
    },
});