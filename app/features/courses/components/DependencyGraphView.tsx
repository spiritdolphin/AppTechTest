import { Fragment, ReactNode } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

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
  variant?: "compact" | "detailed"
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

interface ArrowConnectorProps {
  compact?: boolean
  testID?: string
}

function ArrowConnector({ compact = false, testID = "dependency-arrow" }: ArrowConnectorProps) {
  const { themed } = useAppTheme()

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={compact ? $compactArrowContainer : $arrowContainer}
      testID={testID}
    >
      <Text
        text={compact ? "›" : "→"}
        size={compact ? "md" : "xl"}
        weight="bold"
        style={themed($arrowGlyph)}
      />
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
  variant: "compact" | "detailed"
}

interface CourseNodeProps {
  item: ResolvedCourseDependency
  onOpenCourse: (courseCode: string) => void
  termName: string
  variant: "compact" | "detailed"
}

function CourseNode({ item, onOpenCourse, termName, variant }: CourseNodeProps) {
  const { themed } = useAppTheme()
  const marker = markerLabel(item.marker)
  const compactTerm = compactTermName(termName)
  const moreStatus =
    item.marker === "more" ? `More prerequisites exist before ${item.courseCode}` : undefined
  const accessibilityStatus = [
    !item.available ? `Not offered in ${termName}` : undefined,
    marker,
    moreStatus,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Pressable
      accessibilityLabel={`${item.courseCode}${accessibilityStatus ? `, ${accessibilityStatus}` : ""}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !item.available }}
      disabled={!item.available}
      onPress={() => onOpenCourse(item.courseCode)}
      style={({ pressed }) => [
        themed($courseNode),
        variant === "detailed" && themed($detailedCourseNode),
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
      {variant === "detailed" && !!item.title && (
        <Text
          text={item.title}
          size="xxs"
          numberOfLines={2}
          style={themed($courseTitle)}
          testID={`dependency-title-${item.courseCode}`}
        />
      )}
      {!item.available && (
        <Text text={`Not Offered: ${compactTerm}`} size="xxs" style={themed($unavailableText)} />
      )}
      {!!marker && <NodeBadge>{marker}</NodeBadge>}
    </Pressable>
  )
}

function DependencyItem({ item, onOpenCourse, path, termName, variant }: DependencyItemProps) {
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
                  variant={variant}
                />
              </Fragment>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={$courseBranch}>
      <CourseNode item={item} onOpenCourse={onOpenCourse} termName={termName} variant={variant} />

      {!!item.prerequisites && (
        <View style={themed($nestedRequirements)}>
          <Text text="REQUIRES" size="xxs" weight="bold" style={themed($nestedLabel)} />
          <DependencyItem
            item={item.prerequisites}
            onOpenCourse={onOpenCourse}
            path={`${path}-requires`}
            termName={termName}
            variant={variant}
          />
        </View>
      )}
    </View>
  )
}

interface DetailedItemProps {
  groupDepth?: number
  item: ResolvedDependencyItem
  onOpenCourse: (courseCode: string) => void
  path: string
  termName: string
}

function DetailedPrerequisiteCell({
  children,
  insetDepth = 0,
  testID,
}: {
  children: ReactNode
  insetDepth?: number
  testID?: string
}) {
  return (
    <View style={$layeredPrerequisiteRow} testID={testID}>
      <View style={$layeredColumn} />
      <View style={$layeredCellSpacer} />
      <View style={[$layeredColumn, rightColumnInset(insetDepth)]}>{children}</View>
    </View>
  )
}

const LOGIC_GROUP_INSET = 8
const LAYERED_CONNECTOR_WIDTH = 40

function rightColumnInset(depth: number): ViewStyle | undefined {
  return depth > 0 ? { paddingHorizontal: depth * LOGIC_GROUP_INSET } : undefined
}

function logicFramePosition(depth: number): ViewStyle {
  const inset = depth * LOGIC_GROUP_INSET

  return {
    bottom: 0,
    left: "50%",
    marginLeft: LAYERED_CONNECTOR_WIDTH / 2 + inset,
    position: "absolute",
    right: inset,
    top: 0,
  }
}

function DetailedPrePrerequisiteItem({ item, onOpenCourse, path, termName }: DetailedItemProps) {
  const { themed } = useAppTheme()

  if (item.kind === "group") {
    const extracted = item.operator === "extracted"

    return (
      <View
        accessibilityLabel={`${groupLabel(item.operator)} pre-prerequisite group`}
        style={themed($groupCard)}
        testID={`pre-prerequisite-group-${path}`}
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
                    testID={`pre-prerequisite-operator-${path}-${index}`}
                  />
                )}
                <DetailedPrePrerequisiteItem
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

  return (
    <View style={$prePrerequisiteNodeRow}>
      {item.marker === "more" && (
        <View style={$moreIndicatorRow} testID={`dependency-more-${item.courseCode}`}>
          <View style={themed($morePill)}>
            <Text
              adjustsFontSizeToFit
              accessibilityElementsHidden
              importantForAccessibility="no"
              numberOfLines={1}
              text="MORE"
              size="xxs"
              weight="bold"
              style={themed($moreLabel)}
              testID={`dependency-more-label-${item.courseCode}`}
            />
          </View>
          <ArrowConnector compact testID={`dependency-more-arrow-${item.courseCode}`} />
        </View>
      )}
      <View style={$layeredCourseNode}>
        <CourseNode
          item={item}
          onOpenCourse={onOpenCourse}
          termName={termName}
          variant="detailed"
        />
      </View>
    </View>
  )
}

function DetailedPrerequisiteItem({
  groupDepth = 0,
  item,
  onOpenCourse,
  path,
  termName,
}: DetailedItemProps) {
  const { themed } = useAppTheme()

  if (item.kind === "group") {
    const extracted = item.operator === "extracted"
    const contentDepth = groupDepth + 1

    return (
      <View
        accessibilityLabel={`${groupLabel(item.operator)} prerequisite group`}
        style={$detailedPrerequisiteGroup}
        testID={`dependency-group-${path}`}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          pointerEvents="none"
          style={[themed($logicGroupFrame), logicFramePosition(groupDepth)]}
          testID={`dependency-logic-frame-${path}`}
        />
        {extracted && (
          <DetailedPrerequisiteCell insetDepth={contentDepth}>
            <Text
              text={groupLabel(item.operator)}
              size="xxs"
              weight="bold"
              style={themed($groupLabel)}
            />
          </DetailedPrerequisiteCell>
        )}
        {item.children.length === 0 ? (
          <DetailedPrerequisiteCell insetDepth={contentDepth}>
            <Text
              text="No course codes could be extracted"
              size="xs"
              style={themed($secondaryText)}
            />
          </DetailedPrerequisiteCell>
        ) : (
          <View style={$groupChildren}>
            {item.children.map((child, index) => (
              <Fragment key={`${path}-${index}`}>
                {index > 0 && !extracted && (
                  <DetailedPrerequisiteCell
                    insetDepth={contentDepth}
                    testID={`dependency-operator-row-${path}-${index}`}
                  >
                    <Text
                      text={groupLabel(item.operator)}
                      size="xxs"
                      weight="bold"
                      style={themed($groupLabel)}
                      testID={`dependency-operator-${path}-${index}`}
                    />
                  </DetailedPrerequisiteCell>
                )}
                <DetailedPrerequisiteItem
                  groupDepth={contentDepth}
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

  return (
    <View style={$layeredPrerequisiteRow} testID={`dependency-layer-${item.courseCode}`}>
      <View style={$layeredColumn} testID={`pre-prerequisite-column-${item.courseCode}`}>
        {!!item.prerequisites && (
          <DetailedPrePrerequisiteItem
            item={item.prerequisites}
            onOpenCourse={onOpenCourse}
            path={`${path}-pre`}
            termName={termName}
          />
        )}
      </View>
      <View style={$layeredConnectorSlot}>{!!item.prerequisites && <ArrowConnector />}</View>
      <View
        style={[$layeredColumn, rightColumnInset(groupDepth)]}
        testID={`prerequisite-column-${item.courseCode}`}
      >
        <CourseNode
          item={item}
          onOpenCourse={onOpenCourse}
          termName={termName}
          variant="detailed"
        />
      </View>
    </View>
  )
}

function EmptyPrerequisites() {
  const { themed } = useAppTheme()

  return (
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
  )
}

export function DependencyGraphView({
  graph,
  onOpenCourse,
  termName,
  variant = "compact",
}: DependencyGraphViewProps) {
  const { themed } = useAppTheme()
  const detailed = variant === "detailed"

  return (
    <View style={themed($graphSurface)} testID="dependency-graph">
      <View style={$columnLabels}>
        <View
          style={detailed ? $detailedPrerequisiteLabelSlot : $columnLabelSlot}
          testID="prerequisite-column-label"
        >
          <Text text="PREREQUISITES" size="xxs" weight="bold" style={themed($columnLabel)} />
        </View>
        <View style={$columnLabelSpacer} testID="dependency-column-label-spacer" />
        <View style={$columnLabelSlot} testID="current-course-column-label">
          <Text text="CURRENT COURSE" size="xxs" weight="bold" style={themed($columnLabel)} />
        </View>
      </View>
      <View style={$columns}>
        <View style={detailed ? $detailedPrerequisiteColumns : $prerequisiteColumn}>
          {graph.mode === "none" ? (
            <EmptyPrerequisites />
          ) : graph.prerequisites ? (
            detailed ? (
              <DetailedPrerequisiteItem
                item={graph.prerequisites}
                onOpenCourse={onOpenCourse}
                path="root"
                termName={termName}
              />
            ) : (
              <DependencyItem
                item={graph.prerequisites}
                onOpenCourse={onOpenCourse}
                path="root"
                termName={termName}
                variant={variant}
              />
            )
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
          testID="dependency-current-course-node"
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

const $detailedPrerequisiteLabelSlot: ViewStyle = {
  alignItems: "center",
  flex: 2,
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

const $detailedPrerequisiteColumns: ViewStyle = {
  flex: 2,
  minWidth: 0,
}

const $arrowContainer: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  minHeight: 76,
  width: 40,
}

const $compactArrowContainer: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  width: 14,
}

const $arrowGlyph: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  textAlign: "center",
})

const $currentNode: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.neutral200,
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

const $detailedPrerequisiteGroup: ViewStyle = {
  gap: 4,
  paddingVertical: 8,
}

const $logicGroupFrame: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.border,
  borderRadius: 16,
  borderWidth: 1,
})

const $courseBranch: ViewStyle = {
  gap: 6,
}

const $layeredPrerequisiteRow: ViewStyle = {
  alignItems: "flex-start",
  flexDirection: "row",
}

const $layeredColumn: ViewStyle = {
  flex: 1,
  minWidth: 0,
}

const $layeredConnectorSlot: ViewStyle = {
  minHeight: 76,
  width: LAYERED_CONNECTOR_WIDTH,
}

const $layeredCellSpacer: ViewStyle = {
  width: LAYERED_CONNECTOR_WIDTH,
}

const $prePrerequisiteNodeRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
}

const $layeredCourseNode: ViewStyle = {
  flex: 1,
  minWidth: 0,
}

const $moreIndicatorRow: ViewStyle = {
  alignItems: "center",
  flexDirection: "row",
}

const $morePill: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  backgroundColor: colors.palette.accent100,
  borderColor: colors.border,
  borderRadius: 10,
  borderWidth: 1,
  height: 64,
  justifyContent: "center",
  width: 24,
})

const $moreLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  letterSpacing: 0.5,
  textAlign: "center",
  transform: [{ rotate: "90deg" }],
  width: 48,
})

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

const $detailedCourseNode: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 76,
  minWidth: 144,
  paddingHorizontal: spacing.sm,
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

const $courseTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
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
