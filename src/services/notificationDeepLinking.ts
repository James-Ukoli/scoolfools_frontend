import * as Notifications from "expo-notifications";
import {
    navigate,
} from "../navigation/AppNavigation";
import {
    markNotificationAsRead,
} from "../api/notificationApi";
/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/
export type ScoolFoolsNotificationData = {
    notificationId?: unknown;
    type?: unknown;
    notificationType?: unknown;
    resourceType?: unknown;
    resourceId?: unknown;
    dumpId?: unknown;
    commentId?: unknown;
    replyId?: unknown;
    parentCommentId?: unknown;
    metadata?: unknown;
    [key: string]: unknown;
};
type NotificationMetadata = {
    notificationId?: unknown;
    type?: unknown;
    notificationType?: unknown;
    resourceType?: unknown;
    resource_type?: unknown;
    resourceId?: unknown;
    resource_id?: unknown;
    dumpId?: unknown;
    dump_id?: unknown;
    commentId?: unknown;
    comment_id?: unknown;
    replyId?: unknown;
    reply_id?: unknown;
    parentCommentId?: unknown;
    parent_comment_id?: unknown;
    [key: string]: unknown;
};
export type NotificationDeepLinkDestination =
    | "article"
    | "studentDump"
    | "home"
    | "notifications"
    | "none";
export type NotificationDeepLinkResult = {
    handled: boolean;
    destination:
        NotificationDeepLinkDestination;
    reason?: string;
};
/*
|--------------------------------------------------------------------------
| Normalization Helpers
|--------------------------------------------------------------------------
*/
const normalizeString = (
    value: unknown,
): string | undefined => {
    if (
        typeof value !== "string" &&
        typeof value !== "number"
    ) {
        return undefined;
    }
    const normalizedValue =
        String(value).trim();
    return (
        normalizedValue ||
        undefined
    );
};
const firstString = (
    ...values: unknown[]
): string | undefined => {
    for (const value of values) {
        const normalizedValue =
            normalizeString(value);
        if (normalizedValue) {
            return normalizedValue;
        }
    }
    return undefined;
};
const normalizeKey = (
    value: unknown,
): string | undefined => {
    const normalizedValue =
        normalizeString(value);
    if (!normalizedValue) {
        return undefined;
    }
    return normalizedValue
        .replace(
            /([a-z])([A-Z])/g,
            "$1_$2",
        )
        .replace(
            /[\s-]+/g,
            "_",
        )
        .toLowerCase();
};
const getMetadata = (
    data: ScoolFoolsNotificationData,
): NotificationMetadata => {
    if (
        !data.metadata ||
        typeof data.metadata !==
            "object" ||
        Array.isArray(data.metadata)
    ) {
        return {};
    }
    return data.metadata as NotificationMetadata;
};
/*
|--------------------------------------------------------------------------
| Payload Value Helpers
|--------------------------------------------------------------------------
*/
const getNotificationId = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return firstString(
        data.notificationId,
        metadata.notificationId,
    );
};
const getNotificationType = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return normalizeKey(
        firstString(
            data.type,
            data.notificationType,
            metadata.type,
            metadata.notificationType,
        ),
    );
};
const getResourceType = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return normalizeKey(
        firstString(
            data.resourceType,
            metadata.resourceType,
            metadata.resource_type,
        ),
    );
};
const getResourceId = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return firstString(
        data.resourceId,
        metadata.resourceId,
        metadata.resource_id,
    );
};

const getArticleSlug = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return firstString(
        data.slug,
        data.articleSlug,
        data.postSlug,
        data.resourceSlug,
        metadata.slug,
        metadata.articleSlug,
        metadata.article_slug,
        metadata.postSlug,
        metadata.post_slug,
        metadata.resourceSlug,
        metadata.resource_slug,
    );
};
const getDumpId = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
    resourceType?: string,
    resourceId?: string,
): string | undefined => {
    const explicitDumpId =
        firstString(
            data.dumpId,
            metadata.dumpId,
            metadata.dump_id,
        );
    if (explicitDumpId) {
        return explicitDumpId;
    }
    if (
        resourceType === "dump" ||
        resourceType ===
            "student_dump"
    ) {
        return resourceId;
    }
    return undefined;
};
const getCommentId = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return firstString(
        data.commentId,
        metadata.commentId,
        metadata.comment_id,
    );
};
const getReplyId = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
    notificationType?: string,
): string | undefined => {
    const explicitReplyId =
        firstString(
            data.replyId,
            metadata.replyId,
            metadata.reply_id,
        );
    if (explicitReplyId) {
        return explicitReplyId;
    }
    if (
        notificationType === "reply" ||
        notificationType ===
            "comment_reply"
    ) {
        return firstString(
            data.commentId,
            metadata.commentId,
            metadata.comment_id,
        );
    }
    return undefined;
};
const getParentCommentId = (
    data: ScoolFoolsNotificationData,
    metadata: NotificationMetadata,
): string | undefined => {
    return firstString(
        data.parentCommentId,
        metadata.parentCommentId,
        metadata.parent_comment_id,
    );
};
/*
|--------------------------------------------------------------------------
| Supported Article Notification Types
|--------------------------------------------------------------------------
*/

const ARTICLE_NOTIFICATION_TYPES = new Set<string>([
    "article",
    "news",
    "sports",
    "blog",
    "post",
    "breaking",
    "featured",
]);

const ARTICLE_RESOURCE_TYPES = new Set<string>([
    "article",
    "news",
    "sports",
    "blog",
    "post",
]);

const shouldRouteToArticle = (
    notificationType?: string,
    resourceType?: string,
    articleSlug?: string,
): boolean => {
    if (!articleSlug) {
        return false;
    }

    if (
        resourceType &&
        ARTICLE_RESOURCE_TYPES.has(resourceType)
    ) {
        return true;
    }

    if (
        notificationType &&
        ARTICLE_NOTIFICATION_TYPES.has(notificationType)
    ) {
        return true;
    }

    // If the backend explicitly supplied an article slug, treat it as
    // an article deep link even if the type naming changes later.
    return true;
};

/*
|--------------------------------------------------------------------------
| Supported Student Dump Notification Types
|--------------------------------------------------------------------------
*/
const STUDENT_DUMP_NOTIFICATION_TYPES =
    new Set<string>([
        "reaction",
        "dump_reaction",
        "post_reaction",
        "comment",
        "dump_comment",
        "post_comment",
        "reply",
        "comment_reply",
        "milestone",
        "reaction_milestone",
        "dump_milestone",
        "trending",
        "trending_dump",
        "featured_dump",
    ]);
const COMMENT_NOTIFICATION_TYPES =
    new Set<string>([
        "comment",
        "dump_comment",
        "post_comment",
    ]);
const REPLY_NOTIFICATION_TYPES =
    new Set<string>([
        "reply",
        "comment_reply",
    ]);
const shouldRouteToStudentDump = (
    notificationType?: string,
    resourceType?: string,
    dumpId?: string,
): boolean => {
    if (dumpId) {
        return true;
    }
    if (
        notificationType &&
        STUDENT_DUMP_NOTIFICATION_TYPES.has(
            notificationType,
        )
    ) {
        return true;
    }
    return (
        resourceType === "dump" ||
        resourceType ===
            "student_dump"
    );
};
/*
|--------------------------------------------------------------------------
| Read Status
|--------------------------------------------------------------------------
*/
const safelyMarkNotificationAsRead =
    async (
        notificationId?: string,
    ): Promise<void> => {
        if (!notificationId) {
            return;
        }
        try {
            await markNotificationAsRead(
                notificationId,
            );
        } catch (error) {
            console.log(
                "Unable to mark notification as read during deep linking:",
                error,
            );
        }
    };
/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/
const navigateToArticle = (
    slug: string,
): void => {
    navigate(
        "ArticleScreen",
        {
            slug,
        } as never,
    );
};

const navigateToStudentDump = ({
    notificationId,
    notificationType,
    dumpId,
    commentId,
    replyId,
    parentCommentId,
}: {
    notificationId?: string;
    notificationType?: string;
    dumpId: string;
    commentId?: string;
    replyId?: string;
    parentCommentId?: string;
}): void => {
    const isCommentNotification =
        Boolean(
            notificationType &&
                COMMENT_NOTIFICATION_TYPES.has(
                    notificationType,
                ),
        );
    const isReplyNotification =
        Boolean(
            notificationType &&
                REPLY_NOTIFICATION_TYPES.has(
                    notificationType,
                ),
        );
    const openComments =
        isCommentNotification ||
        isReplyNotification ||
        Boolean(commentId) ||
        Boolean(replyId);
    const scrollToCommentId =
        replyId ||
        commentId ||
        undefined;
    navigate(
        "MainTabs",
        {
            screen: "BottomTabs",
            params: {
                screen: "Dump",
                params: {
                    openedFromNotification:
                        true,
                    notificationId,
                    notificationType,
                    dumpId,
                    openComments,
                    commentId,
                    replyId,
                    parentCommentId,
                    scrollToCommentId,
                },
            },
        } as never,
    );
};
const navigateToHome = (): void => {
    navigate(
        "MainTabs",
        {
            screen: "BottomTabs",
            params: {
                screen: "Home",
            },
        } as never,
    );
};

const navigateToNotifications =
    (): void => {
        navigate(
            "MainTabs",
            {
                screen:
                    "Notifications",
            } as never,
        );
    };
/*
|--------------------------------------------------------------------------
| Main Deep-Link Handler
|--------------------------------------------------------------------------
*/
export const handleNotificationDeepLink =
    async (
        rawData: unknown,
    ): Promise<NotificationDeepLinkResult> => {
        /*
         * Do not navigate when the notification response has no usable data.
         *
         * Previously, an empty or stale Expo response automatically opened
         * the Notifications screen during terminal reloads.
         */
        if (
            !rawData ||
            typeof rawData !==
                "object" ||
            Array.isArray(rawData)
        ) {
            console.log(
                "Notification deep link ignored because the payload was missing or invalid:",
                rawData,
            );
            return {
                handled: false,
                destination: "none",
                reason:
                    "Notification payload was missing or invalid.",
            };
        }
        const data =
            rawData as ScoolFoolsNotificationData;
        const metadata =
            getMetadata(data);
        const notificationId =
            getNotificationId(
                data,
                metadata,
            );
        const notificationType =
            getNotificationType(
                data,
                metadata,
            );
        const resourceType =
            getResourceType(
                data,
                metadata,
            );
        const resourceId =
            getResourceId(
                data,
                metadata,
            );

        const articleSlug =
            getArticleSlug(
                data,
                metadata,
            );
        const dumpId =
            getDumpId(
                data,
                metadata,
                resourceType,
                resourceId,
            );
        const commentId =
            getCommentId(
                data,
                metadata,
            );
        const replyId =
            getReplyId(
                data,
                metadata,
                notificationType,
            );
        const parentCommentId =
            getParentCommentId(
                data,
                metadata,
            );
        /*
         * An object such as {} is technically an object, but it is not a
         * valid ScoolFools notification payload.
         */
        const hasRecognizedNotificationData =
            Boolean(
                notificationId ||
                    notificationType ||
                    resourceType ||
                    resourceId ||
                    articleSlug ||
                    dumpId ||
                    commentId ||
                    replyId ||
                    parentCommentId,
            );
        if (
            !hasRecognizedNotificationData
        ) {
            console.log(
                "Notification deep link ignored because no recognized notification fields were found:",
                data,
            );
            return {
                handled: false,
                destination: "none",
                reason:
                    "No recognized notification fields were found.",
            };
        }
        await safelyMarkNotificationAsRead(
            notificationId,
        );
        if (
            shouldRouteToArticle(
                notificationType,
                resourceType,
                articleSlug,
            ) &&
            articleSlug
        ) {
            navigateToArticle(articleSlug);

            return {
                handled: true,
                destination: "article",
            };
        }

        if (
            shouldRouteToStudentDump(
                notificationType,
                resourceType,
                dumpId,
            )
        ) {
            if (!dumpId) {
                console.log(
                    "Student Dump notification did not include a dump ID:",
                    data,
                );
                /*
                 * This was a real notification tap, but its destination is
                 * incomplete. Opening the notification feed is safer than
                 * attempting to open an invalid Dump screen.
                 */
                navigateToNotifications();
                return {
                    handled: true,
                    destination:
                        "notifications",
                    reason:
                        "Student Dump notification did not include dumpId.",
                };
            }
            navigateToStudentDump({
                notificationId,
                notificationType,
                dumpId,
                commentId,
                replyId,
                parentCommentId,
            });
            return {
                handled: true,
                destination:
                    "studentDump",
            };
        }
        /*
         * A valid notification with a currently unsupported destination
         * opens the notification feed.
         *
         * Empty or stale responses were already rejected above, so they will
         * no longer send the user here after a terminal reload.
         */
        console.log(
            "No supported article or Student Dump deep-link destination matched this valid payload. Opening Home:",
            data,
        );
        navigateToHome();
        return {
            handled: true,
            destination: "home",
            reason:
                "General or custom notification opened the Home screen.",
        };
    };
/*
|--------------------------------------------------------------------------
| Expo Response Handler
|--------------------------------------------------------------------------
*/
export const handleNotificationResponse =
    async (
        response: Notifications.NotificationResponse,
    ): Promise<NotificationDeepLinkResult> => {
        const data =
            response.notification.request
                .content.data;
        return handleNotificationDeepLink(
            data,
        );
    };
/*
|--------------------------------------------------------------------------
| Development Test Helper
|--------------------------------------------------------------------------
*/
export const testNotificationDeepLink =
    async (
        data: ScoolFoolsNotificationData,
    ): Promise<NotificationDeepLinkResult> => {
        return handleNotificationDeepLink(
            data,
        );
    };