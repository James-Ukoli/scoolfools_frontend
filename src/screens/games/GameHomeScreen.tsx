import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
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

import ConfettiCannon from "react-native-confetti-cannon";
import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

import GameBackButton from "../../components/GameBackButton";
import GameScreenWrapper from "../../components/GameScreenWrapper";

import {
    initializeIAP,
    getGamesPackProduct,
    buyGamesPack,
    getOwnedGamesPackPurchase,
    setupPurchaseListeners,
    cleanupIAP,
} from "../../services/iap";
import {
    GamePurchaseVerificationError,
    isGameOwnershipMismatchError,
    isGamePurchaseAlreadyLinkedError,
    verifyScoolFoolsGamePurchase,
} from "../../services/gamePurchaseVerification";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type GameSound = "charades" | "mostlikely" | "impostor";

type GameItem = {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    accentColor: string;
    route: string;
    sound: GameSound;
    image: any;
};

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const THEME_MODE = "night" as const;

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const games: GameItem[] = [
    {
        title: "Study Break Charades",
        description:
            "Act out student life, school moments, and hilarious campus situations.",
        icon: "body-outline",
        accentColor: "#22D3EE",
        route: "CharadesSetup",
        sound: "charades",
        image: require("../../../assets/images/charades.png"),
    },
    {
        title: "Most Likely",
        description:
            "Read the prompt and point to the person who fits it best.",
        icon: "people-outline",
        accentColor: "#C084FC",
        route: "MostLikely",
        sound: "mostlikely",
        image: require("../../../assets/images/mostLikely.png"),
    },
    {
        title: "Impostor",
        description:
            "Everyone receives the same secret word except one hidden impostor.",
        icon: "eye-outline",
        accentColor: "#FF3B30",
        route: "ImpostorSetup",
        sound: "impostor",
        image: require("../../../assets/images/impostor.png"),
    },
];

const theme = {
    background: "#020617",
    surface: "#070B14",
    surfaceSoft: "#0B1220",

    text: "#FFFFFF",
    textSoft: "#CBD5E1",
    muted: "#94A3B8",

    cyan: "#22D3EE",
    yellow: "#FFD166",

    yellowSoft: "rgba(255,209,102,0.10)",
    yellowBorder: "rgba(255,209,102,0.42)",

    border: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(34,211,238,0.30)",

    overlay: "rgba(2,6,23,0.86)",
};

/*
|--------------------------------------------------------------------------
| Screen
|--------------------------------------------------------------------------
*/

export default function GameHomeScreen() {
    const navigation = useNavigation<any>();

    const [fontsLoaded] = useFonts({
        Rajdhani_700Bold,
    });

    const [gamesPackagePurchased, setGamesPackagePurchased] =
        useState(false);

    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingPurchase, setLoadingPurchase] = useState(false);
    const [checkingEntitlements, setCheckingEntitlements] =
        useState(true);

    const [product, setProduct] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const modalScale = useRef(new Animated.Value(0.92)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;

    const cardAnimations = useRef(
        games.map(() => new Animated.Value(0)),
    ).current;

    const charadesSoundRef = useRef<Audio.Sound | null>(null);
    const mostLikelySoundRef = useRef<Audio.Sound | null>(null);
    const impostorSoundRef = useRef<Audio.Sound | null>(null);

    /*
    |--------------------------------------------------------------------------
    | Storage and Entitlements
    |--------------------------------------------------------------------------
    */

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

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me/entitlements`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            const data = await response.json();

            setGamesPackagePurchased(
                !!data?.success &&
                !!data?.entitlements?.gamesPackagePurchased,
            );
        } catch (error) {
            console.log("Fetch entitlements error:", error);
        } finally {
            setCheckingEntitlements(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Purchase Logic
    |--------------------------------------------------------------------------
    */

    const closePaywall = () => {
        setPaywallVisible(false);
    };

    const openPaywall = () => {
        setPaywallVisible(true);
    };

    const verifyGamePurchaseOnBackend = async (
        purchase: any
    ) => {
        try {
            const result =
                await verifyScoolFoolsGamePurchase(
                    purchase
                );

            const purchased =
                result.gamesPackagePurchased ===
                true;

            setGamesPackagePurchased(
                purchased
            );

            if (!purchased) {
                Alert.alert(
                    "Purchase Inactive",
                    "The store verified this game purchase, but access was not granted."
                );

                return;
            }

            await updateStoredGamesAccess();

            closePaywall();
            setShowConfetti(true);

            Alert.alert(
                "Unlocked 🎉",
                "All Study Break Party Group Games are now unlocked."
            );
        } catch (error: unknown) {
            console.log(
                "Verify game purchase error:",
                error
            );

            if (
                isGamePurchaseAlreadyLinkedError(
                    error
                )
            ) {
                setGamesPackagePurchased(
                    false
                );

                await fetchEntitlements();

                Alert.alert(
                    "Game Purchase Already Linked",
                    "This App Store or Google Play game purchase is already connected to another ScoolFools account."
                );

                return;
            }

            if (
                isGameOwnershipMismatchError(
                    error
                )
            ) {
                await fetchEntitlements();

                Alert.alert(
                    "Different Game Purchase Detected",
                    "This ScoolFools account is already connected to a different game purchase."
                );

                return;
            }

            if (
                error instanceof
                GamePurchaseVerificationError
            ) {
                if (
                    error.code ===
                    "UNAUTHORIZED"
                ) {
                    Alert.alert(
                        "Sign In Required",
                        error.message
                    );

                    return;
                }

                if (
                    error.code ===
                    "FINISH_GAME_TRANSACTION_FAILED"
                ) {
                    await fetchEntitlements();

                    Alert.alert(
                        "Game Purchase Verified",
                        "Your game purchase was linked successfully, but the app store transaction still needs to finish. Reopen the app and try Restore Purchase again."
                    );

                    return;
                }

                Alert.alert(
                    "Verification Failed",
                    error.message
                );

                return;
            }

            Alert.alert(
                "Verification Failed",
                "Your game purchase could not be securely linked to your ScoolFools account."
            );
        } finally {
            setLoadingPurchase(false);
        }
    };

    const loadIAP = async () => {
        try {
            await initializeIAP();

            const fetchedProduct =
                await getGamesPackProduct();

            setProduct(fetchedProduct);
        } catch (error) {
            console.log("IAP load error:", error);
        }
    };

    const handleUnlockPress = async () => {
        setLoadingPurchase(true);

        await buyGamesPack({
            onSuccess:
                verifyGamePurchaseOnBackend,

            onError: (error: any) => {
                setLoadingPurchase(false);

                console.log(
                    "Game purchase request error:",
                    error
                );

                if (
                    error?.code ===
                    "user-cancelled" ||
                    error?.code ===
                    "E_USER_CANCELLED"
                ) {
                    return;
                }

                Alert.alert(
                    "Purchase Failed",
                    error?.message ||
                    "Something went wrong while starting the game purchase."
                );
            },
        });
    };

    const handleRestorePurchase = async () => {
        try {
            setLoadingPurchase(true);

            const existingPurchase =
                await getOwnedGamesPackPurchase();

            if (!existingPurchase) {
                Alert.alert(
                    "No Purchase Found",
                    "No previous game purchase was found for this store account.",
                );

                return;
            }

            await verifyGamePurchaseOnBackend(
                existingPurchase,
            );
        } catch (error) {
            console.log("Restore purchase error:", error);

            Alert.alert(
                "Restore Failed",
                "We couldn’t restore your purchase. Please try again.",
            );
        } finally {
            setLoadingPurchase(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Sounds
    |--------------------------------------------------------------------------
    */

    const loadSounds = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const charades =
                await Audio.Sound.createAsync(
                    require("../../../assets/sounds/soniccashregister.mp3"),
                );

            const mostLikely =
                await Audio.Sound.createAsync(
                    require("../../../assets/sounds/card-flip.mp3"),
                );

            const impostor =
                await Audio.Sound.createAsync(
                    require("../../../assets/sounds/amongus2.mp3"),
                );

            charadesSoundRef.current = charades.sound;
            mostLikelySoundRef.current =
                mostLikely.sound;
            impostorSoundRef.current = impostor.sound;
        } catch (error) {
            console.log("Game home sound load error:", error);
        }
    };

    const safeUnload = async (
        soundRef: Audio.Sound | null,
    ) => {
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

        charadesSoundRef.current = null;
        mostLikelySoundRef.current = null;
        impostorSoundRef.current = null;
    };

    const playSound = async (soundType: GameSound) => {
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

            if (!sound) {
                return;
            }

            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (error) {
            console.log("Game sound error:", error);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Navigation
    |--------------------------------------------------------------------------
    */

    const handleGamePress = async (
        route: string,
        soundType: GameSound,
    ) => {
        await playSound(soundType);

        setTimeout(() => {
            if (!gamesPackagePurchased) {
                openPaywall();
                return;
            }

            navigation.navigate(route);
        }, 120);
    };

    /*
    |--------------------------------------------------------------------------
    | Initial Setup
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        void loadSounds();
        void loadIAP();
        void fetchEntitlements();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },

            onGamesPackSuccess: async (purchase: any) => {
                await verifyGamePurchaseOnBackend(purchase);
            },

            onBlogsSubscriptionSuccess: async () => { },

            onPurchaseError: (error: any) => {
                setLoadingPurchase(false);

                console.log(
                    "Purchase error listener:",
                    error,
                );
            },
        });

        return () => {
            void unloadSounds();
            void cleanupIAP();
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Card Entrance Animation
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        Animated.stagger(
            110,
            cardAnimations.map((animation) =>
                Animated.timing(animation, {
                    toValue: 1,
                    duration: 480,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ),
        ).start();
    }, [cardAnimations]);

    /*
    |--------------------------------------------------------------------------
    | Modal Animation
    |--------------------------------------------------------------------------
    */

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
                easing: Easing.out(Easing.back(1.35)),
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, [modalOpacity, modalScale, paywallVisible]);

    /*
    |--------------------------------------------------------------------------
    | Feature Row
    |--------------------------------------------------------------------------
    */

    const FeatureRow = ({
        icon,
        text,
        color,
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        text: string;
        color: string;
    }) => {
        return (
            <View
                style={[
                    styles.featureRow,
                    {
                        borderColor: `${color}55`,
                        backgroundColor: `${color}0D`,
                    },
                ]}
            >
                <View
                    style={[
                        styles.featureIconBubble,
                        {
                            backgroundColor: `${color}18`,
                            borderColor: `${color}55`,
                        },
                    ]}
                >
                    <Ionicons
                        name={icon}
                        size={18}
                        color={color}
                    />
                </View>

                <Text
                    style={[
                        styles.featureText,
                        {
                            color,
                        },
                    ]}
                >
                    {text}
                </Text>

                <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={color}
                />
            </View>
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    if (checkingEntitlements || !fontsLoaded) {
        return (
            <GameScreenWrapper themeMode={THEME_MODE}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color={theme.cyan}
                    />
                </View>
            </GameScreenWrapper>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <GameScreenWrapper themeMode={THEME_MODE}>
            <View style={styles.screen}>
                <View style={styles.topRow}>
                    <GameBackButton
                        themeMode={THEME_MODE}
                    />

                    <View style={styles.titleWrap}>
                        <Text style={styles.eyebrow}>
                            SCOOLFOOLS
                        </Text>

                        <Text style={styles.screenTitle}>
                            Party Games
                        </Text>
                    </View>

                    <View style={styles.controllerBadge}>
                        <Ionicons
                            name="game-controller"
                            size={22}
                            color={theme.cyan}
                        />
                    </View>
                </View>

                <Text style={styles.screenSubtitle}>
                    Pick a game and make the study break
                    unforgettable.
                </Text>


                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {games.map((game, index) => {
                        const cardTranslateY =
                            cardAnimations[
                                index
                            ].interpolate({
                                inputRange: [0, 1],
                                outputRange: [28, 0],
                            });

                        const cardScale =
                            cardAnimations[
                                index
                            ].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.97, 1],
                            });

                        return (
                            <Animated.View
                                key={game.title}
                                style={{
                                    opacity:
                                        cardAnimations[index],

                                    transform: [
                                        {
                                            translateY:
                                                cardTranslateY,
                                        },
                                        {
                                            scale: cardScale,
                                        },
                                    ],
                                }}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={() =>
                                        handleGamePress(
                                            game.route,
                                            game.sound,
                                        )
                                    }
                                    style={[
                                        styles.gameCard,
                                        {
                                            borderColor: `${game.accentColor}70`,
                                            shadowColor:
                                                game.accentColor,
                                        },
                                    ]}
                                >
                                    <View
                                        style={
                                            styles.gameImageContainer
                                        }
                                    >
                                        <Image
                                            source={game.image}
                                            style={styles.gameImage}
                                            resizeMode="contain"
                                        />

                                        <View
                                            style={[
                                                styles.cardStatus,
                                                {
                                                    borderColor: `${game.accentColor}80`,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={
                                                    gamesPackagePurchased
                                                        ? "play"
                                                        : "lock-closed"
                                                }
                                                size={16}
                                                color={
                                                    game.accentColor
                                                }
                                            />
                                        </View>
                                    </View>

                                    <View
                                        style={
                                            styles.gameInformation
                                        }
                                    >
                                        <View
                                            style={
                                                styles.gameTitleRow
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.gameIconBubble,
                                                    {
                                                        backgroundColor: `${game.accentColor}16`,
                                                        borderColor: `${game.accentColor}45`,
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={
                                                        game.icon
                                                    }
                                                    size={18}
                                                    color={
                                                        game.accentColor
                                                    }
                                                />
                                            </View>

                                            <Text
                                                style={
                                                    styles.gameTitle
                                                }
                                            >
                                                {game.title}
                                            </Text>
                                        </View>

                                        <Text
                                            style={
                                                styles.gameDescription
                                            }
                                        >
                                            {game.description}
                                        </Text>

                                        <View
                                            style={
                                                styles.playRow
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.playText,
                                                    {
                                                        color: game.accentColor,
                                                    },
                                                ]}
                                            >
                                                {gamesPackagePurchased
                                                    ? "PLAY NOW"
                                                    : "TAP TO UNLOCK"}
                                            </Text>

                                            <Ionicons
                                                name="arrow-forward"
                                                size={19}
                                                color={
                                                    game.accentColor
                                                }
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    <View style={styles.bottomSpacer} />
                </ScrollView>

                <Modal
                    visible={paywallVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={closePaywall}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable
                            style={styles.modalBackdrop}
                            onPress={closePaywall}
                        />

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
                                <Ionicons
                                    name="close"
                                    size={21}
                                    color="#FFFFFF"
                                />
                            </TouchableOpacity>

                            <View style={styles.paywallHeroIcon}>
                                <Ionicons
                                    name="game-controller"
                                    size={36}
                                    color={theme.cyan}
                                />
                            </View>

                            <Text style={styles.paywallEyebrow}>
                                SCOOLFOOLS PARTY PACK
                            </Text>

                            <Text style={styles.paywallTitle}>
                                Unlock All Party Games
                            </Text>

                            <Text style={styles.paywallSubtitle}>
                                Get all three game modes with one purchase.
                                No subscription.
                            </Text>

                            <View style={styles.featureGrid}>
                                <FeatureRow
                                    icon="body-outline"
                                    text="Study Break Charades"
                                    color="#22D3EE"
                                />

                                <FeatureRow
                                    icon="people-outline"
                                    text="Most Likely"
                                    color="#C084FC"
                                />

                                <FeatureRow
                                    icon="eye-outline"
                                    text="Impostor"
                                    color="#FF3B30"
                                />
                            </View>

                            <View style={styles.paywallPriceBox}>
                                <Text style={styles.onlyText}>
                                    ONLY
                                </Text>

                                <Text style={styles.paywallPrice}>
                                    {product?.localizedPrice || "$4.99"}
                                </Text>

                                <View style={styles.priceDetailRow}>
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={16}
                                        color="#39FF14"
                                    />

                                    <Text style={styles.paywallPriceSub}>
                                        One-time purchase
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.unlockButton,
                                    loadingPurchase &&
                                    styles.unlockButtonDisabled,
                                ]}
                                activeOpacity={0.9}
                                onPress={handleUnlockPress}
                                disabled={loadingPurchase}
                            >
                                {loadingPurchase ? (
                                    <ActivityIndicator color="#031007" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="lock-open"
                                            size={20}
                                            color="#031007"
                                        />

                                        <Text style={styles.unlockButtonText}>
                                            Unlock All Games
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleRestorePurchase}
                                disabled={loadingPurchase}
                            >
                                <Text style={styles.restoreText}>
                                    {loadingPurchase
                                        ? "Restoring..."
                                        : "Restore Purchase"}
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.finePrint}>
                                Includes Study Break Charades, Most Likely,
                                and Impostor.
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
                        onAnimationEnd={() =>
                            setShowConfetti(false)
                        }
                    />
                )}
            </View>
        </GameScreenWrapper>
    );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.background,
    },

    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.background,
    },

    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },

    titleWrap: {
        flex: 1,
        marginLeft: 14,
    },

    eyebrow: {
        color: theme.cyan,
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 2,
    },

    screenTitle: {
        color: theme.text,
        fontSize: 34,
        lineHeight: 36,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.5,
        marginTop: -2,
    },

    controllerBadge: {
        width: 43,
        height: 43,
        borderRadius: 21.5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderStrong,
    },

    screenSubtitle: {
        color: theme.textSoft,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 15,
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom:
            Platform.OS === "android" ? 220 : 155,
    },

    gameCard: {
        width: "100%",

        backgroundColor: theme.surface,

        borderRadius: 25,
        borderWidth: 1.2,

        marginBottom: 20,

        overflow: "hidden",

        shadowOffset: {
            width: 0,
            height: 0,
        },

        shadowOpacity: 0.22,
        shadowRadius: 16,

        elevation: 7,
    },

    gameImageContainer: {
        width: "100%",
        aspectRatio: 1,

        position: "relative",

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#000000",

        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },

    gameImage: {
        width: "100%",
        height: "100%",
    },

    cardStatus: {
        position: "absolute",
        top: 13,
        right: 13,

        width: 39,
        height: 39,
        borderRadius: 19.5,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(2,6,23,0.90)",

        borderWidth: 1,
    },

    gameInformation: {
        paddingHorizontal: 16,
        paddingTop: 15,
        paddingBottom: 15,

        backgroundColor: theme.surface,
    },

    gameTitleRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    gameIconBubble: {
        width: 34,
        height: 34,
        borderRadius: 17,

        alignItems: "center",
        justifyContent: "center",

        borderWidth: 1,

        marginRight: 10,
    },

    gameTitle: {
        flex: 1,

        color: theme.text,

        fontSize: 24,
        lineHeight: 27,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
    },

    gameDescription: {
        color: theme.textSoft,

        fontSize: 13.5,
        lineHeight: 19,

        marginTop: 9,
    },

    playRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        marginTop: 13,
    },

    playText: {
        fontSize: 12,

        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.2,
    },

    bottomSpacer: {
        height: 24,
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },

    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.overlay,
    },

    paywallCard: {
        width: "100%",
        maxHeight: "90%",

        alignItems: "center",

        backgroundColor: "#070B14",

        borderRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.24)",

        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 18,

        shadowColor: "#22D3EE",
        shadowOffset: {
            width: 0,
            height: 0,
        },

        shadowOpacity: 0.22,
        shadowRadius: 22,

        elevation: 14,
    },

    closeButton: {
        position: "absolute",
        top: 14,
        right: 14,

        width: 35,
        height: 35,
        borderRadius: 17.5,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: theme.surfaceSoft,

        borderWidth: 1,
        borderColor: theme.border,

        zIndex: 10,
    },

    paywallHeroIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,

        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "rgba(34,211,238,0.10)",

        borderWidth: 1,
        borderColor: "rgba(34,211,238,0.38)",

        marginBottom: 12,

        shadowColor: "#22D3EE",
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: {
            width: 0,
            height: 0,
        },
    },

    paywallEyebrow: {
        color: theme.cyan,
        fontSize: 12,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 1.8,
        marginBottom: 3,
    },

    paywallTitle: {
        color: theme.text,
        fontSize: 28,
        lineHeight: 30,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,
        textAlign: "center",
    },

    paywallSubtitle: {
        color: theme.textSoft,
        fontSize: 13.5,
        lineHeight: 19,
        textAlign: "center",
        marginTop: 7,
        marginBottom: 16,
        paddingHorizontal: 8,
    },

    featureGrid: {
        width: "100%",
        marginBottom: 14,
    },

    featureRow: {
        minHeight: 54,

        flexDirection: "row",
        alignItems: "center",

        borderRadius: 16,
        borderWidth: 1,

        paddingHorizontal: 12,
        paddingVertical: 9,

        marginBottom: 8,
    },

    featureIconBubble: {
        width: 34,
        height: 34,
        borderRadius: 12,

        alignItems: "center",
        justifyContent: "center",

        borderWidth: 1,

        marginRight: 11,
    },

    featureText: {
        flex: 1,
        fontSize: 16,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
    },

    paywallPriceBox: {
        width: "100%",

        alignItems: "center",

        backgroundColor: "rgba(57,255,20,0.06)",

        borderWidth: 1,
        borderColor: "rgba(57,255,20,0.30)",
        borderRadius: 19,

        paddingVertical: 12,
        marginBottom: 14,
    },

    onlyText: {
        color: "#39FF14",
        fontSize: 13,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 2.2,
        marginBottom: -2,
    },

    paywallPrice: {
        color: "#39FF14",
        fontSize: 40,
        lineHeight: 43,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.4,

        textShadowColor: "rgba(57,255,20,0.30)",
        textShadowOffset: {
            width: 0,
            height: 0,
        },
        textShadowRadius: 10,
    },

    priceDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },

    paywallPriceSub: {
        color: theme.textSoft,
        fontSize: 12.5,
        marginLeft: 6,
    },

    unlockButton: {
        width: "100%",
        height: 52,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        backgroundColor: "#39FF14",
        borderRadius: 17,

        marginBottom: 12,

        shadowColor: "#39FF14",
        shadowOpacity: 0.24,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 6,
    },

    unlockButtonDisabled: {
        opacity: 0.68,
    },

    unlockButtonText: {
        color: "#031007",
        fontSize: 18,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.35,
        marginLeft: 8,
    },

    restoreText: {
        color: theme.cyan,
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
        paddingHorizontal: 8,
    },
});