import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import GameBackButton from "../../components/GameBackButton";
import GameHomeButton from "../../components/GameHomeButton";
import GameScreenWrapper from "../../components/GameScreenWrapper";
import {
    initializeIAP,
    getGamesPackProduct,
    buyGamesPack,
    setupPurchaseListeners,
    cleanupIAP,
} from "../../services/iap";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const games = [
    {
        title: "Chess Charades",
        description: "Act out chess words, players, openings, and funny chess moments.",
        icon: "body-outline",
        color: "#FFD166",
        route: "CharadesSetup",
        sound: "charades",
    },
    {
        title: "Most Likely",
        description: "Swipe through funny chess prompts and vote who fits best.",
        icon: "people-outline",
        color: "#3CF2FF",
        route: "MostLikely",
        sound: "mostlikely",
    },
    {
        title: "Impostor",
        description: "Everyone sees the chess card except one hidden impostor.",
        icon: "eye-outline",
        color: "#FF6B6B",
        route: "ImpostorSetup",
        sound: "impostor",
    },
    {
        title: "Just Move Clock",
        description: "A chaotic chess clock party mode built for fast decisions.",
        icon: "timer-outline",
        color: "#7CFF6B",
        route: "JustMoveClock",
        sound: "clock",
    },
];

export default function GameHomeScreen() {
    const navigation = useNavigation<any>();

    const [gamesPackagePurchased, setGamesPackagePurchased] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingPurchase, setLoadingPurchase] = useState(false);
    const [product, setProduct] = useState<any>(null);

    const bannerScale = useRef(new Animated.Value(1)).current;
    const bannerGlow = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.92)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;

    const charadesSoundRef = useRef<Audio.Sound | null>(null);
    const mostLikelySoundRef = useRef<Audio.Sound | null>(null);
    const impostorSoundRef = useRef<Audio.Sound | null>(null);
    const clockSoundRef = useRef<Audio.Sound | null>(null);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

    const fetchEntitlements = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data?.success && data?.entitlements?.gamesPackagePurchased) {
                setGamesPackagePurchased(true);
            }
        } catch (error) {
            console.log("Fetch entitlements error:", error);
        }
    };

    const unlockGamesOnBackend = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                throw new Error("Missing token or API base URL");
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/me/unlock-games`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to unlock games");
            }

            setGamesPackagePurchased(true);
            closePaywall();

            Alert.alert("Unlocked 🎉", "All Party Games are now unlocked.");
        } catch (error) {
            console.log("Unlock backend sync error:", error);

            Alert.alert(
                "Purchase Complete",
                "Purchase worked, but saving the unlock to your account failed."
            );
        } finally {
            setLoadingPurchase(false);
        }
    };

    useEffect(() => {
        loadSounds();
        loadIAP();
        fetchEntitlements();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => {
                await unlockGamesOnBackend();
            },
            onPurchaseError: (error: any) => {
                setLoadingPurchase(false);
                console.log("Purchase error listener:", error);
            },
        });

        return () => {
            unloadSounds();
            cleanupIAP();
        };
    }, []);

    useEffect(() => {
        if (gamesPackagePurchased) return;

        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(bannerScale, {
                        toValue: 1.035,
                        duration: 850,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(bannerScale, {
                        toValue: 1,
                        duration: 850,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(bannerGlow, {
                        toValue: 1,
                        duration: 850,
                        useNativeDriver: false,
                    }),
                    Animated.timing(bannerGlow, {
                        toValue: 0,
                        duration: 850,
                        useNativeDriver: false,
                    }),
                ]),
            ])
        ).start();
    }, [gamesPackagePurchased]);

    useEffect(() => {
        if (paywallVisible) {
            modalScale.setValue(0.92);
            modalOpacity.setValue(0);

            Animated.parallel([
                Animated.timing(modalScale, {
                    toValue: 1,
                    duration: 240,
                    easing: Easing.out(Easing.back(1.4)),
                    useNativeDriver: true,
                }),
                Animated.timing(modalOpacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [paywallVisible]);

    const loadIAP = async () => {
        try {
            await initializeIAP();
            const fetchedProduct = await getGamesPackProduct();
            setProduct(fetchedProduct);
        } catch (error) {
            console.log("IAP load error:", error);
        }
    };

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const charades = await Audio.Sound.createAsync(
                require("../../../assets/sounds/soniccashregister.mp3")
            );

            const mostLikely = await Audio.Sound.createAsync(
                require("../../../assets/sounds/card-flip.mp3")
            );

            const impostor = await Audio.Sound.createAsync(
                require("../../../assets/sounds/amongus2.mp3")
            );

            const clock = await Audio.Sound.createAsync(
                require("../../../assets/sounds/scribblenauts-button-click.mp3")
            );

            charadesSoundRef.current = charades.sound;
            mostLikelySoundRef.current = mostLikely.sound;
            impostorSoundRef.current = impostor.sound;
            clockSoundRef.current = clock.sound;
        } catch (error) {
            console.log("Game home sound load error:", error);
        }
    };

    const unloadSounds = async () => {
        try {
            await charadesSoundRef.current?.unloadAsync();
            await mostLikelySoundRef.current?.unloadAsync();
            await impostorSoundRef.current?.unloadAsync();
            await clockSoundRef.current?.unloadAsync();
        } catch (error) {
            console.log("Game home sound unload error:", error);
        }
    };

    const playSound = async (soundType: string) => {
        try {
            let sound: Audio.Sound | null = null;

            if (soundType === "charades") sound = charadesSoundRef.current;
            if (soundType === "mostlikely") sound = mostLikelySoundRef.current;
            if (soundType === "impostor") sound = impostorSoundRef.current;
            if (soundType === "clock") sound = clockSoundRef.current;

            if (!sound) return;

            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Game home sound play error:", error);
        }
    };

    const openPaywall = () => {
        setPaywallVisible(true);
    };

    const closePaywall = () => {
        setPaywallVisible(false);
    };

    const handleGamePress = async (route: string, soundType: string) => {
        await playSound(soundType);

        setTimeout(() => {
            if (!gamesPackagePurchased) {
                openPaywall();
                return;
            }

            navigation.navigate(route);
        }, 120);
    };

    const handleUnlockPress = async () => {
        try {
            setLoadingPurchase(true);
            await buyGamesPack();
        } catch (error) {
            setLoadingPurchase(false);
            console.log("Purchase request error:", error);

            Alert.alert(
                "Purchase Failed",
                "Something went wrong while starting the purchase."
            );
        }
    };

    const animatedShadowOpacity = bannerGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.95],
    });

    const animatedShadowRadius = bannerGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [6, 18],
    });

    return (
        <GameScreenWrapper>
            <View style={styles.topRow}>
                <GameBackButton />
                <Text style={styles.screenTitle}>Party Games</Text>
            </View>

            <Text style={styles.subtitle}>
                Pick a game mode and bring chess energy to the room. ♟️🔥
            </Text>

            {!gamesPackagePurchased && (
                <TouchableOpacity activeOpacity={0.9} onPress={openPaywall}>
                    <Animated.View
                        style={[
                            styles.unlockBanner,
                            {
                                transform: [{ scale: bannerScale }],
                                shadowOpacity: animatedShadowOpacity,
                                shadowRadius: animatedShadowRadius,
                            },
                        ]}
                    >
                        <View style={styles.unlockIconBubble}>
                            <Ionicons name="sparkles" size={20} color="#050816" />
                        </View>

                        <View style={styles.unlockTextWrap}>
                            <Text style={styles.unlockBannerText}>
                                Unlock all Party Games
                            </Text>
                            <Text style={styles.unlockBannerSubtext}>
                                One-time purchase • {product?.localizedPrice || "$4.99"}
                            </Text>
                        </View>

                        <Ionicons name="lock-closed" size={22} color="#FFD166" />
                    </Animated.View>
                </TouchableOpacity>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {games.map((game) => (
                    <TouchableOpacity
                        key={game.title}
                        style={[
                            styles.gameCard,
                            !gamesPackagePurchased && styles.lockedGameCard,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => handleGamePress(game.route, game.sound)}
                    >
                        <View style={styles.gameLeft}>
                            <View
                                style={[
                                    styles.iconBubble,
                                    { borderColor: game.color },
                                ]}
                            >
                                <Ionicons
                                    name={game.icon as any}
                                    size={24}
                                    color={game.color}
                                />
                            </View>

                            <View style={styles.gameTextWrap}>
                                <Text style={styles.gameTitle}>{game.title}</Text>

                                <Text style={styles.gameDescription}>
                                    {game.description}
                                </Text>
                            </View>
                        </View>

                        <Ionicons
                            name={
                                gamesPackagePurchased
                                    ? "chevron-forward"
                                    : "lock-closed"
                            }
                            size={24}
                            color={gamesPackagePurchased ? "#8A8F98" : "#FFD166"}
                        />
                    </TouchableOpacity>
                ))}

                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                <GameHomeButton />
            </View>

            <Modal
                visible={paywallVisible}
                transparent
                animationType="fade"
                onRequestClose={closePaywall}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={closePaywall} />

                    <Animated.View
                        style={[
                            styles.paywallCard,
                            {
                                opacity: modalOpacity,
                                transform: [{ scale: modalScale }],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={closePaywall}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.paywallHeroIcon}>
                            <Ionicons name="sparkles" size={42} color="#050816" />
                        </View>

                        <Text style={styles.paywallTitle}>
                            Unlock Party Games
                        </Text>

                        <Text style={styles.paywallSubtitle}>
                            Get every chess party mode in one bundle.
                        </Text>

                        <View style={styles.paywallPriceBox}>
                            <Text style={styles.paywallPrice}>
                                {product?.localizedPrice || "$4.99"}
                            </Text>
                            <Text style={styles.paywallPriceSub}>
                                One-time purchase. No subscription.
                            </Text>
                        </View>

                        <View style={styles.featureGrid}>
                            <FeatureRow icon="body-outline" text="Chess Charades" />
                            <FeatureRow icon="people-outline" text="Most Likely" />
                            <FeatureRow icon="eye-outline" text="Impostor" />
                            <FeatureRow icon="timer-outline" text="Just Move Clock" />
                        </View>

                        <TouchableOpacity
                            style={styles.unlockButton}
                            activeOpacity={0.9}
                            onPress={handleUnlockPress}
                            disabled={loadingPurchase}
                        >
                            {loadingPurchase ? (
                                <ActivityIndicator color="#050816" />
                            ) : (
                                <>
                                    <Ionicons name="lock-open" size={20} color="#050816" />
                                    <Text style={styles.unlockButtonText}>
                                        Unlock All Games
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.8}>
                            <Text style={styles.restoreText}>
                                Restore Purchase
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.finePrint}>
                            Includes all current Party Games in Just Move.
                        </Text>
                    </Animated.View>
                </View>
            </Modal>
        </GameScreenWrapper>
    );
}

function FeatureRow({ icon, text }: { icon: any; text: string }) {
    return (
        <View style={styles.featureRow}>
            <View style={styles.featureIconBubble}>
                <Ionicons name={icon} size={16} color="#FFD166" />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },

    screenTitle: {
        color: "#FFFFFF",
        fontSize: 26,
        fontWeight: "800",
        marginLeft: 14,
    },

    subtitle: {
        color: "#AAB2C0",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 14,
    },

    unlockBanner: {
        backgroundColor: "#15101F",
        borderWidth: 1.5,
        borderColor: "#FFD166",
        borderRadius: 20,
        paddingVertical: 13,
        paddingHorizontal: 14,
        marginBottom: 18,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#FFD166",
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },

    unlockIconBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FFD166",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },

    unlockTextWrap: {
        flex: 1,
    },

    unlockBannerText: {
        color: "#FFD166",
        fontSize: 16,
        fontWeight: "900",
    },

    unlockBannerSubtext: {
        color: "#FFFFFF",
        fontSize: 12.5,
        fontWeight: "700",
        marginTop: 2,
        opacity: 0.85,
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom: 140,
    },

    gameCard: {
        minHeight: 96,
        backgroundColor: "#050816",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#12203A",
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    lockedGameCard: {
        borderColor: "#2A2740",
        opacity: 0.96,
    },

    gameLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        paddingRight: 12,
    },

    iconBubble: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1220",
        borderWidth: 1.5,
        marginRight: 14,
    },

    gameTextWrap: {
        flex: 1,
    },

    gameTitle: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "800",
        marginBottom: 5,
    },

    gameDescription: {
        color: "#AAB2C0",
        fontSize: 13.5,
        lineHeight: 19,
    },

    bottomSpacer: {
        height: 30,
    },

    fixedHomeButtonWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 18,
        alignItems: "center",
        justifyContent: "center",
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 34,
    },

    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.78)",
    },

    paywallCard: {
        width: "100%",
        maxHeight: "82%",
        backgroundColor: "#070A16",
        borderRadius: 30,
        borderWidth: 1.5,
        borderColor: "#FFD166",
        paddingHorizontal: 22,
        paddingTop: 22,
        paddingBottom: 18,
        alignItems: "center",
        shadowColor: "#FFD166",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 14,
    },

    closeButton: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },

    paywallHeroIcon: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#FFD166",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },

    paywallTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "900",
        textAlign: "center",
    },

    paywallSubtitle: {
        color: "#AAB2C0",
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
        marginTop: 8,
        marginBottom: 16,
    },

    paywallPriceBox: {
        backgroundColor: "#15101F",
        borderWidth: 1,
        borderColor: "#332847",
        borderRadius: 18,
        width: "100%",
        paddingVertical: 12,
        alignItems: "center",
        marginBottom: 16,
    },

    paywallPrice: {
        color: "#FFD166",
        fontSize: 30,
        fontWeight: "900",
    },

    paywallPriceSub: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
        opacity: 0.8,
        marginTop: 2,
    },

    featureGrid: {
        width: "100%",
        marginBottom: 18,
    },

    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0B1020",
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 7,
        borderWidth: 1,
        borderColor: "#17213A",
    },

    featureIconBubble: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#14101F",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },

    featureText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
    },

    unlockButton: {
        width: "100%",
        height: 50,
        borderRadius: 16,
        backgroundColor: "#FFD166",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },

    unlockButtonText: {
        color: "#050816",
        fontSize: 15,
        fontWeight: "900",
        marginLeft: 8,
    },

    restoreText: {
        color: "#FFD166",
        fontSize: 12.5,
        fontWeight: "800",
        marginBottom: 8,
    },

    finePrint: {
        color: "#6E7686",
        fontSize: 11,
        textAlign: "center",
    },
});