import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    SafeAreaView,
} from "react-native-safe-area-context";

import {
    useNavigation,
} from "@react-navigation/native";

import DumpCard from "../components/DumpCard";

import {
    Dump,
    getMyDumps,
    getMyInteractions,
} from "../api/studentDumpApi";

import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

type ScreenTab =
    | "dumps"
    | "interactions";

type InteractionType =
    | "heart"
    | "laugh"
    | "fire"
    | "comment";

type ActivityDump = Dump & {
    interactionTypes?: InteractionType[];
};

type ActivityResponse = {
    success?: boolean;
    dumps?: ActivityDump[];
    data?: ActivityDump[];
};

const getScreenTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            background: "#F4F7FA",
            surface: "#FFFFFF",
            text: "#07111F",
            muted: "#64748B",
            border:
                "rgba(7,17,31,0.10)",
            cyan: "#06B6D4",
            interactionBackground:
                "#E7F9FC",
            interactionText:
                "#087E8B",
            error: "#B42318",
        };
    }

    return {
        background: "#050816",
        surface: "#090D14",
        text: "#FFFFFF",
        muted: "#94A3B8",
        border:
            "rgba(255,255,255,0.09)",
        cyan: "#22D3EE",
        interactionBackground:
            "rgba(34,211,238,0.12)",
        interactionText:
            "#67E8F9",
        error: "#FCA5A5",
    };
};

const getInteractionLabel = (
    types: InteractionType[] = []
) => {
    const labels: string[] = [];

    if (types.includes("heart")) {
        labels.push(
            "❤️ You hearted this"
        );
    }

    if (types.includes("fire")) {
        labels.push(
            "🔥 You fired this"
        );
    }

    if (types.includes("laugh")) {
        labels.push(
            "😂 You laughed at this"
        );
    }

    if (types.includes("comment")) {
        labels.push(
            "💬 You commented"
        );
    }

    return labels.join("  ");
};

export default function MyDumpsScreen() {
    const navigation =
        useNavigation();

    const { mode } =
        useTimeTheme();

    const theme =
        useMemo(
            () =>
                getScreenTheme(
                    mode
                ),
            [mode]
        );

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<ScreenTab>(
            "dumps"
        );

    const [
        dumps,
        setDumps,
    ] =
        useState<ActivityDump[]>(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        refreshing,
        setRefreshing,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState("");

    /*
     * Replace this with your authenticated
     * user's MongoDB ID when ready.
     *
     * Example:
     *
     * const { user } = useAuth();
     * const currentUserId =
     *     user?._id ?? null;
     */
    const currentUserId:
        string | null = null;

    const loadContent =
        useCallback(
            async (
                showLoader = true
            ) => {
                try {
                    if (
                        showLoader
                    ) {
                        setLoading(
                            true
                        );
                    }

                    setError("");

                    if (
                        activeTab ===
                        "dumps"
                    ) {
                        const response =
                            await getMyDumps();

                        setDumps(
                            Array.isArray(
                                response
                                    ?.dumps
                            )
                                ? response.dumps
                                : []
                        );

                        return;
                    }

                    const response =
                        await getMyInteractions();

                    const typedResponse =
                        response as ActivityResponse;

                    const interactionDumps =
                        Array.isArray(
                            typedResponse
                                ?.dumps
                        )
                            ? typedResponse.dumps
                            : Array.isArray(
                                typedResponse
                                    ?.data
                            )
                                ? typedResponse.data
                                : [];

                    setDumps(
                        interactionDumps
                    );
                } catch (
                loadError: any
                ) {
                    console.error(
                        "MY ACTIVITY LOAD ERROR:",
                        loadError
                    );

                    const message =
                        typeof loadError
                            ?.message ===
                            "string"
                            ? loadError.message
                            : "";

                    if (
                        activeTab ===
                        "interactions" &&
                        message.includes(
                            "404"
                        )
                    ) {
                        setError(
                            "The interactions route was not found. Redeploy the backend after adding /api/dumps/my-interactions."
                        );
                    } else {
                        setError(
                            activeTab ===
                                "dumps"
                                ? "Unable to load your dumps."
                                : "Unable to load your interactions."
                        );
                    }
                } finally {
                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );
                }
            },
            [activeTab]
        );

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const handleRefresh =
        useCallback(() => {
            setRefreshing(
                true
            );

            loadContent(
                false
            );
        }, [loadContent]);

    const handleChangeTab =
        useCallback(
            (
                tab: ScreenTab
            ) => {
                if (
                    tab ===
                    activeTab
                ) {
                    return;
                }

                setDumps([]);
                setError("");
                setLoading(true);
                setActiveTab(tab);
            },
            [activeTab]
        );

    const handleOpenComments =
        useCallback(
            (
                dump: Dump
            ) => {
                Alert.alert(
                    "Comments",
                    dump.content
                );
            },
            []
        );

    const renderItem = ({
        item,
    }: {
        item: ActivityDump;
    }) => {
        return (
            <View>
                {activeTab ===
                    "interactions" &&
                    item
                        .interactionTypes
                        ?.length ? (
                    <View
                        style={[
                            styles.interactionBanner,
                            {
                                backgroundColor:
                                    theme.interactionBackground,
                                borderBottomColor:
                                    theme.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.interactionText,
                                {
                                    color:
                                        theme.interactionText,
                                },
                            ]}
                        >
                            {getInteractionLabel(
                                item.interactionTypes
                            )}
                        </Text>
                    </View>
                ) : null}

                <DumpCard
                    dump={item}
                    currentUserId={
                        currentUserId
                    }
                    onOpenComments={
                        handleOpenComments
                    }
                />
            </View>
        );
    };

    return (
        <SafeAreaView
            edges={[
                "top",
                "left",
                "right",
            ]}
            style={[
                styles.container,
                {
                    backgroundColor:
                        theme.background,
                },
            ]}
        >
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor:
                            theme.surface,
                        borderBottomColor:
                            theme.border,
                    },
                ]}
            >
                <Pressable
                    onPress={() =>
                        navigation.goBack()
                    }
                    hitSlop={12}
                >
                    <Text
                        style={[
                            styles.backButton,
                            {
                                color:
                                    theme.text,
                            },
                        ]}
                    >
                        ‹
                    </Text>
                </Pressable>

                <Text
                    style={[
                        styles.title,
                        {
                            color:
                                theme.text,
                        },
                    ]}
                >
                    My Activity
                </Text>

                <View
                    style={
                        styles.headerSpacer
                    }
                />
            </View>

            <View
                style={[
                    styles.tabs,
                    {
                        backgroundColor:
                            theme.surface,
                        borderBottomColor:
                            theme.border,
                    },
                ]}
            >
                <Pressable
                    style={[
                        styles.tab,
                        activeTab ===
                        "dumps" && {
                            borderBottomColor:
                                theme.cyan,
                        },
                    ]}
                    onPress={() =>
                        handleChangeTab(
                            "dumps"
                        )
                    }
                >
                    <Text
                        style={[
                            styles.tabText,
                            {
                                color:
                                    activeTab ===
                                        "dumps"
                                        ? theme.cyan
                                        : theme.muted,
                            },
                        ]}
                    >
                        My Dumps
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.tab,
                        activeTab ===
                        "interactions" && {
                            borderBottomColor:
                                theme.cyan,
                        },
                    ]}
                    onPress={() =>
                        handleChangeTab(
                            "interactions"
                        )
                    }
                >
                    <Text
                        style={[
                            styles.tabText,
                            {
                                color:
                                    activeTab ===
                                        "interactions"
                                        ? theme.cyan
                                        : theme.muted,
                            },
                        ]}
                    >
                        Interactions
                    </Text>
                </Pressable>
            </View>

            {loading ? (
                <View
                    style={
                        styles.centered
                    }
                >
                    <ActivityIndicator
                        size="large"
                        color={
                            theme.cyan
                        }
                    />

                    <Text
                        style={[
                            styles.loadingText,
                            {
                                color:
                                    theme.muted,
                            },
                        ]}
                    >
                        Loading activity...
                    </Text>
                </View>
            ) : error ? (
                <View
                    style={
                        styles.centered
                    }
                >
                    <Text
                        style={[
                            styles.errorText,
                            {
                                color:
                                    theme.error,
                            },
                        ]}
                    >
                        {error}
                    </Text>

                    <Pressable
                        style={[
                            styles.retryButton,
                            {
                                backgroundColor:
                                    theme.cyan,
                            },
                        ]}
                        onPress={() =>
                            loadContent()
                        }
                    >
                        <Text
                            style={
                                styles.retryText
                            }
                        >
                            Try Again
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList<ActivityDump>
                    data={dumps}
                    keyExtractor={(
                        item
                    ) =>
                        String(
                            item._id
                        )
                    }
                    renderItem={
                        renderItem
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={
                                refreshing
                            }
                            onRefresh={
                                handleRefresh
                            }
                            tintColor={
                                theme.cyan
                            }
                            colors={[
                                theme.cyan,
                            ]}
                        />
                    }
                    ListEmptyComponent={
                        <View
                            style={
                                styles.emptyContainer
                            }
                        >
                            <Text
                                style={
                                    styles.emptyEmoji
                                }
                            >
                                {activeTab ===
                                    "dumps"
                                    ? "🗑️"
                                    : "💬"}
                            </Text>

                            <Text
                                style={[
                                    styles.emptyTitle,
                                    {
                                        color:
                                            theme.text,
                                    },
                                ]}
                            >
                                {activeTab ===
                                    "dumps"
                                    ? "No dumps yet"
                                    : "No interactions yet"}
                            </Text>

                            <Text
                                style={[
                                    styles.emptyDescription,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                {activeTab ===
                                    "dumps"
                                    ? "Your non-anonymous dumps will appear here."
                                    : "Dumps you react to or comment on will appear here."}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={
                        dumps.length ===
                            0
                            ? styles.emptyList
                            : styles.listContent
                    }
                    showsVerticalScrollIndicator={
                        false
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles =
    StyleSheet.create({
        container: {
            flex: 1,
        },

        header: {
            minHeight: 54,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            borderBottomWidth:
                StyleSheet.hairlineWidth,
        },

        backButton: {
            fontSize: 38,
            lineHeight: 40,
        },

        title: {
            fontSize: 19,
            fontFamily:
                "Rajdhani_700Bold",
        },

        headerSpacer: {
            width: 26,
        },

        tabs: {
            flexDirection: "row",
            paddingHorizontal: 14,
            paddingTop: 8,
            borderBottomWidth:
                StyleSheet.hairlineWidth,
        },

        tab: {
            flex: 1,
            alignItems: "center",
            paddingVertical: 11,
            borderBottomWidth: 3,
            borderBottomColor:
                "transparent",
        },

        tabText: {
            fontSize: 14,
            fontFamily:
                "Rajdhani_700Bold",
        },

        listContent: {
            paddingBottom: 36,
        },

        interactionBanner: {
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 6,
            borderBottomWidth:
                StyleSheet.hairlineWidth,
        },

        interactionText: {
            fontSize: 12,
            fontWeight: "700",
        },

        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent:
                "center",
            padding: 24,
        },

        loadingText: {
            marginTop: 12,
        },

        errorText: {
            fontSize: 15,
            lineHeight: 21,
            textAlign: "center",
        },

        retryButton: {
            marginTop: 14,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 10,
        },

        retryText: {
            fontWeight: "800",
            color: "#FFFFFF",
        },

        emptyList: {
            flexGrow: 1,
        },

        emptyContainer: {
            flex: 1,
            minHeight: 400,
            alignItems: "center",
            justifyContent:
                "center",
            paddingHorizontal: 28,
        },

        emptyEmoji: {
            fontSize: 42,
        },

        emptyTitle: {
            marginTop: 12,
            fontSize: 19,
            fontFamily:
                "Rajdhani_700Bold",
        },

        emptyDescription: {
            marginTop: 7,
            fontSize: 14,
            lineHeight: 20,
            textAlign: "center",
        },
    });