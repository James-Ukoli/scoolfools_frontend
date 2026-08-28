import {
    NavigationContainer,
} from "@react-navigation/native";
import {
    createNativeStackNavigator,
} from "@react-navigation/native-stack";
import {
    SafeAreaProvider,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
    useEffect,
    useState,
} from "react";
import {
    ActivityIndicator,
    View,
} from "react-native";
import {
    GoogleSignin,
} from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import {
    subscribeToPushNotificationEvents,
    handleInitialNotificationResponse,
} from "./src/services/pushRegistration";

import {
    handleNotificationResponse,
} from "./src/services/notificationDeepLinking";
import {
    Rajdhani_700Bold,
    useFonts,
} from "@expo-google-fonts/rajdhani";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import AppShell from "./src/navigation/AppShell";
import ArticleScreen from "./src/screens/ArticleScreen";
import EventDetailScreen from "./src/screens/EventDetail.Screen";
import GoogleSignInScreen from "./src/screens/GoogleSignInScreen";
import SetupProfileScreen from "./src/screens/SetupProfileScreen";
import AccountSettingsScreen from "./src/screens/AccountSettingsScreen";
import IntroVideoScreen from "./src/screens/IntroVideoScreen";
import SearchScreen from "./src/screens/SearchScreen";
import MenuScreen from "./src/screens/MenuScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import ContactUsScreen from "./src/screens/ContactUsScreen";
import EventsScreen from "./src/screens/EventsScreen";
import ReviewerLoginScreen from "./src/screens/ReviewerLoginScreen";
import GameHomeScreen from "./src/screens/games/GameHomeScreen";
import CharadesPlayScreen from "./src/screens/games/charades/CharadesPlayScreen";
import CharadesSetupScreen from "./src/screens/games/charades/CharadesSetupScreen";
import MostLikelyScreen from "./src/screens/games/mostlikely/MostLikelyScreen";
import ImpostorSetupScreen from "./src/screens/games/impostor/ImpostorSetupScreen";
import ImpostorRevealScreen from "./src/screens/games/impostor/ImpostorRevealScreen";
import JustMoveClockScreen from "./src/screens/games/clock/JustMoveClockScreen";
import GamesPaywallScreen from "./src/screens/games/GamesPaywallScreen";
import DeleteAccountScreen from "./src/screens/DeleteAccountScreen";
import CreateDumpScreen from "./src/screens/CreateDumpScreen";
import MyDumpsScreen from "./src/screens/MyDumpsScreen";
import TVScreen from "./src/screens/TVScreen";

import {
    NotificationsProvider,
} from "./src/context/NotificationsContext";
import {
    NotificationFeedProvider,
} from "./src/context/NotificationFeedContext";

import {
    TimeThemeProvider,
    useTimeTheme,
} from "./src/context/TimeThemeContext";

import {
    flushPendingNavigation,
    navigationRef,
    type RootStackParamList,
} from "./src/navigation/AppNavigation";

const Stack =
    createNativeStackNavigator<RootStackParamList>();

type InitialRoute =
    | "GoogleSignIn"
    | "SetupProfile"
    | "IntroVideo"
    | "MainTabs";

type OnboardingStage =
    | "profile"
    | "introVideo"
    | "complete";

type ThemedNavigationProps = {
    initialRoute: InitialRoute;
};

type DecodedToken = {
    exp?: number;
};

const isTokenExpired = (
    token: string
): boolean => {
    try {
        const decoded =
            jwtDecode<DecodedToken>(token);

        if (!decoded.exp) {
            return true;
        }

        return decoded.exp <
            Date.now() / 1000;
    } catch {
        return true;
    }
};

const getRouteFromOnboardingStage = (
    onboardingStage?: OnboardingStage
): InitialRoute => {
    switch (onboardingStage) {
        case "introVideo":
            return "IntroVideo";

        case "complete":
            return "MainTabs";

        case "profile":
        default:
            return "SetupProfile";
    }
};

function ThemedNavigation({
    initialRoute,
}: ThemedNavigationProps) {
    const { isDark } = useTimeTheme();

    const rootBackground = isDark
        ? "#020617"
        : "#F8FAFC";

    const handleNavigationReady = (): void => {
        /*
         * A notification may have been tapped while
         * the app was completely closed.
         *
         * In that situation, the notification handler
         * can queue its destination before React
         * Navigation is ready. This runs that queued
         * navigation after the container mounts.
         */
        flushPendingNavigation();
    };

    return (
        <NotificationsProvider>
            <NotificationFeedProvider>
                <NavigationContainer
                    ref={navigationRef}
                    onReady={
                        handleNavigationReady
                    }
                >
                    <StatusBar
                        style={
                            isDark
                                ? "light"
                                : "dark"
                        }
                        backgroundColor={
                            isDark
                                ? "#020617"
                                : "#06B6D4"
                        }
                    />

                    <Stack.Navigator
                        initialRouteName={
                            initialRoute
                        }
                        screenOptions={{
                            headerShown: false,
                            animation: "none",
                            contentStyle: {
                                backgroundColor:
                                    rootBackground,
                            },
                        }}
                    >
                        <Stack.Screen
                            name="GoogleSignIn"
                            component={
                                GoogleSignInScreen
                            }
                        />

                        <Stack.Screen
                            name="SetupProfile"
                            component={
                                SetupProfileScreen
                            }
                        />

                        <Stack.Screen
                            name="IntroVideo"
                            component={
                                IntroVideoScreen
                            }
                        />

                        <Stack.Screen
                            name="MainTabs"
                            component={AppShell}
                        />

                        <Stack.Screen
                            name="ArticleScreen"
                            component={
                                ArticleScreen
                            }
                        />

                        <Stack.Screen
                            name="EventDetailScreen"
                            component={
                                EventDetailScreen
                            }
                        />

                        <Stack.Screen
                            name="Search"
                            component={
                                SearchScreen
                            }
                        />

                        <Stack.Screen
                            name="Menu"
                            component={
                                MenuScreen
                            }
                        />

                        <Stack.Screen
                            name="AccountSettings"
                            component={
                                AccountSettingsScreen
                            }
                        />

                        <Stack.Screen
                            name="DeleteAccount"
                            component={
                                DeleteAccountScreen
                            }
                            options={{
                                headerShown: false,
                            }}
                        />

                        <Stack.Screen
                            name="ReviewerLogin"
                            component={
                                ReviewerLoginScreen
                            }
                        />

                        <Stack.Screen
                            name="Notifications"
                            component={
                                NotificationsScreen
                            }
                        />

                        <Stack.Screen
                            name="ContactUs"
                            component={
                                ContactUsScreen
                            }
                        />

                        <Stack.Screen
                            name="EventsScreen"
                            component={
                                EventsScreen
                            }
                        />

                        <Stack.Screen
                            name="GameHome"
                            component={
                                GameHomeScreen
                            }
                        />

                        <Stack.Screen
                            name="CharadesSetup"
                            component={
                                CharadesSetupScreen
                            }
                        />

                        <Stack.Screen
                            name="CharadesPlay"
                            component={
                                CharadesPlayScreen
                            }
                        />

                        <Stack.Screen
                            name="MostLikely"
                            component={
                                MostLikelyScreen
                            }
                        />

                        <Stack.Screen
                            name="ImpostorSetup"
                            component={
                                ImpostorSetupScreen
                            }
                        />

                        <Stack.Screen
                            name="ImpostorReveal"
                            component={
                                ImpostorRevealScreen
                            }
                        />

                        <Stack.Screen
                            name="JustMoveClock"
                            component={
                                JustMoveClockScreen
                            }
                        />

                        <Stack.Screen
                            name="GamesPaywall"
                            component={
                                GamesPaywallScreen
                            }
                        />

                        <Stack.Screen
                            name="TVScreen"
                            component={
                                TVScreen
                            }
                        />

                        <Stack.Screen
                            name="CreateDump"
                            component={
                                CreateDumpScreen
                            }
                            options={{
                                headerShown: false,
                            }}
                        />

                        <Stack.Screen
                            name="MyDumps"
                            component={
                                MyDumpsScreen
                            }
                            options={{
                                headerShown: false,
                            }}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </NotificationFeedProvider>
        </NotificationsProvider>
    );
}

export default function App() {
    const [
        initialRoute,
        setInitialRoute,
    ] = useState<InitialRoute | null>(
        null
    );

    const [
        fontsLoaded,
        fontError,
    ] = useFonts({
        Rajdhani_700Bold,
    });

    useEffect(() => {
        const setupApp = async (): Promise<void> => {
            try {
                const iosClientId =
                    process.env
                        .EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

                const webClientId =
                    process.env
                        .EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

                if (iosClientId) {
                    GoogleSignin.configure({
                        iosClientId,
                        webClientId,
                        profileImageSize: 150,
                    });
                } else {
                    console.log(
                        "Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"
                    );
                }

                const [
                    tokenEntry,
                    storedUserEntry,
                ] = await AsyncStorage.multiGet([
                    "token",
                    "user",
                ]);

                const tokenValue =
                    tokenEntry[1];

                const storedUserValue =
                    storedUserEntry[1];

                if (
                    !tokenValue ||
                    isTokenExpired(tokenValue)
                ) {
                    await AsyncStorage.multiRemove([
                        "token",
                        "user",
                    ]);

                    setInitialRoute(
                        "GoogleSignIn"
                    );

                    return;
                }

                if (!storedUserValue) {
                    await AsyncStorage.multiRemove([
                        "token",
                        "user",
                    ]);

                    setInitialRoute(
                        "GoogleSignIn"
                    );

                    return;
                }

                try {
                    const user =
                        JSON.parse(
                            storedUserValue
                        );

                    const route =
                        getRouteFromOnboardingStage(
                            user?.onboardingStage
                        );

                    setInitialRoute(route);
                } catch (parseError) {
                    console.log(
                        "Stored user could not be parsed:",
                        parseError
                    );

                    await AsyncStorage.multiRemove([
                        "token",
                        "user",
                    ]);

                    setInitialRoute(
                        "GoogleSignIn"
                    );
                }
            } catch (error) {
                console.log(
                    "App bootstrap error:",
                    error
                );

                setInitialRoute(
                    "GoogleSignIn"
                );
            }
        };

        void setupApp();
    }, []);

    useEffect(() => {
        if (fontError) {
            console.log(
                "Rajdhani font loading error:",
                fontError
            );
        }
    }, [fontError]);

    useEffect(() => {
        if (initialRoute === null) {
            return;
        }

        const unsubscribe =
            subscribeToPushNotificationEvents({
                onNotificationResponse:
                    handleNotificationResponse,
            });

        void handleInitialNotificationResponse(
            handleNotificationResponse,
        );

        return () => {
            unsubscribe();
        };
    }, [initialRoute]);

    const appReady =
        initialRoute !== null &&
        (fontsLoaded || Boolean(fontError));

    if (!appReady) {
        return (
            <SafeAreaProvider>
                <View
                    style={{
                        flex: 1,
                        justifyContent:
                            "center",
                        alignItems:
                            "center",
                        backgroundColor:
                            "#06B6D4",
                    }}
                >
                    <StatusBar
                        style="dark"
                        backgroundColor="#06B6D4"
                    />

                    <ActivityIndicator
                        size="large"
                        color="#07111F"
                    />
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <TimeThemeProvider>
                    {/*
                <TimeThemeProvider
                    forcedMode="night"
                >
                */}
                    <ThemedNavigation
                        initialRoute={
                            initialRoute
                        }
                    />
                </TimeThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}