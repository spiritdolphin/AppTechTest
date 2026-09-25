import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { CourseCatalogueScreen } from "@/features/courses/screens/CourseCatalogueScreen"
import { CourseDetailsScreen } from "@/features/courses/screens/CourseDetailsScreen"
import { DependencyExplorerScreen } from "@/features/courses/screens/DependencyExplorerScreen"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { useAppTheme } from "@/theme/context"

import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"

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
      <Stack.Screen name="CourseCatalogue" component={CourseCatalogueScreen} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
      <Stack.Screen name="DependencyExplorer" component={DependencyExplorerScreen} />
    </Stack.Navigator>
  )
}

export function AppNavigator(props: NavigationProps) {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}
