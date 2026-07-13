import React from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useFonts, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";

type BlogsPaywallModalProps = {
    visible: boolean;
    onClose: () => void;
    onSubscribe: () => void;
    loading?: boolean;
    localizedPrice?: string | null;
    billingPeriodLabel?: string;
    trialLabel?: string;
    themeMode?: "day" | "night";
};

const CYAN = "#06B6D4";

export default function BlogsPaywallModal({
    visible,
    onClose,
    onSubscribe,
    loading = false,
    localizedPrice,
    billingPeriodLabel = "semester",
    trialLabel = "Start Your Free Trial",
    themeMode = "day",
}: BlogsPaywallModalProps) {
    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const isNight = themeMode === "night";

    const theme = {
        backdrop: isNight ? "rgba(0,0,0,0.84)" : "rgba(2,6,23,0.62)",
        card: isNight ? "#0F172A" : "#FFFFFF",
        cardSoft: isNight ? "#07111F" : "#ECFEFF",
        text: isNight ? "#FFFFFF" : "#07111F",
        textSoft: isNight ? "#CBD5E1" : "#334155",
        muted: isNight ? "#94A3B8" : "#64748B",
        closeButton: isNight ? "#1E293B" : "#E2E8F0",
        border: isNight
            ? "rgba(34,211,238,0.38)"
            : "rgba(6,182,212,0.32)",
        cyan: isNight ? "#22D3EE" : CYAN,
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: theme.backdrop },
                    ]}
                    onPress={onClose}
                />

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.card,
                            borderColor: theme.cyan,
                            shadowColor: theme.cyan,
                        },
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.closeButton,
                            { backgroundColor: theme.closeButton },
                        ]}
                        onPress={onClose}
                        disabled={loading}
                    >
                        <Text
                            style={[
                                styles.closeButtonText,
                                { color: theme.text },
                            ]}
                        >
                            ×
                        </Text>
                    </TouchableOpacity>

                    <View
                        style={[
                            styles.iconCircle,
                            {
                                backgroundColor: theme.cardSoft,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text style={styles.emoji}>🎓</Text>
                    </View>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text,
                                fontFamily: "Rajdhani_700Bold",
                            },
                        ]}
                    >
                        Unlock ScoolFools Blogs
                    </Text>

                    <Text
                        style={[
                            styles.subtitle,
                            { color: theme.textSoft },
                        ]}
                    >
                        Get access to exclusive student blogs, campus stories,
                        cheat codes, and campus culture.
                    </Text>

                    <View
                        style={[
                            styles.priceBox,
                            {
                                backgroundColor: theme.cardSoft,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.priceEyebrow,
                                {
                                    color: theme.cyan,
                                    fontFamily: "Rajdhani_700Bold",
                                },
                            ]}
                        >
                            STUDENT ACCESS
                        </Text>

                        <View style={styles.priceRow}>
                            <Text
                                style={[
                                    styles.price,
                                    {
                                        color: theme.text,
                                        fontFamily: "Rajdhani_700Bold",
                                    },
                                ]}
                            >
                                {localizedPrice || "$4.99"}
                            </Text>

                            <Text
                                style={[
                                    styles.billingPeriod,
                                    { color: theme.muted },
                                ]}
                            >
                                /{billingPeriodLabel}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.benefits}>
                        <BenefitRow
                            emoji="✍️"
                            text="Exclusive student-written blogs"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="📖"
                            text="Campus stories and student submissions"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="🎮"
                            text="Student cheat codes and useful resources"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="🏫"
                            text="Campus culture from schools everywhere"
                            color={theme.text}
                        />
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[
                            styles.subscribeButton,
                            {
                                backgroundColor: theme.cyan,
                                opacity: loading ? 0.75 : 1,
                            },
                        ]}
                        onPress={onSubscribe}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#07111F" />
                        ) : (
                            <Text
                                style={[
                                    styles.subscribeButtonText,
                                    {
                                        fontFamily: "Rajdhani_700Bold",
                                    },
                                ]}
                            >
                                {trialLabel}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.finePrint,
                            { color: theme.muted },
                        ]}
                    >
                        Cancel anytime. Your subscription renews automatically
                        unless canceled.
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

type BenefitRowProps = {
    emoji: string;
    text: string;
    color: string;
};

function BenefitRow({ emoji, text, color }: BenefitRowProps) {
    return (
        <View style={styles.benefitRow}>
            <Text style={styles.benefitEmoji}>{emoji}</Text>
            <Text style={[styles.benefitText, { color }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 22,
    },

    card: {
        width: "100%",
        maxWidth: 430,
        borderRadius: 28,
        borderWidth: 1.5,
        paddingHorizontal: 22,
        paddingTop: 26,
        paddingBottom: 20,
        alignItems: "center",
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 14,
    },

    closeButton: {
        position: "absolute",
        top: 12,
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },

    closeButtonText: {
        fontSize: 26,
        lineHeight: 28,
        fontWeight: "700",
    },

    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },

    emoji: {
        fontSize: 38,
    },

    title: {
        fontSize: 28,
        lineHeight: 31,
        letterSpacing: 0.4,
        textAlign: "center",
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 18,
        paddingHorizontal: 4,
    },

    priceBox: {
        width: "100%",
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: "center",
        marginBottom: 18,
    },

    priceEyebrow: {
        fontSize: 13,
        letterSpacing: 1,
        marginBottom: 2,
    },

    priceRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
    },

    price: {
        fontSize: 34,
        lineHeight: 39,
        letterSpacing: 0.4,
    },

    billingPeriod: {
        fontSize: 14,
        lineHeight: 26,
        fontWeight: "800",
        marginLeft: 3,
    },

    benefits: {
        width: "100%",
        marginBottom: 18,
    },

    benefitRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 11,
    },

    benefitEmoji: {
        width: 30,
        fontSize: 18,
        textAlign: "center",
        marginRight: 8,
    },

    benefitText: {
        flex: 1,
        fontSize: 13.5,
        lineHeight: 18,
        fontWeight: "800",
    },

    subscribeButton: {
        width: "100%",
        height: 52,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },

    subscribeButtonText: {
        color: "#07111F",
        fontSize: 17,
        letterSpacing: 0.4,
    },

    finePrint: {
        fontSize: 11,
        lineHeight: 16,
        textAlign: "center",
        fontWeight: "600",
        paddingHorizontal: 8,
    },
});