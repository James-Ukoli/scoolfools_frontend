// src/screens/games/GamesPaywallScreen.tsx

import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useFonts, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";

import GameScreenWrapper from "../../components/GameScreenWrapper";
import GameBackButton from "../../components/GameBackButton";

import {
    initializeIAP,
    getGamesPackProduct,
    buyGamesPack,
    setupPurchaseListeners,
    cleanupIAP,
} from "../../services/iap";

const THEME_MODE = "night" as const;

type FeatureRowProps = {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
};

export default function GamesPaywallScreen() {
    const navigation = useNavigation<any>();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        void initialize();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => {
                try {
                    await fetch(
                        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/me/unlock-games`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                            },
                        },
                    );

                    Alert.alert(
                        "Purchase Successful 🎉",
                        "All ScoolFools Party Games have been unlocked.",
                    );

                    navigation.goBack();
                } catch (error) {
                    console.log("Unlock API error:", error);
                }
            },

            onGamesPackSuccess: async () => { },

            onBlogsSubscriptionSuccess: async () => { },

            onPurchaseError: (error: any) => {
                setLoading(false);
                console.log("Purchase listener error:", error);
            },
        });

        return () => {
            void cleanupIAP();
        };
    }, [navigation]);

    const initialize = async () => {
        try {
            setLoading(true);

            await initializeIAP();

            const fetchedProduct = await getGamesPackProduct();

            setProduct(fetchedProduct);
        } catch (error) {
            console.log("Paywall init error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        try {
            setLoading(true);
            await buyGamesPack();
        } catch (error) {
            console.log("Purchase error:", error);

            Alert.alert(
                "Purchase Failed",
                "Something went wrong while processing your purchase.",
            );

            setLoading(false);
        }
    };

    if (!fontsLoaded) {
        return (
            <GameScreenWrapper themeMode={THEME_MODE}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#22D3EE" />
                </View>
            </GameScreenWrapper>
        );
    }

    const localizedPrice = product?.localizedPrice || "$4.99";

    return (
        <GameScreenWrapper themeMode={THEME_MODE}>
            <View style={styles.screen}>
                <View style={styles.topRow}>
                    <GameBackButton themeMode={THEME_MODE} />

                    <View style={styles.headerCopy}>
                        <Text style={styles.eyebrow}>SCOOLFOOLS</Text>
                        <Text style={styles.headerTitle}>Party Games</Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.heroSection}>
                        <View style={styles.heroIconWrap}>
                            <Ionicons
                                name="game-controller"
                                size={38}
                                color="#22D3EE"
                            />
                        </View>

                        <Text style={styles.title}>
                            Unlock All Party Games
                        </Text>

                        <Text style={styles.subtitle}>
                            Get all three ScoolFools group games with one
                            purchase. No subscription.
                        </Text>
                    </View>

                    <View style={styles.gamesSection}>
                        <FeatureRow
                            title="Study Break Charades"
                            description="Act out student life, school moments, and funny situations."
                            icon="body-outline"
                            color="#22D3EE"
                        />

                        <FeatureRow
                            title="Most Likely"
                            description="Read the prompt and point to the person who fits it best."
                            icon="people-outline"
                            color="#C084FC"
                        />

                        <FeatureRow
                            title="Impostor"
                            description="Find the player who did not receive the secret word."
                            icon="eye-outline"
                            color="#FF4D4D"
                        />
                    </View>

                    <View style={styles.priceSection}>
                        <Text style={styles.onlyText}>ONLY</Text>

                        <Text style={styles.price}>
                            {localizedPrice}
                        </Text>

                        <View style={styles.purchaseTypeRow}>
                            <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#39FF14"
                            />

                            <Text style={styles.priceSubtext}>
                                One-time purchase
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.purchaseButton,
                            loading && styles.purchaseButtonDisabled,
                        ]}
                        activeOpacity={0.86}
                        onPress={handlePurchase}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#031007" />
                        ) : (
                            <>
                                <Ionicons
                                    name="lock-open"
                                    size={21}
                                    color="#031007"
                                />

                                <Text style={styles.purchaseButtonText}>
                                    Unlock All Games
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.paymentNote}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={18}
                            color="#94A3B8"
                        />

                        <Text style={styles.restoreText}>
                            Your purchase is connected to your App Store or
                            Google Play account and can be restored later.
                        </Text>
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </GameScreenWrapper>
    );
}

function FeatureRow({
    title,
    description,
    icon,
    color,
}: FeatureRowProps) {
    return (
        <View
            style={[
                styles.featureCard,
                {
                    borderColor: `${color}55`,
                },
            ]}
        >
            <View
                style={[
                    styles.featureIconWrap,
                    {
                        backgroundColor: `${color}18`,
                        borderColor: `${color}55`,
                    },
                ]}
            >
                <Ionicons name={icon} size={25} color={color} />
            </View>

            <View style={styles.featureCopy}>
                <Text
                    style={[
                        styles.featureTitle,
                        {
                            color,
                        },
                    ]}
                >
                    {title}
                </Text>

                <Text style={styles.featureDescription}>
                    {description}
                </Text>
            </View>

            <View
                style={[
                    styles.includedBadge,
                    {
                        backgroundColor: `${color}16`,
                        borderColor: `${color}45`,
                    },
                ]}
            >
                <Ionicons
                    name="checkmark"
                    size={16}
                    color={color}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#020617",
    },

    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#020617",
    },

    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },

    headerCopy: {
        flex: 1,
        marginLeft: 14,
    },

    eyebrow: {
        color: "#22D3EE",
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 2,
    },

    headerTitle: {
        color: "#FFFFFF",
        fontSize: 32,
        lineHeight: 34,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        marginTop: -2,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        paddingTop: 18,
        paddingBottom: Platform.OS === "android" ? 190 : 120,
    },

    heroSection: {
        alignItems: "center",
        paddingHorizontal: 12,
        marginBottom: 24,
    },

    heroIconWrap: {
        width: 76,
        height: 76,
        borderRadius: 38,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(34,211,238,0.08)",

        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.34)",

        marginBottom: 16,

        shadowColor: "#22D3EE",
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    title: {
        color: "#FFFFFF",

        fontSize: 31,
        lineHeight: 34,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,

        textAlign: "center",
    },

    subtitle: {
        color: "#AAB2C0",

        fontSize: 14,
        lineHeight: 21,

        textAlign: "center",

        marginTop: 8,
        paddingHorizontal: 10,
    },

    gamesSection: {
        width: "100%",
        marginBottom: 25,
    },

    featureCard: {
        width: "100%",
        minHeight: 92,

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#070B14",

        borderRadius: 20,
        borderWidth: 1,

        paddingHorizontal: 14,
        paddingVertical: 13,

        marginBottom: 12,
    },

    featureIconWrap: {
        width: 51,
        height: 51,
        borderRadius: 17,

        alignItems: "center",
        justifyContent: "center",

        borderWidth: 1,

        marginRight: 13,
    },

    featureCopy: {
        flex: 1,
        paddingRight: 9,
    },

    featureTitle: {
        fontSize: 19,
        lineHeight: 21,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,

        marginBottom: 3,
    },

    featureDescription: {
        color: "#AAB2C0",

        fontSize: 12.5,
        lineHeight: 17,
    },

    includedBadge: {
        width: 31,
        height: 31,
        borderRadius: 15.5,

        alignItems: "center",
        justifyContent: "center",

        borderWidth: 1,
    },

    priceSection: {
        alignItems: "center",

        backgroundColor: "rgba(57,255,20,0.06)",

        borderWidth: 1,
        borderColor: "rgba(57,255,20,0.30)",
        borderRadius: 22,

        paddingVertical: 17,
        paddingHorizontal: 20,

        marginBottom: 17,
    },

    onlyText: {
        color: "#39FF14",

        fontSize: 14,
        fontFamily: "Rajdhani_700Bold",

        letterSpacing: 2.4,
        marginBottom: -2,
    },

    price: {
        color: "#39FF14",

        fontSize: 46,
        lineHeight: 49,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.5,

        textShadowColor: "rgba(57,255,20,0.35)",
        textShadowOffset: {
            width: 0,
            height: 0,
        },
        textShadowRadius: 12,
    },

    purchaseTypeRow: {
        flexDirection: "row",
        alignItems: "center",

        marginTop: 3,
    },

    priceSubtext: {
        color: "#CBD5E1",
        fontSize: 13,
        marginLeft: 6,
    },

    purchaseButton: {
        width: "100%",
        height: 57,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#39FF14",

        borderRadius: 18,

        marginBottom: 17,

        shadowColor: "#39FF14",
        shadowOpacity: 0.28,
        shadowRadius: 16,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 6,
    },

    purchaseButtonDisabled: {
        opacity: 0.68,
    },

    purchaseButtonText: {
        color: "#031007",

        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,

        marginLeft: 8,
    },

    paymentNote: {
        flexDirection: "row",
        alignItems: "flex-start",

        backgroundColor: "#070B14",

        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",

        paddingHorizontal: 13,
        paddingVertical: 12,
    },

    restoreText: {
        flex: 1,

        color: "#7F8A9D",

        fontSize: 11.5,
        lineHeight: 17,

        marginLeft: 8,
    },

    bottomSpacer: {
        height: 24,
    },
});