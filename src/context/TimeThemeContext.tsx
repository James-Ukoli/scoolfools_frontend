import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";

export type TimeTheme = "day" | "night";

type TimeThemeContextValue = {
    mode: TimeTheme;
    isDay: boolean;
    isDark: boolean;
};

type TimeThemeProviderProps = {
    children: ReactNode;
    /**
     * Development-only visual test helper.
     * Leave unset in production. Temporarily pass "day" or "night" from App.tsx
     * to verify that every subscribed screen changes together.
     */
    forcedMode?: TimeTheme | null;
};

const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 19;

export const getCurrentThemeMode = (date = new Date()): TimeTheme => {
    const hour = date.getHours();
    return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR
        ? "day"
        : "night";
};

const getMillisecondsUntilNextThemeChange = (date = new Date()): number => {
    const nextChange = new Date(date);
    const hour = date.getHours();

    if (hour < DAY_START_HOUR) {
        nextChange.setHours(DAY_START_HOUR, 0, 0, 0);
    } else if (hour < NIGHT_START_HOUR) {
        nextChange.setHours(NIGHT_START_HOUR, 0, 0, 0);
    } else {
        nextChange.setDate(nextChange.getDate() + 1);
        nextChange.setHours(DAY_START_HOUR, 0, 0, 0);
    }

    return Math.max(nextChange.getTime() - date.getTime(), 1000);
};

const TimeThemeContext = createContext<TimeThemeContextValue | null>(null);

export function TimeThemeProvider({
    children,
    forcedMode = null,
}: TimeThemeProviderProps) {
    const [mode, setMode] = useState<TimeTheme>(
        forcedMode ?? getCurrentThemeMode()
    );

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearScheduledUpdate = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        if (forcedMode) {
            clearScheduledUpdate();
            setMode(forcedMode);
            return clearScheduledUpdate;
        }

        const scheduleNextUpdate = () => {
            clearScheduledUpdate();

            const now = new Date();
            setMode(getCurrentThemeMode(now));

            timeoutRef.current = setTimeout(
                scheduleNextUpdate,
                getMillisecondsUntilNextThemeChange(now)
            );
        };

        scheduleNextUpdate();

        const appStateSubscription = AppState.addEventListener(
            "change",
            (nextState) => {
                if (nextState === "active") {
                    // React Native may suspend timers in the background.
                    // Recalculate immediately and replace the old timer.
                    scheduleNextUpdate();
                } else {
                    clearScheduledUpdate();
                }
            }
        );

        return () => {
            clearScheduledUpdate();
            appStateSubscription.remove();
        };
    }, [forcedMode]);

    const value = useMemo<TimeThemeContextValue>(
        () => ({
            mode,
            isDay: mode === "day",
            isDark: mode === "night",
        }),
        [mode]
    );

    return (
        <TimeThemeContext.Provider value={value}>
            {children}
        </TimeThemeContext.Provider>
    );
}

export function useTimeTheme(): TimeThemeContextValue {
    const context = useContext(TimeThemeContext);

    if (!context) {
        throw new Error(
            "useTimeTheme must be used inside a TimeThemeProvider."
        );
    }

    return context;
}
