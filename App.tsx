import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

import {
    useFonts,
    Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

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
import TVScreen from "./src/screens/TVScreen";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import {
    TimeThemeProvider,
    useTimeTheme,
} from "./src/context/TimeThemeContext";

const Stack = createNativeStackNavigator();

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

const isTokenExpired = (token: string) => {
    try {
        const decoded: any = jwtDecode(token);

        if (!decoded?.exp) {
            return true;
        }

        return decoded.exp < Date.now() / 1000;
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

    return (
        <NotificationsProvider>
            <NavigationContainer>
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
                        component={ArticleScreen}
                    />

                    <Stack.Screen
                        name="EventDetailScreen"
                        component={
                            EventDetailScreen
                        }
                    />

                    <Stack.Screen
                        name="Search"
                        component={SearchScreen}
                    />

                    <Stack.Screen
                        name="Menu"
                        component={MenuScreen}
                    />

                    <Stack.Screen
                        name="AccountSettings"
                        component={
                            AccountSettingsScreen
                        }
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
                        component={EventsScreen}
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
                        component={TVScreen}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </NotificationsProvider>
    );
}

export default function App() {
    const [initialRoute, setInitialRoute] =
        useState<InitialRoute | null>(null);

    const [fontsLoaded, fontError] =
        useFonts({
            Rajdhani_700Bold,
        });

    useEffect(() => {
        const setupApp = async () => {
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

                const [token, storedUser] =
                    await AsyncStorage.multiGet([
                        "token",
                        "user",
                    ]);

                const tokenValue = token[1];
                const storedUserValue =
                    storedUser[1];

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

        setupApp();
    }, []);

    useEffect(() => {
        if (fontError) {
            console.log(
                "Rajdhani font loading error:",
                fontError
            );
        }
    }, [fontError]);

    const appReady =
        initialRoute !== null &&
        (fontsLoaded || !!fontError);

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
        <SafeAreaProvider>
            <TimeThemeProvider>
                {/* <TimeThemeProvider forcedMode="night"> */}
                <ThemedNavigation
                    initialRoute={
                        initialRoute
                    }
                />
            </TimeThemeProvider>
        </SafeAreaProvider>
    );
}