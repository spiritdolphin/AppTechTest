import { useCallback, useEffect } from "react"
import { AppState } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { CourseCatalogueScreen } from "@/features/courses/screens/CourseCatalogueScreen"
import { CourseDetailsScreen } from "@/features/courses/screens/CourseDetailsScreen"
import { DependencyExplorerFullscreenScreen } from "@/features/courses/screens/DependencyExplorerFullscreenScreen"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { useAppTheme } from "@/theme/context"

import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { getActiveRouteName, navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { appOrientationController } from "./orientationController"

const exitRoutes = Config.exitRoutes
const Stack = createNativeStackNavigator<AppStackParamList>()

function AppStack() {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <Stack.Navigator
      initialRouteName="CourseCatalogue"
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Expo owns orientation locks; native-stack per-screen orientation overrides them on iOS. */}
      <Stack.Screen name="CourseCatalogue" component={CourseCatalogueScreen} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
      <Stack.Screen
        name="DependencyExplorerFullscreen"
        component={DependencyExplorerFullscreenScreen}
        options={{ presentation: "fullScreenModal" }}
        listeners={{
          transitionEnd: (event) => {
            if (!event.data.closing) return

            const routeName = navigationRef.isReady()
              ? navigationRef.getCurrentRoute()?.name
              : undefined
            void appOrientationController.lockForRoute(routeName)
          },
        }}
      />
    </Stack.Navigator>
  )
}

export function AppNavigator(props: NavigationProps) {
  const { navigationTheme } = useAppTheme()
  const { onReady, onStateChange, ...navigationProps } = props

  const lockCurrentRoute = useCallback(() => {
    const routeName = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined
    void appOrientationController.lockForRoute(routeName)
  }, [])

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  useEffect(() => {
    void appOrientationController.lockForRoute("CourseCatalogue")

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") lockCurrentRoute()
    })

    return () => subscription.remove()
  }, [lockCurrentRoute])

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      {...navigationProps}
      onReady={() => {
        lockCurrentRoute()
        onReady?.()
      }}
      onStateChange={(state) => {
        const routeName = state ? getActiveRouteName(state) : undefined
        void appOrientationController.lockForRoute(routeName as keyof AppStackParamList | undefined)
        onStateChange?.(state)
      }}
    >
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}
