import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

const FEATURED_KEY = "featured_notifications_enabled";
const ALERTS_KEY = "alerts_notifications_enabled";
const TOKEN_KEY = "expo_push_token";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

type NotificationsContextType = {
    featuredEnabled: boolean;
    alertsEnabled: boolean;
    loading: boolean;
    toggleFeatured: () => Promise<void>;
    toggleAlerts: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

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

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const [featuredEnabled, setFeaturedEnabled] = useState(false);
    const [alertsEnabled, setAlertsEnabled] = useState(false);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const f = await AsyncStorage.getItem(FEATURED_KEY);
            const a = await AsyncStorage.getItem(ALERTS_KEY);
            const t = await AsyncStorage.getItem(TOKEN_KEY);

            setFeaturedEnabled(f === "true");
            setAlertsEnabled(a === "true");
            setExpoPushToken(t);
            setLoading(false);
        };

        load();
    }, []);

    const registerDevice = async (token: string, featured: boolean, alerts: boolean) => {
        await fetch(`${API_BASE_URL}/notifications/register-device`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token,
                platform: Platform.OS,
                featured_posts_enabled: featured,
                alerts_enabled: alerts,
            }),
        });
    };

    const updatePreferences = async (token: string, featured: boolean, alerts: boolean) => {
        await fetch(`${API_BASE_URL}/notifications/preferences`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token,
                featured_posts_enabled: featured,
                alerts_enabled: alerts,
            }),
        });
    };

    const unregisterDevice = async (token: string) => {
        await fetch(`${API_BASE_URL}/notifications/unregister-device`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        });
    };

    const ensureToken = async (): Promise<string | null> => {
        if (expoPushToken) return expoPushToken;

        const token = await registerForPushNotificationsAsync();
        if (!token) return null;

        setExpoPushToken(token);
        await AsyncStorage.setItem(TOKEN_KEY, token);

        return token;
    };

    const handleUpdate = async (newFeatured: boolean, newAlerts: boolean) => {
        const token = await ensureToken();
        if (!token) return;

        const hasAny = newFeatured || newAlerts;

        if (!hasAny) {
            await unregisterDevice(token);
            return;
        }

        if (!expoPushToken) {
            await registerDevice(token, newFeatured, newAlerts);
        } else {
            await updatePreferences(token, newFeatured, newAlerts);
        }
    };

    const toggleFeatured = async () => {
        const newValue = !featuredEnabled;
        setFeaturedEnabled(newValue);
        await AsyncStorage.setItem(FEATURED_KEY, String(newValue));
        await handleUpdate(newValue, alertsEnabled);
    };

    const toggleAlerts = async () => {
        const newValue = !alertsEnabled;
        setAlertsEnabled(newValue);
        await AsyncStorage.setItem(ALERTS_KEY, String(newValue));
        await handleUpdate(featuredEnabled, newValue);
    };

    const value = useMemo(
        () => ({
            featuredEnabled,
            alertsEnabled,
            loading,
            toggleFeatured,
            toggleAlerts,
        }),
        [featuredEnabled, alertsEnabled, loading]
    );

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error("Must be used inside provider");
    return ctx;
}