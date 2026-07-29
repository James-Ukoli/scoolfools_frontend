import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

/*
|--------------------------------------------------------------------------
| API Configuration
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type PushRegistrationResult = {
    registered: boolean;
    permissionGranted: boolean;
    expoPushToken: string | null;
    reason?: string;
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getExpoProjectId = (): string | undefined => {
    return (
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId
    );
};

const configureAndroidNotificationChannel = async (): Promise<void> => {
    if (Platform.OS !== "android") {
        return;
    }

    await Notifications.setNotificationChannelAsync("default", {
        name: "ScoolFools Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#06B6D4",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
    });
};

const requestNotificationPermission = async (): Promise<boolean> => {
    const existingPermission =
        await Notifications.getPermissionsAsync();

    if (existingPermission.status === "granted") {
        return true;
    }

    const requestedPermission =
        await Notifications.requestPermissionsAsync();

    return requestedPermission.status === "granted";
};

const getExpoPushToken = async (): Promise<string> => {
    const projectId = getExpoProjectId();

    if (!projectId) {
        throw new Error(
            "Expo project ID is missing. Check app.json/app.config.js and your EAS project configuration.",
        );
    }

    const tokenResponse =
        await Notifications.getExpoPushTokenAsync({
            projectId,
        });

    if (!tokenResponse?.data) {
        throw new Error("Expo did not return a push token.");
    }

    return tokenResponse.data;
};

const registerTokenWithBackend = async (
    expoPushToken: string,
): Promise<void> => {
    if (!API_BASE_URL) {
        throw new Error(
            "The API base URL is missing from your Expo environment variables.",
        );
    }

    const authToken = await AsyncStorage.getItem("token");

    if (!authToken) {
        throw new Error(
            "The user authentication token is missing.",
        );
    }

    const response = await fetch(
        `${API_BASE_URL}/api/notifications/register-device`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                token: expoPushToken,
                platform: Platform.OS,

                // Default notification preferences.
                featuredPostsEnabled: true,
                alertsEnabled: true,
                interactionsEnabled: true,
            }),
        },
    );

    let data: any = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
                data?.error ||
                `Push registration failed with status ${response.status}.`,
        );
    }
};

/*
|--------------------------------------------------------------------------
| Public Registration Function
|--------------------------------------------------------------------------
*/

export async function registerCurrentDevice(): Promise<PushRegistrationResult> {
    try {
        /*
         * Expo push notifications require a physical device.
         * This safely skips token registration on simulators and emulators.
         */
        if (!Device.isDevice) {
            console.log(
                "Push registration skipped: a physical device is required.",
            );

            return {
                registered: false,
                permissionGranted: false,
                expoPushToken: null,
                reason: "PHYSICAL_DEVICE_REQUIRED",
            };
        }

        await configureAndroidNotificationChannel();

        const permissionGranted =
            await requestNotificationPermission();

        if (!permissionGranted) {
            console.log(
                "Push registration skipped: notification permission was denied.",
            );

            return {
                registered: false,
                permissionGranted: false,
                expoPushToken: null,
                reason: "PERMISSION_DENIED",
            };
        }

        const expoPushToken = await getExpoPushToken();

        await registerTokenWithBackend(expoPushToken);

        console.log(
            "ScoolFools push device registered successfully:",
            expoPushToken,
        );

        return {
            registered: true,
            permissionGranted: true,
            expoPushToken,
        };
    } catch (error: any) {
        console.log(
            "ScoolFools push registration error:",
            error,
        );

        return {
            registered: false,
            permissionGranted: false,
            expoPushToken: null,
            reason:
                error?.message ||
                "UNKNOWN_PUSH_REGISTRATION_ERROR",
        };
    }
}