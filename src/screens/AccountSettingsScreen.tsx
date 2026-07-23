import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    Keyboard,
    Easing,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { COLLEGES } from "../../assets/data/colleges";
import BlogsPaywallModal from "../components/BlogsPaywallModal";
import {
    initializeIAP,
    getBlogsSubscriptionProduct,
    buyBlogsSubscription,
    setupPurchaseListeners,
    cleanupIAP,
} from "../services/iap";
import { finishTransaction } from "react-native-iap";
import ConfettiCannon from "react-native-confetti-cannon";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;
const MINIMUM_LOADING_DURATION_MS = 2000;

const waitForMinimumLoadingDuration = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    const remaining = MINIMUM_LOADING_DURATION_MS - elapsed;

    if (remaining > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    }
};

type SchoolLevel = "college" | "highSchool";
type HighSchoolClassification =
    | "freshman"
    | "sophomore"
    | "junior"
    | "senior";
type AthleteChoice = boolean | null;
type SocialPlatform = "instagram" | "x" | "youtube" | "snapchat";
type TimeTheme = "day" | "night";

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getAccountSettingsTheme = (mode: TimeTheme) => {
    const isNight = mode === "night";

    return {
        mode,
        bg: isNight ? "#020617" : "#FFFFFF",
        surface: isNight ? "#0F172A" : "#F8F9FA",
        surfaceSoft: isNight ? "#111827" : "#F1F3F5",
        text: isNight ? "#F8FAFC" : "#07111F",
        subtext: isNight ? "#CBD5E1" : "#697580",
        muted: isNight ? "#94A3B8" : "#89939D",
        placeholder: isNight ? "#64748B" : "#9AA4AE",
        border: isNight ? "rgba(255,255,255,0.12)" : "#DDE3E7",
        divider: isNight ? "rgba(255,255,255,0.09)" : "#EEF1F3",
        selected: isNight ? "rgba(34,211,238,0.12)" : "#E6FAFC",
        errorBg: isNight ? "#2A1215" : "#FFF8F8",
        error: isNight ? "#FF7A7A" : "#D92D20",
        cyan: isNight ? "#22D3EE" : "#06B6D4",
        cyanDark: isNight ? "#22D3EE" : "#06A8C0",
        yellow: "#FACC15",
        darkText: "#07111F",
        white: "#FFFFFF",
    };
};

type AvatarOption = {
    id: string;
    source: any;
    subscriberOnly?: boolean;
};

const AVATARS: AvatarOption[] = [
    // Top row
    {
        id: "basicBlue",
        source: require("../../assets/images/profileimages/basicBlue.png"),
    },
    {
        id: "basicGreen",
        source: require("../../assets/images/profileimages/basicGreen.png"),
        subscriberOnly: true,
    },
    {
        id: "basicPurple",
        source: require("../../assets/images/profileimages/basicPurple.png"),
        subscriberOnly: true,
    },
    {
        id: "diamondBoy",
        source: require("../../assets/images/profileimages/diamondBoy.png"),
        subscriberOnly: true,
    },

    // Bottom row
    {
        id: "basicYellow",
        source: require("../../assets/images/profileimages/basicYellow.png"),
    },
    {
        id: "basicOrange",
        source: require("../../assets/images/profileimages/basicOrange.png"),
        subscriberOnly: true,
    },
    {
        id: "basicPink",
        source: require("../../assets/images/profileimages/basicPink.png"),
        subscriberOnly: true,
    },
    {
        id: "diamondGirl",
        source: require("../../assets/images/profileimages/diamondGirl.png"),
        subscriberOnly: true,
    },
];

const SUBSCRIBER_AVATAR_IDS = new Set(
    AVATARS
        .filter((avatar) => avatar.subscriberOnly)
        .map((avatar) => avatar.id),
);

const HIGH_SCHOOL_CLASSIFICATIONS: Array<{
    value: HighSchoolClassification;
    label: string;
}> = [
        { value: "freshman", label: "Freshman" },
        { value: "sophomore", label: "Sophomore" },
        { value: "junior", label: "Junior" },
        { value: "senior", label: "Senior" },
    ];

const SPORTS = [
    "Basketball",
    "Football",
    "Soccer",
    "Baseball",
    "Softball",
    "Volleyball",
    "Tennis",
    "Track & Field",
    "Cross Country",
    "Swimming",
    "Wrestling",
    "Golf",
    "Lacrosse",
    "Hockey",
    "Cheerleading",
    "Gymnastics",
    "Chess",
    "Other",
];

const SOCIAL_PLATFORMS: Array<{
    value: SocialPlatform;
    label: string;
    icon: "instagram" | "x-twitter" | "youtube" | "snapchat";
    iconColor: string;
    placeholder: string;
}> = [
        {
            value: "instagram",
            label: "Instagram",
            icon: "instagram",
            iconColor: "#E4405F",
            placeholder: "https://instagram.com/yourusername",
        },
        {
            value: "x",
            label: "X",
            icon: "x-twitter",
            iconColor: "#000000",
            placeholder: "https://x.com/yourusername",
        },
        {
            value: "youtube",
            label: "YouTube",
            icon: "youtube",
            iconColor: "#FF0000",
            placeholder: "https://youtube.com/@yourchannel",
        },
        {
            value: "snapchat",
            label: "Snapchat",
            icon: "snapchat",
            iconColor: "#F2DE00",
            placeholder: "https://snapchat.com/add/yourusername",
        },
    ];

const SOCIAL_DOMAINS: Record<SocialPlatform, string[]> = {
    instagram: ["instagram.com"],
    x: ["x.com", "twitter.com"],
    youtube: ["youtube.com", "youtu.be"],
    snapchat: ["snapchat.com"],
};

const normalizeSocialUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    return `https://${trimmed}`;
};

const isValidSocialUrl = (platform: SocialPlatform, value: string) => {
    try {
        const parsedUrl = new URL(normalizeSocialUrl(value));
        const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

        if (!["https:", "http:"].includes(parsedUrl.protocol)) {
            return false;
        }

        return SOCIAL_DOMAINS[platform].some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        );
    } catch {
        return false;
    }
};

const normalizeUsername = (value: string) => {
    return value
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/[^a-z0-9._]/g, "");
};

export default function AccountSettingsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [themeMode, setThemeMode] = useState<TimeTheme>(
        getCurrentThemeMode(),
    );
    const theme = useMemo(
        () => getAccountSettingsTheme(themeMode),
        [themeMode],
    );
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [selectedAvatar, setSelectedAvatar] = useState("");
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");

    const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | null>(null);

    const [collegeName, setCollegeName] = useState("");
    const [collegeSearch, setCollegeSearch] = useState("");
    const [collegeModalVisible, setCollegeModalVisible] = useState(false);
    const [
        highSchoolClassification,
        setHighSchoolClassification,
    ] = useState<HighSchoolClassification | null>(null);

    const [isStudentAthlete, setIsStudentAthlete] = useState<AthleteChoice>(null);

    const [selectedSport, setSelectedSport] = useState("");
    const [sportModalVisible, setSportModalVisible] = useState(false);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [socialPlatform, setSocialPlatform] = useState<SocialPlatform | null>(
        null,
    );
    const [socialMediaUrl, setSocialMediaUrl] = useState("");
    const [socialMediaError, setSocialMediaError] = useState("");

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const savingProgress = useRef(new Animated.Value(0)).current;
    const avatarRotation = useRef(new Animated.Value(0)).current;

    const selectedAvatarSource = useMemo(
        () =>
            AVATARS.find((avatar) => avatar.id === selectedAvatar)?.source ||
            AVATARS[0].source,
        [selectedAvatar],
    );

    const avatarSpin = avatarRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setThemeMode(getCurrentThemeMode());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading) {
            savingProgress.setValue(0);
            avatarRotation.setValue(0);
            return;
        }

        savingProgress.setValue(0);
        avatarRotation.setValue(0);

        const progressAnimation = Animated.timing(savingProgress, {
            toValue: 1,
            duration: MINIMUM_LOADING_DURATION_MS,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
        });

        const spinAnimation = Animated.loop(
            Animated.timing(avatarRotation, {
                toValue: 1,
                duration: 850,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );

        progressAnimation.start();
        spinAnimation.start();

        return () => {
            progressAnimation.stop();
            spinAnimation.stop();
        };
    }, [avatarRotation, loading, savingProgress]);

    const updateStoredSubscriptionState = useCallback(
        async (subscribed: boolean) => {
            const storedUserRaw = await AsyncStorage.getItem("user");

            if (!storedUserRaw) return;

            try {
                const storedUser = JSON.parse(storedUserRaw);

                await AsyncStorage.setItem(
                    "user",
                    JSON.stringify({
                        ...storedUser,
                        isSubscribed: subscribed,
                        ...(!subscribed &&
                            SUBSCRIBER_AVATAR_IDS.has(
                                storedUser?.selectedAvatar || storedUser?.avatar || "",
                            )
                            ? {
                                avatar: "basicBlue",
                                selectedAvatar: "basicBlue",
                            }
                            : {}),
                    }),
                );
            } catch (error) {
                console.log("Stored subscription update error:", error);
            }
        },
        [],
    );

    const fetchEntitlements = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token || !API_BASE_URL) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/me/entitlements`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok && data?.success) {
                const subscribed = !!data?.entitlements?.isSubscribed;

                setIsSubscribed(subscribed);

                if (
                    !subscribed &&
                    SUBSCRIBER_AVATAR_IDS.has(selectedAvatar)
                ) {
                    setSelectedAvatar("basicBlue");
                }

                await updateStoredSubscriptionState(subscribed);
            }
        } catch (error) {
            console.log("Account settings entitlement fetch error:", error);
        }
    }, [selectedAvatar, updateStoredSubscriptionState]);

    const loadSubscriptionProduct = async () => {
        try {
            await initializeIAP();
            const product = await getBlogsSubscriptionProduct();
            setSubscriptionProduct(product);
        } catch (error) {
            console.log("Account settings subscription load error:", error);
        }
    };

    const verifySubscriptionOnBackend = useCallback(
        async (purchase: any) => {
            try {
                const token = await AsyncStorage.getItem("token");

                if (!token || !API_BASE_URL) {
                    throw new Error("Missing token or API base URL");
                }

                const response = await fetch(
                    `${API_BASE_URL}/api/subscriptions/verify`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            platform: Platform.OS === "ios" ? "ios" : "android",
                            productId:
                                purchase?.productId || purchase?.productIdIOS || "sfs_399_2y",
                            transactionId:
                                purchase?.transactionId ||
                                purchase?.transactionIdIOS ||
                                purchase?.id ||
                                null,
                            purchaseToken:
                                purchase?.purchaseToken ||
                                purchase?.purchaseTokenAndroid ||
                                null,
                        }),
                    },
                );

                const rawResponse = await response.text();

                let data: any = {};

                try {
                    data = rawResponse ? JSON.parse(rawResponse) : {};
                } catch {
                    data = {
                        rawResponse,
                    };
                }

                console.log("SUBSCRIPTION VERIFY RESPONSE:", {
                    status: response.status,
                    ok: response.ok,
                    data,
                });

                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                        data?.error ||
                        `Subscription verification failed with status ${response.status}`
                    );
                }

                await finishTransaction({
                    purchase,
                    isConsumable: false,
                });

                const subscribed = !!data?.isSubscribed;

                setIsSubscribed(subscribed);
                setPaywallVisible(false);
                await updateStoredSubscriptionState(subscribed);
                await fetchEntitlements();

                if (subscribed) {
                    setShowConfetti(true);
                    Alert.alert(
                        "Subscribed 🎉",
                        "Your ScoolFools subscriber avatars are now unlocked.",
                    );
                }
            } catch (error) {
                console.log("Account settings subscription verification error:", error);

                Alert.alert(
                    "Purchase Complete",
                    "Your purchase was received, but verifying it with your account failed.",
                );
            } finally {
                setLoadingSubscription(false);
            }
        },
        [fetchEntitlements, updateStoredSubscriptionState],
    );

    const handleSubscribePress = async () => {
        try {
            setLoadingSubscription(true);
            await initializeIAP();
            await buyBlogsSubscription();
        } catch (error) {
            setLoadingSubscription(false);
            console.log("Account settings subscription request error:", error);

            Alert.alert(
                "Subscription Failed",
                "Something went wrong while starting the subscription.",
            );
        }
    };

    const openSubscriberPaywall = () => {
        setPaywallVisible(true);
        void loadSubscriptionProduct();
    };

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            try {
                setInitialLoading(true);

                const storedUserRaw = await AsyncStorage.getItem("user");

                if (!storedUserRaw) {
                    throw new Error(
                        "Your saved profile could not be found. Please sign in again.",
                    );
                }

                let profile: any = {};

                try {
                    profile = JSON.parse(storedUserRaw);
                } catch {
                    throw new Error("Your saved profile information could not be read.");
                }

                if (!isMounted) {
                    return;
                }

                const avatarValue = profile?.selectedAvatar || profile?.avatar || "";

                const level =
                    profile?.schoolLevel === "college" ||
                        profile?.schoolLevel === "highSchool"
                        ? profile.schoolLevel
                        : null;

                const savedCollege =
                    level === "college" ? profile?.collegeName || "" : "";

                const savedClassification =
                    level === "highSchool" &&
                        HIGH_SCHOOL_CLASSIFICATIONS.some(
                            (classification) =>
                                classification.value ===
                                profile?.highSchoolClassification,
                        )
                        ? (profile.highSchoolClassification as HighSchoolClassification)
                        : null;

                const athleteValue =
                    typeof profile?.isStudentAthlete === "boolean"
                        ? profile.isStudentAthlete
                        : false;

                setSelectedAvatar(avatarValue);
                setUsername(profile?.username || "");
                setSchoolLevel(level);
                setCollegeName(savedCollege);
                setCollegeSearch(savedCollege);
                setHighSchoolClassification(savedClassification);
                setIsStudentAthlete(athleteValue);
                setSelectedSport(athleteValue ? profile?.sport || "" : "");

                const savedSocialPlatform = SOCIAL_PLATFORMS.some(
                    (platform) => platform.value === profile?.socialMediaPlatform,
                )
                    ? (profile.socialMediaPlatform as SocialPlatform)
                    : null;

                setIsSubscribed(!!profile?.isSubscribed);
                setSocialPlatform(savedSocialPlatform);
                setSocialMediaUrl(
                    savedSocialPlatform ? profile?.socialMediaUrl || "" : "",
                );
                setSocialMediaError("");
            } catch (error: any) {
                console.log("Account settings load error:", error);

                Alert.alert(
                    "Unable to Load Profile",
                    error?.message || "Something went wrong while loading your profile.",
                    [
                        {
                            text: "Go Back",
                            onPress: () => navigation.goBack(),
                        },
                    ],
                );
            } finally {
                if (isMounted) {
                    setInitialLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        void fetchEntitlements();

        setupPurchaseListeners({
            onPurchaseSuccess: async () => { },
            onGamesPackSuccess: async () => { },
            onBlogsSubscriptionSuccess: async (purchase: any) => {
                await verifySubscriptionOnBackend(purchase);
            },
            onPurchaseError: (error: any) => {
                setLoadingSubscription(false);
                console.log("Account settings subscription listener error:", error);
            },
        });

        return () => {
            void cleanupIAP();
        };
    }, [fetchEntitlements, verifySubscriptionOnBackend]);

    const filteredColleges = useMemo(() => {
        const search = collegeSearch.trim().toLowerCase();

        if (!search) {
            return COLLEGES;
        }

        return COLLEGES.filter((college) => college.toLowerCase().includes(search));
    }, [collegeSearch]);

    const filteredSports = useMemo(() => {
        return SPORTS;
    }, []);

    const isUsernameValid = useMemo(() => {
        return (
            username.length >= 3 &&
            username.length <= 20 &&
            /^[a-z0-9._]+$/.test(username)
        );
    }, [username]);

    const isSocialMediaValid = useMemo(() => {
        if (!socialPlatform) {
            return true;
        }

        return isValidSocialUrl(socialPlatform, socialMediaUrl);
    }, [socialMediaUrl, socialPlatform]);

    const canContinue = useMemo(() => {
        if (!selectedAvatar) {
            return false;
        }

        if (!isUsernameValid) {
            return false;
        }

        if (!schoolLevel) {
            return false;
        }

        if (schoolLevel === "college" && !COLLEGES.includes(collegeName)) {
            return false;
        }

        if (
            schoolLevel === "highSchool" &&
            !highSchoolClassification
        ) {
            return false;
        }

        if (isStudentAthlete === null) {
            return false;
        }

        if (isStudentAthlete && !selectedSport) {
            return false;
        }

        if (!isSocialMediaValid) {
            return false;
        }

        return true;
    }, [
        selectedAvatar,
        isUsernameValid,
        schoolLevel,
        collegeName,
        highSchoolClassification,
        isStudentAthlete,
        selectedSport,
        isSocialMediaValid,
    ]);

    const handleUsernameChange = (value: string) => {
        const cleaned = normalizeUsername(value);

        setUsername(cleaned);
        setUsernameError("");
    };

    const handleSchoolLevelChange = (level: SchoolLevel) => {
        setSchoolLevel(level);

        if (level === "highSchool") {
            setCollegeName("");
            setCollegeSearch("");
        }

        if (level === "college") {
            setHighSchoolClassification(null);
        }
    };

    const handleAthleteChoice = (choice: boolean) => {
        setIsStudentAthlete(choice);

        if (!choice) {
            setSelectedSport("");
        }
    };

    const handleSocialPlatformPress = (platform: SocialPlatform) => {
        if (socialPlatform === platform) {
            setSocialPlatform(null);
            setSocialMediaUrl("");
            setSocialMediaError("");
            return;
        }

        setSocialPlatform(platform);
        setSocialMediaUrl("");
        setSocialMediaError("");
    };

    const validateSocialMediaLink = () => {
        if (!socialPlatform) {
            setSocialMediaError("");
            return true;
        }

        if (!socialMediaUrl.trim()) {
            setSocialMediaError("Add your social media profile link.");
            return false;
        }

        if (!isValidSocialUrl(socialPlatform, socialMediaUrl)) {
            const platformLabel = SOCIAL_PLATFORMS.find(
                (platform) => platform.value === socialPlatform,
            )?.label;

            setSocialMediaError(
                `Enter a valid ${platformLabel || "social media"} link.`,
            );
            return false;
        }

        setSocialMediaUrl(normalizeSocialUrl(socialMediaUrl));
        setSocialMediaError("");
        return true;
    };

    const openCollegePicker = () => {
        setCollegeSearch(collegeName);
        setCollegeModalVisible(true);
    };

    const selectCollege = (college: string) => {
        setCollegeName(college);
        setCollegeSearch(college);
        setCollegeModalVisible(false);
        Keyboard.dismiss();
    };

    const validateForm = () => {
        if (!selectedAvatar) {
            Alert.alert(
                "Choose an avatar",
                "Select a ScoolFools avatar to continue.",
            );
            return false;
        }

        if (!username.trim()) {
            setUsernameError("Create a username to continue.");
            return false;
        }

        if (username.length < 3) {
            setUsernameError("Your username must contain at least 3 characters.");
            return false;
        }

        if (username.length > 20) {
            setUsernameError("Your username cannot exceed 20 characters.");
            return false;
        }

        if (!/^[a-z0-9._]+$/.test(username)) {
            setUsernameError("Use only letters, numbers, periods, and underscores.");
            return false;
        }

        if (!schoolLevel) {
            Alert.alert("Choose your school level", "Select College or High School.");
            return false;
        }

        if (schoolLevel === "college" && !COLLEGES.includes(collegeName)) {
            Alert.alert(
                "Choose your college",
                "Please select an option from the college list.",
            );
            return false;
        }

        if (
            schoolLevel === "highSchool" &&
            !highSchoolClassification
        ) {
            Alert.alert(
                "Choose your classification",
                "Select Freshman, Sophomore, Junior, or Senior.",
            );
            return false;
        }

        if (isStudentAthlete === null) {
            Alert.alert("Student athlete", "Choose Yes or No to continue.");
            return false;
        }

        if (isStudentAthlete && !selectedSport) {
            Alert.alert("Choose your sport", "Select the sport you play.");
            return false;
        }

        if (!validateSocialMediaLink()) {
            return false;
        }

        return true;
    };

    const handleSaveChanges = async () => {
        setUsernameError("");

        if (!validateForm()) {
            return;
        }

        const loadingStartedAt = Date.now();

        try {
            setLoading(true);

            if (!API_BASE_URL) {
                throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
            }

            const token = await AsyncStorage.getItem("token");

            if (!token) {
                throw new Error("Your session has expired. Please sign in again.");
            }

            const payload = {
                username: username.trim(),
                avatar: selectedAvatar,
                selectedAvatar,
                schoolLevel,
                collegeName: schoolLevel === "college" ? collegeName.trim() : "",
                highSchoolClassification:
                    schoolLevel === "highSchool"
                        ? highSchoolClassification
                        : null,
                isStudentAthlete,
                sport: isStudentAthlete ? selectedSport : "",
                socialMediaPlatform: socialPlatform || "",
                socialMediaUrl: socialPlatform
                    ? normalizeSocialUrl(socialMediaUrl)
                    : "",
            };

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me/profile-settings`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            let data: any = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                const backendMessage =
                    data?.message || data?.error || "Unable to save your profile.";

                const usernameHasError =
                    response.status === 409 ||
                    data?.code === "USERNAME_TAKEN" ||
                    data?.code === "USERNAME_REQUIRED" ||
                    data?.code === "USERNAME_TOO_SHORT" ||
                    data?.code === "USERNAME_TOO_LONG" ||
                    data?.code === "USERNAME_INVALID_FORMAT" ||
                    data?.code === "USERNAME_NOT_ALLOWED" ||
                    data?.code === "USERNAME_RESERVED";

                if (usernameHasError) {
                    setUsernameError(backendMessage || "Please choose another username.");

                    throw new Error("USERNAME_ERROR");
                }

                throw new Error(backendMessage);
            }

            const returnedUser = data?.user || data?.updatedUser || data;

            const currentStoredUser = await AsyncStorage.getItem("user");

            let existingUser = {};

            if (currentStoredUser) {
                try {
                    existingUser = JSON.parse(currentStoredUser);
                } catch {
                    existingUser = {};
                }
            }

            const userToStore = {
                ...existingUser,
                ...returnedUser,
                username: returnedUser?.username || username,
                avatar: returnedUser?.avatar || selectedAvatar,
                selectedAvatar: returnedUser?.selectedAvatar || selectedAvatar,
                schoolLevel: returnedUser?.schoolLevel || schoolLevel,
                collegeName: returnedUser?.collegeName ?? payload.collegeName,
                highSchoolClassification:
                    returnedUser?.highSchoolClassification ??
                    payload.highSchoolClassification,
                isStudentAthlete: returnedUser?.isStudentAthlete ?? isStudentAthlete,
                sport: returnedUser?.sport ?? payload.sport,
                socialMediaPlatform:
                    returnedUser?.socialMediaPlatform ?? payload.socialMediaPlatform,
                socialMediaUrl: returnedUser?.socialMediaUrl ?? payload.socialMediaUrl,
                onboardingStage:
                    returnedUser?.onboardingStage ||
                    (existingUser as any)?.onboardingStage ||
                    "complete",
            };

            await AsyncStorage.setItem("user", JSON.stringify(userToStore));

            await waitForMinimumLoadingDuration(loadingStartedAt);
            navigation.goBack();
        } catch (error: any) {
            await waitForMinimumLoadingDuration(loadingStartedAt);

            if (error?.message === "USERNAME_ERROR") {
                return;
            }

            console.log("Account settings update error:", error);

            Alert.alert(
                "Update Failed",
                error?.message || "Something went wrong while updating your profile.",
            );
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
                <View style={styles.initialLoadingContainer}>
                    <ActivityIndicator size="large" color={theme.cyan} />
                    <Text style={styles.initialLoadingText}>Loading your profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}
            >
                <View style={styles.screen}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                activeOpacity={0.8}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={styles.backIcon}>‹</Text>
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>

                            <Text style={styles.title}>Account Settings</Text>

                            <Text style={styles.subtitle}>
                                Update how you appear on ScoolFools.
                            </Text>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.label}>Choose an avatar</Text>

                            <View style={styles.avatarGrid}>
                                {AVATARS.map((avatar) => {
                                    const isSelected = selectedAvatar === avatar.id;
                                    const isLocked = !!avatar.subscriberOnly && !isSubscribed;

                                    return (
                                        <TouchableOpacity
                                            key={avatar.id}
                                            style={[
                                                styles.avatarButton,
                                                isLocked && styles.avatarButtonLocked,
                                                isSelected && styles.avatarButtonSelected,
                                            ]}
                                            onPress={() => {
                                                if (isLocked) {
                                                    openSubscriberPaywall();
                                                    return;
                                                }

                                                setSelectedAvatar(avatar.id);
                                            }}
                                            activeOpacity={0.85}
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                                isLocked
                                                    ? "Locked subscriber avatar. Opens subscription options."
                                                    : "Available profile avatar"
                                            }
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                        >
                                            <Image
                                                source={avatar.source}
                                                style={[
                                                    styles.avatarImage,
                                                    isLocked && styles.avatarImageLocked,
                                                ]}
                                                resizeMode="cover"
                                            />

                                            {isLocked && (
                                                <View style={styles.avatarLockBadge}>
                                                    <FontAwesome6 name="lock" size={11} color={theme.white} />
                                                </View>
                                            )}

                                            {isSelected && (
                                                <View style={styles.avatarCheck}>
                                                    <Text style={styles.avatarCheckText}>✓</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.label}>Username</Text>

                            <View
                                style={[
                                    styles.usernameContainer,
                                    usernameError ? styles.inputErrorBorder : null,
                                ]}
                            >
                                <Text style={styles.usernameAt}>@</Text>

                                <TextInput
                                    style={styles.usernameInput}
                                    value={username}
                                    onChangeText={handleUsernameChange}
                                    placeholder="username"
                                    placeholderTextColor={theme.placeholder}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    maxLength={20}
                                    returnKeyType="done"
                                />
                            </View>

                            {usernameError ? (
                                <Text style={styles.errorText}>{usernameError}</Text>
                            ) : (
                                <Text style={styles.helperText}>
                                    3 to 20 characters. Letters, numbers, periods, and underscores
                                    only.
                                </Text>
                            )}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.label}>School level</Text>

                            <View style={styles.optionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        schoolLevel === "college" && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => handleSchoolLevelChange("college")}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.optionEmoji}>🎓</Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            schoolLevel === "college" && styles.optionTextSelected,
                                        ]}
                                    >
                                        College
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        schoolLevel === "highSchool" && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => handleSchoolLevelChange("highSchool")}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.optionEmoji}>🎒</Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            schoolLevel === "highSchool" && styles.optionTextSelected,
                                        ]}
                                    >
                                        High School
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {schoolLevel === "college" && (
                            <View style={styles.formSection}>
                                <Text style={styles.label}>College</Text>

                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={openCollegePicker}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.dropdownText,
                                            !collegeName && styles.dropdownPlaceholder,
                                        ]}
                                    >
                                        {collegeName || "Search for your college"}
                                    </Text>

                                    <Text style={styles.dropdownArrow}>›</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {schoolLevel === "highSchool" && (
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Classification</Text>

                                <View style={styles.classificationGrid}>
                                    {HIGH_SCHOOL_CLASSIFICATIONS.map(
                                        (classification) => {
                                            const isSelected =
                                                highSchoolClassification ===
                                                classification.value;

                                            return (
                                                <TouchableOpacity
                                                    key={classification.value}
                                                    style={[
                                                        styles.classificationButton,
                                                        isSelected &&
                                                        styles.optionButtonSelected,
                                                    ]}
                                                    onPress={() =>
                                                        setHighSchoolClassification(
                                                            classification.value,
                                                        )
                                                    }
                                                    activeOpacity={0.85}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.optionText,
                                                            isSelected &&
                                                            styles.optionTextSelected,
                                                        ]}
                                                    >
                                                        {classification.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        },
                                    )}
                                </View>
                            </View>
                        )}

                        <View style={styles.formSection}>
                            <Text style={styles.label}>Are you a student athlete?</Text>

                            <View style={styles.optionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        isStudentAthlete === true && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => handleAthleteChoice(true)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.optionEmoji}>🏆</Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            isStudentAthlete === true && styles.optionTextSelected,
                                        ]}
                                    >
                                        Yes
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        isStudentAthlete === false && styles.optionButtonSelected,
                                    ]}
                                    onPress={() => handleAthleteChoice(false)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.optionEmoji}>🙌</Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            isStudentAthlete === false && styles.optionTextSelected,
                                        ]}
                                    >
                                        No
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {isStudentAthlete === true && (
                            <View style={styles.formSection}>
                                <Text style={styles.label}>Sport</Text>

                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setSportModalVisible(true)}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.dropdownText,
                                            !selectedSport && styles.dropdownPlaceholder,
                                        ]}
                                    >
                                        {selectedSport || "Select your sport"}
                                    </Text>

                                    <Text style={styles.dropdownArrow}>›</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.formSection}>
                            <Text style={styles.label}>
                                Promote your social media with your Dumps
                            </Text>

                            <Text style={styles.socialOptionalText}>
                                Optional. Choose one platform to attach to your posts.
                            </Text>

                            <View style={styles.socialPlatformGrid}>
                                {SOCIAL_PLATFORMS.map((platform) => {
                                    const isSelected = socialPlatform === platform.value;

                                    return (
                                        <TouchableOpacity
                                            key={platform.value}
                                            style={[
                                                styles.socialPlatformButton,
                                                isSelected && styles.socialPlatformButtonSelected,
                                            ]}
                                            onPress={() => handleSocialPlatformPress(platform.value)}
                                            activeOpacity={0.85}
                                            accessibilityRole="button"
                                            accessibilityLabel={platform.label}
                                            accessibilityState={{
                                                selected: isSelected,
                                            }}
                                        >
                                            <FontAwesome6
                                                name={platform.icon}
                                                size={15}
                                                color={
                                                    platform.value === "x" &&
                                                        themeMode === "night"
                                                        ? theme.white
                                                        : platform.iconColor
                                                }
                                            />

                                            {isSelected && (
                                                <View style={styles.socialSelectedCheck}>
                                                    <Text style={styles.socialSelectedCheckText}>✓</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {socialPlatform && (
                                <View style={styles.socialLinkSection}>
                                    <Text style={styles.socialLinkLabel}>
                                        {
                                            SOCIAL_PLATFORMS.find(
                                                (platform) => platform.value === socialPlatform,
                                            )?.label
                                        }{" "}
                                        profile link
                                    </Text>

                                    <TextInput
                                        style={[
                                            styles.socialLinkInput,
                                            socialMediaError ? styles.inputErrorBorder : null,
                                        ]}
                                        value={socialMediaUrl}
                                        onChangeText={(value) => {
                                            setSocialMediaUrl(value);
                                            setSocialMediaError("");
                                        }}
                                        onBlur={validateSocialMediaLink}
                                        placeholder={
                                            SOCIAL_PLATFORMS.find(
                                                (platform) => platform.value === socialPlatform,
                                            )?.placeholder
                                        }
                                        placeholderTextColor={theme.placeholder}
                                        keyboardType="url"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                    />

                                    {socialMediaError ? (
                                        <Text style={styles.errorText}>{socialMediaError}</Text>
                                    ) : (
                                        <Text style={styles.helperText}>
                                            Paste the full link to your profile or channel.
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>

                        <Text style={styles.footerText}>
                            Your changes will appear across ScoolFools.
                        </Text>
                    </ScrollView>

                    <View
                        style={[
                            styles.bottomContainer,
                            {
                                paddingBottom: Math.max(
                                    insets.bottom + 10,
                                    Platform.OS === "android" ? 24 : 18,
                                ),
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.continueButton,
                                (!canContinue || loading) && styles.continueButtonDisabled,
                            ]}
                            onPress={handleSaveChanges}
                            disabled={!canContinue || loading}
                            activeOpacity={0.88}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.darkText} />
                            ) : (
                                <Text style={styles.continueButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <Modal
                    visible={collegeModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setCollegeModalVisible(false)}
                >
                    <SafeAreaView style={styles.modalSafeArea}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setCollegeModalVisible(false)}>
                                <Text style={styles.modalCancel}>Cancel</Text>
                            </TouchableOpacity>

                            <Text style={styles.modalTitle}>Choose College</Text>

                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        <View style={styles.modalSearchContainer}>
                            <TextInput
                                style={styles.modalSearchInput}
                                value={collegeSearch}
                                onChangeText={setCollegeSearch}
                                placeholder="Search colleges"
                                placeholderTextColor={theme.placeholder}
                                autoCapitalize="words"
                                autoCorrect={false}
                                autoFocus
                                returnKeyType="search"
                            />
                        </View>

                        <FlatList
                            data={filteredColleges}
                            keyExtractor={(item, index) => `${item}-${index}`}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.modalListContent}
                            renderItem={({ item }) => {
                                const showMainListMarker =
                                    item === "Not Listed" && !collegeSearch.trim();

                                return (
                                    <View>
                                        <TouchableOpacity
                                            style={styles.modalListItem}
                                            onPress={() => selectCollege(item)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.modalListText}>{item}</Text>

                                            {collegeName === item && (
                                                <Text style={styles.modalCheck}>✓</Text>
                                            )}
                                        </TouchableOpacity>

                                        {showMainListMarker && (
                                            <View style={styles.collegeListDivider}>
                                                <View style={styles.collegeDividerLine} />

                                                <Text style={styles.collegeDividerText}>COLLEGES</Text>

                                                <View style={styles.collegeDividerLine} />
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyTitle}>No matching college</Text>

                                    <Text style={styles.emptyText}>
                                        Try another spelling, or select Other College or Not Listed.
                                    </Text>
                                </View>
                            }
                        />
                    </SafeAreaView>
                </Modal>

                <Modal
                    visible={sportModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setSportModalVisible(false)}
                >
                    <SafeAreaView style={styles.modalSafeArea}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSportModalVisible(false)}>
                                <Text style={styles.modalCancel}>Cancel</Text>
                            </TouchableOpacity>

                            <Text style={styles.modalTitle}>Choose Sport</Text>

                            <View style={styles.modalHeaderSpacer} />
                        </View>

                        <FlatList
                            data={filteredSports}
                            keyExtractor={(item, index) => `${item}-${index}`}
                            contentContainerStyle={styles.modalListContent}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalListItem}
                                    onPress={() => {
                                        setSelectedSport(item);
                                        setSportModalVisible(false);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalListText}>{item}</Text>

                                    {selectedSport === item && (
                                        <Text style={styles.modalCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </SafeAreaView>
                </Modal>
            </KeyboardAvoidingView>

            <Modal
                visible={loading}
                transparent
                animationType="fade"
                statusBarTranslucent
                navigationBarTranslucent
            >
                <View style={styles.savingOverlay}>
                    <View style={styles.savingCard}>
                        <Animated.View
                            style={[
                                styles.savingAvatarWrap,
                                {
                                    transform: [
                                        {
                                            rotate: avatarSpin,
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Image
                                source={selectedAvatarSource}
                                style={styles.savingAvatar}
                                resizeMode="cover"
                            />
                        </Animated.View>

                        <Text style={styles.savingTitle}>
                            {username || "ScoolFools user"}, your profile is updating
                        </Text>

                        <Text style={styles.savingSubtitle}>
                            Saving your latest profile changes...
                        </Text>

                        <View style={styles.progressTrack}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: savingProgress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ["0%", "100%"],
                                        }),
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <BlogsPaywallModal
                visible={paywallVisible}
                onClose={() => setPaywallVisible(false)}
                onSubscribe={handleSubscribePress}
                loading={loadingSubscription}
                localizedPrice={subscriptionProduct?.localizedPrice ?? null}
                billingPeriodLabel="every 6 months"
                buttonLabel="Unlock Subscriber Access"
                themeMode={themeMode}
            />

            {showConfetti && (
                <ConfettiCannon
                    count={140}
                    origin={{ x: -10, y: 0 }}
                    fadeOut
                    explosionSpeed={350}
                    fallSpeed={2600}
                    onAnimationEnd={() => setShowConfetti(false)}
                />
            )}
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof getAccountSettingsTheme>) =>
    StyleSheet.create({
        initialLoadingContainer: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.bg,
            paddingHorizontal: 24,
        },

        initialLoadingText: {
            color: theme.subtext,
            fontSize: 15,
            fontWeight: "700",
            marginTop: 12,
        },

        safeArea: {
            flex: 1,
            backgroundColor: theme.bg,
        },

        keyboardView: {
            flex: 1,
        },

        screen: {
            flex: 1,
            backgroundColor: theme.bg,
        },

        scrollView: {
            flex: 1,
        },

        scrollContent: {
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: 130,
        },

        header: {
            marginBottom: 28,
        },

        title: {
            color: theme.text,
            fontSize: 31,
            lineHeight: 37,
            fontWeight: "900",
        },

        subtitle: {
            color: theme.subtext,
            fontSize: 15,
            lineHeight: 21,
            fontWeight: "600",
            marginTop: 6,
        },

        formSection: {
            marginBottom: 25,
        },

        label: {
            color: theme.text,
            fontSize: 16,
            fontWeight: "900",
            marginBottom: 11,
        },

        avatarGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 12,
        },

        avatarButton: {
            width: Platform.OS === "android" ? 64 : 72,
            height: Platform.OS === "android" ? 64 : 72,
            borderRadius: Platform.OS === "android" ? 32 : 36,
            borderWidth: 3,
            borderColor: theme.divider,
            backgroundColor: theme.surface,
            padding: 2,
            position: "relative",
        },

        avatarButtonSelected: {
            borderColor: theme.cyan,
        },

        avatarButtonLocked: {
            borderColor: theme.border,
        },

        avatarImage: {
            width: "100%",
            height: "100%",
            borderRadius: 34,
        },

        avatarImageLocked: {
            opacity: 0.7,
        },

        avatarLockBadge: {
            position: "absolute",
            top: 2,
            right: 2,
            bottom: 2,
            left: 2,
            borderRadius: 999,
            backgroundColor: "rgba(2,6,23,0.50)",
            alignItems: "center",
            justifyContent: "center",
        },

        avatarCheck: {
            position: "absolute",
            right: -3,
            bottom: -3,
            width: 23,
            height: 23,
            borderRadius: 12,
            backgroundColor: theme.yellow,
            borderWidth: 2,
            borderColor: theme.bg,
            alignItems: "center",
            justifyContent: "center",
        },

        avatarCheckText: {
            color: theme.darkText,
            fontSize: 12,
            fontWeight: "900",
        },

        usernameContainer: {
            minHeight: 55,
            borderRadius: 15,
            borderWidth: 1.5,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
        },

        usernameAt: {
            color: theme.text,
            fontSize: 16,
            fontWeight: "900",
            marginRight: 2,
        },

        usernameInput: {
            flex: 1,
            minHeight: 52,
            color: theme.text,
            fontSize: 16,
            fontWeight: "700",
            paddingVertical: 0,
        },

        inputErrorBorder: {
            borderColor: theme.error,
            backgroundColor: theme.errorBg,
        },

        helperText: {
            color: theme.muted,
            fontSize: 11,
            lineHeight: 16,
            fontWeight: "600",
            marginTop: 7,
        },

        errorText: {
            color: theme.error,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "700",
            marginTop: 7,
        },

        optionRow: {
            flexDirection: "row",
            gap: 11,
        },

        classificationGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 10,
        },

        classificationButton: {
            width: "48.5%",
            minHeight: 52,
            borderRadius: 15,
            borderWidth: 1.5,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 10,
        },

        optionButton: {
            flex: 1,
            minHeight: 69,
            borderRadius: 15,
            borderWidth: 1.5,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 12,
        },

        optionButtonSelected: {
            backgroundColor: theme.selected,
            borderColor: theme.cyan,
        },

        optionEmoji: {
            fontSize: 21,
            marginRight: 8,
        },

        optionText: {
            color: theme.subtext,
            fontSize: 14,
            fontWeight: "800",
        },

        optionTextSelected: {
            color: theme.text,
            fontWeight: "900",
        },

        socialOptionalText: {
            color: theme.muted,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "600",
            marginTop: -4,
            marginBottom: 12,
        },

        socialPlatformGrid: {
            flexDirection: "row",
            width: "100%",
            gap: 6,
        },

        socialPlatformButton: {
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            minWidth: 0,
            height: 34,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
        },

        socialPlatformButtonSelected: {
            borderColor: theme.cyan,
            borderWidth: 2,
            shadowColor: theme.cyan,
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4,
        },

        socialSelectedCheck: {
            position: "absolute",
            top: 2,
            right: 3,
            width: 11,
            height: 11,
            borderRadius: 6,
            backgroundColor: theme.cyan,
            borderWidth: 1.5,
            borderColor: theme.bg,
            alignItems: "center",
            justifyContent: "center",
        },

        socialSelectedCheckText: {
            color: theme.white,
            fontSize: 6,
            fontWeight: "900",
        },

        socialLinkSection: {
            marginTop: 14,
        },

        socialLinkLabel: {
            color: theme.text,
            fontSize: 13,
            fontWeight: "900",
            marginBottom: 8,
        },

        socialLinkInput: {
            minHeight: 55,
            borderRadius: 15,
            borderWidth: 1.5,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
            fontSize: 14,
            fontWeight: "700",
            paddingHorizontal: 15,
        },

        dropdownButton: {
            minHeight: 55,
            borderRadius: 15,
            borderWidth: 1.5,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
        },

        dropdownText: {
            flex: 1,
            color: theme.text,
            fontSize: 15,
            fontWeight: "700",
            marginRight: 10,
        },

        dropdownPlaceholder: {
            color: theme.placeholder,
            fontWeight: "600",
        },

        dropdownArrow: {
            color: theme.text,
            fontSize: 27,
            lineHeight: 27,
            fontWeight: "500",
        },

        footerText: {
            color: theme.muted,
            fontSize: 11,
            lineHeight: 16,
            textAlign: "center",
            fontWeight: "600",
            paddingHorizontal: 18,
            marginTop: 2,
        },

        bottomContainer: {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.bg,
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 22 : 16,
            borderTopWidth: 1,
            borderTopColor: theme.divider,
        },

        continueButton: {
            width: "100%",
            height: 57,
            borderRadius: 17,
            backgroundColor: theme.yellow,
            alignItems: "center",
            justifyContent: "center",
        },

        continueButtonDisabled: {
            opacity: 0.42,
        },

        continueButtonText: {
            color: theme.darkText,
            fontSize: 17,
            fontWeight: "900",
        },

        savingOverlay: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                theme.mode === "night"
                    ? "rgba(0,0,0,0.86)"
                    : "rgba(2,6,23,0.66)",
            paddingHorizontal: 24,
        },

        savingCard: {
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
            backgroundColor: theme.bg,
            borderRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 26,
            borderWidth: 1,
            borderColor: theme.border,
        },

        savingAvatarWrap: {
            width: 78,
            height: 78,
            borderRadius: 39,
            borderWidth: 3,
            borderColor: theme.cyan,
            padding: 3,
            backgroundColor: theme.surface,
            marginBottom: 18,
        },

        savingAvatar: {
            width: "100%",
            height: "100%",
            borderRadius: 35,
        },

        savingTitle: {
            color: theme.text,
            fontSize: 20,
            lineHeight: 25,
            fontWeight: "900",
            textAlign: "center",
        },

        savingSubtitle: {
            color: theme.subtext,
            fontSize: 13,
            lineHeight: 18,
            fontWeight: "600",
            textAlign: "center",
            marginTop: 7,
        },

        progressTrack: {
            width: "100%",
            height: 9,
            borderRadius: 5,
            overflow: "hidden",
            backgroundColor: theme.surfaceSoft,
            marginTop: 22,
        },

        progressFill: {
            height: "100%",
            borderRadius: 5,
            backgroundColor: theme.cyan,
        },

        modalSafeArea: {
            flex: 1,
            backgroundColor: theme.bg,
        },

        modalHeader: {
            height: 58,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.divider,
        },

        modalCancel: {
            color: theme.cyanDark,
            fontSize: 15,
            fontWeight: "800",
        },

        modalTitle: {
            color: theme.text,
            fontSize: 17,
            fontWeight: "900",
        },

        modalHeaderSpacer: {
            width: 52,
        },

        modalSearchContainer: {
            paddingHorizontal: 18,
            paddingTop: 15,
            paddingBottom: 10,
        },

        modalSearchInput: {
            height: 51,
            borderRadius: 15,
            backgroundColor: theme.surfaceSoft,
            color: theme.text,
            fontSize: 15,
            fontWeight: "700",
            paddingHorizontal: 15,
        },

        modalListContent: {
            paddingHorizontal: 18,
            paddingBottom: 30,
        },

        modalListItem: {
            minHeight: 55,
            borderBottomWidth: 1,
            borderBottomColor: theme.divider,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 3,
        },

        modalListText: {
            flex: 1,
            color: theme.text,
            fontSize: 15,
            fontWeight: "700",
            paddingRight: 12,
        },

        modalCheck: {
            color: theme.cyan,
            fontSize: 18,
            fontWeight: "900",
        },

        emptyContainer: {
            alignItems: "center",
            paddingTop: 45,
            paddingHorizontal: 25,
        },

        emptyTitle: {
            color: theme.text,
            fontSize: 17,
            fontWeight: "900",
        },

        emptyText: {
            color: theme.muted,
            fontSize: 13,
            lineHeight: 19,
            textAlign: "center",
            marginTop: 6,
        },
        collegeListDivider: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: 5,
            marginBottom: 7,
        },

        collegeDividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: theme.border,
        },

        collegeDividerText: {
            color: theme.muted,
            fontSize: 11,
            fontWeight: "900",
            letterSpacing: 1.1,
            marginHorizontal: 12,
        },
        backButton: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            marginBottom: 18,
        },

        backIcon: {
            color: theme.cyan,
            fontSize: 34,
            lineHeight: 34,
            fontWeight: "700",
            marginRight: 2,
        },

        backText: {
            color: theme.cyan,
            fontSize: 16,
            fontWeight: "800",
        },
    });
