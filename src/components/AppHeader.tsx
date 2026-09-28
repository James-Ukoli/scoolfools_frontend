import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    Image,
    ImageSourcePropType,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
} from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import {
    useFocusEffect,
    useNavigation,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    useNotifications,
} from "../context/NotificationsContext";
import {
    useNotificationFeed,
} from "../context/NotificationFeedContext";
import {
    useTimeTheme,
    type TimeTheme,
} from "../context/TimeThemeContext";
const HEADER_CYAN = "#06B6D4";
const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;
type StoredUser = {
    selectedAvatar?: string | null;
    providerAvatar?: string | null;
    avatar?: string | null;
};
const AVATAR_IMAGES: Record<
    string,
    ImageSourcePropType
> = {
    basicBlue: require("../../assets/images/profileimages/basicBlue.png"),
    basicGreen: require("../../assets/images/profileimages/basicGreen.png"),
    basicOrange: require("../../assets/images/profileimages/basicOrange.png"),
    basicPink: require("../../assets/images/profileimages/basicPink.png"),
    basicPurple: require("../../assets/images/profileimages/basicPurple.png"),
    basicYellow: require("../../assets/images/profileimages/basicYellow.png"),
    diamondBoy: require("../../assets/images/profileimages/diamondBoy.png"),
    diamondGirl: require("../../assets/images/profileimages/diamondGirl.png"),
};
/*
|--------------------------------------------------------------------------
| Avatar Background Colors
|--------------------------------------------------------------------------
*/
const AVATAR_BACKGROUND_COLORS: Record<
    string,
    string
> = {
    basicBlue: "#06B6D4",
    basicGreen: "#22C55E",
    basicPurple: "#8B5CF6",
    basicOrange: "#F97316",
    basicPink: "#EC4899",
    basicYellow: "#FACC15",
    diamondBoy: "#0891B2",
    diamondGirl: "#DB2777",
};
/*
|--------------------------------------------------------------------------
| Header Theme
|--------------------------------------------------------------------------
*/
const getHeaderTheme = (
    mode: TimeTheme,
    selectedAvatar?: string | null
) => {
    const isDay = mode === "day";
    const avatarAccent =
        selectedAvatar &&
            AVATAR_BACKGROUND_COLORS[selectedAvatar]
            ? AVATAR_BACKGROUND_COLORS[selectedAvatar]
            : HEADER_CYAN;
    if (!isDay) {
        return {
            mode,
            background: "#020617",
            // Keep the night header card dark.
            card: "#07111F",
            surface: "#0B1728",
            // The selected avatar only affects the glow and border.
            glow: avatarAccent,
            glowOpacity: 0.16,
            cardBorder: avatarAccent,
            icon: "#FFFFFF",
            cyan: "#22D3EE",
            yellow: "#FACC15",
            border: "rgba(255,255,255,0.08)",
            buttonBorder: "rgba(255,255,255,0.12)",
            activeBackground: "rgba(34,211,238,0.12)",
            activeBorder: "rgba(34,211,238,0.35)",
        };
    }
    return {
        mode,
        background: "#F8FAFC",
        // Day mode uses a clean white header with no colored card.
        card: "#FFFFFF",
        surface: "#FFFFFF",
        glow: avatarAccent,
        glowOpacity: 0,
        cardBorder: "transparent",
        icon: "#07111F",
        cyan: HEADER_CYAN,
        yellow: "#FACC15",
        border: "rgba(7,17,31,0.10)",
        buttonBorder: "rgba(7,17,31,0.10)",
        activeBackground: "#FFFFFF",
        activeBorder: "rgba(7,17,31,0.15)",
    };
};
/*
|--------------------------------------------------------------------------
| Header
|--------------------------------------------------------------------------
*/
export default function AppHeader() {
    const navigation = useNavigation<any>();
    const {
        mode: themeMode,
    } = useTimeTheme();
    const {
        featuredEnabled,
        alertsEnabled,
    } = useNotifications();
    const {
        unreadCount,
        refreshUnreadCount,
    } = useNotificationFeed();
    const [user, setUser] =
        useState<StoredUser | null>(null);
    const [userLoaded, setUserLoaded] =
        useState(false);
    const [isSubscribed, setIsSubscribed] =
        useState(false);
    const [entitlementsLoaded, setEntitlementsLoaded] =
        useState(false);
    /*
    |--------------------------------------------------------------------------
    | Selected Avatar
    |--------------------------------------------------------------------------
    */
    const selectedAvatarId = useMemo(() => {
        if (!userLoaded) {
            return null;
        }
        // First choice: explicitly selected built-in avatar
        if (
            user?.selectedAvatar &&
            AVATAR_IMAGES[user.selectedAvatar]
        ) {
            return user.selectedAvatar;
        }
        // Second choice: built-in avatar stored in avatar
        if (
            user?.avatar &&
            !user.avatar.startsWith("http") &&
            AVATAR_IMAGES[user.avatar]
        ) {
            return user.avatar;
        }
        // Default fallback
        return "basicBlue";
    }, [
        userLoaded,
        user,
    ]);
    /*
    |--------------------------------------------------------------------------
    | Theme
    |--------------------------------------------------------------------------
    */
    const theme = useMemo(
        () =>
            getHeaderTheme(
                themeMode,
                selectedAvatarId
            ),
        [
            themeMode,
            selectedAvatarId,
        ]
    );
    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );
    /*
    |--------------------------------------------------------------------------
    | Load Stored User
    |--------------------------------------------------------------------------
    */
    const loadStoredUser = useCallback(
        async () => {
            try {
                const storedUser =
                    await AsyncStorage.getItem(
                        "user"
                    );
                if (!storedUser) {
                    setUser(null);
                    return;
                }
                const parsedUser: StoredUser =
                    JSON.parse(storedUser);
                setUser(parsedUser);
            } catch (error) {
                console.log(
                    "Header user load error:",
                    error
                );
                setUser(null);
            } finally {
                setUserLoaded(true);
            }
        },
        []
    );
    /*
    |--------------------------------------------------------------------------
    | Load Subscription Entitlement
    |--------------------------------------------------------------------------
    */
    const loadSubscriptionEntitlement = useCallback(
        async () => {
            try {
                const token =
                    await AsyncStorage.getItem(
                        "token"
                    );
                if (!token || !API_BASE_URL) {
                    setIsSubscribed(false);
                    return;
                }
                const response = await fetch(
                    `${API_BASE_URL}/api/auth/me/entitlements`,
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );
                if (!response.ok) {
                    setIsSubscribed(false);
                    return;
                }
                const data =
                    await response.json();
                setIsSubscribed(
                    data?.success === true &&
                    data?.entitlements?.isSubscribed === true
                );
            } catch (error) {
                console.log(
                    "Header entitlement load error:",
                    error
                );
                setIsSubscribed(false);
            } finally {
                setEntitlementsLoaded(true);
            }
        },
        []
    );
    /*
    |--------------------------------------------------------------------------
    | Initial Load
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        loadStoredUser();
        loadSubscriptionEntitlement();
    }, [
        loadStoredUser,
        loadSubscriptionEntitlement,
    ]);
    /*
    |--------------------------------------------------------------------------
    | Reload User After Navigation Changes
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        const unsubscribe =
            navigation.addListener(
                "state",
                () => {
                    loadStoredUser();
                    loadSubscriptionEntitlement();
                }
            );
        return unsubscribe;
    }, [
        navigation,
        loadStoredUser,
        loadSubscriptionEntitlement,
    ]);
    /*
    |--------------------------------------------------------------------------
    | Refresh Badge Whenever Header Becomes Focused
    |--------------------------------------------------------------------------
    */
    useFocusEffect(
        useCallback(() => {
            loadStoredUser();
            loadSubscriptionEntitlement();
            refreshUnreadCount();
        }, [
            loadStoredUser,
            loadSubscriptionEntitlement,
            refreshUnreadCount,
        ])
    );
    /*
    |--------------------------------------------------------------------------
    | Avatar Source
    |--------------------------------------------------------------------------
    */
    const selectedAvatarSource =
        selectedAvatarId
            ? AVATAR_IMAGES[selectedAvatarId]
            : null;
    const remoteAvatarUrl =
        user?.providerAvatar ||
        (
            user?.avatar?.startsWith("http")
                ? user.avatar
                : null
        );
    /*
    |--------------------------------------------------------------------------
    | Notification Bell State
    |--------------------------------------------------------------------------
    */
    const isOneEnabled =
        featuredEnabled ||
        alertsEnabled;
    const isBothEnabled =
        featuredEnabled &&
        alertsEnabled;
    const bellColor =
        isBothEnabled
            ? theme.icon
            : theme.cyan;
    const hasUnreadNotifications =
        unreadCount > 0;
    const unreadBadgeText =
        unreadCount > 99
            ? "99+"
            : String(unreadCount);
    /*
    |--------------------------------------------------------------------------
    | Open Notifications
    |--------------------------------------------------------------------------
    */
    const handleOpenNotifications =
        useCallback(() => {
            navigation.navigate(
                "MainTabs",
                {
                    screen:
                        "Notifications",
                }
            );
        }, [navigation]);
    return (
        <SafeAreaView
            edges={["top"]}
            style={styles.safeArea}
        >
            <View
                style={
                    styles.headerBackground
                }
            >
                <View
                    pointerEvents="none"
                    style={styles.cardGlow}
                />
                <View style={styles.card}>
                    <View
                        style={styles.sideLeft}
                    >
                        <TouchableOpacity
                            style={
                                styles.avatarButton
                            }
                            activeOpacity={0.8}
                            onPress={() =>
                                navigation.navigate(
                                    "MainTabs",
                                    {
                                        screen: "Menu",
                                    }
                                )
                            }
                        >
                            {!userLoaded || !entitlementsLoaded ? (
                                <View
                                    style={
                                        styles.avatarPlaceholder
                                    }
                                />
                            ) : selectedAvatarSource ? (
                                <Image
                                    source={
                                        selectedAvatarSource
                                    }
                                    style={
                                        styles.avatarImage
                                    }
                                    resizeMode="cover"
                                    fadeDuration={0}
                                />
                            ) : remoteAvatarUrl ? (
                                <Image
                                    source={{
                                        uri: remoteAvatarUrl,
                                    }}
                                    style={
                                        styles.avatarImage
                                    }
                                    resizeMode="cover"
                                    fadeDuration={0}
                                />
                            ) : (
                                <Feather
                                    name="user"
                                    size={20}
                                    color={
                                        theme.cyan
                                    }
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                    <View
                        pointerEvents="box-none"
                        style={styles.logoWrapper}
                    >
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                                navigation.navigate(
                                    "MainTabs",
                                    {
                                        screen: "MainTabs",
                                        params: {
                                            screen: "Home",
                                        },
                                    }
                                )
                            }
                            style={styles.logoPressable}
                        >
                            <View style={styles.monogramWrap}>
                                <View style={styles.letterWrap}>
                                    {themeMode === "night" && (
                                        <Text style={styles.monogramOutline}>S</Text>
                                    )}
                                    <Text style={styles.monogramS}>S</Text>
                                </View>
                                <View style={[styles.letterWrap, { marginLeft: -2 }]}>
                                    {themeMode === "night" && (
                                        <Text style={styles.monogramOutline}>F</Text>
                                    )}
                                    <Text style={styles.monogramF}>F</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View
                        style={styles.sideRight}
                    >
                        <View
                            style={
                                styles.bellWrapper
                            }
                        >
                            <TouchableOpacity
                                style={[
                                    styles.iconButton,
                                    isOneEnabled &&
                                    styles.iconButtonActive,
                                    isBothEnabled &&
                                    styles.iconButtonFullyActive,
                                ]}
                                activeOpacity={0.8}
                                onPress={
                                    handleOpenNotifications
                                }
                            >
                                <FontAwesome6
                                    name="bell"
                                    size={20}
                                    color={
                                        bellColor
                                    }
                                />
                            </TouchableOpacity>
                            {hasUnreadNotifications && (
                                <View
                                    pointerEvents="none"
                                    style={[
                                        styles.unreadBadge,
                                        unreadCount > 99 &&
                                        styles.unreadBadgeWide,
                                    ]}
                                >
                                    <Text
                                        style={
                                            styles.unreadBadgeText
                                        }
                                        numberOfLines={1}
                                    >
                                        {
                                            unreadBadgeText
                                        }
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/
const createStyles = (
    theme: ReturnType<
        typeof getHeaderTheme
    >
) =>
    StyleSheet.create({
        safeArea: {
            backgroundColor: theme.background,
        },
        headerBackground: {
            backgroundColor: theme.background,
            paddingHorizontal: theme.mode === "night" ? 14 : 16,
            paddingTop: theme.mode === "night" ? 8 : 7,
            paddingBottom: theme.mode === "night" ? 8 : 7,
            position: "relative",
        },
        cardGlow: {
            position: "absolute",
            left: 18,
            right: 18,
            top: 12,
            bottom: 12,
            borderRadius: 24,
            backgroundColor: theme.glow,
            opacity: theme.glowOpacity,
            transform: [
                {
                    scaleX: 1.015,
                },
                {
                    scaleY: 1.08,
                },
            ],
            shadowColor: theme.glow,
            shadowOffset: {
                width: 0,
                height: 0,
            },
            shadowOpacity:
                theme.mode === "night"
                    ? 0.62
                    : 0,
            shadowRadius: 18,
            elevation:
                theme.mode === "night"
                    ? 5
                    : 0,
        },
        card: {
            height: theme.mode === "night" ? 68 : 58,
            backgroundColor: theme.card,
            borderRadius: theme.mode === "night" ? 20 : 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.mode === "night" ? 16 : 4,
            position: "relative",
            borderWidth: theme.mode === "night" ? 0.15 : 0,
            borderColor:
                theme.mode === "night"
                    ? theme.cardBorder
                    : "transparent",
            shadowColor:
                theme.mode === "night"
                    ? theme.glow
                    : "transparent",
            shadowOffset: {
                width: 0,
                height: 0,
            },
            shadowOpacity: theme.mode === "night" ? 0.28 : 0,
            shadowRadius: theme.mode === "night" ? 14 : 0,
            elevation: theme.mode === "night" ? 6 : 0,
        },
        sideLeft: {
            width: theme.mode === "night" ? 72 : 58,
            height: "100%",
            justifyContent: "center",
            alignItems: "flex-start",
            zIndex: 5,
        },
        sideRight: {
            width: theme.mode === "night" ? 72 : 58,
            height: "100%",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 5,
        },
        avatarButton: {
            width: theme.mode === "night" ? 44 : 42,
            height: theme.mode === "night" ? 44 : 42,
            borderRadius: theme.mode === "night" ? 22 : 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.surface,
            borderWidth: theme.mode === "night" ? 1.5 : 1.5,
            borderColor:
                theme.mode === "night"
                    ? theme.buttonBorder
                    : "rgba(7,17,31,0.10)",
            overflow: "hidden",
            shadowColor:
                theme.mode === "night"
                    ? theme.cyan
                    : "transparent",
            shadowOffset: {
                width: 0,
                height: 3,
            },
            shadowOpacity: theme.mode === "night" ? 0.14 : 0,
            shadowRadius: theme.mode === "night" ? 7 : 0,
            elevation: theme.mode === "night" ? 4 : 0,
        },
        avatarPlaceholder: {
            width: "100%",
            height: "100%",
        },
        avatarImage: {
            width: "100%",
            height: "100%",
            borderRadius: theme.mode === "night" ? 22 : 21,
        },
        logoWrapper: {
            position: "absolute",
            left: theme.mode === "night" ? 72 : 58,
            right: theme.mode === "night" ? 72 : 58,
            top: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1,
        },
        logoPressable: {
            justifyContent: "center",
            alignItems: "center",
            minHeight: 42,
            paddingHorizontal: 6,
        },
        monogramWrap: {
            minWidth: theme.mode === "night" ? 92 : 84,
            height: theme.mode === "night" ? 42 : 38,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            transform:
                theme.mode === "night"
                    ? [{ translateY: 1 }]
                    : [{ translateY: 0 }],
        },
        bellWrapper: {
            position: "relative",
        },
        iconButton: {
            width: theme.mode === "night" ? 44 : 42,
            height: theme.mode === "night" ? 44 : 42,
            borderRadius: theme.mode === "night" ? 14 : 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                theme.mode === "night"
                    ? theme.surface
                    : "transparent",
            borderWidth: theme.mode === "night" ? 1 : 0,
            borderColor:
                theme.mode === "night"
                    ? theme.buttonBorder
                    : "transparent",
            shadowColor:
                theme.mode === "night"
                    ? theme.cyan
                    : "transparent",
            shadowOffset: {
                width: 0,
                height: 3,
            },
            shadowOpacity: theme.mode === "night" ? 0.14 : 0,
            shadowRadius: theme.mode === "night" ? 7 : 0,
            elevation: theme.mode === "night" ? 4 : 0,
        },
        iconButtonActive: {
            backgroundColor:
                theme.mode === "night"
                    ? theme.activeBackground
                    : "transparent",
            borderColor:
                theme.mode === "night"
                    ? theme.activeBorder
                    : "transparent",
        },
        iconButtonFullyActive: {
            backgroundColor:
                theme.mode === "night"
                    ? theme.yellow
                    : "transparent",
            borderColor:
                theme.mode === "night"
                    ? theme.yellow
                    : "transparent",
        },
        unreadBadge: {
            position: "absolute",
            top: -7,
            right: -7,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#EF4444",
            borderWidth: 2,
            borderColor: theme.card,
            zIndex: 20,
            elevation: 10,
        },
        unreadBadgeWide: {
            minWidth: 30,
        },
        unreadBadgeText: {
            color: "#FFFFFF",
            fontSize: 10,
            lineHeight: 12,
            fontWeight: "800",
            textAlign: "center",
            includeFontPadding: false,
        },
        letterWrap: {
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
        },
        monogramOutline: {
            position: "absolute",
            color: "#000000",
            fontSize: theme.mode === "night" ? 39 : 35,
            lineHeight: theme.mode === "night" ? 40 : 36,
            fontWeight: "900",
            letterSpacing: 1,
            textTransform: "uppercase",
            includeFontPadding: false,
            textShadowColor: "#000000",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 1.5,
            zIndex: 1,
        },
        monogramS: {
            color: "#FACC15",
            fontSize: theme.mode === "night" ? 35 : 34,
            lineHeight: theme.mode === "night" ? 36 : 35,
            fontWeight: "900",
            letterSpacing: 1,
            textTransform: "uppercase",
            includeFontPadding: false,
            textShadowColor:
                theme.mode === "night"
                    ? "rgba(0,0,0,0.45)"
                    : "transparent",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: theme.mode === "night" ? 1 : 0,
            zIndex: 2,
            marginRight: 2,
        },
        monogramF: {
            color: "#EF4444",
            fontSize: theme.mode === "night" ? 35 : 34,
            lineHeight: theme.mode === "night" ? 36 : 35,
            fontWeight: "900",
            letterSpacing: 1,
            textTransform: "uppercase",
            includeFontPadding: false,
            textShadowColor:
                theme.mode === "night"
                    ? "rgba(0,0,0,0.45)"
                    : "transparent",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: theme.mode === "night" ? 1 : 0,
            zIndex: 2,
        },
    });