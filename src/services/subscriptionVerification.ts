import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { finishTransaction } from "react-native-iap";

const SUBSCRIPTION_PRODUCT_ID = "sfs_399_2y";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

export type SubscriptionVerificationResponse = {
    success: boolean;
    message?: string;
    code?: string;

    isSubscribed: boolean;
    subscriptionExpiresAt?: string | null;
    subscriptionPlatform?: "ios" | "android" | null;
    subscriptionProductId?: string | null;
    subscriptionStatus?: string;
    subscriptionAutoRenewing?: boolean;
};

export class SubscriptionVerificationError extends Error {
    code: string;
    status: number | null;
    responseData: unknown;

    constructor({
        message,
        code,
        status = null,
        responseData = null,
    }: {
        message: string;
        code: string;
        status?: number | null;
        responseData?: unknown;
    }) {
        super(message);

        this.name = "SubscriptionVerificationError";
        this.code = code;
        this.status = status;
        this.responseData = responseData;
    }
}

const normalizeString = (
    value: unknown
): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0
        ? trimmedValue
        : null;
};

const parseResponseBody = async (
    response: Response
): Promise<any> => {
    const rawResponse = await response.text();

    if (!rawResponse) {
        return {};
    }

    try {
        return JSON.parse(rawResponse);
    } catch {
        return {
            rawResponse,
        };
    }
};

const getPlatformPurchaseData = (
    purchase: any
) => {
    const platform =
        Platform.OS === "ios"
            ? "ios"
            : "android";

    const returnedProductId =
        normalizeString(purchase?.productId) ||
        normalizeString(
            purchase?.productIdIOS
        );

    const productId =
        returnedProductId ||
        SUBSCRIPTION_PRODUCT_ID;

    if (
        productId !==
        SUBSCRIPTION_PRODUCT_ID
    ) {
        throw new SubscriptionVerificationError({
            code: "INVALID_PRODUCT_ID",
            message:
                "The store returned an unexpected subscription product.",
        });
    }

    if (platform === "ios") {
        const transactionId =
            normalizeString(
                purchase?.transactionId
            ) ||
            normalizeString(
                purchase?.transactionIdIOS
            );

        if (!transactionId) {
            throw new SubscriptionVerificationError({
                code: "MISSING_IOS_TRANSACTION_ID",
                message:
                    "Apple did not return a valid transaction ID.",
            });
        }

        return {
            platform,
            productId,
            transactionId,
        };
    }

    const purchaseToken =
        normalizeString(
            purchase?.purchaseToken
        ) ||
        normalizeString(
            purchase?.purchaseTokenAndroid
        );

    if (!purchaseToken) {
        throw new SubscriptionVerificationError({
            code: "MISSING_ANDROID_PURCHASE_TOKEN",
            message:
                "Google Play did not return a valid purchase token.",
        });
    }

    return {
        platform,
        productId,
        purchaseToken,
    };
};

export const verifyScoolFoolsSubscription =
    async (
        purchase: any
    ): Promise<SubscriptionVerificationResponse> => {
        if (!purchase) {
            throw new SubscriptionVerificationError({
                code: "MISSING_PURCHASE",
                message:
                    "The store did not return purchase information.",
            });
        }

        if (!API_BASE_URL) {
            throw new SubscriptionVerificationError({
                code: "MISSING_API_BASE_URL",
                message:
                    "The subscription server is unavailable.",
            });
        }

        const token =
            await AsyncStorage.getItem("token");

        if (!token) {
            throw new SubscriptionVerificationError({
                code: "UNAUTHORIZED",
                message:
                    "Your session has expired. Please sign in again.",
            });
        }

        const purchaseData =
            getPlatformPurchaseData(purchase);

        let response: Response;

        try {
            response = await fetch(
                `${API_BASE_URL}/api/subscriptions/verify`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify(
                        purchaseData
                    ),
                }
            );
        } catch (error: any) {
            throw new SubscriptionVerificationError({
                code: "NETWORK_ERROR",
                message:
                    "ScoolFools could not connect to the subscription server.",
                responseData: error,
            });
        }

        const data =
            await parseResponseBody(response);

        console.log(
            "SUBSCRIPTION VERIFY RESPONSE:",
            {
                status: response.status,
                ok: response.ok,
                code: data?.code,
                isSubscribed:
                    data?.isSubscribed,
            }
        );

        if (!response.ok) {
            throw new SubscriptionVerificationError({
                code:
                    normalizeString(data?.code) ||
                    "SUBSCRIPTION_VERIFICATION_FAILED",

                message:
                    normalizeString(
                        data?.message
                    ) ||
                    normalizeString(
                        data?.error
                    ) ||
                    "The subscription could not be verified.",

                status: response.status,
                responseData: data,
            });
        }

        if (data?.success !== true) {
            throw new SubscriptionVerificationError({
                code:
                    normalizeString(data?.code) ||
                    "INVALID_VERIFICATION_RESPONSE",

                message:
                    normalizeString(
                        data?.message
                    ) ||
                    "The subscription server returned an invalid response.",

                status: response.status,
                responseData: data,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Finish Store Transaction
        |--------------------------------------------------------------------------
        |
        | This only happens after the ScoolFools backend has:
        |
        | 1. Verified the purchase with Apple or Google
        | 2. Confirmed the ownership key
        | 3. Rejected cross-account ownership conflicts
        | 4. Successfully linked or reverified the current account
        |
        */

        try {
            await finishTransaction({
                purchase,
                isConsumable: false,
            });
        } catch (error: any) {
            /*
             * The backend has already accepted and stored the ownership.
             * Preserve that fact while reporting the store-finishing problem.
             */
            console.log(
                "FINISH SUBSCRIPTION TRANSACTION ERROR:",
                error
            );

            throw new SubscriptionVerificationError({
                code: "FINISH_TRANSACTION_FAILED",
                message:
                    "Your subscription was verified, but the store transaction could not be completed.",
                responseData: {
                    verification: data,
                    finishError: error,
                },
            });
        }

        return {
            success: true,
            message: data?.message,
            isSubscribed:
                data?.isSubscribed === true,
            subscriptionExpiresAt:
                data?.subscriptionExpiresAt ??
                null,
            subscriptionPlatform:
                data?.subscriptionPlatform ??
                purchaseData.platform,
            subscriptionProductId:
                data?.subscriptionProductId ??
                SUBSCRIPTION_PRODUCT_ID,
            subscriptionStatus:
                data?.subscriptionStatus,
            subscriptionAutoRenewing:
                data?.subscriptionAutoRenewing,
        };
    };

export const isPurchaseAlreadyLinkedError = (
    error: unknown
) => {
    return (
        error instanceof
            SubscriptionVerificationError &&
        error.code ===
            "PURCHASE_ALREADY_LINKED"
    );
};

export const isOwnershipMismatchError = (
    error: unknown
) => {
    return (
        error instanceof
            SubscriptionVerificationError &&
        error.code ===
            "SUBSCRIPTION_OWNERSHIP_MISMATCH"
    );
};