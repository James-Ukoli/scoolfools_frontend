import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { s, vs, ms } from "react-native-size-matters";

export default function EventCountdownCard() {
    const eventName = "Freestyle Chess Grand Slam - Paris";
    const eventDate = new Date("2026-04-10T12:00:00");

    const [timeLeft, setTimeLeft] = useState({
        days: "00",
        hours: "00",
        minutes: "00",
        seconds: "00",
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = eventDate.getTime() - now;

            if (distance <= 0) {
                setTimeLeft({
                    days: "00",
                    hours: "00",
                    minutes: "00",
                    seconds: "00",
                });
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((distance / (1000 * 60)) % 60);
            const seconds = Math.floor((distance / 1000) % 60);

            setTimeLeft({
                days: String(days).padStart(2, "0"),
                hours: String(hours).padStart(2, "0"),
                minutes: String(minutes).padStart(2, "0"),
                seconds: String(seconds).padStart(2, "0"),
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <View style={styles.card}>
            <Image
                source={{
                    uri: "https://images.unsplash.com/photo-1580541832626-2a7131ee809f?auto=format&fit=crop&w=800&q=80",
                }}
                style={styles.eventImage}
            />

            <View style={styles.content}>


                <Text style={styles.eventTitle} numberOfLines={2}>
                    {eventName}
                </Text>

                <View style={styles.timerRow}>
                    <TimerBox value={timeLeft.days} label="Days" />
                    <TimerBox value={timeLeft.hours} label="Hours" />
                    <TimerBox value={timeLeft.minutes} label="Minutes" />
                    <TimerBox value={timeLeft.seconds} label="Seconds" />
                </View>
            </View>
        </View>
    );
}

function TimerBox({
    value,
    label,
}: {
    value: string;
    label: string;
}) {
    return (
        <View style={styles.timerBox}>
            <Text style={styles.timerNumber}>{value}</Text>
            <Text style={styles.timerLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#11192C",
        borderRadius: s(20),
        paddingHorizontal: s(12),
        paddingVertical: vs(10),
        marginBottom: vs(18),
        flexDirection: "row",
        alignItems: "center",
    },
    eventImage: {
        width: s(82),
        height: vs(62),
        borderRadius: s(12),
        marginRight: s(12),
    },
    content: {
        flex: 1,
        justifyContent: "center",
    },
    label: {
        color: "#FF9A3C",
        fontSize: ms(11),
        fontWeight: "700",
        marginBottom: vs(2),
    },
    eventTitle: {
        color: "#FFFFFF",
        fontSize: ms(14),
        fontWeight: "800",
        lineHeight: ms(18),
        marginBottom: vs(8),
    },
    timerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(4),
    },
    timerBox: {
        flex: 1,
        backgroundColor: "#0B1224",
        borderRadius: s(8),
        paddingVertical: vs(4),
        paddingHorizontal: s(3),
        alignItems: "center",
        justifyContent: "center",
    },
    timerNumber: {
        color: "#3CF2FF",
        fontSize: ms(11),
        fontWeight: "800",
        marginBottom: vs(1),
    },
    timerLabel: {
        color: "#AAB4C3",
        fontSize: ms(6.5),
        fontWeight: "600",
    },
});