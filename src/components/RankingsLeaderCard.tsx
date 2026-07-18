import React from "react";
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Sport =
    | "college-chess"
    | "basketball"
    | "football"
    | "volleyball";

type RankingEntry = {
    rank: number;
    previous_rank?: number | null;
    team_name: string;
    logo_key?: string | null;
    record?: string | null;
    note?: string | null;
};

type Theme = {
    card: string;
    border: string;
    text: string;
    muted: string;
    subtle: string;
};

type RankingsLeaderCardProps = {
    entry: RankingEntry;
    sport: Sport;
    theme: Theme;
    isDark: boolean;
    logoSource?: ImageSourcePropType | null;
};

type MovementType = "up" | "down" | "same" | "new";

type Movement = {
    type: MovementType;
    label: string;
};

function getMovement(entry: RankingEntry): Movement {
    if (
        entry.previous_rank === null ||
        entry.previous_rank === undefined ||
        entry.previous_rank <= 0
    ) {
        return {
            type: "new",
            label: "NEW",
        };
    }

    const difference = entry.previous_rank - entry.rank;

    if (difference > 0) {
        return {
            type: "up",
            label: `↑ ${difference}`,
        };
    }

    if (difference < 0) {
        return {
            type: "down",
            label: `↓ ${Math.abs(difference)}`,
        };
    }

    return {
        type: "same",
        label: "—",
    };
}

function getSportLabel(sport: Sport) {
    if (sport === "college-chess") return "COLLEGE CHESS";
    if (sport === "basketball") return "COLLEGE BASKETBALL";
    if (sport === "football") return "COLLEGE FOOTBALL";
    return "COLLEGE VOLLEYBALL";
}

function getSportAccent(sport: Sport) {
    if (sport === "college-chess") {
        return {
            accent: "#06B6D4",
            glow: "rgba(6,182,212,0.40)",
        };
    }

    if (sport === "basketball") {
        return {
            accent: "#F97316",
            glow: "rgba(249,115,22,0.38)",
        };
    }

    if (sport === "football") {
        return {
            accent: "#57D11F",
            glow: "rgba(87,209,31,0.34)",
        };
    }

    return {
        accent: "#8B5CF6",
        glow: "rgba(139,92,246,0.38)",
    };
}

export default function RankingsLeaderCard({
    entry,
    sport,
    theme,
    isDark,
    logoSource,
}: RankingsLeaderCardProps) {
    const movement = getMovement(entry);
    const sportColors = getSportAccent(sport);

    const movementColor =
        movement.type === "up"
            ? "#39D615"
            : movement.type === "down"
                ? "#F04438"
                : movement.type === "new"
                    ? sportColors.accent
                    : theme.muted;

    const supportingText =
        entry.record ||
        entry.note ||
        "Top-ranked program in the latest edition.";

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? "#06101C" : "#F8FBFF",
                    borderColor: sportColors.accent,
                    shadowColor: sportColors.accent,
                },
            ]}
        >
            <View
                pointerEvents="none"
                style={[
                    styles.glowOrb,
                    {
                        backgroundColor: sportColors.glow,
                    },
                ]}
            />

            <View style={styles.content}>
                <View style={styles.leftColumn}>
                    <Text
                        style={[
                            styles.eyebrow,
                            {
                                color: isDark ? "#D7E2EF" : "#334155",
                            },
                        ]}
                    >
                        🏆 {getSportLabel(sport)}
                    </Text>

                    <Text
                        style={[
                            styles.powerRankingsLabel,
                            {
                                color: theme.text,
                            },
                        ]}
                    >
                        POWER RANKINGS
                    </Text>

                    <View style={styles.rankLine}>
                        <Text
                            style={[
                                styles.numberSign,
                                {
                                    color: sportColors.accent,
                                },
                            ]}
                        >
                            #
                        </Text>

                        <Text
                            style={[
                                styles.rankNumber,
                                {
                                    color: sportColors.accent,
                                    textShadowColor: sportColors.glow,
                                },
                            ]}
                        >
                            {entry.rank}
                        </Text>

                        <View style={styles.teamTextBlock}>
                            <Text
                                style={[
                                    styles.teamName,
                                    {
                                        color: theme.text,
                                    },
                                ]}
                                numberOfLines={2}
                            >
                                {entry.team_name}
                            </Text>

                            {!!entry.record && (
                                <Text
                                    style={[
                                        styles.record,
                                        {
                                            color: theme.muted,
                                        },
                                    ]}
                                >
                                    Record: {entry.record}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.bottomTextBlock}>
                        <Text
                            style={[
                                styles.movement,
                                {
                                    color: movementColor,
                                },
                            ]}
                        >
                            {movement.label}
                            {movement.type === "up" ? " this period" : ""}
                        </Text>

                        <Text
                            style={[
                                styles.supportingText,
                                {
                                    color: isDark ? "#D1D9E5" : "#475467",
                                },
                            ]}
                            numberOfLines={2}
                        >
                            {supportingText}
                        </Text>
                    </View>
                </View>

                <View style={styles.logoArea}>
                    {logoSource ? (
                        <Image
                            source={logoSource}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    ) : (
                        <View
                            style={[
                                styles.logoFallback,
                                {
                                    borderColor: sportColors.accent,
                                    backgroundColor: isDark
                                        ? "rgba(255,255,255,0.04)"
                                        : "rgba(6,182,212,0.06)",
                                },
                            ]}
                        >
                            <Text style={styles.logoFallbackText}>🎓</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        minHeight: 176,
        borderRadius: 20,
        borderWidth: 1.4,
        overflow: "hidden",
        marginBottom: 10,
        shadowOpacity: 0.24,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },
        elevation: 5,
    },

    glowOrb: {
        position: "absolute",
        right: -55,
        top: -48,
        width: 210,
        height: 210,
        borderRadius: 105,
        opacity: 0.34,
    },

    content: {
        flex: 1,
        minHeight: 176,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },

    leftColumn: {
        flex: 1,
        minWidth: 0,
        zIndex: 2,
    },

    eyebrow: {
        fontSize: 11.5,
        lineHeight: 14,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.8,
    },

    powerRankingsLabel: {
        fontSize: 18,
        lineHeight: 20,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.3,
        marginTop: 1,
    },

    rankLine: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 13,
    },

    numberSign: {
        fontSize: 35,
        lineHeight: 39,
        fontFamily: "Rajdhani_700Bold",
    },

    rankNumber: {
        fontSize: 44,
        lineHeight: 46,
        fontFamily: "Rajdhani_700Bold",
        marginLeft: -3,
        textShadowOffset: {
            width: 0,
            height: 0,
        },
        textShadowRadius: 12,
    },

    teamTextBlock: {
        flex: 1,
        minWidth: 0,
        marginLeft: 10,
        paddingRight: 5,
    },

    teamName: {
        fontSize: 22,
        lineHeight: 23,
        fontFamily: "Rajdhani_700Bold",
        letterSpacing: 0.1,
    },

    record: {
        fontSize: 12.5,
        lineHeight: 15,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 2,
    },

    bottomTextBlock: {
        marginTop: 11,
    },

    movement: {
        fontSize: 13,
        lineHeight: 16,
        fontFamily: "Rajdhani_700Bold",
    },

    supportingText: {
        fontSize: 12.5,
        lineHeight: 16,
        fontFamily: "Rajdhani_600SemiBold",
        marginTop: 2,
        paddingRight: 6,
    },

    logoArea: {
        width: 126,
        minHeight: 140,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },

    logo: {
        width: 122,
        height: 122,
    },

    logoFallback: {
        width: 108,
        height: 108,
        borderRadius: 24,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },

    logoFallbackText: {
        fontSize: 45,
    },
});