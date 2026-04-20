import React, { useEffect, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useNotifications } from "../context/NotificationsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AppHeader() {
    const navigation = useNavigation<any>();
    const { featuredEnabled, alertsEnabled } = useNotifications();

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem("user");

                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.log("Error loading user:", error);
            }
        };

        loadUser();
    }, []);

    const isOneEnabled = featuredEnabled || alertsEnabled;
    const isBothEnabled = featuredEnabled && alertsEnabled;

    const avatarUri = user?.photo || user?.photoURL || user?.avatar || null;
    const isLoggedIn = !!avatarUri;

    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity
                    style={[
                        styles.avatarButton,
                        isLoggedIn && styles.avatarButtonActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("Menu")}
                >
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={styles.avatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <Feather name="user" size={18} color="#FFFFFF" />
                    )}
                </TouchableOpacity>

                <View style={styles.logoWrapper}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate("Home")}
                        style={styles.logoPressable}
                    >
                        <Image
                            source={require("../../assets/images/justmove_stretchlogo.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.rightIcons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate("Search")}
                    >
                        <Feather name="search" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

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
                                    ? "#39FF14"
                                    : isOneEnabled
                                        ? "#4DA3FF"
                                        : "#FFFFFF"
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
    avatarButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B1224",
        borderWidth: 1,
        borderColor: "#1B2A4A",
        overflow: "hidden",
    },
    avatarButtonActive: {
        borderColor: "#3CF2FF",
        shadowColor: "#3CF2FF",
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    },
    avatar: {
        width: "100%",
        height: "100%",
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
        elevation: 6,
    },
    logoWrapper: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    logoPressable: {
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        width: 250,
        height: 100,
        marginTop: 30,
    },
    rightIcons: {
        flexDirection: "row",
        gap: 8,
    },
});