import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { finishTransaction } from "react-native-iap";

const GAME_PRODUCT_ID = "sbpg_499_1t";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

export type GamePurchaseVerificationResponse = {
    success: boolean;
    message?: string;
    gamesPackagePurchased: boolean;
    gamesPurchasePlatform?: "ios" | "android" | null;
    gamesPurchaseProductId?: string | null;
};

export class GamePurchaseVerificationError extends Error {
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

        this.name = "GamePurchaseVerificationError";
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

const getGamePurchasePayload = (
    purchase: any
) => {
    const platform =
        Platform.OS === "ios"
            ? "ios"
            : "android";

    const returnedProductId =
        normalizeString(
            purchase?.productId
        ) ||
        normalizeString(
            purchase?.productIdIOS
        );

    const productId =
        returnedProductId ||
        GAME_PRODUCT_ID;

    if (productId !== GAME_PRODUCT_ID) {
        throw new GamePurchaseVerificationError({
            code: "INVALID_GAME_PRODUCT_ID",
            message:
                "The store returned an unexpected game product.",
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
            throw new GamePurchaseVerificationError({
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
        throw new GamePurchaseVerificationError({
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

export const verifyScoolFoolsGamePurchase =
    async (
        purchase: any
    ): Promise<GamePurchaseVerificationResponse> => {
        if (!purchase) {
            throw new GamePurchaseVerificationError({
                code: "MISSING_PURCHASE",
                message:
                    "The store did not return game purchase information.",
            });
        }

        if (!API_BASE_URL) {
            throw new GamePurchaseVerificationError({
                code: "MISSING_API_BASE_URL",
                message:
                    "The game purchase server is unavailable.",
            });
        }

        const token =
            await AsyncStorage.getItem("token");

        if (!token) {
            throw new GamePurchaseVerificationError({
                code: "UNAUTHORIZED",
                message:
                    "Your session has expired. Please sign in again.",
            });
        }

        const purchasePayload =
            getGamePurchasePayload(purchase);

        let response: Response;

        try {
            response = await fetch(
                `${API_BASE_URL}/api/games/verify`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify(
                        purchasePayload
                    ),
                }
            );
        } catch (error) {
            throw new GamePurchaseVerificationError({
                code: "NETWORK_ERROR",
                message:
                    "ScoolFools could not connect to the game purchase server.",
                responseData: error,
            });
        }

        const data =
            await parseResponseBody(response);

        console.log(
            "GAME PURCHASE VERIFY RESPONSE:",
            {
                status: response.status,
                ok: response.ok,
                code: data?.code,
                gamesPackagePurchased:
                    data?.gamesPackagePurchased,
            }
        );

        if (!response.ok) {
            throw new GamePurchaseVerificationError({
                code:
                    normalizeString(
                        data?.code
                    ) ||
                    "GAME_PURCHASE_VERIFICATION_FAILED",

                message:
                    normalizeString(
                        data?.message
                    ) ||
                    normalizeString(
                        data?.error
                    ) ||
                    "The game purchase could not be verified.",

                status: response.status,
                responseData: data,
            });
        }

        if (data?.success !== true) {
            throw new GamePurchaseVerificationError({
                code:
                    normalizeString(
                        data?.code
                    ) ||
                    "INVALID_GAME_VERIFICATION_RESPONSE",

                message:
                    normalizeString(
                        data?.message
                    ) ||
                    "The game purchase server returned an invalid response.",

                status: response.status,
                responseData: data,
            });
        }

        /*
         * Finish or acknowledge only after the backend has:
         *
         * 1. Verified the purchase with Apple or Google
         * 2. Confirmed the ownership key
         * 3. Rejected cross-account ownership conflicts
         * 4. Linked or reverified the current ScoolFools account
         */
        try {
            await finishTransaction({
                purchase,
                isConsumable: false,
            });
        } catch (error) {
            throw new GamePurchaseVerificationError({
                code: "FINISH_GAME_TRANSACTION_FAILED",
                message:
                    "Your game purchase was verified, but the store transaction could not be completed.",
                responseData: {
                    verification: data,
                    finishError: error,
                },
            });
        }

        return {
            success: true,
            message: data?.message,
            gamesPackagePurchased:
                data?.gamesPackagePurchased ===
                true,
            gamesPurchasePlatform:
                data?.gamesPurchasePlatform ??
                purchasePayload.platform,
            gamesPurchaseProductId:
                data?.gamesPurchaseProductId ??
                GAME_PRODUCT_ID,
        };
    };

export const isGamePurchaseAlreadyLinkedError = (
    error: unknown
) => {
    return (
        error instanceof
            GamePurchaseVerificationError &&
        error.code ===
            "GAME_PURCHASE_ALREADY_LINKED"
    );
};

export const isGameOwnershipMismatchError = (
    error: unknown
) => {
    return (
        error instanceof
            GamePurchaseVerificationError &&
        error.code ===
            "GAME_PURCHASE_OWNERSHIP_MISMATCH"
    );
};