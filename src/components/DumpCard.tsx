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
            border: "rgba(7,17,31,0.08)",
            selectedChip: "#CFFAFE",
            selectedBorder: "rgba(6,182,212,0.42)",
            cyan: "#06B6D4",
            blueCheck: "#1D9BF0",
            imageBackground: "#F1F5F9",
        };
    }

    return {
        card: "#090D14",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",
        border: "rgba(255,255,255,0.09)",
        selectedChip: "rgba(34,211,238,0.15)",
        selectedBorder: "rgba(34,211,238,0.42)",
        cyan: "#22D3EE",
        blueCheck: "#1D9BF0",
        imageBackground: "#111827",
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
        Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h`;
    }

    const days =
        Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d`;
    }

    const weeks =
        Math.floor(days / 7);

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
    switch (sport?.toLowerCase()) {
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

const createLocalReactions = (
    dump: Dump,
    currentUserId?: string | null
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
                String(currentUserId)
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
    ] = useState<LocalReaction[]>(
        () =>
            createLocalReactions(
                dump,
                currentUserId
            )
    );

    const [
        updatingReaction,
        setUpdatingReaction,
    ] =
        useState<ReactionType | null>(
            null
        );

    const reactionScale =
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
        Boolean(dump.anonymous);

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
    | 1. selectedAvatar
    | 2. local avatar key
    | 3. providerAvatar or remote avatar
    | 4. basicBlue
    |
    | Anonymous dumps always use basicBlue.
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
            !author.avatar.startsWith("http") &&
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
        getProfileAvatarSource(
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

    const athleteEmoji =
        author?.isStudentAthlete
            ? getSportEmoji(author?.sport)
            : null;

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
                            reaction.type
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
            if (updatingReaction) {
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
                                count = Math.max(
                                    0,
                                    count - 1
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

            reactionScale.setValue(
                0.88
            );

            Animated.spring(
                reactionScale,
                {
                    toValue: 1,
                    useNativeDriver:
                        true,
                    tension: 150,
                    friction: 5,
                }
            ).start();

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
            } catch (error: any) {
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
                    style={styles.avatar}
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
                            numberOfLines={1}
                        >
                            @{username}
                        </Text>

                        {!isAnonymous &&
                            author?.isSubscribed && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={15}
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
                            size={10}
                            color={
                                theme.cyan
                            }
                        />

                        <Text
                            style={
                                styles.schoolEmoji
                            }
                        >
                            {studentEmoji}
                        </Text>

                        <Text
                            style={[
                                styles.schoolText,
                                {
                                    color:
                                        theme.muted,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {studentIdentity}
                        </Text>
                        {athleteEmoji && (
                            <Text
                                style={{
                                    marginLeft: s(5),
                                    fontSize: ms(10),
                                }}
                            >
                                {athleteEmoji}
                            </Text>
                        )}
                    </View>
                </View>

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
            </View>

            <Text
                style={[
                    styles.dumpContent,
                    {
                        color: theme.text,
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
                                                    scale: selected
                                                        ? reactionScale
                                                        : 1,
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
                                                    color: selected
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

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                            onOpenComments(
                                dump
                            )
                        }
                        style={
                            styles.commentButton
                        }
                    >
                        <Ionicons
                            name="chatbubble-outline"
                            size={15}
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
                </View>

                {showSocialMedia && (
                    <TouchableOpacity
                        activeOpacity={0.68}
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
                            size={13}
                            color={getSocialIconColor(
                                author?.socialMediaPlatform,
                                mode === "night"
                            )}
                        />

                        <Text
                            numberOfLines={1}
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
    );
}

const styles =
    StyleSheet.create({
        card: {
            borderBottomWidth: 1,
            paddingHorizontal:
                s(12),
            paddingTop: vs(9),
            paddingBottom:
                vs(8),
        },

        headerRow: {
            flexDirection: "row",
            alignItems:
                "flex-start",
        },

        avatar: {
            width: s(35),
            height: s(35),
            borderRadius: s(11),
            marginRight: s(8),
        },

        identitySection: {
            flex: 1,
            minWidth: 0,
            paddingTop: 1,
        },

        usernameRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: s(4),
            minWidth: 0,
        },

        username: {
            maxWidth: "80%",
            fontSize: ms(13),
            lineHeight: ms(15),
            fontFamily:
                "Rajdhani_700Bold",
        },

        schoolRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: vs(1),
            minWidth: 0,
        },

        schoolEmoji: {
            fontSize: ms(9),
            marginLeft: s(2),
            marginRight: s(3),
        },

        schoolText: {
            flexShrink: 1,
            fontSize: ms(9),
            lineHeight: ms(11),
            fontWeight: "700",
        },

        timeText: {
            fontSize: ms(9),
            lineHeight: ms(12),
            fontWeight: "700",
            marginLeft: s(6),
            paddingTop: 1,
        },

        dumpContent: {
            marginTop: vs(6),
            fontSize: ms(12.5),
            lineHeight: ms(16.5),
            fontWeight: "600",
        },

        dumpImage: {
            width: "100%",
            height: vs(170),
            borderRadius: 14,
            marginTop: vs(8),
        },

        bottomActionRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            marginTop: vs(7),
            minHeight: vs(23),
        },

        leftActions: {
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 1,
            gap: s(4),
        },

        compactReaction: {
            minHeight: vs(23),
            flexDirection: "row",
            alignItems: "center",
            gap: s(2),
            borderRadius: 999,
            borderWidth: 1,
            borderColor:
                "transparent",
            paddingHorizontal: s(4),
            paddingVertical: 1,
        },

        reactionEmoji: {
            fontSize: ms(11.5),
        },

        actionCount: {
            fontSize: ms(8.5),
            fontWeight: "900",
        },

        commentButton: {
            minHeight: vs(23),
            flexDirection: "row",
            alignItems: "center",
            gap: s(3),
            paddingHorizontal:
                s(4),
        },

        socialMediaButton: {
            maxWidth: "35%",
            minHeight: vs(23),
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "flex-end",
            gap: s(4),
            marginLeft: s(9),
            paddingHorizontal: s(3),
        },

        socialUsername: {
            flexShrink: 1,
            fontSize: ms(8.5),
            fontWeight: "800",
        },
    });