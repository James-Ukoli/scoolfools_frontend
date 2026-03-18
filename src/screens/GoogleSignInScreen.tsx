import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const PRIVACY_POLICY_URL =
    "https://docs.google.com/document/d/1aouqTuruJxHGwKUf7yoNg3KgyZhksN9j9idc23HoQSE/edit?usp=sharing";

const TERMS_URL =
    "https://docs.google.com/document/d/157PCh_AwbA-Yd76I-5hDVmWCEaJva2Vsmh_X2CkdFN4/edit?usp=sharing";

export default function GoogleSignInScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);

    const openLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot open this link.");
            }
        } catch (err) {
            Alert.alert("Error", "Something went wrong opening the link.");
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);

            console.log("API_BASE_URL EXACT:", JSON.stringify(API_BASE_URL));

            await GoogleSignin.hasPlayServices();
            const response: any = await GoogleSignin.signIn();

            const googleUser =
                response?.data?.user || response?.user || response;

            console.log("Google sign in response:", response);

            if (!googleUser?.email || !googleUser?.id) {
                throw new Error("Missing Google user data");
            }

            const payload = {
                email: googleUser.email,
                username:
                    googleUser.name ||
                    googleUser.email.split("@")[0],
                googleId: googleUser.id,
                avatar: googleUser.photo || "",
            };

            const url = `${API_BASE_URL}/api/auth/google`;

            console.log("FINAL URL EXACT:", JSON.stringify(url));
            console.log("PAYLOAD EXACT:", JSON.stringify(payload));

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            console.log("RESPONSE STATUS:", res.status);

            const rawText = await res.text();
            console.log("RAW RESPONSE TEXT:", rawText);

            let data;
            try {
                data = JSON.parse(rawText);
            } catch {
                throw new Error(`Non-JSON response: ${rawText}`);
            }

            console.log("BACKEND GOOGLE AUTH RESPONSE:", data);

            if (!res.ok || !data?.token) {
                throw new Error(data?.message || "Backend Google auth failed");
            }

            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("user", JSON.stringify(data.user));

            navigation.replace("MainTabs");
        } catch (error: any) {
            console.log("FETCH/G_AUTH FULL ERROR:", error);

            Alert.alert(
                "Google Sign In Failed",
                error?.message || "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.centerSection}>
                    <Image
                        source={require("../../assets/images/justmove-logo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.bottomSection}>
                    <Text style={styles.legalText}>
                        By continuing, you agree to our{" "}
                        <Text
                            style={styles.linkText}
                            onPress={() => openLink(TERMS_URL)}
                        >
                            Terms and Conditions
                        </Text>{" "}
                        and{" "}
                        <Text
                            style={styles.linkText}
                            onPress={() => openLink(PRIVACY_POLICY_URL)}
                        >
                            Privacy Policy
                        </Text>
                        .
                    </Text>

                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <Image
                                    source={require("../../assets/images/googlelogo.png")}
                                    style={styles.googleIcon}
                                />
                                <Text style={styles.googleButtonText}>
                                    Sign in with Google
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
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
        backgroundColor: "#000",
    },
    centerSection: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 260,
        height: 260,
    },
    bottomSection: {
        paddingBottom: 28,
    },
    legalText: {
        color: "#8E8E93",
        fontSize: 12,
        textAlign: "center",
        marginBottom: 18,
        lineHeight: 18,
    },
    linkText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    googleButton: {
        height: 56,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    googleIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    googleButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "700",
    },
});