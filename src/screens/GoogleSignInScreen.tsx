import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ImageBackground,
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

const getOnboardingRoute = (
    onboardingStage?: "profile" | "introVideo" | "complete"
) => {
    switch (onboardingStage) {
        case "introVideo":
            return "IntroVideo";

        case "complete":
            return "MainTabs";

        case "profile":
        default:
            return "SetupProfile";
    }
};
export default function GoogleSignInScreen({ navigation }: any) {
    const [loadingProvider, setLoadingProvider] = useState<
        "google" | "apple" | null
    >(null);

    const openLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot open this link.");
            }
        } catch {
            Alert.alert(
                "Error",
                "Something went wrong while opening the link."
            );
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoadingProvider("google");

            await GoogleSignin.hasPlayServices();

            const response: any = await GoogleSignin.signIn();

            const googleUser =
                response?.data?.user ||
                response?.user ||
                response;

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

            const res = await fetch(
                `${API_BASE_URL}/api/auth/google`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();

            if (!res.ok || !data?.token) {
                throw new Error(
                    data?.message ||
                    "Backend Google authentication failed"
                );
            }

            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            const nextRoute = getOnboardingRoute(
                data.user?.onboardingStage
            );

            navigation.reset({
                index: 0,
                routes: [{ name: nextRoute }],
            });
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

            const credential =
                await AppleAuthentication.signInAsync({
                    requestedScopes: [
                        AppleAuthentication
                            .AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication
                            .AppleAuthenticationScope.EMAIL,
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
                    [
                        credential.fullName?.givenName,
                        credential.fullName?.familyName,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || null,
                avatar: "",
            };

            const res = await fetch(
                `${API_BASE_URL}/api/auth/apple`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();

            if (!res.ok || !data?.token) {
                throw new Error(
                    data?.message ||
                    "Backend Apple authentication failed"
                );
            }

            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            const nextRoute = getOnboardingRoute(
                data.user?.onboardingStage
            );

            navigation.reset({
                index: 0,
                routes: [{ name: nextRoute }],
            });
        } catch (error: any) {
            if (error?.code === "ERR_REQUEST_CANCELED") {
                return;
            }

            Alert.alert(
                "Apple Sign In Failed",
                error?.message || "Something went wrong."
            );
        } finally {
            setLoadingProvider(null);
        }
    };

    return (
        <ImageBackground
            source={require("../../assets/images/signupbackground5.png")}
            style={styles.background}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <View style={styles.spacer} />

                    <View style={styles.bottomSection}>
                        {Platform.OS === "ios" && (
                            <View style={styles.appleButtonWrapper}>
                                <AppleAuthentication.AppleAuthenticationButton
                                    buttonType={
                                        AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                                    }
                                    buttonStyle={
                                        AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                                    }
                                    cornerRadius={16}
                                    style={styles.appleButton}
                                    onPress={handleAppleSignIn}
                                />
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleSignIn}
                            disabled={loadingProvider !== null}
                            activeOpacity={0.85}
                        >
                            {loadingProvider === "google" ? (
                                <ActivityIndicator color="#000000" />
                            ) : (
                                <>
                                    <Image
                                        source={require("../../assets/images/googlelogo.png")}
                                        style={styles.googleIcon}
                                        resizeMode="contain"
                                    />

                                    <Text style={styles.googleButtonText}>
                                        Sign in with Google
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.legalText}>
                            By continuing, you agree to our{" "}
                            <Text
                                style={styles.linkText}
                                onPress={() => openLink(TERMS_URL)}
                            >
                                Terms
                            </Text>{" "}
                            and{" "}
                            <Text
                                style={styles.linkText}
                                onPress={() =>
                                    openLink(PRIVACY_POLICY_URL)
                                }
                            >
                                Privacy Policy
                            </Text>
                            .
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: "#06D7DE",
    },

    safeArea: {
        flex: 1,
    },

    container: {
        flex: 1,
        justifyContent: "space-between",
        paddingHorizontal: 24,
    },

    spacer: {
        flex: 1,
    },

    bottomSection: {
        paddingBottom: 5,
    },

    appleButton: {
        width: "100%",
        height: 56,

    },

    googleButton: {
        width: "100%",
        height: 56,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",

        shadowColor: "#FFFFFF",
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.65,
        shadowRadius: 12,
        elevation: 8,
    },

    googleIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },

    googleButtonText: {
        color: "#000000",
        fontSize: 16,
        fontWeight: "700",
    },

    legalText: {
        color: "#F7F7F7",
        fontSize: 11,
        lineHeight: 16,
        textAlign: "center",
        marginTop: 16,
        paddingHorizontal: 16,
        textShadowColor: "rgba(0, 0, 0, 0.35)",
        textShadowOffset: {
            width: 0,
            height: 1,
        },
        textShadowRadius: 3,
    },

    linkText: {
        color: "#FFFFFF",
        fontWeight: "800",
        textDecorationLine: "underline",
    },
    appleButtonWrapper: {
        borderRadius: 16,

        shadowColor: "#FFFFFF",
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.65,
        shadowRadius: 12,
        elevation: 8,

        marginBottom: 12,
    },


});