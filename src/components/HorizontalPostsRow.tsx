import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { s, vs, ms } from "react-native-size-matters";

const posts = [
    {
        id: "1",
        title: "Gukesh Triumphs in Chennai Blitz Showdown",
        summary:
            "Indian prodigy defeats five time world champion in a wild finish that had fans reacting all over social media.",
        image:
            "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
        time: "3 hrs ago",
    },
    {
        id: "2",
        title: "Nepomniachtchi Defends Title Against Firouzja",
        summary:
            "Thrilling final round secures the crown after a tense finish and a memorable closing sequence.",
        image:
            "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=800&q=80",
        time: "4 hrs ago",
    },
    {
        id: "3",
        title: "Nodirbek Keeps Climbing the Rankings",
        summary:
            "Another strong event pushes him further into the spotlight as more fans start paying attention.",
        image:
            "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?auto=format&fit=crop&w=800&q=80",
        time: "5 hrs ago",
    },
    {
        id: "4",
        title: "Carlsen Talks Format Changes Again",
        summary:
            "Freestyle ideas continue to stir debate around elite chess and the future of the sport.",
        image:
            "https://images.unsplash.com/photo-1580541832626-2a7131ee809f?auto=format&fit=crop&w=800&q=80",
        time: "7 hrs ago",
    },
    {
        id: "5",
        title: "Hikaru Returns to the Spotlight",
        summary:
            "Fans are watching closely after a string of appearances and public reactions around his schedule.",
        image:
            "https://images.unsplash.com/photo-1611195974226-a6a9be9dd763?auto=format&fit=crop&w=800&q=80",
        time: "9 hrs ago",
    },
    {
        id: "6",
        title: "Candidates Race Starts Heating Up",
        summary:
            "Every result now feels like it matters more as players fight for major qualification spots.",
        image:
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
        time: "11 hrs ago",
    },
    {
        id: "7",
        title: "Could Rapid Events Grow Even Bigger",
        summary:
            "Organizers are thinking more creatively about how to package fast chess for wider audiences.",
        image:
            "https://images.unsplash.com/photo-1523875194681-bedd468c58bf?auto=format&fit=crop&w=800&q=80",
        time: "13 hrs ago",
    },
];

export default function HorizontalPostsRow() {
    return (
        <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <View style={styles.imageSection}>
                        <Image source={{ uri: item.image }} style={styles.image} />

                        <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.82)"]}
                            style={styles.imageOverlay}
                        />

                        <View style={styles.titleContainer}>
                            <Text style={styles.title} numberOfLines={2}>
                                {item.title}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bottomSection}>
                        <Text
                            style={styles.summary}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {item.summary}
                        </Text>

                        <Text style={styles.time}>{item.time}</Text>
                    </View>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingRight: s(8),
    },
    card: {
        width: s(182),
        borderRadius: s(20),
        overflow: "hidden",
        backgroundColor: "#11192C",
        marginRight: s(12),
    },
    imageSection: {
        height: vs(155),
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    titleContainer: {
        position: "absolute",
        left: s(10),
        right: s(10),
        bottom: vs(10),
    },
    title: {
        color: "#FFFFFF",
        fontSize: ms(14),
        fontWeight: "800",
        lineHeight: ms(18),
    },
    bottomSection: {
        backgroundColor: "#11192C",
        paddingHorizontal: s(12),
        paddingTop: vs(10),
        paddingBottom: vs(10),
    },
    summary: {
        color: "#D3D9E6",
        fontSize: ms(12),
        lineHeight: ms(16),
        marginBottom: vs(8),
    },
    time: {
        color: "#AAB4C3",
        fontSize: ms(11),
        fontWeight: "600",
    },
});