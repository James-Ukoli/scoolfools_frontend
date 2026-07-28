import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
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
} from "@react-navigation/native";

import Ionicons from "@expo/vector-icons/Ionicons";

import {
    s,
    vs,
    ms,
} from "react-native-size-matters";

import {
    createDump,
    getMyDumps,
} from "../api/studentDumpApi";

import {
    TimeTheme,
    useTimeTheme,
} from "../context/TimeThemeContext";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const MAX_CHARACTERS = 250;

const professorFoolsAvatar = require(
    "../../assets/images/profileimages/professorFools.png"
);

type StoredUser = {
    _id?: string;
    id?: string;

    username?: string | null;

    isSubscribed?: boolean;

    schoolLevel?:
    | "college"
    | "highSchool";

    collegeName?: string | null;

    highSchoolClassification?:
    | string
    | null;
};

type SubmissionStage =
    | "idle"
    | "checking"
    | "approved"
    | "blocked"
    | "posting";

const getCreateDumpTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            bg: "#F8FAFC",
            card: "#FFFFFF",
            cardAlt: "#ECFEFF",
            input: "#FFFFFF",

            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",

            border:
                "rgba(7,17,31,0.10)",

            cyan: "#06B6D4",
            cyanDark: "#0891B2",
            cyanSoft:
                "rgba(6,182,212,0.11)",

            yellow: "#FACC15",
            yellowSoft:
                "rgba(250,204,21,0.16)",

            green: "#22C55E",
            greenSoft:
                "rgba(34,197,94,0.12)",

            red: "#EF4444",
            redSoft:
                "rgba(239,68,68,0.10)",

            darkText: "#07111F",

            shadow:
                "rgba(6,182,212,0.22)",
        };
    }

    return {
        bg: "#020617",
        card: "#090D14",
        cardAlt: "#07111F",
        input: "#111827",

        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",

        border:
            "rgba(255,255,255,0.10)",

        cyan: "#22D3EE",
        cyanDark: "#06B6D4",
        cyanSoft:
            "rgba(34,211,238,0.12)",

        yellow: "#FACC15",
        yellowSoft:
            "rgba(250,204,21,0.13)",

        green: "#35D07F",
        greenSoft:
            "rgba(53,208,127,0.12)",

        red: "#FF7A7A",
        redSoft:
            "rgba(255,122,122,0.10)",

        darkText: "#07111F",

        shadow:
            "rgba(34,211,238,0.18)",
    };
};

const isDateToday = (
    value?: string | null
) => {
    if (!value) {
        return false;
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return false;
    }

    const today = new Date();

    return (
        date.getFullYear() ===
        today.getFullYear() &&
        date.getMonth() ===
        today.getMonth() &&
        date.getDate() ===
        today.getDate()
    );
};

const getClassificationLabel = (
    classification?: string | null
) => {
    if (!classification) {
        return "High School Nationwide";
    }

    return `${classification
            .charAt(0)
            .toUpperCase() +
        classification.slice(1)
        } • High School Nationwide`;
};

/*
|--------------------------------------------------------------------------
| Screen
|--------------------------------------------------------------------------
*/

export default function CreateDumpScreen() {
    const navigation =
        useNavigation<any>();

    const { mode } =
        useTimeTheme();

    const theme =
        useMemo(
            () =>
                getCreateDumpTheme(
                    mode
                ),
            [mode]
        );

    const styles =
        useMemo(
            () =>
                createStyles(
                    theme
                ),
            [theme]
        );

    const [
        currentUser,
        setCurrentUser,
    ] =
        useState<StoredUser | null>(
            null
        );

    const [
        content,
        setContent,
    ] = useState("");

    const [
        anonymous,
        setAnonymous,
    ] = useState(false);

    const [
        dailyUsed,
        setDailyUsed,
    ] = useState(0);

    const [
        loadingLimit,
        setLoadingLimit,
    ] = useState(true);

    const [
        submissionStage,
        setSubmissionStage,
    ] =
        useState<SubmissionStage>(
            "idle"
        );

    const [
        moderationMessage,
        setModerationMessage,
    ] = useState(
        "Professor Fools will review your dump before it reaches the feed."
    );

    const scanAnimation =
        useRef(
            new Animated.Value(0)
        ).current;

    const professorAnimation =
        useRef(
            new Animated.Value(0)
        ).current;

    const professorPulse =
        useRef(
            new Animated.Value(0)
        ).current;

    const approvedAnimation =
        useRef(
            new Animated.Value(0)
        ).current;

    const isSubscribed =
        Boolean(
            currentUser?.isSubscribed
        );

    const dailyLimit =
        isSubscribed
            ? 5
            : 1;

    const dailyRemaining =
        Math.max(
            dailyLimit -
            dailyUsed,
            0
        );

    const limitReached =
        dailyRemaining <= 0;

    const trimmedContent =
        content.trim();

    const characterCount =
        content.length;

    const canSubmit =
        Boolean(
            trimmedContent
        ) &&
        !limitReached &&
        submissionStage ===
        "idle";

    const studentDestination =
        currentUser
            ?.schoolLevel ===
            "highSchool"
            ? getClassificationLabel(
                currentUser
                    ?.highSchoolClassification
            )
            : `${currentUser
                ?.collegeName ||
            "College"
            } • College Nationwide`;

    /*
    |--------------------------------------------------------------------------
    | Load User And Daily Usage
    |--------------------------------------------------------------------------
    */

    const loadUserAndLimit =
        useCallback(async () => {
            try {
                setLoadingLimit(
                    true
                );

                const storedUser =
                    await AsyncStorage.getItem(
                        "user"
                    );

                let parsedUser:
                    StoredUser | null =
                    null;

                if (storedUser) {
                    parsedUser =
                        JSON.parse(
                            storedUser
                        );

                    setCurrentUser(
                        parsedUser
                    );
                }

                const response =
                    await getMyDumps(
                        1,
                        50
                    );

                const dumpsToday =
                    (
                        response.dumps ||
                        []
                    ).filter(
                        (dump) =>
                            isDateToday(
                                dump.created_at
                            )
                    );

                /*
                 * Deleted dumps remain in the daily limit on the backend.
                 * If getMyDumps only returns active dumps, the backend remains
                 * the final authority when createDump is submitted.
                 */

                setDailyUsed(
                    dumpsToday.length
                );
            } catch (error) {
                console.log(
                    "Create Dump limit load error:",
                    error
                );
            } finally {
                setLoadingLimit(
                    false
                );
            }
        }, []);

    useFocusEffect(
        useCallback(() => {
            loadUserAndLimit();
        }, [loadUserAndLimit])
    );

    /*
    |--------------------------------------------------------------------------
    | Scanner Animation
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const scannerLoop =
            Animated.loop(
                Animated.sequence([
                    Animated.timing(
                        scanAnimation,
                        {
                            toValue: 1,
                            duration:
                                1300,
                            easing:
                                Easing.inOut(
                                    Easing.ease
                                ),
                            useNativeDriver:
                                true,
                        }
                    ),

                    Animated.timing(
                        scanAnimation,
                        {
                            toValue: 0,
                            duration:
                                1300,
                            easing:
                                Easing.inOut(
                                    Easing.ease
                                ),
                            useNativeDriver:
                                true,
                        }
                    ),
                ])
            );

        scannerLoop.start();

        return () => {
            scannerLoop.stop();
        };
    }, [scanAnimation]);

    /*
    |--------------------------------------------------------------------------
    | Professor Fools Idle Animation
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const floatingLoop =
            Animated.loop(
                Animated.sequence([
                    Animated.timing(
                        professorAnimation,
                        {
                            toValue: 1,
                            duration:
                                1400,
                            easing:
                                Easing.inOut(
                                    Easing.ease
                                ),
                            useNativeDriver:
                                true,
                        }
                    ),

                    Animated.timing(
                        professorAnimation,
                        {
                            toValue: 0,
                            duration:
                                1400,
                            easing:
                                Easing.inOut(
                                    Easing.ease
                                ),
                            useNativeDriver:
                                true,
                        }
                    ),
                ])
            );

        const pulseLoop =
            Animated.loop(
                Animated.sequence([
                    Animated.timing(
                        professorPulse,
                        {
                            toValue: 1,
                            duration:
                                1000,
                            useNativeDriver:
                                true,
                        }
                    ),

                    Animated.timing(
                        professorPulse,
                        {
                            toValue: 0,
                            duration:
                                1000,
                            useNativeDriver:
                                true,
                        }
                    ),
                ])
            );

        floatingLoop.start();
        pulseLoop.start();

        return () => {
            floatingLoop.stop();
            pulseLoop.stop();
        };
    }, [
        professorAnimation,
        professorPulse,
    ]);

    const scannerTranslate =
        scanAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [
                -s(28),
                s(28),
            ],
        });

    const professorTranslate =
        professorAnimation.interpolate(
            {
                inputRange: [
                    0,
                    1,
                ],
                outputRange: [
                    0,
                    -5,
                ],
            }
        );

    const professorGlowScale =
        professorPulse.interpolate({
            inputRange: [0, 1],
            outputRange: [
                0.95,
                1.08,
            ],
        });

    const professorGlowOpacity =
        professorPulse.interpolate({
            inputRange: [0, 1],
            outputRange: [
                0.16,
                0.34,
            ],
        });

    const approvedScale =
        approvedAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [
                0.7,
                1,
            ],
        });

    const approvedOpacity =
        approvedAnimation;

    /*
    |--------------------------------------------------------------------------
    | Submit Dump
    |--------------------------------------------------------------------------
    */

    const handleSubmit =
        async () => {
            if (
                !trimmedContent
            ) {
                Alert.alert(
                    "Empty Dump",
                    "Write something before submitting your dump."
                );

                return;
            }

            if (limitReached) {
                Alert.alert(
                    "Daily Limit Reached",
                    isSubscribed
                        ? "You have used all 5 of your dumps for today."
                        : "Free students receive 1 dump per day. Subscribers receive 5."
                );

                return;
            }

            try {
                setSubmissionStage(
                    "checking"
                );

                setModerationMessage(
                    "Professor Fools is scanning your dump..."
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            900
                        )
                );

                setSubmissionStage(
                    "posting"
                );

                setModerationMessage(
                    "The scan looks good. Sending your dump to the feed..."
                );

                const response =
                    await createDump({
                        content:
                            trimmedContent,

                        anonymous,
                    });

                setDailyUsed(
                    (current) =>
                        Math.min(
                            current +
                            1,
                            dailyLimit
                        )
                );

                setSubmissionStage(
                    "approved"
                );

                setModerationMessage(
                    response?.message ||
                    "Professor Fools approved your dump."
                );

                approvedAnimation.setValue(
                    0
                );

                Animated.spring(
                    approvedAnimation,
                    {
                        toValue: 1,
                        tension: 90,
                        friction: 7,
                        useNativeDriver:
                            true,
                    }
                ).start();

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            1000
                        )
                );

                navigation.goBack();
            } catch (error: any) {
                console.log(
                    "Create Dump error:",
                    error
                );

                setSubmissionStage(
                    "blocked"
                );

                setModerationMessage(
                    error?.message ||
                    "Professor Fools could not approve this dump."
                );

                Alert.alert(
                    "Professor Fools Says No",
                    error?.message ||
                    "Your dump could not be posted."
                );

                setTimeout(() => {
                    setSubmissionStage(
                        "idle"
                    );

                    setModerationMessage(
                        "Professor Fools will review your dump before it reaches the feed."
                    );
                }, 1800);
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <SafeAreaView
            edges={[
                "top",
                "left",
                "right",
                "bottom",
            ]}
            style={
                styles.safeArea
            }
        >
            <KeyboardAvoidingView
                style={
                    styles.keyboardView
                }
                behavior={
                    Platform.OS ===
                        "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    style={
                        styles.container
                    }
                    contentContainerStyle={
                        styles.contentContainer
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    {/* Header */}

                    <View
                        style={
                            styles.header
                        }
                    >
                        <TouchableOpacity
                            activeOpacity={
                                0.75
                            }
                            onPress={() =>
                                navigation.goBack()
                            }
                            style={
                                styles.backButton
                            }
                        >
                            <Ionicons
                                name="chevron-back"
                                size={23}
                                color={
                                    theme.text
                                }
                            />
                        </TouchableOpacity>

                        <View
                            style={
                                styles.headerTitleWrap
                            }
                        >
                            <Text
                                style={
                                    styles.headerTitle
                                }
                            >
                                Create Dump
                            </Text>

                            <Text
                                style={
                                    styles.headerSubtitle
                                }
                            >
                                Say it. Dump it. Move on.
                            </Text>
                        </View>

                        <View
                            style={
                                styles.headerSpacer
                            }
                        />
                    </View>

                    {/* Daily limit scanner */}

                    <View
                        style={
                            styles.limitCard
                        }
                    >
                        <View
                            style={
                                styles.trashScannerWrap
                            }
                        >
                            <View
                                style={
                                    styles.trashIconCircle
                                }
                            >
                                <Ionicons
                                    name="trash-bin"
                                    size={29}
                                    color={
                                        limitReached
                                            ? theme.red
                                            : theme.cyan
                                    }
                                />

                                {!limitReached && (
                                    <Animated.View
                                        pointerEvents="none"
                                        style={[
                                            styles.scannerLine,
                                            {
                                                backgroundColor:
                                                    theme.yellow,

                                                transform:
                                                    [
                                                        {
                                                            translateY:
                                                                scannerTranslate,
                                                        },
                                                    ],
                                            },
                                        ]}
                                    />
                                )}
                            </View>

                            <View
                                style={
                                    styles.limitCountBubble
                                }
                            >
                                {loadingLimit ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={
                                            theme.darkText
                                        }
                                    />
                                ) : (
                                    <Text
                                        style={
                                            styles.limitCountText
                                        }
                                    >
                                        {
                                            dailyRemaining
                                        }
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View
                            style={
                                styles.limitContent
                            }
                        >
                            <Text
                                style={
                                    styles.limitEyebrow
                                }
                            >
                                DAILY DUMP LIMIT
                            </Text>

                            <Text
                                style={[
                                    styles.limitTitle,

                                    limitReached && {
                                        color:
                                            theme.red,
                                    },
                                ]}
                            >
                                {loadingLimit
                                    ? "Checking your trash can..."
                                    : limitReached
                                        ? "Trash can full for today"
                                        : `${dailyRemaining} dump${dailyRemaining ===
                                            1
                                            ? ""
                                            : "s"
                                        } remaining`}
                            </Text>

                            <Text
                                style={
                                    styles.limitSubtitle
                                }
                            >
                                {isSubscribed
                                    ? `${dailyUsed} of 5 used today`
                                    : `${dailyUsed} of 1 used today • Subscribers get 5`}
                            </Text>
                        </View>
                    </View>

                    {/* Destination */}

                    <View
                        style={
                            styles.destinationCard
                        }
                    >
                        <View
                            style={
                                styles.destinationIcon
                            }
                        >
                            <Ionicons
                                name={
                                    currentUser
                                        ?.schoolLevel ===
                                        "highSchool"
                                        ? "book"
                                        : "school"
                                }
                                size={18}
                                color={
                                    theme.cyan
                                }
                            />
                        </View>

                        <View
                            style={
                                styles.destinationContent
                            }
                        >
                            <Text
                                style={
                                    styles.destinationLabel
                                }
                            >
                                POSTING TO
                            </Text>

                            <Text
                                style={
                                    styles.destinationText
                                }
                                numberOfLines={
                                    2
                                }
                            >
                                {
                                    studentDestination
                                }
                            </Text>
                        </View>

                        <Ionicons
                            name="globe-outline"
                            size={19}
                            color={
                                theme.muted
                            }
                        />
                    </View>

                    {/* Composer */}

                    <View
                        style={
                            styles.composerCard
                        }
                    >
                        <TextInput
                            value={
                                content
                            }
                            onChangeText={
                                setContent
                            }
                            editable={
                                submissionStage ===
                                "idle"
                            }
                            placeholder="What's going on at school?"
                            placeholderTextColor={
                                theme.muted
                            }
                            multiline
                            maxLength={
                                MAX_CHARACTERS
                            }
                            textAlignVertical="top"
                            autoFocus
                            style={
                                styles.input
                            }
                        />

                        <View
                            style={
                                styles.composerFooter
                            }
                        >
                            <View
                                style={
                                    styles.characterProgressWrap
                                }
                            >
                                <View
                                    style={
                                        styles.characterTrack
                                    }
                                >
                                    <View
                                        style={[
                                            styles.characterFill,

                                            {
                                                width: `${Math.min(
                                                    characterCount /
                                                    MAX_CHARACTERS,
                                                    1
                                                ) *
                                                    100}%`,

                                                backgroundColor:
                                                    characterCount >
                                                        225
                                                        ? theme.red
                                                        : theme.cyan,
                                            },
                                        ]}
                                    />
                                </View>

                                <Text
                                    style={[
                                        styles.characterCount,

                                        {
                                            color:
                                                characterCount >
                                                    225
                                                    ? theme.red
                                                    : theme.muted,
                                        },
                                    ]}
                                >
                                    {
                                        characterCount
                                    }
                                    /
                                    {
                                        MAX_CHARACTERS
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Anonymous toggle */}

                    <View
                        style={
                            styles.anonymousCard
                        }
                    >
                        <View
                            style={
                                styles.anonymousIcon
                            }
                        >
                            <Ionicons
                                name={
                                    anonymous
                                        ? "eye-off"
                                        : "person"
                                }
                                size={19}
                                color={
                                    anonymous
                                        ? theme.yellow
                                        : theme.cyan
                                }
                            />
                        </View>

                        <View
                            style={
                                styles.anonymousContent
                            }
                        >
                            <Text
                                style={
                                    styles.anonymousTitle
                                }
                            >
                                Post Anonymously
                            </Text>

                            <Text
                                style={
                                    styles.anonymousSubtitle
                                }
                            >
                                Your username and profile will be hidden.
                            </Text>
                        </View>

                        <Switch
                            value={
                                anonymous
                            }
                            onValueChange={
                                setAnonymous
                            }
                            disabled={
                                submissionStage !==
                                "idle"
                            }
                            trackColor={{
                                false:
                                    theme.border,

                                true:
                                    theme.cyan,
                            }}
                            thumbColor={
                                Platform.OS ===
                                    "android"
                                    ? "#FFFFFF"
                                    : undefined
                            }
                        />
                    </View>

                    {/* Professor Fools moderation */}

                    <View
                        style={[
                            styles.professorCard,

                            submissionStage ===
                            "approved" && {
                                borderColor:
                                    theme.green,

                                backgroundColor:
                                    theme.greenSoft,
                            },

                            submissionStage ===
                            "blocked" && {
                                borderColor:
                                    theme.red,

                                backgroundColor:
                                    theme.redSoft,
                            },
                        ]}
                    >
                        <View
                            style={
                                styles.professorVisualWrap
                            }
                        >
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.professorGlow,

                                    {
                                        backgroundColor:
                                            submissionStage ===
                                                "approved"
                                                ? theme.green
                                                : submissionStage ===
                                                    "blocked"
                                                    ? theme.red
                                                    : theme.cyan,

                                        opacity:
                                            professorGlowOpacity,

                                        transform:
                                            [
                                                {
                                                    scale:
                                                        professorGlowScale,
                                                },
                                            ],
                                    },
                                ]}
                            />

                            <Animated.View
                                style={{
                                    transform:
                                        [
                                            {
                                                translateY:
                                                    professorTranslate,
                                            },
                                        ],
                                }}
                            >
                                <Image
                                    source={
                                        professorFoolsAvatar
                                    }
                                    style={
                                        styles.professorAvatar
                                    }
                                    resizeMode="contain"
                                />
                            </Animated.View>

                            {submissionStage ===
                                "approved" && (
                                    <Animated.View
                                        style={[
                                            styles.approvedBadge,

                                            {
                                                opacity:
                                                    approvedOpacity,

                                                transform:
                                                    [
                                                        {
                                                            scale:
                                                                approvedScale,
                                                        },
                                                    ],
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="checkmark"
                                            size={14}
                                            color="#FFFFFF"
                                        />
                                    </Animated.View>
                                )}
                        </View>

                        <View
                            style={
                                styles.professorContent
                            }
                        >
                            <Text
                                style={[
                                    styles.professorName,

                                    submissionStage ===
                                    "approved" && {
                                        color:
                                            theme.green,
                                    },

                                    submissionStage ===
                                    "blocked" && {
                                        color:
                                            theme.red,
                                    },
                                ]}
                            >
                                Professor Fools
                            </Text>

                            <View
                                style={
                                    styles.professorStatusRow
                                }
                            >
                                {(submissionStage ===
                                    "checking" ||
                                    submissionStage ===
                                    "posting") && (
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                theme.cyan
                                            }
                                        />
                                    )}

                                <Text
                                    style={
                                        styles.professorMessage
                                    }
                                >
                                    {
                                        moderationMessage
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Post button */}

                    <TouchableOpacity
                        activeOpacity={
                            0.86
                        }
                        disabled={
                            !canSubmit
                        }
                        onPress={
                            handleSubmit
                        }
                        style={[
                            styles.submitButton,

                            {
                                backgroundColor:
                                    canSubmit
                                        ? theme.yellow
                                        : theme.border,
                            },
                        ]}
                    >
                        {submissionStage ===
                            "checking" ||
                            submissionStage ===
                            "posting" ? (
                            <ActivityIndicator
                                size="small"
                                color={
                                    theme.darkText
                                }
                            />
                        ) : (
                            <Ionicons
                                name="trash-bin"
                                size={19}
                                color={
                                    canSubmit
                                        ? theme.darkText
                                        : theme.muted
                                }
                            />
                        )}

                        <Text
                            style={[
                                styles.submitButtonText,

                                {
                                    color:
                                        canSubmit
                                            ? theme.darkText
                                            : theme.muted,
                                },
                            ]}
                        >
                            {limitReached
                                ? "Daily Limit Reached"
                                : submissionStage ===
                                    "checking"
                                    ? "Professor Fools Is Checking..."
                                    : submissionStage ===
                                        "posting"
                                        ? "Posting Dump..."
                                        : submissionStage ===
                                            "approved"
                                            ? "Dump Approved"
                                            : "Dump It"}
                        </Text>
                    </TouchableOpacity>

                    {!isSubscribed && (
                        <Text
                            style={
                                styles.upgradeText
                            }
                        >
                            Subscribers can post up to 5 dumps every day.
                        </Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const createStyles = (
    theme: ReturnType<
        typeof getCreateDumpTheme
    >
) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,

            backgroundColor:
                theme.bg,
        },

        keyboardView: {
            flex: 1,
        },

        container: {
            flex: 1,

            backgroundColor:
                theme.bg,
        },

        contentContainer: {
            paddingHorizontal:
                s(15),

            paddingTop: vs(8),

            paddingBottom:
                Platform.OS ===
                    "android"
                    ? vs(55)
                    : vs(35),
        },

        header: {
            minHeight: vs(51),

            flexDirection: "row",

            alignItems: "center",

            marginBottom: vs(12),
        },

        backButton: {
            width: s(37),

            height: s(37),

            borderRadius: s(18.5),

            alignItems: "center",

            justifyContent:
                "center",

            backgroundColor:
                theme.card,

            borderWidth: 1,

            borderColor:
                theme.border,
        },

        headerTitleWrap: {
            flex: 1,

            alignItems: "center",
        },

        headerTitle: {
            color: theme.text,

            fontSize: ms(20),

            lineHeight: ms(22),

            fontFamily:
                "Rajdhani_700Bold",
        },

        headerSubtitle: {
            color:
                theme.textSoft,

            marginTop: 1,

            fontSize: ms(8.5),

            fontWeight: "700",
        },

        headerSpacer: {
            width: s(37),
        },

        limitCard: {
            minHeight: vs(76),

            borderRadius: 18,

            backgroundColor:
                theme.card,

            borderWidth: 1,

            borderColor:
                theme.border,

            paddingHorizontal:
                s(12),

            paddingVertical:
                vs(10),

            flexDirection: "row",

            alignItems: "center",

            shadowColor:
                theme.shadow,

            shadowOpacity: 0.14,

            shadowRadius: 12,

            shadowOffset: {
                width: 0,
                height: 5,
            },

            elevation: 3,

            marginBottom: vs(10),
        },

        trashScannerWrap: {
            width: s(62),

            height: s(62),

            alignItems: "center",

            justifyContent:
                "center",

            marginRight: s(10),
        },

        trashIconCircle: {
            width: s(53),

            height: s(53),

            borderRadius: s(17),

            alignItems: "center",

            justifyContent:
                "center",

            overflow: "hidden",

            backgroundColor:
                theme.cyanSoft,

            borderWidth: 1,

            borderColor:
                theme.cyan,
        },

        scannerLine: {
            position: "absolute",

            left: 5,

            right: 5,

            height: 2,

            borderRadius: 999,

            shadowColor:
                theme.yellow,

            shadowOpacity: 0.8,

            shadowRadius: 5,

            elevation: 4,
        },

        limitCountBubble: {
            position: "absolute",

            right: 0,

            top: 0,

            minWidth: s(23),

            height: s(23),

            borderRadius: s(11.5),

            paddingHorizontal: 4,

            alignItems: "center",

            justifyContent:
                "center",

            backgroundColor:
                theme.yellow,

            borderWidth: 2,

            borderColor:
                theme.card,
        },

        limitCountText: {
            color:
                theme.darkText,

            fontSize: ms(10),

            lineHeight: ms(12),

            fontWeight: "900",
        },

        limitContent: {
            flex: 1,

            minWidth: 0,
        },

        limitEyebrow: {
            color: theme.cyan,

            fontSize: ms(8),

            fontFamily:
                "Rajdhani_700Bold",

            letterSpacing: 0.9,
        },

        limitTitle: {
            color: theme.text,

            marginTop: 2,

            fontSize: ms(15),

            lineHeight: ms(17),

            fontFamily:
                "Rajdhani_700Bold",
        },

        limitSubtitle: {
            color:
                theme.textSoft,

            marginTop: 2,

            fontSize: ms(8.5),

            lineHeight: ms(11),

            fontWeight: "700",
        },

        destinationCard: {
            minHeight: vs(52),

            borderRadius: 15,

            backgroundColor:
                theme.cardAlt,

            borderWidth: 1,

            borderColor:
                theme.border,

            paddingHorizontal:
                s(11),

            paddingVertical:
                vs(8),

            flexDirection: "row",

            alignItems: "center",

            marginBottom: vs(10),
        },

        destinationIcon: {
            width: s(34),

            height: s(34),

            borderRadius: s(11),

            alignItems: "center",

            justifyContent:
                "center",

            backgroundColor:
                theme.cyanSoft,

            marginRight: s(9),
        },

        destinationContent: {
            flex: 1,

            minWidth: 0,
        },

        destinationLabel: {
            color: theme.cyan,

            fontSize: ms(7.5),

            fontFamily:
                "Rajdhani_700Bold",

            letterSpacing: 0.8,
        },

        destinationText: {
            color: theme.text,

            marginTop: 1,

            fontSize: ms(10.5),

            lineHeight: ms(13),

            fontFamily:
                "Rajdhani_700Bold",
        },

        composerCard: {
            minHeight: vs(165),

            borderRadius: 18,

            backgroundColor:
                theme.input,

            borderWidth: 1,

            borderColor:
                theme.border,

            overflow: "hidden",

            marginBottom: vs(10),
        },

        input: {
            minHeight: vs(132),

            color: theme.text,

            paddingHorizontal:
                s(13),

            paddingTop: vs(12),

            paddingBottom:
                vs(8),

            fontSize: ms(14),

            lineHeight: ms(19),

            fontWeight: "600",
        },

        composerFooter: {
            minHeight: vs(32),

            paddingHorizontal:
                s(12),

            paddingBottom: vs(8),

            justifyContent:
                "center",
        },

        characterProgressWrap: {
            flexDirection: "row",

            alignItems: "center",

            gap: s(8),
        },

        characterTrack: {
            flex: 1,

            height: 3,

            borderRadius: 999,

            overflow: "hidden",

            backgroundColor:
                theme.border,
        },

        characterFill: {
            height: "100%",

            borderRadius: 999,
        },

        characterCount: {
            width: s(42),

            textAlign: "right",

            fontSize: ms(8.5),

            fontWeight: "800",
        },

        anonymousCard: {
            minHeight: vs(58),

            borderRadius: 16,

            backgroundColor:
                theme.card,

            borderWidth: 1,

            borderColor:
                theme.border,

            paddingHorizontal:
                s(11),

            paddingVertical:
                vs(8),

            flexDirection: "row",

            alignItems: "center",

            marginBottom: vs(10),
        },

        anonymousIcon: {
            width: s(36),

            height: s(36),

            borderRadius: s(12),

            alignItems: "center",

            justifyContent:
                "center",

            backgroundColor:
                theme.cyanSoft,

            marginRight: s(9),
        },

        anonymousContent: {
            flex: 1,

            minWidth: 0,

            paddingRight: s(8),
        },

        anonymousTitle: {
            color: theme.text,

            fontSize: ms(11.5),

            lineHeight: ms(14),

            fontFamily:
                "Rajdhani_700Bold",
        },

        anonymousSubtitle: {
            color: theme.muted,

            marginTop: 1,

            fontSize: ms(8),

            lineHeight: ms(10),

            fontWeight: "700",
        },

        professorCard: {
            minHeight: vs(83),

            borderRadius: 18,

            backgroundColor:
                theme.card,

            borderWidth: 1,

            borderColor:
                theme.cyan,

            paddingHorizontal:
                s(11),

            paddingVertical:
                vs(9),

            flexDirection: "row",

            alignItems: "center",

            marginBottom: vs(13),

            overflow: "hidden",
        },

        professorVisualWrap: {
            width: s(66),

            height: s(66),

            alignItems: "center",

            justifyContent:
                "center",

            marginRight: s(10),
        },

        professorGlow: {
            position: "absolute",

            width: s(59),

            height: s(59),

            borderRadius: s(29.5),
        },

        professorAvatar: {
            width: s(60),

            height: s(60),
        },

        approvedBadge: {
            position: "absolute",

            right: 1,

            bottom: 1,

            width: s(23),

            height: s(23),

            borderRadius: s(11.5),

            alignItems: "center",

            justifyContent:
                "center",

            backgroundColor:
                theme.green,

            borderWidth: 2,

            borderColor:
                theme.card,
        },

        professorContent: {
            flex: 1,

            minWidth: 0,
        },

        professorName: {
            color: theme.cyan,

            fontSize: ms(15),

            lineHeight: ms(17),

            fontFamily:
                "Rajdhani_700Bold",
        },

        professorStatusRow: {
            flexDirection: "row",

            alignItems: "center",

            marginTop: vs(4),

            gap: s(7),
        },

        professorMessage: {
            flex: 1,

            color:
                theme.textSoft,

            fontSize: ms(9),

            lineHeight: ms(12),

            fontWeight: "700",
        },

        submitButton: {
            minHeight: vs(46),

            borderRadius: 16,

            flexDirection: "row",

            alignItems: "center",

            justifyContent:
                "center",

            gap: s(7),

            shadowColor:
                theme.yellow,

            shadowOpacity: 0.18,

            shadowRadius: 10,

            shadowOffset: {
                width: 0,
                height: 5,
            },

            elevation: 3,
        },

        submitButtonText: {
            fontSize: ms(12),

            fontFamily:
                "Rajdhani_700Bold",

            letterSpacing: 0.25,
        },

        upgradeText: {
            color: theme.muted,

            marginTop: vs(8),

            fontSize: ms(8.5),

            lineHeight: ms(11),

            textAlign: "center",

            fontWeight: "700",
        },
    });