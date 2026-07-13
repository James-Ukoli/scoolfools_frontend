import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    useVideoPlayer,
    VideoView,
    VideoSource,
} from "expo-video";
import { useEventListener } from "expo";

const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL;

const INTRO_VIDEO_SOURCE: VideoSource = {
    uri: "https://res.cloudinary.com/djmlovfia/video/upload/v1783975658/v12044gd0000d326l8nog65h5hb8cft0_djyjqa.mp4",

    // Turn this back on later after playback is stable.
    useCaching: false,
};

export default function IntroVideoScreen({
    navigation,
}: any) {
    const [showSkip, setShowSkip] = useState(false);
    const [loading, setLoading] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [videoError, setVideoError] = useState(false);

    const completionStartedRef = useRef(false);
    const playbackStartedRef = useRef(false);

    const player = useVideoPlayer(
        INTRO_VIDEO_SOURCE,
        (videoPlayer) => {
            videoPlayer.loop = false;
            videoPlayer.muted = false;
            videoPlayer.volume = 1;
        }
    );

    useEffect(() => {
        const skipTimer = setTimeout(() => {
            setShowSkip(true);
        }, 5000);

        return () => {
            clearTimeout(skipTimer);
        };
    }, []);

    useEventListener(
        player,
        "statusChange",
        ({ status, error }) => {
            console.log("Intro video status:", status);

            if (status === "readyToPlay") {
                setVideoReady(true);
                setVideoError(false);

                if (!playbackStartedRef.current) {
                    playbackStartedRef.current = true;

                    try {
                        player.play();
                    } catch (playError) {
                        console.log(
                            "Intro video play error:",
                            playError
                        );
                    }
                }
            }

            if (status === "error") {
                console.log(
                    "Intro video playback error:",
                    error
                );

                setVideoReady(false);
                setVideoError(true);
                setShowSkip(true);
            }
        }
    );

    const completeOnboarding = useCallback(async () => {
        if (completionStartedRef.current) {
            return;
        }

        completionStartedRef.current = true;

        try {
            setLoading(true);

            try {
                player.pause();
            } catch {
                // Player may already be stopped.
            }

            if (!API_BASE_URL) {
                throw new Error(
                    "EXPO_PUBLIC_API_BASE_URL is missing."
                );
            }

            const token =
                await AsyncStorage.getItem("token");

            if (!token) {
                await AsyncStorage.multiRemove([
                    "token",
                    "user",
                ]);

                navigation.reset({
                    index: 0,
                    routes: [
                        {
                            name: "GoogleSignIn",
                        },
                    ],
                });

                return;
            }

            const response = await fetch(
                `${API_BASE_URL}/api/auth/me/complete-onboarding`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            let data: any = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                if (
                    response.status === 401 ||
                    response.status === 404
                ) {
                    await AsyncStorage.multiRemove([
                        "token",
                        "user",
                    ]);

                    navigation.reset({
                        index: 0,
                        routes: [
                            {
                                name: "GoogleSignIn",
                            },
                        ],
                    });

                    return;
                }

                throw new Error(
                    data?.message ||
                    "Unable to complete onboarding."
                );
            }

            const returnedUser =
                data?.user ||
                data?.updatedUser ||
                data;

            const storedUser =
                await AsyncStorage.getItem("user");

            let existingUser = {};

            if (storedUser) {
                try {
                    existingUser =
                        JSON.parse(storedUser);
                } catch {
                    existingUser = {};
                }
            }

            const userToStore = {
                ...existingUser,
                ...returnedUser,
                onboardingStage: "complete",
            };

            await AsyncStorage.setItem(
                "user",
                JSON.stringify(userToStore)
            );

            navigation.reset({
                index: 0,
                routes: [
                    {
                        name: "MainTabs",
                    },
                ],
            });
        } catch (error: any) {
            console.log(
                "Complete onboarding error:",
                error
            );

            completionStartedRef.current = false;

            Alert.alert(
                "Unable to Continue",
                error?.message ||
                "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [navigation, player]);

    useEventListener(
        player,
        "playToEnd",
        completeOnboarding
    );

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom"]}
        >
            <View style={styles.container}>
                <VideoView
                    player={player}
                    style={styles.video}
                    nativeControls={false}
                    contentFit="cover"
                    fullscreenOptions={{
                        enable: false,
                    }}
                    allowsPictureInPicture={false}
                />

                {!videoReady && !videoError && (
                    <View
                        style={
                            styles.loadingOverlay
                        }
                    >
                        <ActivityIndicator
                            size="large"
                            color="#FACC15"
                        />

                        <Text
                            style={
                                styles.loadingText
                            }
                        >
                            Loading your welcome...
                        </Text>
                    </View>
                )}

                {videoError && (
                    <View
                        style={styles.errorOverlay}
                    >
                        <Text style={styles.errorTitle}>
                            Welcome to ScoolFools
                        </Text>

                        <Text style={styles.errorText}>
                            The intro video could not be
                            loaded. You can still continue.
                        </Text>
                    </View>
                )}

                {showSkip && (
                    <TouchableOpacity
                        style={[
                            styles.skipButton,
                            loading &&
                            styles.buttonDisabled,
                        ]}
                        onPress={completeOnboarding}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator
                                color="#07111F"
                            />
                        ) : (
                            <Text
                                style={
                                    styles.skipButtonText
                                }
                            >
                                Skip
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#07111F",
    },

    container: {
        flex: 1,
        backgroundColor: "#07111F",
        position: "relative",
    },

    video: {
        ...StyleSheet.absoluteFillObject,
    },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#07111F",
        paddingHorizontal: 30,
    },

    loadingText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
        marginTop: 14,
        textAlign: "center",
    },

    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#06B6D4",
        paddingHorizontal: 28,
    },

    errorTitle: {
        color: "#07111F",
        fontSize: 30,
        fontWeight: "900",
        textAlign: "center",
    },

    errorText: {
        color: "#153448",
        fontSize: 15,
        lineHeight: 21,
        fontWeight: "700",
        textAlign: "center",
        marginTop: 10,
    },

    skipButton: {
        position: "absolute",
        right: 20,
        bottom: 22,
        minWidth: 94,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#FACC15",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
    },

    buttonDisabled: {
        opacity: 0.65,
    },

    skipButtonText: {
        color: "#07111F",
        fontSize: 16,
        fontWeight: "900",
    },
});