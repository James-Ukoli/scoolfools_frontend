import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    useTimeTheme,
    type TimeTheme,
} from "../context/TimeThemeContext";

import HomeScreen from "../screens/HomeScreen";
import TrendingScreen from "../screens/TrendingScreen";
import TVScreen from "../screens/TVScreen";
import RankingsScreen from "../screens/RankingsScreen";
import DumpScreen from "../screens/DumpScreen";

const Tab = createBottomTabNavigator();

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ACTIVE_INDICATOR_WIDTH = 30;
const ACTIVE_ICON_SCALE = 1.12;

const getTabTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            background: "#FFFFFF",
            border: "rgba(7,17,31,0.10)",
            active: "#06B6D4",
            inactive: "#64748B",
            label: "#07111F",
            activeSoft: "rgba(6,182,212,0.10)",
            dumpBackground: "rgba(6,182,212,0.09)",
            shadow: "rgba(15,23,42,0.16)",
        };
    }

    return {
        background: "#020617",
        border: "rgba(255,255,255,0.10)",
        active: "#22D3EE",
        inactive: "#94A3B8",
        label: "#FFFFFF",
        activeSoft: "rgba(34,211,238,0.11)",
        dumpBackground: "rgba(34,211,238,0.10)",
        shadow: "rgba(0,0,0,0.40)",
    };
};

const getLabel = (routeName: string) => {
    if (routeName === "SportsZone") {
        return "Sports";
    }

    return routeName;
};

const getIcon = (
    routeName: string,
    focused: boolean,
    color: string,
) => {
    if (routeName === "Home") {
        return (
            <Ionicons
                name={focused ? "home" : "home-outline"}
                size={23}
                color={color}
            />
        );
    }

    if (routeName === "Buzz") {
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

    if (routeName === "Dump") {
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

    if (routeName === "SportsZone") {
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

    if (routeName === "TV") {
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

function AnimatedTabItem({
    route,
    focused,
    navigation,
    theme,
    index,
}: {
    route: any;
    focused: boolean;
    navigation: any;
    theme: ReturnType<typeof getTabTheme>;
    index: number;
}) {
    const scale = useRef(
        new Animated.Value(
            focused ? ACTIVE_ICON_SCALE : 1,
        ),
    ).current;

    const opacity = useRef(
        new Animated.Value(focused ? 1 : 0.82),
    ).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: focused
                    ? ACTIVE_ICON_SCALE
                    : 1,
                useNativeDriver: true,
                tension: 115,
                friction: 10,
            }),

            Animated.timing(opacity, {
                toValue: focused ? 1 : 0.82,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    }, [focused, opacity, scale]);

    const color = focused
        ? theme.active
        : theme.inactive;

    const onPress = () => {
        const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
        });

        if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: "tabLongPress",
            target: route.key,
        });
    };

    const isDump = route.name === "Dump";

    return (
        <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={
                focused
                    ? {
                        selected: true,
                    }
                    : {}
            }
            accessibilityLabel={
                `${getLabel(route.name)} tab`
            }
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
        >
            <Animated.View
                style={[
                    styles.iconOuterWrap,
                    {
                        opacity,
                        transform: [{ scale }],
                    },
                ]}
            >
                <View
                    style={[
                        styles.iconInnerWrap,
                        isDump && styles.dumpIconWrap,
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
                        color,
                    )}
                </View>
            </Animated.View>

            <Text
                numberOfLines={1}
                style={[
                    styles.tabLabel,
                    {
                        color,
                        fontWeight: focused
                            ? "900"
                            : "700",
                    },
                ]}
            >
                {getLabel(route.name)}
            </Text>
        </TouchableOpacity>
    );
}

function AnimatedTabBar({
    state,
    navigation,
}: any) {
    const insets = useSafeAreaInsets();
    const { mode } = useTimeTheme();

    const theme = useMemo(
        () => getTabTheme(mode),
        [mode],
    );

    const tabCount = state.routes.length;
    const tabWidth = SCREEN_WIDTH / tabCount;

    const indicatorTarget =
        state.index * tabWidth +
        tabWidth / 2 -
        ACTIVE_INDICATOR_WIDTH / 2;

    const indicatorTranslateX = useRef(
        new Animated.Value(indicatorTarget),
    ).current;

    useEffect(() => {
        Animated.spring(indicatorTranslateX, {
            toValue: indicatorTarget,
            useNativeDriver: true,
            tension: 105,
            friction: 13,
        }).start();
    }, [
        indicatorTarget,
        indicatorTranslateX,
    ]);

    const tabBarHeight =
        Platform.OS === "android"
            ? 72 + Math.max(insets.bottom, 10)
            : 68 + Math.max(insets.bottom, 8);

    return (
        <View
            style={[
                styles.tabBar,
                {
                    height: tabBarHeight,
                    paddingBottom:
                        Platform.OS === "android"
                            ? Math.max(insets.bottom, 10)
                            : Math.max(insets.bottom, 8),

                    backgroundColor:
                        theme.background,

                    borderTopColor:
                        theme.border,

                    shadowColor: theme.shadow,
                },
            ]}
        >
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.activeIndicator,
                    {
                        width: ACTIVE_INDICATOR_WIDTH,
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
                (route: any, index: number) => {
                    const focused =
                        state.index === index;

                    return (
                        <AnimatedTabItem
                            key={route.key}
                            route={route}
                            focused={focused}
                            navigation={navigation}
                            theme={theme}
                            index={index}
                        />
                    );
                },
            )}
        </View>
    );
}

export default function BottomTabs() {
    const { isDark } = useTimeTheme();

    return (
        <Tab.Navigator
            initialRouteName="Home"
            detachInactiveScreens={false}
            tabBar={(props) => (
                <AnimatedTabBar {...props} />
            )}
            screenOptions={{
                headerShown: false,
                lazy: false,
                animation: "none",

                sceneStyle: {
                    backgroundColor: isDark
                        ? "#020617"
                        : "#FFFFFF",
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
            />

            <Tab.Screen
                name="Buzz"
                component={TrendingScreen}
            />

            <Tab.Screen
                name="Dump"
                component={DumpScreen}
            />

            <Tab.Screen
                name="SportsZone"
                component={RankingsScreen}
            />

            <Tab.Screen
                name="TV"
                component={TVScreen}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,

        flexDirection: "row",

        borderTopWidth: 1,

        paddingTop: 10,

        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: {
            width: 0,
            height: -5,
        },

        elevation: 16,
    },

    activeIndicator: {
        position: "absolute",
        top: 0,

        height: 3,
        borderRadius: 999,

        shadowOpacity: 0.38,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    tabItem: {
        flex: 1,

        alignItems: "center",
        justifyContent: "center",

        zIndex: 2,
    },

    iconOuterWrap: {
        height: 34,

        alignItems: "center",
        justifyContent: "center",

        marginBottom: 2,
    },

    iconInnerWrap: {
        minWidth: 34,
        height: 34,

        alignItems: "center",
        justifyContent: "center",

        borderRadius: 17,
    },

    dumpIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,

        borderWidth: 1,
    },

    tabLabel: {
        fontSize: 10.5,
        lineHeight: 13,

        letterSpacing: 0.1,
    },
});