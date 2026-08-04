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
| Notification responses can be returned again after:
|
| 1. A development reload
| 2. A Fast Refresh
| 3. A cold app launch
| 4. The response listener mounting
|
| The in-memory set handles duplicates during the current JavaScript session.
| AsyncStorage handles duplicates after a terminal reload or app restart.
|--------------------------------------------------------------------------
*/

const HANDLED_RESPONSE_IDS_STORAGE_KEY =
    "handled_notification_response_ids";

const MAX_HANDLED_RESPONSE_IDS = 100;

const handledResponseIds =
    new Set<string>();

let storedResponseIdsLoaded = false;

const getNotificationResponseId = (
    response: Notifications.NotificationResponse,
): string => {
    const request =
        response.notification.request;

    return [
        request.identifier,
        response.actionIdentifier,
    ].join(":");
};

const loadStoredHandledResponseIds =
    async (): Promise<void> => {
        if (storedResponseIdsLoaded) {
            return;
        }

        try {
            const storedValue =
                await AsyncStorage.getItem(
                    HANDLED_RESPONSE_IDS_STORAGE_KEY,
                );

            if (!storedValue) {
                storedResponseIdsLoaded = true;
                return;
            }

            const parsedValue =
                JSON.parse(storedValue);

            if (Array.isArray(parsedValue)) {
                parsedValue.forEach((value) => {
                    if (
                        typeof value === "string" &&
                        value.trim()
                    ) {
                        handledResponseIds.add(
                            value,
                        );
                    }
                });
            }
        } catch (error) {
            console.log(
                "Unable to load handled notification responses:",
                error,
            );
        } finally {
            storedResponseIdsLoaded = true;
        }
    };

const saveHandledResponseIds =
    async (): Promise<void> => {
        try {
            const responseIds =
                Array.from(
                    handledResponseIds,
                ).slice(
                    -MAX_HANDLED_RESPONSE_IDS,
                );

            await AsyncStorage.setItem(
                HANDLED_RESPONSE_IDS_STORAGE_KEY,
                JSON.stringify(responseIds),
            );
        } catch (error) {
            console.log(
                "Unable to save handled notification responses:",
                error,
            );
        }
    };

const rememberHandledResponse =
    async (
        responseId: string,
    ): Promise<void> => {
        await loadStoredHandledResponseIds();

        handledResponseIds.add(responseId);

        while (
            handledResponseIds.size >
            MAX_HANDLED_RESPONSE_IDS
        ) {
            const firstStoredId =
                handledResponseIds
                    .values()
                    .next()
                    .value;

            if (
                typeof firstStoredId !==
                "string"
            ) {
                break;
            }

            handledResponseIds.delete(
                firstStoredId,
            );
        }

        await saveHandledResponseIds();
    };

export const hasNotificationResponseBeenHandled =
    async (
        response: Notifications.NotificationResponse,
    ): Promise<boolean> => {
        await loadStoredHandledResponseIds();

        const responseId =
            getNotificationResponseId(
                response,
            );

        return handledResponseIds.has(
            responseId,
        );
    };

export const markNotificationResponseHandled =
    async (
        response: Notifications.NotificationResponse,
    ): Promise<void> => {
        const responseId =
            getNotificationResponseId(
                response,
            );

        await rememberHandledResponse(
            responseId,
        );
    };

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getExpoProjectId = ():
    | string
    | undefined => {
    return (
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas
            ?.projectId
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
                    Notifications
                        .AndroidImportance
                        .MAX,
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
        const projectId =
            getExpoProjectId();

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

const registerTokenWithBackend =
    async (
        expoPushToken: string,
    ): Promise<void> => {
        if (!API_BASE_URL) {
            throw new Error(
                "The API base URL is missing from your Expo environment variables.",
            );
        }

        const authToken =
            await AsyncStorage.getItem(
                "token",
            );

        if (!authToken) {
            throw new Error(
                "The user authentication token is missing.",
            );
        }

        const response =
            await fetch(
                `${API_BASE_URL}/api/notifications/register-device`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        token:
                            expoPushToken,
                        platform:
                            Platform.OS,

                        featuredPostsEnabled:
                            true,
                        alertsEnabled:
                            true,
                        interactionsEnabled:
                            true,
                    }),
                },
            );

        let data: {
            message?: string;
            error?: string;
        } = {};

        try {
            data =
                await response.json();
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
            await handler(
                notification,
            );
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
    ): Promise<boolean> => {
        if (!handler) {
            return false;
        }

        const alreadyHandled =
            await hasNotificationResponseBeenHandled(
                response,
            );

        if (alreadyHandled) {
            console.log(
                "Duplicate notification response ignored:",
                response.notification.request
                    .identifier,
            );

            return false;
        }

        /*
         * Store the response before running navigation.
         *
         * This prevents a terminal reload from replaying the response even
         * when navigation or another part of the handler throws an error.
         */
        await markNotificationResponseHandled(
            response,
        );

        try {
            await handler(response);
            return true;
        } catch (error) {
            console.log(
                "Notification response handler error:",
                error,
            );

            return false;
        }
    };

/*
|--------------------------------------------------------------------------
| Public Notification Listener Function
|--------------------------------------------------------------------------
*/

export const subscribeToPushNotificationEvents =
    (
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
| This handles the case where ScoolFools was completely closed and opened
| because the user tapped a notification.
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

            const alreadyHandled =
                await hasNotificationResponseBeenHandled(
                    response,
                );

            /*
             * Clear the Expo response before navigating.
             *
             * This is important during development because a terminal reload
             * can occur before navigation finishes.
             */
            await Notifications.clearLastNotificationResponseAsync();

            if (alreadyHandled) {
                console.log(
                    "Previously handled initial notification response ignored:",
                    response.notification.request
                        .identifier,
                );

                return false;
            }

            return await safelyHandleNotificationResponse(
                response,
                handler,
            );
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

export const setApplicationBadgeCount =
    async (
        count: number,
    ): Promise<void> => {
        const safeCount =
            Math.max(
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
        await setApplicationBadgeCount(
            0,
        );
    };

/*
|--------------------------------------------------------------------------
| Public Registration Function
|--------------------------------------------------------------------------
*/

export async function registerCurrentDevice(): Promise<PushRegistrationResult> {
    try {
        if (!Device.isDevice) {
            console.log(
                "Push registration skipped: a physical device is required.",
            );

            return {
                registered: false,
                permissionGranted: false,
                expoPushToken: null,
                reason:
                    "PHYSICAL_DEVICE_REQUIRED",
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
                reason:
                    "PERMISSION_DENIED",
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