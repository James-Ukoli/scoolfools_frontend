import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Alert,
    Animated,
    Easing,
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

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type ProfileAvatarId =
    keyof typeof PROFILE_AVATAR_IMAGES;

type DumpCardProps = {
    dump: Dump;
    currentUserId?: string | null;
    onOpenComments: (dump: Dump) => void;
    onDelete?: (dump: Dump) => void;
    deleteDisabled?: boolean;
};

type LocalReaction = {
    type: ReactionType;
    emoji: string;
    label: string;
    count: number;
    selected: boolean;
};

/*
|--------------------------------------------------------------------------
| Reaction Options
|--------------------------------------------------------------------------
*/

const REACTION_OPTIONS: Array<{
    type: ReactionType;
    emoji: string;
    label: string;
}> = [
        {
            type: "fire",
            emoji: "🔥",
            label: "Fire",
        },
        {
            type: "laugh",
            emoji: "😂",
            label: "Laugh",
        },
        {
            type: "heart",
            emoji: "❤️",
            label: "Heart",
        },
    ];

/*
|--------------------------------------------------------------------------
| Avatar Helper
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
*/

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

            reactionTray:
                "#FFFFFF",

            reactionTrayBorder:
                "rgba(7,17,31,0.11)",

            selectedChip:
                "rgba(7,17,31,0.06)",

            selectedBorder:
                "rgba(7,17,31,0.14)",

            reactionButtonPressed:
                "rgba(7,17,31,0.05)",

            cyan: "#06B6D4",
            imageBackground: "#F1F5F9",
            delete: "#DC2626",

            shadow:
                "rgba(15,23,42,0.24)",

            sparklePrimary:
                "#F59E0B",

            sparkleSecondary:
                "#FACC15",

            sparkleSoft:
                "#FFFFFF",

            senior: "#2563EB",
            freshman: "#16A34A",
            junior: "#EA580C",
            sophomore: "#DC2626",
        };
    }

    return {
        card: "#090D14",
        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",

        border:
            "rgba(255,255,255,0.09)",

        reactionTray:
            "#111827",

        reactionTrayBorder:
            "rgba(255,255,255,0.12)",

        selectedChip:
            "rgba(255,255,255,0.07)",

        selectedBorder:
            "rgba(255,255,255,0.15)",

        reactionButtonPressed:
            "rgba(255,255,255,0.06)",

        cyan: "#22D3EE",
        imageBackground: "#111827",
        delete: "#FF7A7A",

        shadow:
            "rgba(0,0,0,0.60)",

        sparklePrimary:
            "#FACC15",

        sparkleSecondary:
            "#FDE68A",

        sparkleSoft:
            "#FFFFFF",

        senior: "#60A5FA",
        freshman: "#4ADE80",
        junior: "#FB923C",
        sophomore: "#F87171",
    };
};

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

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

const getClassificationColor = (
    classification:
        | string
        | null
        | undefined,
    theme: ReturnType<
        typeof getDumpCardTheme
    >
) => {
    switch (
        classification?.toLowerCase()
    ) {
        case "freshman":
            return theme.freshman;

        case "sophomore":
        case "sophmore":
            return theme.sophomore;

        case "junior":
            return theme.junior;

        case "senior":
            return theme.senior;

        default:
            return theme.muted;
    }
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

/*
|--------------------------------------------------------------------------
| Reaction State Helper
|--------------------------------------------------------------------------
*/

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

    return REACTION_OPTIONS.map(
        (reaction) => ({
            ...reaction,

            count:
                dump.reactions?.[
                    reaction.type
                ]?.length || 0,

            selected:
                hasReaction(
                    reaction.type
                ),
        })
    );
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function DumpCard({
    dump,
    currentUserId,
    onOpenComments,
    onDelete,
    deleteDisabled = false,
}: DumpCardProps) {
    const {
        mode,
    } = useTimeTheme();

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
        reactionTrayVisible,
        setReactionTrayVisible,
    ] =
        useState(false);

    const [
        updatingReaction,
        setUpdatingReaction,
    ] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | Animations
    |--------------------------------------------------------------------------
    */

    const trayAnimation =
        useRef(
            new Animated.Value(0)
        ).current;

    const mainReactionScale =
        useRef(
            new Animated.Value(1)
        ).current;

    const selectedReactionScale =
        useRef(
            new Animated.Value(1)
        ).current;

    const commentScale =
        useRef(
            new Animated.Value(1)
        ).current;

    const glitterAnimation =
        useRef(
            new Animated.Value(0)
        ).current;

    const optionAnimations =
        useRef({
            fire:
                new Animated.Value(0),

            laugh:
                new Animated.Value(0),

            heart:
                new Animated.Value(0),
        }).current;

    const reactionRequestLocked =
        useRef(false);

    /*
    |--------------------------------------------------------------------------
    | Identity
    |--------------------------------------------------------------------------
    */

    const isAnonymous =
        Boolean(
            dump.anonymous
        );

    const isSubscriberCard =
        !isAnonymous &&
        Boolean(
            author?.isSubscribed
        );

    const username =
        isAnonymous
            ? "anonymous"
            : author?.username ||
            author?.display_name ||
            "student";

    /*
    |--------------------------------------------------------------------------
    | Subscriber Glitter Animation
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        glitterAnimation.stopAnimation();
        glitterAnimation.setValue(0);

        if (!isSubscriberCard) {
            return;
        }

        /*
         * Run a richer premium glitter sequence once when the card mounts.
         * It stops after a few seconds instead of looping forever, which is
         * safer for feed performance when several subscriber cards are visible.
         */
        const glitterSequence =
            Animated.sequence([
                Animated.delay(180),

                Animated.timing(
                    glitterAnimation,
                    {
                        toValue: 0.5,

                        duration: 1650,

                        easing:
                            Easing.inOut(
                                Easing.ease
                            ),

                        useNativeDriver:
                            true,
                    }
                ),

                Animated.timing(
                    glitterAnimation,
                    {
                        toValue: 1,

                        duration: 1650,

                        easing:
                            Easing.inOut(
                                Easing.ease
                            ),

                        useNativeDriver:
                            true,
                    }
                ),
            ]);

        glitterSequence.start();

        return () => {
            glitterSequence.stop();
        };
    }, [
        glitterAnimation,
        isSubscriberCard,
        dump._id,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Sync Reaction State
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (
            reactionRequestLocked.current
        ) {
            return;
        }

        setReactions(
            createLocalReactions(
                dump,
                currentUserId
            )
        );
    }, [
        currentUserId,
        dump._id,
        dump.reactions?.fire?.length,
        dump.reactions?.laugh?.length,
        dump.reactions?.heart?.length,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Clean Up Animations
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        return () => {
            trayAnimation.stopAnimation();
            mainReactionScale.stopAnimation();
            selectedReactionScale.stopAnimation();
            commentScale.stopAnimation();
            glitterAnimation.stopAnimation();

            Object.values(
                optionAnimations
            ).forEach(
                (animation) => {
                    animation.stopAnimation();
                }
            );
        };
    }, [
        commentScale,
        glitterAnimation,
        mainReactionScale,
        optionAnimations,
        selectedReactionScale,
        trayAnimation,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Avatar Priority
    |--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | Student Identity
    |--------------------------------------------------------------------------
    */

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

    const isCollegeDump =
        dump.schoolLevel ===
        "college";

    const classificationColor =
        getClassificationColor(
            dump.highSchoolClassification,
            theme
        );

    const athleteEmoji =
        !isAnonymous &&
            author?.isStudentAthlete
            ? getSportEmoji(
                author?.sport
            )
            : null;

    /*
    |--------------------------------------------------------------------------
    | Subscriber Social Media
    |--------------------------------------------------------------------------
    */

    const showSocialMedia =
        isSubscriberCard &&
        Boolean(
            author?.socialMediaPlatform
        ) &&
        Boolean(
            author?.socialMediaUrl
        );

    /*
    |--------------------------------------------------------------------------
    | Derived Reaction State
    |--------------------------------------------------------------------------
    */

    const selectedReaction =
        reactions.find(
            (reaction) =>
                reaction.selected
        ) || null;

    const totalReactions =
        reactions.reduce(
            (
                total,
                reaction
            ) =>
                total +
                reaction.count,
            0
        );

    const visibleReactionSummary =
        reactions
            .map(
                (
                    reaction,
                    index
                ) => ({
                    ...reaction,

                    originalIndex:
                        index,
                })
            )
            .filter(
                (reaction) =>
                    reaction.count > 0
            )
            .sort(
                (a, b) => {
                    if (
                        b.count !==
                        a.count
                    ) {
                        return (
                            b.count -
                            a.count
                        );
                    }

                    return (
                        a.originalIndex -
                        b.originalIndex
                    );
                }
            );

    /*
    |--------------------------------------------------------------------------
    | Glitter Values
    |--------------------------------------------------------------------------
    */

    const sparkleOneOpacity =
        glitterAnimation.interpolate({
            inputRange: [
                0,
                0.15,
                0.3,
                1,
            ],

            outputRange: [
                0,
                1,
                0,
                0,
            ],
        });

    const sparkleTwoOpacity =
        glitterAnimation.interpolate({
            inputRange: [
                0,
                0.3,
                0.46,
                0.62,
                1,
            ],

            outputRange: [
                0,
                0,
                1,
                0,
                0,
            ],
        });

    const sparkleThreeOpacity =
        glitterAnimation.interpolate({
            inputRange: [
                0,
                0.56,
                0.72,
                0.88,
                1,
            ],

            outputRange: [
                0,
                0,
                1,
                0,
                0,
            ],
        });

    const sparkleFourOpacity =
        glitterAnimation.interpolate({
            inputRange: [
                0,
                0.74,
                0.9,
                1,
            ],

            outputRange: [
                0,
                0,
                1,
                0,
            ],
        });

    const sparkleScale =
        glitterAnimation.interpolate({
            inputRange: [
                0,
                0.5,
                1,
            ],

            outputRange: [
                0.7,
                1.15,
                0.7,
            ],
        });

    const shimmerTranslateX =
        glitterAnimation.interpolate({
            inputRange: [
                0,
                1,
            ],

            outputRange: [
                -s(45),
                s(390),
            ],
        });

    /*
    |--------------------------------------------------------------------------
    | Reaction Tray Animation
    |--------------------------------------------------------------------------
    */

    const openReactionTray =
        () => {
            if (
                reactionRequestLocked.current ||
                updatingReaction ||
                reactionTrayVisible
            ) {
                return;
            }

            setReactionTrayVisible(
                true
            );

            trayAnimation.stopAnimation();
            trayAnimation.setValue(0);

            Object.values(
                optionAnimations
            ).forEach(
                (animation) => {
                    animation.stopAnimation();
                    animation.setValue(0);
                }
            );

            Animated.parallel([
                Animated.timing(
                    trayAnimation,
                    {
                        toValue: 1,

                        duration: 180,

                        easing:
                            Easing.out(
                                Easing.cubic
                            ),

                        useNativeDriver:
                            true,
                    }
                ),

                Animated.stagger(
                    48,

                    REACTION_OPTIONS.map(
                        (reaction) =>
                            Animated.spring(
                                optionAnimations[
                                reaction.type
                                ],
                                {
                                    toValue: 1,

                                    tension: 185,

                                    friction: 7,

                                    useNativeDriver:
                                        true,
                                }
                            )
                    )
                ),
            ]).start();
        };

    const closeReactionTray =
        (
            onComplete?: () => void
        ) => {
            trayAnimation.stopAnimation();

            Animated.timing(
                trayAnimation,
                {
                    toValue: 0,

                    duration: 130,

                    easing:
                        Easing.in(
                            Easing.cubic
                        ),

                    useNativeDriver:
                        true,
                }
            ).start(
                ({ finished }) => {
                    if (finished) {
                        setReactionTrayVisible(
                            false
                        );

                        onComplete?.();
                    }
                }
            );
        };

    const handleMainReactionPress =
        () => {
            if (
                reactionRequestLocked.current ||
                updatingReaction
            ) {
                return;
            }

            mainReactionScale.stopAnimation();

            mainReactionScale.setValue(
                0.93
            );

            Animated.spring(
                mainReactionScale,
                {
                    toValue: 1,

                    tension: 230,

                    friction: 8,

                    useNativeDriver:
                        true,
                }
            ).start();

            if (reactionTrayVisible) {
                closeReactionTray();

                return;
            }

            openReactionTray();
        };

    const animateSelectedReaction =
        () => {
            selectedReactionScale.stopAnimation();

            selectedReactionScale.setValue(
                0.76
            );

            Animated.sequence([
                Animated.spring(
                    selectedReactionScale,
                    {
                        toValue: 1.22,

                        tension: 230,

                        friction: 6,

                        useNativeDriver:
                            true,
                    }
                ),

                Animated.spring(
                    selectedReactionScale,
                    {
                        toValue: 1,

                        tension: 170,

                        friction: 8,

                        useNativeDriver:
                            true,
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

    /*
    |--------------------------------------------------------------------------
    | Reaction Update Helpers
    |--------------------------------------------------------------------------
    */

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
            reactionType:
                ReactionType
        ) => {
            if (
                reactionRequestLocked.current
            ) {
                return;
            }

            reactionRequestLocked.current =
                true;

            setUpdatingReaction(
                true
            );

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

            closeReactionTray();

            setReactions(
                (current) =>
                    current.map(
                        (reaction) => {
                            let nextCount =
                                reaction.count;

                            if (
                                reaction.selected
                            ) {
                                nextCount =
                                    Math.max(
                                        0,
                                        nextCount - 1
                                    );
                            }

                            if (
                                reaction.type ===
                                reactionType &&
                                nextSelected ===
                                reactionType
                            ) {
                                nextCount += 1;
                            }

                            return {
                                ...reaction,

                                count:
                                    nextCount,

                                selected:
                                    reaction.type ===
                                    nextSelected,
                            };
                        }
                    )
            );

            animateSelectedReaction();

            try {
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
                reactionRequestLocked.current =
                    false;

                setUpdatingReaction(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Social Media
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Delete
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

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
            {/* Subscriber Glitter */}

            {isSubscriberCard && (
                <View
                    pointerEvents="none"
                    style={
                        styles.glitterLayer
                    }
                >
                    <Animated.View
                        style={[
                            styles.shimmerLine,

                            {
                                backgroundColor:
                                    theme.sparkleSoft,

                                opacity:
                                    glitterAnimation.interpolate({
                                        inputRange: [
                                            0,
                                            0.45,
                                            0.55,
                                            1,
                                        ],

                                        outputRange: [
                                            0,
                                            0,
                                            0.12,
                                            0,
                                        ],
                                    }),

                                transform: [
                                    {
                                        translateX:
                                            shimmerTranslateX,
                                    },

                                    {
                                        rotate:
                                            "-18deg",
                                    },
                                ],
                            },
                        ]}
                    />

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleOne,

                            {
                                color:
                                    theme.sparklePrimary,

                                opacity:
                                    sparkleOneOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ✦
                    </Animated.Text>

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleTwo,

                            {
                                color:
                                    theme.sparkleSoft,

                                opacity:
                                    sparkleTwoOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ✧
                    </Animated.Text>

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleThree,

                            {
                                color:
                                    theme.sparkleSecondary,

                                opacity:
                                    sparkleThreeOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ✦
                    </Animated.Text>

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleFour,

                            {
                                color:
                                    theme.sparkleSoft,

                                opacity:
                                    sparkleFourOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ✧
                    </Animated.Text>

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleFive,

                            {
                                color:
                                    theme.sparkleSecondary,

                                opacity:
                                    sparkleTwoOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ✨
                    </Animated.Text>

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleSix,

                            {
                                color:
                                    theme.sparklePrimary,

                                opacity:
                                    sparkleThreeOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ◆
                    </Animated.Text>

                    <Animated.Text
                        style={[
                            styles.sparkle,
                            styles.sparkleSeven,

                            {
                                color:
                                    theme.sparkleSoft,

                                opacity:
                                    sparkleOneOpacity,

                                transform: [
                                    {
                                        scale:
                                            sparkleScale,
                                    },
                                ],
                            },
                        ]}
                    >
                        ✦
                    </Animated.Text>
                </View>
            )}

            {/* Header */}

            <View
                style={
                    styles.headerRow
                }
            >
                <Image
                    source={
                        remoteAvatarUrl
                            ? {
                                uri:
                                    remoteAvatarUrl,
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
                            numberOfLines={1}
                        >
                            @{username}
                        </Text>

                        {isSubscriberCard && (
                            <Text
                                accessibilityLabel="Subscriber"
                                style={
                                    styles.diamondEmoji
                                }
                            >
                                💎
                            </Text>
                        )}
                    </View>

                    <View
                        style={
                            styles.schoolRow
                        }
                    >
                        {isCollegeDump && (
                            <Text
                                style={
                                    styles.collegeEmoji
                                }
                            >
                                🎓
                            </Text>
                        )}

                        <Text
                            style={[
                                styles.schoolText,

                                {
                                    color:
                                        isCollegeDump
                                            ? theme.muted
                                            : classificationColor,
                                },

                                !isCollegeDump &&
                                    styles.classificationText,
                            ]}
                            numberOfLines={1}
                        >
                            {studentIdentity}
                        </Text>

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
                            hitSlop={8}
                            style={[
                                styles.deleteButton,

                                deleteDisabled &&
                                styles.deleteButtonDisabled,
                            ]}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={17}
                                color={
                                    theme.delete
                                }
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}

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
                        uri:
                            dump.image_url,
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

            {/* Actions */}

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
                    {/* Comments */}

                    <Animated.View
                        style={{
                            transform: [
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
                                size={17}
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

                    {/* Reactions */}

                    <View
                        style={
                            styles.reactionArea
                        }
                    >
                        {reactionTrayVisible && (
                            <>
                                <Pressable
                                    style={
                                        styles.reactionDismissArea
                                    }
                                    onPress={() =>
                                        closeReactionTray()
                                    }
                                />

                                <Animated.View
                                    style={[
                                        styles.reactionTray,

                                        {
                                            backgroundColor:
                                                theme.reactionTray,

                                            borderColor:
                                                theme.reactionTrayBorder,

                                            shadowColor:
                                                theme.shadow,

                                            opacity:
                                                trayAnimation,

                                            transform: [
                                                {
                                                    translateY:
                                                        trayAnimation.interpolate({
                                                            inputRange:
                                                                [
                                                                    0,
                                                                    1,
                                                                ],

                                                            outputRange:
                                                                [
                                                                    12,
                                                                    0,
                                                                ],
                                                        }),
                                                },

                                                {
                                                    scale:
                                                        trayAnimation.interpolate({
                                                            inputRange:
                                                                [
                                                                    0,
                                                                    1,
                                                                ],

                                                            outputRange:
                                                                [
                                                                    0.9,
                                                                    1,
                                                                ],
                                                        }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    {REACTION_OPTIONS.map(
                                        (
                                            reaction
                                        ) => {
                                            const optionAnimation =
                                                optionAnimations[
                                                reaction.type
                                                ];

                                            const selected =
                                                selectedReaction?.type ===
                                                reaction.type;

                                            return (
                                                <Animated.View
                                                    key={
                                                        reaction.type
                                                    }
                                                    style={{
                                                        opacity:
                                                            optionAnimation,

                                                        transform:
                                                            [
                                                                {
                                                                    translateY:
                                                                        optionAnimation.interpolate({
                                                                            inputRange:
                                                                                [
                                                                                    0,
                                                                                    1,
                                                                                ],

                                                                            outputRange:
                                                                                [
                                                                                    10,
                                                                                    0,
                                                                                ],
                                                                        }),
                                                                },

                                                                {
                                                                    scale:
                                                                        optionAnimation.interpolate({
                                                                            inputRange:
                                                                                [
                                                                                    0,
                                                                                    1,
                                                                                ],

                                                                            outputRange:
                                                                                [
                                                                                    0.65,
                                                                                    1,
                                                                                ],
                                                                        }),
                                                                },
                                                            ],
                                                    }}
                                                >
                                                    <Pressable
                                                        disabled={
                                                            updatingReaction
                                                        }
                                                        accessibilityRole="button"
                                                        accessibilityLabel={
                                                            reaction.label
                                                        }
                                                        onPress={() =>
                                                            handleReactionPress(
                                                                reaction.type
                                                            )
                                                        }
                                                        style={({
                                                            pressed,
                                                        }) => [
                                                                styles.reactionOption,

                                                                selected && {
                                                                    backgroundColor:
                                                                        theme.selectedChip,

                                                                    borderColor:
                                                                        theme.selectedBorder,
                                                                },

                                                                pressed &&
                                                                styles.reactionOptionPressed,
                                                            ]}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.reactionOptionEmoji
                                                            }
                                                        >
                                                            {
                                                                reaction.emoji
                                                            }
                                                        </Text>
                                                    </Pressable>
                                                </Animated.View>
                                            );
                                        }
                                    )}
                                </Animated.View>
                            </>
                        )}

                        <Animated.View
                            style={{
                                transform: [
                                    {
                                        scale:
                                            mainReactionScale,
                                    },
                                ],
                            }}
                        >
                            <Pressable
                                disabled={
                                    updatingReaction
                                }
                                onPress={
                                    handleMainReactionPress
                                }
                                style={({
                                    pressed,
                                }) => [
                                        styles.combinedReactionButton,

                                        pressed && {
                                            backgroundColor:
                                                theme.reactionButtonPressed,
                                        },

                                        updatingReaction &&
                                        styles.reactionButtonDisabled,
                                    ]}
                            >
                                {visibleReactionSummary.length >
                                    0 ? (
                                    <>
                                        <View
                                            style={
                                                styles.reactionSummaryIcons
                                            }
                                        >
                                            {visibleReactionSummary.map(
                                                (
                                                    reaction,
                                                    index
                                                ) => (
                                                    <Animated.View
                                                        key={
                                                            reaction.type
                                                        }
                                                        style={[
                                                            styles.reactionSummaryIconWrap,

                                                            index >
                                                            0 && {
                                                                marginLeft:
                                                                    -s(
                                                                        7
                                                                    ),
                                                            },

                                                            {
                                                                zIndex:
                                                                    visibleReactionSummary.length -
                                                                    index,
                                                            },
                                                        ]}
                                                    >
                                                        <Animated.Text
                                                            style={[
                                                                styles.reactionSummaryEmoji,

                                                                reaction.selected && {
                                                                    transform:
                                                                        [
                                                                            {
                                                                                scale:
                                                                                    selectedReactionScale,
                                                                            },
                                                                        ],
                                                                },
                                                            ]}
                                                        >
                                                            {
                                                                reaction.emoji
                                                            }
                                                        </Animated.Text>
                                                    </Animated.View>
                                                )
                                            )}
                                        </View>

                                        <Text
                                            style={[
                                                styles.actionCount,

                                                {
                                                    color:
                                                        theme.textSoft,
                                                },
                                            ]}
                                        >
                                            {totalReactions}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons
                                            name="flash-outline"
                                            size={16}
                                            color={
                                                theme.muted
                                            }
                                        />

                                        <Text
                                            style={[
                                                styles.reactionLabel,

                                                {
                                                    color:
                                                        theme.textSoft,
                                                },
                                            ]}
                                        >
                                            React
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </Animated.View>
                    </View>
                </View>

                {/* Subscriber Social Link */}

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
                            size={15}
                            color={getSocialIconColor(
                                author?.socialMediaPlatform,

                                mode ===
                                "night"
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

                        <Ionicons
                            name="open-outline"
                            size={12}
                            color={
                                theme.muted
                            }
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles =
    StyleSheet.create({
        card: {
            position:
                "relative",

            borderBottomWidth: 1,

            paddingHorizontal:
                s(14),

            paddingTop:
                vs(11),

            paddingBottom:
                vs(10),

            overflow:
                "visible",

            zIndex: 1,
        },

        glitterLayer: {
            ...StyleSheet.absoluteFillObject,

            overflow:
                "hidden",

            pointerEvents:
                "none",
        },

        shimmerLine: {
            position:
                "absolute",

            top:
                -vs(45),

            width:
                s(28),

            height:
                vs(230),

            borderRadius: 999,
        },

        sparkle: {
            position:
                "absolute",

            fontWeight:
                "900",
        },

        sparkleOne: {
            top:
                vs(8),

            right:
                s(54),

            fontSize:
                ms(12),
        },

        sparkleTwo: {
            top:
                vs(34),

            right:
                s(15),

            fontSize:
                ms(9),
        },

        sparkleThree: {
            bottom:
                vs(12),

            left:
                s(116),

            fontSize:
                ms(10),
        },

        sparkleFour: {
            bottom:
                vs(34),

            right:
                s(88),

            fontSize:
                ms(8),
        },

        sparkleFive: {
            top:
                vs(48),

            left:
                s(72),

            fontSize:
                ms(10),
        },

        sparkleSix: {
            bottom:
                vs(8),

            right:
                s(26),

            fontSize:
                ms(8),
        },

        sparkleSeven: {
            top:
                vs(14),

            left:
                s(132),

            fontSize:
                ms(9),
        },

        headerRow: {
            flexDirection: "row",

            alignItems:
                "flex-start",

            zIndex: 2,
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
            maxWidth: "76%",

            fontSize:
                ms(15),

            lineHeight:
                ms(18),

            fontFamily:
                "Rajdhani_700Bold",
        },

        diamondEmoji: {
            fontSize:
                ms(13),

            lineHeight:
                ms(17),
        },

        schoolRow: {
            flexDirection: "row",

            alignItems: "center",

            marginTop:
                vs(2),

            minWidth: 0,
        },

        collegeEmoji: {
            fontSize:
                ms(10.5),

            marginRight:
                s(4),
        },

        classificationText: {
            fontFamily:
                "Rajdhani_700Bold",

            letterSpacing:
                0.2,
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

            zIndex: 2,
        },

        dumpImage: {
            width: "100%",

            height:
                vs(185),

            borderRadius: 15,

            marginTop:
                vs(10),

            zIndex: 2,
        },

        bottomActionRow: {
            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "space-between",

            marginTop:
                vs(9),

            minHeight:
                vs(30),

            zIndex: 20,
        },

        leftActions: {
            flexDirection: "row",

            alignItems: "center",

            flexShrink: 1,

            gap:
                s(7),

            zIndex: 30,
        },

        commentButton: {
            minHeight:
                vs(29),

            flexDirection: "row",

            alignItems: "center",

            gap:
                s(4),

            paddingHorizontal:
                s(6),
        },

        actionCount: {
            fontSize:
                ms(10),

            fontWeight:
                "900",
        },

        reactionArea: {
            position:
                "relative",

            zIndex: 100,
        },

        reactionDismissArea: {
            position:
                "absolute",

            left:
                -s(140),

            right:
                -s(180),

            top:
                -vs(240),

            bottom:
                -vs(120),

            zIndex: 90,
        },

        reactionTray: {
            position:
                "absolute",

            left:
                -s(3),

            bottom:
                vs(36),

            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                s(5),

            minHeight:
                vs(48),

            borderWidth: 1,

            borderRadius: 999,

            paddingHorizontal:
                s(7),

            paddingVertical:
                vs(4),

            shadowOpacity: 0.24,

            shadowRadius: 12,

            shadowOffset: {
                width: 0,
                height: 5,
            },

            elevation: 18,

            zIndex: 100,
        },

        reactionOption: {
            width:
                s(40),

            height:
                s(40),

            borderRadius:
                s(20),

            alignItems:
                "center",

            justifyContent:
                "center",

            borderWidth: 1,

            borderColor:
                "transparent",
        },

        reactionOptionPressed: {
            transform: [
                {
                    scale: 0.9,
                },
            ],
        },

        reactionOptionEmoji: {
            fontSize:
                ms(22),

            lineHeight:
                ms(27),
        },

        combinedReactionButton: {
            minHeight:
                vs(29),

            flexDirection:
                "row",

            alignItems: "center",

            justifyContent:
                "center",

            gap:
                s(5),

            borderRadius: 999,

            paddingHorizontal:
                s(6),

            paddingVertical:
                vs(2),
        },

        reactionButtonDisabled: {
            opacity: 0.64,
        },

        reactionSummaryIcons: {
            flexDirection:
                "row",

            alignItems:
                "center",

            paddingLeft:
                s(1),
        },

        reactionSummaryIconWrap: {
            width:
                s(23),

            height:
                s(23),

            borderRadius:
                s(12),

            alignItems:
                "center",

            justifyContent:
                "center",
        },

        reactionSummaryEmoji: {
            fontSize:
                ms(16),

            lineHeight:
                ms(20),
        },

        reactionLabel: {
            fontSize:
                ms(10),

            fontWeight:
                "800",
        },

        socialMediaButton: {
            maxWidth: "40%",

            minHeight:
                vs(29),

            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "flex-end",

            gap:
                s(5),

            marginLeft:
                s(8),

            paddingHorizontal:
                s(4),

            paddingVertical:
                vs(3),
        },

        socialUsername: {
            flexShrink: 1,

            fontSize:
                ms(10),

            fontWeight:
                "800",
        },
    });