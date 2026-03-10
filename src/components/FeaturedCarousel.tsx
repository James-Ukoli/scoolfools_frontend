import { Dimensions, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { s, vs, ms } from "react-native-size-matters";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

const featuredPosts = [
    {
        id: "1",
        title: "Why Freestyle Chess Needs a Breakthrough Moment",
        summary:
            "Magnus Carlsen aims to revolutionize the game with a new format that could bring more excitement and attention to elite chess.",
        image:
            "https://fox8.com/wp-content/uploads/sites/12/2024/10/671b45de881517.14135711.jpeg?w=2560&h=1440&crop=1",
        time: "2 hours ago",
    },
    {
        id: "2",
        title: "Nodirbek Keeps Rising in the Biggest Classical Events",
        summary:
            "His recent form is making the chess world pay attention as he continues to look stronger against top opposition.",
        image:
            "https://www.fide.com/wp-content/uploads/Abdusattorov-Navara.jpg",
        time: "4 hours ago",
    },
    {
        id: "3",
        title: "Can Gukesh Respond After a Rough Stretch",
        summary:
            "The young world champion still has time to answer the noise and remind everyone why he reached the top.",
        image:
            "https://c.ndtvimg.com/2024-11/etfsdleo_d-gukesh-x-fidechess_625x300_28_November_24.jpg?im=FeatureCrop,algorithm=dnn,width=806,height=605",
        time: "6 hours ago",
    },
];

export default function FeaturedCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (event: any) => {
        const slideIndex = Math.round(
            event.nativeEvent.contentOffset.x / CARD_WIDTH
        );
        setActiveIndex(slideIndex);
    };

    return (
        <View style={styles.wrapper}>
            <FlatList
                data={featuredPosts}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH}
                snapToAlignment="start"
                disableIntervalMomentum
                contentContainerStyle={{ paddingRight: 0 }}
                bounces={false}
                onMomentumScrollEnd={handleScroll}
                renderItem={({ item }) => (
                    <View style={styles.cardContainer}>
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

                                <Text style={styles.timeText}>{item.time}</Text>
                            </View>
                        </View>
                    </View>
                )}
            />

            <View style={styles.dotsContainer}>
                {featuredPosts.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            activeIndex === index && styles.activeDot,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: vs(18),
    },
    cardContainer: {
        width: CARD_WIDTH,
    },
    card: {
        borderRadius: s(24),
        overflow: "hidden",
        backgroundColor: "#10182B",
    },
    imageSection: {
        height: vs(180),
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
        left: s(16),
        right: s(16),
        bottom: vs(14),
    },
    title: {
        color: "#FFFFFF",
        fontSize: ms(18),
        fontWeight: "800",
        lineHeight: ms(22),
    },
    bottomSection: {
        backgroundColor: "#11192C",
        paddingHorizontal: s(16),
        paddingTop: vs(10),
        paddingBottom: vs(10),
    },
    summary: {
        color: "#D3D9E6",
        fontSize: ms(14),
        lineHeight: ms(18),
        marginBottom: vs(4),
    },
    timeText: {
        color: "#AAB4C3",
        fontSize: ms(12),
        fontWeight: "600",
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: vs(8),
        paddingRight: s(8),
        gap: s(8),
    },
    dot: {
        width: s(6),
        height: s(6),
        borderRadius: 999,
        backgroundColor: "#586174",
    },
    activeDot: {
        backgroundColor: "#3CF2FF",
    },
});