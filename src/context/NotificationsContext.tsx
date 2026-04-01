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

// Show notifications even while the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
    try {
        if (!Device.isDevice) {
            Alert.alert("Real Device Required", "Push notifications require a physical device.");
            return null;
        }

        // Android needs a notification channel
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
                sound: "default",
            });
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

        if (!projectId) {
            console.error("Missing EAS projectId for Expo push token.");
            Alert.alert(
                "Notification Setup Error",
                "Missing Expo project ID. Check your EAS / app config."
            );
            return null;
        }

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

        console.log("Expo push token:", token);
        console.log("Platform:", Platform.OS);
        console.log("API_BASE_URL:", API_BASE_URL);
        console.log("Project ID:", projectId);

        return token;
    } catch (error) {
        console.error("registerForPushNotificationsAsync error:", error);
        Alert.alert(
            "Notification Setup Error",
            "Something went wrong while setting up notifications."
        );
        return null;
    }
}

async function parseErrorResponse(res: Response) {
    try {
        const text = await res.text();
        return text || `Request failed with status ${res.status}`;
    } catch {
        return `Request failed with status ${res.status}`;
    }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const [featuredEnabled, setFeaturedEnabled] = useState(false);
    const [alertsEnabled, setAlertsEnabled] = useState(false);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const f = await AsyncStorage.getItem(FEATURED_KEY);
                const a = await AsyncStorage.getItem(ALERTS_KEY);
                const t = await AsyncStorage.getItem(TOKEN_KEY);

                setFeaturedEnabled(f === "true");
                setAlertsEnabled(a === "true");
                setExpoPushToken(t);
            } catch (error) {
                console.error("Failed to load notification preferences:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const registerDevice = async (token: string, featured: boolean, alerts: boolean) => {
        if (!API_BASE_URL) {
            throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
        }

        console.log("Registering device...", {
            token,
            platform: Platform.OS,
            featured,
            alerts,
        });

        const res = await fetch(`${API_BASE_URL}/notifications/register-device`, {
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

        if (!res.ok) {
            const message = await parseErrorResponse(res);
            throw new Error(`register-device failed: ${message}`);
        }
    };

    const updatePreferences = async (token: string, featured: boolean, alerts: boolean) => {
        if (!API_BASE_URL) {
            throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
        }

        console.log("Updating notification preferences...", {
            token,
            featured,
            alerts,
        });

        const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
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

        if (!res.ok) {
            const message = await parseErrorResponse(res);
            throw new Error(`preferences update failed: ${message}`);
        }
    };

    const unregisterDevice = async (token: string) => {
        if (!API_BASE_URL) {
            throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
        }

        console.log("Unregistering device...", { token });

        const res = await fetch(`${API_BASE_URL}/notifications/unregister-device`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) {
            const message = await parseErrorResponse(res);
            throw new Error(`unregister-device failed: ${message}`);
        }
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
        const hasAny = newFeatured || newAlerts;

        // If everything is being turned off, only try unregister if we actually have a token
        if (!hasAny) {
            if (expoPushToken) {
                await unregisterDevice(expoPushToken);
            }

            setExpoPushToken(null);
            await AsyncStorage.removeItem(TOKEN_KEY);
            return;
        }

        const hadStoredToken = !!expoPushToken;
        const token = await ensureToken();
        if (!token) {
            throw new Error("Could not get Expo push token.");
        }

        // If there was no stored token before, this should be a fresh register
        if (!hadStoredToken) {
            await registerDevice(token, newFeatured, newAlerts);
        } else {
            await updatePreferences(token, newFeatured, newAlerts);
        }
    };

    const persistLocalState = async (featured: boolean, alerts: boolean) => {
        await AsyncStorage.multiSet([
            [FEATURED_KEY, String(featured)],
            [ALERTS_KEY, String(alerts)],
        ]);
    };

    const toggleFeatured = async () => {
        const previousFeatured = featuredEnabled;
        const previousAlerts = alertsEnabled;
        const newFeatured = !featuredEnabled;

        setFeaturedEnabled(newFeatured);

        try {
            await persistLocalState(newFeatured, previousAlerts);
            await handleUpdate(newFeatured, previousAlerts);
        } catch (error) {
            console.error("toggleFeatured error:", error);
            setFeaturedEnabled(previousFeatured);
            await persistLocalState(previousFeatured, previousAlerts);

            Alert.alert(
                "Notification Error",
                "Could not update featured post notifications. Please try again."
            );
        }
    };

    const toggleAlerts = async () => {
        const previousFeatured = featuredEnabled;
        const previousAlerts = alertsEnabled;
        const newAlerts = !alertsEnabled;

        setAlertsEnabled(newAlerts);

        try {
            await persistLocalState(previousFeatured, newAlerts);
            await handleUpdate(previousFeatured, newAlerts);
        } catch (error) {
            console.error("toggleAlerts error:", error);
            setAlertsEnabled(previousAlerts);
            await persistLocalState(previousFeatured, previousAlerts);

            Alert.alert(
                "Notification Error",
                "Could not update alert notifications. Please try again."
            );
        }
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