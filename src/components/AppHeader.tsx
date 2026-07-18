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
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotifications } from "../context/NotificationsContext";

const HEADER_CYAN = "#06B6D4";

type TimeTheme = "day" | "night";

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

type StoredUser = {
    selectedAvatar?: string | null;
    providerAvatar?: string | null;
    avatar?: string | null;
};

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();

    return hour >= 6 && hour < 19
        ? "day"
        : "night";
};

const getHeaderTheme = (mode: TimeTheme) => {
    const isDay = mode === "day";

    return {
        mode,

        // Match the rest of the app instead of using a cyan banner.
        background: isDay ? "#FFFFFF" : "#020617",
        card: isDay ? "#FFFFFF" : "#07111F",
        surface: isDay ? "#F8FDFF" : "#0B1728",

        icon: isDay ? "#07111F" : "#FFFFFF",
        cyan: HEADER_CYAN,
        yellow: "#FACC15",

        border: isDay
            ? "rgba(7,17,31,0.10)"
            : "rgba(255,255,255,0.09)",
        buttonBorder: isDay
            ? "rgba(7,17,31,0.10)"
            : "rgba(255,255,255,0.12)",
        activeBackground: isDay
            ? "rgba(6,182,212,0.10)"
            : "rgba(34,211,238,0.12)",
        activeBorder: isDay
            ? "rgba(6,182,212,0.30)"
            : "rgba(34,211,238,0.35)",
    };
};

export default function AppHeader() {
    const navigation = useNavigation<any>();

    const {
        featuredEnabled,
        alertsEnabled,
    } = useNotifications();

    const [user, setUser] =
        useState<StoredUser | null>(null);

    const [userLoaded, setUserLoaded] =
        useState(false);

    const [themeMode, setThemeMode] =
        useState<TimeTheme>(
            getCurrentThemeMode()
        );

    const theme = useMemo(
        () => getHeaderTheme(themeMode),
        [themeMode]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const updateThemeMode =
        useCallback(() => {
            setThemeMode(
                getCurrentThemeMode()
            );
        }, []);

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

    useEffect(() => {
        const interval = setInterval(
            updateThemeMode,
            60000
        );

        return () =>
            clearInterval(interval);
    }, [updateThemeMode]);

    useEffect(() => {
        loadStoredUser();
        updateThemeMode();
    }, [
        loadStoredUser,
        updateThemeMode,
    ]);

    const selectedAvatarSource =
        user?.selectedAvatar
            ? AVATAR_IMAGES[
            user.selectedAvatar
            ]
            : null;

    const remoteAvatarUrl =
        user?.providerAvatar ||
        (user?.avatar?.startsWith("http")
            ? user.avatar
            : null);

    const isOneEnabled =
        featuredEnabled || alertsEnabled;

    const isBothEnabled =
        featuredEnabled && alertsEnabled;

    const bellColor = isBothEnabled
        ? theme.icon
        : theme.cyan;

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
                                    "Menu"
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
                                    "Home"
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

                    <View style={styles.sideRight}>
                        <TouchableOpacity
                            style={[
                                styles.iconButton,
                                isOneEnabled &&
                                styles.iconButtonActive,
                                isBothEnabled &&
                                styles.iconButtonFullyActive,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                                navigation.navigate(
                                    "Notifications"
                                )
                            }
                        >
                            <FontAwesome6
                                name="bell"
                                size={20}
                                color={bellColor}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

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
            paddingHorizontal: 14,
            paddingTop: 5,
            paddingBottom: 5,
        },

        card: {
            height: 68,
            backgroundColor:
                theme.card,
            borderRadius: 20,

            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",

            paddingHorizontal: 16,

            position: "relative",

            borderWidth: 1,
            borderColor:
                theme.border,

            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 8,
            },
            shadowOpacity:
                theme.mode === "day"
                    ? 0.05
                    : 0.14,
            shadowRadius: 9,

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

            backgroundColor: theme.surface,

            borderWidth: 1.5,
            borderColor: theme.buttonBorder,

            overflow: "hidden",

            shadowColor: theme.cyan,
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
                { scale: 1.98 },   // was 2.10
                { translateX: -3 }, // was -4
                { translateY: 3 },  // was 2
                { rotate: "1deg" },
            ],
        },

        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 14,

            alignItems: "center",
            justifyContent: "center",

            backgroundColor: theme.surface,

            borderWidth: 1,
            borderColor: theme.buttonBorder,

            shadowColor: theme.cyan,
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
    });