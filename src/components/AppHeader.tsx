import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";

export default function AppHeader() {
    return (
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                    <Feather name="menu" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.logoWrapper}>
                    <Image
                        source={require("../../assets/images/justmove_stretchlogo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                    <FontAwesome6 name="bell" size={20} color="#FFFFFF" />
                </TouchableOpacity>
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
    logoWrapper: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    logo: {
        width: 250,
        height: 100,
        marginTop: 80
    },
});