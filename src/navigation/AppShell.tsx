import React from "react";
import { StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppHeader from "../components/AppHeader";
import BottomTabs from "./BottomTabs";

import MenuScreen from "../screens/MenuScreen";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import ContactUsScreen from "../screens/ContactUsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import EventsScreen from "../screens/EventsScreen";

const AppStack = createNativeStackNavigator();

export default function AppShell() {
    return (
        <View style={styles.container}>
            <AppHeader />

            <View style={styles.content}>
                <AppStack.Navigator
                    initialRouteName="BottomTabs"
                    screenOptions={{
                        headerShown: false,
                        animation: "none",
                        contentStyle: {
                            backgroundColor: "#FFFFFF",
                        },
                    }}
                >
                    <AppStack.Screen
                        name="BottomTabs"
                        component={BottomTabs}
                    />

                    <AppStack.Screen
                        name="Menu"
                        component={MenuScreen}
                    />

                    <AppStack.Screen
                        name="AccountSettings"
                        component={AccountSettingsScreen}
                    />

                    <AppStack.Screen
                        name="ContactUs"
                        component={ContactUsScreen}
                    />

                    <AppStack.Screen
                        name="Notifications"
                        component={NotificationsScreen}
                    />

                    <AppStack.Screen
                        name="EventsScreen"
                        component={EventsScreen}
                    />
                </AppStack.Navigator>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
    },
});