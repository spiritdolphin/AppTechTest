import { Fragment, ReactNode } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import Svg, { Path, Polygon } from "react-native-svg"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type {
  DependencyGroupOperator,
  ResolvedCourseDependency,
  ResolvedDependencyGraph,
  ResolvedDependencyItem,
} from "../domain/dependencyGraph"

interface DependencyGraphViewProps {
  graph: ResolvedDependencyGraph
  onOpenCourse: (courseCode: string) => void
  termName: string
}

function groupLabel(operator: DependencyGroupOperator): string {
  if (operator === "and") return "AND"
  if (operator === "or") return "OR"
  return "Extracted courses"
}

function markerLabel(marker: ResolvedCourseDependency["marker"]): string | undefined {
  if (marker === "cycle") return "Cycle"
  if (marker === "repeated") return "Repeated"
  return undefined
}

function compactTermName(termName: string): string {
  return termName.replace(/^20(?=\d{2}-\d{2}\b)/, "")
}

function ArrowConnector() {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={$arrowContainer}>
      <Svg height={52} width={40}>
        <Path d="M2 26 H31" fill="none" stroke={colors.tint} strokeWidth={3} />
        <Polygon fill={colors.tint} points="29,18 39,26 29,34" />
      </Svg>
    </View>
  )
}

function NodeBadge({ children }: { children: ReactNode }) {
  const { themed } = useAppTheme()
  return (
    <View style={themed($nodeBadge)}>
      <Text size="xxs" weight="semiBold">
        {children}
      </Text>
    </View>
  )
}

interface DependencyItemProps {
  item: ResolvedDependencyItem
  onOpenCourse: (courseCode: string) => void
  path: string
  termName: string
}

function DependencyItem({ item, onOpenCourse, path, termName }: DependencyItemProps) {
  const { themed } = useAppTheme()

  if (item.kind === "group") {
    const extracted = item.operator === "extracted"

    return (
      <View
        accessibilityLabel={`${groupLabel(item.operator)} prerequisite group`}
        style={themed($groupCard)}
        testID={`dependency-group-${path}`}
      >
        {extracted && (
          <Text
            text={groupLabel(item.operator)}
            size="xxs"
            weight="bold"
            style={themed($groupLabel)}
          />
        )}
        {item.children.length === 0 ? (
          <Text
            text="No course codes could be extracted"
            size="xs"
            style={themed($secondaryText)}
          />
        ) : (
          <View style={$groupChildren}>
            {item.children.map((child, index) => (
              <Fragment key={`${path}-${index}`}>
                {index > 0 && !extracted && (
                  <Text
                    text={groupLabel(item.operator)}
                    size="xxs"
                    weight="bold"
                    style={themed($groupLabel)}
                    testID={`dependency-operator-${path}-${index}`}
                  />
                )}
                <DependencyItem
                  item={child}
                  onOpenCourse={onOpenCourse}
                  path={`${path}-${index}`}
                  termName={termName}
                />
              </Fragment>
            ))}
          </View>
        )}
      </View>
    )
  }

  const marker = markerLabel(item.marker)
  const compactTerm = compactTermName(termName)
  const accessibilityStatus = [!item.available ? `Not offered in ${termName}` : undefined, marker]
    .filter(Boolean)
    .join(", ")

  return (
    <View style={$courseBranch}>
      <Pressable
        accessibilityLabel={`${item.courseCode}${accessibilityStatus ? `, ${accessibilityStatus}` : ""}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !item.available }}
        disabled={!item.available}
        onPress={() => onOpenCourse(item.courseCode)}
        style={({ pressed }) => [
          themed($courseNode),
          !item.available && themed($unavailableNode),
          pressed && $pressed,
        ]}
        testID={`dependency-node-${item.courseCode}`}
      >
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          numberOfLines={1}
          text={item.courseCode}
          size="sm"
          weight="bold"
          style={themed($courseCode)}
        />
        {!item.available && (
          <Text text={`Not Offered: ${compactTerm}`} size="xxs" style={themed($unavailableText)} />
        )}
        {!!marker && <NodeBadge>{marker}</NodeBadge>}
      </Pressable>

      {!!item.prerequisites && (
        <View style={themed($nestedRequirements)}>
          <Text text="REQUIRES" size="xxs" weight="bold" style={themed($nestedLabel)} />
          <DependencyItem
            item={item.prerequisites}
            onOpenCourse={onOpenCourse}
            path={`${path}-requires`}
            termName={termName}
          />
        </View>
      )}
    </View>
  )
}

export function DependencyGraphView({ graph, onOpenCourse, termName }: DependencyGraphViewProps) {
  const { themed } = useAppTheme()

  return (
    <View style={themed($graphSurface)} testID="dependency-graph">
      <View style={$columnLabels}>
        <View style={$columnLabelSlot} testID="prerequisite-column-label">
          <Text text="PREREQUISITES" size="xxs" weight="bold" style={themed($columnLabel)} />
        </View>
        <View style={$columnLabelSpacer} testID="dependency-column-label-spacer" />
        <View style={$columnLabelSlot} testID="current-course-column-label">
          <Text text="CURRENT COURSE" size="xxs" weight="bold" style={themed($columnLabel)} />
        </View>
      </View>
      <View style={$columns}>
        <View style={$prerequisiteColumn}>
          {graph.mode === "none" ? (
            <View style={themed($emptyNode)}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                numberOfLines={1}
                text="No prerequisites"
                size="xs"
                weight="semiBold"
                style={$centerText}
                testID="dependency-empty-state-text"
              />
            </View>
          ) : graph.prerequisites ? (
            <DependencyItem
              item={graph.prerequisites}
              onOpenCourse={onOpenCourse}
              path="root"
              termName={termName}
            />
          ) : (
            <View style={themed($emptyNode)}>
              <Text text="No course codes could be extracted" size="xs" style={$centerText} />
            </View>
          )}
        </View>
        <ArrowConnector />
        <View
          accessible
          accessibilityLabel={`${graph.courseCode}, current course, ${graph.title ?? "title unavailable"}`}
          style={themed($currentNode)}
        >
          <Text text={graph.courseCode} weight="bold" style={themed($currentCode)} />
          {!!graph.title && (
            <Text text={graph.title} size="xs" numberOfLines={3} style={$centerText} />
          )}
        </View>
      </View>
    </View>
  )
}

const $graphSurface: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 24,
  borderWidth: 1,
  gap: spacing.sm,
  padding: spacing.md,
})

const $columnLabels: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
}

const $columnLabelSlot: ViewStyle = {
  alignItems: "center",
  flex: 1,
  minWidth: 0,
}

const $columnLabelSpacer: ViewStyle = {
  width: 40,
}

const $columnLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  letterSpacing: 0.8,
  textAlign: "center",
})

const $columns: ViewStyle = {
  alignItems: "flex-start",
  flexDirection: "row",
}

const $prerequisiteColumn: ViewStyle = {
  flex: 1,
  minWidth: 0,
}

const $arrowContainer: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  minHeight: 76,
  width: 40,
}

const $currentNode: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.secondary100,
  borderColor: colors.tint,
  borderRadius: 18,
  borderWidth: 2,
  flex: 1,
  gap: spacing.xxs,
  minHeight: 76,
  justifyContent: "center",
  minWidth: 0,
  padding: spacing.sm,
})

const $currentCode: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  textAlign: "center",
})

const $groupCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.border,
  borderRadius: 16,
  borderWidth: 1,
  padding: spacing.xs,
})

const $groupLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  letterSpacing: 0.8,
  marginVertical: spacing.xxs,
  textAlign: "center",
})

const $groupChildren: ViewStyle = {
  gap: 4,
}

const $courseBranch: ViewStyle = {
  gap: 6,
}

const $courseNode: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 14,
  borderWidth: 1,
  gap: 3,
  justifyContent: "center",
  minHeight: 56,
  padding: spacing.xs,
})

const $unavailableNode: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral200,
  borderStyle: "dashed",
  opacity: 0.66,
})

const $courseCode: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  textAlign: "center",
})

const $unavailableText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textAlign: "center",
})

const $nodeBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignSelf: "flex-start",
  backgroundColor: colors.palette.accent100,
  borderRadius: 10,
  marginTop: spacing.xxs,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
})

const $nestedRequirements: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderLeftColor: colors.border,
  borderLeftWidth: 2,
  gap: spacing.xxs,
  marginLeft: spacing.xs,
  paddingLeft: spacing.xs,
})

const $nestedLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  letterSpacing: 0.7,
})

const $emptyNode: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 14,
  justifyContent: "center",
  minHeight: 76,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.sm,
})

const $secondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $centerText: TextStyle = {
  textAlign: "center",
}

const $pressed: ViewStyle = {
  opacity: 0.72,
}
