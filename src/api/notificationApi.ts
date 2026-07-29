import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
    : process.env.EXPO_PUBLIC_API_BASE_URL;

const getToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  return token;
};

export type NotificationUserPreview = {
  _id: string;
  username?: string | null;
  display_name?: string | null;
  selectedAvatar?: string | null;
  avatar?: string | null;
  providerAvatar?: string | null;
  isSubscribed?: boolean;
  isStudentAthlete?: boolean;
  sport?: string | null;
};

export type InAppNotification = {
  _id: string;
  recipient: string;
  actor?: NotificationUserPreview | string | null;
  actors?: Array<NotificationUserPreview | string>;
  type: string;
  message: string;
  icon?: string | null;
  dump?: string | null;
  comment?: string | null;
  parentComment?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  groupKey?: string | null;
  groupCount?: number;
  dedupeKey?: string | null;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: string | null;
  created_at: string;
  updated_at?: string;
};

export type NotificationPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
};

export type GetNotificationsResponse = {
  success: boolean;
  notifications: InAppNotification[];
  unreadCount: number;
  pagination: NotificationPagination;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

const protectedRequest = async <T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? {
            "Content-Type": "application/json",
          }
        : {}),
    },
    ...(options.body
      ? {
          body: JSON.stringify(options.body),
        }
      : {}),
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data as T;
};

export const getNotifications = async (
  page = 1,
  limit = 20
): Promise<GetNotificationsResponse> => {
  return protectedRequest<GetNotificationsResponse>(
    `/api/notifications?page=${page}&limit=${limit}`
  );
};

export const getUnreadNotificationCount = async (): Promise<{
  success: boolean;
  count: number;
}> => {
  return protectedRequest(
    "/api/notifications/unread-count"
  );
};

export const markNotificationAsRead = async (
  notificationId: string
): Promise<{
  success: boolean;
  message: string;
  notification: InAppNotification;
}> => {
  return protectedRequest(
    `/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );
};

export const markAllNotificationsAsRead = async (): Promise<{
  success: boolean;
  message: string;
  updatedCount: number;
}> => {
  return protectedRequest(
    "/api/notifications/read-all",
    {
      method: "PATCH",
    }
  );
};

export const deleteNotification = async (
  notificationId: string
): Promise<{
  success: boolean;
  message: string;
  notificationId: string;
}> => {
  return protectedRequest(
    `/api/notifications/${notificationId}`,
    {
      method: "DELETE",
    }
  );
};