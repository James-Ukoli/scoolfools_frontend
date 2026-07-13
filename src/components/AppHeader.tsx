import React, {
    useCallback,
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

const getHeaderTheme = () => ({
    bg: HEADER_CYAN,
    card: "#F8FAFC",
    border: "rgba(7,17,31,0.10)",
    icon: "#07111F",
    cyan: HEADER_CYAN,
    yellow: "#FACC15",
    alertBlue: HEADER_CYAN,
    alertGreenIcon: "#07111F",
});

export default function AppHeader() {
    const navigation = useNavigation<any>();

    const {
        featuredEnabled,
        alertsEnabled,
    } = useNotifications();

    const [user, setUser] =
        useState<StoredUser | null>(null);

    const theme = useMemo(
        () => getHeaderTheme(),
        []
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

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

                const parsedUser =
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

    useFocusEffect(
        useCallback(() => {
            loadStoredUser();
        }, [loadStoredUser])
    );

    const selectedAvatarSource =
        user?.selectedAvatar
            ? AVATAR_IMAGES[
            user.selectedAvatar
            ]
            : null;

    const remoteAvatarUrl =
        user?.providerAvatar ||
        (
            user?.avatar?.startsWith("http")
                ? user.avatar
                : null
        );

    const isOneEnabled =
        featuredEnabled || alertsEnabled;

    const isBothEnabled =
        featuredEnabled && alertsEnabled;

    const bellColor = isBothEnabled
        ? theme.alertGreenIcon
        : isOneEnabled
            ? theme.alertBlue
            : theme.icon;

    return (
        <SafeAreaView
            edges={["top"]}
            style={styles.safeArea}
        >
            <View style={styles.container}>
                <View style={styles.sideLeft}>
                    <TouchableOpacity
                        style={styles.avatarButton}
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
                                size={18}
                                color={theme.icon}
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
                        style={styles.iconButton}
                        activeOpacity={0.8}
                        onPress={() =>
                            navigation.navigate(
                                "Search"
                            )
                        }
                    >
                        <Feather
                            name="search"
                            size={20}
                            color={theme.icon}
                        />
                    </TouchableOpacity>

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
            backgroundColor: theme.bg,
        },

        container: {
            height: 76,
            backgroundColor: theme.bg,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
        },

        sideLeft: {
            width: 92,
            alignItems: "flex-start",
            justifyContent: "center",
            zIndex: 100,
            elevation: 100,
        },

        sideRight: {
            width: 92,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            zIndex: 100,
            elevation: 100,
        },

        avatarButton: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            overflow: "hidden",
        },

        avatarImage: {
            width: "100%",
            height: "100%",
            borderRadius: 21,
        },

        logoWrapper: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            elevation: 1,
        },

        logoPressable: {
            alignItems: "center",
            justifyContent: "center",
        },

        logo: {
            width: 260,
            height: 90,
            transform: [
                { scale: 1.35 },
                { rotate: "2deg" },
                { translateX: -10 },
                { translateY: 10 },
            ],
        },

        iconButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
        },

        iconButtonActive: {
            backgroundColor:
                "rgba(255,255,255,0.22)",
            borderColor: "#FFFFFF",
        },

        iconButtonFullyActive: {
            backgroundColor:
                theme.yellow,
            borderColor: theme.yellow,
        },
    });