// src/context/NotificationFeedContext.tsx

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    type InAppNotification,
    type NotificationPagination,
} from "../api/notificationApi";

const DEFAULT_PAGINATION: NotificationPagination = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasMore: false,
};

type NotificationFeedContextType = {
    notifications: InAppNotification[];
    unreadCount: number;
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    error: string | null;
    pagination: NotificationPagination;

    refreshNotifications: (silent?: boolean) => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
    loadMoreNotifications: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    removeNotification: (id: string) => Promise<void>;
};

const NotificationFeedContext = createContext<
    NotificationFeedContextType | undefined
>(undefined);

export function NotificationFeedProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] =
        useState<NotificationPagination>(DEFAULT_PAGINATION);

    const hasSession = async () =>
        Boolean(await AsyncStorage.getItem("token"));

    const refreshUnreadCount = useCallback(async () => {
        if (!(await hasSession())) return;

        try {
            const res = await getUnreadNotificationCount();
            setUnreadCount(res.count);
        } catch (e) {
            console.log(e);
        }
    }, []);

    const refreshNotifications = useCallback(
        async (silent = false) => {
            if (!(await hasSession())) return;

            try {
                silent ? setRefreshing(true) : setLoading(true);
                setError(null);

                const res = await getNotifications();

                setNotifications(res.notifications);
                setUnreadCount(res.unreadCount);
                setPagination(res.pagination);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    const loadMoreNotifications = useCallback(async () => {
        if (loadingMore || !pagination.hasMore) return;

        setLoadingMore(true);

        try {
            const res = await getNotifications(
                pagination.page + 1,
                pagination.limit
            );

            setNotifications((current) => {
                const ids = new Set(current.map((n) => n._id));
                return [
                    ...current,
                    ...res.notifications.filter((n) => !ids.has(n._id)),
                ];
            });

            setPagination(res.pagination);
            setUnreadCount(res.unreadCount);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, pagination]);

    const markRead = useCallback(
        async (id: string) => {
            setNotifications((current) =>
                current.map((n) =>
                    n._id === id ? { ...n, read: true } : n
                )
            );

            setUnreadCount((c) => Math.max(0, c - 1));

            try {
                await markNotificationAsRead(id);
            } catch {
                refreshNotifications(true);
            }
        },
        [refreshNotifications]
    );

    const markAllRead = useCallback(async () => {
        setNotifications((current) =>
            current.map((n) => ({ ...n, read: true }))
        );
        setUnreadCount(0);

        try {
            await markAllNotificationsAsRead();
        } catch {
            refreshNotifications(true);
        }
    }, [refreshNotifications]);

    const removeNotification = useCallback(
        async (id: string) => {
            setNotifications((current) =>
                current.filter((n) => n._id !== id)
            );

            try {
                await deleteNotification(id);
            } catch {
                refreshNotifications(true);
            }
        },
        [refreshNotifications]
    );

    useEffect(() => {
        refreshNotifications();
    }, [refreshNotifications]);

    const value = useMemo(
        () => ({
            notifications,
            unreadCount,
            loading,
            refreshing,
            loadingMore,
            error,
            pagination,
            refreshNotifications,
            refreshUnreadCount,
            loadMoreNotifications,
            markRead,
            markAllRead,
            removeNotification,
        }),
        [
            notifications,
            unreadCount,
            loading,
            refreshing,
            loadingMore,
            error,
            pagination,
            refreshNotifications,
            refreshUnreadCount,
            loadMoreNotifications,
            markRead,
            markAllRead,
            removeNotification,
        ]
    );

    return (
        <NotificationFeedContext.Provider value={value}>
            {children}
        </NotificationFeedContext.Provider>
    );
}

export function useNotificationFeed() {
    const context = useContext(NotificationFeedContext);

    if (!context) {
        throw new Error(
            "useNotificationFeed must be used inside NotificationFeedProvider."
        );
    }

    return context;
}