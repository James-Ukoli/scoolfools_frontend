import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import HomeScreen from "../screens/HomeScreen";
import TrendingScreen from "../screens/TrendingScreen";
import BlogsScreen from "../screens/BlogsScreen";
import EventsScreen from "../screens/EventsScreen";
import RankingsScreen from "../screens/RankingsScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: "#3CF2FF",
                tabBarInactiveTintColor: "#8A8F98",

                tabBarStyle: {
                    backgroundColor: "#050816",
                    borderTopColor: "#12203A",
                    borderTopWidth: 1,
                    height: 78,
                    paddingTop: 8,
                    paddingBottom: 10,
                },

                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 2,
                },

                tabBarIcon: ({ color, focused }) => {
                    if (route.name === "Events") {
                        return (
                            <Ionicons
                                name={focused ? "calendar" : "calendar-outline"}
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
                },
            })}
        >
            <Tab.Screen name="Events" component={EventsScreen} />
            <Tab.Screen name="Trending" component={TrendingScreen} />
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Blogs" component={BlogsScreen} />
            <Tab.Screen name="Rankings" component={RankingsScreen} />
        </Tab.Navigator>
    );
}