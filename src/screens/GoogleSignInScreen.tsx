import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

export default function GoogleSignInScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);

            const response: any = await GoogleSignin.signIn();

            const user = response?.data?.user || response?.user || response;

            console.log("Google sign in response:", response);

            // temporary direct navigation test
            navigation.replace("MainTabs");

        } catch (error: any) {
            console.log("Google sign in error:", error);
            Alert.alert("Google Sign In Failed", error?.message || "Something went wrong.");
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
                        <Text style={styles.linkText}>Terms and Conditions</Text> and{" "}
                        <Text style={styles.linkText}>Privacy Policy</Text>.
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
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
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