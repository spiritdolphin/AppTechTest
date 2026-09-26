import { ActivityIndicator, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { DependencyGraphView } from "../components/DependencyGraphView"
import { courseRepository } from "../data/generatedCourseRepository"
import type { CourseRepository } from "../data/repository"
import { useDependencyGraph } from "../utils/useDependencyGraph"

const FULLSCREEN_GRAPH_MAX_DEPTH = 3

type DependencyExplorerFullscreenScreenProps =
  AppStackScreenProps<"DependencyExplorerFullscreen"> & {
    repository?: CourseRepository
  }

export function DependencyExplorerFullscreenScreen({
  navigation,
  repository = courseRepository,
  route,
}: DependencyExplorerFullscreenScreenProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const { courseCode, termCode } = route.params
  const semester = repository.getSemester(termCode)
  const termName = semester?.termName ?? termCode
  const { graph, isLoading, loadError, retry } = useDependencyGraph({
    courseCode,
    maxDepth: FULLSCREEN_GRAPH_MAX_DEPTH,
    repository,
    termCode,
  })

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom", "left", "right"]}
      contentContainerStyle={themed($screenContent)}
      ScrollViewProps={{ contentInsetAdjustmentBehavior: "automatic" }}
    >
      <View style={$topBar}>
        <View style={themed($headingRow)}>
          <Text text="DEPENDENCY VISUALIZER" size="xs" weight="semiBold" style={themed($eyebrow)} />
          <Text text={courseCode} preset="subheading" />
          <Text text={termName} size="xs" style={themed($secondaryText)} />
        </View>
        <Pressable
          accessibilityLabel="Close fullscreen dependency graph"
          accessibilityRole="button"
          onPress={navigation.goBack}
          style={({ pressed }) => [themed($closeButton), pressed && $pressed]}
          testID="dependency-fullscreen-close"
        >
          <Text text="Close" size="xs" weight="semiBold" />
          <Text text="×" size="lg" accessibilityElementsHidden importantForAccessibility="no" />
        </Pressable>
      </View>

      {!!loadError ? (
        <View style={themed($centerState)}>
          <Text text="Could not load dependencies" preset="subheading" style={$centerText} />
          <Text text={loadError} size="sm" style={[themed($secondaryText), $centerText]} />
          <Button text="Try again" onPress={retry} style={$stateButton} />
        </View>
      ) : isLoading || !graph ? (
        <View accessibilityLabel="Loading fullscreen dependencies" style={themed($centerState)}>
          <ActivityIndicator color={colors.tint} size="large" />
          <Text text="Loading detailed graph…" size="sm" style={themed($secondaryText)} />
        </View>
      ) : !graph.currentCourseAvailable ? (
        <View style={themed($centerState)}>
          <Text text={`${courseCode} is unavailable`} preset="subheading" style={$centerText} />
          <Text
            text={`This course is not offered in ${termName}. Close fullscreen and choose another semester.`}
            size="sm"
            style={[themed($secondaryText), $centerText]}
          />
        </View>
      ) : (
        <>
          {!!graph.originalText && (
            <View style={themed($sourceCard)} testID="fullscreen-original-text-card">
              <Text text="Original Text" size="xs" weight="semiBold" />
              <Text text={graph.originalText} size="xs" selectable style={$sourceText} />
            </View>
          )}

          <ScrollView
            horizontal
            contentContainerStyle={$graphScrollContent}
            showsHorizontalScrollIndicator
            testID="fullscreen-graph-scroll"
          >
            <View style={$graphWidth}>
              <DependencyGraphView
                graph={graph}
                onOpenCourse={(prerequisiteCode) =>
                  navigation.navigate("CourseDetails", {
                    courseCode: prerequisiteCode,
                    termCode,
                  })
                }
                termName={termName}
                variant="detailed"
              />
            </View>
          </ScrollView>
        </>
      )}
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  gap: spacing.sm,
  paddingBottom: spacing.lg,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
})

const $topBar: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
}

const $headingRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "baseline",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
})

const $eyebrow: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 1.1,
})

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $closeButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderColor: colors.border,
  borderRadius: 18,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.xs,
  justifyContent: "center",
  minHeight: 44,
  paddingHorizontal: spacing.md,
})

const $sourceCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $sourceText: TextStyle = {
  flex: 1,
  minWidth: 0,
}

const $graphScrollContent: ViewStyle = {
  flexGrow: 1,
}

const $graphWidth: ViewStyle = {
  flex: 1,
  minWidth: 720,
}

const $centerState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.sm,
  justifyContent: "center",
  minHeight: 220,
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
