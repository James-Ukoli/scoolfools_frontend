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
import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

type BlogsPaywallModalProps = {
    visible: boolean;
    onClose: () => void;
    onSubscribe: () => void;
    loading?: boolean;
    localizedPrice?: string | null;
    billingPeriodLabel?: string;
    buttonLabel?: string;
    themeMode?: "day" | "night";
};

const CYAN = "#06B6D4";

export default function BlogsPaywallModal({
    visible,
    onClose,
    onSubscribe,
    loading = false,
    localizedPrice,
    billingPeriodLabel = "every 6 months",
    buttonLabel = "Unlock Supporter Access",
    themeMode = "day",
}: BlogsPaywallModalProps) {
    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const isNight =
        themeMode === "night";

    const theme = {
        backdrop: isNight
            ? "rgba(0,0,0,0.84)"
            : "rgba(2,6,23,0.62)",

        card: isNight
            ? "#0F172A"
            : "#FFFFFF",

        cardSoft: isNight
            ? "#07111F"
            : "#ECFEFF",

        text: isNight
            ? "#FFFFFF"
            : "#07111F",

        textSoft: isNight
            ? "#CBD5E1"
            : "#334155",

        muted: isNight
            ? "#94A3B8"
            : "#64748B",

        closeButton: isNight
            ? "#1E293B"
            : "#E2E8F0",

        border: isNight
            ? "rgba(34,211,238,0.38)"
            : "rgba(6,182,212,0.32)",

        cyan: isNight
            ? "#22D3EE"
            : CYAN,
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
                        {
                            backgroundColor:
                                theme.backdrop,
                        },
                    ]}
                    onPress={onClose}
                />

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor:
                                theme.card,

                            borderColor:
                                theme.cyan,

                            shadowColor:
                                theme.cyan,
                        },
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.closeButton,
                            {
                                backgroundColor:
                                    theme.closeButton,
                            },
                        ]}
                        onPress={onClose}
                        disabled={loading}
                    >
                        <Text
                            style={[
                                styles.closeButtonText,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                        >
                            ×
                        </Text>
                    </TouchableOpacity>

                    <View
                        style={[
                            styles.iconCircle,
                            {
                                backgroundColor:
                                    theme.cardSoft,

                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={styles.emoji}
                        >
                            🎓
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.title,
                            {
                                color:
                                    theme.text,

                                fontFamily:
                                    "Rajdhani_700Bold",
                            },
                        ]}
                    >
                        Unlock ScoolFools Benefits
                    </Text>

                    <View
                        style={[
                            styles.priceBox,
                            {
                                backgroundColor:
                                    theme.cardSoft,

                                borderColor:
                                    theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.priceEyebrow,
                                {
                                    color:
                                        theme.cyan,

                                    fontFamily:
                                        "Rajdhani_700Bold",
                                },
                            ]}
                        >
                            SCOOLFOOLS SUBSCRIBER
                        </Text>

                        <View
                            style={
                                styles.priceRow
                            }
                        >
                            <Text
                                style={[
                                    styles.price,
                                    {
                                        color:
                                            theme.text,

                                        fontFamily:
                                            "Rajdhani_700Bold",
                                    },
                                ]}
                            >
                                {localizedPrice ||
                                    "$3.99"}
                            </Text>

                            <Text
                                style={[
                                    styles.billingPeriod,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                {billingPeriodLabel}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={styles.benefits}
                    >
                        <BenefitRow
                            emoji="📝"
                            text="Unlock every exclusive blog"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="🎙️"
                            text="Listen to any article with AI narration"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="🔥"
                            text="Post up to 5 Student Dumps daily"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="📣"
                            text="Promote your social media on your Dumps"
                            color={theme.text}
                        />

                        <BenefitRow
                            emoji="💎"
                            text="Stand out with exclusive profile avatars"
                            color={theme.text}
                        />
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[
                            styles.subscribeButton,
                            {
                                backgroundColor:
                                    theme.cyan,

                                opacity: loading
                                    ? 0.75
                                    : 1,
                            },
                        ]}
                        onPress={onSubscribe}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator
                                color="#07111F"
                            />
                        ) : (
                            <Text
                                style={[
                                    styles.subscribeButtonText,
                                    {
                                        fontFamily:
                                            "Rajdhani_700Bold",
                                    },
                                ]}
                            >
                                {buttonLabel}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.finePrint,
                            {
                                color:
                                    theme.muted,
                            },
                        ]}
                    >
                        Auto-renews every six months. Cancel
                        anytime through your app store account.
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

function BenefitRow({
    emoji,
    text,
    color,
}: BenefitRowProps) {
    return (
        <View style={styles.benefitRow}>
            <Text
                style={styles.benefitEmoji}
            >
                {emoji}
            </Text>

            <Text
                style={[
                    styles.benefitText,
                    { color },
                ]}
            >
                {text}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
    },

    card: {
        width: "100%",
        maxWidth: 430,

        borderRadius: 24,
        borderWidth: 1.5,

        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 14,

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
        top: 10,
        right: 11,

        width: 30,
        height: 30,
        borderRadius: 15,

        alignItems: "center",
        justifyContent: "center",

        zIndex: 10,
    },

    closeButtonText: {
        fontSize: 23,
        lineHeight: 25,
        fontWeight: "700",
    },

    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,

        borderWidth: 1.5,

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 8,
    },

    emoji: {
        fontSize: 27,
    },

    title: {
        fontSize: 23,
        lineHeight: 26,
        letterSpacing: 0.4,
        textAlign: "center",
        marginBottom: 10,
    },

    priceBox: {
        width: "100%",

        borderRadius: 16,
        borderWidth: 1,

        paddingVertical: 8,
        paddingHorizontal: 14,

        alignItems: "center",

        marginBottom: 11,
    },

    priceEyebrow: {
        fontSize: 11.5,
        letterSpacing: 1,
        marginBottom: 2,
    },

    priceRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        flexWrap: "wrap",
    },

    price: {
        fontSize: 29,
        lineHeight: 33,
        letterSpacing: 0.4,
    },

    billingPeriod: {
        fontSize: 12,
        lineHeight: 22,
        fontWeight: "800",
        marginLeft: 6,
    },

    benefits: {
        width: "100%",
        marginBottom: 9,
    },

    benefitRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 7,
    },

    benefitEmoji: {
        width: 30,
        fontSize: 17,
        textAlign: "center",
        marginRight: 8,
    },

    benefitText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 17,
        fontWeight: "800",
    },

    subscribeButton: {
        width: "100%",
        height: 46,

        borderRadius: 15,

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 8,
    },

    subscribeButtonText: {
        color: "#07111F",
        fontSize: 16,
        letterSpacing: 0.4,
    },

    finePrint: {
        fontSize: 11,
        lineHeight: 14,
        textAlign: "center",
        fontWeight: "600",
        paddingHorizontal: 8,
    },
});