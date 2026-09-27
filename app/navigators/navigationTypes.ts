import { ComponentProps } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

export type AppStackParamList = {
  CourseCatalogue: undefined
  CourseDetails: { courseCode: string; parentCourseCode?: string; termCode: string }
  DependencyExplorerFullscreen: {
    courseCode: string
    graphHistory?: string[]
    termCode: string
  }
}

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
