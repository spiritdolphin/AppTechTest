import { fireEvent, render, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseRepository } from "../app/features/courses/data/repository"
import type {
  CatalogueFile,
  CourseDetail,
  DetailsFile,
  PrerequisitesFile,
  SemestersFile,
} from "../app/features/courses/domain/types"
import { CourseDetailsScreen } from "../app/features/courses/screens/CourseDetailsScreen"
import { ThemeProvider } from "../app/theme/context"

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual<typeof import("@react-navigation/native")>(
    "@react-navigation/native",
  )
  return { ...actual, useScrollToTop: jest.fn() }
})

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

const semestersFile: SemestersFile = {
  schemaVersion: 1,
  semesters: [
    {
      termNum: 3,
      termCode: "new",
      termName: "New Semester",
      academicYear: "2026-27",
      courseCount: 1,
      departments: [],
    },
    {
      termNum: 2,
      termCode: "old",
      termName: "Old Semester",
      academicYear: "2025-26",
      courseCount: 1,
      departments: [],
    },
    {
      termNum: 1,
      termCode: "missing",
      termName: "Unavailable Semester",
      academicYear: "2025-26",
      courseCount: 0,
      departments: [],
    },
  ],
}

function catalogue(termCode: string, available = false): CatalogueFile {
  return {
    schemaVersion: 1,
    termCode,
    courses: available
      ? [
          {
            id: `${termCode}-course-id`,
            code: "COMP 1021",
            normalizedCode: "comp1021",
            title: "Course title",
            normalizedTitle: "coursetitle",
            departmentCode: "COMP",
            minCredits: 3,
            maxCredits: 3,
          },
        ]
      : [],
  }
}

function courseDetail(termCode: string, overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    id: `${termCode}-course-id`,
    code: "COMP 1021",
    prefix: "COMP",
    number: "1021",
    title: termCode === "new" ? "Introduction to Computer Science" : "Computing Fundamentals",
    termNum: termCode === "new" ? 3 : 2,
    termCode,
    termName: termCode === "new" ? "New Semester" : "Old Semester",
    academicYear: "2026-27",
    minCredits: 3,
    maxCredits: 3,
    vector: "",
    vectorDisplay: "[3 Credit(s)]",
    description: `Description for ${termCode}.`,
    campusCode: "MAIN",
    campusName: "CWB Campus",
    campusNickname: "CWB",
    departmentCode: "COMP",
    departmentNickname: termCode === "new" ? "CSE" : "SENG",
    schoolCode: "SENG",
    careerCode: "UGRD",
    careerType: termCode === "new" ? "UG" : "PG",
    previous: "",
    alternate: "COMP 1020",
    prerequisite: "MATH 1012 AND COMP 1001",
    corequisite: "COMP 1002",
    exclusion: "COMP 1022P",
    background: "Prior programming experience is helpful.",
    colist: "",
    equivalence: "",
    reference: "Reference material",
    attributes: [{ label: "A", value: "1", description: "Common Core attribute" }],
    learningOutcomes: ["Write and test computer programs."],
    sourceTimestamp: "2026-07-20T21:35:56.478000Z",
    status: "ACTIVE",
    ...overrides,
  }
}

function details(termCode: string, courses: CourseDetail[] = []): DetailsFile {
  return {
    schemaVersion: 1,
    termCode,
    coursesByCode: Object.fromEntries(courses.map((course) => [course.code, course])),
  }
}

function prerequisites(termCode: string): PrerequisitesFile {
  return {
    schemaVersion: 1,
    termCode,
    byCourseCode: {},
    reverseByCourseCode: {},
  }
}

function createRepository(
  overrides: Partial<
    Record<"new" | "old" | "missing", () => DetailsFile | Promise<DetailsFile>>
  > = {},
) {
  return new CourseRepository({
    semestersFile,
    catalogueLoaders: {
      new: () => catalogue("new", true),
      old: () => catalogue("old", true),
      missing: () => catalogue("missing"),
    },
    detailsLoaders: {
      new: overrides.new ?? (() => details("new", [courseDetail("new")])),
      old: overrides.old ?? (() => details("old", [courseDetail("old")])),
      missing: overrides.missing ?? (() => details("missing")),
    },
    prerequisitesLoaders: {
      new: () => prerequisites("new"),
      old: () => prerequisites("old"),
      missing: () => prerequisites("missing"),
    },
  })
}

function renderDetails(repository: CourseRepository, termCode = "new") {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() }
  const route = {
    key: "course-details-test",
    name: "CourseDetails" as const,
    params: { courseCode: "COMP 1021", termCode },
  }
  const screen = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CourseDetailsScreen
          navigation={navigation as never}
          repository={repository}
          route={route}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  )
  return { navigation, screen }
}

describe("CourseDetailsScreen", () => {
  test("renders the main course content and preserves original requirement text", async () => {
    const { navigation, screen } = renderDetails(createRepository())

    expect(await screen.findByText("Introduction to Computer Science")).toBeTruthy()
    expect(screen.getByText("CSE | COMP 1021")).toBeTruthy()
    expect(screen.getByText("3 credits")).toBeTruthy()
    expect(screen.getByText("Description for new.")).toBeTruthy()
    expect(screen.queryByText("CWB Campus")).toBeNull()
    expect(screen.getByText("UG")).toBeTruthy()
    expect(screen.getByText("MATH 1012 AND COMP 1001")).toBeTruthy()
    expect(screen.getByText("COMP 1002")).toBeTruthy()
    expect(screen.getByText("COMP 1022P")).toBeTruthy()

    const rendered = JSON.stringify(screen.toJSON())
    expect(rendered.indexOf("Introduction to Computer Science")).toBeLessThan(
      rendered.indexOf("CSE | COMP 1021"),
    )
    expect(rendered.indexOf("CSE | COMP 1021")).toBeLessThan(rendered.indexOf("3 credits"))
    expect(rendered.indexOf("3 credits")).toBeLessThan(rendered.indexOf("UG"))
    expect(rendered.indexOf("UG")).toBeLessThan(rendered.indexOf("details-semester-selector"))

    fireEvent.press(screen.getByLabelText("Attributes (1)"))
    expect(screen.getByText("Common Core attribute")).toBeTruthy()
    fireEvent.press(screen.getByLabelText("Learning Outcomes (1)"))
    expect(screen.getByText("Write and test computer programs.")).toBeTruthy()

    fireEvent.press(screen.getByText("Explore Dependency Graph"))
    expect(navigation.navigate).toHaveBeenCalledWith("DependencyExplorer", {
      courseCode: "COMP 1021",
      termCode: "new",
    })
  })

  test("omits empty fields while retaining non-empty uncommon catalogue fields", async () => {
    const { screen } = renderDetails(createRepository())
    await screen.findByText("Introduction to Computer Science")

    expect(screen.queryByText("N/A")).toBeNull()
    expect(screen.queryByText("CWB Campus")).toBeNull()
    expect(screen.queryByText("DEPARTMENT")).toBeNull()
    expect(screen.queryByText("CAREER")).toBeNull()
    fireEvent.press(screen.getByLabelText("More Course Information"))
    expect(screen.getByText("Campus")).toBeTruthy()
    expect(screen.getByText("CWB Campus")).toBeTruthy()
    expect(screen.queryByText("Course format")).toBeNull()
    expect(screen.queryByText("Source updated")).toBeNull()
    expect(screen.getByText("Alternate")).toBeTruthy()
    expect(screen.getByText("COMP 1020")).toBeTruthy()
    expect(screen.getByText("Background")).toBeTruthy()
    expect(screen.getByText("Reference material")).toBeTruthy()
    expect(screen.queryByText("Previous")).toBeNull()
    expect(screen.queryByText("Co-list")).toBeNull()

    const rendered = JSON.stringify(screen.toJSON())
    expect(rendered.indexOf("School")).toBeLessThan(rendered.indexOf("Campus"))
  })

  test("disables unavailable semesters and loads the selected available version", async () => {
    const { screen } = renderDetails(createRepository())
    await screen.findByText("Introduction to Computer Science")

    fireEvent.press(screen.getByTestId("details-semester-selector"))

    await waitFor(() =>
      expect(screen.getByLabelText("Unavailable Semester").props.accessibilityState).toMatchObject({
        disabled: true,
      }),
    )
    const oldSemester = screen.getByLabelText("Old Semester")
    expect(oldSemester.props.accessibilityState).toMatchObject({ disabled: false })
    fireEvent.press(oldSemester)

    expect(await screen.findByText("Computing Fundamentals")).toBeTruthy()
    expect(screen.getByText("Description for old.")).toBeTruthy()
    expect(screen.getByText("SENG | COMP 1021")).toBeTruthy()
    expect(screen.getByText("PG")).toBeTruthy()
    expect(screen.queryByText("CSE | COMP 1021")).toBeNull()
    expect(screen.queryByText("UG")).toBeNull()
  })

  test("omits empty department, career, and campus values without malformed badges", async () => {
    const emptyIdentityDetail = courseDetail("new", {
      campusCode: "",
      campusName: "",
      campusNickname: "",
      careerCode: "",
      careerType: "",
      departmentCode: "",
      departmentNickname: "",
    })
    const { screen } = renderDetails(
      createRepository({ new: () => details("new", [emptyIdentityDetail]) }),
    )

    await screen.findByText("Introduction to Computer Science")
    expect(screen.getByTestId("department-course-code")).toHaveTextContent("COMP 1021")
    expect(screen.getByTestId("department-course-code")).not.toHaveTextContent("|")
    expect(screen.queryByTestId("course-career")).toBeNull()

    fireEvent.press(screen.getByLabelText("More Course Information"))
    expect(screen.queryByText("Campus")).toBeNull()
    expect(screen.queryByText("N/A")).toBeNull()
  })

  test("renders loading, missing, and error states", async () => {
    let resolveDetails: ((value: DetailsFile) => void) | undefined
    const pendingDetails = new Promise<DetailsFile>((resolve) => {
      resolveDetails = resolve
    })
    const loading = renderDetails(createRepository({ new: () => pendingDetails }))
    expect(loading.screen.getByLabelText("Loading course details")).toBeTruthy()
    loading.screen.unmount()
    resolveDetails?.(details("new", [courseDetail("new")]))

    const missing = renderDetails(createRepository({ new: () => details("new") }))
    expect(await missing.screen.findByText("COMP 1021 is unavailable")).toBeTruthy()
    missing.screen.unmount()

    const error = renderDetails(
      createRepository({ new: () => Promise.reject(new Error("Broken details shard")) }),
    )
    expect(await error.screen.findByText("Could not load course details")).toBeTruthy()
    expect(error.screen.getByText("Broken details shard")).toBeTruthy()
  })
})
