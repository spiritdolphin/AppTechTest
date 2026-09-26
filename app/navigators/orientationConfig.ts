import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"

import type { AppStackParamList } from "./navigationTypes"

type ScreenOrientation = NonNullable<NativeStackNavigationOptions["orientation"]>

interface AppStackOrientationConfig {
  default: ScreenOrientation
  overrides: Partial<Record<keyof AppStackParamList, ScreenOrientation>>
}

export const appStackOrientationConfig = {
  default: "portrait",
  overrides: {
    DependencyExplorerFullscreen: "landscape",
  },
} as const satisfies AppStackOrientationConfig
