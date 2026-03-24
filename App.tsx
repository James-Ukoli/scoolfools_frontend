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

const Stack = createNativeStackNavigator();

export default function App() {
    const [initialRoute, setInitialRoute] = useState<"GoogleSignIn" | "MainTabs" | null>(null);

    useEffect(() => {
        const setupApp = async () => {
            try {
                const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
                const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

                console.log("IOS CLIENT ID:", iosClientId);
                console.log("WEB CLIENT ID:", webClientId);

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
                    <Stack.Screen
                        name="Notifications"
                        component={NotificationsScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </NotificationsProvider>
    );
}