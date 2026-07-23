import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
} from "react-native-iap";
import { Platform } from "react-native";

const GAMES_PACK_PRODUCT_ID = Platform.select({
  ios: "sbpg_499_1t",
  android: "sbpg_499_1t",
});

const BLOGS_SUBSCRIPTION_PRODUCT_ID = Platform.select({
  ios: "sfs_399_2y",
  android: "sfs_399_2y",
});

export const productIds = [GAMES_PACK_PRODUCT_ID].filter(Boolean);

export const subscriptionIds = [
  BLOGS_SUBSCRIPTION_PRODUCT_ID,
].filter(Boolean);

let purchaseUpdateSubscription = null;
let purchaseErrorSubscription = null;

let connectionPromise = null;
let isConnected = false;
let listenersInstalled = false;

let fallbackCallbacks = {};
let pendingBlogRequest = null;
let pendingGameRequest = null;
let blogRestorePromise = null;

const isAlreadyOwnedError = (error) => {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code.includes("already-owned") ||
    code.includes("already_owned") ||
    code.includes("item-already-owned") ||
    code.includes("duplicate") ||
    message.includes("already owned") ||
    message.includes("duplicate purchase")
  );
};

const makePendingRequest = (callbacks = {}) => ({
  onSuccess: callbacks?.onSuccess,
  onError: callbacks?.onError,
  settled: false,
});

const completeBlogSuccess = async (
  purchase,
  request = pendingBlogRequest
) => {
  if (request?.settled) return;

  if (request) {
    request.settled = true;
  }

  const onSuccess =
    request?.onSuccess ||
    fallbackCallbacks?.onBlogsSubscriptionSuccess;

  try {
    if (!onSuccess) {
      throw new Error(
        "No subscription success handler is registered."
      );
    }

    await onSuccess(purchase);
  } catch (error) {
    console.log(
      "❌ Blog purchase success handler error:",
      error
    );

    const onError =
      request?.onError ||
      fallbackCallbacks?.onPurchaseError;

    onError?.(error);
  } finally {
    if (pendingBlogRequest === request) {
      pendingBlogRequest = null;
    }
  }
};

const completeGameSuccess = async (
  purchase,
  request = pendingGameRequest
) => {
  if (request?.settled) return;

  if (request) {
    request.settled = true;
  }

  const onSuccess =
    request?.onSuccess ||
    fallbackCallbacks?.onGamesPackSuccess ||
    fallbackCallbacks?.onPurchaseSuccess;

  try {
    if (!onSuccess) {
      throw new Error(
        "No game purchase success handler is registered."
      );
    }

    await onSuccess(purchase);
  } catch (error) {
    console.log(
      "❌ Game purchase success handler error:",
      error
    );

    const onError =
      request?.onError ||
      fallbackCallbacks?.onPurchaseError;

    onError?.(error);
  } finally {
    if (pendingGameRequest === request) {
      pendingGameRequest = null;
    }
  }
};

const completeBlogError = (
  error,
  request = pendingBlogRequest
) => {
  if (request?.settled) return;

  if (request) {
    request.settled = true;
  }

  const onError =
    request?.onError ||
    fallbackCallbacks?.onPurchaseError;

  onError?.(error);

  if (pendingBlogRequest === request) {
    pendingBlogRequest = null;
  }
};

const completeGameError = (
  error,
  request = pendingGameRequest
) => {
  if (request?.settled) return;

  if (request) {
    request.settled = true;
  }

  const onError =
    request?.onError ||
    fallbackCallbacks?.onPurchaseError;

  onError?.(error);

  if (pendingGameRequest === request) {
    pendingGameRequest = null;
  }
};

const findOwnedPurchase = async (productId) => {
  const purchases = await getAvailablePurchases();

  return (
    purchases.find(
      (purchase) => purchase.productId === productId
    ) || null
  );
};

export const getOwnedBlogsSubscriptionPurchase =
  async () => {
    await initializeIAP();

    await fetchProducts({
      skus: subscriptionIds,
      type: "subs",
    });

    const purchase = await findOwnedPurchase(
      BLOGS_SUBSCRIPTION_PRODUCT_ID
    );

    console.log(
      "✅ Existing blog subscription:",
      purchase
    );

    return purchase;
  };

const restoreOwnedBlogPurchase = async () => {
  if (!blogRestorePromise) {
    blogRestorePromise =
      getOwnedBlogsSubscriptionPurchase().finally(() => {
        blogRestorePromise = null;
      });
  }

  return blogRestorePromise;
};

const recoverAlreadyOwnedBlogPurchase = async (
  originalError,
  request = pendingBlogRequest
) => {
  if (request?.settled) {
    return false;
  }

  try {
    console.log(
      "ℹ️ Subscription is already owned. Restoring it now."
    );

    const existingPurchase =
      await restoreOwnedBlogPurchase();

    if (!existingPurchase) {
      const restoreError = new Error(
        "The subscription is already owned, but no restorable transaction was returned."
      );

      restoreError.code =
        "already-owned-not-restorable";

      restoreError.originalError = originalError;

      throw restoreError;
    }

    await completeBlogSuccess(
      existingPurchase,
      request
    );

    return true;
  } catch (restoreError) {
    console.log(
      "❌ Restore owned subscription error:",
      restoreError
    );

    completeBlogError(
      restoreError,
      request
    );

    return false;
  }
};

const installNativeListeners = () => {
  if (listenersInstalled) return;

  listenersInstalled = true;

  purchaseUpdateSubscription =
    purchaseUpdatedListener(async (purchase) => {
      try {
        console.log(
          "✅ Purchase updated:",
          purchase
        );

        const productId = purchase.productId;

        if (productId === GAMES_PACK_PRODUCT_ID) {
          await completeGameSuccess(purchase);
          return;
        }

        if (
          productId ===
          BLOGS_SUBSCRIPTION_PRODUCT_ID
        ) {
          await completeBlogSuccess(purchase);
          return;
        }

        await fallbackCallbacks?.onPurchaseSuccess?.(
          purchase
        );
      } catch (error) {
        console.log(
          "❌ Purchase listener error:",
          error
        );

        fallbackCallbacks?.onPurchaseError?.(
          error
        );
      }
    });

  purchaseErrorSubscription =
    purchaseErrorListener(async (error) => {
      console.log(
        "❌ Purchase error listener:",
        error
      );

      if (
        isAlreadyOwnedError(error) &&
        pendingBlogRequest
      ) {
        const request = pendingBlogRequest;

        await recoverAlreadyOwnedBlogPurchase(
          error,
          request
        );

        return;
      }

      if (pendingBlogRequest) {
        completeBlogError(
          error,
          pendingBlogRequest
        );

        return;
      }

      if (pendingGameRequest) {
        completeGameError(
          error,
          pendingGameRequest
        );

        return;
      }

      fallbackCallbacks?.onPurchaseError?.(
        error
      );
    });

  console.log(
    "✅ Shared IAP listeners installed"
  );
};

export const initializeIAP = async () => {
  if (isConnected) {
    installNativeListeners();
    return true;
  }

  if (!connectionPromise) {
    connectionPromise = initConnection()
      .then(() => {
        isConnected = true;

        installNativeListeners();

        console.log(
          "✅ IAP connection initialized"
        );

        return true;
      })
      .catch((error) => {
        connectionPromise = null;

        console.log(
          "❌ IAP init error:",
          error
        );

        throw error;
      });
  }

  return connectionPromise;
};

export const getGamesPackProduct = async () => {
  try {
    await initializeIAP();

    const products = await fetchProducts({
      skus: productIds,
      type: "in-app",
    });

    console.log(
      "✅ Game products fetched:",
      products
    );

    return products?.[0] || null;
  } catch (error) {
    console.log(
      "❌ Get game products error:",
      error
    );

    return null;
  }
};

export const getOwnedGamesPackPurchase =
  async () => {
    try {
      await initializeIAP();

      const gamePurchase =
        await findOwnedPurchase(
          GAMES_PACK_PRODUCT_ID
        );

      console.log(
        "✅ Existing game purchase:",
        gamePurchase
      );

      return gamePurchase;
    } catch (error) {
      console.log(
        "❌ Restore game purchase error:",
        error
      );

      throw error;
    }
  };

export const getBlogsSubscriptionProduct =
  async () => {
    try {
      await initializeIAP();

      const products = await fetchProducts({
        skus: subscriptionIds,
        type: "subs",
      });

      console.log(
        "✅ Blog subscription fetched:",
        products
      );

      return products?.[0] || null;
    } catch (error) {
      console.log(
        "❌ Get blog subscription error:",
        error
      );

      return null;
    }
  };

export const buyGamesPack = async (
  callbacks = {}
) => {
  const request =
    makePendingRequest(callbacks);

  pendingGameRequest = request;

  try {
    await initializeIAP();

    const products = await fetchProducts({
      skus: productIds,
      type: "in-app",
    });

    if (!products?.[0]) {
      throw new Error(
        "Game product not found"
      );
    }

    const existingPurchase =
      await findOwnedPurchase(
        GAMES_PACK_PRODUCT_ID
      );

    if (existingPurchase) {
      await completeGameSuccess(
        existingPurchase,
        request
      );

      return {
        status: "restored",
        purchase: existingPurchase,
      };
    }

    await requestPurchase({
      request: {
        ios: {
          sku: GAMES_PACK_PRODUCT_ID,
        },
        android: {
          skus: [
            GAMES_PACK_PRODUCT_ID,
          ],
        },
      },
      type: "in-app",
    });

    console.log(
      "✅ Game purchase request started"
    );

    return {
      status: "started",
    };
  } catch (error) {
    console.log(
      "❌ Game purchase request error:",
      error
    );

    completeGameError(
      error,
      request
    );

    if (!callbacks?.onError) {
      throw error;
    }

    return {
      status: "failed",
      error,
    };
  }
};

export const buyBlogsSubscription = async (
  callbacks = {}
) => {
  const request =
    makePendingRequest(callbacks);

  pendingBlogRequest = request;

  try {
    await initializeIAP();

    const subscriptions =
      await fetchProducts({
        skus: subscriptionIds,
        type: "subs",
      });

    const subscription =
      subscriptions?.[0];

    if (!subscription) {
      throw new Error(
        "Subscription not found"
      );
    }

    const existingPurchase =
      await findOwnedPurchase(
        BLOGS_SUBSCRIPTION_PRODUCT_ID
      );

    if (existingPurchase) {
      console.log(
        "ℹ️ Active subscription found. Restoring it."
      );

      await completeBlogSuccess(
        existingPurchase,
        request
      );

      return {
        status: "restored",
        purchase: existingPurchase,
      };
    }

    const offerToken =
      Platform.OS === "android"
        ? subscription
            ?.subscriptionOffers?.[0]
            ?.offerTokenAndroid ||
          subscription
            ?.subscriptionOfferDetailsAndroid?.[0]
            ?.offerToken
        : null;

    if (
      Platform.OS === "android" &&
      !offerToken
    ) {
      throw new Error(
        "Missing Android subscription offer token"
      );
    }

    await requestPurchase({
      request: {
        ios: {
          sku:
            BLOGS_SUBSCRIPTION_PRODUCT_ID,
        },
        android: {
          skus: [
            BLOGS_SUBSCRIPTION_PRODUCT_ID,
          ],
          subscriptionOffers: [
            {
              sku:
                BLOGS_SUBSCRIPTION_PRODUCT_ID,
              offerToken,
            },
          ],
        },
      },
      type: "subs",
    });

    console.log(
      "✅ Blog subscription request started"
    );

    return {
      status: "started",
    };
  } catch (error) {
    console.log(
      "❌ Blog subscription request error:",
      error
    );

    if (isAlreadyOwnedError(error)) {
      const restored =
        await recoverAlreadyOwnedBlogPurchase(
          error,
          request
        );

      return {
        status: restored
          ? "restored"
          : "failed",
      };
    }

    completeBlogError(
      error,
      request
    );

    if (!callbacks?.onError) {
      throw error;
    }

    return {
      status: "failed",
      error,
    };
  }
};

export const setupPurchaseListeners = (
  callbacks = {}
) => {
  fallbackCallbacks = callbacks;

  void initializeIAP();

  return () => {
    if (fallbackCallbacks === callbacks) {
      fallbackCallbacks = {};
    }
  };
};

export const cleanupIAP = async () => {
  console.log(
    "ℹ️ Screen cleanup complete. Shared IAP connection remains active."
  );
};

export const shutdownIAP = async () => {
  try {
    purchaseUpdateSubscription?.remove();
    purchaseErrorSubscription?.remove();

    purchaseUpdateSubscription = null;
    purchaseErrorSubscription = null;
    listenersInstalled = false;

    pendingBlogRequest = null;
    pendingGameRequest = null;
    fallbackCallbacks = {};

    if (isConnected) {
      await endConnection();
    }

    isConnected = false;
    connectionPromise = null;

    console.log(
      "✅ IAP fully shut down"
    );
  } catch (error) {
    console.log(
      "❌ IAP shutdown error:",
      error
    );
  }
};