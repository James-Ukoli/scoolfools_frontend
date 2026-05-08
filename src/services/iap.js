import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
} from "react-native-iap";

import { Platform } from "react-native";

const GAMES_PACK_PRODUCT_ID = Platform.select({
  ios: "jmpg_499_1t",
  android: "jmpg_499_1t",
});

export const productIds = [GAMES_PACK_PRODUCT_ID];

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
    const products = await getProducts({
      skus: productIds,
    });

    console.log("✅ Products fetched:", products);

    return products?.[0] || null;
  } catch (error) {
    console.log("❌ Get products error:", error);
    return null;
  }
};

export const buyGamesPack = async () => {
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: GAMES_PACK_PRODUCT_ID,
        },
        android: {
          skus: [GAMES_PACK_PRODUCT_ID],
        },
      },
    });

    console.log("✅ Purchase request started");
  } catch (error) {
    console.log("❌ Purchase request error:", error);
    throw error;
  }
};

export const setupPurchaseListeners = ({
  onPurchaseSuccess,
  onPurchaseError,
}) => {
  purchaseUpdateSubscription = purchaseUpdatedListener(
    async (purchase) => {
      try {
        console.log("✅ Purchase updated:", purchase);

        const productId = purchase.productId;

        if (productId === GAMES_PACK_PRODUCT_ID) {
          await finishTransaction({
            purchase,
            isConsumable: false,
          });

          onPurchaseSuccess?.(purchase);
        }
      } catch (error) {
        console.log("❌ Purchase listener error:", error);
        onPurchaseError?.(error);
      }
    }
  );

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