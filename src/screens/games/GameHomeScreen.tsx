import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { finishTransaction } from "react-native-iap";
import ConfettiCannon from "react-native-confetti-cannon";
import { useFonts, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";

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

type TimeTheme = "day" | "night";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const games = [
    {
        title: "Study Break Charades",
        description:
            "Act out school topics, campus moments, and funny student experiences.",
        icon: "body-outline",
        color: "#E9A800",
        nightColor: "#FFD166",
        route: "CharadesSetup",
        sound: "charades",
    },
    {
        title: "Most Likely",
        description:
            "Swipe through funny prompts and vote for who fits each one best.",
        icon: "people-outline",
        color: "#0891B2",
        nightColor: "#3CF2FF",
        route: "MostLikely",
        sound: "mostlikely",
    },
    {
        title: "Impostor",
        description: "Everyone sees the secret card except one hidden impostor.",
        icon: "eye-outline",
        color: "#DC2626",
        nightColor: "#FF6B6B",
        route: "ImpostorSetup",
        sound: "impostor",
    },
    {
        title: "Rapid Fire",
        description:
            "A chaotic group game built for fast answers and quick decisions.",
        icon: "timer-outline",
        color: "#16A34A",
        nightColor: "#7CFF6B",
        route: "JustMoveClock",
        sound: "clock",
    },
];

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();

    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getTheme = (mode: TimeTheme) => {
    const isNight = mode === "night";

    return {
        mode,
        isNight,

        background: isNight ? "#000000" : "#F8FAFC",

        card: isNight ? "#050816" : "#FFFFFF",

        cardSoft: isNight ? "#090D14" : "#FFFFFF",

        lockedCard: isNight ? "#060714" : "#F8FAFC",

        elevatedSurface: isNight ? "#0B1220" : "#F1F5F9",

        text: isNight ? "#FFFFFF" : "#07111F",

        textSoft: isNight ? "#AAB2C0" : "#475569",

        muted: isNight ? "#8A8F98" : "#64748B",

        accent: "#FFD166",

        accentText: isNight ? "#FFD166" : "#9A6700",

        accentSoft: isNight ? "#15101F" : "#FFF8DD",

        accentBorder: isNight ? "rgba(255,209,102,0.32)" : "rgba(183,121,0,0.28)",

        border: isNight ? "#17213A" : "#DDE5EE",

        iconSurface: isNight ? "#0B1220" : "#F8FAFC",

        paywall: isNight ? "#070A16" : "#FFFFFF",

        paywallRow: isNight ? "#0B1020" : "#F8FAFC",

        closeButton: isNight ? "#111827" : "#E2E8F0",

        closeIcon: isNight ? "#FFFFFF" : "#07111F",

        overlay: isNight ? "rgba(0,0,0,0.78)" : "rgba(2,6,23,0.58)",
    };
};

export default function GameHomeScreen() {
    const navigation = useNavigation<any>();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const [gamesPackagePurchased, setGamesPackagePurchased] = useState(false);

    const [paywallVisible, setPaywallVisible] = useState(false);

    const [loadingPurchase, setLoadingPurchase] = useState(false);

    const [checkingEntitlements, setCheckingEntitlements] = useState(true);

    const [product, setProduct] = useState<any>(null);

    const [showConfetti, setShowConfetti] = useState(false);

    const [themeMode, setThemeMode] = useState<TimeTheme>(getCurrentThemeMode());

    const theme = useMemo(() => getTheme(themeMode), [themeMode]);

    const styles = useMemo(() => createStyles(theme), [theme]);

    const bannerScale = useRef(new Animated.Value(1)).current;

    const bannerGlow = useRef(new Animated.Value(0)).current;

    const modalScale = useRef(new Animated.Value(0.92)).current;

    const modalOpacity = useRef(new Animated.Value(0)).current;

    const heroFloat = useRef(new Animated.Value(0)).current;

    const cardAnim = useRef(games.map(() => new Animated.Value(0))).current;

    const charadesSoundRef = useRef<Audio.Sound | null>(null);

    const mostLikelySoundRef = useRef<Audio.Sound | null>(null);

    const impostorSoundRef = useRef<Audio.Sound | null>(null);

    const clockSoundRef = useRef<Audio.Sound | null>(null);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

    const updateStoredGamesAccess = async () => {
        const storedUserRaw = await AsyncStorage.getItem("user");

        if (!storedUserRaw) {
            return;
        }

        try {
            const storedUser = JSON.parse(storedUserRaw);

            await AsyncStorage.setItem(
                "user",
                JSON.stringify({
                    ...storedUser,
                    gamesPackagePurchased: true,
                }),
            );
        } catch (error) {
            console.log("Stored games access update error:", error);
        }
    };

    const fetchEntitlements = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            setGamesPackagePurchased(
                !!data?.success && !!data?.entitlements?.gamesPackagePurchased,
            );
        } catch (error) {
            console.log("Fetch entitlements error:", error);
        } finally {
            setCheckingEntitlements(false);
        }
    };

    const closePaywall = () => {
        setPaywallVisible(false);
    };

    const verifyGamePurchaseOnBackend = async (purchase: any) => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                throw new Error("Missing token or API base URL");
            }

            const response = await fetch(`${API_BASE_URL}/api/games/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",

                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    platform: Platform.OS === "ios" ? "ios" : "android",

                    productId: purchase?.productId || "sbpg_499_1t",

                    transactionId:
                        purchase?.transactionId ||
                        purchase?.transactionIdIOS ||
                        purchase?.id ||
                        null,

                    purchaseToken: purchase?.purchaseToken || null,
                }),
            });

            const data = await response.json();

            console.log("GAME VERIFY STATUS:", response.status);

            console.log("GAME VERIFY DATA:", data);

            if (!response.ok) {
                throw new Error(data.message || "Failed to verify game purchase");
            }

            await finishTransaction({
                purchase,
                isConsumable: false,
            });

            setGamesPackagePurchased(true);

            await updateStoredGamesAccess();

            closePaywall();

            setShowConfetti(true);

            Alert.alert(
                "Unlocked 🎉",
                "All Study Break Party Group Games are now unlocked.",
            );
        } catch (error) {
            console.log("Verify game purchase error:", error);

            Alert.alert(
                "Purchase Complete",
                "Your purchase worked, but saving the unlock to your account failed. Please try Restore Purchase.",
            );
        } finally {
            setLoadingPurchase(false);
        }
    };

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
                require("../../../assets/sounds/soniccashregister.mp3"),
            );

            const mostLikely = await Audio.Sound.createAsync(
                require("../../../assets/sounds/card-flip.mp3"),
            );

            const impostor = await Audio.Sound.createAsync(
                require("../../../assets/sounds/amongus2.mp3"),
            );

            const clock = await Audio.Sound.createAsync(
                require("../../../assets/sounds/scribblenauts-button-click.mp3"),
            );

            charadesSoundRef.current = charades.sound;

            mostLikelySoundRef.current = mostLikely.sound;

            impostorSoundRef.current = impostor.sound;

            clockSoundRef.current = clock.sound;
        } catch (error) {
            console.log("Game home sound load error:", error);
        }
    };

    const safeUnload = async (soundRef: Audio.Sound | null) => {
        try {
            if (!soundRef) {
                return;
            }

            await soundRef.stopAsync().catch(() => { });

            await soundRef.unloadAsync().catch(() => { });
        } catch (error) {
            console.log("Sound unload warning:", error);
        }
    };

    const unloadSounds = async () => {
        await safeUnload(charadesSoundRef.current);

        await safeUnload(mostLikelySoundRef.current);

        await safeUnload(impostorSoundRef.current);

        await safeUnload(clockSoundRef.current);

        charadesSoundRef.current = null;

        mostLikelySoundRef.current = null;

        impostorSoundRef.current = null;

        clockSoundRef.current = null;
    };

    useEffect(() => {
        const themeInterval = setInterval(() => {
            setThemeMode(getCurrentThemeMode());
        }, 60000);

        return () => clearInterval(themeInterval);
    }, []);

    useEffect(() => {
        loadSounds();
        loadIAP();
        fetchEntitlements();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },

            onGamesPackSuccess: async (purchase: any) => {
                await verifyGamePurchaseOnBackend(purchase);
            },

            onBlogsSubscriptionSuccess: async () => { },

            onPurchaseError: (error: any) => {
                setLoadingPurchase(false);

                console.log("Purchase error listener:", error);
            },
        });

        return () => {
            void unloadSounds();
            void cleanupIAP();
        };
    }, []);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(heroFloat, {
                    toValue: 1,
                    duration: 1600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),

                Animated.timing(heroFloat, {
                    toValue: 0,
                    duration: 1600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );

        animation.start();

        return () => animation.stop();
    }, [heroFloat]);

    useEffect(() => {
        Animated.stagger(
            95,
            cardAnim.map((anim) =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 420,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ),
        ).start();
    }, [cardAnim]);

    useEffect(() => {
        if (gamesPackagePurchased) {
            return;
        }

        const animation = Animated.loop(
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
            ]),
        );

        animation.start();

        return () => animation.stop();
    }, [gamesPackagePurchased, bannerGlow, bannerScale]);

    useEffect(() => {
        if (!paywallVisible) {
            return;
        }

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
    }, [paywallVisible, modalOpacity, modalScale]);

    const playSound = async (soundType: string) => {
        try {
            let sound: Audio.Sound | null = null;

            if (soundType === "charades") {
                sound = charadesSoundRef.current;
            }

            if (soundType === "mostlikely") {
                sound = mostLikelySoundRef.current;
            }

            if (soundType === "impostor") {
                sound = impostorSoundRef.current;
            }

            if (soundType === "clock") {
                sound = clockSoundRef.current;
            }

            if (!sound) {
                return;
            }

            await sound.setPositionAsync(0);

            await sound.playAsync();
        } catch (error) {
            console.log("Game sound error:", error);
        }
    };

    const openPaywall = () => {
        setPaywallVisible(true);
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
                "Something went wrong while starting the purchase.",
            );
        }
    };

    const animatedShadowOpacity = bannerGlow.interpolate({
        inputRange: [0, 1],
        outputRange: theme.isNight ? [0.25, 0.95] : [0.12, 0.42],
    });

    const animatedShadowRadius = bannerGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [6, 18],
    });

    const heroTranslateY = heroFloat.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -5],
    });

    const FeatureRow = ({ icon, text }: { icon: any; text: string }) => {
        return (
            <View style={styles.featureRow}>
                <View style={styles.featureIconBubble}>
                    <Ionicons
                        name={icon}
                        size={16}
                        color={theme.isNight ? theme.accent : theme.accentText}
                    />
                </View>

                <Text style={styles.featureText}>{text}</Text>
            </View>
        );
    };

    if (checkingEntitlements || !fontsLoaded) {
        return (
            <GameScreenWrapper themeMode={themeMode}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            </GameScreenWrapper>
        );
    }

    return (
        <GameScreenWrapper themeMode={themeMode}>
            <View style={styles.screen}>
                <View style={styles.topRow}>
                    <GameBackButton themeMode={themeMode} />

                    <View style={styles.titleWrap}>
                        <Text style={styles.eyebrow}>SCOOLFOOLS</Text>

                        <Text style={styles.screenTitle}>Party Games</Text>
                    </View>
                </View>

                <Animated.View
                    style={[
                        styles.heroCard,
                        {
                            transform: [
                                {
                                    translateY: heroTranslateY,
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.heroIcon}>
                        <Ionicons name="game-controller" size={28} color="#050816" />
                    </View>

                    <View style={styles.heroCopy}>
                        <Text style={styles.heroTitle}>Study Break Party Group Games</Text>

                        <Text style={styles.subtitle}>
                            Put the schoolwork down, pick a game, and bring everyone together.
                            🎉
                        </Text>
                    </View>

                    <Text style={styles.heroEmoji}>🎮</Text>
                </Animated.View>

                {!gamesPackagePurchased && (
                    <TouchableOpacity activeOpacity={0.9} onPress={openPaywall}>
                        <Animated.View
                            style={[
                                styles.unlockBanner,
                                {
                                    transform: [
                                        {
                                            scale: bannerScale,
                                        },
                                    ],

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
                                    Unlock All Group Games
                                </Text>

                                <Text style={styles.unlockBannerSubtext}>
                                    One-time purchase • {product?.localizedPrice || "$4.99"}
                                </Text>
                            </View>

                            <Ionicons name="lock-closed" size={22} color={theme.accentText} />
                        </Animated.View>
                    </TouchableOpacity>
                )}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {games.map((game, index) => {
                        const gameColor = theme.isNight ? game.nightColor : game.color;

                        const cardTranslateY = cardAnim[index].interpolate({
                            inputRange: [0, 1],

                            outputRange: [22, 0],
                        });

                        return (
                            <Animated.View
                                key={game.title}
                                style={{
                                    opacity: cardAnim[index],

                                    transform: [
                                        {
                                            translateY: cardTranslateY,
                                        },
                                    ],
                                }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.gameCard,

                                        !gamesPackagePurchased && styles.lockedGameCard,

                                        {
                                            borderColor: `${gameColor}55`,
                                        },
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => handleGamePress(game.route, game.sound)}
                                >
                                    <View style={styles.gameLeft}>
                                        <View
                                            style={[
                                                styles.iconBubble,
                                                {
                                                    borderColor: gameColor,

                                                    shadowColor: gameColor,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={game.icon as any}
                                                size={24}
                                                color={gameColor}
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
                                            gamesPackagePurchased ? "chevron-forward" : "lock-closed"
                                        }
                                        size={24}
                                        color={
                                            gamesPackagePurchased ? theme.muted : theme.accentText
                                        }
                                    />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    <View style={styles.bottomSpacer} />
                </ScrollView>

                <View style={styles.fixedHomeButtonWrap} pointerEvents="box-none">
                    <GameHomeButton themeMode={themeMode} />
                </View>

                <Modal
                    visible={paywallVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={closePaywall}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={closePaywall} />

                        <Animated.View
                            style={[
                                styles.paywallCard,
                                {
                                    opacity: modalOpacity,

                                    transform: [
                                        {
                                            scale: modalScale,
                                        },
                                    ],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={closePaywall}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="close" size={20} color={theme.closeIcon} />
                            </TouchableOpacity>

                            <View style={styles.paywallHeroIcon}>
                                <Ionicons name="sparkles" size={42} color="#050816" />
                            </View>

                            <Text style={styles.paywallTitle}>
                                Study Break Party Group Games
                            </Text>

                            <Text style={styles.paywallSubtitle}>
                                Unlock every ScoolFools group game in one party bundle.
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
                                <FeatureRow icon="body-outline" text="Study Break Charades" />

                                <FeatureRow icon="people-outline" text="Most Likely" />

                                <FeatureRow icon="eye-outline" text="Impostor" />

                                <FeatureRow icon="timer-outline" text="Rapid Fire" />
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
                                            Unlock All Group Games
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.8}>
                                <Text style={styles.restoreText}>Restore Purchase</Text>
                            </TouchableOpacity>

                            <Text style={styles.finePrint}>
                                Includes all current Study Break Party Group Games in
                                ScoolFools.
                            </Text>
                        </Animated.View>
                    </View>
                </Modal>

                {showConfetti && (
                    <ConfettiCannon
                        count={160}
                        origin={{
                            x: -10,
                            y: 0,
                        }}
                        fadeOut
                        explosionSpeed={350}
                        fallSpeed={2600}
                        onAnimationEnd={() => setShowConfetti(false)}
                    />
                )}
            </View>
        </GameScreenWrapper>
    );
}

const createStyles = (theme: ReturnType<typeof getTheme>) =>
    StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: theme.background,
        },

        loadingContainer: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },

        topRow: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 14,
        },

        titleWrap: {
            marginLeft: 14,
            flex: 1,
        },

        eyebrow: {
            color: theme.accentText,
            fontSize: 13,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 1.8,
        },

        screenTitle: {
            color: theme.text,
            fontSize: 32,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.5,
            marginTop: -2,
        },

        heroCard: {
            minHeight: 104,
            backgroundColor: theme.cardSoft,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.accentBorder,

            paddingHorizontal: 14,
            paddingVertical: 14,
            marginBottom: 14,

            flexDirection: "row",
            alignItems: "center",

            shadowColor: theme.accent,

            shadowOpacity: theme.isNight ? 0.16 : 0.12,

            shadowRadius: 14,

            shadowOffset: {
                width: 0,
                height: 4,
            },

            elevation: theme.isNight ? 0 : 4,
        },

        heroIcon: {
            width: 48,
            height: 48,
            borderRadius: 24,

            backgroundColor: theme.accent,

            alignItems: "center",
            justifyContent: "center",

            marginRight: 12,
        },

        heroCopy: {
            flex: 1,
        },

        heroTitle: {
            color: theme.text,
            fontSize: 21,
            lineHeight: 23,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.35,
            marginBottom: 3,
        },

        heroEmoji: {
            fontSize: 25,
            marginLeft: 7,
        },

        subtitle: {
            color: theme.textSoft,
            fontSize: 13.5,
            lineHeight: 18,
        },

        unlockBanner: {
            backgroundColor: theme.accentSoft,

            borderWidth: 1.5,
            borderColor: theme.accentText,

            borderRadius: 20,

            paddingVertical: 13,
            paddingHorizontal: 14,

            marginBottom: 18,

            flexDirection: "row",
            alignItems: "center",

            shadowColor: theme.accent,

            shadowOffset: {
                width: 0,
                height: 0,
            },

            elevation: 5,
        },

        unlockIconBubble: {
            width: 36,
            height: 36,
            borderRadius: 18,

            backgroundColor: theme.accent,

            alignItems: "center",
            justifyContent: "center",

            marginRight: 12,
        },

        unlockTextWrap: {
            flex: 1,
        },

        unlockBannerText: {
            color: theme.accentText,
            fontSize: 18,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.35,
        },

        unlockBannerSubtext: {
            color: theme.text,
            fontSize: 13,
            fontFamily: "Rajdhani_700Bold",
            marginTop: 2,
            opacity: 0.85,
        },

        scrollView: {
            flex: 1,
        },

        scrollContent: {
            paddingBottom: Platform.OS === "android" ? 210 : 150,
        },

        gameCard: {
            minHeight: 98,
            backgroundColor: theme.card,

            borderRadius: 22,
            borderWidth: 1,

            paddingHorizontal: 16,
            paddingVertical: 16,

            marginBottom: 14,

            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",

            shadowColor: "#07111F",

            shadowOffset: {
                width: 0,
                height: 4,
            },

            shadowOpacity: theme.isNight ? 0 : 0.07,

            shadowRadius: 9,

            elevation: theme.isNight ? 0 : 3,
        },

        lockedGameCard: {
            opacity: 0.96,
            backgroundColor: theme.lockedCard,
        },

        gameLeft: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            paddingRight: 12,
        },

        iconBubble: {
            width: 50,
            height: 50,
            borderRadius: 25,

            alignItems: "center",
            justifyContent: "center",

            backgroundColor: theme.iconSurface,

            borderWidth: 1.5,
            marginRight: 14,

            shadowOpacity: 0.18,
            shadowRadius: 10,

            shadowOffset: {
                width: 0,
                height: 0,
            },
        },

        gameTextWrap: {
            flex: 1,
        },

        gameTitle: {
            color: theme.text,
            fontSize: 20,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.35,
            marginBottom: 4,
        },

        gameDescription: {
            color: theme.textSoft,
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

            bottom: Platform.OS === "android" ? 78 : 28,

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
            backgroundColor: theme.overlay,
        },

        paywallCard: {
            width: "100%",
            maxHeight: "86%",

            backgroundColor: theme.paywall,

            borderRadius: 30,
            borderWidth: 1.5,
            borderColor: theme.accentText,

            paddingHorizontal: 22,
            paddingTop: 22,
            paddingBottom: 18,

            alignItems: "center",

            shadowColor: theme.accent,

            shadowOffset: {
                width: 0,
                height: 0,
            },

            shadowOpacity: theme.isNight ? 0.45 : 0.25,

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

            backgroundColor: theme.closeButton,

            alignItems: "center",
            justifyContent: "center",

            zIndex: 10,
        },

        paywallHeroIcon: {
            width: 66,
            height: 66,
            borderRadius: 33,

            backgroundColor: theme.accent,

            alignItems: "center",
            justifyContent: "center",

            marginBottom: 14,
        },

        paywallTitle: {
            color: theme.text,
            fontSize: 27,
            lineHeight: 29,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.4,
            textAlign: "center",
        },

        paywallSubtitle: {
            color: theme.textSoft,
            fontSize: 14,
            lineHeight: 20,
            textAlign: "center",
            marginTop: 7,
            marginBottom: 14,
        },

        paywallPriceBox: {
            backgroundColor: theme.accentSoft,

            borderWidth: 1,
            borderColor: theme.accentBorder,

            borderRadius: 18,
            width: "100%",

            paddingVertical: 11,
            alignItems: "center",
            marginBottom: 14,
        },

        paywallPrice: {
            color: theme.accentText,
            fontSize: 34,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.4,
        },

        paywallPriceSub: {
            color: theme.text,
            fontSize: 13,
            fontFamily: "Rajdhani_700Bold",
            opacity: 0.8,
            marginTop: 2,
        },

        featureGrid: {
            width: "100%",
            marginBottom: 15,
        },

        featureRow: {
            flexDirection: "row",
            alignItems: "center",

            backgroundColor: theme.paywallRow,

            borderRadius: 16,

            paddingVertical: 8,
            paddingHorizontal: 12,

            marginBottom: 7,

            borderWidth: 1,
            borderColor: theme.border,
        },

        featureIconBubble: {
            width: 28,
            height: 28,
            borderRadius: 14,

            backgroundColor: theme.accentSoft,

            alignItems: "center",
            justifyContent: "center",

            marginRight: 10,
        },

        featureText: {
            color: theme.text,
            fontSize: 16,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.3,
        },

        unlockButton: {
            width: "100%",
            height: 50,
            borderRadius: 16,

            backgroundColor: theme.accent,

            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",

            marginBottom: 12,
        },

        unlockButtonText: {
            color: "#050816",
            fontSize: 17,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.35,
            marginLeft: 8,
        },

        restoreText: {
            color: theme.accentText,
            fontSize: 14,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.3,
            marginBottom: 8,
        },

        finePrint: {
            color: theme.muted,
            fontSize: 11,
            lineHeight: 15,
            textAlign: "center",
        },
    });
