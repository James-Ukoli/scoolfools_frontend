import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Alert,
    Platform,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

/*
|--------------------------------------------------------------------------
| Storage Keys
|--------------------------------------------------------------------------
*/

const FEATURED_KEY =
    "featured_notifications_enabled";

const ALERTS_KEY =
    "alerts_notifications_enabled";

const TOKEN_KEY =
    "expo_push_token";

/*
|--------------------------------------------------------------------------
| API Configuration
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env
            .EXPO_PUBLIC_ANDROID_API_BASE_URL ||
        process.env.EXPO_PUBLIC_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type NotificationsContextType = {
    featuredEnabled: boolean;
    alertsEnabled: boolean;
    loading: boolean;
    toggleFeatured: () => Promise<void>;
    toggleAlerts: () => Promise<void>;
};

const NotificationsContext =
    createContext<
        NotificationsContextType | undefined
    >(undefined);

/*
|--------------------------------------------------------------------------
| Foreground Notification Behavior
|--------------------------------------------------------------------------
|
| This allows notifications to appear while the user currently has the
| ScoolFools app open.
|
*/

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

async function getAuthToken(): Promise<string> {
    const authToken =
        await AsyncStorage.getItem("token");

    if (!authToken) {
        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    return authToken;
}

async function parseErrorResponse(
    response: Response
): Promise<string> {
    try {
        const responseText =
            await response.text();

        if (!responseText) {
            return `Request failed with status ${response.status}`;
        }

        try {
            const parsed =
                JSON.parse(responseText);

            return (
                parsed?.message ||
                parsed?.error ||
                responseText
            );
        } catch {
            return responseText;
        }
    } catch {
        return `Request failed with status ${response.status}`;
    }
}

/*
|--------------------------------------------------------------------------
| Register For Expo Push Notifications
|--------------------------------------------------------------------------
*/

async function registerForPushNotificationsAsync(): Promise<
    string | null
> {
    try {
        if (!Device.isDevice) {
            Alert.alert(
                "Real Device Required",
                "Push notifications require a physical device."
            );

            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | Android Notification Channel
        |--------------------------------------------------------------------------
        */

        if (Platform.OS === "android") {
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
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Permission
        |--------------------------------------------------------------------------
        */

        const {
            status: existingStatus,
        } =
            await Notifications.getPermissionsAsync();

        let finalStatus =
            existingStatus;

        if (
            existingStatus !==
            "granted"
        ) {
            const {
                status,
            } =
                await Notifications.requestPermissionsAsync();

            finalStatus = status;
        }

        if (
            finalStatus !==
            "granted"
        ) {
            Alert.alert(
                "Permission Denied",
                "Push notification permission was not granted."
            );

            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | Expo Project ID
        |--------------------------------------------------------------------------
        */

        const projectId =
            Constants.expoConfig?.extra
                ?.eas?.projectId ??
            Constants.easConfig
                ?.projectId;

        if (!projectId) {
            console.error(
                "Missing EAS projectId for Expo push token."
            );

            Alert.alert(
                "Notification Setup Error",
                "Missing Expo project ID. Check your EAS or app configuration."
            );

            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | Expo Push Token
        |--------------------------------------------------------------------------
        */

        const expoTokenResult =
            await Notifications.getExpoPushTokenAsync(
                {
                    projectId,
                }
            );

        const expoPushToken =
            expoTokenResult.data;

        console.log(
            "Expo push token:",
            expoPushToken
        );

        console.log(
            "Push platform:",
            Platform.OS
        );

        console.log(
            "Push API base URL:",
            API_BASE_URL
        );

        console.log(
            "Expo project ID:",
            projectId
        );

        return expoPushToken;
    } catch (error) {
        console.error(
            "registerForPushNotificationsAsync error:",
            error
        );

        Alert.alert(
            "Notification Setup Error",
            "Something went wrong while setting up notifications."
        );

        return null;
    }
}

/*
|--------------------------------------------------------------------------
| Provider
|--------------------------------------------------------------------------
*/

export function NotificationsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [
        featuredEnabled,
        setFeaturedEnabled,
    ] = useState(false);

    const [
        alertsEnabled,
        setAlertsEnabled,
    ] = useState(false);

    const [
        expoPushToken,
        setExpoPushToken,
    ] = useState<string | null>(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    /*
    |--------------------------------------------------------------------------
    | Load Local Preferences
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const load =
            async () => {
                try {
                    const [
                        featuredValue,
                        alertsValue,
                        storedExpoToken,
                    ] =
                        await AsyncStorage.multiGet(
                            [
                                FEATURED_KEY,
                                ALERTS_KEY,
                                TOKEN_KEY,
                            ]
                        );

                    setFeaturedEnabled(
                        featuredValue[1] ===
                        "true"
                    );

                    setAlertsEnabled(
                        alertsValue[1] ===
                        "true"
                    );

                    setExpoPushToken(
                        storedExpoToken[1]
                    );
                } catch (error) {
                    console.error(
                        "Failed to load notification preferences:",
                        error
                    );
                } finally {
                    setLoading(false);
                }
            };

        load();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Register Device
    |--------------------------------------------------------------------------
    */

    const registerDevice =
        async (
            deviceToken: string,
            featured: boolean,
            alerts: boolean
        ) => {
            if (!API_BASE_URL) {
                throw new Error(
                    "Notification API base URL is missing."
                );
            }

            const authToken =
                await getAuthToken();

            console.log(
                "Registering push device...",
                {
                    platform:
                        Platform.OS,
                    featured,
                    alerts,
                }
            );

            const response =
                await fetch(
                    `${API_BASE_URL}/notifications/register-device`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${authToken}`,
                        },

                        body: JSON.stringify(
                            {
                                token: deviceToken,

                                platform:
                                    Platform.OS,

                                featured_posts_enabled:
                                    featured,

                                alerts_enabled:
                                    alerts,

                                interactions_enabled:
                                    true,
                            }
                        ),
                    }
                );

            if (!response.ok) {
                const message =
                    await parseErrorResponse(
                        response
                    );

                throw new Error(
                    `Register device failed: ${message}`
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Update Preferences
    |--------------------------------------------------------------------------
    */

    const updatePreferences =
        async (
            deviceToken: string,
            featured: boolean,
            alerts: boolean
        ) => {
            if (!API_BASE_URL) {
                throw new Error(
                    "Notification API base URL is missing."
                );
            }

            const authToken =
                await getAuthToken();

            console.log(
                "Updating notification preferences...",
                {
                    featured,
                    alerts,
                }
            );

            const response =
                await fetch(
                    `${API_BASE_URL}/notifications/preferences`,
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${authToken}`,
                        },

                        body: JSON.stringify(
                            {
                                token: deviceToken,

                                featured_posts_enabled:
                                    featured,

                                alerts_enabled:
                                    alerts,

                                interactions_enabled:
                                    true,
                            }
                        ),
                    }
                );

            if (!response.ok) {
                const message =
                    await parseErrorResponse(
                        response
                    );

                throw new Error(
                    `Preferences update failed: ${message}`
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Unregister Device
    |--------------------------------------------------------------------------
    */

    const unregisterDevice =
        async (
            deviceToken: string
        ) => {
            if (!API_BASE_URL) {
                throw new Error(
                    "Notification API base URL is missing."
                );
            }

            const authToken =
                await getAuthToken();

            console.log(
                "Unregistering push device..."
            );

            const response =
                await fetch(
                    `${API_BASE_URL}/notifications/unregister-device`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${authToken}`,
                        },

                        body: JSON.stringify(
                            {
                                token: deviceToken,
                            }
                        ),
                    }
                );

            if (!response.ok) {
                const message =
                    await parseErrorResponse(
                        response
                    );

                throw new Error(
                    `Unregister device failed: ${message}`
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Ensure Expo Token Exists
    |--------------------------------------------------------------------------
    */

    const ensureToken =
        async (): Promise<
            string | null
        > => {
            if (expoPushToken) {
                return expoPushToken;
            }

            const newExpoToken =
                await registerForPushNotificationsAsync();

            if (!newExpoToken) {
                return null;
            }

            setExpoPushToken(
                newExpoToken
            );

            await AsyncStorage.setItem(
                TOKEN_KEY,
                newExpoToken
            );

            return newExpoToken;
        };

    /*
    |--------------------------------------------------------------------------
    | Handle Preference Update
    |--------------------------------------------------------------------------
    */

    const handleUpdate =
        async (
            newFeatured: boolean,
            newAlerts: boolean
        ) => {
            const hasAnyPreference =
                newFeatured ||
                newAlerts;

            /*
            |--------------------------------------------------------------------------
            | Disable Device
            |--------------------------------------------------------------------------
            */

            if (!hasAnyPreference) {
                if (expoPushToken) {
                    await unregisterDevice(
                        expoPushToken
                    );
                }

                setExpoPushToken(null);

                await AsyncStorage.removeItem(
                    TOKEN_KEY
                );

                return;
            }

            const hadStoredToken =
                Boolean(expoPushToken);

            const deviceToken =
                await ensureToken();

            if (!deviceToken) {
                throw new Error(
                    "Could not get Expo push token."
                );
            }

            if (!hadStoredToken) {
                await registerDevice(
                    deviceToken,
                    newFeatured,
                    newAlerts
                );

                return;
            }

            try {
                await updatePreferences(
                    deviceToken,
                    newFeatured,
                    newAlerts
                );
            } catch (
            updateError
            ) {
                /*
                |--------------------------------------------------------------------------
                | Re-register Missing Legacy Token
                |--------------------------------------------------------------------------
                |
                | An older token may exist locally but may not yet be attached to a user
                | in MongoDB. If preference update fails, register it again.
                |
                */

                console.log(
                    "Preference update failed. Attempting device registration:",
                    updateError
                );

                await registerDevice(
                    deviceToken,
                    newFeatured,
                    newAlerts
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Persist Local Preferences
    |--------------------------------------------------------------------------
    */

    const persistLocalState =
        async (
            featured: boolean,
            alerts: boolean
        ) => {
            await AsyncStorage.multiSet(
                [
                    [
                        FEATURED_KEY,
                        String(featured),
                    ],

                    [
                        ALERTS_KEY,
                        String(alerts),
                    ],
                ]
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Toggle Featured Notifications
    |--------------------------------------------------------------------------
    */

    const toggleFeatured =
        async () => {
            const previousFeatured =
                featuredEnabled;

            const previousAlerts =
                alertsEnabled;

            const newFeatured =
                !featuredEnabled;

            setFeaturedEnabled(
                newFeatured
            );

            try {
                await persistLocalState(
                    newFeatured,
                    previousAlerts
                );

                await handleUpdate(
                    newFeatured,
                    previousAlerts
                );
            } catch (error) {
                console.error(
                    "toggleFeatured error:",
                    error
                );

                setFeaturedEnabled(
                    previousFeatured
                );

                await persistLocalState(
                    previousFeatured,
                    previousAlerts
                );

                Alert.alert(
                    "Notification Error",
                    "Could not update featured post notifications. Please try again."
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Toggle Alert Notifications
    |--------------------------------------------------------------------------
    */

    const toggleAlerts =
        async () => {
            const previousFeatured =
                featuredEnabled;

            const previousAlerts =
                alertsEnabled;

            const newAlerts =
                !alertsEnabled;

            setAlertsEnabled(
                newAlerts
            );

            try {
                await persistLocalState(
                    previousFeatured,
                    newAlerts
                );

                await handleUpdate(
                    previousFeatured,
                    newAlerts
                );
            } catch (error) {
                console.error(
                    "toggleAlerts error:",
                    error
                );

                setAlertsEnabled(
                    previousAlerts
                );

                await persistLocalState(
                    previousFeatured,
                    previousAlerts
                );

                Alert.alert(
                    "Notification Error",
                    "Could not update alert notifications. Please try again."
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Context Value
    |--------------------------------------------------------------------------
    */

    const value =
        useMemo(
            () => ({
                featuredEnabled,
                alertsEnabled,
                loading,
                toggleFeatured,
                toggleAlerts,
            }),
            [
                featuredEnabled,
                alertsEnabled,
                loading,
            ]
        );

    return (
        <NotificationsContext.Provider
            value={value}
        >
            {children}
        </NotificationsContext.Provider>
    );
}

/*
|--------------------------------------------------------------------------
| Hook
|--------------------------------------------------------------------------
*/

export function useNotifications() {
    const context =
        useContext(
            NotificationsContext
        );

    if (!context) {
        throw new Error(
            "useNotifications must be used inside NotificationsProvider."
        );
    }

    return context;
}