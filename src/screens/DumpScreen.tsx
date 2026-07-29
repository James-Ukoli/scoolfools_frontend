import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    SafeAreaView,
} from "react-native-safe-area-context";

import {
    useFocusEffect,
    useNavigation,
    useRoute,
} from "@react-navigation/native";

import Ionicons from "@expo/vector-icons/Ionicons";

import {
    s,
    vs,
    ms,
} from "react-native-size-matters";

import DumpCard from "../components/DumpCard";
import DumpCommentsModal from "../components/DumpCommentsModal";

import {
    Dump,
    getCollegeRecent,
    getCollegeTrending,
    getDumpById,
    getHighSchoolRecent,
    getHighSchoolTrending,
} from "../api/studentDumpApi";

import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

import {
    navigate,
} from "../navigation/AppNavigation";

type FeedTab =
    | "Recent"
    | "Trending";

type StoredUser = {
    _id?: string;
    id?: string;

    schoolLevel?:
    | "college"
    | "highSchool";

    collegeName?:
    | string
    | null;

    highSchoolClassification?:
    | string
    | null;
};

type DumpScreenRouteParams = {
    notificationId?: string;
    type?: string;

    resourceType?: string;
    resourceId?: string;

    dumpId?: string;
    commentId?: string;
    replyId?: string;
    parentCommentId?: string;

    openComments?:
    | boolean
    | string;

    notificationAction?: string;
};

const PAGE_LIMIT = 20;

const getDumpScreenTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            bg: "#F8FAFC",
            feed: "#FFFFFF",
            surface: "#FFFFFF",
            surfaceAlt: "#ECFEFF",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border:
                "rgba(7,17,31,0.09)",
            cyan: "#06B6D4",
            cyanSoft:
                "rgba(6,182,212,0.11)",
            yellow: "#FACC15",
            darkText: "#07111F",
            red: "#EF4444",
        };
    }

    return {
        bg: "#020617",
        feed: "#090D14",
        surface: "#090D14",
        surfaceAlt: "#07111F",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border:
            "rgba(255,255,255,0.09)",
        cyan: "#22D3EE",
        cyanSoft:
            "rgba(34,211,238,0.12)",
        yellow: "#FACC15",
        darkText: "#07111F",
        red: "#FF7A7A",
    };
};

const getStringValue = (
    value: unknown
): string | null => {
    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const trimmedValue =
        value.trim();

    return trimmedValue.length > 0
        ? trimmedValue
        : null;
};

const getBooleanValue = (
    value: unknown
): boolean => {
    if (
        typeof value === "boolean"
    ) {
        return value;
    }

    if (
        typeof value === "string"
    ) {
        return (
            value.toLowerCase() ===
            "true"
        );
    }

    return false;
};

export default function DumpScreen() {
    const navigation =
        useNavigation<any>();

    const route =
        useRoute<any>();

    const listRef =
        useRef<FlatList<Dump> | null>(
            null
        );

    const activeDeepLinkRef =
        useRef<string | null>(
            null
        );

    const handledDeepLinkRef =
        useRef<string | null>(
            null
        );

    const { mode } =
        useTimeTheme();

    const theme =
        getDumpScreenTheme(
            mode
        );

    const [
        currentUser,
        setCurrentUser,
    ] =
        useState<StoredUser | null>(
            null
        );

    const [
        dumps,
        setDumps,
    ] =
        useState<Dump[]>(
            []
        );

    const [
        feedTab,
        setFeedTab,
    ] =
        useState<FeedTab>(
            "Recent"
        );

    const [
        page,
        setPage,
    ] =
        useState(1);

    const [
        hasMore,
        setHasMore,
    ] =
        useState(true);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        loadingMore,
        setLoadingMore,
    ] =
        useState(false);

    const [
        refreshing,
        setRefreshing,
    ] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(
            null
        );

    const [
        selectedDump,
        setSelectedDump,
    ] =
        useState<Dump | null>(
            null
        );

    const [
        commentsVisible,
        setCommentsVisible,
    ] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | Notification Comment Targets
    |--------------------------------------------------------------------------
    */

    const [
        targetCommentId,
        setTargetCommentId,
    ] =
        useState<string | null>(
            null
        );

    const [
        targetReplyId,
        setTargetReplyId,
    ] =
        useState<string | null>(
            null
        );

    const [
        targetParentCommentId,
        setTargetParentCommentId,
    ] =
        useState<string | null>(
            null
        );

    const schoolLevel =
        currentUser
            ?.schoolLevel ||
        "college";

    const currentUserId =
        currentUser?._id ||
        currentUser?.id ||
        null;

    const feedTitle =
        schoolLevel ===
            "highSchool"
            ? "High School Nationwide"
            : "College Nationwide";

    /*
    |--------------------------------------------------------------------------
    | Load Stored User
    |--------------------------------------------------------------------------
    */

    const loadStoredUser =
        useCallback(
            async () => {
                try {
                    const storedUser =
                        await AsyncStorage.getItem(
                            "user"
                        );

                    if (!storedUser) {
                        setCurrentUser(
                            null
                        );

                        return null;
                    }

                    const parsedValue =
                        JSON.parse(
                            storedUser
                        );

                    const parsedUser =
                        parsedValue?.user ||
                        parsedValue?.data
                            ?.user ||
                        parsedValue;

                    setCurrentUser(
                        parsedUser
                    );

                    return parsedUser as StoredUser;
                } catch (error) {
                    console.log(
                        "Dump user load error:",
                        error
                    );

                    setCurrentUser(
                        null
                    );

                    return null;
                }
            },
            []
        );

    /*
    |--------------------------------------------------------------------------
    | Fetch Feed
    |--------------------------------------------------------------------------
    */

    const fetchFeed =
        useCallback(
            async (
                requestedPage = 1,
                append = false,
                user:
                    | StoredUser
                    | null =
                    currentUser,
                selectedTab:
                    FeedTab =
                    feedTab
            ) => {
                const level =
                    user
                        ?.schoolLevel ||
                    "college";

                const response =
                    level ===
                        "highSchool"
                        ? selectedTab ===
                            "Recent"
                            ? await getHighSchoolRecent(
                                requestedPage,
                                PAGE_LIMIT
                            )
                            : await getHighSchoolTrending(
                                requestedPage,
                                PAGE_LIMIT
                            )
                        : selectedTab ===
                            "Recent"
                            ? await getCollegeRecent(
                                requestedPage,
                                PAGE_LIMIT
                            )
                            : await getCollegeTrending(
                                requestedPage,
                                PAGE_LIMIT
                            );

                setDumps(
                    (current) =>
                        append
                            ? [
                                ...current,
                                ...response.dumps.filter(
                                    (
                                        incoming
                                    ) =>
                                        !current.some(
                                            (
                                                existing
                                            ) =>
                                                existing._id ===
                                                incoming._id
                                        )
                                ),
                            ]
                            : response.dumps
                );

                setPage(
                    requestedPage
                );

                const pagination =
                    response.pagination;

                const totalPages =
                    pagination?.pages ??
                    1;

                setHasMore(
                    requestedPage <
                    totalPages
                );

                setErrorMessage(
                    null
                );
            },
            [
                currentUser,
                feedTab,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | Initial Feed
    |--------------------------------------------------------------------------
    */

    const loadInitialFeed =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const user =
                        await loadStoredUser();

                    await fetchFeed(
                        1,
                        false,
                        user,
                        feedTab
                    );
                } catch (
                error: any
                ) {
                    console.log(
                        "Dump feed load error:",
                        error
                    );

                    setErrorMessage(
                        error?.message ||
                        "The Student Dump feed could not be loaded."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                feedTab,
                fetchFeed,
                loadStoredUser,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | Notification Deep Linking
    |--------------------------------------------------------------------------
    */

    const handleNotificationDeepLink =
        useCallback(
            async () => {
                const params =
                    (
                        route.params ||
                        {}
                    ) as DumpScreenRouteParams;

                const resourceType =
                    getStringValue(
                        params.resourceType
                    );

                const directDumpId =
                    getStringValue(
                        params.dumpId
                    );

                const resourceId =
                    getStringValue(
                        params.resourceId
                    );

                const targetDumpId =
                    directDumpId ||
                    (
                        resourceType ===
                            "dump"
                            ? resourceId
                            : null
                    );

                if (!targetDumpId) {
                    return;
                }

                const notificationId =
                    getStringValue(
                        params.notificationId
                    );

                const commentId =
                    getStringValue(
                        params.commentId
                    );

                const replyId =
                    getStringValue(
                        params.replyId
                    );

                const parentCommentId =
                    getStringValue(
                        params.parentCommentId
                    );

                const notificationAction =
                    getStringValue(
                        params.notificationAction
                    );

                const deepLinkKey =
                    notificationId ||
                    [
                        targetDumpId,
                        commentId || "",
                        replyId || "",
                        parentCommentId ||
                        "",
                        notificationAction ||
                        "",
                    ].join(":");

                if (
                    handledDeepLinkRef
                        .current ===
                    deepLinkKey
                ) {
                    return;
                }

                if (
                    activeDeepLinkRef
                        .current ===
                    deepLinkKey
                ) {
                    return;
                }

                activeDeepLinkRef.current =
                    deepLinkKey;

                try {
                    const response =
                        await getDumpById(
                            targetDumpId
                        );

                    const targetDump =
                        response.dump;

                    setDumps(
                        (current) => [
                            targetDump,
                            ...current.filter(
                                (dump) =>
                                    dump._id !==
                                    targetDump._id
                            ),
                        ]
                    );

                    const shouldOpenComments =
                        getBooleanValue(
                            params.openComments
                        ) ||
                        Boolean(
                            commentId ||
                            replyId ||
                            parentCommentId
                        ) ||
                        notificationAction ===
                        "open_comments" ||
                        notificationAction ===
                        "open_comment" ||
                        notificationAction ===
                        "open_reply";

                    if (
                        shouldOpenComments
                    ) {
                        setTargetCommentId(
                            commentId
                        );

                        setTargetReplyId(
                            replyId
                        );

                        setTargetParentCommentId(
                            parentCommentId
                        );

                        setSelectedDump(
                            targetDump
                        );

                        setCommentsVisible(
                            true
                        );
                    } else {
                        setTargetCommentId(
                            null
                        );

                        setTargetReplyId(
                            null
                        );

                        setTargetParentCommentId(
                            null
                        );

                        setTimeout(() => {
                            listRef.current
                                ?.scrollToOffset({
                                    offset: 0,
                                    animated:
                                        true,
                                });
                        }, 150);
                    }

                    handledDeepLinkRef.current =
                        deepLinkKey;

                    navigation.setParams({
                        notificationId:
                            undefined,

                        type:
                            undefined,

                        resourceType:
                            undefined,

                        resourceId:
                            undefined,

                        dumpId:
                            undefined,

                        commentId:
                            undefined,

                        replyId:
                            undefined,

                        parentCommentId:
                            undefined,

                        openComments:
                            undefined,

                        notificationAction:
                            undefined,
                    });
                } catch (
                error: any
                ) {
                    console.log(
                        "Dump notification deep-link error:",
                        error
                    );

                    Alert.alert(
                        "Dump unavailable",
                        error?.message ||
                        "This dump may have been removed or is no longer available."
                    );
                } finally {
                    if (
                        activeDeepLinkRef
                            .current ===
                        deepLinkKey
                    ) {
                        activeDeepLinkRef.current =
                            null;
                    }
                }
            },
            [
                navigation,
                route.params,
            ]
        );

    useEffect(() => {
        void handleNotificationDeepLink();
    }, [
        handleNotificationDeepLink,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Refresh Feed When Focused
    |--------------------------------------------------------------------------
    */

    useFocusEffect(
        useCallback(() => {
            const refreshAfterFocus =
                async () => {
                    try {
                        const user =
                            await loadStoredUser();

                        await fetchFeed(
                            1,
                            false,
                            user,
                            feedTab
                        );
                    } catch (
                    error
                    ) {
                        console.log(
                            "Dump focus refresh error:",
                            error
                        );
                    }
                };

            void refreshAfterFocus();
        }, [
            feedTab,
            fetchFeed,
            loadStoredUser,
        ])
    );

    /*
    |--------------------------------------------------------------------------
    | Initial Mount
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        let mounted =
            true;

        const startFeed =
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const user =
                        await loadStoredUser();

                    if (!mounted) {
                        return;
                    }

                    await fetchFeed(
                        1,
                        false,
                        user,
                        "Recent"
                    );
                } catch (
                error: any
                ) {
                    if (!mounted) {
                        return;
                    }

                    console.log(
                        "Dump feed load error:",
                        error
                    );

                    setErrorMessage(
                        error?.message ||
                        "The Student Dump feed could not be loaded."
                    );
                } finally {
                    if (mounted) {
                        setLoading(
                            false
                        );
                    }
                }
            };

        void startFeed();

        return () => {
            mounted =
                false;
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Refresh
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
        async () => {
            setRefreshing(
                true
            );

            try {
                const user =
                    await loadStoredUser();

                await fetchFeed(
                    1,
                    false,
                    user,
                    feedTab
                );
            } catch (
            error: any
            ) {
                setErrorMessage(
                    error?.message ||
                    "The feed could not be refreshed."
                );
            } finally {
                setRefreshing(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const handleLoadMore =
        async () => {
            if (
                loadingMore ||
                loading ||
                refreshing ||
                !hasMore
            ) {
                return;
            }

            try {
                setLoadingMore(
                    true
                );

                await fetchFeed(
                    page + 1,
                    true,
                    currentUser,
                    feedTab
                );
            } catch (
            error
            ) {
                console.log(
                    "Dump pagination error:",
                    error
                );
            } finally {
                setLoadingMore(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Change Feed Tab
    |--------------------------------------------------------------------------
    */

    const handleChangeTab =
        async (
            nextTab: FeedTab
        ) => {
            if (
                nextTab ===
                feedTab ||
                loading
            ) {
                return;
            }

            try {
                setFeedTab(
                    nextTab
                );

                setLoading(
                    true
                );

                setDumps(
                    []
                );

                setPage(
                    1
                );

                setHasMore(
                    true
                );

                await fetchFeed(
                    1,
                    false,
                    currentUser,
                    nextTab
                );
            } catch (
            error: any
            ) {
                setErrorMessage(
                    error?.message ||
                    "The feed could not be loaded."
                );
            } finally {
                setLoading(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Comments Modal
    |--------------------------------------------------------------------------
    */

    const handleOpenComments =
        (
            dump: Dump
        ) => {
            setTargetCommentId(
                null
            );

            setTargetReplyId(
                null
            );

            setTargetParentCommentId(
                null
            );

            setSelectedDump(
                dump
            );

            setCommentsVisible(
                true
            );
        };

    const handleCloseComments =
        () => {
            setCommentsVisible(
                false
            );

            setTargetCommentId(
                null
            );

            setTargetReplyId(
                null
            );

            setTargetParentCommentId(
                null
            );

            setTimeout(() => {
                setSelectedDump(
                    null
                );
            }, 250);
        };

    const handleCommentAdded =
        (
            dumpId: string
        ) => {
            setDumps(
                (current) =>
                    current.map(
                        (dump) =>
                            dump._id ===
                                dumpId
                                ? {
                                    ...dump,

                                    commentsCount:
                                        (
                                            dump.commentsCount ||
                                            0
                                        ) + 1,
                                }
                                : dump
                    )
            );

            setSelectedDump(
                (current) =>
                    current &&
                        current._id ===
                        dumpId
                        ? {
                            ...current,

                            commentsCount:
                                (
                                    current.commentsCount ||
                                    0
                                ) + 1,
                        }
                        : current
            );
        };

    const handleCommentDeleted =
        (
            dumpId: string
        ) => {
            setDumps(
                (current) =>
                    current.map(
                        (dump) =>
                            dump._id ===
                                dumpId
                                ? {
                                    ...dump,

                                    commentsCount:
                                        Math.max(
                                            0,
                                            (
                                                dump.commentsCount ||
                                                0
                                            ) -
                                            1
                                        ),
                                }
                                : dump
                    )
            );

            setSelectedDump(
                (current) =>
                    current &&
                        current._id ===
                        dumpId
                        ? {
                            ...current,

                            commentsCount:
                                Math.max(
                                    0,
                                    (
                                        current.commentsCount ||
                                        0
                                    ) - 1
                                ),
                        }
                        : current
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Header
    |--------------------------------------------------------------------------
    */

    const renderHeader =
        () => (
            <View>
                <View
                    style={[
                        styles.headerSection,
                        {
                            backgroundColor:
                                theme.surface,

                            borderBottomColor:
                                theme.border,
                        },
                    ]}
                >
                    <View
                        style={
                            styles.headerAccent
                        }
                    />

                    <View
                        style={
                            styles.headerTopRow
                        }
                    >
                        <View
                            style={
                                styles.titleTextWrap
                            }
                        >
                            <Text
                                style={[
                                    styles.screenTitle,
                                    {
                                        color:
                                            theme.text,
                                    },
                                ]}
                            >
                                Student Dump
                            </Text>

                            <Text
                                style={[
                                    styles.screenSubtitle,
                                    {
                                        color:
                                            theme.textSoft,
                                    },
                                ]}
                            >
                                Say it. Dump it. Get it off your chest.
                            </Text>
                        </View>

                        <TouchableOpacity
                            activeOpacity={
                                0.82
                            }
                            onPress={() =>
                                navigate(
                                    "CreateDump"
                                )
                            }
                            style={[
                                styles.createButton,
                                {
                                    backgroundColor:
                                        theme.yellow,
                                },
                            ]}
                        >
                            <Ionicons
                                name="add"
                                size={
                                    17
                                }
                                color={
                                    theme.darkText
                                }
                            />

                            <Text
                                style={[
                                    styles.createButtonText,
                                    {
                                        color:
                                            theme.darkText,
                                    },
                                ]}
                            >
                                Dump
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View
                        style={
                            styles.headerBottomRow
                        }
                    >
                        <View
                            style={[
                                styles.feedIdentity,
                                {
                                    backgroundColor:
                                        theme.cyanSoft,
                                },
                            ]}
                        >
                            <Ionicons
                                name={
                                    schoolLevel ===
                                        "highSchool"
                                        ? "book"
                                        : "school"
                                }
                                size={
                                    14
                                }
                                color={
                                    theme.cyan
                                }
                            />

                            <Text
                                style={[
                                    styles.feedIdentityText,
                                    {
                                        color:
                                            theme.text,
                                    },
                                ]}
                            >
                                {
                                    feedTitle
                                }
                            </Text>
                        </View>

                        <TouchableOpacity
                            activeOpacity={
                                0.78
                            }
                            onPress={() =>
                                navigate(
                                    "MyDumps"
                                )
                            }
                            style={[
                                styles.myDumpsButton,
                                {
                                    borderColor:
                                        theme.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name="person-outline"
                                size={
                                    14
                                }
                                color={
                                    theme.cyan
                                }
                            />

                            <Text
                                style={[
                                    styles.myDumpsText,
                                    {
                                        color:
                                            theme.text,
                                    },
                                ]}
                            >
                                My Dumps
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View
                    style={[
                        styles.feedTabs,
                        {
                            backgroundColor:
                                theme.feed,

                            borderBottomColor:
                                theme.border,
                        },
                    ]}
                >
                    {(
                        [
                            "Recent",
                            "Trending",
                        ] as FeedTab[]
                    ).map(
                        (
                            tab
                        ) => {
                            const active =
                                feedTab ===
                                tab;

                            return (
                                <TouchableOpacity
                                    key={
                                        tab
                                    }
                                    activeOpacity={
                                        0.78
                                    }
                                    onPress={() =>
                                        handleChangeTab(
                                            tab
                                        )
                                    }
                                    style={
                                        styles.feedTabButton
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.feedTabText,
                                            {
                                                color:
                                                    active
                                                        ? theme.cyan
                                                        : theme.muted,
                                            },
                                        ]}
                                    >
                                        {
                                            tab
                                        }
                                    </Text>

                                    <View
                                        style={[
                                            styles.feedTabLine,
                                            {
                                                backgroundColor:
                                                    active
                                                        ? theme.cyan
                                                        : "transparent",
                                            },
                                        ]}
                                    />
                                </TouchableOpacity>
                            );
                        }
                    )}
                </View>
            </View>
        );

    return (
        <SafeAreaView
            edges={[
                "left",
                "right",
            ]}
            style={[
                styles.safeArea,
                {
                    backgroundColor:
                        theme.bg,
                },
            ]}
        >
            <FlatList
                ref={
                    listRef
                }
                data={
                    dumps
                }
                keyExtractor={(
                    item
                ) => item._id}
                renderItem={({
                    item,
                }) => (
                    <DumpCard
                        dump={
                            item
                        }
                        currentUserId={
                            currentUserId
                        }
                        onOpenComments={
                            handleOpenComments
                        }
                    />
                )}
                showsVerticalScrollIndicator={
                    false
                }
                contentContainerStyle={[
                    styles.listContent,

                    dumps.length ===
                    0 &&
                    styles.emptyListContent,
                ]}
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
                        progressBackgroundColor={
                            theme.feed
                        }
                    />
                }
                ListHeaderComponent={<>{renderHeader()}</>}
                onEndReached={
                    handleLoadMore
                }
                onEndReachedThreshold={
                    0.35
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View
                            style={
                                styles.footerLoader
                            }
                        >
                            <ActivityIndicator
                                color={
                                    theme.cyan
                                }
                            />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View
                        style={[
                            styles.emptyContainer,
                            {
                                backgroundColor:
                                    theme.feed,
                            },
                        ]}
                    >
                        {loading ? (
                            <>
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
                                                theme.textSoft,
                                        },
                                    ]}
                                >
                                    Loading dumps...
                                </Text>
                            </>
                        ) : errorMessage ? (
                            <>
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={
                                        32
                                    }
                                    color={
                                        theme.red
                                    }
                                />

                                <Text
                                    style={[
                                        styles.emptyTitle,
                                        {
                                            color:
                                                theme.text,
                                        },
                                    ]}
                                >
                                    Feed unavailable
                                </Text>

                                <Text
                                    style={[
                                        styles.emptyText,
                                        {
                                            color:
                                                theme.textSoft,
                                        },
                                    ]}
                                >
                                    {
                                        errorMessage
                                    }
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={
                                        0.8
                                    }
                                    onPress={
                                        loadInitialFeed
                                    }
                                    style={[
                                        styles.retryButton,
                                        {
                                            backgroundColor:
                                                theme.cyan,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={
                                            styles.retryButtonText
                                        }
                                    >
                                        Try Again
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Ionicons
                                    name="trash-bin-outline"
                                    size={
                                        32
                                    }
                                    color={
                                        theme.cyan
                                    }
                                />

                                <Text
                                    style={[
                                        styles.emptyTitle,
                                        {
                                            color:
                                                theme.text,
                                        },
                                    ]}
                                >
                                    No dumps yet
                                </Text>

                                <Text
                                    style={[
                                        styles.emptyText,
                                        {
                                            color:
                                                theme.textSoft,
                                        },
                                    ]}
                                >
                                    Be the first student to dump something here.
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={
                                        0.82
                                    }
                                    onPress={() =>
                                        navigate(
                                            "CreateDump"
                                        )
                                    }
                                    style={[
                                        styles.emptyCreateButton,
                                        {
                                            backgroundColor:
                                                theme.yellow,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="add"
                                        size={
                                            16
                                        }
                                        color={
                                            theme.darkText
                                        }
                                    />

                                    <Text
                                        style={[
                                            styles.emptyCreateText,
                                            {
                                                color:
                                                    theme.darkText,
                                            },
                                        ]}
                                    >
                                        Create Dump
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                }
            />

            <DumpCommentsModal
                visible={
                    commentsVisible
                }
                dump={
                    selectedDump
                }
                targetCommentId={
                    targetCommentId
                }
                targetReplyId={
                    targetReplyId
                }
                targetParentCommentId={
                    targetParentCommentId
                }
                onClose={
                    handleCloseComments
                }
                onCommentAdded={
                    handleCommentAdded
                }
                onCommentDeleted={
                    handleCommentDeleted
                }
            />
        </SafeAreaView>
    );
}

const styles =
    StyleSheet.create({
        safeArea: {
            flex: 1,
        },

        listContent: {
            paddingBottom:
                Platform.OS ===
                    "android"
                    ? vs(145)
                    : vs(130),
        },

        emptyListContent: {
            flexGrow: 1,
        },

        headerSection: {
            paddingHorizontal:
                s(14),
            paddingTop:
                vs(10),
            paddingBottom:
                vs(10),
            borderBottomWidth:
                1,
            overflow:
                "hidden",
        },

        headerAccent: {
            position:
                "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor:
                "#22D3EE",
        },

        headerTopRow: {
            flexDirection:
                "row",
            alignItems:
                "center",
            justifyContent:
                "space-between",
        },

        titleTextWrap: {
            flex: 1,
            minWidth: 0,
            marginRight:
                s(9),
        },

        screenTitle: {
            fontSize:
                ms(21),
            lineHeight:
                ms(23),
            fontFamily:
                "Rajdhani_700Bold",
            letterSpacing:
                0.2,
        },

        screenSubtitle: {
            marginTop: 1,
            fontSize:
                ms(9),
            lineHeight:
                ms(11),
            fontWeight:
                "700",
        },

        createButton: {
            height:
                vs(34),
            borderRadius:
                13,
            paddingHorizontal:
                s(11),
            flexDirection:
                "row",
            alignItems:
                "center",
            justifyContent:
                "center",
            gap:
                s(3),
        },

        createButtonText: {
            fontSize:
                ms(10),
            fontWeight:
                "900",
        },

        headerBottomRow: {
            marginTop:
                vs(10),
            flexDirection:
                "row",
            alignItems:
                "center",
            justifyContent:
                "space-between",
            gap:
                s(8),
        },

        feedIdentity: {
            flex: 1,
            minHeight:
                vs(31),
            borderRadius:
                11,
            paddingHorizontal:
                s(10),
            flexDirection:
                "row",
            alignItems:
                "center",
            gap:
                s(6),
        },

        feedIdentityText: {
            flexShrink: 1,
            fontSize:
                ms(10),
            fontFamily:
                "Rajdhani_700Bold",
        },

        myDumpsButton: {
            minHeight:
                vs(31),
            borderRadius:
                11,
            borderWidth:
                1,
            paddingHorizontal:
                s(9),
            flexDirection:
                "row",
            alignItems:
                "center",
            justifyContent:
                "center",
            gap:
                s(5),
        },

        myDumpsText: {
            fontSize:
                ms(9.5),
            fontFamily:
                "Rajdhani_700Bold",
        },

        feedTabs: {
            flexDirection:
                "row",
            borderBottomWidth:
                1,
        },

        feedTabButton: {
            flex: 1,
            alignItems:
                "center",
            paddingTop:
                vs(8),
        },

        feedTabText: {
            fontSize:
                ms(11.5),
            fontFamily:
                "Rajdhani_700Bold",
        },

        feedTabLine: {
            width:
                "48%",
            height:
                2.5,
            borderRadius:
                999,
            marginTop:
                vs(6),
        },

        emptyContainer: {
            flex: 1,
            minHeight:
                vs(250),
            alignItems:
                "center",
            justifyContent:
                "center",
            paddingHorizontal:
                s(24),
            paddingVertical:
                vs(40),
        },

        loadingText: {
            marginTop:
                vs(10),
            fontSize:
                ms(10.5),
            fontWeight:
                "700",
        },

        emptyTitle: {
            marginTop:
                vs(8),
            fontSize:
                ms(16),
            fontFamily:
                "Rajdhani_700Bold",
        },

        emptyText: {
            marginTop:
                vs(4),
            fontSize:
                ms(10.5),
            lineHeight:
                ms(14),
            textAlign:
                "center",
        },

        emptyCreateButton: {
            marginTop:
                vs(14),
            minHeight:
                vs(35),
            borderRadius:
                13,
            paddingHorizontal:
                s(13),
            flexDirection:
                "row",
            alignItems:
                "center",
            justifyContent:
                "center",
            gap:
                s(4),
        },

        emptyCreateText: {
            fontSize:
                ms(10),
            fontWeight:
                "900",
        },

        retryButton: {
            marginTop:
                vs(14),
            minHeight:
                vs(35),
            borderRadius:
                13,
            paddingHorizontal:
                s(18),
            alignItems:
                "center",
            justifyContent:
                "center",
        },

        retryButtonText: {
            color:
                "#07111F",
            fontSize:
                ms(10),
            fontWeight:
                "900",
        },

        footerLoader: {
            paddingVertical:
                vs(18),
            alignItems:
                "center",
        },
    });