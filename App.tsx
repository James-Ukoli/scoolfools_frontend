import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabs from "./src/navigation/BottomTabs";
import ArticleScreen from "./src/screens/ArticleScreen";
import { StatusBar } from "expo-status-bar";
import EventDetailScreen from "./src/screens/EventDetail.Screen";
const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="MainTabs" component={BottomTabs} />
                <Stack.Screen name="ArticleScreen" component={ArticleScreen} />
                <Stack.Screen
                    name="EventDetailScreen"
                    component={EventDetailScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}