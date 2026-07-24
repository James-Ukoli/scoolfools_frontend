import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import {
    useTimeTheme,
    type TimeTheme,
} from "../context/TimeThemeContext";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

const DELETE_REASONS = [
    {
        id: "not_useful",
        label: "I do not find ScoolFools useful",
    },
    {
        id: "not_enough_content",
        label: "There is not enough content",
    },
    {
        id: "privacy_concerns",
        label: "I have privacy concerns",
    },
    {
        id: "too_many_notifications",
        label: "I receive too many notifications",
    },
    {
        id: "technical_issues",
        label: "I am experiencing technical issues",
    },
    {
        id: "created_another_account",
        label: "I created another account",
    },
    {
        id: "taking_a_break",
        label: "I am taking a break",
    },
    {
        id: "other",
        label: "Other",
    },
] as const;

const getTheme = (mode: TimeTheme) => {
    const isDay = mode === "day";

    return {
        bg: isDay ? "#FFFFFF" : "#000000",
        card: isDay ? "#F8FAFC" : "#050816",
        text: isDay ? "#07111F" : "#FFFFFF",
        subtext: isDay ? "#475569" : "#D7DBE3",
        muted: isDay ? "#64748B" : "#8A8F98",
        border: isDay
            ? "rgba(7,17,31,0.12)"
            : "#17233A",
        input: isDay ? "#F1F5F9" : "#0B1220",
        cyan: "#06B6D4",
        danger: "#FF5A5F",
        dangerSoft: isDay
            ? "rgba(255,90,95,0.10)"
            : "rgba(255,90,95,0.16)",
    };
};

export default function DeleteAccountScreen() {
    const navigation = useNavigation<any>();
    const { mode } = useTimeTheme();

    const theme = useMemo(
        () => getTheme(mode),
        [mode]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const [selectedReason, setSelectedReason] =
        useState("");
    const [feedback, setFeedback] = useState("");
    const [confirmationText, setConfirmationText] =
        useState("");
    const [deleting, setDeleting] = useState(false);

    const canDelete =
        selectedReason.length > 0 &&
        confirmationText.trim().toUpperCase() ===
        "DELETE" &&
        !deleting;

    const handleDeleteAccount = async () => {
        if (!selectedReason) {
            Alert.alert(
                "Select a reason",
                "Please tell us why you are deleting your account."
            );
            return;
        }

        if (
            confirmationText
                .trim()
                .toUpperCase() !== "DELETE"
        ) {
            Alert.alert(
                "Confirmation required",
                "Type DELETE to confirm account deletion."
            );
            return;
        }

        Alert.alert(
            "Permanently delete account?",
            "Your account and associated data will be permanently removed. This cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: submitDeletion,
                },
            ]
        );
    };

    const submitDeletion = async () => {
        try {
            setDeleting(true);

            const token =
                await AsyncStorage.getItem("token");

            if (!token) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            const selectedReasonData =
                DELETE_REASONS.find(
                    (reason) =>
                        reason.id === selectedReason
                );

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        reason: selectedReason,
                        reasonLabel:
                            selectedReasonData?.label ||
                            selectedReason,
                        feedback: feedback.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    "Failed to delete account."
                );
            }

            try {
                await GoogleSignin.signOut();
            } catch (error) {
                console.log(
                    "Google sign out warning:",
                    error
                );
            }

            await AsyncStorage.multiRemove([
                "token",
                "user",
            ]);

            Alert.alert(
                "Account deleted",
                "Your account has been permanently deleted.",
                [
                    {
                        text: "OK",
                        onPress: () =>
                            navigation.reset({
                                index: 0,
                                routes: [
                                    {
                                        name: "GoogleSignIn",
                                    },
                                ],
                            }),
                    },
                ]
            );
        } catch (error: any) {
            console.log(
                "Delete account error:",
                error
            );

            Alert.alert(
                "Unable to delete account",
                error?.message ||
                "Something went wrong while deleting your account."
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <SafeAreaView
            style={styles.container}
            edges={[
                "left",
                "right",
                "bottom",
            ]}
        >
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() =>
                            navigation.goBack()
                        }
                        disabled={deleting}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={23}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerText}>
                        <Text style={styles.eyebrow}>
                            ACCOUNT
                        </Text>

                        <Text style={styles.title}>
                            Delete Account
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    <View style={styles.warningCard}>
                        <Ionicons
                            name="warning-outline"
                            size={25}
                            color={theme.danger}
                        />

                        <View
                            style={
                                styles.warningTextWrap
                            }
                        >
                            <Text
                                style={
                                    styles.warningTitle
                                }
                            >
                                This action is permanent
                            </Text>

                            <Text
                                style={
                                    styles.warningBody
                                }
                            >
                                Your profile, posts,
                                comments and account
                                information may be
                                permanently removed.
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>
                        Why are you leaving?
                    </Text>

                    <Text
                        style={styles.sectionDescription}
                    >
                        Your feedback helps us improve
                        ScoolFools.
                    </Text>

                    <View style={styles.reasonList}>
                        {DELETE_REASONS.map(
                            (reason) => {
                                const selected =
                                    selectedReason ===
                                    reason.id;

                                return (
                                    <TouchableOpacity
                                        key={reason.id}
                                        style={[
                                            styles.reasonRow,
                                            selected &&
                                            styles.reasonRowSelected,
                                        ]}
                                        activeOpacity={0.82}
                                        onPress={() =>
                                            setSelectedReason(
                                                reason.id
                                            )
                                        }
                                        disabled={
                                            deleting
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.reasonText,
                                                selected &&
                                                styles.reasonTextSelected,
                                            ]}
                                        >
                                            {
                                                reason.label
                                            }
                                        </Text>

                                        <Ionicons
                                            name={
                                                selected
                                                    ? "radio-button-on"
                                                    : "radio-button-off"
                                            }
                                            size={22}
                                            color={
                                                selected
                                                    ? theme.cyan
                                                    : theme.muted
                                            }
                                        />
                                    </TouchableOpacity>
                                );
                            }
                        )}
                    </View>

                    <Text style={styles.inputLabel}>
                        Additional feedback
                    </Text>

                    <TextInput
                        style={styles.feedbackInput}
                        placeholder="Tell us what we could have done better..."
                        placeholderTextColor={
                            theme.muted
                        }
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                        editable={!deleting}
                    />

                    <Text style={styles.characterCount}>
                        {feedback.length}/500
                    </Text>

                    <Text style={styles.inputLabel}>
                        Type DELETE to confirm
                    </Text>

                    <TextInput
                        style={
                            styles.confirmationInput
                        }
                        placeholder="DELETE"
                        placeholderTextColor={
                            theme.muted
                        }
                        value={confirmationText}
                        onChangeText={
                            setConfirmationText
                        }
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!deleting}
                    />

                    <TouchableOpacity
                        style={[
                            styles.deleteButton,
                            !canDelete &&
                            styles.deleteButtonDisabled,
                        ]}
                        activeOpacity={0.85}
                        onPress={
                            handleDeleteAccount
                        }
                        disabled={!canDelete}
                    >
                        {deleting ? (
                            <ActivityIndicator
                                color="#FFFFFF"
                            />
                        ) : (
                            <>
                                <Ionicons
                                    name="trash-outline"
                                    size={20}
                                    color="#FFFFFF"
                                />

                                <Text
                                    style={
                                        styles.deleteButtonText
                                    }
                                >
                                    Permanently Delete
                                    Account
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() =>
                            navigation.goBack()
                        }
                        disabled={deleting}
                    >
                        <Text
                            style={
                                styles.cancelButtonText
                            }
                        >
                            Keep My Account
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (
    theme: ReturnType<typeof getTheme>
) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.bg,
        },

        keyboardView: {
            flex: 1,
        },

        header: {
            minHeight: 92,
            paddingHorizontal: 18,
            paddingTop:
                Platform.OS === "android"
                    ? 22
                    : 16,
            flexDirection: "row",
            alignItems: "center",
        },

        backButton: {
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
        },

        headerText: {
            flex: 1,
        },

        eyebrow: {
            color: theme.cyan,
            fontSize: 11,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 1.6,
        },

        title: {
            color: theme.text,
            fontSize: 27,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.3,
            marginTop: -3,
        },

        scrollView: {
            flex: 1,
        },

        scrollContent: {
            paddingHorizontal: 18,
            paddingBottom:
                Platform.OS === "android"
                    ? 180
                    : 110,
        },

        warningCard: {
            flexDirection: "row",
            backgroundColor: theme.dangerSoft,
            borderRadius: 14,
            paddingHorizontal: 13,
            paddingVertical: 11,
            marginTop: 2,
            marginBottom: 16,
        },

        warningTextWrap: {
            flex: 1,
            marginLeft: 9,
        },

        warningTitle: {
            color: theme.danger,
            fontSize: 16,
            fontFamily: "Rajdhani_700Bold",
        },

        warningBody: {
            color: theme.subtext,
            fontSize: 12,
            lineHeight: 16,
            marginTop: 1,
        },

        sectionTitle: {
            color: theme.text,
            fontSize: 20,
            fontFamily: "Rajdhani_700Bold",
        },

        sectionDescription: {
            color: theme.subtext,
            fontSize: 12,
            lineHeight: 16,
            marginTop: 0,
            marginBottom: 8,
        },

        reasonList: {
            marginBottom: 18,
        },

        reasonRow: {
            minHeight: 39,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 5,
        },

        reasonRowSelected: {
            borderColor: theme.cyan,
            backgroundColor: theme.input,
        },

        reasonText: {
            flex: 1,
            color: theme.text,
            fontSize: 13,
            lineHeight: 16,
            fontFamily: "Rajdhani_600SemiBold",
            paddingRight: 8,
        },

        reasonTextSelected: {
            color: theme.cyan,
        },

        inputLabel: {
            color: theme.text,
            fontSize: 17,
            fontFamily: "Rajdhani_700Bold",
            marginBottom: 6,
        },

        feedbackInput: {
            minHeight: 105,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.input,
            paddingHorizontal: 13,
            paddingVertical: 10,
            color: theme.text,
            fontSize: 14,
            lineHeight: 20,
        },

        characterCount: {
            color: theme.muted,
            fontSize: 11,
            textAlign: "right",
            marginTop: 4,
            marginBottom: 16,
        },

        confirmationInput: {
            height: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.input,
            paddingHorizontal: 14,
            color: theme.text,
            fontSize: 16,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 1.2,
            marginBottom: 18,
        },

        deleteButton: {
            minHeight: 50,
            borderRadius: 14,
            backgroundColor: theme.danger,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
        },

        deleteButtonDisabled: {
            opacity: 0.4,
        },

        deleteButtonText: {
            color: "#FFFFFF",
            fontSize: 16,
            fontFamily: "Rajdhani_700Bold",
        },

        cancelButton: {
            minHeight: 46,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 6,
        },

        cancelButtonText: {
            color: theme.cyan,
            fontSize: 16,
            fontFamily: "Rajdhani_700Bold",
        },
    });