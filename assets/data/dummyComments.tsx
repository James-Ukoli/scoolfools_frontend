import type {
    DummyDumpAuthor,
} from "./dummyDumps";

export type DummyComment = {
    id: string;
    dumpId: string;

    author: DummyDumpAuthor;

    content: string;
    timeAgo: string;

    likeCount: number;
    isLikedByCurrentUser: boolean;

    parentCommentId: string | null;
    replyCount: number;

    isCurrentUserComment?: boolean;
};

export const dummyComments: DummyComment[] = [
    {
        id: "comment-1",
        dumpId: "dump-1",

        author: {
            id: "comment-user-1",
            username: "midtermvictim",
            selectedAvatar: "basicOrange",

            schoolLevel: "college",
            collegeName: "University of Houston",
            highSchoolClassification: null,

            isSubscribed: true,

            socialMediaPlatform: "instagram",
            socialMediaUrl:
                "https://instagram.com/midtermvictim",
            socialMediaUsername: "@midtermvictim",
        },

        content:
            "Mine scheduled two exams and a project for the same day.",

        timeAgo: "18m",

        likeCount: 14,
        isLikedByCurrentUser: false,

        parentCommentId: null,
        replyCount: 2,
    },

    {
        id: "comment-2",
        dumpId: "dump-1",

        author: {
            id: "comment-user-2",
            username: "barelypassing",
            selectedAvatar: "basicPink",

            schoolLevel: "college",
            collegeName: "Texas A&M",
            highSchoolClassification: null,

            isSubscribed: false,

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        content:
            "Professors must share the same calendar just to make sure this happens.",

        timeAgo: "11m",

        likeCount: 7,
        isLikedByCurrentUser: true,

        parentCommentId: null,
        replyCount: 0,
    },

    {
        id: "comment-3",
        dumpId: "dump-1",

        author: {
            id: "comment-user-3",
            username: "campuschris",
            selectedAvatar: "basicGreen",

            schoolLevel: "college",
            collegeName: "Texas State University",
            highSchoolClassification: null,

            isSubscribed: true,

            socialMediaPlatform: "x",
            socialMediaUrl:
                "https://x.com/campuschris",
            socialMediaUsername: "@campuschris",
        },

        content:
            "We are all living the exact same life 😭",

        timeAgo: "5m",

        likeCount: 3,
        isLikedByCurrentUser: false,

        parentCommentId: "comment-1",
        replyCount: 0,
    },

    {
        id: "comment-4",
        dumpId: "dump-2",

        author: {
            id: "comment-user-4",
            username: "libraryresident",
            selectedAvatar: "basicYellow",

            schoolLevel: "college",
            collegeName: "University of North Texas",
            highSchoolClassification: null,

            isSubscribed: false,

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        content:
            "One professor told us to manage our time better after assigning three chapters overnight.",

        timeAgo: "24m",

        likeCount: 21,
        isLikedByCurrentUser: false,

        parentCommentId: null,
        replyCount: 1,
    },

    {
        id: "comment-5",
        dumpId: "dump-3",

        author: {
            id: "comment-user-5",
            username: "groupchatadmin",
            selectedAvatar: "diamondBoy",

            schoolLevel: "college",
            collegeName: "Baylor University",
            highSchoolClassification: null,

            isSubscribed: true,

            socialMediaPlatform: "youtube",
            socialMediaUrl:
                "https://youtube.com/@groupchatadmin",
            socialMediaUsername: "@groupchatadmin",
        },

        content:
            "The group chat gets silent as soon as somebody asks who finished their part.",

        timeAgo: "31m",

        likeCount: 18,
        isLikedByCurrentUser: false,

        parentCommentId: null,
        replyCount: 3,
    },

    {
        id: "comment-6",
        dumpId: "dump-6",

        author: {
            id: "comment-user-6",
            username: "junioryearloading",
            selectedAvatar: "basicPurple",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "junior",

            isSubscribed: false,

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        content:
            "Junior year felt like five years and five minutes at the same time.",

        timeAgo: "16m",

        likeCount: 10,
        isLikedByCurrentUser: false,

        parentCommentId: null,
        replyCount: 0,
    },

    {
        id: "comment-7",
        dumpId: "dump-6",

        author: {
            id: "comment-user-7",
            username: "seniorcountdown",
            selectedAvatar: "diamondGirl",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "senior",

            isSubscribed: true,

            socialMediaPlatform: "instagram",
            socialMediaUrl:
                "https://instagram.com/seniorcountdown",
            socialMediaUsername: "@seniorcountdown",
        },

        content:
            "Graduation felt far away until everybody started ordering their caps and gowns.",

        timeAgo: "8m",

        likeCount: 17,
        isLikedByCurrentUser: true,

        parentCommentId: null,
        replyCount: 1,
    },

    {
        id: "comment-8",
        dumpId: "dump-7",

        author: {
            id: "comment-user-8",
            username: "cafeteriaobserver",
            selectedAvatar: "basicOrange",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "sophomore",

            isSubscribed: false,

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        content:
            "Every lunch period has at least one new storyline.",

        timeAgo: "12m",

        likeCount: 25,
        isLikedByCurrentUser: false,

        parentCommentId: null,
        replyCount: 2,
    },
];