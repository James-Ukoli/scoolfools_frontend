import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

import {
    Ionicons,
} from "@expo/vector-icons";

import MaterialCommunityIcons from
    "@expo/vector-icons/MaterialCommunityIcons";

import {
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    useTimeTheme,
    type TimeTheme,
} from "../context/TimeThemeContext";

import HomeScreen from "../screens/HomeScreen";
import TrendingScreen from "../screens/TrendingScreen";
import TVScreen from "../screens/TVScreen";
import RankingsScreen from "../screens/RankingsScreen";
import DumpScreen from "../screens/DumpScreen";

const Tab =
    createBottomTabNavigator();

const {
    width: SCREEN_WIDTH,
} = Dimensions.get("window");

const ACTIVE_INDICATOR_WIDTH = 30;
const ACTIVE_ICON_SCALE = 1.12;
const TV_REVIEW_REQUESTED_KEY = "scoolfools_tv_review_requested";

/*
|--------------------------------------------------------------------------
| Student Dump Release Date
|--------------------------------------------------------------------------
|
| JavaScript months begin at zero:
| 7 = August
|
| The Student Dump will unlock at midnight on August 24, 2026,
| based on the user's local device time.
|
*/

const STUDENT_DUMP_RELEASE_DATE =
    new Date(
        2026,
        7,
        24,
        0,
        0,
        0,
    );

/*
|--------------------------------------------------------------------------
| Professor Fools Image
|--------------------------------------------------------------------------
|
| Update this require path only if your Professor Fools image is stored
| somewhere else in your project.
|
*/


/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
*/

const getTabTheme = (
    mode: TimeTheme
) => {
    if (mode === "day") {
        return {
            background:
                "#FFFFFF",

            border:
                "rgba(7,17,31,0.10)",

            active:
                "#06B6D4",

            inactive:
                "#64748B",

            label:
                "#07111F",

            activeSoft:
                "rgba(6,182,212,0.10)",

            dumpBackground:
                "rgba(6,182,212,0.09)",

            shadow:
                "rgba(15,23,42,0.16)",

            toastBackground:
                "rgba(7,17,31,0.97)",

            toastBorder:
                "rgba(6,182,212,0.65)",

            toastText:
                "#FFFFFF",

            toastMuted:
                "#CBD5E1",
        };
    }

    return {
        background:
            "#020617",

        border:
            "rgba(255,255,255,0.10)",

        active:
            "#22D3EE",

        inactive:
            "#94A3B8",

        label:
            "#FFFFFF",

        activeSoft:
            "rgba(34,211,238,0.11)",

        dumpBackground:
            "rgba(34,211,238,0.10)",

        shadow:
            "rgba(0,0,0,0.40)",

        toastBackground:
            "rgba(9,13,20,0.98)",

        toastBorder:
            "rgba(34,211,238,0.70)",

        toastText:
            "#FFFFFF",

        toastMuted:
            "#CBD5E1",
    };
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getLabel = (
    routeName: string
) => {
    if (
        routeName ===
        "SportsZone"
    ) {
        return "Sports";
    }

    return routeName;
};

const getIcon = (
    routeName: string,
    focused: boolean,
    color: string
) => {
    if (
        routeName ===
        "Home"
    ) {
        return (
            <Ionicons
                name={
                    focused
                        ? "home"
                        : "home-outline"
                }
                size={23}
                color={color}
            />
        );
    }

    if (
        routeName ===
        "Buzz"
    ) {
        return (
            <Ionicons
                name={
                    focused
                        ? "megaphone"
                        : "megaphone-outline"
                }
                size={23}
                color={color}
            />
        );
    }

    if (
        routeName ===
        "Dump"
    ) {
        return (
            <MaterialCommunityIcons
                name={
                    focused
                        ? "trash-can"
                        : "trash-can-outline"
                }
                size={24}
                color={color}
            />
        );
    }

    if (
        routeName ===
        "SportsZone"
    ) {
        return (
            <Ionicons
                name={
                    focused
                        ? "basketball"
                        : "basketball-outline"
                }
                size={24}
                color={color}
            />
        );
    }

    if (
        routeName ===
        "TV"
    ) {
        return (
            <MaterialCommunityIcons
                name="television-play"
                size={24}
                color={color}
            />
        );
    }

    return null;
};

/*
|--------------------------------------------------------------------------
| Animated Tab Item
|--------------------------------------------------------------------------
*/

function AnimatedTabItem({
    route,
    focused,
    navigation,
    theme,
    onLockedDumpPress,
    onTVPress,
}: {
    route: any;
    focused: boolean;
    navigation: any;

    theme:
    ReturnType<
        typeof getTabTheme
    >;

    onLockedDumpPress:
    () => void;

    onTVPress:
    () => void;
}) {
    const scale =
        useRef(
            new Animated.Value(
                focused
                    ? ACTIVE_ICON_SCALE
                    : 1
            )
        ).current;

    const opacity =
        useRef(
            new Animated.Value(
                focused
                    ? 1
                    : 0.82
            )
        ).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(
                scale,
                {
                    toValue:
                        focused
                            ? ACTIVE_ICON_SCALE
                            : 1,

                    useNativeDriver:
                        true,

                    tension:
                        115,

                    friction:
                        10,
                }
            ),

            Animated.timing(
                opacity,
                {
                    toValue:
                        focused
                            ? 1
                            : 0.82,

                    duration:
                        150,

                    useNativeDriver:
                        true,
                }
            ),
        ]).start();
    }, [
        focused,
        opacity,
        scale,
    ]);

    const color =
        focused
            ? theme.active
            : theme.inactive;

    const isDump =
        route.name ===
        "Dump";

    const onPress =
        () => {
            /*
            |--------------------------------------------------------------------------
            | Block Student Dump Before Release Date
            |--------------------------------------------------------------------------
            */

            const dumpIsLocked =
                isDump &&
                new Date() <
                STUDENT_DUMP_RELEASE_DATE;

            if (
                dumpIsLocked
            ) {
                onLockedDumpPress();

                return;
            }

            if (
                route.name === "TV"
            ) {
                if (!focused) {
                    navigation.navigate(
                        route.name
                    );
                }

                onTVPress();
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Normal Tab Navigation
            |--------------------------------------------------------------------------
            */

            const event =
                navigation.emit({
                    type:
                        "tabPress",

                    target:
                        route.key,

                    canPreventDefault:
                        true,
                });

            if (
                !focused &&
                !event.defaultPrevented
            ) {
                navigation.navigate(
                    route.name
                );
            }
        };

    const onLongPress =
        () => {
            navigation.emit({
                type:
                    "tabLongPress",

                target:
                    route.key,
            });
        };

    return (
        <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={
                focused
                    ? {
                        selected:
                            true,
                    }
                    : {}
            }
            accessibilityLabel={
                `${getLabel(
                    route.name
                )} tab`
            }
            onPress={onPress}
            onLongPress={
                onLongPress
            }
            style={
                styles.tabItem
            }
        >
            <Animated.View
                style={[
                    styles.iconOuterWrap,
                    {
                        opacity,

                        transform: [
                            {
                                scale,
                            },
                        ],
                    },
                ]}
            >
                <View
                    style={[
                        styles.iconInnerWrap,

                        isDump &&
                        styles.dumpIconWrap,

                        isDump && {
                            backgroundColor:
                                focused
                                    ? theme.activeSoft
                                    : theme.dumpBackground,

                            borderColor:
                                focused
                                    ? `${theme.active}66`
                                    : theme.border,
                        },
                    ]}
                >
                    {getIcon(
                        route.name,
                        focused,
                        color
                    )}
                </View>
            </Animated.View>

            <Text
                numberOfLines={1}
                style={[
                    styles.tabLabel,
                    {
                        color,

                        fontWeight:
                            focused
                                ? "900"
                                : "700",
                    },
                ]}
            >
                {getLabel(
                    route.name
                )}
            </Text>
        </TouchableOpacity>
    );
}

/*
|--------------------------------------------------------------------------
| Animated Tab Bar
|--------------------------------------------------------------------------
*/

function AnimatedTabBar({
    state,
    navigation,
    onLockedDumpPress,
    onTVPress,
}: any) {
    const insets =
        useSafeAreaInsets();

    const {
        mode,
    } = useTimeTheme();

    const theme =
        useMemo(
            () =>
                getTabTheme(
                    mode
                ),
            [
                mode,
            ]
        );

    const tabCount =
        state.routes.length;

    const tabWidth =
        SCREEN_WIDTH /
        tabCount;

    const indicatorTarget =
        state.index *
        tabWidth +
        tabWidth /
        2 -
        ACTIVE_INDICATOR_WIDTH /
        2;

    const indicatorTranslateX =
        useRef(
            new Animated.Value(
                indicatorTarget
            )
        ).current;

    useEffect(() => {
        Animated.spring(
            indicatorTranslateX,
            {
                toValue:
                    indicatorTarget,

                useNativeDriver:
                    true,

                tension:
                    105,

                friction:
                    13,
            }
        ).start();
    }, [
        indicatorTarget,
        indicatorTranslateX,
    ]);

    const tabBarHeight =
        Platform.OS ===
            "android"
            ? 72 +
            Math.max(
                insets.bottom,
                10
            )
            : 68 +
            Math.max(
                insets.bottom,
                8
            );

    return (
        <View
            style={[
                styles.tabBar,
                {
                    height:
                        tabBarHeight,

                    paddingBottom:
                        Platform.OS ===
                            "android"
                            ? Math.max(
                                insets.bottom,
                                10
                            )
                            : Math.max(
                                insets.bottom,
                                8
                            ),

                    backgroundColor:
                        theme.background,

                    borderTopColor:
                        theme.border,

                    shadowColor:
                        theme.shadow,
                },
            ]}
        >
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.activeIndicator,
                    {
                        width:
                            ACTIVE_INDICATOR_WIDTH,

                        backgroundColor:
                            theme.active,

                        shadowColor:
                            theme.active,

                        transform: [
                            {
                                translateX:
                                    indicatorTranslateX,
                            },
                        ],
                    },
                ]}
            />

            {state.routes.map(
                (
                    route: any,
                    index: number
                ) => {
                    const focused =
                        state.index ===
                        index;

                    return (
                        <AnimatedTabItem
                            key={
                                route.key
                            }
                            route={
                                route
                            }
                            focused={
                                focused
                            }
                            navigation={
                                navigation
                            }
                            theme={
                                theme
                            }
                            onLockedDumpPress={
                                onLockedDumpPress
                            }
                            onTVPress={
                                onTVPress
                            }
                        />
                    );
                }
            )}
        </View>
    );
}

/*
|--------------------------------------------------------------------------
| Bottom Tabs
|--------------------------------------------------------------------------
*/

export default function BottomTabs() {
    const insets =
        useSafeAreaInsets();

    const {
        isDark,
        mode,
    } = useTimeTheme();

    const theme =
        useMemo(
            () =>
                getTabTheme(
                    mode
                ),
            [
                mode,
            ]
        );

    const toastAnim =
        useRef(
            new Animated.Value(
                0
            )
        ).current;

    const toastTimeoutRef =
        useRef<
            ReturnType<
                typeof setTimeout
            > |
            null
        >(null);

    const [
        toastVisible,
        setToastVisible,
    ] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | Clean Up Toast Timer
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        return () => {
            if (
                toastTimeoutRef.current
            ) {
                clearTimeout(
                    toastTimeoutRef.current
                );
            }

            toastAnim.stopAnimation();
        };
    }, [
        toastAnim,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Show Student Dump Release Toast
    |--------------------------------------------------------------------------
    */

    const showDumpReleaseToast =
        () => {
            if (
                toastTimeoutRef.current
            ) {
                clearTimeout(
                    toastTimeoutRef.current
                );

                toastTimeoutRef.current =
                    null;
            }

            toastAnim.stopAnimation();

            toastAnim.setValue(
                0
            );

            setToastVisible(
                true
            );

            Animated.timing(
                toastAnim,
                {
                    toValue:
                        1,

                    duration:
                        260,

                    useNativeDriver:
                        true,
                }
            ).start();

            toastTimeoutRef.current =
                setTimeout(
                    () => {
                        Animated.timing(
                            toastAnim,
                            {
                                toValue:
                                    0,

                                duration:
                                    260,

                                useNativeDriver:
                                    true,
                            }
                        ).start(
                            ({
                                finished,
                            }) => {
                                if (
                                    finished
                                ) {
                                    setToastVisible(
                                        false
                                    );
                                }
                            }
                        );
                    },
                    2800
                );
        };

    const handleTVPress =
        async () => {
            try {
                const alreadyRequested =
                    await AsyncStorage.getItem(
                        TV_REVIEW_REQUESTED_KEY
                    );

                if (alreadyRequested === "true") {
                    return;
                }

                const reviewAvailable =
                    await StoreReview.isAvailableAsync();

                if (!reviewAvailable) {
                    return;
                }

                // Mark it before requesting so repeated TV taps do not spam the user.
                await AsyncStorage.setItem(
                    TV_REVIEW_REQUESTED_KEY,
                    "true"
                );

                // Give TV a moment to finish navigating before showing the native review card.
                setTimeout(() => {
                    StoreReview.requestReview().catch(
                        (error) => {
                            console.log(
                                "Store review request error:",
                                error
                            );
                        }
                    );
                }, 650);
            } catch (error) {
                console.log(
                    "TV review check error:",
                    error
                );
            }
        };

    return (
        <View
            style={
                styles.wrapper
            }
        >
            <Tab.Navigator
                initialRouteName="Home"
                detachInactiveScreens={
                    false
                }
                tabBar={(
                    props
                ) => (
                    <AnimatedTabBar
                        {...props}
                        onLockedDumpPress={
                            showDumpReleaseToast
                        }
                        onTVPress={
                            handleTVPress
                        }
                    />
                )}
                screenOptions={{
                    headerShown:
                        false,

                    lazy:
                        false,

                    animation:
                        "none",

                    sceneStyle: {
                        backgroundColor:
                            isDark
                                ? "#020617"
                                : "#FFFFFF",
                    },
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={
                        HomeScreen
                    }
                />

                <Tab.Screen
                    name="Buzz"
                    component={
                        TrendingScreen
                    }
                />

                <Tab.Screen
                    name="Dump"
                    component={
                        DumpScreen
                    }
                />

                <Tab.Screen
                    name="SportsZone"
                    component={
                        RankingsScreen
                    }
                />

                <Tab.Screen
                    name="TV"
                    component={
                        TVScreen
                    }
                />
            </Tab.Navigator>

            {toastVisible && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.releaseToast,
                        {
                            bottom:
                                Platform.OS ===
                                    "android"
                                    ? 92 +
                                    Math.max(
                                        insets.bottom,
                                        10
                                    )
                                    : 84 +
                                    Math.max(
                                        insets.bottom,
                                        8
                                    ),

                            opacity:
                                toastAnim,

                            backgroundColor:
                                theme.toastBackground,

                            borderColor:
                                theme.toastBorder,

                            transform: [
                                {
                                    translateY:
                                        toastAnim.interpolate({
                                            inputRange: [
                                                0,
                                                1,
                                            ],

                                            outputRange: [
                                                34,
                                                0,
                                            ],
                                        }),
                                },

                                {
                                    scale:
                                        toastAnim.interpolate({
                                            inputRange: [
                                                0,
                                                1,
                                            ],

                                            outputRange: [
                                                0.97,
                                                1,
                                            ],
                                        }),
                                },
                            ],
                        },
                    ]}
                >
                    <View
                        style={
                            styles.toastTextContainer
                        }
                    >
                        <Text
                            style={[
                                styles.toastTitle,
                                {
                                    color:
                                        theme.toastText,
                                },
                            ]}
                        >
                            It's almost here!
                        </Text>

                        <Text
                            style={[
                                styles.toastMessage,
                                {
                                    color:
                                        theme.toastMuted,
                                },
                            ]}
                        >
                            The Student Dump opens on August 24th.
                        </Text>
                    </View>

                    <Text
                        style={styles.toastEmoji}
                    >
                        🗑️
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles =
    StyleSheet.create({
        wrapper: {
            flex:
                1,
        },

        tabBar: {
            position:
                "absolute",

            left:
                0,

            right:
                0,

            bottom:
                0,

            flexDirection:
                "row",

            borderTopWidth:
                1,

            paddingTop:
                10,

            shadowOpacity:
                0.12,

            shadowRadius:
                16,

            shadowOffset: {
                width:
                    0,

                height:
                    -5,
            },

            elevation:
                16,
        },

        activeIndicator: {
            position:
                "absolute",

            top:
                0,

            height:
                3,

            borderRadius:
                999,

            shadowOpacity:
                0.38,

            shadowRadius:
                8,

            shadowOffset: {
                width:
                    0,

                height:
                    0,
            },

            elevation:
                5,
        },

        tabItem: {
            flex:
                1,

            alignItems:
                "center",

            justifyContent:
                "center",

            zIndex:
                2,
        },

        iconOuterWrap: {
            height:
                34,

            alignItems:
                "center",

            justifyContent:
                "center",

            marginBottom:
                2,
        },

        iconInnerWrap: {
            minWidth:
                34,

            height:
                34,

            alignItems:
                "center",

            justifyContent:
                "center",

            borderRadius:
                17,
        },

        dumpIconWrap: {
            width:
                38,

            height:
                38,

            borderRadius:
                19,

            borderWidth:
                1,
        },

        tabLabel: {
            fontSize:
                10.5,

            lineHeight:
                13,

            letterSpacing:
                0.1,
        },

        /*
        |--------------------------------------------------------------------------
        | Student Dump Release Toast
        |--------------------------------------------------------------------------
        */

        releaseToast: {
            position:
                "absolute",

            left:
                16,

            right:
                16,

            minHeight:
                88,

            borderRadius:
                20,

            borderWidth:
                1.25,

            paddingLeft:
                16,

            paddingRight:
                92,

            paddingTop:
                13,

            paddingBottom:
                13,

            justifyContent:
                "center",

            overflow:
                "hidden",

            shadowColor:
                "#000000",

            shadowOpacity:
                0.30,

            shadowRadius:
                14,

            shadowOffset: {
                width:
                    0,

                height:
                    7,
            },

            elevation:
                20,

            zIndex:
                9999,
        },

        toastTextContainer: {
            flex:
                1,

            justifyContent:
                "center",
        },

        toastTitle: {
            fontSize:
                16,

            lineHeight:
                19,

            fontFamily:
                "Rajdhani_700Bold",
        },

        toastMessage: {
            marginTop:
                3,

            fontSize:
                12.5,

            lineHeight:
                17,

            fontWeight:
                "700",
        },

        toastEmoji: {
            position: "absolute",
            right: 18,
            top: "50%",
            marginTop: -18,

            fontSize: 34,
        },
    });