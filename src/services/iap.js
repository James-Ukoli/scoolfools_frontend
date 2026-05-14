import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  fetchProducts,
} from "react-native-iap";
import { Platform } from "react-native";

const GAMES_PACK_PRODUCT_ID = Platform.select({
  ios: "jmpg_499_1t",
  android: "jmpg_499_1t",
});

const BLOGS_SUBSCRIPTION_PRODUCT_ID = Platform.select({
  ios: "jms_599_1y",
  android: "jms_599_1y",
});

export const productIds = [GAMES_PACK_PRODUCT_ID].filter(Boolean);
export const subscriptionIds = [BLOGS_SUBSCRIPTION_PRODUCT_ID].filter(Boolean);

let purchaseUpdateSubscription = null;
let purchaseErrorSubscription = null;

export const initializeIAP = async () => {
  try {
    await initConnection();
    console.log("✅ IAP connection initialized");
  } catch (error) {
    console.log("❌ IAP init error:", error);
  }
};

export const getGamesPackProduct = async () => {
  try {
    const products = await fetchProducts({
      skus: productIds,
      type: "in-app",
    });

    console.log("✅ Game products fetched:", products);
    return products?.[0] || null;
  } catch (error) {
    console.log("❌ Get game products error:", error);
    return null;
  }
};

export const getBlogsSubscriptionProduct = async () => {
  try {
    const products = await fetchProducts({
      skus: subscriptionIds,
      type: "subs",
    });

    console.log("✅ Blog subscription fetched:", products);
    return products?.[0] || null;
  } catch (error) {
    console.log("❌ Get blog subscription error:", error);
    return null;
  }
};

export const buyGamesPack = async () => {
  try {
    const products = await fetchProducts({
      skus: productIds,
      type: "in-app",
    });

    console.log("FULL GAME PRODUCT OBJECT:", JSON.stringify(products?.[0], null, 2));

    if (!products?.[0]) {
      throw new Error("Game product not found");
    }

    await requestPurchase({
      request: {
        ios: {
          sku: GAMES_PACK_PRODUCT_ID,
        },
        android: {
          skus: [GAMES_PACK_PRODUCT_ID],
        },
      },
      type: "in-app",
    });

    console.log("✅ Game purchase request started");
  } catch (error) {
    console.log("❌ Game purchase request error:", error);
    throw error;
  }
};

export const buyBlogsSubscription = async () => {
  try {
    const subscriptions = await fetchProducts({
      skus: subscriptionIds,
      type: "subs",
    });

    const subscription = subscriptions?.[0];

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const offerToken =
      Platform.OS === "android"
        ? subscription?.subscriptionOffers?.[0]?.offerTokenAndroid ||
          subscription?.subscriptionOfferDetailsAndroid?.[0]?.offerToken
        : null;

    if (Platform.OS === "android" && !offerToken) {
      throw new Error("Missing Android subscription offer token");
    }

    await requestPurchase({
      request: {
        ios: {
          sku: BLOGS_SUBSCRIPTION_PRODUCT_ID,
        },
        android: {
          skus: [BLOGS_SUBSCRIPTION_PRODUCT_ID],
          subscriptionOffers: [
            {
              sku: BLOGS_SUBSCRIPTION_PRODUCT_ID,
              offerToken,
            },
          ],
        },
      },
      type: "subs",
    });

    console.log("✅ Blog subscription request started");
  } catch (error) {
    console.log("❌ Blog subscription request error:", error);
    throw error;
  }
};

export const setupPurchaseListeners = ({
  onPurchaseSuccess,
  onGamesPackSuccess,
  onBlogsSubscriptionSuccess,
  onPurchaseError,
}) => {
  purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    try {
      console.log("✅ Purchase updated:", purchase);

      const productId = purchase.productId;

      if (productId === GAMES_PACK_PRODUCT_ID) {
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        onPurchaseSuccess?.(purchase);
        onGamesPackSuccess?.(purchase);
        return;
      }

      if (productId === BLOGS_SUBSCRIPTION_PRODUCT_ID) {
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        onBlogsSubscriptionSuccess?.(purchase);
        return;
      }
    } catch (error) {
      console.log("❌ Purchase listener error:", error);
      onPurchaseError?.(error);
    }
  });

  purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.log("❌ Purchase error listener:", error);
    onPurchaseError?.(error);
  });
};

export const cleanupIAP = async () => {
  try {
    purchaseUpdateSubscription?.remove();
    purchaseErrorSubscription?.remove();

    purchaseUpdateSubscription = null;
    purchaseErrorSubscription = null;

    await endConnection();

    console.log("✅ IAP cleaned up");
  } catch (error) {
    console.log("❌ IAP cleanup error:", error);
  }
};