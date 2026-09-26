import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, Pressable, TextStyle, View, ViewStyle } from "react-native"
import Svg, { Path } from "react-native-svg"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type {
  DependencyGroupOperator,
  ResolvedCourseDependency,
  ResolvedDependencyGraph,
  ResolvedDependencyItem,
} from "../domain/dependencyGraph"
import { buildOrthogonalConnectorPath, type ConnectorPoint } from "../utils/dependencyConnectorPath"

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
  item: ResolvedDependencyItem
  onOpenCourse: (courseCode: string) => void
  path: string
  termName: string
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

interface DetailedTreeItemProps extends DetailedItemProps {
  onTargetLayout: (path: string) => void
  setTargetRef: (path: string, node: View | null) => void
}

function DetailedPrerequisiteTreeItem({
  item,
  onOpenCourse,
  onTargetLayout,
  path,
  setTargetRef,
  termName,
}: DetailedTreeItemProps) {
  const { themed } = useAppTheme()

  if (item.kind === "group") {
    const extracted = item.operator === "extracted"

    return (
      <View
        accessibilityLabel={`${groupLabel(item.operator)} prerequisite group`}
        style={themed($logicTreeGroup)}
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
                <DetailedPrerequisiteTreeItem
                  item={child}
                  onOpenCourse={onOpenCourse}
                  onTargetLayout={onTargetLayout}
                  path={`${path}-${index}`}
                  setTargetRef={setTargetRef}
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
    <View
      collapsable={false}
      onLayout={() => onTargetLayout(path)}
      ref={(node) => setTargetRef(path, node)}
      style={$logicTreeCourse}
      testID={`prerequisite-column-${item.courseCode}`}
    >
      <CourseNode item={item} onOpenCourse={onOpenCourse} termName={termName} variant="detailed" />
    </View>
  )
}

interface DetailedCourseEntry {
  item: ResolvedCourseDependency
  path: string
}

function collectDetailedCourseEntries(
  item: ResolvedDependencyItem,
  path = "root",
): DetailedCourseEntry[] {
  if (item.kind === "course") return [{ item, path }]
  return item.children.flatMap((child, index) =>
    collectDetailedCourseEntries(child, `${path}-${index}`),
  )
}

interface ConnectorAnchors {
  source?: ConnectorPoint
  target?: ConnectorPoint
}

interface DetailedPrerequisiteGraphProps {
  item: ResolvedDependencyItem
  onOpenCourse: (courseCode: string) => void
  termName: string
}

function DetailedPrerequisiteGraph({
  item,
  onOpenCourse,
  termName,
}: DetailedPrerequisiteGraphProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const entries = useMemo(() => collectDetailedCourseEntries(item), [item])
  const canvasRef = useRef<View>(null)
  const sourceRefs = useRef(new Map<string, View>())
  const targetRefs = useRef(new Map<string, View>())
  const [canvasSize, setCanvasSize] = useState({ height: 0, width: 0 })
  const [anchors, setAnchors] = useState<Record<string, ConnectorAnchors>>({})

  const setAnchor = useCallback(
    (path: string, kind: keyof ConnectorAnchors, point: ConnectorPoint) => {
      setAnchors((previous) => {
        const current = previous[path]?.[kind]
        if (current && Math.abs(current.x - point.x) < 0.5 && Math.abs(current.y - point.y) < 0.5) {
          return previous
        }

        return {
          ...previous,
          [path]: { ...previous[path], [kind]: point },
        }
      })
    },
    [],
  )

  const measureAnchor = useCallback(
    (path: string, kind: keyof ConnectorAnchors) => {
      const canvas = canvasRef.current
      const node = kind === "source" ? sourceRefs.current.get(path) : targetRefs.current.get(path)
      if (!canvas || !node) return

      canvas.measureInWindow((canvasX, canvasY) => {
        node.measureInWindow((x, y, width, height) => {
          setAnchor(
            path,
            kind,
            kind === "source"
              ? { x: x - canvasX + width, y: y - canvasY + height / 2 }
              : { x: x - canvasX, y: y - canvasY + height / 2 },
          )
        })
      })
    },
    [setAnchor],
  )

  const measureAllAnchors = useCallback(() => {
    entries.forEach(({ item: course, path }) => {
      measureAnchor(path, "target")
      if (course.prerequisites) measureAnchor(path, "source")
    })
  }, [entries, measureAnchor])

  const handleCanvasLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setCanvasSize({ height: layout.height, width: layout.width })
      requestAnimationFrame(measureAllAnchors)
    },
    [measureAllAnchors],
  )

  useEffect(() => {
    setAnchors({})
    requestAnimationFrame(measureAllAnchors)
  }, [measureAllAnchors])

  const setSourceRef = useCallback((path: string, node: View | null) => {
    if (node) sourceRefs.current.set(path, node)
    else sourceRefs.current.delete(path)
  }, [])

  const setTargetRef = useCallback((path: string, node: View | null) => {
    if (node) targetRefs.current.set(path, node)
    else targetRefs.current.delete(path)
  }, [])

  return (
    <View
      collapsable={false}
      onLayout={handleCanvasLayout}
      ref={canvasRef}
      style={$detailedGraphCanvas}
      testID="detailed-prerequisite-canvas"
    >
      <View style={$independentPrerequisiteColumns}>
        <View style={themed($independentPrePrerequisiteColumn)} testID="pre-prerequisite-column">
          {entries.map(({ item: course, path }) =>
            course.prerequisites ? (
              <View
                collapsable={false}
                key={path}
                onLayout={() => measureAnchor(path, "source")}
                ref={(node) => setSourceRef(path, node)}
                testID={`pre-prerequisite-block-${path}`}
              >
                <DetailedPrePrerequisiteItem
                  item={course.prerequisites}
                  onOpenCourse={onOpenCourse}
                  path={`${path}-pre`}
                  termName={termName}
                />
              </View>
            ) : null,
          )}
        </View>
        <View style={$independentConnectorGutter} />
        <View style={$independentPrerequisiteTreeColumn} testID="detailed-prerequisite-tree">
          <DetailedPrerequisiteTreeItem
            item={item}
            onOpenCourse={onOpenCourse}
            onTargetLayout={(path) => measureAnchor(path, "target")}
            path="root"
            setTargetRef={setTargetRef}
            termName={termName}
          />
        </View>
      </View>

      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <Svg
          accessibilityElementsHidden
          height={canvasSize.height}
          importantForAccessibility="no"
          pointerEvents="none"
          style={$connectorOverlay}
          testID="dependency-connector-overlay"
          width={canvasSize.width}
        >
          {entries.map(({ item: course, path }) => {
            const source = anchors[path]?.source
            const target = anchors[path]?.target
            if (!course.prerequisites || !source || !target || target.x <= source.x) return null

            const arrowTip = { x: target.x - 2, y: target.y }
            const arrowSize = 7

            return (
              <Fragment key={path}>
                <Path
                  d={buildOrthogonalConnectorPath(source, arrowTip, { arrowSize })}
                  fill="none"
                  stroke={colors.tint}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  testID={`dependency-connector-${path}`}
                />
                <Path
                  d={`M ${arrowTip.x - arrowSize} ${arrowTip.y - 6} L ${arrowTip.x} ${arrowTip.y} L ${arrowTip.x - arrowSize} ${arrowTip.y + 6}`}
                  fill="none"
                  stroke={colors.tint}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                />
              </Fragment>
            )
          })}
        </Svg>
      )}
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
              <DetailedPrerequisiteGraph
                item={graph.prerequisites}
                onOpenCourse={onOpenCourse}
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

const $logicTreeGroup: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.border,
  borderRadius: 16,
  borderWidth: 1,
  gap: 4,
  padding: spacing.xs,
})

const $logicTreeCourse: ViewStyle = {
  minWidth: 0,
}

const $courseBranch: ViewStyle = {
  gap: 6,
}

const $detailedGraphCanvas: ViewStyle = {
  minWidth: 0,
  position: "relative",
}

const $independentPrerequisiteColumns: ViewStyle = {
  flexDirection: "row",
}

const $independentPrePrerequisiteColumn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.sm,
  minWidth: 0,
})

const $independentConnectorGutter: ViewStyle = {
  width: 40,
}

const $independentPrerequisiteTreeColumn: ViewStyle = {
  flex: 1,
  minWidth: 0,
}

const $connectorOverlay: ViewStyle = {
  left: 0,
  position: "absolute",
  top: 0,
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
