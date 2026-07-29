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
    | "studentDump"
    | "notifications"
    | "none";

export type NotificationDeepLinkResult = {
    handled: boolean;
    destination: NotificationDeepLinkDestination;
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

    return normalizedValue || undefined;
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
        typeof data.metadata !== "object" ||
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
        resourceType === "student_dump"
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
        resourceType === "student_dump"
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
            /*
             * A failed read-status request should not prevent navigation.
             */
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

    /*
     * Exact navigator path:
     *
     * Root stack:
     * MainTabs
     *
     * AppShell stack:
     * BottomTabs
     *
     * Bottom tab:
     * Dump
     */
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

const navigateToNotifications =
    (): void => {
        /*
         * Notifications is registered inside AppShell, which is mounted by
         * the root MainTabs route.
         */
        navigate(
            "MainTabs",
            {
                screen: "Notifications",
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
        if (
            !rawData ||
            typeof rawData !== "object" ||
            Array.isArray(rawData)
        ) {
            console.log(
                "Notification deep link received an invalid payload:",
                rawData,
            );

            navigateToNotifications();

            return {
                handled: false,
                destination:
                    "notifications",
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

        await safelyMarkNotificationAsRead(
            notificationId,
        );

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

                navigateToNotifications();

                return {
                    handled: false,
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
         * Featured posts, alerts, TV, events and other notification
         * destinations can be added after Student Dump interaction deep
         * linking is complete.
         *
         * For now, unsupported notification types safely open the
         * notification feed.
         */
        console.log(
            "No Student Dump deep-link destination matched this payload:",
            data,
        );

        navigateToNotifications();

        return {
            handled: false,
            destination:
                "notifications",
            reason:
                "The notification type does not yet have a supported destination.",
        };
    };

/*
|--------------------------------------------------------------------------
| Expo Response Handler
|--------------------------------------------------------------------------
|
| Use this with:
|
| addNotificationResponseReceivedListener
| getLastNotificationResponseAsync
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