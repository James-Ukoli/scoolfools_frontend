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
import type { InAppNotification, NotificationUserPreview } from "../api/notificationApi";

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

type Filter = "all" | "unread";
type Theme = ReturnType<typeof getTheme>;
type FeedRow =
    | { key: string; kind: "heading"; title: string }
    | { key: string; kind: "notification"; notification: InAppNotification };

function getTheme(isDark: boolean) {
    return isDark
        ? {
            background: "#020617", surface: "#0B1220", unread: "#082032",
            text: "#FFFFFF", secondary: "#CBD5E1", muted: "#94A3B8",
            border: "rgba(255,255,255,0.10)", strongBorder: "rgba(34,211,238,0.30)",
            cyan: "#22D3EE", tint: "rgba(34,211,238,0.12)", danger: "#FB7185",
            badgeText: "#07111F", separator: "rgba(255,255,255,0.07)",
        }
        : {
            background: "#FFFFFF", surface: "#F8FAFC", unread: "#ECFEFF",
            text: "#07111F", secondary: "#475569", muted: "#64748B",
            border: "rgba(7,17,31,0.10)", strongBorder: "rgba(6,182,212,0.26)",
            cyan: "#0891B2", tint: "rgba(6,182,212,0.11)", danger: "#EF4444",
            badgeText: "#FFFFFF", separator: "rgba(7,17,31,0.07)",
        };
}

function isActor(value: NotificationUserPreview | string | null | undefined): value is NotificationUserPreview {
    return Boolean(value && typeof value === "object" && "_id" in value);
}

function getActor(notification: InAppNotification): NotificationUserPreview | null {
    if (isActor(notification.actor)) return notification.actor;
    return notification.actors?.find(isActor) || null;
}

function getAvatar(actor: NotificationUserPreview | null): ImageSourcePropType | { uri: string } | null {
    if (!actor) return null;
    const local = actor.selectedAvatar || (actor.avatar && !actor.avatar.startsWith("http") ? actor.avatar : null);
    if (local && AVATAR_IMAGES[local]) return AVATAR_IMAGES[local];
    const remote = actor.providerAvatar || (actor.avatar?.startsWith("http") ? actor.avatar : null);
    return remote ? { uri: remote } : null;
}

function timeLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateGroup(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Earlier";
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const valueStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (valueStart === dayStart) return "Today";
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime();
    if (valueStart === yesterday) return "Yesterday";
    return "Earlier";
}

function iconFor(type: string): { family: "ion" | "material"; name: string; color: string } {
    const t = (type || "").toLowerCase();
    if (t.includes("reply")) return { family: "ion", name: "return-down-back", color: "#8B5CF6" };
    if (t.includes("comment")) return { family: "ion", name: "chatbubble", color: "#06B6D4" };
    if (t.includes("milestone")) return { family: "ion", name: "trophy", color: "#EAB308" };
    if (t.includes("reaction") || t.includes("like")) return { family: "ion", name: "heart", color: "#EF4444" };
    if (t.includes("trending")) return { family: "ion", name: "trending-up", color: "#22C55E" };
    return { family: "material", name: "bell-ring", color: "#06B6D4" };
}

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const { isDark } = useTimeTheme();
    const theme = useMemo(() => getTheme(isDark), [isDark]);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const {
        notifications, unreadCount, loading, refreshing, loadingMore, error, pagination,
        refreshNotifications, loadMoreNotifications, markRead, markAllRead, removeNotification,
    } = useNotificationFeed();

    const [filter, setFilter] = useState<Filter>("all");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [markingAllRead, setMarkingAllRead] = useState(false);

    useFocusEffect(useCallback(() => {
        void refreshNotifications(true);
    }, [refreshNotifications]));

    const rows = useMemo<FeedRow[]>(() => {
        const selected = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
        // Preserve the API's ordering and insert a heading on each date-group transition.
        const result: FeedRow[] = [];
        let lastGroup: string | null = null;
        selected.forEach((notification) => {
            const group = dateGroup(notification.created_at);
            if (group !== lastGroup) {
                result.push({ key: `heading-${notification._id}`, kind: "heading", title: group });
                lastGroup = group;
            }
            result.push({ key: notification._id, kind: "notification", notification });
        });
        return result;
    }, [notifications, filter]);

    const openNotification = useCallback(async (notification: InAppNotification) => {
        try {
            if (!notification.read) await markRead(notification._id);
            // Preserve existing behavior. Navigation to a Dump/comment requires
            // checking the app's route names and the notification payload schema.
        } catch (err) {
            console.log("Open notification error:", err);
            Alert.alert("Notification Error", "Could not mark this notification as read. Please try again.");
        }
    }, [markRead]);

    const deleteNotification = useCallback((notification: InAppNotification) => {
        if (deletingId) return;
        Alert.alert("Delete notification?", "This notification will be removed from your inbox.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: async () => {
                    try {
                        setDeletingId(notification._id);
                        await removeNotification(notification._id);
                    } catch (err) {
                        console.log("Delete notification error:", err);
                        Alert.alert("Delete Failed", "Could not delete this notification. Please try again.");
                    } finally {
                        setDeletingId(null);
                    }
                },
            },
        ]);
    }, [deletingId, removeNotification]);

    const markEverythingRead = useCallback(async () => {
        if (!unreadCount || markingAllRead) return;
        try {
            setMarkingAllRead(true);
            await markAllRead();
        } catch (err) {
            console.log("Mark all read error:", err);
            Alert.alert("Notification Error", "Could not mark all notifications as read.");
        } finally {
            setMarkingAllRead(false);
        }
    }, [unreadCount, markingAllRead, markAllRead]);

    const renderRow = useCallback(({ item }: { item: FeedRow }) => {
        if (item.kind === "heading") {
            return <Text style={styles.groupHeading}>{item.title.toUpperCase()}</Text>;
        }
        const n = item.notification;
        const avatar = getAvatar(getActor(n));
        const icon = iconFor(n.type);
        const busy = deletingId === n._id;
        return (
            <View style={[styles.item, !n.read && styles.itemUnread]}>
                <TouchableOpacity
                    style={styles.itemMain}
                    activeOpacity={0.72}
                    onPress={() => void openNotification(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n.message}. ${timeLabel(n.created_at)}`}
                >
                    <View style={styles.avatarWrap}>
                        {avatar ? (
                            <Image source={avatar} style={styles.avatar} resizeMode="cover" fadeDuration={0} />
                        ) : (
                            <View style={styles.fallbackIcon}>
                                {icon.family === "ion" ? (
                                    <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} color={icon.color} size={20} />
                                ) : (
                                    <MaterialCommunityIcons name={icon.name as keyof typeof MaterialCommunityIcons.glyphMap} color={icon.color} size={20} />
                                )}
                            </View>
                        )}
                        <View style={[styles.typeIcon, { backgroundColor: icon.color }]}>
                            {icon.family === "ion" ? (
                                <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={11} color="#FFFFFF" />
                            ) : (
                                <MaterialCommunityIcons name={icon.name as keyof typeof MaterialCommunityIcons.glyphMap} size={11} color="#FFFFFF" />
                            )}
                        </View>
                    </View>
                    <View style={styles.itemContent}>
                        <Text style={[styles.message, !n.read && styles.messageUnread]}>{n.message}</Text>
                        <Text style={styles.time}>{timeLabel(n.created_at)}</Text>
                    </View>
                    {!n.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel="Delete notification"
                    disabled={busy}
                    onPress={() => deleteNotification(n)}
                >
                    {busy ? <ActivityIndicator size="small" color={theme.muted} /> : (
                        <Feather name="trash-2" size={17} color={theme.muted} />
                    )}
                </TouchableOpacity>
            </View>
        );
    }, [styles, theme, deletingId, deleteNotification, openNotification]);

    const isEmpty = rows.length === 0;
    const firstLoad = loading && notifications.length === 0;

    return (
        <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Back">
                        <Feather name="arrow-left" size={23} color={theme.text} />
                    </TouchableOpacity>
                    <View style={styles.titleArea}>
                        <Text style={styles.title}>Notifications</Text>
                        {unreadCount > 0 && (
                            <View style={styles.countPill}>
                                <Text style={styles.countText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => void markEverythingRead()}
                        disabled={unreadCount === 0 || markingAllRead}
                        style={[styles.markAllButton, (unreadCount === 0 || markingAllRead) && styles.disabled]}
                        accessibilityRole="button"
                        accessibilityLabel="Mark all notifications as read"
                    >
                        {markingAllRead ? <ActivityIndicator size="small" color={theme.cyan} /> : (
                            <MaterialCommunityIcons name="check-all" size={23} color={theme.cyan} />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.filterRow}>
                    {(["all", "unread"] as Filter[]).map((option) => {
                        const active = option === filter;
                        return (
                            <TouchableOpacity
                                key={option}
                                style={[styles.filterButton, active && styles.filterActive]}
                                onPress={() => setFilter(option)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                                    {option === "all" ? "All" : "Unread"}
                                </Text>
                                {option === "unread" && unreadCount > 0 && (
                                    <Text style={[styles.filterCount, active && styles.filterCountActive]}>
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {!!error && notifications.length > 0 && (
                    <TouchableOpacity style={styles.errorBanner} onPress={() => void refreshNotifications(true)}>
                        <Feather name="alert-circle" size={17} color={theme.danger} />
                        <Text style={styles.errorText}>{error} Tap to retry.</Text>
                    </TouchableOpacity>
                )}

                {firstLoad ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={theme.cyan} />
                        <Text style={styles.stateDescription}>Loading notifications...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={rows}
                        keyExtractor={(item) => item.key}
                        renderItem={renderRow}
                        extraData={filter}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[styles.list, isEmpty && styles.listEmpty]}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => void refreshNotifications(true)} tintColor={theme.cyan} colors={[theme.cyan]} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIcon}>
                                    <MaterialCommunityIcons name={filter === "unread" ? "check-circle-outline" : "bell-check-outline"} size={42} color={theme.cyan} />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {error && notifications.length === 0 ? "Couldn’t load notifications" : filter === "unread" ? "All caught up!" : "You’re all caught up"}
                                </Text>
                                <Text style={styles.stateDescription}>
                                    {error && notifications.length === 0 ? error : filter === "unread"
                                        ? "No unread activity right now. Check All to see previous notifications."
                                        : "Replies, reactions, milestones, and ScoolFools updates will show up here."}
                                </Text>
                                {error && notifications.length === 0 && (
                                    <TouchableOpacity style={styles.retryButton} onPress={() => void refreshNotifications(true)}>
                                        <Text style={styles.retryText}>Try Again</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                        ListFooterComponent={loadingMore ? (
                            <View style={styles.footer}><ActivityIndicator size="small" color={theme.cyan} /></View>
                        ) : <View style={styles.footer} />}
                        onEndReached={() => {
                            if (pagination.hasMore && !loadingMore && !loading && !refreshing) void loadMoreNotifications();
                        }}
                        onEndReachedThreshold={0.35}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (t: Theme) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: t.background },
    container: { flex: 1, backgroundColor: t.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    backButton: { width: 40, height: 44, alignItems: "flex-start", justifyContent: "center" },
    titleArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: t.text, fontSize: 29, fontFamily: "Rajdhani_700Bold" },
    countPill: { minWidth: 25, height: 23, borderRadius: 12, paddingHorizontal: 7, justifyContent: "center", alignItems: "center", backgroundColor: t.cyan },
    countText: { color: t.badgeText, fontSize: 12, fontWeight: "800" },
    markAllButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 14, backgroundColor: t.tint },
    disabled: { opacity: 0.4 },
    filterRow: { flexDirection: "row", gap: 9, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator },
    filterButton: { paddingHorizontal: 17, height: 36, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderRadius: 20, backgroundColor: t.surface },
    filterActive: { backgroundColor: t.cyan },
    filterText: { color: t.secondary, fontSize: 13, fontWeight: "700" },
    filterTextActive: { color: t.badgeText },
    filterCount: { color: t.muted, fontSize: 11, fontWeight: "800" },
    filterCountActive: { color: t.badgeText },
    list: { paddingHorizontal: 12, paddingBottom: 30 },
    listEmpty: { flexGrow: 1 },
    groupHeading: { color: t.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, paddingHorizontal: 7, paddingTop: 20, paddingBottom: 10 },
    item: { flexDirection: "row", alignItems: "center", minHeight: 78, borderRadius: 14, marginBottom: 5, backgroundColor: t.background, borderWidth: 1, borderColor: "transparent" },
    itemUnread: { backgroundColor: t.unread, borderColor: t.strongBorder },
    itemMain: { flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingLeft: 10, minWidth: 0 },
    avatarWrap: { width: 49, height: 49, marginRight: 12 },
    avatar: { width: 49, height: 49, borderRadius: 25 },
    fallbackIcon: { width: 49, height: 49, borderRadius: 25, justifyContent: "center", alignItems: "center", backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    typeIcon: { position: "absolute", bottom: -3, right: -3, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: t.background, justifyContent: "center", alignItems: "center" },
    itemContent: { flex: 1, minWidth: 0, justifyContent: "center" },
    message: { color: t.secondary, fontSize: 14, lineHeight: 20, fontWeight: "500" },
    messageUnread: { color: t.text, fontWeight: "700" },
    time: { color: t.muted, fontSize: 12, fontWeight: "600", marginTop: 5 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 7, backgroundColor: t.cyan },
    deleteButton: { width: 43, height: 52, justifyContent: "center", alignItems: "center", marginRight: 2 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 27, paddingBottom: 75 },
    emptyIcon: { width: 82, height: 82, borderRadius: 41, backgroundColor: t.tint, alignItems: "center", justifyContent: "center", marginBottom: 17 },
    emptyTitle: { color: t.text, fontFamily: "Rajdhani_700Bold", fontSize: 25, textAlign: "center" },
    stateDescription: { color: t.secondary, fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 9 },
    retryButton: { backgroundColor: t.cyan, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 18 },
    retryText: { color: t.badgeText, fontWeight: "800" },
    footer: { height: 30, alignItems: "center", justifyContent: "center" },
    errorBanner: { marginHorizontal: 16, marginVertical: 7, borderRadius: 12, backgroundColor: t.surface, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
    errorText: { color: t.secondary, fontSize: 12, flex: 1 },
});
