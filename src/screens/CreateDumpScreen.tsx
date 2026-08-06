import React, {
    useCallback,
    useMemo,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
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
    getDailyDumpLimit,
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

/*
 * Update this path only if your anonymous avatar uses a different filename.
 * This should point to the same anonymous profile image used on anonymous dumps.
 */
const anonymousAvatar = require(
    "../../assets/images/profileimages/anonymousAvatar.png"
);

type SubmissionStage =
    | "idle"
    | "checking"
    | "approved"
    | "blocked"
    | "posting";

type DailyLimitState = {
    allowed: boolean;
    used: number;
    remaining: number;
    dailyLimit: number;
};

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
*/

const getCreateDumpTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            background: "#F8FAFC",
            surface: "#FFFFFF",
            inputBackground: "#FFFFFF",

            text: "#07111F",
            textSoft: "#475569",
            muted: "#64748B",

            border: "rgba(7,17,31,0.11)",

            cyan: "#06B6D4",
            cyanSoft: "rgba(6,182,212,0.10)",

            yellow: "#FACC15",
            yellowPressed: "#EAB308",

            green: "#16A34A",
            greenSoft: "rgba(34,197,94,0.10)",

            red: "#DC2626",
            redSoft: "rgba(239,68,68,0.09)",

            switchOff: "#CBD5E1",
            buttonText: "#07111F",
        };
    }

    return {
        background: "#020617",
        surface: "#090D14",
        inputBackground: "#0B1220",

        text: "#FFFFFF",
        textSoft: "#CBD5E1",
        muted: "#94A3B8",

        border: "rgba(255,255,255,0.10)",

        cyan: "#22D3EE",
        cyanSoft: "rgba(34,211,238,0.10)",

        yellow: "#FACC15",
        yellowPressed: "#EAB308",

        green: "#35D07F",
        greenSoft: "rgba(53,208,127,0.10)",

        red: "#FF7A7A",
        redSoft: "rgba(255,122,122,0.10)",

        switchOff: "#334155",
        buttonText: "#07111F",
    };
};

/*
|--------------------------------------------------------------------------
| Screen
|--------------------------------------------------------------------------
*/

export default function CreateDumpScreen() {
    const navigation = useNavigation<any>();

    const { mode } = useTimeTheme();

    const theme = useMemo(
        () => getCreateDumpTheme(mode),
        [mode]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const [content, setContent] = useState("");
    const [anonymous, setAnonymous] = useState(false);

    const [dailyLimit, setDailyLimit] =
        useState<DailyLimitState>({
            allowed: true,
            used: 0,
            remaining: 1,
            dailyLimit: 1,
        });

    const [loadingLimit, setLoadingLimit] =
        useState(true);

    const [submissionStage, setSubmissionStage] =
        useState<SubmissionStage>("idle");

    const [moderationMessage, setModerationMessage] =
        useState(
            "Every dump has to pass my vibe check first. 🤨"
        );

    const trimmedContent = content.trim();
    const characterCount = content.length;

    const isBusy =
        submissionStage === "checking" ||
        submissionStage === "posting";

    const limitReached =
        !dailyLimit.allowed ||
        dailyLimit.remaining <= 0;

    const canSubmit =
        trimmedContent.length > 0 &&
        !limitReached &&
        !loadingLimit &&
        submissionStage === "idle";

    /*
    |--------------------------------------------------------------------------
    | Load True Daily Limit
    |--------------------------------------------------------------------------
    */

    const loadDailyLimit = useCallback(async () => {
        try {
            setLoadingLimit(true);

            const response =
                await getDailyDumpLimit();

            setDailyLimit({
                allowed:
                    response.limit.allowed,

                used:
                    response.limit.used,

                remaining:
                    response.limit.remaining,

                dailyLimit:
                    response.limit.dailyLimit,
            });
        } catch (error) {
            console.log(
                "Create Dump daily limit load error:",
                error
            );

            /*
             * Keep submission disabled when the true backend status
             * cannot be loaded. This prevents the UI from displaying
             * an inaccurate posting slot.
             */
            setDailyLimit((current) => ({
                ...current,
                allowed: false,
                remaining: 0,
            }));
        } finally {
            setLoadingLimit(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDailyLimit();
        }, [loadDailyLimit])
    );

    /*
    |--------------------------------------------------------------------------
    | Moderation Helpers
    |--------------------------------------------------------------------------
    */

    const resetModerationState = () => {
        setSubmissionStage("idle");

        setModerationMessage(
            "Every dump has to pass my vibe check first. 🤨"
        );
    };

    const getProfessorNameColor = () => {
        if (submissionStage === "approved") {
            return theme.green;
        }

        if (submissionStage === "blocked") {
            return theme.red;
        }

        return theme.cyan;
    };

    const getProfessorBackground = () => {
        if (submissionStage === "approved") {
            return theme.greenSoft;
        }

        if (submissionStage === "blocked") {
            return theme.redSoft;
        }

        return theme.cyanSoft;
    };

    /*
    |--------------------------------------------------------------------------
    | Submit Dump
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async () => {
        if (!trimmedContent) {
            Alert.alert(
                "Write a Dump",
                "Type something before posting."
            );

            return;
        }

        if (limitReached) {
            Alert.alert(
                "Daily Limit Reached",
                `You have used all ${dailyLimit.dailyLimit} dumps for today.`
            );

            return;
        }

        try {
            setSubmissionStage("checking");

            setModerationMessage(
                "Scanning, making sure your dump isn’t too goofy"
            );

            const response = await createDump({
                content: trimmedContent,
                anonymous,
            });

            setSubmissionStage("approved");

            setModerationMessage(
                "Alright, you good 😏"
            );

            const responseLimit =
                response.limit;

            if (responseLimit) {
                const nextRemaining =
                    Math.max(
                        responseLimit.remaining,
                        0
                    );

                setDailyLimit((current) => ({
                    allowed:
                        nextRemaining > 0,

                    used:
                        Math.max(
                            responseLimit.dailyLimit -
                            nextRemaining,
                            0
                        ),

                    remaining:
                        nextRemaining,

                    dailyLimit:
                        responseLimit.dailyLimit ||
                        current.dailyLimit,
                }));
            } else {
                await loadDailyLimit();
            }

            setContent("");
            setAnonymous(false);

            setTimeout(() => {
                navigation.goBack();
            }, 650);
        } catch (error: any) {
            console.log(
                "Create Dump error:",
                error
            );

            const message =
                error?.message ||
                "Professor Fools could not approve this dump.";

            setSubmissionStage("blocked");
            setModerationMessage(message);

            /*
             * Refresh the backend limit because a 403 may mean the
             * daily limit was reached on another screen or session.
             */
            await loadDailyLimit();

            Alert.alert(
                "Professor Fools",
                message
            );

            setTimeout(() => {
                resetModerationState();
            }, 1800);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Daily Limit Copy
    |--------------------------------------------------------------------------
    */

    const getLimitText = () => {
        if (loadingLimit) {
            return "Checking today’s dumps...";
        }

        const remaining =
            Math.max(
                dailyLimit.remaining,
                0
            );

        const dumpWord =
            remaining === 1
                ? "dump"
                : "dumps";

        return `🗑️ ${remaining} of ${dailyLimit.dailyLimit} ${dumpWord} remaining today`;
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
            style={styles.safeArea}
        >
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={
                        styles.contentContainer
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}

                    <View style={styles.header}>
                        <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() =>
                                navigation.goBack()
                            }
                            style={styles.backButton}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={theme.text}
                            />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>
                            Create Dump
                        </Text>

                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Professor Fools */}

                    <View
                        style={[
                            styles.professorSection,
                            {
                                backgroundColor:
                                    getProfessorBackground(),
                            },
                        ]}
                    >
                        <Image
                            source={professorFoolsAvatar}
                            style={styles.professorAvatar}
                            resizeMode="contain"
                        />

                        <View style={styles.professorTextWrap}>
                            <Text
                                style={[
                                    styles.professorName,
                                    {
                                        color:
                                            getProfessorNameColor(),
                                    },
                                ]}
                            >
                                Professor Fools
                            </Text>

                            <View style={styles.professorMessageRow}>
                                {isBusy && (
                                    <ActivityIndicator
                                        size="small"
                                        color={theme.cyan}
                                    />
                                )}

                                {submissionStage ===
                                    "approved" && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={17}
                                            color={theme.green}
                                        />
                                    )}

                                {submissionStage ===
                                    "blocked" && (
                                        <Ionicons
                                            name="close-circle"
                                            size={17}
                                            color={theme.red}
                                        />
                                    )}

                                <Text
                                    style={
                                        styles.professorMessage
                                    }
                                >
                                    {moderationMessage}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Main Input */}

                    <View style={styles.inputSection}>
                        <TextInput
                            value={content}
                            onChangeText={setContent}
                            editable={
                                submissionStage === "idle"
                            }
                            placeholder="Dump it.."
                            placeholderTextColor={theme.muted}
                            multiline
                            maxLength={MAX_CHARACTERS}
                            textAlignVertical="top"
                            autoFocus
                            style={styles.input}
                        />

                        <Text
                            style={[
                                styles.characterCount,
                                characterCount >= 225 && {
                                    color: theme.red,
                                },
                            ]}
                        >
                            {characterCount}/{MAX_CHARACTERS}
                        </Text>
                    </View>

                    {/* Anonymous Row */}

                    <View style={styles.anonymousRow}>
                        <Image
                            source={anonymousAvatar}
                            style={styles.anonymousAvatar}
                            resizeMode="cover"
                        />

                        <View style={styles.anonymousTextWrap}>
                            <Text style={styles.anonymousTitle}>
                                Post Anonymously
                            </Text>

                            <Text
                                style={
                                    styles.anonymousSubtitle
                                }
                            >
                                Hide your name and profile.
                            </Text>
                        </View>

                        <Switch
                            value={anonymous}
                            onValueChange={setAnonymous}
                            disabled={
                                submissionStage !== "idle"
                            }
                            trackColor={{
                                false: theme.switchOff,
                                true: theme.cyan,
                            }}
                            thumbColor={
                                Platform.OS === "android"
                                    ? "#FFFFFF"
                                    : undefined
                            }
                        />
                    </View>

                    {/* Daily Limit */}

                    <View style={styles.limitRow}>
                        {loadingLimit && (
                            <ActivityIndicator
                                size="small"
                                color={theme.cyan}
                            />
                        )}

                        <Text
                            style={[
                                styles.limitText,
                                limitReached &&
                                !loadingLimit && {
                                    color: theme.red,
                                },
                            ]}
                        >
                            {getLimitText()}
                        </Text>
                    </View>

                    {/* Submit */}

                    <TouchableOpacity
                        activeOpacity={0.86}
                        disabled={!canSubmit}
                        onPress={handleSubmit}
                        style={[
                            styles.submitButton,
                            !canSubmit &&
                            styles.submitButtonDisabled,
                        ]}
                    >
                        {isBusy ? (
                            <ActivityIndicator
                                size="small"
                                color={theme.buttonText}
                            />
                        ) : (
                            <Text style={styles.submitEmoji}>
                                🗑️
                            </Text>
                        )}

                        <Text
                            style={[
                                styles.submitButtonText,
                                !canSubmit && {
                                    color: theme.muted,
                                },
                            ]}
                        >
                            {loadingLimit
                                ? "Checking Limit..."
                                : limitReached
                                    ? "Daily Limit Reached"
                                    : submissionStage ===
                                        "checking"
                                        ? "Professor Fools Is Checking..."
                                        : submissionStage ===
                                            "posting"
                                            ? "Posting..."
                                            : submissionStage ===
                                                "approved"
                                                ? "Dump Posted"
                                                : "Dump It"}
                        </Text>
                    </TouchableOpacity>

                    {dailyLimit.dailyLimit === 1 && (
                        <Text style={styles.subscribeText}>
                            Subscribers can post 5 dumps each day.
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
                theme.background,
        },

        keyboardView: {
            flex: 1,
        },

        container: {
            flex: 1,
            backgroundColor:
                theme.background,
        },

        contentContainer: {
            paddingHorizontal: s(16),
            paddingTop: vs(6),
            paddingBottom:
                Platform.OS === "android"
                    ? vs(50)
                    : vs(32),
        },

        header: {
            minHeight: vs(48),
            flexDirection: "row",
            alignItems: "center",
            marginBottom: vs(12),
        },

        backButton: {
            width: s(38),
            height: s(38),
            alignItems: "center",
            justifyContent: "center",
        },

        headerTitle: {
            flex: 1,
            color: theme.text,
            textAlign: "center",
            fontSize: ms(21),
            lineHeight: ms(24),
            fontFamily:
                "Rajdhani_700Bold",
        },

        headerSpacer: {
            width: s(38),
        },

        professorSection: {
            minHeight: vs(82),
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: s(12),
            paddingVertical: vs(10),
            marginBottom: vs(14),
        },

        professorAvatar: {
            width: s(64),
            height: s(64),
            marginRight: s(11),
        },

        professorTextWrap: {
            flex: 1,
            minWidth: 0,
        },

        professorName: {
            fontSize: ms(16),
            lineHeight: ms(19),
            fontFamily:
                "Rajdhani_700Bold",
        },

        professorMessageRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: s(6),
            marginTop: vs(3),
        },

        professorMessage: {
            flex: 1,
            color: theme.textSoft,
            fontSize: ms(10),
            lineHeight: ms(14),
            fontWeight: "600",
        },

        inputSection: {
            minHeight: vs(185),
            backgroundColor:
                theme.inputBackground,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            marginBottom: vs(12),
            overflow: "hidden",
        },

        input: {
            minHeight: vs(150),
            color: theme.text,
            paddingHorizontal: s(14),
            paddingTop: vs(13),
            paddingBottom: vs(8),
            fontSize: ms(15),
            lineHeight: ms(21),
            fontWeight: "500",
        },

        characterCount: {
            color: theme.muted,
            textAlign: "right",
            paddingHorizontal: s(13),
            paddingBottom: vs(10),
            fontSize: ms(9),
            lineHeight: ms(11),
            fontWeight: "700",
        },

        anonymousRow: {
            minHeight: vs(62),
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: vs(8),
            marginBottom: vs(6),
        },

        anonymousAvatar: {
            width: s(44),
            height: s(44),
            borderRadius: s(22),
            marginRight: s(11),
            backgroundColor:
                theme.cyanSoft,
        },

        anonymousTextWrap: {
            flex: 1,
            minWidth: 0,
            paddingRight: s(10),
        },

        anonymousTitle: {
            color: theme.text,
            fontSize: ms(14),
            lineHeight: ms(17),
            fontFamily:
                "Rajdhani_700Bold",
        },

        anonymousSubtitle: {
            color: theme.muted,
            marginTop: 1,
            fontSize: ms(9),
            lineHeight: ms(12),
            fontWeight: "600",
        },

        limitRow: {
            minHeight: vs(38),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: s(7),
            marginBottom: vs(12),
        },

        limitText: {
            color: theme.textSoft,
            textAlign: "center",
            fontSize: ms(11),
            lineHeight: ms(14),
            fontWeight: "700",
        },

        submitButton: {
            minHeight: vs(49),
            borderRadius: 14,
            backgroundColor:
                theme.yellow,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: s(7),
            paddingHorizontal: s(14),
        },

        submitButtonDisabled: {
            backgroundColor:
                theme.border,
        },

        submitEmoji: {
            fontSize: ms(16),
            lineHeight: ms(19),
        },

        submitButtonText: {
            color: theme.buttonText,
            fontSize: ms(14),
            lineHeight: ms(17),
            fontFamily:
                "Rajdhani_700Bold",
        },

        subscribeText: {
            color: theme.muted,
            textAlign: "center",
            marginTop: vs(8),
            fontSize: ms(9),
            lineHeight: ms(12),
            fontWeight: "600",
        },
    });