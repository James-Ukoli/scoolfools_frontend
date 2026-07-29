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

export type NotificationReceivedHandler = (
    notification: Notifications.Notification,
) => unknown | Promise<unknown>;
export type NotificationResponseHandler = (
    response: Notifications.NotificationResponse,
) => unknown | Promise<unknown>;
export type PushNotificationListeners = {
    onNotificationReceived?: NotificationReceivedHandler;
    onNotificationResponse?: NotificationResponseHandler;
};

export type PushNotificationListenerCleanup = () => void;

/*
|--------------------------------------------------------------------------
| Duplicate Response Protection
|--------------------------------------------------------------------------
|
| Expo can occasionally expose the same notification response through:
|
| 1. getLastNotificationResponseAsync() during cold start
| 2. addNotificationResponseReceivedListener() after mounting
|
| We track handled response identifiers so the same notification tap does
| not navigate twice.
|--------------------------------------------------------------------------
*/

const handledResponseIds = new Set<string>();

const MAX_HANDLED_RESPONSE_IDS = 100;

const getNotificationResponseId = (
    response: Notifications.NotificationResponse,
): string => {
    const notification =
        response.notification.request;

    return [
        notification.identifier,
        response.actionIdentifier,
    ].join(":");
};

const rememberHandledResponse = (
    responseId: string,
): void => {
    handledResponseIds.add(responseId);

    if (
        handledResponseIds.size <=
        MAX_HANDLED_RESPONSE_IDS
    ) {
        return;
    }

    const firstStoredId =
        handledResponseIds.values().next().value;

    if (typeof firstStoredId === "string") {
        handledResponseIds.delete(firstStoredId);
    }
};

export const hasNotificationResponseBeenHandled = (
    response: Notifications.NotificationResponse,
): boolean => {
    const responseId =
        getNotificationResponseId(response);

    return handledResponseIds.has(responseId);
};

export const markNotificationResponseHandled = (
    response: Notifications.NotificationResponse,
): void => {
    const responseId =
        getNotificationResponseId(response);

    rememberHandledResponse(responseId);
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

const configureAndroidNotificationChannel =
    async (): Promise<void> => {
        if (Platform.OS !== "android") {
            return;
        }

        await Notifications.setNotificationChannelAsync(
            "default",
            {
                name: "ScoolFools Notifications",
                importance:
                    Notifications.AndroidImportance.MAX,
                vibrationPattern: [
                    0,
                    250,
                    250,
                    250,
                ],
                lightColor: "#06B6D4",
                sound: "default",
                enableVibrate: true,
                showBadge: true,
            },
        );
    };

const requestNotificationPermission =
    async (): Promise<boolean> => {
        const existingPermission =
            await Notifications.getPermissionsAsync();

        if (
            existingPermission.status ===
            "granted"
        ) {
            return true;
        }

        const requestedPermission =
            await Notifications.requestPermissionsAsync();

        return (
            requestedPermission.status ===
            "granted"
        );
    };

const getExpoPushToken =
    async (): Promise<string> => {
        const projectId = getExpoProjectId();

        if (!projectId) {
            throw new Error(
                "Expo project ID is missing. Check app.json/app.config.js and your EAS project configuration.",
            );
        }

        const tokenResponse =
            await Notifications.getExpoPushTokenAsync(
                {
                    projectId,
                },
            );

        if (!tokenResponse?.data) {
            throw new Error(
                "Expo did not return a push token.",
            );
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

    const authToken =
        await AsyncStorage.getItem("token");

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
                "Content-Type":
                    "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                token: expoPushToken,
                platform: Platform.OS,

                featuredPostsEnabled: true,
                alertsEnabled: true,
                interactionsEnabled: true,
            }),
        },
    );

    let data: {
        message?: string;
        error?: string;
    } = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
                data.error ||
                `Push registration failed with status ${response.status}.`,
        );
    }
};

/*
|--------------------------------------------------------------------------
| Notification Event Handling
|--------------------------------------------------------------------------
*/

const safelyHandleReceivedNotification =
    async (
        notification: Notifications.Notification,
        handler?: NotificationReceivedHandler,
    ): Promise<void> => {
        if (!handler) {
            return;
        }

        try {
            await handler(notification);
        } catch (error) {
            console.log(
                "Foreground notification handler error:",
                error,
            );
        }
    };

const safelyHandleNotificationResponse =
    async (
        response: Notifications.NotificationResponse,
        handler?: NotificationResponseHandler,
    ): Promise<void> => {
        if (!handler) {
            return;
        }

        if (
            hasNotificationResponseBeenHandled(
                response,
            )
        ) {
            console.log(
                "Duplicate notification response ignored:",
                response.notification.request
                    .identifier,
            );

            return;
        }

        markNotificationResponseHandled(response);

        try {
            await handler(response);
        } catch (error) {
            console.log(
                "Notification response handler error:",
                error,
            );
        }
    };

/*
|--------------------------------------------------------------------------
| Public Notification Listener Function
|--------------------------------------------------------------------------
|
| Mount this once near the root of the application.
|
| onNotificationReceived:
| Runs when a push arrives while the app is open.
|
| onNotificationResponse:
| Runs when the user taps a push while the app is open or backgrounded.
|--------------------------------------------------------------------------
*/

export const subscribeToPushNotificationEvents = (
    listeners: PushNotificationListeners,
): PushNotificationListenerCleanup => {
    const receivedSubscription =
        Notifications.addNotificationReceivedListener(
            (notification) => {
                void safelyHandleReceivedNotification(
                    notification,
                    listeners.onNotificationReceived,
                );
            },
        );

    const responseSubscription =
        Notifications.addNotificationResponseReceivedListener(
            (response) => {
                void safelyHandleNotificationResponse(
                    response,
                    listeners.onNotificationResponse,
                );
            },
        );

    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
};

/*
|--------------------------------------------------------------------------
| Cold-Start Notification Response
|--------------------------------------------------------------------------
|
| This handles the case where ScoolFools was completely closed and the user
| launched it by tapping a push notification.
|--------------------------------------------------------------------------
*/

export const handleInitialNotificationResponse =
    async (
        handler: NotificationResponseHandler,
    ): Promise<boolean> => {
        try {
            const response =
                await Notifications.getLastNotificationResponseAsync();

            if (!response) {
                return false;
            }

            if (
                hasNotificationResponseBeenHandled(
                    response,
                )
            ) {
                return false;
            }

            await safelyHandleNotificationResponse(
                response,
                handler,
            );

            /*
             * Clearing the stored response helps prevent an old notification
             * from reopening its destination during a later normal app launch.
             */
            await Notifications.clearLastNotificationResponseAsync();

            return true;
        } catch (error) {
            console.log(
                "Initial notification response error:",
                error,
            );

            return false;
        }
    };

/*
|--------------------------------------------------------------------------
| Badge Helpers
|--------------------------------------------------------------------------
*/

export const setApplicationBadgeCount = async (
    count: number,
): Promise<void> => {
    const safeCount = Math.max(
        0,
        Math.floor(count),
    );

    try {
        await Notifications.setBadgeCountAsync(
            safeCount,
        );
    } catch (error) {
        console.log(
            "Unable to update application badge:",
            error,
        );
    }
};

export const clearApplicationBadge =
    async (): Promise<void> => {
        await setApplicationBadgeCount(0);
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

        const expoPushToken =
            await getExpoPushToken();

        await registerTokenWithBackend(
            expoPushToken,
        );

        console.log(
            "ScoolFools push device registered successfully:",
            expoPushToken,
        );

        return {
            registered: true,
            permissionGranted: true,
            expoPushToken,
        };
    } catch (error: unknown) {
        const reason =
            error instanceof Error
                ? error.message
                : "UNKNOWN_PUSH_REGISTRATION_ERROR";

        console.log(
            "ScoolFools push registration error:",
            error,
        );

        return {
            registered: false,
            permissionGranted: false,
            expoPushToken: null,
            reason,
        };
    }
}