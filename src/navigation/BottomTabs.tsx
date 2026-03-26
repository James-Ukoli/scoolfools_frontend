import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import HomeScreen from "../screens/HomeScreen";
import TrendingScreen from "../screens/TrendingScreen";
import BlogsScreen from "../screens/BlogsScreen";
import RankingsScreen from "../screens/RankingsScreen";
import AlertsScreen from "../screens/AlertsScreen"; // 👈 ADD THIS

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: "#3CF2FF",
                tabBarInactiveTintColor: "#8A8F98",
                tabBarStyle: {
                    backgroundColor: "#050816",
                    borderTopColor: "#12203A",
                    borderTopWidth: 1,
                    height: 60,
                    paddingTop: 6,
                    paddingBottom: 4,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 2,
                },
                tabBarIcon: ({ color, focused }) => {

                    // 🔥 ALERTS (NEW LEFT TAB)
                    if (route.name === "Alerts") {
                        return (
                            <Ionicons
                                name={focused ? "megaphone" : "megaphone-outline"}
                                size={22}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Trending") {
                        return (
                            <FontAwesome6
                                name="arrow-trend-up"
                                size={20}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Home") {
                        return (
                            <Ionicons
                                name={focused ? "home" : "home-outline"}
                                size={22}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Blogs") {
                        return (
                            <Ionicons
                                name={focused ? "book" : "book-outline"}
                                size={22}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Rankings") {
                        return (
                            <FontAwesome6
                                name="ranking-star"
                                size={20}
                                color={color}
                            />
                        );
                    }

                    return null;
                },
            })}
        >
            {/* 👇 ORDER MATTERS — LEFT TO RIGHT */}
            <Tab.Screen name="Alerts" component={AlertsScreen} />
            <Tab.Screen name="Trending" component={TrendingScreen} />
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Blogs" component={BlogsScreen} />
            <Tab.Screen name="Rankings" component={RankingsScreen} />
        </Tab.Navigator>
    );
}