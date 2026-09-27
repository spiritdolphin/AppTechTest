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
import {
  alignedNodeTop,
  buildOrthogonalConnectorPath,
  connectorGutterWidth,
  connectorLaneX,
  connectorTipBeforeBoundary,
  type ConnectorPoint,
} from "../utils/dependencyConnectorPath"

const CONNECTOR_ARROW_SIZE = 7
const DETAILED_CONNECTOR_WIDTH = 40

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

function compactCourseCode(courseCode: string): string {
  return courseCode.replace(/^(\S+)\s+(\S+)$/, "$1\n$2")
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

interface ConnectorPathsProps {
  bendX?: number
  color: string
  source: ConnectorPoint
  testID: string
  tip: ConnectorPoint
}

function ConnectorPaths({ bendX, color, source, testID, tip }: ConnectorPathsProps) {
  return (
    <Fragment>
      <Path
        d={buildOrthogonalConnectorPath(source, tip, {
          arrowSize: CONNECTOR_ARROW_SIZE,
          bendX,
        })}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        testID={`${testID}-path`}
      />
      <Path
        d={`M ${tip.x - CONNECTOR_ARROW_SIZE} ${tip.y - 6} L ${tip.x} ${tip.y} L ${tip.x - CONNECTOR_ARROW_SIZE} ${tip.y + 6}`}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        testID={`${testID}-head`}
      />
    </Fragment>
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
        numberOfLines={2}
        text={variant === "compact" ? compactCourseCode(item.courseCode) : item.courseCode}
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
              accessibilityElementsHidden
              importantForAccessibility="no"
              text={"M\nO\nR\nE"}
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
  firstCoursePath: string | undefined
  onFirstCourseLayout: () => void
  onTargetLayout: (path: string) => void
  setFirstCourseRef: (node: View | null) => void
  setTargetRef: (path: string, node: View | null) => void
}

function DetailedPrerequisiteTreeItem({
  firstCoursePath,
  item,
  onFirstCourseLayout,
  onOpenCourse,
  onTargetLayout,
  path,
  setFirstCourseRef,
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
                  firstCoursePath={firstCoursePath}
                  item={child}
                  onFirstCourseLayout={onFirstCourseLayout}
                  onOpenCourse={onOpenCourse}
                  onTargetLayout={onTargetLayout}
                  path={`${path}-${index}`}
                  setFirstCourseRef={setFirstCourseRef}
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
      onLayout={() => {
        onTargetLayout(path)
        if (path === firstCoursePath) onFirstCourseLayout()
      }}
      ref={(node) => {
        setTargetRef(path, node)
        if (path === firstCoursePath) setFirstCourseRef(node)
      }}
      style={path === "root" ? [themed($logicTreeGroup), $logicTreeCourse] : $logicTreeCourse}
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
  columnWidth: number
  connectorWidth: number
  item: ResolvedDependencyItem
  onFirstCourseLayout: () => void
  onOpenCourse: (courseCode: string) => void
  setFirstCourseRef: (node: View | null) => void
  showPrePrerequisites: boolean
  termName: string
}

function DetailedPrerequisiteGraph({
  columnWidth,
  connectorWidth,
  item,
  onFirstCourseLayout,
  onOpenCourse,
  setFirstCourseRef,
  showPrePrerequisites,
  termName,
}: DetailedPrerequisiteGraphProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const entries = useMemo(() => collectDetailedCourseEntries(item), [item])
  const connectorEntries = useMemo(
    () => entries.filter(({ item: course }) => !!course.prerequisites),
    [entries],
  )
  const canvasRef = useRef<View>(null)
  const sourceRefs = useRef(new Map<string, View>())
  const targetRefs = useRef(new Map<string, View>())
  const targetBoundaryRef = useRef<View>(null)
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
          const centerY = y - canvasY + height / 2
          if (kind === "source") {
            setAnchor(path, kind, { x: x - canvasX + width, y: centerY })
          } else {
            targetBoundaryRef.current?.measureInWindow((boundaryX) => {
              setAnchor(path, kind, { x: boundaryX - canvasX, y: centerY })
            })
          }
        })
      })
    },
    [setAnchor],
  )

  const measureAllAnchors = useCallback(() => {
    entries.forEach(({ path }) => {
      measureAnchor(path, "target")
    })
    connectorEntries.forEach(({ path }) => measureAnchor(path, "source"))
  }, [connectorEntries, entries, measureAnchor])

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
        {showPrePrerequisites && (
          <Fragment>
            <View
              style={[themed($independentPrePrerequisiteColumn), { width: columnWidth }]}
              testID="pre-prerequisite-column"
            >
              {connectorEntries.map(({ item: course, path }) =>
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
            <View style={{ width: connectorWidth }} testID="pre-prerequisite-connector-gutter" />
          </Fragment>
        )}
        <View
          collapsable={false}
          onLayout={() => requestAnimationFrame(measureAllAnchors)}
          ref={targetBoundaryRef}
          style={[$independentPrerequisiteTreeColumn, { width: columnWidth }]}
          testID="detailed-prerequisite-tree"
        >
          <DetailedPrerequisiteTreeItem
            firstCoursePath={entries[0]?.path}
            item={item}
            onFirstCourseLayout={onFirstCourseLayout}
            onOpenCourse={onOpenCourse}
            onTargetLayout={(path) => measureAnchor(path, "target")}
            path="root"
            setFirstCourseRef={setFirstCourseRef}
            setTargetRef={setTargetRef}
            termName={termName}
          />
        </View>
      </View>

      {showPrePrerequisites && canvasSize.width > 0 && canvasSize.height > 0 && (
        <Svg
          accessibilityElementsHidden
          height={canvasSize.height}
          importantForAccessibility="no"
          pointerEvents="none"
          style={$connectorOverlay}
          testID="dependency-connector-overlay"
          width={canvasSize.width}
        >
          {connectorEntries.map(({ item: course, path }, laneIndex) => {
            const source = anchors[path]?.source
            const target = anchors[path]?.target
            if (!course.prerequisites || !source || !target || target.x <= source.x) return null

            const arrowTip = connectorTipBeforeBoundary(target.x, target.y)

            return (
              <ConnectorPaths
                bendX={connectorLaneX(source.x, laneIndex)}
                color={colors.tint}
                key={path}
                source={source}
                testID={`dependency-connector-${path}`}
                tip={arrowTip}
              />
            )
          })}
        </Svg>
      )}
    </View>
  )
}

interface DetailedGraphColumnsProps {
  graph: ResolvedDependencyGraph
  onOpenCourse: (courseCode: string) => void
  termName: string
}

function DetailedGraphColumns({ graph, onOpenCourse, termName }: DetailedGraphColumnsProps) {
  const {
    themed,
    theme: { colors },
  } = useAppTheme()
  const rowRef = useRef<View>(null)
  const firstCourseRef = useRef<View>(null)
  const [availableWidth, setAvailableWidth] = useState(0)
  const [firstCourseCenterY, setFirstCourseCenterY] = useState<number | undefined>()
  const [currentCourseHeight, setCurrentCourseHeight] = useState(76)
  const prePrerequisiteCount = useMemo(
    () =>
      graph.prerequisites
        ? collectDetailedCourseEntries(graph.prerequisites).filter(
            ({ item }) => !!item.prerequisites,
          ).length
        : 0,
    [graph.prerequisites],
  )
  const showPrePrerequisites = prePrerequisiteCount > 0
  const prePrerequisiteConnectorWidth = connectorGutterWidth(prePrerequisiteCount)
  const columnCount = showPrePrerequisites ? 3 : 2
  const columnWidth = Math.max(
    0,
    (availableWidth -
      DETAILED_CONNECTOR_WIDTH -
      (showPrePrerequisites ? prePrerequisiteConnectorWidth : 0)) /
      columnCount,
  )
  const prerequisiteWidth = showPrePrerequisites
    ? columnWidth * 2 + prePrerequisiteConnectorWidth
    : columnWidth

  const measureFirstCourse = useCallback(() => {
    const row = rowRef.current
    const firstCourse = firstCourseRef.current
    if (!row || !firstCourse) return

    row.measureInWindow((_, rowY) => {
      firstCourse.measureInWindow((_, courseY, __, courseHeight) => {
        const centerY = courseY - rowY + courseHeight / 2
        setFirstCourseCenterY((previous) =>
          previous !== undefined && Math.abs(previous - centerY) < 0.5 ? previous : centerY,
        )
      })
    })
  }, [])

  const setFirstCourseRef = useCallback((node: View | null) => {
    firstCourseRef.current = node
  }, [])

  useEffect(() => {
    setFirstCourseCenterY(undefined)
    requestAnimationFrame(measureFirstCourse)
  }, [graph.prerequisites, measureFirstCourse])

  const arrowCenterY = firstCourseCenterY ?? currentCourseHeight / 2

  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        setAvailableWidth((previous) =>
          Math.abs(previous - layout.width) < 0.5 ? previous : layout.width,
        )
      }}
      style={$detailedColumnsContainer}
      testID="detailed-columns-container"
    >
      <View style={$columnLabels}>
        <View
          style={[$detailedPrerequisiteLabelSlot, { width: prerequisiteWidth }]}
          testID="prerequisite-column-label"
        >
          <Text text="PREREQUISITES" size="xxs" weight="bold" style={themed($columnLabel)} />
        </View>
        <View style={$columnLabelSpacer} testID="dependency-column-label-spacer" />
        <View
          style={[$detailedCurrentCourseLabelSlot, { width: columnWidth }]}
          testID="current-course-column-label"
        >
          <Text text="CURRENT COURSE" size="xxs" weight="bold" style={themed($columnLabel)} />
        </View>
      </View>
      <View
        collapsable={false}
        onLayout={() => requestAnimationFrame(measureFirstCourse)}
        ref={rowRef}
        style={$columns}
      >
        <View style={{ width: prerequisiteWidth }} testID="detailed-prerequisite-columns">
          {graph.mode === "none" ? (
            <EmptyPrerequisites />
          ) : graph.prerequisites ? (
            <DetailedPrerequisiteGraph
              columnWidth={columnWidth}
              connectorWidth={prePrerequisiteConnectorWidth}
              item={graph.prerequisites}
              onFirstCourseLayout={() => requestAnimationFrame(measureFirstCourse)}
              onOpenCourse={onOpenCourse}
              setFirstCourseRef={setFirstCourseRef}
              showPrePrerequisites={showPrePrerequisites}
              termName={termName}
            />
          ) : (
            <View style={themed($emptyNode)}>
              <Text text="No course codes could be extracted" size="sm" style={$centerText} />
            </View>
          )}
        </View>
        <Svg
          accessibilityElementsHidden
          height={20}
          importantForAccessibility="no"
          pointerEvents="none"
          style={{ marginTop: alignedNodeTop(arrowCenterY, 20) }}
          testID="dependency-main-connector"
          width={DETAILED_CONNECTOR_WIDTH}
        >
          <ConnectorPaths
            color={colors.tint}
            source={{ x: 4, y: 10 }}
            testID="dependency-main-connector"
            tip={{ x: 30, y: 10 }}
          />
        </Svg>
        <View
          accessible
          accessibilityLabel={`${graph.courseCode}, current course, ${graph.title ?? "title unavailable"}`}
          onLayout={({ nativeEvent: { layout } }) => setCurrentCourseHeight(layout.height)}
          style={[
            themed($currentNode),
            $fixedWidthCurrentNode,
            {
              marginTop: alignedNodeTop(arrowCenterY, currentCourseHeight),
              width: columnWidth,
            },
          ]}
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

function EmptyPrerequisites() {
  const { themed } = useAppTheme()

  return (
    <View style={themed($emptyNode)}>
      <Text
        text="No prerequisites"
        size="sm"
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
      {detailed ? (
        <DetailedGraphColumns graph={graph} onOpenCourse={onOpenCourse} termName={termName} />
      ) : (
        <Fragment>
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
                <EmptyPrerequisites />
              ) : graph.prerequisites ? (
                <DependencyItem
                  item={graph.prerequisites}
                  onOpenCourse={onOpenCourse}
                  path="root"
                  termName={termName}
                  variant={variant}
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
              testID="dependency-current-course-node"
            >
              <Text text={graph.courseCode} weight="bold" style={themed($currentCode)} />
              {!!graph.title && (
                <Text text={graph.title} size="xs" numberOfLines={3} style={$centerText} />
              )}
            </View>
          </View>
        </Fragment>
      )}
    </View>
  )
}

const $graphSurface: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.border,
  borderRadius: 24,
  borderWidth: 1,
  gap: spacing.sm,
  minWidth: 0,
  padding: spacing.md,
  width: "100%",
})

const $detailedColumnsContainer: ViewStyle = {
  minWidth: 0,
  width: "100%",
}

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
  minWidth: 0,
}

const $detailedCurrentCourseLabelSlot: ViewStyle = {
  alignItems: "center",
  minWidth: 0,
}

const $columnLabelSpacer: ViewStyle = {
  width: DETAILED_CONNECTOR_WIDTH,
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

const $fixedWidthCurrentNode: ViewStyle = {
  flex: 0,
}

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
  backgroundColor: colors.palette.neutral200,
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
  gap: spacing.sm,
  minWidth: 0,
})

const $independentPrerequisiteTreeColumn: ViewStyle = {
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
  lineHeight: 12,
  textAlign: "center",
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
  minWidth: 0,
  paddingHorizontal: spacing.sm,
  width: "100%",
})

const $unavailableNode: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral200,
  borderStyle: "dashed",
  opacity: 0.66,
})

const $courseCode: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  textAlign: "center",
  width: "100%",
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
  alignItems: "center",
  backgroundColor: colors.palette.neutral200,
  borderRadius: 14,
  justifyContent: "center",
  minHeight: 76,
  minWidth: 0,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.sm,
  width: "100%",
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
