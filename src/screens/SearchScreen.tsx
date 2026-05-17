import { useEffect, useState } from "react";
import {
    View,
    TextInput,
    FlatList,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Modal,
    Pressable,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../components/AppHeader";
import {
    initializeIAP,
    getBlogsSubscriptionProduct,
    buyBlogsSubscription,
    setupPurchaseListeners,
    cleanupIAP,
} from "../services/iap";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

function formatTimeAgo(dateString?: string) {
    if (!dateString) return "";

    const now = new Date();
    const posted = new Date(dateString);
    const diffMs = now.getTime() - posted.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return posted.toLocaleDateString();
}

function formatBadgeLabel(value?: string) {
    if (!value) return "";
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SearchScreen() {
    const navigation = useNavigation<any>();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);

    const getToken = async () => {
        return await AsyncStorage.getItem("token");
    };

    const fetchEntitlements = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data?.success) {
                setIsSubscribed(!!data?.entitlements?.isSubscribed);
            }
        } catch (error) {
            console.log("Search entitlement fetch error:", error);
        }
    };

    const loadBlogSubscription = async () => {
        try {
            await initializeIAP();

            const product = await getBlogsSubscriptionProduct();
            setSubscriptionProduct(product);
        } catch (error) {
            console.log("Search blog subscription load error:", error);
        }
    };

    const activateBlogSubscriptionOnBackend = async () => {
        try {
            const token = await getToken();

            if (!token || !API_BASE_URL) {
                throw new Error("Missing token or API base URL");
            }

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me/activate-blog-subscription`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to activate subscription");
            }

            setIsSubscribed(true);
            setPaywallVisible(false);

            Alert.alert("Subscribed 🎉", "You now have access to Just Move blogs.");
        } catch (error) {
            console.log("Activate search blog subscription error:", error);

            Alert.alert(
                "Purchase Complete",
                "Purchase worked, but saving the subscription to your account failed."
            );
        } finally {
            setLoadingSubscription(false);
        }
    };

    const handleSubscribePress = async () => {
        try {
            setLoadingSubscription(true);
            await buyBlogsSubscription();
        } catch (error) {
            setLoadingSubscription(false);
            console.log("Search blog subscription request error:", error);

            Alert.alert(
                "Subscription Failed",
                "Something went wrong while starting the subscription."
            );
        }
    };

    useEffect(() => {
        fetchEntitlements();
        loadBlogSubscription();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async () => {
                await activateBlogSubscriptionOnBackend();
            },
            onPurchaseError: (error: any) => {
                setLoadingSubscription(false);
                console.log("Search subscription listener error:", error);
            },
        });

        return () => {
            cleanupIAP();
        };
    }, []);

    const handleSearch = async (text: string) => {
        setQuery(text);

        if (text.trim().length < 2) {
            setResults([]);
            return;
        }

        try {
            setLoading(true);

            const url = `${API_BASE_URL}/api/posts/search?q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const data = await res.json();

            setResults(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.log("Search error:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenResult = (item: any) => {
        const isBlog = item.content_type === "blog";

        if (isBlog && !isSubscribed) {
            setPaywallVisible(true);
            return;
        }

        navigation.navigate("ArticleScreen", {
            slug: item.slug,
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader />

            <View style={styles.content}>
                <View style={styles.searchHeader}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TextInput
                        placeholder="Search articles..."
                        placeholderTextColor="#888"
                        style={styles.input}
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                </View>

                {loading && (
                    <ActivityIndicator
                        style={styles.loader}
                        size="small"
                        color="#3CF2FF"
                    />
                )}

                <FlatList
                    data={results}
                    keyExtractor={(item, index) =>
                        item._id?.toString() || item.slug || index.toString()
                    }
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.resultItem}
                            activeOpacity={0.8}
                            onPress={() => handleOpenResult(item)}
                        >
                            <View style={styles.metaRow}>
                                {!!item.content_type && (
                                    <View style={styles.primaryBadge}>
                                        <Text style={styles.primaryBadgeText}>
                                            {formatBadgeLabel(item.content_type)}
                                        </Text>
                                    </View>
                                )}

                                {!!item.category && (
                                    <View style={styles.secondaryBadge}>
                                        <Text style={styles.secondaryBadgeText}>
                                            {item.category}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.title} numberOfLines={2}>
                                {item.title}
                            </Text>

                            {!!item.summary && (
                                <Text style={styles.summary} numberOfLines={2}>
                                    {item.summary}
                                </Text>
                            )}

                            <Text style={styles.timestamp}>
                                {formatTimeAgo(item.published_at || item.created_at)}
                            </Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        query.trim().length >= 2 && !loading ? (
                            <Text style={styles.emptyText}>
                                No articles found.
                            </Text>
                        ) : null
                    }
                    contentContainerStyle={styles.listContent}
                />

                <TouchableOpacity
                    style={styles.homeButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
                >
                    <Ionicons name="home" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <Modal
                visible={paywallVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPaywallVisible(false)}
            >
                <View style={styles.paywallOverlay}>
                    <Pressable
                        style={styles.paywallBackdrop}
                        onPress={() => setPaywallVisible(false)}
                    />

                    <View style={styles.paywallCard}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setPaywallVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>

                        <Text style={styles.paywallEmoji}>♟️</Text>

                        <Text style={styles.paywallTitle}>
                            Support Just Move Blogs
                        </Text>

                        <Text style={styles.paywallSubtitle}>
                            Help support independent chess journalism and the future of
                            modern chess media.
                        </Text>

                        <View style={styles.priceBox}>
                            <Text style={styles.freeTrialText}>1 Month Free</Text>
                            <Text style={styles.priceText}>
                                Then {subscriptionProduct?.localizedPrice || "$5.99"}/year
                            </Text>
                        </View>

                        <View style={styles.benefitsBox}>
                            <Text style={styles.benefitText}>✓ Exclusive blogs and stories</Text>
                            <Text style={styles.benefitText}>✓ Support independent chess coverage</Text>
                            <Text style={styles.benefitText}>✓ Help grow modern chess media</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.subscribeButton}
                            activeOpacity={0.9}
                            onPress={handleSubscribePress}
                            disabled={loadingSubscription}
                        >
                            {loadingSubscription ? (
                                <ActivityIndicator color="#050816" />
                            ) : (
                                <Text style={styles.subscribeButtonText}>
                                    Start Free Month
                                </Text>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.paywallFinePrint}>
                            Cancel anytime. Subscription renews yearly after the free trial.
                        </Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    searchHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        marginRight: 10,
    },
    input: {
        flex: 1,
        backgroundColor: "#0B1224",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        fontSize: 16,
    },
    loader: {
        marginTop: 8,
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 90,
    },
    resultItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#12203A",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
    primaryBadge: {
        backgroundColor: "#12203A",
        borderWidth: 1,
        borderColor: "#1D335C",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    primaryBadgeText: {
        color: "#3CF2FF",
        fontSize: 11,
        fontWeight: "700",
    },
    secondaryBadge: {
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#24385E",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    secondaryBadgeText: {
        color: "#D9E2F2",
        fontSize: 11,
        fontWeight: "600",
    },
    title: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "600",
        marginBottom: 6,
    },
    summary: {
        color: "#AEB6C2",
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    timestamp: {
        color: "#7D8796",
        fontSize: 12,
        fontWeight: "500",
    },
    emptyText: {
        color: "#8A8F98",
        fontSize: 15,
        textAlign: "center",
        marginTop: 32,
    },
    homeButton: {
        position: "absolute",
        right: 18,
        bottom: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#12203A",
        borderWidth: 1,
        borderColor: "#24406F",
    },

    paywallOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 26,
    },
    paywallBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.82)",
    },
    paywallCard: {
        width: "100%",
        backgroundColor: "#070A16",
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: "#39C0ED",
        paddingHorizontal: 22,
        paddingTop: 26,
        paddingBottom: 20,
        alignItems: "center",
        shadowColor: "#39C0ED",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 14,
    },
    closeButton: {
        position: "absolute",
        top: 12,
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
    },
    closeButtonText: {
        color: "#FFFFFF",
        fontSize: 26,
        lineHeight: 28,
        fontWeight: "700",
    },
    paywallEmoji: {
        fontSize: 42,
        marginBottom: 10,
    },
    paywallTitle: {
        color: "#FFFFFF",
        fontSize: 23,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 8,
    },
    paywallSubtitle: {
        color: "#C9D4E5",
        fontSize: 14,
        lineHeight: 21,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
    },
    priceBox: {
        width: "100%",
        backgroundColor: "#101827",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1E4660",
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 16,
    },
    freeTrialText: {
        color: "#39C0ED",
        fontSize: 26,
        fontWeight: "900",
    },
    priceText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
        marginTop: 4,
        opacity: 0.9,
    },
    benefitsBox: {
        width: "100%",
        marginBottom: 18,
    },
    benefitText: {
        color: "#FFFFFF",
        fontSize: 13.5,
        fontWeight: "800",
        marginBottom: 8,
    },
    subscribeButton: {
        width: "100%",
        height: 50,
        borderRadius: 16,
        backgroundColor: "#39C0ED",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    subscribeButtonText: {
        color: "#050816",
        fontSize: 15,
        fontWeight: "900",
    },
    paywallFinePrint: {
        color: "#7E96A5",
        fontSize: 11,
        lineHeight: 16,
        textAlign: "center",
        fontWeight: "600",
    },
});