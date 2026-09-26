import { fireEvent, render } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseRepository } from "../app/features/courses/data/repository"
import type {
  CatalogueCourse,
  CatalogueFile,
  DetailsFile,
  PrerequisitesFile,
  SemestersFile,
} from "../app/features/courses/domain/types"
import { DependencyExplorerScreen } from "../app/features/courses/screens/DependencyExplorerScreen"
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
    Path: () => null,
    Polygon: () => null,
  }
})

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

const semestersFile: SemestersFile = {
  schemaVersion: 1,
  semesters: [
    {
      termNum: 104,
      termCode: "2610",
      termName: "2026-27 Fall",
      academicYear: "2026-27",
      courseCount: 3,
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

function catalogue(codes: string[]): CatalogueFile {
  return {
    schemaVersion: 1,
    termCode: "2610",
    courses: codes.map(catalogueCourse),
  }
}

function prerequisites(byCourseCode: PrerequisitesFile["byCourseCode"] = {}): PrerequisitesFile {
  return {
    schemaVersion: 1,
    termCode: "2610",
    byCourseCode,
    reverseByCourseCode: {},
  }
}

function repositoryWith({
  catalogueFile = catalogue(["COMP 4000", "COMP 3000"]),
  prerequisitesLoader = () => prerequisites(),
}: {
  catalogueFile?: CatalogueFile
  prerequisitesLoader?: () => PrerequisitesFile | Promise<PrerequisitesFile>
} = {}) {
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

function renderExplorer(repository: CourseRepository) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() }
  const screen = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <DependencyExplorerScreen
          navigation={navigation as never}
          repository={repository}
          route={{
            key: "dependency-explorer-test",
            name: "DependencyExplorer",
            params: { courseCode: "COMP 4000", termCode: "2610" },
          }}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  )
  return { navigation, screen }
}

describe("DependencyExplorerScreen", () => {
  test("renders structured dependencies and navigates through an available node", async () => {
    const originalText = "COMP 3000 AND (COMP 3000 OR PHYS 1000)"
    const { navigation, screen } = renderExplorer(
      repositoryWith({
        prerequisitesLoader: () =>
          prerequisites({
            "COMP 4000": {
              originalText,
              referencedCourseCodes: ["COMP 3000", "PHYS 1000"],
            },
            "COMP 3000": {
              originalText: "COMP 4000",
              referencedCourseCodes: ["COMP 4000"],
            },
          }),
      }),
    )

    expect(await screen.findByText("Original Text")).toBeTruthy()
    expect(screen.queryByText("Original prerequisite text")).toBeNull()
    expect(screen.getByText(originalText)).toBeTruthy()
    expect(screen.getByText("AND")).toBeTruthy()
    expect(screen.getByText("OR")).toBeTruthy()
    expect(screen.getByText("Repeated")).toBeTruthy()
    expect(screen.queryByText("REQUIRES")).toBeNull()
    expect(screen.queryByText("Open to continue")).toBeNull()
    expect(screen.queryByTestId("dependency-node-COMP 4000")).toBeNull()
    expect(screen.getByText("COMP 4000 title")).toBeTruthy()
    expect(screen.queryByText("COMP 3000 title")).toBeNull()

    const rendered = JSON.stringify(screen.toJSON())
    expect(rendered.indexOf("original-text-card")).toBeLessThan(
      rendered.indexOf("dependency-graph"),
    )

    const unavailableNode = screen.getByTestId("dependency-node-PHYS 1000")
    expect(unavailableNode.props.accessibilityState).toEqual({ disabled: true })
    expect(screen.getByText("Not offered in 2026-27 Fall")).toBeTruthy()

    fireEvent.press(screen.getAllByTestId("dependency-node-COMP 3000")[0])
    expect(navigation.navigate).toHaveBeenCalledWith("CourseDetails", {
      courseCode: "COMP 3000",
      termCode: "2610",
    })
  })

  test("places a boolean operator between prerequisite course nodes", async () => {
    const { screen } = renderExplorer(
      repositoryWith({
        catalogueFile: catalogue(["COMP 4000", "COMP 3000", "MATH 2000"]),
        prerequisitesLoader: () =>
          prerequisites({
            "COMP 4000": {
              originalText: "COMP 3000 OR MATH 2000",
              referencedCourseCodes: ["COMP 3000", "MATH 2000"],
            },
          }),
      }),
    )

    await screen.findByText("Original Text")
    const rendered = JSON.stringify(screen.toJSON())
    const firstNodeIndex = rendered.indexOf("dependency-node-COMP 3000")
    const operatorIndex = rendered.indexOf("dependency-operator-root-1")
    const secondNodeIndex = rendered.indexOf("dependency-node-MATH 2000")

    expect(firstNodeIndex).toBeGreaterThan(-1)
    expect(firstNodeIndex).toBeLessThan(operatorIndex)
    expect(operatorIndex).toBeLessThan(secondNodeIndex)
  })

  test("renders no-prerequisite and extracted-course fallbacks", async () => {
    const noPrerequisite = renderExplorer(repositoryWith())
    expect(await noPrerequisite.screen.findByText("No prerequisites")).toBeTruthy()
    expect(noPrerequisite.screen.getByTestId("dependency-empty-state-text").props).toMatchObject({
      adjustsFontSizeToFit: true,
      minimumFontScale: 0.9,
      numberOfLines: 1,
    })
    noPrerequisite.screen.unmount()

    const extracted = renderExplorer(
      repositoryWith({
        catalogueFile: catalogue(["COMP 4000"]),
        prerequisitesLoader: () =>
          prerequisites({
            "COMP 4000": {
              originalText: "Any CHEM course at or above 1000-level or CORE 1120",
              referencedCourseCodes: [],
            },
          }),
      }),
    )
    expect(await extracted.screen.findAllByText("Extracted courses")).toHaveLength(2)
    expect(extracted.screen.getByTestId("dependency-node-CORE 1120")).toBeDisabled()
    expect(
      extracted.screen.getByText("Any CHEM course at or above 1000-level or CORE 1120"),
    ).toBeTruthy()
  })

  test("renders loading, error, and unavailable-current-course states", async () => {
    let resolvePrerequisites: ((file: PrerequisitesFile) => void) | undefined
    const pending = new Promise<PrerequisitesFile>((resolve) => {
      resolvePrerequisites = resolve
    })
    const loading = renderExplorer(repositoryWith({ prerequisitesLoader: () => pending }))
    expect(loading.screen.getByLabelText("Loading dependencies")).toBeTruthy()
    loading.screen.unmount()
    resolvePrerequisites?.(prerequisites())

    const error = renderExplorer(
      repositoryWith({
        prerequisitesLoader: () => Promise.reject(new Error("Broken prerequisite shard")),
      }),
    )
    expect(await error.screen.findByText("Could not load dependencies")).toBeTruthy()
    expect(error.screen.getByText("Broken prerequisite shard")).toBeTruthy()
    error.screen.unmount()

    const unavailable = renderExplorer(repositoryWith({ catalogueFile: catalogue([]) }))
    expect(await unavailable.screen.findByText("COMP 4000 is unavailable")).toBeTruthy()
  })
})
