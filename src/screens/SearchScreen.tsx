import { useState } from "react";
import {
    View,
    TextInput,
    FlatList,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppHeader from "../components/AppHeader";

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

    const handleSearch = async (text: string) => {
        setQuery(text);

        if (text.trim().length < 2) {
            setResults([]);
            return;
        }

        try {
            setLoading(true);

            const url = `${API_BASE_URL}/api/posts/search?q=${encodeURIComponent(text)}`;
            console.log("SEARCH URL:", url);

            const res = await fetch(url);
            const data = await res.json();

            console.log("SEARCH STATUS:", res.status);
            console.log("SEARCH DATA:", data);

            setResults(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.log("Search error:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
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
                            onPress={() =>
                                navigation.navigate("ArticleScreen", {
                                    slug: item.slug,
                                })
                            }
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
});