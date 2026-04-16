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
import * as AppleAuthentication from "expo-apple-authentication";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const PRIVACY_POLICY_URL =
    "https://docs.google.com/document/d/1aouqTuruJxHGwKUf7yoNg3KgyZhksN9j9idc23HoQSE/edit?usp=sharing";

const TERMS_URL =
    "https://docs.google.com/document/d/157PCh_AwbA-Yd76I-5hDVmWCEaJva2Vsmh_X2CkdFN4/edit?usp=sharing";

export default function GoogleSignInScreen({ navigation }: any) {
    const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

    const openLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot open this link.");
            }
        } catch {
            Alert.alert("Error", "Something went wrong opening the link.");
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoadingProvider("google");

            await GoogleSignin.hasPlayServices();
            const response: any = await GoogleSignin.signIn();

            const googleUser =
                response?.data?.user || response?.user || response;

            if (!googleUser?.email || !googleUser?.id) {
                throw new Error("Missing Google user data");
            }

            const payload = {
                email: googleUser.email,
                username: googleUser.name || googleUser.email.split("@")[0],
                googleId: googleUser.id,
                avatar: googleUser.photo || "",
            };

            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data?.token) {
                throw new Error(data?.message || "Backend Google auth failed");
            }

            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("user", JSON.stringify(data.user));

            navigation.replace("MainTabs");
        } catch (error: any) {
            Alert.alert(
                "Google Sign In Failed",
                error?.message || "Something went wrong."
            );
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleAppleSignIn = async () => {
        try {
            setLoadingProvider("apple");

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential?.user || !credential?.identityToken) {
                throw new Error("Missing Apple credentials");
            }

            const payload = {
                appleId: credential.user,
                identityToken: credential.identityToken,
                email: credential.email || null,
                username:
                    [credential.fullName?.givenName, credential.fullName?.familyName]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || null,
                avatar: "",
            };

            const res = await fetch(`${API_BASE_URL}/api/auth/apple`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data?.token) {
                throw new Error(data?.message || "Backend Apple auth failed");
            }

            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("user", JSON.stringify(data.user));

            navigation.replace("MainTabs");
        } catch (error: any) {
            if (error?.code === "ERR_REQUEST_CANCELED") {
                Alert.alert("Apple Sign In Cancelled", "You cancelled sign in.");
            } else {
                Alert.alert(
                    "Apple Sign In Failed",
                    error?.message || "Something went wrong."
                );
            }
        } finally {
            setLoadingProvider(null);
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

                    <Text style={styles.headline}>
                        The #1 App to Follow the World of Chess ♟️
                    </Text>

                    <Text style={styles.subheadline}>
                        NEWS • BLOGS • ALERTS • RANKINGS
                    </Text>
                </View>

                <View style={styles.bottomSection}>
                    <Text style={styles.freeText}>
                        Sign up is free 🚀
                    </Text>

                    <Text style={styles.legalText}>
                        By continuing, you agree to our{" "}
                        <Text style={styles.linkText} onPress={() => openLink(TERMS_URL)}>
                            Terms
                        </Text>{" "}
                        and{" "}
                        <Text style={styles.linkText} onPress={() => openLink(PRIVACY_POLICY_URL)}>
                            Privacy Policy
                        </Text>
                        .
                    </Text>

                    {Platform.OS === "ios" && (
                        <AppleAuthentication.AppleAuthenticationButton
                            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                            cornerRadius={16}
                            style={styles.appleButton}
                            onPress={handleAppleSignIn}
                        />
                    )}

                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        disabled={loadingProvider !== null}
                    >
                        {loadingProvider === "google" ? (
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

                    <TouchableOpacity
                        style={styles.reviewerLinkButton}
                        onPress={() => navigation.navigate("ReviewerLogin")}
                        disabled={loadingProvider !== null}
                    >
                        {/* <Text style={styles.reviewerLinkText}>
                            Reviewer Login
                        </Text> */}
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
    },
    centerSection: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 240,
        height: 240,
    },
    headline: {
        color: "#39FF14",
        fontSize: 20,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 10,
        letterSpacing: 1.2,
        textShadowColor: "#39FF14",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subheadline: {
        color: "#8EA0BF",
        fontSize: 13,
        textAlign: "center",
        marginTop: 6,
        letterSpacing: 2,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    bottomSection: {
        paddingBottom: 28,
    },
    freeText: {
        color: "#FFFFFF",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 10,
        fontWeight: "600",
    },
    legalText: {
        color: "#8E8E93",
        fontSize: 12,
        textAlign: "center",
        marginBottom: 18,
    },
    linkText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    appleButton: {
        width: "100%",
        height: 56,
        marginBottom: 12,
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
    reviewerLinkButton: {
        marginTop: 14,
        alignSelf: "center",
    },
    reviewerLinkText: {
        color: "#8EA0BF",
        fontSize: 13,
        textDecorationLine: "underline",
        fontWeight: "600",
    },
});