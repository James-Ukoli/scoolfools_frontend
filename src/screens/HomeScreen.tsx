import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import FeaturedCarousel from "../components/FeaturedCarousel";
import EventCountdownCard from "../components/EventCountdownCard";
import { s, vs, ms } from "react-native-size-matters";
import HorizontalPostsRow from "../components/HorizontalPostsRow"
export default function HomeScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Text style={styles.sectionTitle}>
                        Breaking News
                    </Text>
                    <FeaturedCarousel />
                    <Text style={styles.sectionLabel}>
                        🔥 Next Major Event  🔥
                    </Text>
                    <EventCountdownCard />
                    <Text style={styles.sectionTitle}>
                        Featured Stories
                    </Text>
                    <HorizontalPostsRow />

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#070B1A",
    },
    container: {
        flex: 1,
        backgroundColor: "#070B1A",
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 120,
    },

    eventSection: {
        minHeight: 150,
        borderRadius: 24,
        backgroundColor: "#10182B",
        marginBottom: 20,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    sectionTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 14,
    },
    horizontalStoriesSection: {
        height: 250,
        borderRadius: 24,
        backgroundColor: "#10182B",
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        color: "#AAB4C3",
        fontSize: 18,
        fontWeight: "600",
    },
    sectionLabel: {

        fontSize: ms(14),
        fontWeight: "800",
        textAlign: "center",
        marginBottom: vs(10),
        color: "#FF9A3C",
    },

});