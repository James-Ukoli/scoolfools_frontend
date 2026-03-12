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
import { useEffect } from "react";
import { NotificationsProvider } from "./src/context/NotificationsContext";

const Stack = createNativeStackNavigator();

export default function App() {
    useEffect(() => {
        GoogleSignin.configure({
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            profileImageSize: 150,
        });
    }, []);

    return (
        <NotificationsProvider>
            <NavigationContainer>
                <StatusBar style="light" />
                <Stack.Navigator
                    initialRouteName="GoogleSignIn"
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