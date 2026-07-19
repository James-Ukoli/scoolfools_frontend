import React, { useEffect, useMemo, useState } from "react";
import {
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
    Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
        : process.env.EXPO_PUBLIC_API_BASE_URL;

type SchoolLevel = "college" | "highSchool";
type AthleteChoice = boolean | null;

type AvatarOption = {
    id: string;
    source: any;
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
    },
    {
        id: "basicPurple",
        source: require("../../assets/images/profileimages/basicPurple.png"),
    },
    {
        id: "diamondBoy",
        source: require("../../assets/images/profileimages/diamondBoy.png"),
    },

    // Bottom row
    {
        id: "basicOrange",
        source: require("../../assets/images/profileimages/basicOrange.png"),
    },
    {
        id: "basicPink",
        source: require("../../assets/images/profileimages/basicPink.png"),
    },
    {
        id: "basicYellow",
        source: require("../../assets/images/profileimages/basicYellow.png"),
    },
    {
        id: "diamondGirl",
        source: require("../../assets/images/profileimages/diamondGirl.png"),
    },
];

const COLLEGES = [
    "Other College",
    "Not Listed",
    "Alabama",
    "American",
    "Appalachian State",
    "Arizona",
    "Arizona State",
    "Arkansas",
    "Arkansas State",
    "Auburn",
    "Ball State",
    "Baylor",
    "Belmont",
    "Boise State",
    "Boston College",
    "Boston University",
    "Bowling Green",
    "Brown",
    "Bucknell",
    "BYU",
    "Cal Poly",
    "Cal Poly Pomona",
    "Cal State Bakersfield",
    "Cal State Channel Islands",
    "Cal State Chico",
    "Cal State Dominguez Hills",
    "Cal State East Bay",
    "Cal State Fullerton",
    "Cal State Long Beach",
    "Cal State Los Angeles",
    "Cal State Monterey Bay",
    "Cal State Northridge",
    "Cal State Sacramento",
    "Cal State San Bernardino",
    "Cal State San Marcos",
    "Cal State Stanislaus",
    "Caltech",
    "Carnegie Mellon",
    "Case Western Reserve",
    "Chapman",
    "Charleston",
    "Clemson",
    "Coastal Carolina",
    "Colorado",
    "Colorado School of Mines",
    "Colorado State",
    "Columbia",
    "Cornell",
    "Creighton",
    "Dartmouth",
    "Davidson",
    "DePaul",
    "Drexel",
    "Duke",
    "East Carolina",
    "East Tennessee State",
    "Elon",
    "Emory",
    "Fairfield",
    "FAU",
    "FGCU",
    "FIU",
    "Florida",
    "Florida State",
    "Fordham",
    "Furman",
    "George Mason",
    "George Washington",
    "Georgetown",
    "Georgia",
    "Georgia Southern",
    "Georgia State",
    "Georgia Tech",
    "Gonzaga",
    "Grand Canyon",
    "Hampton",
    "Harvard",
    "High Point",
    "Hofstra",
    "Howard",
    "Illinois",
    "Illinois State",
    "Indiana",
    "Iowa",
    "Iowa State",
    "Jackson State",
    "James Madison",
    "Johns Hopkins",
    "Kansas",
    "Kansas State",
    "Kent State",
    "Kentucky",
    "Liberty",
    "Longwood",
    "Louisville",
    "LSU",
    "Loyola Chicago",
    "Loyola Marymount",
    "Marquette",
    "Marshall",
    "Maryland",
    "Mercer",
    "Miami",
    "Miami (OH)",
    "Michigan",
    "Michigan State",
    "Middle Tennessee",
    "Minnesota",
    "Mississippi State",
    "Missouri",
    "Montana",
    "Montana State",
    "Morgan State",
    "NC A&T",
    "NC Central",
    "NC State",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Mexico",
    "New Mexico State",
    "New Jersey Institute of Technology",
    "North Texas",
    "Northern Arizona",
    "Northern Illinois",
    "Northwestern",
    "Notre Dame",
    "Nova Southeastern",
    "NYU",
    "Ohio",
    "Ohio State",
    "Oklahoma",
    "Oklahoma State",
    "Old Dominion",
    "Ole Miss",
    "Oregon",
    "Oregon State",
    "Penn",
    "Penn State",
    "Pepperdine",
    "Pitt",
    "Princeton",
    "Providence",
    "Purdue",
    "Quinnipiac",
    "Rice",
    "RIT",
    "Rutgers",
    "Saint Louis",
    "Saint Mary's",
    "Sam Houston State",
    "San Diego State",
    "San Francisco State",
    "San Jose State",
    "Santa Clara",
    "Seattle",
    "Seton Hall",
    "SMU",
    "South Alabama",
    "South Carolina",
    "South Dakota State",
    "South Florida",
    "Southeastern Louisiana",
    "Southern",
    "Southern Illinois",
    "Stanford",
    "Stephen F. Austin State",
    "Stony Brook",
    "Syracuse",
    "Tarleton State",
    "TCU",
    "Temple",
    "Tennessee",
    "Texas A&M",
    "Texas State",
    "Texas Tech",
    "Towson",
    "Troy",
    "Tulane",
    "Tulsa",
    "UAB",
    "UC Berkeley",
    "UC Davis",
    "UC Irvine",
    "UC Merced",
    "UC Riverside",
    "UC San Diego",
    "UC Santa Barbara",
    "UC Santa Cruz",
    "UCF",
    "UCLA",
    "UConn",
    "UIC",
    "UMass Amherst",
    "UMass Lowell",
    "UMBC",
    "UMKC",
    "UNC Asheville",
    "UNC Charlotte",
    "UNC Chapel Hill",
    "UNC Greensboro",
    "UNC Wilmington",
    "UNLV",
    "USC",
    "UT Arlington",
    "UT Austin",
    "UT Dallas",
    "UT El Paso",
    "UT Rio Grande Valley",
    "UT San Antonio",
    "UT Tyler",
    "Utah",
    "Utah State",
    "UTEP",
    "UTRGV",
    "UTSA",
    "Valparaiso",
    "Vanderbilt",
    "VCU",
    "Villanova",
    "Virginia",
    "Virginia State",
    "Virginia Tech",
    "Wake Forest",
    "Washington",
    "Washington State",
    "Weber State",
    "West Chester",
    "West Florida",
    "West Virginia",
    "Western Carolina",
    "Western Illinois",
    "Western Kentucky",
    "Western Michigan",
    "Wichita State",
    "William & Mary",
    "Winthrop",
    "Wisconsin",
    "Wofford",
    "Wright State",
    "Xavier",
    "Yale",
    "Youngstown State",
    "Adelphi",
    "Albany",
    "Alcorn State",
    "Alfred",
    "Assumption",
    "Augusta",
    "Austin Peay",
    "Bellarmine",
    "Bentley",
    "Binghamton",
    "Bridgewater State",
    "Bryant",
    "Buffalo",
    "Butler",
    "Canisius",
    "Central Arkansas",
    "Central Connecticut State",
    "Central Michigan",
    "Chicago State",
    "Christopher Newport",
    "Citadel",
    "Clark Atlanta",
    "Cleveland State",
    "College of New Jersey",
    "Concordia Irvine",
    "Connecticut College",
    "Coppin State",
    "Delaware",
    "Delaware State",
    "Delta State",
    "Denver",
    "Drake",
    "Duquesne",
    "Eastern Illinois",
    "Eastern Kentucky",
    "Eastern Michigan",
    "Eastern Washington",
    "Evansville",
    "Fayetteville State",
    "Fisk",
    "Francis Marion",
    "Fresno State",
    "Gardner-Webb",
    "Grambling State",
    "Hawaii",
    "Holy Cross",
    "Houston Christian",
    "Idaho",
    "Idaho State",
    "Incarnate Word",
    "Jacksonville",
    "Jacksonville State",
    "Kennesaw State",
    "Lehigh",
    "Lincoln",
    "Long Beach State",
    "Long Island University",
    "Louisiana Tech",
    "Maine",
    "Manhattan",
    "McNeese State",
    "Merrimack",
    "Minnesota Duluth",
    "Missouri State",
    "Morehead State",
    "Community College",
    "Abilene Christian",
    "Alaska Anchorage",
    "Alaska Fairbanks",
    "Alcorn State",
    "Alabama A&M",
    "Alabama State",
    "Albany State",
    "Arkansas Tech",
    "Armstrong State",
    "Ashland",
    "Augusta University",
    "Austin College",
    "Austin Peay",
    "Bellarmine",
    "Benedict College",
    "Bethune-Cookman",
    "Black Hills State",
    "Bloomsburg",
    "Bluefield State",
    "Bridgewater College",
    "California Baptist",
    "Campbell",
    "Capital University",
    "Catawba",
    "Central Missouri",
    "Central Oklahoma",
    "Charleston Southern",
    "Claflin",
    "Clark University",
    "Colby",
    "Colorado Mesa",
    "Columbus State",
    "Concord",
    "Converse",
    "Cornell College",
    "Dakota State",
    "Dakota Wesleyan",
    "Delaware Valley",
    "East Stroudsburg",
    "Eastern New Mexico",
    "Embry-Riddle",
    "Ferris State",
    "Flagler",
    "Florida Memorial",
    "Fort Hays State",
    "Franciscan University",
    "Friends University",
    "Gannon",
    "Georgia College",
    "Glenville State",
    "Harding",
    "Henderson State",
    "Hillsdale",
    "Humboldt",
    "Kean",
    "La Salle",
    "Lenoir-Rhyne",
    "Lincoln Memorial",
    "Livingstone",
    "Lock Haven",
    "Mansfield",
    "Mary Hardin-Baylor",
    "Marymount",
    "Millsaps",
    "Minot State",
    "Missouri Western",
    "Mount St. Mary's",
    "Murray State",
    "Nebraska Omaha",
    "Nebraska Kearney",
    "Nicholls State",
    "Norfolk State",
    "North Alabama",
    "North Dakota",
    "North Dakota State",
    "Northeastern",
    "Northern Colorado",
    "Northwestern State",
    "Ouachita Baptist",
    "Pacific",
    "Palm Beach Atlantic",
    "Presbyterian College",
    "Radford",
    "Regis",
    "Rhode Island",
    "Sacred Heart",
    "Saginaw Valley State",
    "Salem State",
    "Shaw University",
    "Shepherd",
    "Shippensburg",
    "South Dakota",
    "Southeastern Oklahoma State",
    "Southern Arkansas",
    "Southern Connecticut State",
    "Southern Miss",
    "Texas A&M Commerce",
    "Texas A&M Corpus Christi",
    "Texas A&M Kingsville",
    "Texas Woman's",
    "Tuskegee",
    "Valdosta State",
    "Washburn",
    "Wayne State",
    "Western Oregon",
    "Western Washington",
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

const normalizeUsername = (value: string) => {
    return value
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/[^a-z0-9._]/g, "");
};

export default function AccountSettingsScreen({ navigation }: any) {
    const [selectedAvatar, setSelectedAvatar] = useState("");
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");

    const [schoolLevel, setSchoolLevel] =
        useState<SchoolLevel | null>(null);

    const [collegeName, setCollegeName] = useState("");
    const [collegeSearch, setCollegeSearch] = useState("");
    const [collegeModalVisible, setCollegeModalVisible] =
        useState(false);

    const [isStudentAthlete, setIsStudentAthlete] =
        useState<AthleteChoice>(null);

    const [selectedSport, setSelectedSport] = useState("");
    const [sportModalVisible, setSportModalVisible] =
        useState(false);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            try {
                setInitialLoading(true);

                const storedUserRaw = await AsyncStorage.getItem("user");

                if (!storedUserRaw) {
                    throw new Error(
                        "Your saved profile could not be found. Please sign in again."
                    );
                }

                let profile: any = {};

                try {
                    profile = JSON.parse(storedUserRaw);
                } catch {
                    throw new Error(
                        "Your saved profile information could not be read."
                    );
                }

                if (!isMounted) {
                    return;
                }

                const avatarValue =
                    profile?.selectedAvatar ||
                    profile?.avatar ||
                    "";

                const level =
                    profile?.schoolLevel === "college" ||
                        profile?.schoolLevel === "highSchool"
                        ? profile.schoolLevel
                        : null;

                const savedCollege =
                    level === "college"
                        ? profile?.collegeName || ""
                        : "";

                const athleteValue =
                    typeof profile?.isStudentAthlete === "boolean"
                        ? profile.isStudentAthlete
                        : false;

                setSelectedAvatar(avatarValue);
                setUsername(profile?.username || "");
                setSchoolLevel(level);
                setCollegeName(savedCollege);
                setCollegeSearch(savedCollege);
                setIsStudentAthlete(athleteValue);
                setSelectedSport(
                    athleteValue
                        ? profile?.sport || ""
                        : ""
                );
            } catch (error: any) {
                console.log(
                    "Account settings load error:",
                    error
                );

                Alert.alert(
                    "Unable to Load Profile",
                    error?.message ||
                    "Something went wrong while loading your profile.",
                    [
                        {
                            text: "Go Back",
                            onPress: () => navigation.goBack(),
                        },
                    ]
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
    const filteredColleges = useMemo(() => {
        const search = collegeSearch.trim().toLowerCase();

        if (!search) {
            return COLLEGES;
        }

        return COLLEGES.filter((college) =>
            college.toLowerCase().includes(search)
        );
    }, [collegeSearch]);

    const filteredSports = useMemo(() => {
        return SPORTS;
    }, []);

    const isUsernameValid = useMemo(() => {
        return (
            username.length >= 6 &&
            username.length <= 20 &&
            /^[a-z0-9._]+$/.test(username)
        );
    }, [username]);

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

        if (
            schoolLevel === "college" &&
            !COLLEGES.includes(collegeName)
        ) {
            return false;
        }

        if (isStudentAthlete === null) {
            return false;
        }

        if (isStudentAthlete && !selectedSport) {
            return false;
        }

        return true;
    }, [
        selectedAvatar,
        isUsernameValid,
        schoolLevel,
        collegeName,
        isStudentAthlete,
        selectedSport,
    ]);

    const handleUsernameChange = (value: string) => {
        const cleaned = normalizeUsername(value);

        setUsername(cleaned);
        setUsernameError("");
    };

    const handleSchoolLevelChange = (
        level: SchoolLevel
    ) => {
        setSchoolLevel(level);

        if (level === "highSchool") {
            setCollegeName("");
            setCollegeSearch("");
        }
    };

    const handleAthleteChoice = (choice: boolean) => {
        setIsStudentAthlete(choice);

        if (!choice) {
            setSelectedSport("");
        }
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
                "Select a ScoolFools avatar to continue."
            );
            return false;
        }

        if (!username.trim()) {
            setUsernameError("Create a username to continue.");
            return false;
        }

        if (username.length < 6) {
            setUsernameError(
                "Your username must contain at least 3 characters."
            );
            return false;
        }

        if (username.length > 20) {
            setUsernameError(
                "Your username cannot exceed 20 characters."
            );
            return false;
        }

        if (!/^[a-z0-9._]+$/.test(username)) {
            setUsernameError(
                "Use only letters, numbers, periods, and underscores."
            );
            return false;
        }

        if (!schoolLevel) {
            Alert.alert(
                "Choose your school level",
                "Select College or High School."
            );
            return false;
        }

        if (
            schoolLevel === "college" &&
            !COLLEGES.includes(collegeName)
        ) {
            Alert.alert(
                "Choose your college",
                "Please select an option from the college list."
            );
            return false;
        }

        if (isStudentAthlete === null) {
            Alert.alert(
                "Student athlete",
                "Choose Yes or No to continue."
            );
            return false;
        }

        if (isStudentAthlete && !selectedSport) {
            Alert.alert(
                "Choose your sport",
                "Select the sport you play."
            );
            return false;
        }

        return true;
    };

    const handleSaveChanges = async () => {
        setUsernameError("");

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            if (!API_BASE_URL) {
                throw new Error(
                    "EXPO_PUBLIC_API_BASE_URL is missing."
                );
            }

            const token = await AsyncStorage.getItem("token");

            if (!token) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            const payload = {
                username: username.trim(),
                avatar: selectedAvatar,
                selectedAvatar,
                schoolLevel,
                collegeName:
                    schoolLevel === "college"
                        ? collegeName.trim()
                        : "",
                isStudentAthlete,
                sport: isStudentAthlete
                    ? selectedSport
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
                }
            );

            let data: any = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                const backendMessage =
                    data?.message ||
                    data?.error ||
                    "Unable to save your profile.";

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
                    setUsernameError(
                        backendMessage ||
                        "Please choose another username."
                    );

                    throw new Error("USERNAME_ERROR");
                }

                throw new Error(backendMessage);
            }

            const returnedUser =
                data?.user ||
                data?.updatedUser ||
                data;

            const currentStoredUser =
                await AsyncStorage.getItem("user");

            let existingUser = {};

            if (currentStoredUser) {
                try {
                    existingUser =
                        JSON.parse(currentStoredUser);
                } catch {
                    existingUser = {};
                }
            }

            const userToStore = {
                ...existingUser,
                ...returnedUser,
                username: returnedUser?.username || username,
                avatar:
                    returnedUser?.avatar ||
                    selectedAvatar,
                selectedAvatar:
                    returnedUser?.selectedAvatar ||
                    selectedAvatar,
                schoolLevel:
                    returnedUser?.schoolLevel ||
                    schoolLevel,
                collegeName:
                    returnedUser?.collegeName ??
                    payload.collegeName,
                isStudentAthlete:
                    returnedUser?.isStudentAthlete ??
                    isStudentAthlete,
                sport:
                    returnedUser?.sport ??
                    payload.sport,
                onboardingStage:
                    returnedUser?.onboardingStage ||
                    (existingUser as any)?.onboardingStage ||
                    "complete",
            };

            await AsyncStorage.setItem(
                "user",
                JSON.stringify(userToStore)
            );

            Alert.alert(
                "Profile Updated",
                "Your account settings have been saved.",
                [
                    {
                        text: "Done",
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error: any) {
            if (error?.message === "USERNAME_ERROR") {
                return;
            }

            console.log(
                "Account settings update error:",
                error
            );

            Alert.alert(
                "Update Failed",
                error?.message ||
                "Something went wrong while updating your profile."
            );
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <SafeAreaView
                style={styles.safeArea}
                edges={["left", "right"]}
            >
                <View style={styles.initialLoadingContainer}>
                    <ActivityIndicator
                        size="large"
                        color="#06B6D4"
                    />
                    <Text style={styles.initialLoadingText}>
                        Loading your profile...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["left", "right"]}
        >
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
                keyboardVerticalOffset={0}
            >
                <View style={styles.screen}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={
                            styles.scrollContent
                        }
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

                            <Text style={styles.title}>
                                Account Settings
                            </Text>

                            <Text style={styles.subtitle}>
                                Update how you appear on ScoolFools.
                            </Text>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.label}>
                                Choose an avatar
                            </Text>

                            <View style={styles.avatarGrid}>
                                {AVATARS.map((avatar) => {
                                    const isSelected =
                                        selectedAvatar ===
                                        avatar.id;

                                    return (
                                        <TouchableOpacity
                                            key={avatar.id}
                                            style={[
                                                styles.avatarButton,
                                                isSelected &&
                                                styles.avatarButtonSelected,
                                            ]}
                                            onPress={() =>
                                                setSelectedAvatar(
                                                    avatar.id
                                                )
                                            }
                                            activeOpacity={0.85}
                                        >
                                            <Image
                                                source={
                                                    avatar.source
                                                }
                                                style={
                                                    styles.avatarImage
                                                }
                                                resizeMode="cover"
                                            />

                                            {isSelected && (
                                                <View
                                                    style={
                                                        styles.avatarCheck
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.avatarCheckText
                                                        }
                                                    >
                                                        ✓
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.label}>
                                Username
                            </Text>

                            <View
                                style={[
                                    styles.usernameContainer,
                                    usernameError
                                        ? styles.inputErrorBorder
                                        : null,
                                ]}
                            >
                                <Text
                                    style={
                                        styles.usernameAt
                                    }
                                >
                                    @
                                </Text>

                                <TextInput
                                    style={
                                        styles.usernameInput
                                    }
                                    value={username}
                                    onChangeText={
                                        handleUsernameChange
                                    }
                                    placeholder="username"
                                    placeholderTextColor="#9AA4AE"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    maxLength={20}
                                    returnKeyType="done"
                                />
                            </View>

                            {usernameError ? (
                                <Text
                                    style={
                                        styles.errorText
                                    }
                                >
                                    {usernameError}
                                </Text>
                            ) : (
                                <Text
                                    style={
                                        styles.helperText
                                    }
                                >
                                    6 to 20 characters. Letters,
                                    numbers, periods, and
                                    underscores only.
                                </Text>
                            )}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.label}>
                                School level
                            </Text>

                            <View style={styles.optionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        schoolLevel ===
                                        "college" &&
                                        styles.optionButtonSelected,
                                    ]}
                                    onPress={() =>
                                        handleSchoolLevelChange(
                                            "college"
                                        )
                                    }
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={
                                            styles.optionEmoji
                                        }
                                    >
                                        🎓
                                    </Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            schoolLevel ===
                                            "college" &&
                                            styles.optionTextSelected,
                                        ]}
                                    >
                                        College
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        schoolLevel ===
                                        "highSchool" &&
                                        styles.optionButtonSelected,
                                    ]}
                                    onPress={() =>
                                        handleSchoolLevelChange(
                                            "highSchool"
                                        )
                                    }
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={
                                            styles.optionEmoji
                                        }
                                    >
                                        📚
                                    </Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            schoolLevel ===
                                            "highSchool" &&
                                            styles.optionTextSelected,
                                        ]}
                                    >
                                        High School
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {schoolLevel === "college" && (
                            <View
                                style={
                                    styles.formSection
                                }
                            >
                                <Text style={styles.label}>
                                    College
                                </Text>

                                <TouchableOpacity
                                    style={
                                        styles.dropdownButton
                                    }
                                    onPress={
                                        openCollegePicker
                                    }
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.dropdownText,
                                            !collegeName &&
                                            styles.dropdownPlaceholder,
                                        ]}
                                    >
                                        {collegeName ||
                                            "Search for your college"}
                                    </Text>

                                    <Text
                                        style={
                                            styles.dropdownArrow
                                        }
                                    >
                                        ›
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.formSection}>
                            <Text style={styles.label}>
                                Are you a student athlete?
                            </Text>

                            <View style={styles.optionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        isStudentAthlete ===
                                        true &&
                                        styles.optionButtonSelected,
                                    ]}
                                    onPress={() =>
                                        handleAthleteChoice(
                                            true
                                        )
                                    }
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={
                                            styles.optionEmoji
                                        }
                                    >
                                        🏆
                                    </Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            isStudentAthlete ===
                                            true &&
                                            styles.optionTextSelected,
                                        ]}
                                    >
                                        Yes
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        isStudentAthlete ===
                                        false &&
                                        styles.optionButtonSelected,
                                    ]}
                                    onPress={() =>
                                        handleAthleteChoice(
                                            false
                                        )
                                    }
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={
                                            styles.optionEmoji
                                        }
                                    >
                                        🙌
                                    </Text>

                                    <Text
                                        style={[
                                            styles.optionText,
                                            isStudentAthlete ===
                                            false &&
                                            styles.optionTextSelected,
                                        ]}
                                    >
                                        No
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {isStudentAthlete === true && (
                            <View
                                style={
                                    styles.formSection
                                }
                            >
                                <Text style={styles.label}>
                                    Sport
                                </Text>

                                <TouchableOpacity
                                    style={
                                        styles.dropdownButton
                                    }
                                    onPress={() =>
                                        setSportModalVisible(
                                            true
                                        )
                                    }
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.dropdownText,
                                            !selectedSport &&
                                            styles.dropdownPlaceholder,
                                        ]}
                                    >
                                        {selectedSport ||
                                            "Select your sport"}
                                    </Text>

                                    <Text
                                        style={
                                            styles.dropdownArrow
                                        }
                                    >
                                        ›
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.footerText}>
                            You can update these details later
                            in Account Settings.
                        </Text>
                    </ScrollView>

                    <View style={styles.bottomContainer}>
                        <TouchableOpacity
                            style={[
                                styles.continueButton,
                                (!canContinue ||
                                    loading) &&
                                styles.continueButtonDisabled,
                            ]}
                            onPress={handleSaveChanges}
                            disabled={
                                !canContinue || loading
                            }
                            activeOpacity={0.88}
                        >
                            {loading ? (
                                <ActivityIndicator
                                    color="#07111F"
                                />
                            ) : (
                                <Text
                                    style={
                                        styles.continueButtonText
                                    }
                                >
                                    Save Changes
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <Modal
                    visible={collegeModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() =>
                        setCollegeModalVisible(false)
                    }
                >
                    <SafeAreaView
                        style={styles.modalSafeArea}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() =>
                                    setCollegeModalVisible(
                                        false
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.modalCancel
                                    }
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <Text
                                style={styles.modalTitle}
                            >
                                Choose College
                            </Text>

                            <View
                                style={
                                    styles.modalHeaderSpacer
                                }
                            />
                        </View>

                        <View
                            style={
                                styles.modalSearchContainer
                            }
                        >
                            <TextInput
                                style={styles.modalSearchInput}
                                value={collegeSearch}
                                onChangeText={setCollegeSearch}
                                placeholder="Search colleges"
                                placeholderTextColor="#9AA4AE"
                                autoCapitalize="words"
                                autoCorrect={false}
                                autoFocus
                                returnKeyType="search"
                            />
                        </View>


                        <FlatList
                            data={filteredColleges}
                            keyExtractor={(item, index) =>
                                `${item}-${index}`
                            }
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={
                                styles.modalListContent
                            }
                            renderItem={({ item }) => {
                                const showMainListMarker =
                                    item === "Not Listed" &&
                                    !collegeSearch.trim();

                                return (
                                    <View>
                                        <TouchableOpacity
                                            style={styles.modalListItem}
                                            onPress={() =>
                                                selectCollege(item)
                                            }
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={
                                                    styles.modalListText
                                                }
                                            >
                                                {item}
                                            </Text>

                                            {collegeName === item && (
                                                <Text
                                                    style={
                                                        styles.modalCheck
                                                    }
                                                >
                                                    ✓
                                                </Text>
                                            )}
                                        </TouchableOpacity>

                                        {showMainListMarker && (
                                            <View
                                                style={
                                                    styles.collegeListDivider
                                                }
                                            >
                                                <View
                                                    style={
                                                        styles.collegeDividerLine
                                                    }
                                                />

                                                <Text
                                                    style={
                                                        styles.collegeDividerText
                                                    }
                                                >
                                                    COLLEGES
                                                </Text>

                                                <View
                                                    style={
                                                        styles.collegeDividerLine
                                                    }
                                                />
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <View
                                    style={
                                        styles.emptyContainer
                                    }
                                >
                                    <Text
                                        style={
                                            styles.emptyTitle
                                        }
                                    >
                                        No matching college
                                    </Text>

                                    <Text
                                        style={
                                            styles.emptyText
                                        }
                                    >
                                        Try another spelling, or select
                                        Other College or Not Listed.
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
                    onRequestClose={() =>
                        setSportModalVisible(false)
                    }
                >
                    <SafeAreaView
                        style={styles.modalSafeArea}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() =>
                                    setSportModalVisible(
                                        false
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.modalCancel
                                    }
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <Text
                                style={styles.modalTitle}
                            >
                                Choose Sport
                            </Text>

                            <View
                                style={
                                    styles.modalHeaderSpacer
                                }
                            />
                        </View>

                        <FlatList
                            data={filteredSports}
                            keyExtractor={(item, index) =>
                                `${item}-${index}`
                            }
                            contentContainerStyle={
                                styles.modalListContent
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={
                                        styles.modalListItem
                                    }
                                    onPress={() => {
                                        setSelectedSport(
                                            item
                                        );
                                        setSportModalVisible(
                                            false
                                        );
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={
                                            styles.modalListText
                                        }
                                    >
                                        {item}
                                    </Text>

                                    {selectedSport ===
                                        item && (
                                            <Text
                                                style={
                                                    styles.modalCheck
                                                }
                                            >
                                                ✓
                                            </Text>
                                        )}
                                </TouchableOpacity>
                            )}
                        />
                    </SafeAreaView>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    initialLoadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
    },

    initialLoadingText: {
        color: "#697580",
        fontSize: 15,
        fontWeight: "700",
        marginTop: 12,
    },

    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    keyboardView: {
        flex: 1,
    },

    screen: {
        flex: 1,
        backgroundColor: "#FFFFFF",
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
        color: "#07111F",
        fontSize: 31,
        lineHeight: 37,
        fontWeight: "900",
    },

    subtitle: {
        color: "#697580",
        fontSize: 15,
        lineHeight: 21,
        fontWeight: "600",
        marginTop: 6,
    },

    formSection: {
        marginBottom: 25,
    },

    label: {
        color: "#07111F",
        fontSize: 16,
        fontWeight: "900",
        marginBottom: 11,
    },

    avatarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },

    avatarButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: "#EEF1F3",
        backgroundColor: "#F5F7F8",
        padding: 2,
        position: "relative",
    },

    avatarButtonSelected: {
        borderColor: "#06B6D4",
    },

    avatarImage: {
        width: "100%",
        height: "100%",
        borderRadius: 34,
    },

    avatarCheck: {
        position: "absolute",
        right: -3,
        bottom: -3,
        width: 23,
        height: 23,
        borderRadius: 12,
        backgroundColor: "#FACC15",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },

    avatarCheckText: {
        color: "#07111F",
        fontSize: 12,
        fontWeight: "900",
    },

    usernameContainer: {
        minHeight: 55,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: "#DDE3E7",
        backgroundColor: "#F8F9FA",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
    },

    usernameAt: {
        color: "#07111F",
        fontSize: 16,
        fontWeight: "900",
        marginRight: 2,
    },

    usernameInput: {
        flex: 1,
        minHeight: 52,
        color: "#07111F",
        fontSize: 16,
        fontWeight: "700",
        paddingVertical: 0,
    },

    inputErrorBorder: {
        borderColor: "#E5484D",
        backgroundColor: "#FFF8F8",
    },

    helperText: {
        color: "#89939D",
        fontSize: 11,
        lineHeight: 16,
        fontWeight: "600",
        marginTop: 7,
    },

    errorText: {
        color: "#D92D20",
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
        marginTop: 7,
    },

    optionRow: {
        flexDirection: "row",
        gap: 11,
    },

    optionButton: {
        flex: 1,
        minHeight: 69,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: "#DDE3E7",
        backgroundColor: "#F8F9FA",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },

    optionButtonSelected: {
        backgroundColor: "#E6FAFC",
        borderColor: "#06B6D4",
    },

    optionEmoji: {
        fontSize: 21,
        marginRight: 8,
    },

    optionText: {
        color: "#606C76",
        fontSize: 14,
        fontWeight: "800",
    },

    optionTextSelected: {
        color: "#07111F",
        fontWeight: "900",
    },

    dropdownButton: {
        minHeight: 55,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: "#DDE3E7",
        backgroundColor: "#F8F9FA",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
    },

    dropdownText: {
        flex: 1,
        color: "#07111F",
        fontSize: 15,
        fontWeight: "700",
        marginRight: 10,
    },

    dropdownPlaceholder: {
        color: "#9AA4AE",
        fontWeight: "600",
    },

    dropdownArrow: {
        color: "#07111F",
        fontSize: 27,
        lineHeight: 27,
        fontWeight: "500",
    },

    footerText: {
        color: "#929BA4",
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
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom:
            Platform.OS === "ios" ? 22 : 16,
        borderTopWidth: 1,
        borderTopColor: "#EEF1F3",
    },

    continueButton: {
        width: "100%",
        height: 57,
        borderRadius: 17,
        backgroundColor: "#FACC15",
        alignItems: "center",
        justifyContent: "center",
    },

    continueButtonDisabled: {
        opacity: 0.42,
    },

    continueButtonText: {
        color: "#07111F",
        fontSize: 17,
        fontWeight: "900",
    },

    modalSafeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    modalHeader: {
        height: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F3",
    },

    modalCancel: {
        color: "#06A8C0",
        fontSize: 15,
        fontWeight: "800",
    },

    modalTitle: {
        color: "#07111F",
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
        backgroundColor: "#F1F3F5",
        color: "#07111F",
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
        borderBottomColor: "#EEF1F3",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 3,
    },

    modalListText: {
        flex: 1,
        color: "#07111F",
        fontSize: 15,
        fontWeight: "700",
        paddingRight: 12,
    },

    modalCheck: {
        color: "#06B6D4",
        fontSize: 18,
        fontWeight: "900",
    },

    emptyContainer: {
        alignItems: "center",
        paddingTop: 45,
        paddingHorizontal: 25,
    },

    emptyTitle: {
        color: "#07111F",
        fontSize: 17,
        fontWeight: "900",
    },

    emptyText: {
        color: "#7D8892",
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
        backgroundColor: "#DDE3E7",
    },

    collegeDividerText: {
        color: "#8A949E",
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
        color: "#06B6D4",
        fontSize: 34,
        lineHeight: 34,
        fontWeight: "700",
        marginRight: 2,
    },

    backText: {
        color: "#06B6D4",
        fontSize: 16,
        fontWeight: "800",
    },
});
