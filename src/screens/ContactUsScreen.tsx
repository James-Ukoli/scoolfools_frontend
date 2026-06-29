import React, { useRef, useState } from "react";
import {
    Alert,
    Animated,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Clipboard from "expo-clipboard";
import AppHeader from "../components/AppHeader";
import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

const CONTACT_EMAIL = "justmovechess@gmail.com";

const socials = [
    { label: "Twitter", icon: "x-twitter", url: "https://x.com/JustMoveChess" },
    { label: "Instagram", icon: "instagram", url: "https://instagram.com/JustMoveChess" },
    { label: "YouTube", icon: "youtube", url: "https://youtube.com/@JustMoveChess" },
    { label: "Facebook", icon: "facebook", url: "https://facebook.com/JustMoveChess" },
];

export default function ContactUsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const toastAnim = useRef(new Animated.Value(0)).current;
    const [toastVisible, setToastVisible] = useState(false);

    const showFacebookToast = () => {
        setToastVisible(true);

        Animated.sequence([
            Animated.timing(toastAnim, {
                toValue: 1,
                duration: 260,
                useNativeDriver: true,
            }),
            Animated.delay(2200),
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 260,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setToastVisible(false);
        });
    };

    const handleCopyEmail = async () => {
        try {
            await Clipboard.setStringAsync(CONTACT_EMAIL);
            Alert.alert("Copied", "Email copied to clipboard.");
        } catch (error) {
            Alert.alert("Error", "Failed to copy email.");
        }
    };

    const handleOpenEmail = () => {
        Linking.openURL(`mailto:${CONTACT_EMAIL}`);
    };

    const handleBlogPitch = () => {
        Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Just Move Blog Pitch`);
    };

    const handleFeedback = () => {
        Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Just Move Feedback`);
    };

    const handleOpenLink = async (url: string, label: string) => {
        if (label === "Facebook") {
            showFacebookToast();
            return;
        }

        try {
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert("Error", "Unable to open this link.");
        }
    };

    if (!fontsLoaded) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <AppHeader />
            </SafeAreaView>
        );
    }

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

                    <View>
                        <Text style={styles.eyebrow}>JUST MOVE</Text>
                        <Text style={styles.screenTitle}>Contact Us</Text>
                    </View>
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
                            <TouchableOpacity style={styles.primaryButton} onPress={handleCopyEmail}>
                                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Copy Email</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenEmail}>
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

                        <TouchableOpacity style={styles.fullButton} onPress={handleBlogPitch}>
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
                                    onPress={() => handleOpenLink(item.url, item.label)}
                                >
                                    <FontAwesome6 name={item.icon as any} size={20} color="#3CF2FF" />
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

                        <TouchableOpacity style={styles.fullButton} onPress={handleFeedback}>
                            <Text style={styles.fullButtonText}>Send Feedback</Text>
                            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

            {toastVisible && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.toast,
                        {
                            bottom: Platform.OS === "android" ? 34 + insets.bottom : 28 + insets.bottom,
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [30, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <FontAwesome6 name="facebook" size={18} color="#3CF2FF" />
                    <Text style={styles.toastText}>We’ll have a Facebook page soon.</Text>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000000" },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
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
    eyebrow: {
        color: "#3CF2FF",
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.8,
    },
    screenTitle: {
        color: "#FFFFFF",
        fontSize: 31,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.45,
        marginTop: -2,
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
    emailRow: { flexDirection: "row", alignItems: "center" },
    emailTextWrap: { flex: 1, marginLeft: 12 },
    label: {
        color: "#8A8F98",
        fontSize: 13,
        marginBottom: 5,
    },
    emailText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
    },
    buttonRow: { flexDirection: "row", gap: 12, marginTop: 18 },
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
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
    },
    secondaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
    },
    cardTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
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
        fontSize: 16,
        fontFamily: "Rajdhani_700Bold",
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
        fontSize: 16,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },
    toast: {
        position: "absolute",
        left: 18,
        right: 18,
        minHeight: 58,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(10, 18, 30, 0.96)",
        borderWidth: 1,
        borderColor: "rgba(60,242,255,0.28)",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
        zIndex: 9999,
    },
    toastText: {
        flex: 1,
        marginLeft: 10,
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },
});