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
import {
    useFocusEffect,
    useNavigation,
} from "@react-navigation/native";
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

const getHeaderTheme = (
    mode: TimeTheme
) => ({
    mode,

    // Only the outside header area changes.
    background:
        mode === "day"
            ? "#F8FAFC"
            : "#020617",

    // The floating card remains cyan.
    card: HEADER_CYAN,

    icon: "#07111F",
    cyan: HEADER_CYAN,
    yellow: "#FACC15",

    border: "rgba(255,255,255,0.20)",
    activeBackground:
        "rgba(6,182,212,0.10)",
    activeBorder:
        "rgba(6,182,212,0.30)",
});

export default function AppHeader() {
    const navigation = useNavigation<any>();

    const {
        featuredEnabled,
        alertsEnabled,
    } = useNotifications();

    const [user, setUser] =
        useState<StoredUser | null>(null);

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

    useFocusEffect(
        useCallback(() => {
            loadStoredUser();
            updateThemeMode();
        }, [
            loadStoredUser,
            updateThemeMode,
        ])
    );

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
                            {selectedAvatarSource ? (
                                <Image
                                    source={
                                        selectedAvatarSource
                                    }
                                    style={
                                        styles.avatarImage
                                    }
                                    resizeMode="cover"
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
            backgroundColor:
                theme.background,
        },

        headerBackground: {
            backgroundColor:
                theme.background,
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 14,
        },

        card: {
            height: 82,
            backgroundColor:
                theme.card,
            borderRadius: 26,

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
                    ? 0.14
                    : 0.28,
            shadowRadius: 18,

            elevation: 9,
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

            backgroundColor: "#FFFFFF",

            borderWidth: 2,
            borderColor: "#E6F8FC",

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
            width: 190,
            height: 58,

            transform: [
                { scale: 2.10 },

                // Left = negative
                { translateX: -4 },

                // Down = positive
                { translateY: 2 },

                { rotate: "1deg" },
            ],
        },

        iconButton: {
            width: 44,
            height: 44,
            borderRadius: 14,

            alignItems: "center",
            justifyContent: "center",

            backgroundColor: "#FFFFFF",

            borderWidth: 1,
            borderColor: "#E6F8FC",

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