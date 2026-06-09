import React from "react";
import {
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Clipboard from "expo-clipboard";
import AppHeader from "../components/AppHeader";

const CONTACT_EMAIL = "justmovechess@gmail.com";

const socials = [
    {
        label: "Twitter",
        icon: "x-twitter",
        url: "https://x.com/JustMoveChess",
    },
    {
        label: "Instagram",
        icon: "instagram",
        url: "https://instagram.com/JustMoveChess",
    },
    {
        label: "YouTube",
        icon: "youtube",
        url: "https://youtube.com/@JustMoveChess",
    },
    // {
    //     label: "TikTok",
    //     icon: "tiktok",
    //     url: "https://tiktok.com/@JustMoveChess",
    // },
    {
        label: "Facebook",
        icon: "facebook",
        url: "https://facebook.com/JustMoveChess",
    },
];

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

    const handleOpenEmail = () => {
        Linking.openURL(`mailto:${CONTACT_EMAIL}`);
    };

    const handleBlogPitch = () => {
        Linking.openURL(
            `mailto:${CONTACT_EMAIL}?subject=Just Move Blog Pitch`
        );
    };

    const handleFeedback = () => {
        Linking.openURL(
            `mailto:${CONTACT_EMAIL}?subject=Just Move Feedback`
        );
    };

    const handleOpenLink = async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.log("Open social error:", error);
            Alert.alert("Error", "Unable to open this link.");
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader />

            <View style={styles.content}>
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

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Text style={styles.subtitle}>
                        Support, feedback, partnerships, corrections, or blog submissions.
                    </Text>

                    <View style={styles.card}>
                        <View style={styles.emailRow}>
                            <Ionicons name="mail-outline" size={24} color="#3CF2FF" />

                            <View style={styles.emailTextWrap}>
                                <Text style={styles.label}>Email</Text>
                                <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
                            </View>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleCopyEmail}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Copy Email</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={handleOpenEmail}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="send-outline" size={18} color="#3CF2FF" />
                                <Text style={styles.secondaryButtonText}>Email Us</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Want to write for Just Move?</Text>

                        <Text style={styles.bodyText}>
                            Submit blog ideas, opinion pieces, tournament reports, interviews,
                            or stories that help grow the game of chess.
                        </Text>

                        <TouchableOpacity
                            style={styles.fullButton}
                            onPress={handleBlogPitch}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.fullButtonText}>Submit a Blog Pitch</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Follow @JustMoveChess</Text>

                        <View style={styles.socialGrid}>
                            {socials.map((item) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={styles.socialButton}
                                    onPress={() => handleOpenLink(item.url)}
                                    activeOpacity={0.85}
                                >
                                    <FontAwesome6
                                        name={item.icon as any}
                                        size={20}
                                        color="#3CF2FF"
                                    />
                                    <Text style={styles.socialText}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Help Push Chess Forward</Text>

                        <Text style={styles.bodyText}>
                            Have an idea for improving professional, collegiate, scholastic,
                            or casual chess? We'd love to hear from you.
                        </Text>

                        <TouchableOpacity
                            style={styles.fullButton}
                            onPress={handleFeedback}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.fullButtonText}>Send Feedback</Text>
                            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        marginRight: 12,
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 26,
        fontWeight: "800",
    },
    subtitle: {
        color: "#9CA3AF",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 18,
    },
    scrollContent: {
        paddingBottom: Platform.OS === "android" ? 120 : 90,
    },
    card: {
        backgroundColor: "#050816",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#12203A",
        padding: 18,
        marginBottom: 16,
    },
    emailRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    emailTextWrap: {
        flex: 1,
        marginLeft: 12,
    },
    label: {
        color: "#8A8F98",
        fontSize: 13,
        marginBottom: 5,
    },
    emailText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 18,
    },
    primaryButton: {
        flex: 1,
        height: 46,
        borderRadius: 15,
        backgroundColor: "#0B1A4A",
        borderWidth: 1,
        borderColor: "#1C3D8F",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
    },
    secondaryButton: {
        flex: 1,
        height: 46,
        borderRadius: 15,
        backgroundColor: "#07101F",
        borderWidth: 1,
        borderColor: "#12203A",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    secondaryButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
    },
    cardTitle: {
        color: "#FFFFFF",
        fontSize: 19,
        fontWeight: "800",
        marginBottom: 10,
    },
    bodyText: {
        color: "#D7DBE3",
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 16,
    },
    fullButton: {
        height: 48,
        borderRadius: 16,
        backgroundColor: "#0B1A4A",
        borderWidth: 1,
        borderColor: "#1C3D8F",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    fullButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },
    socialGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    socialButton: {
        width: "47%",
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: "#07101F",
        borderWidth: 1,
        borderColor: "#12203A",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    socialText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
});