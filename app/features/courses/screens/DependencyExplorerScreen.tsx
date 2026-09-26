import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { DependencyGraphView } from "../components/DependencyGraphView"
import { courseRepository } from "../data/generatedCourseRepository"
import type { CourseRepository } from "../data/repository"
import type { ResolvedDependencyGraph } from "../domain/dependencyGraph"

type DependencyExplorerScreenProps = AppStackScreenProps<"DependencyExplorer"> & {
  repository?: CourseRepository
}

export function DependencyExplorerScreen({
  navigation,
  repository = courseRepository,
  route,
}: DependencyExplorerScreenProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { courseCode, termCode } = route.params
  const [graph, setGraph] = useState<ResolvedDependencyGraph>()
  const [loadError, setLoadError] = useState<string>()
  const [loadAttempt, setLoadAttempt] = useState(0)
  const semester = repository.getSemester(termCode)
  const termName = semester?.termName ?? termCode

  useEffect(() => {
    let active = true
    setGraph(undefined)
    setLoadError(undefined)

    repository
      .resolveDependencyGraph(termCode, courseCode, 1)
      .then((resolvedGraph) => {
        if (active) setGraph(resolvedGraph)
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Unable to load prerequisites.")
        }
      })

    return () => {
      active = false
    }
  }, [courseCode, loadAttempt, repository, termCode])

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screenContent)}
    >
      <Pressable
        accessibilityLabel={`Back to ${courseCode} details`}
        accessibilityRole="button"
        onPress={navigation.goBack}
        style={({ pressed }) => [themed($backButton), pressed && $pressed]}
      >
        <Text text="‹" size="xl" style={themed($backIcon)} />
        <Text text="Course Details" weight="semiBold" />
      </Pressable>

      <View style={themed($header)}>
        <Text text="DEPENDENCY EXPLORER" size="xs" weight="semiBold" style={themed($eyebrow)} />
        <Text text={courseCode} preset="heading" />
        <Text text={termName} size="sm" style={themed($secondaryText)} />
      </View>

      {!!loadError ? (
        <View style={themed($centerState)}>
          <Text text="Could not load dependencies" preset="subheading" style={$centerText} />
          <Text text={loadError} size="sm" style={[themed($secondaryText), $centerText]} />
          <Button
            text="Try again"
            onPress={() => setLoadAttempt((attempt) => attempt + 1)}
            style={$stateButton}
          />
        </View>
      ) : !graph ? (
        <View accessibilityLabel="Loading dependencies" style={themed($centerState)}>
          <ActivityIndicator color={colors.tint} size="large" />
          <Text text="Loading dependencies…" size="sm" style={themed($secondaryText)} />
        </View>
      ) : !graph.currentCourseAvailable ? (
        <View style={themed($centerState)}>
          <Text text={`${courseCode} is unavailable`} preset="subheading" style={$centerText} />
          <Text
            text={`This course is not offered in ${termName}. Return to Course Details and choose another semester.`}
            size="sm"
            style={[themed($secondaryText), $centerText]}
          />
        </View>
      ) : (
        <>
          {graph.mode === "extracted" && (
            <View style={themed($notice)}>
              <Text text="Extracted courses" weight="semiBold" />
              <Text
                text="Some conditions could not be interpreted reliably. Only recognized course references are shown."
                size="xs"
                style={themed($secondaryText)}
              />
            </View>
          )}

          {!!graph.originalText && (
            <View style={themed($sourceCard)} testID="original-text-card">
              <Text text="Original Text" weight="semiBold" />
              <Text text={graph.originalText} size="sm" selectable />
            </View>
          )}

          <Text
            accessibilityRole="header"
            text="VISUALIZER"
            size="xs"
            weight="semiBold"
            style={themed($visualizerLabel)}
            testID="dependency-visualizer-label"
          />

          <DependencyGraphView
            graph={graph}
            onOpenCourse={(prerequisiteCode) =>
              navigation.navigate("CourseDetails", {
                courseCode: prerequisiteCode,
                termCode,
              })
            }
            termName={termName}
          />

          <Text
            text="Tap an available course to open its details and continue exploring. The graph is limited to this semester and prerequisite relationships only."
            size="xs"
            style={themed($secondaryText)}
          />
        </>
      )}
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  gap: spacing.lg,
  paddingBottom: spacing.xxl,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  alignSelf: "flex-start",
  flexDirection: "row",
  minHeight: 44,
  paddingRight: spacing.sm,
})

const $backIcon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginRight: spacing.xxs,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxs,
})

const $eyebrow: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 1.1,
})

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $notice: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.accent100,
  borderRadius: 16,
  gap: spacing.xxs,
  padding: spacing.md,
})

const $visualizerLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 1.1,
})

const $sourceCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 18,
  gap: spacing.xs,
  padding: spacing.md,
})

const $centerState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.sm,
  justifyContent: "center",
  minHeight: 360,
  paddingHorizontal: spacing.lg,
})

const $centerText: TextStyle = {
  textAlign: "center",
}

const $stateButton: ViewStyle = {
  marginTop: 12,
  minWidth: 168,
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}
