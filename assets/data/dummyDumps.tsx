export type ProfileAvatarId =
    | "basicBlue"
    | "basicGreen"
    | "basicOrange"
    | "basicPink"
    | "basicPurple"
    | "basicYellow"
    | "diamondBoy"
    | "diamondGirl";

export type SchoolLevel =
    | "college"
    | "highSchool";

export type HighSchoolClassification =
    | "freshman"
    | "sophomore"
    | "junior"
    | "senior";

export type SocialMediaPlatform =
    | "instagram"
    | "x"
    | "youtube"
    | "snapchat";

export type DumpReactionType =
    | "fire"
    | "laugh"
    | "heart";

export type DumpReaction = {
    type: DumpReactionType;
    emoji: string;
    count: number;
};

export type DummyDumpAuthor = {
    id: string;

    username: string;
    selectedAvatar: ProfileAvatarId;

    schoolLevel: SchoolLevel;

    collegeName: string | null;
    highSchoolClassification: HighSchoolClassification | null;

    isSubscribed: boolean;

    /*
     * These are optional for now so your existing dummy comments
     * do not need to be rewritten immediately.
     */
    isStudentAthlete?: boolean;
    sportOrHobby?: string | null;
    sportOrHobbyEmoji?: string | null;

    socialMediaPlatform: SocialMediaPlatform | null;
    socialMediaUrl: string | null;
    socialMediaUsername: string | null;
};

export type DummyDump = {
    id: string;

    author: DummyDumpAuthor;

    thread: SchoolLevel;

    content: string;
    timeAgo: string;

    isAnonymous: boolean;
    isTrending?: boolean;

    commentCount: number;
    reactions: DumpReaction[];

    currentUserReaction?: DumpReactionType | null;
};

export const dummyDumps: DummyDump[] = [
    {
        id: "dump-1",

        author: {
            id: "user-1",
            username: "cyberglobers",
            selectedAvatar: "basicBlue",

            schoolLevel: "college",
            collegeName: "Texas Tech",
            highSchoolClassification: null,

            isSubscribed: true,

            isStudentAthlete: true,
            sportOrHobby: "Chess",
            sportOrHobbyEmoji: "♟️",

            socialMediaPlatform: "youtube",
            socialMediaUrl:
                "https://www.youtube.com/@chess",
            socialMediaUsername: "@chess",
        },

        thread: "college",

        content:
            "Why does every professor schedule an exam during the exact same week? 😭",

        timeAgo: "2h",

        isAnonymous: false,
        isTrending: true,

        commentCount: 12,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 142,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 37,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 18,
            },
        ],

        currentUserReaction: null,
    },

    {
        id: "dump-2",

        author: {
            id: "user-2",
            username: "almostpassed",
            selectedAvatar: "basicOrange",

            schoolLevel: "college",
            collegeName: "University of Houston",
            highSchoolClassification: null,

            isSubscribed: false,

            isStudentAthlete: false,
            sportOrHobby: null,
            sportOrHobbyEmoji: null,

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        thread: "college",

        content:
            "Why are professors acting like we have unlimited time? 😂",

        timeAgo: "3h",

        isAnonymous: false,

        commentCount: 9,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 98,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 21,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 11,
            },
        ],

        currentUserReaction: "laugh",
    },

    {
        id: "dump-3",

        author: {
            id: "user-3",
            username: "lowkeytired",
            selectedAvatar: "basicPink",

            schoolLevel: "college",
            collegeName: "Texas A&M",
            highSchoolClassification: null,

            isSubscribed: true,

            isStudentAthlete: true,
            sportOrHobby: "Volleyball",
            sportOrHobbyEmoji: "🏐",

            socialMediaPlatform: "youtube",
            socialMediaUrl:
                "https://www.youtube.com/@NCAA",
            socialMediaUsername: "@NCAA",
        },

        thread: "college",

        content:
            "Group projects be ruining friendships one assignment at a time.",

        timeAgo: "4h",

        isAnonymous: false,

        commentCount: 6,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 87,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 32,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 25,
            },
        ],

        currentUserReaction: null,
    },

    {
        id: "dump-4",

        author: {
            id: "user-4",
            username: "straightastudent",
            selectedAvatar: "basicPurple",

            schoolLevel: "college",
            collegeName: "University of Texas at Austin",
            highSchoolClassification: null,

            isSubscribed: false,

            isStudentAthlete: true,
            sportOrHobby: "Track and Field",
            sportOrHobbyEmoji: "🏃",

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        thread: "college",

        content:
            "Who else is already counting down to summer? ☀️",

        timeAgo: "5h",

        isAnonymous: false,

        commentCount: 4,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 76,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 14,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 9,
            },
        ],

        currentUserReaction: null,
    },

    {
        id: "dump-5",

        author: {
            id: "user-5",
            username: "campuschris",
            selectedAvatar: "basicGreen",

            schoolLevel: "college",
            collegeName: "Texas State University",
            highSchoolClassification: null,

            isSubscribed: true,

            isStudentAthlete: true,
            sportOrHobby: "Basketball",
            sportOrHobbyEmoji: "🏀",

            socialMediaPlatform: "youtube",
            socialMediaUrl:
                "https://www.youtube.com/@NBA",
            socialMediaUsername: "@NBA",
        },

        thread: "college",

        content:
            "Campus food prices are beginning to feel like a subscription service.",

        timeAgo: "6h",

        isAnonymous: false,

        commentCount: 18,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 51,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 19,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 7,
            },
        ],

        currentUserReaction: null,
    },

    {
        id: "dump-6",

        author: {
            id: "user-6",
            username: "almostgraduated",
            selectedAvatar: "basicYellow",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "senior",

            isSubscribed: false,

            isStudentAthlete: true,
            sportOrHobby: "Softball",
            sportOrHobbyEmoji: "🥎",

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        thread: "highSchool",

        content:
            "Senior year is somehow moving extremely fast and extremely slow at the same time.",

        timeAgo: "1h",

        isAnonymous: false,
        isTrending: true,

        commentCount: 8,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 44,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 16,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 29,
            },
        ],

        currentUserReaction: "heart",
    },

    {
        id: "dump-7",

        author: {
            id: "user-7",
            username: "hallwayreporter",
            selectedAvatar: "diamondGirl",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "junior",

            isSubscribed: true,

            isStudentAthlete: true,
            sportOrHobby: "Cheerleading",
            sportOrHobbyEmoji: "📣",

            socialMediaPlatform: "youtube",
            socialMediaUrl:
                "https://www.youtube.com/@ESPN",
            socialMediaUsername: "@ESPN",
        },

        thread: "highSchool",

        content:
            "The hallway after lunch has more plot twists than an entire TV season.",

        timeAgo: "2h",

        isAnonymous: false,

        commentCount: 21,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 64,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 81,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 12,
            },
        ],

        currentUserReaction: null,
    },

    {
        id: "dump-8",

        author: {
            id: "user-8",
            username: "freshmanproblems",
            selectedAvatar: "basicBlue",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "freshman",

            isSubscribed: false,

            isStudentAthlete: false,
            sportOrHobby: "Gaming",
            sportOrHobbyEmoji: "🎮",

            socialMediaPlatform: null,
            socialMediaUrl: null,
            socialMediaUsername: null,
        },

        thread: "highSchool",

        content:
            "Nobody warned me that finding your next class would be a full workout.",

        timeAgo: "3h",

        isAnonymous: false,

        commentCount: 5,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 22,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 34,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 11,
            },
        ],

        currentUserReaction: null,
    },

    {
        id: "dump-9",

        author: {
            id: "user-9",
            username: "sophomoreszn",
            selectedAvatar: "basicPurple",

            schoolLevel: "highSchool",
            collegeName: null,
            highSchoolClassification: "sophomore",

            isSubscribed: true,

            isStudentAthlete: true,
            sportOrHobby: "Soccer",
            sportOrHobbyEmoji: "⚽",

            socialMediaPlatform: "youtube",
            socialMediaUrl:
                "https://www.youtube.com/@MLS",
            socialMediaUsername: "@MLS",
        },

        thread: "highSchool",

        content:
            "Teachers saying the assignment is easy always means we are about to struggle.",

        timeAgo: "4h",

        isAnonymous: false,

        commentCount: 14,

        reactions: [
            {
                type: "fire",
                emoji: "🔥",
                count: 48,
            },
            {
                type: "laugh",
                emoji: "😂",
                count: 57,
            },
            {
                type: "heart",
                emoji: "❤️",
                count: 20,
            },
        ],

        currentUserReaction: null,
    },
];