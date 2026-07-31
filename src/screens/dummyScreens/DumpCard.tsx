import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Alert,
    Animated,
    Image,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import {
    s,
    vs,
    ms,
} from "react-native-size-matters";

import {
    Dump,
    ReactionCounts,
    ReactionType,
    toggleDumpReaction,
    UserPreview,
} from "../api/studentDumpApi";

import {
    PROFILE_AVATAR_IMAGES,
} from "../../assets/data/profileAvatars";

import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

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

type DumpCardProps = {
    dump: Dump;
    currentUserId?: string | null;
    onOpenComments: (dump: Dump) => void;

    /*
     * The delete button only appears when
     * this callback is passed by the screen.
     *
     * MyDumpsScreen will pass it.
     * The nationwide feed will not.
     */
    onDelete?: (dump: Dump) => void;
    deleteDisabled?: boolean;
};

type LocalReaction = {
    type: ReactionType;
    emoji: string;
    count: number;
    selected: boolean;
};

const getDumpCardTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            card: "#FFFFFF",
            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",
            border:
                "rgba(7,17,31,0.08)",
            selectedChip: "#CFFAFE",
            selectedBorder:
                "rgba(6,182,212,0.42)",
            cyan: "#06B6D4",
            blueCheck: "#1D9BF0",
            imageBackground: "#F1F5F9",
            delete: "#DC2626",
        };
    }

    return {
        card: "#090D14",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border:
            "rgba(255,255,255,0.09)",
        selectedChip:
            "rgba(34,211,238,0.15)",
        selectedBorder:
            "rgba(34,211,238,0.42)",
        cyan: "#22D3EE",
        blueCheck: "#1D9BF0",
        imageBackground: "#111827",
        delete: "#FF7A7A",
    };
};

const getAuthorObject = (
    author: Dump["author"]
): UserPreview | null => {
    if (
        !author ||
        typeof author === "string"
    ) {
        return null;
    }

    return author;
};

const getTimeAgo = (
    dateValue?: string | null
) => {
    if (!dateValue) {
        return "";
    }

    const createdTime =
        new Date(dateValue).getTime();

    const difference =
        Date.now() - createdTime;

    if (
        Number.isNaN(createdTime) ||
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

const getClassificationLabel = (
    classification?: string | null
) => {
    if (!classification) {
        return "High School Student";
    }

    return (
        classification
            .charAt(0)
            .toUpperCase() +
        classification.slice(1)
    );
};

const getSportEmoji = (
    sport?: string | null
) => {
    switch (
    sport?.toLowerCase()
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
        case "track & field":
            return "🏃";

        case "cross country":
            return "🏃";

        case "swimming":
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

const getSocialPlatformLabel = (
    platform?: string | null
) => {
    switch (platform) {
        case "instagram":
            return "Instagram";

        case "youtube":
            return "YouTube";

        case "snapchat":
            return "Snapchat";

        case "x":
            return "X";

        default:
            return "Social";
    }
};

const getSocialIconColor = (
    platform:
        | string
        | null
        | undefined,
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

const createLocalReactions = (
    dump: Dump,
    currentUserId?:
        | string
        | null
): LocalReaction[] => {
    const hasReaction = (
        reactionType: ReactionType
    ) => {
        if (!currentUserId) {
            return false;
        }

        return (
            dump.reactions?.[
            reactionType
            ] || []
        ).some(
            (userId) =>
                String(userId) ===
                String(
                    currentUserId
                )
        );
    };

    return [
        {
            type: "fire",
            emoji: "🔥",
            count:
                dump.reactions?.fire
                    ?.length || 0,
            selected:
                hasReaction("fire"),
        },
        {
            type: "laugh",
            emoji: "😂",
            count:
                dump.reactions?.laugh
                    ?.length || 0,
            selected:
                hasReaction("laugh"),
        },
        {
            type: "heart",
            emoji: "❤️",
            count:
                dump.reactions?.heart
                    ?.length || 0,
            selected:
                hasReaction("heart"),
        },
    ];
};

export default function DumpCard({
    dump,
    currentUserId,
    onOpenComments,
    onDelete,
    deleteDisabled = false,
}: DumpCardProps) {
    const { mode } =
        useTimeTheme();

    const theme =
        getDumpCardTheme(mode);

    const author =
        getAuthorObject(
            dump.author
        );

    const [
        reactions,
        setReactions,
    ] =
        useState<
            LocalReaction[]
        >(() =>
            createLocalReactions(
                dump,
                currentUserId
            )
        );

    const [
        updatingReaction,
        setUpdatingReaction,
    ] =
        useState<
            ReactionType | null
        >(null);

    const reactionScales =
        useRef({
            fire:
                new Animated.Value(1),

            laugh:
                new Animated.Value(1),

            heart:
                new Animated.Value(1),
        }).current;

    const commentScale =
        useRef(
            new Animated.Value(1)
        ).current;

    useEffect(() => {
        setReactions(
            createLocalReactions(
                dump,
                currentUserId
            )
        );
    }, [
        currentUserId,
        dump,
    ]);

    const isAnonymous =
        Boolean(
            dump.anonymous
        );

    const username =
        isAnonymous
            ? "anonymous"
            : author?.username ||
            author?.display_name ||
            "student";

    /*
    |--------------------------------------------------------------------------
    | Avatar Priority
    |--------------------------------------------------------------------------
    |
    | Anonymous dump:
    | anonymousAvatar
    |
    | Normal dump:
    | 1. selectedAvatar
    | 2. local avatar key
    | 3. providerAvatar or remote avatar
    | 4. basicBlue
    |
    */

    const selectedAvatar =
        !isAnonymous &&
            author?.selectedAvatar &&
            author.selectedAvatar in
            PROFILE_AVATAR_IMAGES
            ? author.selectedAvatar
            : null;

    const localAvatar =
        !isAnonymous &&
            author?.avatar &&
            !author.avatar.startsWith(
                "http"
            ) &&
            author.avatar in
            PROFILE_AVATAR_IMAGES
            ? author.avatar
            : null;

    const localAvatarId =
        selectedAvatar ??
        localAvatar;

    const remoteAvatarUrl =
        !isAnonymous &&
            !localAvatarId
            ? author?.providerAvatar?.startsWith(
                "http"
            )
                ? author.providerAvatar
                : author?.avatar?.startsWith(
                    "http"
                )
                    ? author.avatar
                    : null
            : null;

    const avatarSource =
        isAnonymous
            ? PROFILE_AVATAR_IMAGES
                .anonymousAvatar
            : getProfileAvatarSource(
                localAvatarId ??
                "basicBlue"
            );

    const studentIdentity =
        useMemo(() => {
            if (
                dump.schoolLevel ===
                "college"
            ) {
                return (
                    dump.collegeName ||
                    "College Student"
                );
            }

            return getClassificationLabel(
                dump.highSchoolClassification
            );
        }, [
            dump.collegeName,
            dump.highSchoolClassification,
            dump.schoolLevel,
        ]);

    const studentEmoji =
        dump.schoolLevel ===
            "college"
            ? "🎓"
            : "🎒";

    /*
     * Anonymous dumps should never
     * reveal athlete information.
     */
    const athleteEmoji =
        !isAnonymous &&
            author?.isStudentAthlete
            ? getSportEmoji(
                author?.sport
            )
            : null;

    /*
     * Anonymous dumps should never
     * reveal social media links.
     */
    const showSocialMedia =
        !isAnonymous &&
        Boolean(
            author?.isSubscribed
        ) &&
        Boolean(
            author?.socialMediaPlatform
        ) &&
        Boolean(
            author?.socialMediaUrl
        );

    const animateReaction =
        (
            reactionType: ReactionType
        ) => {
            const scale =
                reactionScales[
                    reactionType
                ];

            scale.stopAnimation();

            scale.setValue(
                0.82
            );

            Animated.sequence([
                Animated.spring(
                    scale,
                    {
                        toValue: 1.18,

                        useNativeDriver:
                            true,

                        tension: 210,

                        friction: 4,
                    }
                ),

                Animated.spring(
                    scale,
                    {
                        toValue: 1,

                        useNativeDriver:
                            true,

                        tension: 180,

                        friction: 6,
                    }
                ),
            ]).start();
        };

    const animateComment =
        () => {
            commentScale.stopAnimation();

            commentScale.setValue(
                0.9
            );

            Animated.spring(
                commentScale,
                {
                    toValue: 1,

                    useNativeDriver:
                        true,

                    tension: 180,

                    friction: 5,
                }
            ).start();
        };

    const applyReactionResponse = (
        counts: ReactionCounts,
        userReaction:
            | ReactionType
            | null
    ) => {
        setReactions(
            (current) =>
                current.map(
                    (reaction) => ({
                        ...reaction,
                        count:
                            counts[
                            reaction
                                .type
                            ],
                        selected:
                            userReaction ===
                            reaction.type,
                    })
                )
        );
    };

    const handleReactionPress =
        async (
            reactionType: ReactionType
        ) => {
            if (
                updatingReaction
            ) {
                return;
            }

            const previousReactions =
                reactions.map(
                    (reaction) => ({
                        ...reaction,
                    })
                );

            const currentSelected =
                reactions.find(
                    (reaction) =>
                        reaction.selected
                )?.type || null;

            const nextSelected =
                currentSelected ===
                    reactionType
                    ? null
                    : reactionType;

            setReactions(
                (current) =>
                    current.map(
                        (reaction) => {
                            let count =
                                reaction.count;

                            if (
                                reaction.selected
                            ) {
                                count =
                                    Math.max(
                                        0,
                                        count -
                                        1
                                    );
                            }

                            if (
                                reaction.type ===
                                reactionType &&
                                nextSelected ===
                                reactionType
                            ) {
                                count += 1;
                            }

                            return {
                                ...reaction,
                                count,
                                selected:
                                    reaction.type ===
                                    nextSelected,
                            };
                        }
                    )
            );

            animateReaction(
                reactionType
            );

            try {
                setUpdatingReaction(
                    reactionType
                );

                const response =
                    await toggleDumpReaction(
                        dump._id,
                        reactionType
                    );

                applyReactionResponse(
                    response.reactions,
                    response.userReaction
                );
            } catch (
            error: any
            ) {
                setReactions(
                    previousReactions
                );

                Alert.alert(
                    "Reaction Failed",
                    error?.message ||
                    "Your reaction could not be updated."
                );
            } finally {
                setUpdatingReaction(
                    null
                );
            }
        };

    const handleOpenSocialMedia =
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
                    "Open social media link error:",
                    error
                );

                Alert.alert(
                    "Unable to Open Link",
                    "Something went wrong while opening this profile."
                );
            }
        };

    const handleDeletePress =
        () => {
            if (
                !onDelete ||
                deleteDisabled
            ) {
                return;
            }

            onDelete(dump);
        };

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor:
                        theme.card,
                    borderColor:
                        theme.border,
                },
            ]}
        >
            <View
                style={
                    styles.headerRow
                }
            >
                <Image
                    source={
                        remoteAvatarUrl
                            ? {
                                uri: remoteAvatarUrl,
                            }
                            : avatarSource
                    }
                    style={
                        styles.avatar
                    }
                    resizeMode="cover"
                />

                <View
                    style={
                        styles.identitySection
                    }
                >
                    <View
                        style={
                            styles.usernameRow
                        }
                    >
                        <Text
                            style={[
                                styles.username,
                                {
                                    color:
                                        theme.text,
                                },
                            ]}
                            numberOfLines={
                                1
                            }
                        >
                            @{username}
                        </Text>

                        {!isAnonymous &&
                            author?.isSubscribed && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={
                                        17
                                    }
                                    color={
                                        theme.blueCheck
                                    }
                                />
                            )}
                    </View>

                    <View
                        style={
                            styles.schoolRow
                        }
                    >
                        <Ionicons
                            name="location-sharp"
                            size={12}
                            color={
                                theme.cyan
                            }
                        />

                        <Text
                            style={
                                styles.schoolEmoji
                            }
                        >
                            {
                                studentEmoji
                            }
                        </Text>

                        <Text
                            style={[
                                styles.schoolText,
                                {
                                    color:
                                        theme.muted,
                                },
                            ]}
                            numberOfLines={
                                1
                            }
                        >
                            {
                                studentIdentity
                            }
                        </Text>

                        {athleteEmoji && (
                            <Text
                                style={
                                    styles.athleteEmoji
                                }
                            >
                                {
                                    athleteEmoji
                                }
                            </Text>
                        )}
                    </View>
                </View>

                <View
                    style={
                        styles.headerRight
                    }
                >
                    <Text
                        style={[
                            styles.timeText,
                            {
                                color:
                                    theme.muted,
                            },
                        ]}
                    >
                        {getTimeAgo(
                            dump.created_at
                        )}
                    </Text>

                    {onDelete && (
                        <TouchableOpacity
                            activeOpacity={
                                0.65
                            }
                            disabled={
                                deleteDisabled
                            }
                            onPress={
                                handleDeletePress
                            }
                            hitSlop={
                                8
                            }
                            style={[
                                styles.deleteButton,
                                deleteDisabled &&
                                styles.deleteButtonDisabled,
                            ]}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={
                                    17
                                }
                                color={
                                    theme.delete
                                }
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <Text
                style={[
                    styles.dumpContent,
                    {
                        color:
                            theme.text,
                    },
                ]}
            >
                {dump.content}
            </Text>

            {dump.image_url && (
                <Image
                    source={{
                        uri: dump.image_url,
                    }}
                    style={[
                        styles.dumpImage,
                        {
                            backgroundColor:
                                theme.imageBackground,
                        },
                    ]}
                    resizeMode="cover"
                />
            )}

            <View
                style={
                    styles.bottomActionRow
                }
            >
                <View
                    style={
                        styles.leftActions
                    }
                >
                    <Animated.View
                        style={{
                            transform:
                                [
                                    {
                                        scale:
                                            commentScale,
                                    },
                                ],
                        }}
                    >
                        <TouchableOpacity
                            activeOpacity={
                                0.7
                            }
                            onPress={() => {
                                animateComment();

                                onOpenComments(
                                    dump
                                );
                            }}
                            style={
                                styles.commentButton
                            }
                        >
                            <Ionicons
                                name="chatbubble-outline"
                                size={
                                    17
                                }
                                color={
                                    theme.muted
                                }
                            />

                            <Text
                                style={[
                                    styles.actionCount,
                                    {
                                        color:
                                            theme.textSoft,
                                    },
                                ]}
                            >
                                {dump.commentsCount ||
                                    0}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {reactions.map(
                        (reaction) => {
                            const selected =
                                reaction.selected;

                            return (
                                <Animated.View
                                    key={`${dump._id}-${reaction.type}`}
                                    style={{
                                        transform:
                                            [
                                                {
                                                    scale:
                                                        reactionScales[
                                                            reaction
                                                                .type
                                                        ],
                                                },
                                            ],
                                    }}
                                >
                                    <Pressable
                                        disabled={Boolean(
                                            updatingReaction
                                        )}
                                        onPress={() =>
                                            handleReactionPress(
                                                reaction.type
                                            )
                                        }
                                        style={[
                                            styles.compactReaction,

                                            selected && {
                                                backgroundColor:
                                                    theme.selectedChip,

                                                borderColor:
                                                    theme.selectedBorder,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={
                                                styles.reactionEmoji
                                            }
                                        >
                                            {
                                                reaction.emoji
                                            }
                                        </Text>

                                        <Text
                                            style={[
                                                styles.actionCount,
                                                {
                                                    color:
                                                        selected
                                                            ? theme.cyan
                                                            : theme.textSoft,
                                                },
                                            ]}
                                        >
                                            {
                                                reaction.count
                                            }
                                        </Text>
                                    </Pressable>
                                </Animated.View>
                            );
                        }
                    )}
                </View>

                {showSocialMedia && (
                    <TouchableOpacity
                        activeOpacity={
                            0.68
                        }
                        style={
                            styles.socialMediaButton
                        }
                        onPress={
                            handleOpenSocialMedia
                        }
                    >
                        <FontAwesome6
                            name={getSocialIcon(
                                author?.socialMediaPlatform
                            )}
                            size={
                                15
                            }
                            color={getSocialIconColor(
                                author?.socialMediaPlatform,

                                mode ===
                                    "night"
                            )}
                        />

                        <Text
                            numberOfLines={
                                1
                            }
                            style={[
                                styles.socialUsername,

                                {
                                    color:
                                        theme.muted,
                                },
                            ]}
                        >
                            {getSocialPlatformLabel(
                                author?.socialMediaPlatform
                            )}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            </View>
        </View>
    );
}

const styles =
    StyleSheet.create({
        card: {
            borderBottomWidth: 1,

            paddingHorizontal:
                s(14),

            paddingTop:
                vs(11),

            paddingBottom:
                vs(10),
        },

        headerRow: {
            flexDirection: "row",

            alignItems:
                "flex-start",
        },

        avatar: {
            width:
                s(42),

            height:
                s(42),

            borderRadius:
                s(13),

            marginRight:
                s(10),
        },

        identitySection: {
            flex: 1,

            minWidth: 0,

            paddingTop: 1,
        },

        usernameRow: {
            flexDirection: "row",

            alignItems: "center",

            gap:
                s(5),

            minWidth: 0,
        },

        username: {
            maxWidth: "80%",

            fontSize:
                ms(15),

            lineHeight:
                ms(18),

            fontFamily:
                "Rajdhani_700Bold",
        },

        schoolRow: {
            flexDirection: "row",

            alignItems: "center",

            marginTop:
                vs(2),

            minWidth: 0,
        },

        schoolEmoji: {
            fontSize:
                ms(10.5),

            marginLeft:
                s(3),

            marginRight:
                s(4),
        },

        schoolText: {
            flexShrink: 1,

            fontSize:
                ms(10.5),

            lineHeight:
                ms(13),

            fontWeight: "700",
        },

        athleteEmoji: {
            marginLeft:
                s(6),

            fontSize:
                ms(11.5),
        },

        headerRight: {
            minWidth:
                s(30),

            marginLeft:
                s(7),

            alignItems:
                "flex-end",
        },

        timeText: {
            fontSize:
                ms(10),

            lineHeight:
                ms(13),

            fontWeight:
                "700",

            paddingTop: 1,
        },

        deleteButton: {
            width:
                s(28),

            height:
                s(27),

            marginTop:
                vs(3),

            alignItems:
                "center",

            justifyContent:
                "center",

            borderRadius:
                s(9),
        },

        deleteButtonDisabled: {
            opacity: 0.4,
        },

        dumpContent: {
            marginTop:
                vs(8),

            fontSize:
                ms(14.5),

            lineHeight:
                ms(20),

            fontWeight:
                "600",
        },

        dumpImage: {
            width: "100%",

            height:
                vs(185),

            borderRadius: 15,

            marginTop:
                vs(10),
        },

        bottomActionRow: {
            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "space-between",

            marginTop:
                vs(9),

            minHeight:
                vs(28),
        },

        leftActions: {
            flexDirection: "row",

            alignItems: "center",

            flexShrink: 1,

            gap:
                s(5),
        },

        compactReaction: {
            minHeight:
                vs(27),

            flexDirection: "row",

            alignItems: "center",

            gap:
                s(3),

            borderRadius: 999,

            borderWidth: 1,

            borderColor:
                "transparent",

            paddingHorizontal:
                s(6),

            paddingVertical:
                vs(1),
        },

        reactionEmoji: {
            fontSize:
                ms(13.5),
        },

        actionCount: {
            fontSize:
                ms(10),

            fontWeight:
                "900",
        },

        commentButton: {
            minHeight:
                vs(27),

            flexDirection: "row",

            alignItems: "center",

            gap:
                s(4),

            paddingHorizontal:
                s(6),
        },

        socialMediaButton: {
            maxWidth: "37%",

            minHeight:
                vs(27),

            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "flex-end",

            gap:
                s(5),

            marginLeft:
                s(10),

            paddingHorizontal:
                s(4),
        },

        socialUsername: {
            flexShrink: 1,

            fontSize:
                ms(10),

            fontWeight:
                "800",
        },
    });