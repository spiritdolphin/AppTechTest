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
import { DependencyExplorerFullscreenScreen } from "../app/features/courses/screens/DependencyExplorerFullscreenScreen"
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

function renderFullscreen(repository: CourseRepository) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() }
  const screen = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <DependencyExplorerFullscreenScreen
          navigation={navigation as never}
          repository={repository}
          route={{
            key: "dependency-explorer-fullscreen-test",
            name: "DependencyExplorerFullscreen",
            params: { courseCode: "COMP 4000", termCode: "2610" },
          }}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  )

  return { navigation, screen }
}

describe("DependencyExplorerFullscreenScreen", () => {
  test("loads a deeper graph and shows prerequisite course titles", async () => {
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
    expect(screen.getByTestId("dependency-title-PHYS 1000")).toHaveTextContent("PHYS 1000 title")
    expect(screen.getAllByText("REQUIRES")).toHaveLength(2)
    expect(resolveSpy).toHaveBeenCalledWith("2610", "COMP 4000", 3)

    fireEvent.press(screen.getByTestId("dependency-node-COMP 3000"))
    expect(navigation.navigate).toHaveBeenCalledWith("CourseDetails", {
      courseCode: "COMP 3000",
      termCode: "2610",
    })

    fireEvent.press(screen.getByTestId("dependency-fullscreen-close"))
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
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
