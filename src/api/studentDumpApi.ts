import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/*
|--------------------------------------------------------------------------
| API Configuration
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type SchoolLevel = "college" | "highSchool";

export type ReactionType = "heart" | "laugh" | "fire";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "sexual_content"
  | "violence"
  | "other";

export type UserPreview = {
  _id: string;
  username?: string | null;
  display_name?: string | null;
  providerAvatar?: string | null;
  avatar?: string | null;
  selectedAvatar?: string | null;
  isSubscribed?: boolean;
  isStudentAthlete?: boolean;
  sport?: string | null;
  socialMediaPlatform?: string | null;
  socialMediaUrl?: string | null;
};

export type ReactionCollection = {
  heart: string[];
  laugh: string[];
  fire: string[];
};

export type ReactionCounts = {
  heart: number;
  laugh: number;
  fire: number;
};

export type Dump = {
  _id: string;
  author: UserPreview | string;
  anonymous: boolean;
  content: string;
  image_url?: string | null;
  schoolLevel: SchoolLevel;
  collegeName?: string | null;
  highSchoolClassification?: string | null;
  reactions: ReactionCollection;
  commentsCount: number;
  status: string;
  created_at: string;
  updated_at?: string;
};

export type Comment = {
  _id: string;
  dump: string;
  author: UserPreview | string;
  parentComment?: string | null;
  anonymous: boolean;
  content: string;
  reactions: ReactionCollection;
  status: string;
  created_at: string;
  updated_at?: string;
  replies?: Comment[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type DumpsResponse = {
  success: boolean;
  dumps: Dump[];
  pagination: Pagination;
};

export type CommentsResponse = {
  success: boolean;
  comments: Comment[];
  pagination: Pagination;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

/*
|--------------------------------------------------------------------------
| Shared Protected Request
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Dump Feed API
|--------------------------------------------------------------------------
*/

export const getCollegeRecent = async (
  page = 1,
  limit = 20
): Promise<DumpsResponse> => {
  return protectedRequest<DumpsResponse>(
    `/api/dumps/college/recent?page=${page}&limit=${limit}`
  );
};

export const getCollegeTrending = async (
  page = 1,
  limit = 20
): Promise<DumpsResponse> => {
  return protectedRequest<DumpsResponse>(
    `/api/dumps/college/trending?page=${page}&limit=${limit}`
  );
};

export const getHighSchoolRecent = async (
  page = 1,
  limit = 20
): Promise<DumpsResponse> => {
  return protectedRequest<DumpsResponse>(
    `/api/dumps/highschool/recent?page=${page}&limit=${limit}`
  );
};

export const getHighSchoolTrending = async (
  page = 1,
  limit = 20
): Promise<DumpsResponse> => {
  return protectedRequest<DumpsResponse>(
    `/api/dumps/highschool/trending?page=${page}&limit=${limit}`
  );
};

export const getMyDumps = async (
  page = 1,
  limit = 20
): Promise<DumpsResponse> => {
  return protectedRequest<DumpsResponse>(
    `/api/dumps/mine?page=${page}&limit=${limit}`
  );
};

/*
|--------------------------------------------------------------------------
| Create Dump
|--------------------------------------------------------------------------
*/

type CreateDumpPayload = {
  content: string;
  anonymous?: boolean;
  image_url?: string | null;
};

type CreateDumpResponse = {
  success: boolean;
  message: string;
  dump: Dump;
  dailyLimit?: {
    used: number;
    remaining: number;
    limit: number;
  };
};

export const createDump = async (
  payload: CreateDumpPayload
): Promise<CreateDumpResponse> => {
  return protectedRequest<CreateDumpResponse>("/api/dumps", {
    method: "POST",
    body: {
      content: payload.content.trim(),
      anonymous: payload.anonymous ?? false,
      image_url: payload.image_url || null,
    },
  });
};

/*
|--------------------------------------------------------------------------
| Dump Reactions
|--------------------------------------------------------------------------
*/

export const getMyInteractions = async () => {
  return protectedRequest("/api/dumps/my-interactions", {
    method: "GET",
  });
};

type ToggleReactionResponse = {
  success: boolean;
  message: string;
  userReaction: ReactionType | null;
  reactions: ReactionCounts;
};

export const toggleDumpReaction = async (
  dumpId: string,
  reactionType: ReactionType
): Promise<ToggleReactionResponse> => {
  return protectedRequest<ToggleReactionResponse>(
    `/api/dumps/${dumpId}/reaction`,
    {
      method: "PATCH",
      body: {
        reactionType,
      },
    }
  );
};

/*
|--------------------------------------------------------------------------
| Report Dump
|--------------------------------------------------------------------------
*/

type ReportResponse = {
  success: boolean;
  message: string;
  reports: number;
};

export const reportDump = async (
  dumpId: string,
  reason: ReportReason
): Promise<ReportResponse> => {
  return protectedRequest<ReportResponse>(
    `/api/dumps/${dumpId}/report`,
    {
      method: "POST",
      body: {
        reason,
      },
    }
  );
};

/*
|--------------------------------------------------------------------------
| Delete Dump
|--------------------------------------------------------------------------
*/

type DeleteResponse = {
  success: boolean;
  message: string;
};

export const deleteDump = async (
  dumpId: string
): Promise<DeleteResponse> => {
  return protectedRequest<DeleteResponse>(
    `/api/dumps/${dumpId}`,
    {
      method: "DELETE",
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Comments
|--------------------------------------------------------------------------
*/

export const getComments = async (
  dumpId: string,
  page = 1,
  limit = 20
): Promise<CommentsResponse> => {
  return protectedRequest<CommentsResponse>(
    `/api/comments/dump/${dumpId}?page=${page}&limit=${limit}`
  );
};

/*
|--------------------------------------------------------------------------
| Create Comment Or Reply
|--------------------------------------------------------------------------
*/

type CreateCommentPayload = {
  content: string;
  parentComment?: string | null;
};

type CreateCommentResponse = {
  success: boolean;
  message: string;
  comment: Comment;
};

export const createComment = async (
  dumpId: string,
  payload: CreateCommentPayload
): Promise<CreateCommentResponse> => {
  return protectedRequest<CreateCommentResponse>(
    `/api/comments/dump/${dumpId}`,
    {
      method: "POST",
      body: {
        content: payload.content.trim(),
        parentComment: payload.parentComment || null,
      },
    }
  );
};

/*
|--------------------------------------------------------------------------
| Comment Reactions
|--------------------------------------------------------------------------
*/

export const toggleCommentReaction = async (
  commentId: string,
  reactionType: ReactionType
): Promise<ToggleReactionResponse> => {
  return protectedRequest<ToggleReactionResponse>(
    `/api/comments/${commentId}/reaction`,
    {
      method: "PATCH",
      body: {
        reactionType,
      },
    }
  );
};

/*
|--------------------------------------------------------------------------
| Report Comment
|--------------------------------------------------------------------------
*/

export const reportComment = async (
  commentId: string,
  reason: ReportReason
): Promise<ReportResponse> => {
  return protectedRequest<ReportResponse>(
    `/api/comments/${commentId}/report`,
    {
      method: "POST",
      body: {
        reason,
      },
    }
  );
};

/*
|--------------------------------------------------------------------------
| Delete Comment
|--------------------------------------------------------------------------
*/

export const deleteComment = async (
  commentId: string
): Promise<DeleteResponse> => {
  return protectedRequest<DeleteResponse>(
    `/api/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
};