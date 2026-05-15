import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import GameScreenWrapper from "../../components/GameScreenWrapper";
import GameBackButton from "../../components/GameBackButton";

import {
    initializeIAP,
    getGamesPackProduct,
    buyGamesPack,
    setupPurchaseListeners,
    cleanupIAP,
} from "../../services/iap";

export default function GamesPaywallScreen() {
    const navigation = useNavigation<any>();

    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        initialize();

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
                        }
                    );

                    Alert.alert(
                        "Purchase Successful 🎉",
                        "Party Games have been unlocked!"
                    );

                    navigation.goBack();
                } catch (error) {
                    console.log("Unlock API error:", error);
                }
            },

            onGamesPackSuccess: async () => { },

            onBlogsSubscriptionSuccess: async () => { },

            onPurchaseError: (error: any) => {
                console.log("Purchase listener error:", error);
            },
        });

        return () => {
            cleanupIAP();
        };
    }, []);

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
                "Something went wrong while processing your purchase."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
            </View>

            <View style={styles.content}>
                <View style={styles.iconWrap}>
                    <Ionicons
                        name="sparkles"
                        size={42}
                        color="#FFD166"
                    />
                </View>

                <Text style={styles.title}>
                    Unlock Party Games
                </Text>

                <Text style={styles.subtitle}>
                    Bring chess energy to the room with exclusive party modes.
                </Text>

                <View style={styles.featuresCard}>
                    <FeatureRow text="Chess Charades" />
                    <FeatureRow text="Most Likely" />
                    <FeatureRow text="Impostor" />
                    <FeatureRow text="Just Move Clock" />
                </View>

                <View style={styles.priceWrap}>
                    <Text style={styles.price}>
                        {product?.localizedPrice || "$4.99"}
                    </Text>

                    <Text style={styles.priceSubtext}>
                        One-time purchase
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.purchaseButton}
                    activeOpacity={0.85}
                    onPress={handlePurchase}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#050816" />
                    ) : (
                        <>
                            <Ionicons
                                name="lock-open"
                                size={20}
                                color="#050816"
                            />

                            <Text style={styles.purchaseButtonText}>
                                Unlock All Games
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.restoreText}>
                    Purchases can be restored anytime through your App Store or Google Play account.
                </Text>
            </View>
        </GameScreenWrapper>
    );
}

function FeatureRow({ text }: { text: string }) {
    return (
        <View style={styles.featureRow}>
            <Ionicons
                name="checkmark-circle"
                size={18}
                color="#7CFF6B"
            />

            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    content: {
        flex: 1,
        alignItems: "center",
        paddingTop: 30,
    },
    iconWrap: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: "#14101F",
        borderWidth: 1.5,
        borderColor: "#FFD166",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    title: {
        color: "#FFFFFF",
        fontSize: 30,
        fontWeight: "900",
        textAlign: "center",
    },
    subtitle: {
        color: "#AAB2C0",
        fontSize: 15,
        lineHeight: 23,
        textAlign: "center",
        marginTop: 10,
        marginBottom: 30,
        paddingHorizontal: 14,
    },
    featuresCard: {
        width: "100%",
        backgroundColor: "#050816",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#12203A",
        padding: 20,
        marginBottom: 28,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    featureText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
        marginLeft: 10,
    },
    priceWrap: {
        alignItems: "center",
        marginBottom: 24,
    },
    price: {
        color: "#FFD166",
        fontSize: 40,
        fontWeight: "900",
    },
    priceSubtext: {
        color: "#AAB2C0",
        fontSize: 14,
        marginTop: 4,
    },
    purchaseButton: {
        width: "100%",
        height: 58,
        backgroundColor: "#FFD166",
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    purchaseButtonText: {
        color: "#050816",
        fontSize: 16,
        fontWeight: "900",
        marginLeft: 8,
    },
    restoreText: {
        color: "#6E7686",
        fontSize: 12,
        lineHeight: 18,
        textAlign: "center",
        paddingHorizontal: 10,
    },
});