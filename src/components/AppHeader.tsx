import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Image,
    ImageSourcePropType,
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
        background: "#FFFFFF",

        // Day mode keeps the avatar-colored card.
        card: avatarAccent,
        surface: "#FFFFFF",

        glow: avatarAccent,
        glowOpacity: 0,
        cardBorder: "rgba(7,17,31,0.10)",

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

    /*
    |--------------------------------------------------------------------------
    | Selected Avatar
    |--------------------------------------------------------------------------
    */

    const selectedAvatarId = useMemo(() => {
        if (user?.selectedAvatar) {
            return user.selectedAvatar;
        }

        if (
            user?.avatar &&
            !user.avatar.startsWith("http")
        ) {
            return user.avatar;
        }

        return null;
    }, [user]);

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
    | Initial Load
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        loadStoredUser();
    }, [loadStoredUser]);

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
                }
            );

        return unsubscribe;
    }, [
        navigation,
        loadStoredUser,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Refresh Badge Whenever Header Becomes Focused
    |--------------------------------------------------------------------------
    */

    useFocusEffect(
        useCallback(() => {
            refreshUnreadCount();
        }, [refreshUnreadCount])
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
                            {!userLoaded ? (
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
                        style={
                            styles.logoWrapper
                        }
                    >
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                                navigation.navigate(
                                    "MainTabs",
                                    {
                                        screen:
                                            "MainTabs",

                                        params: {
                                            screen:
                                                "Home",
                                        },
                                    }
                                )
                            }
                            style={
                                styles.logoPressable
                            }
                        >
                            <Image
                                source={require("../../assets/images/scoolfoolsheader.png")}
                                style={styles.logo}
                                resizeMode="contain"
                                fadeDuration={0}
                            />
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
            backgroundColor:
                theme.background,
        },

        headerBackground: {
            backgroundColor:
                theme.background,

            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 8,

            position: "relative",
        },

        cardGlow: {
            position: "absolute",

            left: 18,
            right: 18,
            top: 12,
            bottom: 12,

            borderRadius: 24,

            backgroundColor:
                theme.glow,

            opacity:
                theme.glowOpacity,

            transform: [
                {
                    scaleX: 1.015,
                },
                {
                    scaleY: 1.08,
                },
            ],

            shadowColor:
                theme.glow,

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
            height: 68,

            backgroundColor:
                theme.card,

            borderRadius: 20,

            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",

            paddingHorizontal: 16,

            position: "relative",

            borderWidth:
                theme.mode === "night"
                    ? 0.15
                    : 1,

            borderColor:
                theme.mode === "night"
                    ? theme.cardBorder
                    : theme.border,

            shadowColor:
                theme.mode === "night"
                    ? theme.glow
                    : "#000",

            shadowOffset: {
                width: 0,
                height:
                    theme.mode === "night"
                        ? 0
                        : 8,
            },

            shadowOpacity:
                theme.mode === "day"
                    ? 0.12
                    : 0.28,

            shadowRadius:
                theme.mode === "day"
                    ? 9
                    : 14,

            elevation: 6,
        },

        sideLeft: {
            width: 72,
            height: "100%",

            justifyContent: "center",
            alignItems: "flex-start",

            zIndex: 5,
        },

        sideRight: {
            width: 72,
            height: "100%",

            justifyContent: "center",
            alignItems: "flex-end",

            zIndex: 5,
        },

        avatarButton: {
            width: 44,
            height: 44,
            borderRadius: 22,

            alignItems: "center",
            justifyContent: "center",

            backgroundColor:
                theme.surface,

            borderWidth: 1.5,

            borderColor:
                theme.buttonBorder,

            overflow: "hidden",

            shadowColor:
                theme.cyan,

            shadowOffset: {
                width: 0,
                height: 3,
            },

            shadowOpacity: 0.14,
            shadowRadius: 7,

            elevation: 4,
        },

        avatarPlaceholder: {
            width: "100%",
            height: "100%",
        },

        avatarImage: {
            width: "100%",
            height: "100%",
            borderRadius: 22,
        },

        logoWrapper: {
            position: "absolute",

            left: 72,
            right: 72,
            top: 0,
            bottom: 0,

            justifyContent: "center",
            alignItems: "center",

            zIndex: 1,
        },

        logoPressable: {
            justifyContent: "center",
            alignItems: "center",
        },

        logo: {
            width: 180,
            height: 52,

            transform: [
                {
                    scale: 1.98,
                },
                {
                    translateX: -3,
                },
                {
                    translateY: 3,
                },
                {
                    rotate: "1deg",
                },
            ],
        },

        bellWrapper: {
            position: "relative",
        },

        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 14,

            alignItems: "center",
            justifyContent: "center",

            backgroundColor:
                theme.surface,

            borderWidth: 1,

            borderColor:
                theme.buttonBorder,

            shadowColor:
                theme.cyan,

            shadowOffset: {
                width: 0,
                height: 3,
            },

            shadowOpacity: 0.14,
            shadowRadius: 7,

            elevation: 4,
        },

        iconButtonActive: {
            backgroundColor:
                theme.activeBackground,

            borderColor:
                theme.activeBorder,
        },

        iconButtonFullyActive: {
            backgroundColor:
                theme.yellow,

            borderColor:
                theme.yellow,
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
            borderColor:
                theme.card,

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
    });