// NotificationsScreen.tsx

import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ImageSourcePropType,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useNotificationFeed } from "../context/NotificationFeedContext";
import { useTimeTheme } from "../context/TimeThemeContext";

import type {
    InAppNotification,
    NotificationUserPreview,
} from "../api/notificationApi";

/*
|--------------------------------------------------------------------------
| Local Avatar Map
|--------------------------------------------------------------------------
|
| Update these paths only if your avatar files live somewhere else.
|
*/

const AVATAR_IMAGES: Record<string, ImageSourcePropType> = {
    basicBlue: require("../../assets/images/profileimages/basicBlue.png"),
    basicGreen: require("../../assets/images/profileimages/basicGreen.png"),
    basicOrange: require("../../assets/images/profileimages/basicOrange.png"),
    basicPink: require("../../assets/images/profileimages/basicPink.png"),
    basicPurple: require("../../assets/images/profileimages/basicPurple.png"),
    basicYellow: require("../../assets/images/profileimages/basicYellow.png"),
    diamondBoy: require("../../assets/images/profileimages/diamondBoy.png"),
    diamondGirl: require("../../assets/images/profileimages/diamondGirl.png"),
};

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
*/

type NotificationTheme = {
    background: string;
    card: string;
    unreadCard: string;
    text: string;
    secondaryText: string;
    mutedText: string;
    border: string;
    strongBorder: string;
    iconBackground: string;
    cyan: string;
    danger: string;
    badgeText: string;
};

const getNotificationTheme = (isDark: boolean): NotificationTheme => {
    if (isDark) {
        return {
            background: "#020617",
            card: "#090D14",
            unreadCard: "#071827",
            text: "#FFFFFF",
            secondaryText: "#CBD5E1",
            mutedText: "#94A3B8",
            border: "rgba(255,255,255,0.10)",
            strongBorder: "rgba(34,211,238,0.38)",
            iconBackground: "#0B1220",
            cyan: "#22D3EE",
            danger: "#FB7185",
            badgeText: "#07111F",
        };
    }

    return {
        background: "#F8FAFC",
        card: "#FFFFFF",
        unreadCard: "#ECFEFF",
        text: "#07111F",
        secondaryText: "#475569",
        mutedText: "#64748B",
        border: "rgba(7,17,31,0.10)",
        strongBorder: "rgba(6,182,212,0.34)",
        iconBackground: "#F1F5F9",
        cyan: "#06B6D4",
        danger: "#EF4444",
        badgeText: "#07111F",
    };
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isPopulatedActor = (
    actor: NotificationUserPreview | string | null | undefined
): actor is NotificationUserPreview => {
    return Boolean(actor && typeof actor === "object" && "_id" in actor);
};

const getPrimaryActor = (
    notification: InAppNotification
): NotificationUserPreview | null => {
    if (isPopulatedActor(notification.actor)) {
        return notification.actor;
    }

    const actor = notification.actors?.find(isPopulatedActor);

    return actor || null;
};

const getAvatarSource = (
    actor: NotificationUserPreview | null
): ImageSourcePropType | { uri: string } | null => {
    if (!actor) {
        return null;
    }

    const localAvatarId =
        actor.selectedAvatar ||
        (actor.avatar && !actor.avatar.startsWith("http")
            ? actor.avatar
            : null);

    if (localAvatarId && AVATAR_IMAGES[localAvatarId]) {
        return AVATAR_IMAGES[localAvatarId];
    }

    const remoteAvatar =
        actor.providerAvatar ||
        (actor.avatar?.startsWith("http") ? actor.avatar : null);

    if (remoteAvatar) {
        return {
            uri: remoteAvatar,
        };
    }

    return null;
};

const formatNotificationTime = (value: string): string => {
    const createdAt = new Date(value);

    if (Number.isNaN(createdAt.getTime())) {
        return "";
    }

    const seconds = Math.max(
        0,
        Math.floor((Date.now() - createdAt.getTime()) / 1000)
    );

    if (seconds < 60) {
        return "now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d`;
    }

    return createdAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
};

const getNotificationIcon = (
    type: string
): {
    family: "ionicons" | "material";
    name: string;
} => {
    const normalizedType = type.toLowerCase();

    if (normalizedType.includes("reply")) {
        return {
            family: "ionicons",
            name: "return-down-back",
        };
    }

    if (normalizedType.includes("comment")) {
        return {
            family: "ionicons",
            name: "chatbubble",
        };
    }

    if (normalizedType.includes("milestone")) {
        return {
            family: "ionicons",
            name: "trophy",
        };
    }

    if (
        normalizedType.includes("reaction") ||
        normalizedType.includes("like")
    ) {
        return {
            family: "ionicons",
            name: "heart",
        };
    }

    if (normalizedType.includes("trending")) {
        return {
            family: "ionicons",
            name: "trending-up",
        };
    }

    return {
        family: "material",
        name: "bell-ring",
    };
};

/*
|--------------------------------------------------------------------------
| Screen
|--------------------------------------------------------------------------
*/

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();

    const timeTheme = useTimeTheme();

    const { isDark } = useTimeTheme();

    const theme = useMemo(
        () => getNotificationTheme(isDark),
        [isDark]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const {
        notifications,
        unreadCount,
        loading,
        refreshing,
        loadingMore,
        error,
        pagination,
        refreshNotifications,
        loadMoreNotifications,
        markRead,
        markAllRead,
        removeNotification,
    } = useNotificationFeed();

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [markingAllRead, setMarkingAllRead] = useState(false);

    useFocusEffect(
        useCallback(() => {
            refreshNotifications(true);
        }, [refreshNotifications])
    );

    const handleNotificationPress = useCallback(
        async (notification: InAppNotification) => {
            try {
                if (!notification.read) {
                    await markRead(notification._id);
                }

                /*
                |--------------------------------------------------------------------------
                | Deep Linking
                |--------------------------------------------------------------------------
                |
                | Add navigation to the matching dump/comment after the feed UI is tested.
                | The notification already contains dump, comment, parentComment,
                | resourceType, resourceId, and metadata.
                |
                */
            } catch (requestError) {
                console.log("Open notification error:", requestError);

                Alert.alert(
                    "Notification Error",
                    "Could not open this notification. Please try again."
                );
            }
        },
        [markRead]
    );

    const handleDelete = useCallback(
        async (notification: InAppNotification) => {
            if (deletingId) {
                return;
            }

            try {
                setDeletingId(notification._id);
                await removeNotification(notification._id);
            } catch (requestError) {
                console.log("Delete notification error:", requestError);

                Alert.alert(
                    "Delete Failed",
                    "Could not delete this notification. Please try again."
                );
            } finally {
                setDeletingId(null);
            }
        },
        [deletingId, removeNotification]
    );

    const handleMarkAllRead = useCallback(async () => {
        if (unreadCount === 0 || markingAllRead) {
            return;
        }

        try {
            setMarkingAllRead(true);
            await markAllRead();
        } catch (requestError) {
            console.log("Mark all read error:", requestError);

            Alert.alert(
                "Notification Error",
                "Could not mark all notifications as read."
            );
        } finally {
            setMarkingAllRead(false);
        }
    }, [markAllRead, markingAllRead, unreadCount]);

    const renderNotification = useCallback(
        ({ item }: { item: InAppNotification }) => {
            const actor = getPrimaryActor(item);
            const avatarSource = getAvatarSource(actor);
            const notificationIcon = getNotificationIcon(item.type);
            const isDeleting = deletingId === item._id;

            return (
                <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => handleNotificationPress(item)}
                    style={[
                        styles.notificationCard,
                        !item.read && styles.notificationCardUnread,
                    ]}
                >
                    <View style={styles.avatarContainer}>
                        {avatarSource ? (
                            <Image
                                source={avatarSource}
                                style={styles.avatar}
                                resizeMode="cover"
                                fadeDuration={0}
                            />
                        ) : (
                            <View style={styles.fallbackIcon}>
                                {notificationIcon.family === "ionicons" ? (
                                    <Ionicons
                                        name={
                                            notificationIcon.name as keyof typeof Ionicons.glyphMap
                                        }
                                        size={20}
                                        color={theme.cyan}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name={
                                            notificationIcon.name as keyof typeof MaterialCommunityIcons.glyphMap
                                        }
                                        size={20}
                                        color={theme.cyan}
                                    />
                                )}
                            </View>
                        )}

                        {!item.read && <View style={styles.unreadDot} />}
                    </View>

                    <View style={styles.notificationContent}>
                        <Text
                            style={[
                                styles.notificationMessage,
                                !item.read && styles.notificationMessageUnread,
                            ]}
                        >
                            {item.message}
                        </Text>

                        <Text style={styles.notificationTime}>
                            {formatNotificationTime(item.created_at)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        disabled={isDeleting}
                        activeOpacity={0.75}
                        onPress={(event) => {
                            event.stopPropagation();
                            handleDelete(item);
                        }}
                        style={styles.deleteButton}
                    >
                        {isDeleting ? (
                            <ActivityIndicator
                                size="small"
                                color={theme.mutedText}
                            />
                        ) : (
                            <Feather
                                name="x"
                                size={18}
                                color={theme.mutedText}
                            />
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        },
        [
            deletingId,
            handleDelete,
            handleNotificationPress,
            styles,
            theme,
        ]
    );

    if (loading && notifications.length === 0) {
        return (
            <SafeAreaView
                edges={["left", "right", "bottom"]}
                style={styles.safeArea}
            >
                <View style={styles.centeredState}>
                    <ActivityIndicator
                        size="large"
                        color={theme.cyan}
                    />

                    <Text style={styles.loadingText}>
                        Loading notifications...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={["left", "right", "bottom"]}
            style={styles.safeArea}
        >
            <View style={styles.container}>
                <View style={styles.headerCard}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.goBack()}
                        style={styles.headerButton}
                    >
                        <Feather
                            name="arrow-left"
                            size={22}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerTextContainer}>

                        <View style={styles.titleRow}>
                            <Text style={styles.title}>
                                Notifications
                            </Text>

                            {unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={unreadCount === 0 || markingAllRead}
                        onPress={handleMarkAllRead}
                        style={[
                            styles.headerButton,
                            (unreadCount === 0 || markingAllRead) &&
                            styles.disabledButton,
                        ]}
                    >
                        {markingAllRead ? (
                            <ActivityIndicator
                                size="small"
                                color={theme.cyan}
                            />
                        ) : (
                            <MaterialCommunityIcons
                                name="check-all"
                                size={23}
                                color={
                                    unreadCount > 0
                                        ? theme.cyan
                                        : theme.mutedText
                                }
                            />
                        )}
                    </TouchableOpacity>
                </View>

                {error && notifications.length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => refreshNotifications(true)}
                        style={styles.errorBanner}
                    >
                        <Feather
                            name="alert-circle"
                            size={17}
                            color={theme.danger}
                        />

                        <Text
                            numberOfLines={2}
                            style={styles.errorText}
                        >
                            {error} Tap to retry.
                        </Text>
                    </TouchableOpacity>
                )}

                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item._id}
                    renderItem={renderNotification}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.listContent,
                        notifications.length === 0 &&
                        styles.emptyListContent,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => refreshNotifications(true)}
                            tintColor={theme.cyan}
                            colors={[theme.cyan]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons
                                    name="bell-check-outline"
                                    size={40}
                                    color={theme.cyan}
                                />
                            </View>

                            <Text style={styles.emptyTitle}>
                                {error
                                    ? "Couldn’t load notifications"
                                    : "You’re all caught up"}
                            </Text>

                            <Text style={styles.emptyDescription}>
                                {error
                                    ? error
                                    : "Comments, replies, reactions, milestones, and future ScoolFools updates will appear here."}
                            </Text>

                            {error && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => refreshNotifications()}
                                    style={styles.retryButton}
                                >
                                    <Feather
                                        name="refresh-cw"
                                        size={17}
                                        color="#07111F"
                                    />

                                    <Text style={styles.retryButtonText}>
                                        Try Again
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator
                                    size="small"
                                    color={theme.cyan}
                                />
                            </View>
                        ) : (
                            <View style={styles.footerSpacing} />
                        )
                    }
                    onEndReached={() => {
                        if (pagination.hasMore) {
                            loadMoreNotifications();
                        }
                    }}
                    onEndReachedThreshold={0.35}
                />
            </View>
        </SafeAreaView>
    );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const createStyles = (theme: NotificationTheme) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },

        container: {
            flex: 1,
            backgroundColor: theme.background,
            paddingHorizontal: 14,
            paddingTop: 10,
        },

        centeredState: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
        },

        loadingText: {
            marginTop: 12,
            color: theme.secondaryText,
            fontSize: 14,
        },

        headerCard: {
            minHeight: 78,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            marginBottom: 12,
            borderRadius: 22,
            // borderWidth: 1,
            // borderColor: theme.strongBorder,
            // backgroundColor: theme.card,
        },

        headerButton: {
            width: 42,
            height: 42,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.iconBackground,
        },

        disabledButton: {
            opacity: 0.55,
        },

        headerTextContainer: {
            flex: 1,
            paddingHorizontal: 12,
        },

        eyebrow: {
            color: theme.cyan,
            fontSize: 12,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 1.8,
        },

        titleRow: {
            flexDirection: "row",
            alignItems: "center",
        },

        title: {
            color: theme.text,
            fontSize: 29,
            fontFamily: "Rajdhani_700Bold",
            letterSpacing: 0.3,
            marginTop: -2,
        },

        unreadBadge: {
            minWidth: 28,
            height: 24,
            paddingHorizontal: 8,
            marginLeft: 8,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: theme.cyan,
        },

        unreadBadgeText: {
            color: theme.badgeText,
            fontSize: 12,
            fontFamily: "Rajdhani_700Bold",
        },

        errorBanner: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: `${theme.danger}55`,
            backgroundColor: `${theme.danger}12`,
        },

        errorText: {
            flex: 1,
            marginLeft: 8,
            color: theme.secondaryText,
            fontSize: 13,
            lineHeight: 18,
        },

        listContent: {
            paddingBottom: 28,
        },

        emptyListContent: {
            flexGrow: 1,
        },

        notificationCard: {
            minHeight: 78,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 9,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
        },

        notificationCardUnread: {
            borderColor: theme.strongBorder,
            backgroundColor: theme.unreadCard,
        },

        avatarContainer: {
            width: 48,
            height: 48,
            marginRight: 11,
            position: "relative",
        },

        avatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
        },

        fallbackIcon: {
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.strongBorder,
            backgroundColor: theme.iconBackground,
        },

        unreadDot: {
            position: "absolute",
            right: -1,
            bottom: 2,
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: theme.card,
            backgroundColor: theme.cyan,
        },

        notificationContent: {
            flex: 1,
            paddingRight: 6,
        },

        notificationMessage: {
            color: theme.secondaryText,
            fontSize: 14,
            lineHeight: 20,
            fontWeight: "500",
        },

        notificationMessageUnread: {
            color: theme.text,
            fontWeight: "700",
        },

        notificationTime: {
            marginTop: 4,
            color: theme.mutedText,
            fontSize: 12,
            fontWeight: "600",
        },

        deleteButton: {
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 17,
        },

        emptyState: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 28,
            paddingBottom: 80,
        },

        emptyIcon: {
            width: 78,
            height: 78,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            borderRadius: 39,
            borderWidth: 1,
            borderColor: theme.strongBorder,
            backgroundColor: theme.iconBackground,
        },

        emptyTitle: {
            color: theme.text,
            fontSize: 25,
            fontFamily: "Rajdhani_700Bold",
            textAlign: "center",
        },

        emptyDescription: {
            maxWidth: 320,
            marginTop: 8,
            color: theme.secondaryText,
            fontSize: 14,
            lineHeight: 21,
            textAlign: "center",
        },

        retryButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 18,
            paddingVertical: 11,
            marginTop: 18,
            borderRadius: 14,
            backgroundColor: theme.cyan,
        },

        retryButtonText: {
            marginLeft: 8,
            color: "#07111F",
            fontSize: 14,
            fontWeight: "800",
        },

        footerLoader: {
            paddingVertical: 18,
        },

        footerSpacing: {
            height: 10,
        },
    });