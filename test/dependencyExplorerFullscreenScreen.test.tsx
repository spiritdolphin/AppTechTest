import { fireEvent, render, within } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseRepository } from "../app/features/courses/data/repository"
import type {
  CatalogueCourse,
  CatalogueFile,
  DetailsFile,
  PrerequisitesFile,
  SemestersFile,
} from "../app/features/courses/domain/types"
import { DependencyExplorerFullscreenScreen } from "../app/features/courses/screens/DependencyExplorerFullscreenScreen"
import { connectorGutterWidth } from "../app/features/courses/utils/dependencyConnectorPath"
import { colors } from "../app/theme/colors"
import { colors as darkColors } from "../app/theme/colorsDark"
import { ThemeProvider } from "../app/theme/context"

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual<typeof import("@react-navigation/native")>(
    "@react-navigation/native",
  )
  return { ...actual, useScrollToTop: jest.fn() }
})

jest.mock("react-native-svg", () => {
  const React = jest.requireActual<typeof import("react")>("react")
  const Native = jest.requireActual<typeof import("react-native")>("react-native")
  return {
    __esModule: true,
    default: ({ children, ...props }: React.PropsWithChildren) =>
      React.createElement(Native.View, props, children),
    Path: (props: Record<string, unknown>) => React.createElement(Native.View, props),
    Polygon: () => null,
  }
})

const initialMetrics = {
  frame: { x: 0, y: 0, width: 844, height: 390 },
  insets: { top: 0, left: 47, right: 47, bottom: 21 },
}

const semestersFile: SemestersFile = {
  schemaVersion: 1,
  semesters: [
    {
      termNum: 104,
      termCode: "2610",
      termName: "2026-27 Fall",
      academicYear: "2026-27",
      courseCount: 4,
      departments: [],
    },
  ],
}

function catalogueCourse(code: string): CatalogueCourse {
  return {
    id: code,
    code,
    normalizedCode: code.replaceAll(" ", "").toLowerCase(),
    title: `${code} title`,
    normalizedTitle: `${code.replaceAll(" ", "").toLowerCase()}title`,
    departmentCode: code.split(" ")[0],
    minCredits: 3,
    maxCredits: 3,
  }
}

function repositoryWith(
  prerequisitesLoader: () => PrerequisitesFile | Promise<PrerequisitesFile>,
  catalogueCodes = ["COMP 4000", "COMP 3000", "MATH 2000", "PHYS 1000"],
) {
  const catalogueFile: CatalogueFile = {
    schemaVersion: 1,
    termCode: "2610",
    courses: catalogueCodes.map(catalogueCourse),
  }

  return new CourseRepository({
    semestersFile,
    catalogueLoaders: { "2610": () => catalogueFile },
    detailsLoaders: {
      "2610": () =>
        ({ schemaVersion: 1, termCode: "2610", coursesByCode: {} }) satisfies DetailsFile,
    },
    prerequisitesLoaders: { "2610": prerequisitesLoader },
  })
}

function prerequisites(byCourseCode: PrerequisitesFile["byCourseCode"]): PrerequisitesFile {
  return {
    schemaVersion: 1,
    termCode: "2610",
    byCourseCode,
    reverseByCourseCode: {},
  }
}

function renderFullscreen(
  repository: CourseRepository,
  courseCode = "COMP 4000",
  graphHistory?: string[],
  themeMode?: "light" | "dark",
) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
  }
  const screen = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider initialContext={themeMode}>
        <DependencyExplorerFullscreenScreen
          navigation={navigation as never}
          repository={repository}
          route={{
            key: "dependency-explorer-fullscreen-test",
            name: "DependencyExplorerFullscreen",
            params: { courseCode, graphHistory, termCode: "2610" },
          }}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  )

  return { navigation, screen }
}

describe("DependencyExplorerFullscreenScreen", () => {
  test("renders pre-prerequisites beside prerequisites and marks deeper courses", async () => {
    const repository = repositoryWith(() =>
      prerequisites({
        "COMP 4000": {
          originalText: "COMP 3000",
          referencedCourseCodes: ["COMP 3000"],
        },
        "COMP 3000": {
          originalText: "MATH 2000",
          referencedCourseCodes: ["MATH 2000"],
        },
        "MATH 2000": {
          originalText: "PHYS 1000",
          referencedCourseCodes: ["PHYS 1000"],
        },
      }),
    )
    const resolveSpy = jest.spyOn(repository, "resolveDependencyGraph")
    const { navigation, screen } = renderFullscreen(repository)

    expect(await screen.findByTestId("dependency-title-COMP 3000")).toHaveTextContent(
      "COMP 3000 title",
    )
    expect(screen.getByTestId("dependency-title-MATH 2000")).toHaveTextContent("MATH 2000 title")
    expect(screen.queryByTestId("dependency-title-PHYS 1000")).toBeNull()
    expect(screen.queryByText("REQUIRES")).toBeNull()
    expect(screen.getByTestId("dependency-more-MATH 2000")).toBeTruthy()
    const moreIndicator = screen.getByTestId("dependency-more-MATH 2000")
    expect(moreIndicator).toHaveProp("accessibilityRole", "button")
    expect(moreIndicator).toHaveProp(
      "accessibilityLabel",
      "View more prerequisites for MATH 2000 in fullscreen",
    )
    expect(moreIndicator).toHaveStyle({ minHeight: 64, minWidth: 44 })
    const moreLabel = within(moreIndicator).UNSAFE_getByProps({
      testID: "dependency-more-label-MATH 2000",
    })
    const moreArrow = within(moreIndicator)
      .UNSAFE_getAllByProps({ testID: "dependency-more-arrow-MATH 2000" })
      .find((candidate) => candidate.props.style)

    expect(moreLabel.props.text).toBe("M\nO\nR\nE")
    expect(moreLabel.props.style).toEqual(
      expect.objectContaining({ lineHeight: 12, textAlign: "center" }),
    )
    expect(moreLabel.props.style.transform).toBeUndefined()
    expect(moreArrow?.props.style).toEqual(
      expect.objectContaining({ alignItems: "center", justifyContent: "center", width: 14 }),
    )
    expect(moreArrow?.findByProps({ children: "›" })).toBeTruthy()
    expect(screen.getByTestId("dependency-node-MATH 2000")).toHaveProp("accessibilityState", {
      disabled: false,
    })
    expect(screen.getByTestId("dependency-node-MATH 2000")).toHaveProp(
      "accessibilityLabel",
      "MATH 2000, More prerequisites exist before MATH 2000",
    )
    expect(resolveSpy).toHaveBeenCalledWith("2610", "COMP 4000", 2)

    fireEvent.press(moreIndicator)
    expect(navigation.setParams).toHaveBeenCalledWith({
      courseCode: "MATH 2000",
      graphHistory: ["COMP 4000"],
      termCode: "2610",
    })
    expect(navigation.push).not.toHaveBeenCalled()
    expect(navigation.replace).not.toHaveBeenCalled()

    fireEvent(screen.getByTestId("detailed-columns-container"), "layout", {
      nativeEvent: { layout: { width: 700, height: 300 } },
    })
    const prerequisiteLabel = screen.getByTestId("prerequisite-column-label")
    const currentCourseLabel = screen.getByTestId("current-course-column-label")
    const prerequisiteCanvas = screen.getByTestId("detailed-prerequisite-canvas")
    const prePrerequisiteColumn = screen.getByTestId("pre-prerequisite-column")
    const prePrerequisiteBlock = screen.getByTestId("pre-prerequisite-block-root")
    const prerequisiteTree = screen.getByTestId("detailed-prerequisite-tree")
    const currentCourseNode = screen.getByTestId("dependency-current-course-node")

    const columnWidth = (700 - 80) / 3
    expect(prerequisiteLabel.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ alignItems: "center", minWidth: 0 }),
        expect.objectContaining({ width: columnWidth * 2 + 40 }),
      ]),
    )
    expect(currentCourseLabel.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ alignItems: "center", minWidth: 0 }),
        expect.objectContaining({ width: columnWidth }),
      ]),
    )
    expect(prePrerequisiteColumn.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: columnWidth })]),
    )
    expect(prerequisiteTree.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: columnWidth })]),
    )
    expect(prerequisiteCanvas.props.style).toEqual(
      expect.objectContaining({ minWidth: 0, position: "relative" }),
    )
    expect(within(prePrerequisiteBlock).getByTestId("dependency-node-MATH 2000")).toBeTruthy()
    expect(within(prePrerequisiteColumn).queryByTestId("dependency-node-COMP 3000")).toBeNull()
    expect(within(prerequisiteTree).getByTestId("dependency-node-COMP 3000")).toBeTruthy()
    expect(within(prerequisiteTree).queryByTestId("dependency-node-MATH 2000")).toBeNull()
    expect(screen.getByTestId("dependency-node-COMP 3000").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: colors.palette.neutral100,
          borderColor: colors.border,
        }),
      ]),
    )
    expect(screen.getByTestId("prerequisite-column-COMP 3000").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: colors.palette.neutral200,
          borderColor: colors.border,
        }),
      ]),
    )
    expect(currentCourseNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: colors.palette.neutral200 }),
        expect.objectContaining({ flex: 0 }),
        expect.objectContaining({ width: columnWidth }),
      ]),
    )
    expect(screen.queryByTestId("dependency-arrow")).toBeNull()
    const connectorPath = screen.UNSAFE_getAllByProps({
      testID: "dependency-main-connector-path",
    })[0]
    const connectorHead = screen.UNSAFE_getAllByProps({
      testID: "dependency-main-connector-head",
    })[0]
    expect(connectorPath.props.d).toBe("M 4 10 H 23")
    expect(connectorHead.props.d).toBe("M 23 4 L 30 10 L 23 16")
    expect(connectorPath.props.stroke).toBe(colors.tint)

    const fixedContent = screen.getByTestId("fullscreen-fixed-content")
    const contentRegion = screen.getByTestId("fullscreen-content-region")
    const graphViewport = screen.getByTestId("fullscreen-graph-viewport")
    const graphWidth = screen.getByTestId("fullscreen-graph-width")
    const originalTextScroll = screen.getByTestId("fullscreen-original-text-scroll")
    const verticalGraphScroll = screen.getByTestId("fullscreen-graph-vertical-scroll")

    expect(within(fixedContent).getByTestId("fullscreen-fixed-header")).toBeTruthy()
    expect(within(fixedContent).getByTestId("fullscreen-original-text-card")).toBeTruthy()
    expect(within(fixedContent).queryByTestId("fullscreen-graph-viewport")).toBeNull()
    expect(within(contentRegion).getByTestId("fullscreen-graph-viewport")).toBeTruthy()
    expect(within(contentRegion).queryByTestId("dependency-fullscreen-close")).toBeNull()
    expect(contentRegion.props.style).toEqual(expect.objectContaining({ flex: 1, minHeight: 0 }))
    expect(graphViewport.props.style).toEqual(expect.objectContaining({ flex: 1, minHeight: 0 }))
    expect(graphWidth.props.style).toEqual(expect.objectContaining({ width: "100%" }))
    expect(originalTextScroll.props.style).toEqual(
      expect.objectContaining({ flex: 1, maxHeight: 48, minHeight: 20 }),
    )
    expect(verticalGraphScroll.props.horizontal).toBeUndefined()
    expect(verticalGraphScroll.props.contentInsetAdjustmentBehavior).toBe("never")
    expect(screen.queryByTestId("fullscreen-graph-scroll")).toBeNull()

    fireEvent(screen.getByTestId("detailed-columns-container"), "layout", {
      nativeEvent: { layout: { width: 560, height: 300 } },
    })
    const narrowColumnWidth = (560 - 80) / 3
    expect(screen.getByTestId("pre-prerequisite-column").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: narrowColumnWidth })]),
    )
    expect(screen.getByTestId("detailed-prerequisite-tree").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: narrowColumnWidth })]),
    )
    expect(screen.getByTestId("dependency-current-course-node").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: narrowColumnWidth })]),
    )
    expect(narrowColumnWidth * 3 + 80).toBe(560)

    const closeButton = screen.getByTestId("dependency-fullscreen-close")
    expect(closeButton.props.hitSlop).toBe(4)
    expect(closeButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 14, minHeight: 40, paddingHorizontal: 12 }),
      ]),
    )

    fireEvent.press(screen.getByTestId("dependency-node-COMP 3000"))
    expect(navigation.replace).toHaveBeenCalledWith("CourseDetails", {
      courseCode: "COMP 3000",
      parentCourseCode: "COMP 4000",
      termCode: "2610",
    })
    expect(navigation.navigate).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId("dependency-node-MATH 2000"))
    expect(navigation.replace).toHaveBeenLastCalledWith("CourseDetails", {
      courseCode: "MATH 2000",
      parentCourseCode: "COMP 4000",
      termCode: "2610",
    })

    fireEvent.press(screen.getByTestId("dependency-fullscreen-close"))
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("opens More within a group and omits it for unavailable courses", async () => {
    const repository = repositoryWith(
      () =>
        prerequisites({
          "COMP 4000": {
            originalText: "COMP 3000",
            referencedCourseCodes: ["COMP 3000"],
          },
          "COMP 3000": {
            originalText: "MATH 2000 OR PHYS 1000",
            referencedCourseCodes: ["MATH 2000", "PHYS 1000"],
          },
          "MATH 2000": {
            originalText: "CHEM 1000",
            referencedCourseCodes: ["CHEM 1000"],
          },
          "PHYS 1000": {
            originalText: "BIOL 1000",
            referencedCourseCodes: ["BIOL 1000"],
          },
        }),
      ["COMP 4000", "COMP 3000", "MATH 2000", "CHEM 1000"],
    )
    const { navigation, screen } = renderFullscreen(repository)

    const moreButton = await screen.findByTestId("dependency-more-MATH 2000")
    expect(screen.getByTestId("dependency-node-PHYS 1000")).toBeDisabled()
    expect(screen.queryByTestId("dependency-more-PHYS 1000")).toBeNull()

    fireEvent.press(moreButton)
    expect(navigation.setParams).toHaveBeenCalledWith({
      courseCode: "MATH 2000",
      graphHistory: ["COMP 4000"],
      termCode: "2610",
    })
    expect(navigation.push).not.toHaveBeenCalled()
    expect(navigation.replace).not.toHaveBeenCalled()
    screen.unmount()

    const nextGraph = renderFullscreen(repository, "MATH 2000", ["COMP 4000"])
    expect(await nextGraph.screen.findByTestId("dependency-node-CHEM 1000")).toBeTruthy()
    expect(
      within(nextGraph.screen.getByTestId("fullscreen-original-text-card")).getByText("CHEM 1000"),
    ).toBeTruthy()
    const backButton = nextGraph.screen.getByTestId("dependency-fullscreen-close")
    expect(backButton).toHaveProp(
      "accessibilityLabel",
      "Back to fullscreen dependency graph for COMP 4000",
    )
    fireEvent.press(backButton)
    expect(nextGraph.navigation.setParams).toHaveBeenCalledWith({
      courseCode: "COMP 4000",
      graphHistory: [],
      termCode: "2610",
    })
    expect(nextGraph.navigation.goBack).not.toHaveBeenCalled()

    fireEvent.press(nextGraph.screen.getByTestId("dependency-node-CHEM 1000"))
    expect(nextGraph.navigation.replace).toHaveBeenLastCalledWith("CourseDetails", {
      courseCode: "CHEM 1000",
      parentCourseCode: "COMP 4000",
      termCode: "2610",
    })
  })

  test("keeps the More control in light-theme colors on a dark graph", async () => {
    const repository = repositoryWith(() =>
      prerequisites({
        "COMP 4000": {
          originalText: "COMP 3000",
          referencedCourseCodes: ["COMP 3000"],
        },
        "COMP 3000": {
          originalText: "MATH 2000",
          referencedCourseCodes: ["MATH 2000"],
        },
        "MATH 2000": {
          originalText: "PHYS 1000",
          referencedCourseCodes: ["PHYS 1000"],
        },
      }),
    )
    const { screen } = renderFullscreen(repository, "COMP 4000", undefined, "dark")

    const pill = await screen.findByTestId("dependency-more-pill-MATH 2000")
    expect(screen.getByTestId("dependency-graph")).toHaveStyle({
      backgroundColor: darkColors.palette.neutral100,
    })
    expect(pill).toHaveStyle({
      backgroundColor: colors.palette.accent100,
      borderColor: colors.border,
    })
    const label = screen
      .UNSAFE_getAllByProps({ testID: "dependency-more-label-MATH 2000" })
      .find((candidate) => candidate.props.style)
    expect(label?.props.style).toEqual(expect.objectContaining({ color: colors.textDim }))
  })

  test("uses equal, screen-bounded columns when prerequisites have no earlier courses", async () => {
    const repository = repositoryWith(() =>
      prerequisites({
        "COMP 4000": {
          originalText: "COMP 3000 OR MATH 2000",
          referencedCourseCodes: ["COMP 3000", "MATH 2000"],
        },
      }),
    )
    const { screen } = renderFullscreen(repository)

    expect(await screen.findByTestId("dependency-node-COMP 3000")).toBeTruthy()
    fireEvent(screen.getByTestId("detailed-columns-container"), "layout", {
      nativeEvent: { layout: { width: 700, height: 200 } },
    })

    const columnWidth = (700 - 40) / 2
    expect(screen.queryByTestId("pre-prerequisite-column")).toBeNull()
    expect(screen.getByTestId("detailed-prerequisite-columns").props.style).toEqual({
      width: columnWidth,
    })
    expect(screen.getByTestId("detailed-prerequisite-tree").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: columnWidth })]),
    )
    expect(screen.getByTestId("dependency-current-course-node").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: columnWidth })]),
    )
    expect(screen.getByTestId("prerequisite-column-label").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: columnWidth })]),
    )
    expect(screen.getByTestId("current-course-column-label").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: columnWidth })]),
    )
    expect(columnWidth * 2 + 40).toBe(700)
  })

  test("widens the connector gutter for several courses with earlier prerequisites", async () => {
    const repository = repositoryWith(
      () =>
        prerequisites({
          "COMP 4000": {
            originalText: "COMP 3000 OR MATH 2000 OR PHYS 1000",
            referencedCourseCodes: ["COMP 3000", "MATH 2000", "PHYS 1000"],
          },
          "COMP 3000": {
            originalText: "MATH 1000",
            referencedCourseCodes: ["MATH 1000"],
          },
          "MATH 2000": {
            originalText: "MATH 1001",
            referencedCourseCodes: ["MATH 1001"],
          },
          "PHYS 1000": {
            originalText: "MATH 1002",
            referencedCourseCodes: ["MATH 1002"],
          },
        }),
      ["COMP 4000", "COMP 3000", "MATH 2000", "PHYS 1000", "MATH 1000", "MATH 1001", "MATH 1002"],
    )
    const { screen } = renderFullscreen(repository)

    expect(await screen.findByTestId("pre-prerequisite-block-root-0")).toBeTruthy()
    fireEvent(screen.getByTestId("detailed-columns-container"), "layout", {
      nativeEvent: { layout: { width: 700, height: 300 } },
    })

    const connectorWidth = connectorGutterWidth(3)
    const columnWidth = (700 - connectorWidth - 40) / 3
    expect(screen.getByTestId("pre-prerequisite-connector-gutter")).toHaveStyle({
      width: connectorWidth,
    })
    expect(screen.getByTestId("pre-prerequisite-column")).toHaveStyle({ width: columnWidth })
    expect(screen.getByTestId("detailed-prerequisite-tree")).toHaveStyle({ width: columnWidth })
    expect(screen.getByTestId("dependency-current-course-node")).toHaveStyle({
      width: columnWidth,
    })
  })

  test("keeps empty prerequisites readable and equal in width to the current course", async () => {
    const { screen } = renderFullscreen(repositoryWith(() => prerequisites({})))

    const emptyText = await screen.findByTestId("dependency-empty-state-text")
    fireEvent(screen.getByTestId("detailed-columns-container"), "layout", {
      nativeEvent: { layout: { width: 700, height: 200 } },
    })

    expect(emptyText).toHaveTextContent("No prerequisites")
    expect(emptyText).toHaveStyle({ fontSize: 16 })
    expect(emptyText.props.adjustsFontSizeToFit).toBeUndefined()
    expect(screen.getByTestId("detailed-prerequisite-columns").props.style).toEqual({ width: 330 })
    expect(screen.getByTestId("dependency-current-course-node").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 330 })]),
    )
    expect(screen.getByTestId("prerequisite-column-label").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 330 })]),
    )
    expect(screen.getByTestId("current-course-column-label").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 330 })]),
    )
  })

  test("keeps the grouped prerequisite tree compact and independent from pre-prerequisites", async () => {
    const repository = repositoryWith(
      () =>
        prerequisites({
          "COMP 4000": {
            originalText: "(COMP 3000 OR MATH 2000) AND PHYS 1000",
            referencedCourseCodes: ["COMP 3000", "MATH 2000", "PHYS 1000"],
          },
          "COMP 3000": {
            originalText: "MATH 1000 OR MATH 1001",
            referencedCourseCodes: ["MATH 1000", "MATH 1001"],
          },
        }),
      ["COMP 4000", "COMP 3000", "MATH 2000", "PHYS 1000", "MATH 1000", "MATH 1001"],
    )
    const { screen } = renderFullscreen(repository)

    expect(await screen.findByTestId("dependency-node-COMP 3000")).toBeTruthy()
    expect(screen.getByTestId("dependency-group-root").props.style).toEqual(
      expect.objectContaining({
        backgroundColor: colors.palette.neutral200,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
        padding: 8,
      }),
    )
    expect(screen.getByTestId("dependency-group-root-0").props.style).toEqual(
      expect.objectContaining({
        backgroundColor: colors.palette.neutral200,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
        padding: 8,
      }),
    )
    expect(screen.getByTestId("dependency-operator-root-1")).toHaveTextContent("AND")
    expect(screen.getByTestId("dependency-operator-root-0-1")).toHaveTextContent("OR")
    expect(screen.getByTestId("pre-prerequisite-operator-root-0-0-pre-1")).toHaveTextContent("OR")

    const groupedCourseCode = within(screen.getByTestId("dependency-node-MATH 2000")).getByText(
      "MATH 2000",
    )
    expect(groupedCourseCode).toHaveStyle({ fontSize: 16, width: "100%" })
    expect(groupedCourseCode).toHaveProp("numberOfLines", 2)
    expect(groupedCourseCode.props.adjustsFontSizeToFit).toBeUndefined()

    const prePrerequisiteColumn = screen.getByTestId("pre-prerequisite-column")
    const compPrePrerequisites = screen.getByTestId("pre-prerequisite-block-root-0-0")
    const prerequisiteTree = screen.getByTestId("detailed-prerequisite-tree")
    const nestedPrerequisite = screen.getByTestId("prerequisite-column-COMP 3000")
    const outerPrerequisite = screen.getByTestId("prerequisite-column-PHYS 1000")

    expect(within(compPrePrerequisites).getByTestId("dependency-node-MATH 1000")).toBeTruthy()
    expect(within(compPrePrerequisites).getByTestId("dependency-node-MATH 1001")).toBeTruthy()
    expect(within(prePrerequisiteColumn).queryByTestId("dependency-group-root")).toBeNull()
    expect(within(prerequisiteTree).queryByTestId("dependency-node-MATH 1000")).toBeNull()
    expect(nestedPrerequisite.props.style).toEqual(expect.objectContaining({ minWidth: 0 }))
    expect(outerPrerequisite.props.style).toEqual(expect.objectContaining({ minWidth: 0 }))
    expect(screen.queryByText("REQUIRES")).toBeNull()
  })

  test("renders loading, error, and unavailable states", async () => {
    let resolvePrerequisites: ((file: PrerequisitesFile) => void) | undefined
    const pending = new Promise<PrerequisitesFile>((resolve) => {
      resolvePrerequisites = resolve
    })
    const loading = renderFullscreen(repositoryWith(() => pending))
    expect(loading.screen.getByLabelText("Loading fullscreen dependencies")).toBeTruthy()
    loading.screen.unmount()
    resolvePrerequisites?.(prerequisites({}))

    const error = renderFullscreen(
      repositoryWith(() => Promise.reject(new Error("Broken prerequisite shard"))),
    )
    expect(await error.screen.findByText("Could not load dependencies")).toBeTruthy()
    expect(error.screen.getByText("Broken prerequisite shard")).toBeTruthy()
    error.screen.unmount()

    const unavailable = renderFullscreen(repositoryWith(() => prerequisites({}), []))
    expect(await unavailable.screen.findByText("COMP 4000 is unavailable")).toBeTruthy()
  })
})
