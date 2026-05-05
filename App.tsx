import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabs from "./src/navigation/BottomTabs";
import ArticleScreen from "./src/screens/ArticleScreen";
import { StatusBar } from "expo-status-bar";
import EventDetailScreen from "./src/screens/EventDetail.Screen";
import GoogleSignInScreen from "./src/screens/GoogleSignInScreen";
import SearchScreen from "./src/screens/SearchScreen";
import MenuScreen from "./src/screens/MenuScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useEffect, useState } from "react";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
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
const Stack = createNativeStackNavigator();

export default function App() {
    const [initialRoute, setInitialRoute] = useState<"GoogleSignIn" | "MainTabs" | null>(null);

    useEffect(() => {
        const setupApp = async () => {
            try {
                const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
                const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

                if (iosClientId) {
                    GoogleSignin.configure({
                        iosClientId,
                        webClientId,
                        profileImageSize: 150,
                    });
                } else {
                    console.log("Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID");
                }

                const token = await AsyncStorage.getItem("token");

                if (token) {
                    setInitialRoute("MainTabs");
                } else {
                    setInitialRoute("GoogleSignIn");
                }
            } catch (error) {
                console.log("App bootstrap error:", error);
                setInitialRoute("GoogleSignIn");
            }
        };

        setupApp();
    }, []);

    if (!initialRoute) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#000",
                }}
            >
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <NotificationsProvider>
            <NavigationContainer>
                <StatusBar style="light" />
                <Stack.Navigator
                    initialRouteName={initialRoute}
                    screenOptions={{ headerShown: false }}
                >
                    <Stack.Screen
                        name="GoogleSignIn"
                        component={GoogleSignInScreen}
                    />
                    <Stack.Screen name="MainTabs" component={BottomTabs} />
                    <Stack.Screen name="ArticleScreen" component={ArticleScreen} />
                    <Stack.Screen
                        name="EventDetailScreen"
                        component={EventDetailScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Search"
                        component={SearchScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Menu"
                        component={MenuScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen name="ReviewerLogin" component={ReviewerLoginScreen} />
                    <Stack.Screen
                        name="Notifications"
                        component={NotificationsScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen name="ContactUs" component={ContactUsScreen} />
                    <Stack.Screen
                        name="EventsScreen"
                        component={EventsScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="GameHome"
                        component={GameHomeScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="CharadesSetup"
                        component={CharadesSetupScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="CharadesPlay"
                        component={CharadesPlayScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="MostLikely"
                        component={MostLikelyScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="ImpostorSetup"
                        component={ImpostorSetupScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="ImpostorReveal"
                        component={ImpostorRevealScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="JustMoveClock"
                        component={JustMoveClockScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </NotificationsProvider>
    );
}