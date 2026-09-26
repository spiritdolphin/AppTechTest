import { ActivityIndicator, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
    theme: { colors, spacing },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { courseCode, termCode } = route.params
  const semester = repository.getSemester(termCode)
  const termName = semester?.termName ?? termCode
  const { graph, isLoading, loadError, retry } = useDependencyGraph({
    courseCode,
    maxDepth: FULLSCREEN_GRAPH_MAX_DEPTH,
    repository,
    termCode,
  })
  const horizontalInset = Math.max(insets.left, insets.right, spacing.xxl) + spacing.xs

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={[]}
      contentContainerStyle={[
        themed($screenContent),
        {
          paddingBottom: Math.max(insets.bottom, spacing.xs),
          paddingHorizontal: horizontalInset,
        },
      ]}
    >
      <View style={themed($fixedContent)} testID="fullscreen-fixed-content">
        <View style={$topBar} testID="fullscreen-fixed-header">
          <View style={themed($headingRow)}>
            <Text
              text="DEPENDENCY VISUALIZER"
              size="xs"
              weight="semiBold"
              style={themed($eyebrow)}
            />
            <Text text={courseCode} preset="subheading" />
            <Text text={termName} size="xs" style={themed($secondaryText)} />
          </View>
          <Pressable
            accessibilityLabel="Close fullscreen dependency graph"
            accessibilityRole="button"
            hitSlop={spacing.xxs}
            onPress={navigation.goBack}
            style={({ pressed }) => [themed($closeButton), pressed && $pressed]}
            testID="dependency-fullscreen-close"
          >
            <Text text="Close" size="xxs" weight="semiBold" />
            <Text text="×" size="sm" accessibilityElementsHidden importantForAccessibility="no" />
          </Pressable>
        </View>

        {!loadError && !isLoading && graph?.currentCourseAvailable && !!graph.originalText && (
          <View style={themed($sourceCard)} testID="fullscreen-original-text-card">
            <Text text="Original Text" size="xs" weight="semiBold" />
            <ScrollView
              contentContainerStyle={$sourceTextContent}
              contentInsetAdjustmentBehavior="never"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={$sourceTextScroll}
              testID="fullscreen-original-text-scroll"
            >
              <Text text={graph.originalText} size="xs" selectable style={$sourceText} />
            </ScrollView>
          </View>
        )}
      </View>

      <View style={$contentRegion} testID="fullscreen-content-region">
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
          <View style={$graphViewport} testID="fullscreen-graph-viewport">
            <ScrollView
              contentContainerStyle={$graphVerticalScrollContent}
              contentInsetAdjustmentBehavior="never"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={$graphVerticalScroll}
              testID="fullscreen-graph-vertical-scroll"
            >
              <ScrollView
                horizontal
                contentContainerStyle={$graphScrollContent}
                contentInsetAdjustmentBehavior="never"
                nestedScrollEnabled
                showsHorizontalScrollIndicator
                testID="fullscreen-graph-scroll"
              >
                <View style={$graphWidth} testID="fullscreen-graph-width">
                  <DependencyGraphView
                    graph={graph}
                    onOpenCourse={(prerequisiteCode) =>
                      navigation.replace("CourseDetails", {
                        courseCode: prerequisiteCode,
                        parentCourseCode: courseCode,
                        termCode,
                      })
                    }
                    termName={termName}
                    variant="detailed"
                  />
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        )}
      </View>
    </Screen>
  )
}

const $screenContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  flex: 1,
  gap: spacing.xs,
  justifyContent: "flex-start",
  paddingTop: spacing.xxs,
})

const $topBar: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
}

const $fixedContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $headingRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "baseline",
  flex: 1,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  minWidth: 0,
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
  borderRadius: 14,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.xxs,
  justifyContent: "center",
  minHeight: 40,
  paddingHorizontal: spacing.sm,
})

const $sourceCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "flex-start",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  flexDirection: "row",
  gap: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
})

const $sourceText: TextStyle = {
  minWidth: 0,
}

const $sourceTextScroll: ViewStyle = {
  flex: 1,
  maxHeight: 48,
  minHeight: 20,
  minWidth: 0,
}

const $sourceTextContent: ViewStyle = {
  flexGrow: 1,
  justifyContent: "center",
}

const $contentRegion: ViewStyle = {
  flex: 1,
  minHeight: 0,
}

const $graphViewport: ViewStyle = {
  flex: 1,
  minHeight: 0,
}

const $graphVerticalScroll: ViewStyle = {
  flex: 1,
}

const $graphVerticalScrollContent: ViewStyle = {
  flexGrow: 1,
}

const $graphScrollContent: ViewStyle = {
  flexGrow: 1,
}

const $graphWidth: ViewStyle = {
  flex: 1,
  minWidth: 640,
}

const $centerState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flex: 1,
  gap: spacing.sm,
  justifyContent: "center",
  minHeight: 0,
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
