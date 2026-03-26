import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useNotifications } from "../context/NotificationsContext";

export default function AppHeader() {
    const navigation = useNavigation<any>();

    const { featuredEnabled, alertsEnabled } = useNotifications();

    const isOneEnabled = featuredEnabled || alertsEnabled;
    const isBothEnabled = featuredEnabled && alertsEnabled;

    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <View style={styles.container}>
                {/* LEFT MENU */}
                <TouchableOpacity
                    style={styles.iconButton}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("Menu")}
                >
                    <Feather name="menu" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                {/* LOGO */}
                <View style={styles.logoWrapper}>
                    <Image
                        source={require("../../assets/images/justmove_stretchlogo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* RIGHT SIDE */}
                <View style={styles.rightIcons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate("Search")}
                    >
                        <Feather name="search" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* 🔔 BELL */}
                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            isOneEnabled && styles.iconButtonActive,
                            isBothEnabled && styles.iconButtonFullyActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate("Notifications")}
                    >
                        <FontAwesome6
                            name="bell"
                            size={20}
                            color={
                                isBothEnabled
                                    ? "#39FF14" // neon green (both ON)
                                    : isOneEnabled
                                        ? "#4DA3FF" // blue (one ON)
                                        : "#FFFFFF" // none
                            }
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: "#000000",
    },
    container: {
        height: 45,
        backgroundColor: "#000000",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#12203A",
    },
    iconButton: {
        width: 30,
        height: 30,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
    },
    iconButtonActive: {
        backgroundColor: "#13203D",
        borderColor: "#4DA3FF",
    },
    iconButtonFullyActive: {
        backgroundColor: "#0F2A12",
        borderColor: "#39FF14",
        shadowColor: "#39FF14",
        shadowOpacity: 0.4,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6, // Android glow
    },
    logoWrapper: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    logo: {
        width: 250,
        height: 100,
        marginTop: 80,
    },
    rightIcons: {
        flexDirection: "row",
        gap: 8,
    },
});