import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

const ENABLED_KEY = "push_notifications_enabled";
const TOKEN_KEY = "expo_push_token";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

type NotificationsContextType = {
    enabled: boolean;
    expoPushToken: string | null;
    loading: boolean;
    enableNotifications: () => Promise<void>;
    disableNotifications: () => Promise<void>;
    toggleNotifications: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        Alert.alert("Real Device Required", "Push notifications require a physical device.");
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        Alert.alert("Permission Denied", "Push notification permission was not granted.");
        return null;
    }

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    if (!projectId) {
        throw new Error("EAS projectId is missing in app.json");
    }
    try {
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("Expo push token:", token);
        return token;
    } catch (error) {
        console.log("getExpoPushTokenAsync error:", error);
        throw error;
    }
}

export function NotificationsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [enabled, setEnabled] = useState(false);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStoredSettings = async () => {
            try {
                const savedEnabled = await AsyncStorage.getItem(ENABLED_KEY);
                const savedToken = await AsyncStorage.getItem(TOKEN_KEY);

                setEnabled(savedEnabled === "true");
                setExpoPushToken(savedToken);
            } catch (error) {
                console.log("Error loading notification settings:", error);
            } finally {
                setLoading(false);
            }
        };

        loadStoredSettings();
    }, []);

    const registerTokenWithBackend = async (token: string) => {
        try {
            await fetch(`${API_BASE_URL}/notifications/register-device`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    platform: Platform.OS,
                }),
            });
        } catch (error) {
            console.log("Error registering notification token:", error);
        }
    };

    const unregisterTokenFromBackend = async (token: string | null) => {
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/notifications/unregister-device`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });
        } catch (error) {
            console.log("Error unregistering notification token:", error);
        }
    };

    const enableNotifications = async () => {
        const token = await registerForPushNotificationsAsync();

        if (!token) return;

        setEnabled(true);
        setExpoPushToken(token);

        await AsyncStorage.setItem(ENABLED_KEY, "true");
        await AsyncStorage.setItem(TOKEN_KEY, token);

        await registerTokenWithBackend(token);
    };

    const disableNotifications = async () => {
        await unregisterTokenFromBackend(expoPushToken);

        setEnabled(false);
        setExpoPushToken(null);

        await AsyncStorage.setItem(ENABLED_KEY, "false");
        await AsyncStorage.removeItem(TOKEN_KEY);
    };

    const toggleNotifications = async () => {
        if (enabled) {
            await disableNotifications();
        } else {
            await enableNotifications();
        }
    };

    const value = useMemo(
        () => ({
            enabled,
            expoPushToken,
            loading,
            enableNotifications,
            disableNotifications,
            toggleNotifications,
        }),
        [enabled, expoPushToken, loading]
    );

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationsContext);

    if (!context) {
        throw new Error("useNotifications must be used inside NotificationsProvider");
    }

    return context;
}