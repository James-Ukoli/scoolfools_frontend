import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Alert,
    Animated,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    SafeAreaView,
} from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import {
    s,
    vs,
    ms,
} from "react-native-size-matters";

import {
    Comment,
    createComment,
    deleteComment,
    Dump,
    getComments,
    toggleCommentReaction,
    UserPreview,
} from "../api/studentDumpApi";

import {
    PROFILE_AVATAR_IMAGES,
} from "../../assets/data/profileAvatars";

import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

const professorFoolsAvatar = require(
    "../../assets/images/profileimages/professorFools.png"
);

/*
|--------------------------------------------------------------------------
| Avatar Helpers
|--------------------------------------------------------------------------
*/

type ProfileAvatarId =
    keyof typeof PROFILE_AVATAR_IMAGES;

const getProfileAvatarSource = (
    avatarId?: string | null
) => {
    if (
        avatarId &&
        avatarId in PROFILE_AVATAR_IMAGES
    ) {
        return PROFILE_AVATAR_IMAGES[
            avatarId as ProfileAvatarId
        ];
    }

    return PROFILE_AVATAR_IMAGES.basicBlue;
};

const getLocalAvatarId = (
    user?: UserPreview | null
): string | null => {
    if (
        user?.selectedAvatar &&
        user.selectedAvatar in
        PROFILE_AVATAR_IMAGES
    ) {
        return user.selectedAvatar;
    }

    if (
        user?.avatar &&
        !user.avatar.startsWith("http") &&
        user.avatar in
        PROFILE_AVATAR_IMAGES
    ) {
        return user.avatar;
    }

    return null;
};

const getRemoteAvatarUrl = (
    user?: UserPreview | null,
    localAvatarId?: string | null
): string | null => {
    if (localAvatarId) {
        return null;
    }

    if (
        user?.providerAvatar &&
        user.providerAvatar.startsWith("http")
    ) {
        return user.providerAvatar;
    }

    if (
        user?.avatar &&
        user.avatar.startsWith("http")
    ) {
        return user.avatar;
    }

    return null;
};

/*
|--------------------------------------------------------------------------
| Student Athlete Helpers
|--------------------------------------------------------------------------
*/

const getSportEmoji = (
    sport?: string | null
) => {
    switch (
    sport
        ?.trim()
        .toLowerCase()
    ) {
        case "football":
            return "🏈";

        case "basketball":
            return "🏀";

        case "baseball":
            return "⚾";

        case "softball":
            return "🥎";

        case "soccer":
            return "⚽";

        case "volleyball":
            return "🏐";

        case "tennis":
            return "🎾";

        case "track":
        case "track and field":
        case "track & field":
        case "cross country":
            return "🏃";

        case "swimming":
        case "swim":
            return "🏊";

        case "golf":
            return "⛳";

        case "wrestling":
            return "🤼";

        case "lacrosse":
            return "🥍";

        case "cheer":
        case "cheerleading":
            return "📣";

        case "chess":
            return "♟️";

        default:
            return "🏅";
    }
};

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type DumpCommentsModalProps = {
    visible: boolean;
    dump: Dump | null;
    onClose: () => void;

    targetCommentId?: string | null;
    targetReplyId?: string | null;
    targetParentCommentId?: string | null;

    onCommentAdded: (
        dumpId: string
    ) => void;

    onCommentDeleted?: (
        dumpId: string
    ) => void;
};

type StoredUser =
    UserPreview & {
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

type FlatCommentItem =
    Comment & {
        isReply: boolean;
    };

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
*/

const getCommentsTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            bg: "#FFFFFF",
            surface: "#F8FAFC",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border:
                "rgba(7,17,31,0.09)",
            input: "#F1F5F9",
            cyan: "#06B6D4",
            highlight:
                "rgba(6,182,212,0.16)",
            blueCheck: "#1D9BF0",
            freshman: "#16A34A",
            sophomore: "#DC2626",
            junior: "#EA580C",
            senior: "#2563EB",
            danger: "#DC2626",
            backdrop:
                "rgba(2,6,23,0.45)",
        };
    }

    return {
        bg: "#090D14",
        surface: "#111827",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border:
            "rgba(255,255,255,0.09)",
        input: "#111827",
        cyan: "#22D3EE",
        highlight:
            "rgba(34,211,238,0.18)",
        blueCheck: "#1D9BF0",
        freshman: "#4ADE80",
        sophomore: "#F87171",
        junior: "#FB923C",
        senior: "#60A5FA",
        danger: "#F87171",
        backdrop:
            "rgba(0,0,0,0.72)",
    };
};

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const getAuthor = (
    author: Comment["author"]
): UserPreview | null => {
    if (
        !author ||
        typeof author === "string"
    ) {
        return null;
    }

    return author;
};

const getAuthorId = (
    author: Comment["author"]
): string | null => {
    if (!author) {
        return null;
    }

    if (
        typeof author === "string"
    ) {
        return String(author);
    }

    if (author._id) {
        return String(author._id);
    }

    return null;
};

const getTimeAgo = (
    dateValue?: string | null
) => {
    if (!dateValue) {
        return "";
    }

    const created =
        new Date(
            dateValue
        ).getTime();

    const difference =
        Date.now() - created;

    if (
        Number.isNaN(created) ||
        difference < 0
    ) {
        return "";
    }

    const minutes =
        Math.floor(
            difference /
            (1000 * 60)
        );

    if (minutes < 1) {
        return "now";
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours}h`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 7) {
        return `${days}d`;
    }

    const weeks =
        Math.floor(
            days / 7
        );

    return `${weeks}w`;
};

/*
|--------------------------------------------------------------------------
| Student Context and Social Helpers
|--------------------------------------------------------------------------
*/

const getClassificationColor = (
    classification: string | null | undefined,
    theme: ReturnType<typeof getCommentsTheme>
) => {
    switch (
    classification
        ?.trim()
        .toLowerCase()
    ) {
        case "freshman":
            return theme.freshman;

        case "sophomore":
            return theme.sophomore;

        case "junior":
            return theme.junior;

        case "senior":
            return theme.senior;

        default:
            return theme.muted;
    }
};

const getClassificationLabel = (
    classification?: string | null
) => {
    if (!classification) {
        return "High School Student";
    }

    const normalized =
        classification
            .trim()
            .toLowerCase();

    return (
        normalized
            .charAt(0)
            .toUpperCase() +
        normalized.slice(1)
    );
};

const getSocialIcon = (
    platform?: string | null
):
    | "instagram"
    | "x-twitter"
    | "youtube"
    | "snapchat" => {
    if (platform === "x") {
        return "x-twitter";
    }

    if (
        platform === "instagram" ||
        platform === "youtube" ||
        platform === "snapchat"
    ) {
        return platform;
    }

    return "instagram";
};

const getSocialIconColor = (
    platform: string | null | undefined,
    isNight: boolean
) => {
    switch (platform) {
        case "instagram":
            return "#E4405F";

        case "youtube":
            return "#FF0000";

        case "snapchat":
            return "#F2DE00";

        case "x":
            return isNight
                ? "#FFFFFF"
                : "#000000";

        default:
            return "#64748B";
    }
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function DumpCommentsModal({
    visible,
    dump,
    onClose,
    targetCommentId = null,
    targetReplyId = null,
    targetParentCommentId = null,
    onCommentAdded,
    onCommentDeleted,
}: DumpCommentsModalProps) {
    const { mode } =
        useTimeTheme();

    const theme =
        getCommentsTheme(
            mode
        );

    const commentsListRef =
        useRef<
            FlatList<FlatCommentItem> | null
        >(null);


    const commentInputRef =
        useRef<TextInput | null>(
            null
        );

    const handledTargetRef =
        useRef<string | null>(
            null
        );

    const highlightTimerRef =
        useRef<
            ReturnType<
                typeof setTimeout
            > | null
        >(null);

    const [
        comments,
        setComments,
    ] =
        useState<Comment[]>(
            []
        );

    const [
        currentUser,
        setCurrentUser,
    ] =
        useState<StoredUser | null>(
            null
        );

    const [
        localCommentCount,
        setLocalCommentCount,
    ] =
        useState(0);

    const [
        commentText,
        setCommentText,
    ] =
        useState("");

    const [
        replyingTo,
        setReplyingTo,
    ] =
        useState<Comment | null>(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(false);

    const [
        refreshing,
        setRefreshing,
    ] =
        useState(false);

    const [
        posting,
        setPosting,
    ] =
        useState(false);

    const [
        reactingCommentId,
        setReactingCommentId,
    ] =
        useState<string | null>(
            null
        );

    const [
        deletingCommentId,
        setDeletingCommentId,
    ] =
        useState<string | null>(
            null
        );

    const [
        highlightedCommentId,
        setHighlightedCommentId,
    ] =
        useState<string | null>(
            null
        );

    /*
    |--------------------------------------------------------------------------
    | Android Keyboard Layout Reset
    |--------------------------------------------------------------------------
    |
    | Android's KeyboardAvoidingView can occasionally retain a slightly
    | shortened layout after the keyboard closes. We only remount the layout
    | after keyboardDidHide, preserving the working "height" behavior while
    | typing and restoring the sheet to its original position afterward.
    */

    const [
        androidKeyboardResetKey,
        setAndroidKeyboardResetKey,
    ] =
        useState(0);

    type ModerationStatus =
        | "idle"
        | "scanning"
        | "approved";

    const [
        moderationStatus,
        setModerationStatus,
    ] =
        useState<ModerationStatus>(
            "idle"
        );

    const moderationDotOne =
        useRef(
            new Animated.Value(0.35)
        ).current;

    const moderationDotTwo =
        useRef(
            new Animated.Value(0.35)
        ).current;

    const moderationDotThree =
        useRef(
            new Animated.Value(0.35)
        ).current;

    const moderationResetTimerRef =
        useRef<
            ReturnType<
                typeof setTimeout
            > | null
        >(null);

    const currentUserId =
        currentUser?._id ||
        currentUser?.id ||
        null;

    /*
    |--------------------------------------------------------------------------
    | Load Logged-In User
    |--------------------------------------------------------------------------
    */

    const loadCurrentUser =
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

                        return;
                    }

                    const parsedValue =
                        JSON.parse(
                            storedUser
                        );

                    const parsedUser =
                        parsedValue?.user ||
                        parsedValue?.data?.user ||
                        parsedValue;

                    setCurrentUser(
                        parsedUser
                    );
                } catch (error) {
                    console.log(
                        "Comment current user error:",
                        error
                    );

                    setCurrentUser(
                        null
                    );
                }
            },
            []
        );

    /*
    |--------------------------------------------------------------------------
    | Load Comments
    |--------------------------------------------------------------------------
    */

    const loadComments =
        useCallback(
            async (
                showLoading = true
            ) => {
                if (!dump?._id) {
                    setComments(
                        []
                    );

                    return;
                }

                try {
                    if (
                        showLoading
                    ) {
                        setLoading(
                            true
                        );
                    }

                    const response =
                        await getComments(
                            dump._id,
                            1,
                            50
                        );

                    setComments(
                        response.comments ||
                        []
                    );
                } catch (
                error: any
                ) {
                    Alert.alert(
                        "Comments Failed",
                        error?.message ||
                        "Comments could not be loaded."
                    );
                } finally {
                    if (
                        showLoading
                    ) {
                        setLoading(
                            false
                        );
                    }
                }
            },
            [dump?._id]
        );

    /*
    |--------------------------------------------------------------------------
    | Open Modal
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!visible) {
            return;
        }

        setCommentText("");
        setReplyingTo(
            null
        );

        setDeletingCommentId(
            null
        );

        setHighlightedCommentId(
            null
        );

        handledTargetRef.current =
            null;

        setLocalCommentCount(
            Math.max(
                0,
                Number(
                    dump?.commentsCount ||
                    0
                )
            )
        );

        void loadCurrentUser();
        void loadComments();
    }, [
        dump?._id,
        dump?.commentsCount,
        loadComments,
        loadCurrentUser,
        visible,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Flatten Comments and Replies
    |--------------------------------------------------------------------------
    */

    const flattenedComments =
        useMemo<
            FlatCommentItem[]
        >(() => {
            const result:
                FlatCommentItem[] =
                [];

            comments.forEach(
                (comment) => {
                    result.push({
                        ...comment,
                        isReply:
                            false,
                    });

                    (
                        comment.replies ||
                        []
                    ).forEach(
                        (reply) => {
                            result.push({
                                ...reply,
                                isReply:
                                    true,
                            });
                        }
                    );
                }
            );

            return result;
        }, [comments]);

    /*
    |--------------------------------------------------------------------------
    | Notification Target
    |--------------------------------------------------------------------------
    */

    const targetInteractionId =
        useMemo(() => {
            return (
                targetReplyId ||
                targetCommentId ||
                targetParentCommentId ||
                null
            );
        }, [
            targetCommentId,
            targetParentCommentId,
            targetReplyId,
        ]);

    const scrollToTarget =
        useCallback(
            (
                animated = true
            ) => {
                if (
                    !targetInteractionId ||
                    flattenedComments.length ===
                    0
                ) {
                    return false;
                }

                const targetIndex =
                    flattenedComments.findIndex(
                        (comment) =>
                            String(
                                comment._id
                            ) ===
                            String(
                                targetInteractionId
                            )
                    );

                if (targetIndex < 0) {
                    return false;
                }

                setHighlightedCommentId(
                    String(
                        targetInteractionId
                    )
                );

                setTimeout(() => {
                    commentsListRef.current
                        ?.scrollToIndex({
                            index:
                                targetIndex,
                            animated,
                            viewPosition:
                                0.35,
                        });
                }, 250);

                if (
                    highlightTimerRef.current
                ) {
                    clearTimeout(
                        highlightTimerRef.current
                    );
                }

                highlightTimerRef.current =
                    setTimeout(() => {
                        setHighlightedCommentId(
                            null
                        );
                    }, 3500);

                return true;
            },
            [
                flattenedComments,
                targetInteractionId,
            ]
        );

    useEffect(() => {
        if (
            !visible ||
            loading ||
            !targetInteractionId
        ) {
            return;
        }

        const targetKey = [
            dump?._id || "",
            targetInteractionId,
        ].join(":");

        if (
            handledTargetRef.current ===
            targetKey
        ) {
            return;
        }

        const didFindTarget =
            scrollToTarget();

        if (didFindTarget) {
            handledTargetRef.current =
                targetKey;
        }
    }, [
        dump?._id,
        loading,
        scrollToTarget,
        targetInteractionId,
        visible,
    ]);

    useEffect(() => {
        return () => {
            if (
                highlightTimerRef.current
            ) {
                clearTimeout(
                    highlightTimerRef.current
                );
            }
        };
    }, []);

    useEffect(() => {
        if (
            Platform.OS !==
            "android"
        ) {
            return;
        }

        const hideSubscription =
            Keyboard.addListener(
                "keyboardDidHide",
                () => {
                    requestAnimationFrame(
                        () => {
                            setAndroidKeyboardResetKey(
                                (current) =>
                                    current + 1
                            );
                        }
                    );
                }
            );

        return () => {
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        if (
            moderationStatus !==
            "scanning"
        ) {
            moderationDotOne.stopAnimation();
            moderationDotTwo.stopAnimation();
            moderationDotThree.stopAnimation();

            moderationDotOne.setValue(
                0.35
            );
            moderationDotTwo.setValue(
                0.35
            );
            moderationDotThree.setValue(
                0.35
            );

            return;
        }

        const createDotAnimation = (
            value: Animated.Value,
            delay: number
        ) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(
                        delay
                    ),
                    Animated.timing(
                        value,
                        {
                            toValue: 1,
                            duration: 220,
                            useNativeDriver: true,
                        }
                    ),
                    Animated.timing(
                        value,
                        {
                            toValue: 0.35,
                            duration: 220,
                            useNativeDriver: true,
                        }
                    ),
                    Animated.delay(
                        Math.max(
                            0,
                            660 - delay
                        )
                    ),
                ])
            );

        const dotOneAnimation =
            createDotAnimation(
                moderationDotOne,
                0
            );

        const dotTwoAnimation =
            createDotAnimation(
                moderationDotTwo,
                140
            );

        const dotThreeAnimation =
            createDotAnimation(
                moderationDotThree,
                280
            );

        dotOneAnimation.start();
        dotTwoAnimation.start();
        dotThreeAnimation.start();

        return () => {
            dotOneAnimation.stop();
            dotTwoAnimation.stop();
            dotThreeAnimation.stop();
        };
    }, [
        moderationDotOne,
        moderationDotThree,
        moderationDotTwo,
        moderationStatus,
    ]);

    useEffect(() => {
        return () => {
            if (
                moderationResetTimerRef.current
            ) {
                clearTimeout(
                    moderationResetTimerRef.current
                );
            }
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Current User Avatar
    |--------------------------------------------------------------------------
    */

    const currentLocalAvatarId =
        getLocalAvatarId(
            currentUser
        );

    const currentRemoteAvatarUrl =
        getRemoteAvatarUrl(
            currentUser,
            currentLocalAvatarId
        );

    const currentAvatarSource =
        getProfileAvatarSource(
            currentLocalAvatarId ??
            "basicBlue"
        );

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
                await loadComments(
                    false
                );
            } finally {
                setRefreshing(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Reply
    |--------------------------------------------------------------------------
    */

    const handleReplyPress = (
        comment: Comment
    ) => {
        const author =
            getAuthor(
                comment.author
            );

        setReplyingTo(
            comment
        );

        if (
            author?.username
        ) {
            setCommentText(
                `@${author.username} `
            );
        } else {
            setCommentText(
                ""
            );
        }

        requestAnimationFrame(
            () => {
                commentInputRef.current
                    ?.focus();
            }
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Create Comment or Reply
    |--------------------------------------------------------------------------
    */

    const handlePostComment =
        async () => {
            const trimmed =
                commentText.trim();

            if (
                !trimmed ||
                !dump?._id ||
                posting
            ) {
                return;
            }

            try {
                if (
                    moderationResetTimerRef.current
                ) {
                    clearTimeout(
                        moderationResetTimerRef.current
                    );

                    moderationResetTimerRef.current =
                        null;
                }

                setPosting(
                    true
                );

                setModerationStatus(
                    "scanning"
                );

                await createComment(
                    dump._id,
                    {
                        content:
                            trimmed,

                        parentComment:
                            replyingTo?._id ||
                            null,
                    }
                );

                setCommentText(
                    ""
                );

                setReplyingTo(
                    null
                );

                setLocalCommentCount(
                    (current) =>
                        current + 1
                );

                onCommentAdded(
                    dump._id
                );

                await loadComments(
                    false
                );

                setModerationStatus(
                    "approved"
                );

                moderationResetTimerRef.current =
                    setTimeout(() => {
                        setModerationStatus(
                            "idle"
                        );

                        moderationResetTimerRef.current =
                            null;
                    }, 1700);
            } catch (
            error: any
            ) {
                setModerationStatus(
                    "idle"
                );
                Alert.alert(
                    "Comment Blocked",
                    error?.message ||
                    "Your comment could not be posted."
                );
            } finally {
                setPosting(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Heart Comment
    |--------------------------------------------------------------------------
    */

    const handleHeartComment =
        async (
            comment: Comment
        ) => {
            if (
                reactingCommentId ||
                deletingCommentId
            ) {
                return;
            }

            try {
                setReactingCommentId(
                    comment._id
                );

                await toggleCommentReaction(
                    comment._id,
                    "heart"
                );

                await loadComments(
                    false
                );
            } catch (
            error: any
            ) {
                Alert.alert(
                    "Reaction Failed",
                    error?.message ||
                    "Your reaction could not be updated."
                );
            } finally {
                setReactingCommentId(
                    null
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Remove Deleted Comment
    |--------------------------------------------------------------------------
    */

    const removeCommentFromState =
        useCallback(
            (
                commentId: string
            ) => {
                setComments(
                    (
                        currentComments
                    ) =>
                        currentComments
                            .filter(
                                (
                                    comment
                                ) =>
                                    String(
                                        comment._id
                                    ) !==
                                    String(
                                        commentId
                                    )
                            )
                            .map(
                                (
                                    comment
                                ) => ({
                                    ...comment,

                                    replies:
                                        (
                                            comment.replies ||
                                            []
                                        ).filter(
                                            (
                                                reply
                                            ) =>
                                                String(
                                                    reply._id
                                                ) !==
                                                String(
                                                    commentId
                                                )
                                        ),
                                })
                            )
                );
            },
            []
        );

    /*
    |--------------------------------------------------------------------------
    | Delete Comment
    |--------------------------------------------------------------------------
    */

    const performDeleteComment =
        useCallback(
            async (
                comment: Comment
            ) => {
                if (
                    deletingCommentId
                ) {
                    return;
                }

                const commentId =
                    String(
                        comment._id
                    );

                try {
                    setDeletingCommentId(
                        commentId
                    );

                    await deleteComment(
                        commentId
                    );

                    removeCommentFromState(
                        commentId
                    );

                    setLocalCommentCount(
                        (current) =>
                            Math.max(
                                0,
                                current - 1
                            )
                    );

                    if (
                        replyingTo?._id &&
                        String(
                            replyingTo._id
                        ) ===
                        commentId
                    ) {
                        setReplyingTo(
                            null
                        );

                        setCommentText(
                            ""
                        );
                    }

                    if (dump?._id) {
                        onCommentDeleted?.(
                            dump._id
                        );
                    }
                } catch (
                error: any
                ) {
                    console.error(
                        "DELETE COMMENT ERROR:",
                        error
                    );

                    Alert.alert(
                        "Unable to Delete",
                        error?.message ||
                        "Your comment could not be deleted."
                    );
                } finally {
                    setDeletingCommentId(
                        null
                    );
                }
            },
            [
                deletingCommentId,
                dump?._id,
                onCommentDeleted,
                removeCommentFromState,
                replyingTo?._id,
            ]
        );

    const handleDeleteComment =
        useCallback(
            (
                comment: Comment
            ) => {
                if (
                    deletingCommentId
                ) {
                    return;
                }

                Alert.alert(
                    "Delete Comment?",
                    "This comment will be permanently removed.",
                    [
                        {
                            text: "Cancel",
                            style: "cancel",
                        },
                        {
                            text: "Delete",
                            style:
                                "destructive",

                            onPress: () =>
                                performDeleteComment(
                                    comment
                                ),
                        },
                    ]
                );
            },
            [
                deletingCommentId,
                performDeleteComment,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | Render Comment
    |--------------------------------------------------------------------------
    */

    const renderComment = ({
        item,
    }: {
        item: FlatCommentItem;
    }) => {
        const author =
            getAuthor(
                item.author
            );

        const authorId =
            getAuthorId(
                item.author
            );

        const localAvatarId =
            getLocalAvatarId(
                author
            );

        const remoteAvatarUrl =
            getRemoteAvatarUrl(
                author,
                localAvatarId
            );

        const avatarSource =
            getProfileAvatarSource(
                localAvatarId ??
                "basicBlue"
            );

        const athleteEmoji =
            author
                ?.isStudentAthlete
                ? getSportEmoji(
                    author?.sport
                )
                : null;

        const isCollegeAuthor =
            author?.schoolLevel ===
            "college";

        const isHighSchoolAuthor =
            author?.schoolLevel ===
            "highSchool";

        const studentContext =
            isCollegeAuthor
                ? author?.collegeName ||
                "College Student"
                : isHighSchoolAuthor
                    ? getClassificationLabel(
                        author?.highSchoolClassification
                    )
                    : null;

        const studentContextColor =
            isHighSchoolAuthor
                ? getClassificationColor(
                    author?.highSchoolClassification,
                    theme
                )
                : theme.muted;

        const showSocialMedia =
            Boolean(
                author?.isSubscribed &&
                author?.socialMediaPlatform &&
                author?.socialMediaUrl
            );

        const heartCount =
            item.reactions
                ?.heart?.length ||
            0;

        const hasHearted =
            Boolean(
                currentUserId &&
                item.reactions
                    ?.heart?.some(
                        (
                            userId
                        ) =>
                            String(
                                userId
                            ) ===
                            String(
                                currentUserId
                            )
                    )
            );

        const isOwner =
            Boolean(
                currentUserId &&
                authorId &&
                String(
                    currentUserId
                ) ===
                String(
                    authorId
                )
            );

        const isDeleting =
            deletingCommentId ===
            String(item._id);

        const isHighlighted =
            highlightedCommentId ===
            String(item._id);

        const handleOpenCommentSocial =
            async () => {
                const socialUrl =
                    author?.socialMediaUrl;

                if (!socialUrl) {
                    return;
                }

                try {
                    const supported =
                        await Linking.canOpenURL(
                            socialUrl
                        );

                    if (!supported) {
                        Alert.alert(
                            "Unable to Open Link",
                            "This social media link could not be opened."
                        );

                        return;
                    }

                    await Linking.openURL(
                        socialUrl
                    );
                } catch (error) {
                    console.log(
                        "Open comment social link error:",
                        error
                    );

                    Alert.alert(
                        "Unable to Open Link",
                        "Something went wrong while opening this profile."
                    );
                }
            };

        return (
            <View
                style={[
                    styles.commentContainer,
                    {
                        borderBottomColor:
                            theme.border,

                        backgroundColor:
                            isHighlighted
                                ? theme.highlight
                                : "transparent",

                        marginLeft:
                            item.isReply
                                ? s(35)
                                : 0,

                        opacity:
                            isDeleting
                                ? 0.45
                                : 1,
                    },
                ]}
            >
                <Image
                    source={
                        remoteAvatarUrl
                            ? {
                                uri: remoteAvatarUrl,
                            }
                            : avatarSource
                    }
                    style={[
                        styles.commentAvatar,

                        item.isReply &&
                        styles.replyAvatar,
                    ]}
                    resizeMode="cover"
                />

                <View
                    style={
                        styles.commentBody
                    }
                >
                    <View
                        style={
                            styles.commentTopRow
                        }
                    >
                        <View
                            style={
                                styles.commentIdentityBlock
                            }
                        >
                            <View
                                style={
                                    styles.commentUsernameRow
                                }
                            >
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.commentUsername,
                                        {
                                            color:
                                                theme.text,
                                        },
                                    ]}
                                >
                                    @
                                    {author
                                        ?.username ||
                                        author
                                            ?.display_name ||
                                        "student"}
                                </Text>

                                {author?.isSubscribed && (
                                    <Text
                                        accessibilityLabel="Subscriber"
                                        style={
                                            styles.subscriberDiamond
                                        }
                                    >
                                        💎
                                    </Text>
                                )}

                                {athleteEmoji && (
                                    <Text
                                        style={
                                            styles.athleteEmoji
                                        }
                                    >
                                        {athleteEmoji}
                                    </Text>
                                )}
                            </View>

                            {(studentContext ||
                                showSocialMedia) && (
                                    <View
                                        style={
                                            styles.commentContextRow
                                        }
                                    >
                                        {studentContext && (
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.commentStudentContext,
                                                    {
                                                        color:
                                                            studentContextColor,
                                                    },
                                                ]}
                                            >
                                                {studentContext}
                                            </Text>
                                        )}

                                        {showSocialMedia && (
                                            <TouchableOpacity
                                                activeOpacity={0.68}
                                                onPress={
                                                    handleOpenCommentSocial
                                                }
                                                style={
                                                    styles.commentSocialButton
                                                }
                                            >
                                                <FontAwesome6
                                                    name={getSocialIcon(
                                                        author?.socialMediaPlatform
                                                    )}
                                                    size={11}
                                                    color={getSocialIconColor(
                                                        author?.socialMediaPlatform,
                                                        mode ===
                                                        "night"
                                                    )}
                                                />

                                                <Ionicons
                                                    name="open-outline"
                                                    size={10}
                                                    color={
                                                        theme.muted
                                                    }
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                        </View>

                        <View
                            style={
                                styles.commentTopRight
                            }
                        >
                            <Text
                                style={[
                                    styles.commentTime,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                {getTimeAgo(
                                    item.created_at
                                )}
                            </Text>

                            {isOwner && (
                                <TouchableOpacity
                                    activeOpacity={
                                        0.65
                                    }
                                    disabled={
                                        Boolean(
                                            deletingCommentId
                                        )
                                    }
                                    onPress={() =>
                                        handleDeleteComment(
                                            item
                                        )
                                    }
                                    hitSlop={
                                        8
                                    }
                                    style={
                                        styles.deleteCommentButton
                                    }
                                >
                                    <Ionicons
                                        name={
                                            isDeleting
                                                ? "hourglass-outline"
                                                : "trash-outline"
                                        }
                                        size={
                                            15
                                        }
                                        color={
                                            theme.danger
                                        }
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <Text
                        style={[
                            styles.commentContent,
                            {
                                color:
                                    theme.text,
                            },
                        ]}
                    >
                        {item.content}
                    </Text>

                    <View
                        style={
                            styles.commentActions
                        }
                    >
                        <Pressable
                            disabled={
                                reactingCommentId ===
                                item._id ||
                                Boolean(
                                    deletingCommentId
                                )
                            }
                            onPress={() =>
                                handleHeartComment(
                                    item
                                )
                            }
                            style={
                                styles.commentAction
                            }
                        >
                            <Ionicons
                                name={
                                    hasHearted
                                        ? "heart"
                                        : "heart-outline"
                                }
                                size={
                                    16
                                }
                                color={
                                    hasHearted
                                        ? "#EF4444"
                                        : theme.muted
                                }
                            />

                            <Text
                                style={[
                                    styles.commentActionText,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                {
                                    heartCount
                                }
                            </Text>
                        </Pressable>

                        {!item.isReply && (
                            <Pressable
                                disabled={
                                    Boolean(
                                        deletingCommentId
                                    )
                                }
                                onPress={() =>
                                    handleReplyPress(
                                        item
                                    )
                                }
                                style={
                                    styles.commentAction
                                }
                            >
                                <Ionicons
                                    name="return-down-forward-outline"
                                    size={
                                        14
                                    }
                                    color={
                                        theme.muted
                                    }
                                />

                                <Text
                                    style={[
                                        styles.commentActionText,
                                        {
                                            color:
                                                theme.muted,
                                        },
                                    ]}
                                >
                                    Reply
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={
                onClose
            }
        >
            <KeyboardAvoidingView
                key={
                    Platform.OS === "android"
                        ? `android-keyboard-${androidKeyboardResetKey}`
                        : "ios-keyboard"
                }
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : "height"
                }
                keyboardVerticalOffset={
                    0
                }
                style={[
                    styles.modalBackdrop,
                    {
                        backgroundColor:
                            theme.backdrop,
                    },
                ]}
            >
                <Pressable
                    style={
                        StyleSheet.absoluteFillObject
                    }
                    onPress={
                        onClose
                    }
                />

                <SafeAreaView
                    edges={[
                        "left",
                        "right",
                        "bottom",
                    ]}
                    style={[
                        styles.sheet,
                        {
                            backgroundColor:
                                theme.bg,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.sheetHandle,
                            {
                                backgroundColor:
                                    theme.border,
                            },
                        ]}
                    />

                    <View
                        style={[
                            styles.modalHeader,
                            {
                                borderBottomColor:
                                    theme.border,
                            },
                        ]}
                    >
                        <View>
                            <Text
                                style={[
                                    styles.modalTitle,
                                    {
                                        color:
                                            theme.text,
                                    },
                                ]}
                            >
                                Comments
                            </Text>

                            <Text
                                style={[
                                    styles.modalSubtitle,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                {
                                    localCommentCount
                                }{" "}
                                total
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={
                                onClose
                            }
                            activeOpacity={
                                0.75
                            }
                            style={[
                                styles.closeButton,
                                {
                                    backgroundColor:
                                        theme.surface,
                                },
                            ]}
                        >
                            <Ionicons
                                name="close"
                                size={
                                    20
                                }
                                color={
                                    theme.text
                                }
                            />
                        </TouchableOpacity>
                    </View>

                    {dump && (
                        <View
                            style={[
                                styles.originalDumpPreview,
                                {
                                    backgroundColor:
                                        theme.surface,

                                    borderBottomColor:
                                        theme.border,
                                },
                            ]}
                        >
                            <Text
                                numberOfLines={
                                    2
                                }
                                style={[
                                    styles.originalDumpText,
                                    {
                                        color:
                                            theme.textSoft,
                                    },
                                ]}
                            >
                                {
                                    dump.content
                                }
                            </Text>
                        </View>
                    )}

                    <FlatList
                        ref={
                            commentsListRef
                        }
                        data={
                            flattenedComments
                        }
                        keyExtractor={(
                            item
                        ) =>
                            String(
                                item._id
                            )
                        }
                        renderItem={
                            renderComment
                        }
                        refreshing={
                            loading
                        }
                        showsVerticalScrollIndicator={
                            false
                        }
                        keyboardShouldPersistTaps="handled"
                        onScrollToIndexFailed={(
                            info
                        ) => {
                            const approximateOffset =
                                info.averageItemLength *
                                info.index;

                            commentsListRef.current
                                ?.scrollToOffset({
                                    offset:
                                        approximateOffset,
                                    animated:
                                        false,
                                });

                            setTimeout(() => {
                                commentsListRef.current
                                    ?.scrollToIndex({
                                        index:
                                            info.index,
                                        animated:
                                            true,
                                        viewPosition:
                                            0.35,
                                    });
                            }, 300);
                        }}
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
                                    theme.surface
                                }
                            />
                        }
                        contentContainerStyle={
                            styles.commentsList
                        }
                        ListEmptyComponent={
                            !loading ? (
                                <View
                                    style={
                                        styles.emptyComments
                                    }
                                >
                                    <Ionicons
                                        name="chatbubbles-outline"
                                        size={
                                            30
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
                                        No comments yet
                                    </Text>

                                    <Text
                                        style={[
                                            styles.emptyText,
                                            {
                                                color:
                                                    theme.muted,
                                            },
                                        ]}
                                    >
                                        Be the first student to respond.
                                    </Text>
                                </View>
                            ) : null
                        }
                    />

                    <View
                        style={[
                            styles.professorFoolsBar,
                            {
                                backgroundColor:
                                    theme.surface,

                                borderTopColor:
                                    theme.border,
                            },
                        ]}
                    >
                        <Image
                            source={
                                professorFoolsAvatar
                            }
                            style={
                                styles.professorFoolsAvatar
                            }
                            resizeMode="cover"
                        />

                        <View
                            style={
                                styles.professorFoolsCopy
                            }
                        >
                            <Text
                                style={[
                                    styles.professorFoolsTitle,
                                    {
                                        color:
                                            theme.text,
                                    },
                                ]}
                            >
                                Professor Fools
                            </Text>

                            <Text
                                numberOfLines={
                                    2
                                }
                                style={[
                                    styles.professorFoolsText,
                                    {
                                        color:
                                            moderationStatus ===
                                                "scanning"
                                                ? "#EF4444"
                                                : moderationStatus ===
                                                    "approved"
                                                    ? "#22C55E"
                                                    : theme.muted,
                                    },
                                ]}
                            >
                                {moderationStatus ===
                                    "scanning"
                                    ? "Scanning, making sure your comment isn’t too goofy"
                                    : moderationStatus ===
                                        "approved"
                                        ? "Alright, you good 😏"
                                        : "Checks comments and replies before they are posted."}
                            </Text>
                        </View>

                        {moderationStatus ===
                            "scanning" ? (
                            <View
                                style={
                                    styles.moderationActivityDots
                                }
                            >
                                {[
                                    moderationDotOne,
                                    moderationDotTwo,
                                    moderationDotThree,
                                ].map(
                                    (
                                        dotValue,
                                        index
                                    ) => (
                                        <Animated.View
                                            key={
                                                index
                                            }
                                            style={[
                                                styles.moderationActivityDot,
                                                {
                                                    backgroundColor:
                                                        "#EF4444",

                                                    opacity:
                                                        dotValue,

                                                    transform:
                                                        [
                                                            {
                                                                scale:
                                                                    dotValue.interpolate(
                                                                        {
                                                                            inputRange:
                                                                                [
                                                                                    0.35,
                                                                                    1,
                                                                                ],

                                                                            outputRange:
                                                                                [
                                                                                    0.75,
                                                                                    1.15,
                                                                                ],
                                                                        }
                                                                    ),
                                                            },
                                                        ],
                                                },
                                            ]}
                                        />
                                    )
                                )}
                            </View>
                        ) : (
                            <Ionicons
                                name={
                                    moderationStatus ===
                                        "approved"
                                        ? "checkmark-circle"
                                        : "shield-checkmark"
                                }
                                size={
                                    moderationStatus ===
                                        "approved"
                                        ? 23
                                        : 20
                                }
                                color={
                                    moderationStatus ===
                                        "approved"
                                        ? "#22C55E"
                                        : theme.cyan
                                }
                            />
                        )}
                    </View>

                    {replyingTo && (
                        <View
                            style={[
                                styles.replyingBar,
                                {
                                    backgroundColor:
                                        theme.surface,

                                    borderTopColor:
                                        theme.border,
                                },
                            ]}
                        >
                            <Text
                                numberOfLines={
                                    1
                                }
                                style={[
                                    styles.replyingText,
                                    {
                                        color:
                                            theme.muted,
                                    },
                                ]}
                            >
                                Replying to @
                                {getAuthor(
                                    replyingTo.author
                                )
                                    ?.username ||
                                    "student"}
                            </Text>

                            <TouchableOpacity
                                onPress={() => {
                                    setReplyingTo(
                                        null
                                    );

                                    setCommentText(
                                        ""
                                    );
                                }}
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={
                                        18
                                    }
                                    color={
                                        theme.muted
                                    }
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View
                        style={[
                            styles.composer,
                            {
                                backgroundColor:
                                    theme.bg,

                                borderTopColor:
                                    theme.border,
                            },
                        ]}
                    >
                        <Image
                            source={
                                currentRemoteAvatarUrl
                                    ? {
                                        uri: currentRemoteAvatarUrl,
                                    }
                                    : currentAvatarSource
                            }
                            style={
                                styles.currentUserAvatar
                            }
                            resizeMode="cover"
                        />

                        <TextInput
                            ref={commentInputRef}
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder="Add a comment..."
                            placeholderTextColor={theme.muted}
                            multiline
                            maxLength={250}
                            disableFullscreenUI
                            textAlignVertical="top"
                            onFocus={() => {
                                setTimeout(() => {
                                    commentsListRef.current
                                        ?.scrollToEnd({
                                            animated: true,
                                        });
                                }, 250);
                            }}
                            editable={
                                !posting &&
                                !deletingCommentId
                            }
                            style={[
                                styles.commentInput,
                                {
                                    color:
                                        theme.text,

                                    backgroundColor:
                                        theme.input,
                                },
                            ]}
                        />

                        <TouchableOpacity
                            activeOpacity={
                                0.8
                            }
                            disabled={
                                !commentText.trim() ||
                                posting ||
                                Boolean(
                                    deletingCommentId
                                )
                            }
                            onPress={
                                handlePostComment
                            }
                            style={[
                                styles.postButton,
                                {
                                    backgroundColor:
                                        theme.cyan,

                                    opacity:
                                        commentText.trim() &&
                                            !posting &&
                                            !deletingCommentId
                                            ? 1
                                            : 0.4,
                                },
                            ]}
                        >
                            <Ionicons
                                name={
                                    posting
                                        ? "hourglass-outline"
                                        : "arrow-up"
                                }
                                size={
                                    17
                                }
                                color="#07111F"
                            />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles =
    StyleSheet.create({
        modalBackdrop: {
            flex: 1,
            justifyContent:
                "flex-end",
        },

        sheet: {
            width: "100%",
            height: "88%",
            alignSelf: "flex-end",
            borderTopLeftRadius:
                22,
            borderTopRightRadius:
                22,
            overflow: "hidden",
        },

        sheetHandle: {
            width: 42,
            height: 4,
            borderRadius: 999,
            alignSelf: "center",
            marginTop: 8,
            marginBottom: 5,
        },

        modalHeader: {
            minHeight: 55,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            paddingHorizontal:
                s(14),
            borderBottomWidth: 1,
        },

        modalTitle: {
            fontSize: ms(18),
            lineHeight: ms(20),
            fontFamily:
                "Rajdhani_700Bold",
        },

        modalSubtitle: {
            marginTop: 1,
            fontSize: ms(8.5),
            fontWeight: "700",
        },

        closeButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent:
                "center",
        },

        originalDumpPreview: {
            paddingHorizontal:
                s(14),
            paddingVertical:
                vs(9),
            borderBottomWidth: 1,
        },

        originalDumpText: {
            fontSize: ms(10.5),
            lineHeight: ms(14),
            fontWeight: "700",
        },

        commentsList: {
            flexGrow: 1,
            paddingBottom:
                vs(15),
        },

        commentContainer: {
            flexDirection: "row",
            paddingHorizontal:
                s(14),
            paddingVertical:
                vs(12),
            borderBottomWidth: 1,
        },

        commentAvatar: {
            width: s(38),
            height: s(38),
            borderRadius: s(12),
            marginRight: s(10),
        },

        replyAvatar: {
            width: s(33),
            height: s(33),
            borderRadius: s(11),
        },

        commentBody: {
            flex: 1,
            minWidth: 0,
        },

        commentTopRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            minHeight: 20,
        },

        commentIdentityBlock: {
            flex: 1,
            minWidth: 0,
            flexShrink: 1,
        },

        commentUsernameRow: {
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 1,
            minWidth: 0,
            gap: s(3),
        },

        commentUsername: {
            flexShrink: 1,
            fontSize: ms(13.5),
            fontFamily:
                "Rajdhani_700Bold",
        },

        subscriberDiamond: {
            marginLeft: s(1),
            fontSize: ms(10.5),
            lineHeight: ms(14),
        },

        athleteEmoji: {
            marginLeft: s(1),
            fontSize: ms(12),
            lineHeight: ms(15),
        },

        commentContextRow: {
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: s(7),
            marginTop: 1,
        },

        commentStudentContext: {
            flexShrink: 1,
            fontSize: ms(9.5),
            lineHeight: ms(12),
            fontWeight: "800",
        },

        commentSocialButton: {
            minWidth: s(28),
            minHeight: vs(20),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: s(3),
            paddingHorizontal: s(3),
        },

        commentTopRight: {
            flexDirection: "row",
            alignItems: "center",
            marginLeft: s(6),
        },

        commentTime: {
            fontSize: ms(10),
            fontWeight: "700",
        },

        deleteCommentButton: {
            width: s(24),
            height: s(24),
            marginLeft: s(4),
            borderRadius: s(8),
            alignItems: "center",
            justifyContent:
                "center",
        },

        commentContent: {
            marginTop: vs(5),
            fontSize: ms(13),
            lineHeight: ms(18),
            fontWeight: "600",
        },

        commentActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: s(15),
            marginTop: vs(5),
        },

        commentAction: {
            flexDirection: "row",
            alignItems: "center",
            gap: s(4),
            minHeight: 22,
        },

        commentActionText: {
            fontSize: ms(10),
            fontWeight: "800",
        },

        professorFoolsBar: {
            minHeight: 58,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal:
                s(13),
            paddingVertical:
                vs(7),
            borderTopWidth: 1,
        },

        professorFoolsAvatar: {
            width: s(38),
            height: s(38),
            borderRadius: s(12),
            marginRight: s(9),
        },

        professorFoolsCopy: {
            flex: 1,
            minWidth: 0,
            marginRight: s(8),
        },

        professorFoolsTitle: {
            fontSize: ms(12.5),
            fontFamily:
                "Rajdhani_700Bold",
        },

        professorFoolsText: {
            marginTop: 1,
            fontSize: ms(9.5),
            lineHeight: ms(12),
            fontWeight: "600",
        },

        moderationActivityDots: {
            width: s(34),
            height: s(22),
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            paddingHorizontal:
                s(2),
        },

        moderationActivityDot: {
            width: s(7),
            height: s(7),
            borderRadius: s(4),
        },

        replyingBar: {
            minHeight: 40,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            paddingHorizontal:
                s(14),
            borderTopWidth: 1,
        },

        replyingText: {
            flex: 1,
            fontSize: ms(10.5),
            fontWeight: "700",
            marginRight: s(8),
        },

        composer: {
            flexDirection: "row",
            alignItems:
                "flex-end",
            paddingHorizontal:
                s(11),
            paddingTop: vs(8),
            paddingBottom:
                Platform.OS ===
                    "android"
                    ? vs(12)
                    : vs(8),
            borderTopWidth: 1,
        },

        currentUserAvatar: {
            width: s(38),
            height: s(38),
            borderRadius: s(12),
            marginRight: s(7),
            marginBottom: 2,
        },

        commentInput: {
            flex: 1,
            minHeight: 44,
            maxHeight: 110,
            borderRadius: 20,
            paddingHorizontal:
                s(11),
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: ms(12.5),
            lineHeight: ms(17),
            fontWeight: "600",
        },

        postButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent:
                "center",
            marginLeft: s(7),
            marginBottom: 1,
        },

        emptyComments: {
            alignItems: "center",
            justifyContent:
                "center",
            paddingVertical:
                vs(45),
            paddingHorizontal:
                s(25),
        },

        emptyTitle: {
            marginTop: vs(8),
            fontSize: ms(15),
            fontFamily:
                "Rajdhani_700Bold",
        },

        emptyText: {
            marginTop: vs(3),
            fontSize: ms(9.5),
            textAlign: "center",
        },
    });