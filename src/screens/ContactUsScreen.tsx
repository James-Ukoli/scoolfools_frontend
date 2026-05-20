import React from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import AppHeader from "../components/AppHeader";

const CONTACT_EMAIL = "justmovechess@gmail.com";

export default function ContactUsScreen() {
    const navigation = useNavigation<any>();

    const handleCopyEmail = async () => {
        try {
            await Clipboard.setStringAsync(CONTACT_EMAIL);
            Alert.alert("Copied", "Email copied to clipboard.");
        } catch (error) {
            console.log("Copy email error:", error);
            Alert.alert("Error", "Failed to copy email.");
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader />

            <View style={styles.content}>
                <View>
                    <View style={styles.topRow}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <Text style={styles.screenTitle}>Contact Us</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.section}>
                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={22} color="#3CF2FF" />

                                <View style={styles.textWrap}>
                                    <Text style={styles.label}>Email</Text>
                                    <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.copyButton}
                                    activeOpacity={0.8}
                                    onPress={handleCopyEmail}
                                >
                                    <Ionicons
                                        name="copy-outline"
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <Text style={styles.bodyText}>
                                For app support, business inquiries, feedback, or
                                corrections, contact Just Move using the email above.
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomButtonWrap}>
                    <TouchableOpacity
                        style={styles.homeButton}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                    >
                        <Ionicons name="home" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === "android" ? 110 : 28,
        justifyContent: "space-between",
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        marginRight: 12,
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "700",
    },
    card: {
        backgroundColor: "#050816",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#12203A",
        overflow: "hidden",
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 18,
    },
    divider: {
        height: 1,
        backgroundColor: "#12203A",
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    textWrap: {
        marginLeft: 12,
        flex: 1,
    },
    label: {
        color: "#8A8F98",
        fontSize: 13,
        marginBottom: 6,
    },
    emailText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    copyButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 12,
    },
    bodyText: {
        color: "#D7DBE3",
        fontSize: 15,
        lineHeight: 24,
    },
    bottomButtonWrap: {
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: Platform.OS === "android" ? 0 : 0,
    },
    homeButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#101A33",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        alignItems: "center",
        justifyContent: "center",
    },
});