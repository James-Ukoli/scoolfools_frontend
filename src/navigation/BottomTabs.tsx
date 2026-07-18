import React, { useEffect, useRef } from "react";
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

import HomeScreen from "../screens/HomeScreen";
import TrendingScreen from "../screens/TrendingScreen";
import TVScreen from "../screens/TVScreen";
import RankingsScreen from "../screens/RankingsScreen";

const Tab = createBottomTabNavigator();
const SCREEN_WIDTH = Dimensions.get("window").width;

type TimeTheme = "day" | "night";

const getCurrentThemeMode = (): TimeTheme => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? "day" : "night";
};

const getTabTheme = (mode: TimeTheme) => {
    if (mode === "day") {
        return {
            bg: "#FFFFFF",
            border: "rgba(7,17,31,0.10)",
            inactive: "#64748B",
            bubble: "#06B6D4",
            bubbleText: "#07111F",
            shadow: "#06B6D4",
        };
    }

    return {
        bg: "#020617",
        border: "rgba(255,255,255,0.10)",
        inactive: "#94A3B8",
        bubble: "#22D3EE",
        bubbleText: "#07111F",
        shadow: "#22D3EE",
    };
};

function getIcon(routeName: string, focused: boolean, color: string) {
    if (routeName === "Home") {
        return <Ionicons name={focused ? "home" : "home-outline"} size={23} color={color} />;
    }

    if (routeName === "Buzz") {
        return <Ionicons name={focused ? "megaphone" : "megaphone-outline"} size={23} color={color} />;
    }

    if (routeName === "Dump") {
        return <MaterialCommunityIcons name="trash-can-outline" size={24} color={color} />;
    }

    if (routeName === "SportsZone") {
        return <Ionicons name="basketball-outline" size={24} />
    }

    if (routeName === "TV") {
        return <MaterialCommunityIcons name="television-play" size={24} color={color} />;
    }

    return null;
}

function getLabel(routeName: string) {
    if (routeName === "SportsZone") return "SportsZone";
    return routeName;
}

function AnimatedTabBar({ state, navigation }: any) {
    const insets = useSafeAreaInsets();
    const theme = getTabTheme(getCurrentThemeMode());

    const tabWidth = SCREEN_WIDTH / state.routes.length;
    const bubbleWidth = tabWidth - 12;

    const translateX = useRef(new Animated.Value(state.index * tabWidth + 6)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: state.index * tabWidth + 6,
            useNativeDriver: true,
            tension: 90,
            friction: 12,
        }).start();
    }, [state.index, tabWidth, translateX]);

    return (
        <View
            style={[
                styles.tabBar,
                {
                    backgroundColor: theme.bg,
                    borderTopColor: theme.border,
                    height: Platform.OS === "android" ? 78 + insets.bottom : 72 + insets.bottom,
                    paddingBottom:
                        Platform.OS === "android"
                            ? Math.max(insets.bottom, 18)
                            : Math.max(insets.bottom, 10),
                },
            ]}
        >
            <Animated.View
                style={[
                    styles.activeBubble,
                    {
                        width: bubbleWidth,
                        backgroundColor: theme.bubble,
                        shadowColor: theme.shadow,
                        transform: [{ translateX }],
                    },
                ]}
            />

            {state.routes.map((route: any) => {
                const focused = state.index === state.routes.indexOf(route);
                const color = focused ? theme.bubbleText : theme.inactive;

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

                return (
                    <TouchableOpacity
                        key={route.key}
                        activeOpacity={0.85}
                        onPress={onPress}
                        style={styles.tabItem}
                    >
                        <View style={styles.iconWrap}>
                            {getIcon(route.name, focused, color)}
                        </View>

                        <Text
                            numberOfLines={1}
                            style={[
                                styles.tabLabel,
                                {
                                    color,
                                    fontWeight: focused ? "900" : "700",
                                },
                            ]}
                        >
                            {getLabel(route.name)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export default function BottomTabs() {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            detachInactiveScreens={false}
            tabBar={(props) => <AnimatedTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                lazy: false,
                animation: "none",
                sceneStyle: {
                    backgroundColor: "#FFFFFF",
                },
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Buzz" component={TrendingScreen} />
            <Tab.Screen name="Dump" component={HomeScreen} />
            <Tab.Screen
                name="SportsZone"
                component={RankingsScreen}
            />
            <Tab.Screen name="TV" component={TVScreen} />
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
        paddingTop: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 16,
    },
    activeBubble: {
        position: "absolute",
        top: 7,
        height: 56,
        borderRadius: 28,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    iconWrap: {
        height: 26,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 10.5,
        letterSpacing: 0.1,
    },
});