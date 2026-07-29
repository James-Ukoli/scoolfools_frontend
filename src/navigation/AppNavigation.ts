import {
    CommonActions,
    createNavigationContainerRef,
} from "@react-navigation/native";

export type RootStackParamList = {
    GoogleSignIn: undefined;

    SetupProfile: undefined;

    IntroVideo: undefined;

    MainTabs:
        | {
              screen?: string;
              params?: Record<string, unknown>;
          }
        | undefined;

    ArticleScreen:
        | {
              articleId?: string;
              slug?: string;
              notificationId?: string;
              notificationType?: string;
          }
        | undefined;

    EventDetailScreen:
        | {
              eventId?: string;
              notificationId?: string;
              notificationType?: string;
          }
        | undefined;

    Search: undefined;

    Menu: undefined;

    AccountSettings: undefined;

    DeleteAccount: undefined;

    ReviewerLogin: undefined;

    Notifications: undefined;

    ContactUs: undefined;

    EventsScreen: undefined;

    GameHome: undefined;

    CharadesSetup: undefined;

    CharadesPlay: undefined;

    MostLikely: undefined;

    ImpostorSetup: undefined;

    ImpostorReveal: undefined;

    JustMoveClock: undefined;

    GamesPaywall: undefined;

    TVScreen: undefined;

    CreateDump: undefined;

    MyDumps: undefined;
};

export const navigationRef =
    createNavigationContainerRef<RootStackParamList>();

type RouteName = keyof RootStackParamList;

type NavigationParams =
    RootStackParamList[RouteName];

type PendingNavigation = {
    routeName: RouteName;
    params?: NavigationParams;
};

let pendingNavigation: PendingNavigation | null =
    null;

export const isNavigationReady = (): boolean => {
    return navigationRef.isReady();
};

const dispatchNavigate = (
    routeName: RouteName,
    params?: NavigationParams
): void => {
    navigationRef.dispatch(
        CommonActions.navigate(
            routeName,
            params as
                | Record<string, unknown>
                | undefined
        )
    );
};

export const navigate = <
    TRouteName extends RouteName
>(
    routeName: TRouteName,
    params?: RootStackParamList[TRouteName]
): void => {
    if (!navigationRef.isReady()) {
        pendingNavigation = {
            routeName,
            params:
                params as NavigationParams,
        };

        return;
    }

    dispatchNavigate(
        routeName,
        params as NavigationParams
    );
};

export const resetToRoute = <
    TRouteName extends RouteName
>(
    routeName: TRouteName,
    params?: RootStackParamList[TRouteName]
): void => {
    if (!navigationRef.isReady()) {
        pendingNavigation = {
            routeName,
            params:
                params as NavigationParams,
        };

        return;
    }

    navigationRef.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [
                {
                    name: routeName,
                    params:
                        params as
                            | Record<
                                  string,
                                  unknown
                              >
                            | undefined,
                },
            ],
        })
    );
};

export const flushPendingNavigation = (): void => {
    if (
        !navigationRef.isReady() ||
        !pendingNavigation
    ) {
        return;
    }

    const navigationToRun =
        pendingNavigation;

    pendingNavigation = null;

    dispatchNavigate(
        navigationToRun.routeName,
        navigationToRun.params
    );
};

export const clearPendingNavigation = (): void => {
    pendingNavigation = null;
};
