import { fireEvent, render, waitFor, within } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { CourseRepository } from "../app/features/courses/data/repository"
import type {
  CatalogueCourse,
  CatalogueFile,
  CourseDetail,
  DetailsFile,
  PrerequisitesFile,
  SectionsFile,
  CourseSection,
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
  const catalogueCourse = (code: string): CatalogueCourse => ({
    id: `${termCode}-${code}`,
    code,
    normalizedCode: code.replaceAll(" ", "").toLowerCase(),
    title: `${code} title`,
    normalizedTitle: `${code.replaceAll(" ", "").toLowerCase()}title`,
    departmentCode: code.split(" ")[0],
    minCredits: 3,
    maxCredits: 3,
  })

  return {
    schemaVersion: 1,
    termCode,
    courses: available
      ? [catalogueCourse("COMP 1021"), catalogueCourse("COMP 1001"), catalogueCourse("MATH 1012")]
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

function prerequisites(
  termCode: string,
  byCourseCode: PrerequisitesFile["byCourseCode"] = {},
): PrerequisitesFile {
  return {
    schemaVersion: 1,
    termCode,
    byCourseCode,
    reverseByCourseCode: {},
  }
}

function section(overrides: Partial<CourseSection> = {}): CourseSection {
  return {
    section: "L1",
    classNumber: 100,
    type: "LEC",
    role: "E",
    association: 1,
    capacity: 50,
    enrolled: 40,
    waitlisted: 2,
    consentRequired: true,
    open: true,
    meetings: [
      {
        weekday: "Mon",
        dateFrom: "2026-09-01",
        dateTo: "2026-11-30",
        timeFrom: "14:00",
        timeTo: "15:20",
        venue: "LTA",
        venueName: "Lecture Theater A",
        instructors: ["Prof A"],
      },
    ],
    reservations: [{ name: "COMP", quota: 10, enrolled: 8 }],
    remarks: "Bring notes",
    snapshotAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  }
}

function sections(termCode: string, records: CourseSection[] = []): SectionsFile {
  return {
    schemaVersion: 1,
    termCode,
    sectionsByCourseId: records.length ? { [`${termCode}-course-id`]: records } : {},
  }
}

type TermCode = "new" | "old" | "missing"
type DetailsLoaders = Partial<Record<TermCode, () => DetailsFile | Promise<DetailsFile>>>
type PrerequisitesLoaders = Partial<
  Record<TermCode, () => PrerequisitesFile | Promise<PrerequisitesFile>>
>
type SectionsLoaders = Partial<Record<TermCode, () => SectionsFile | Promise<SectionsFile>>>

function createRepository(
  detailsOverrides: DetailsLoaders = {},
  prerequisitesOverrides: PrerequisitesLoaders = {},
  sectionsOverrides: SectionsLoaders = {},
) {
  return new CourseRepository({
    semestersFile,
    catalogueLoaders: {
      new: () => catalogue("new", true),
      old: () => catalogue("old", true),
      missing: () => catalogue("missing"),
    },
    detailsLoaders: {
      new: detailsOverrides.new ?? (() => details("new", [courseDetail("new")])),
      old: detailsOverrides.old ?? (() => details("old", [courseDetail("old")])),
      missing: detailsOverrides.missing ?? (() => details("missing")),
    },
    prerequisitesLoaders: {
      new: prerequisitesOverrides.new ?? (() => prerequisites("new")),
      old: prerequisitesOverrides.old ?? (() => prerequisites("old")),
      missing: prerequisitesOverrides.missing ?? (() => prerequisites("missing")),
    },
    sectionsLoaders: {
      new: sectionsOverrides.new ?? (() => sections("new")),
      old: sectionsOverrides.old ?? (() => sections("old")),
      missing: sectionsOverrides.missing ?? (() => sections("missing")),
    },
  })
}

function renderDetails(repository: CourseRepository, termCode = "new", parentCourseCode?: string) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), push: jest.fn() }
  const route = {
    key: "course-details-test",
    name: "CourseDetails" as const,
    params: { courseCode: "COMP 1021", parentCourseCode, termCode },
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
    const originalPrerequisite = "MATH 1012 AND (MATH 1012 OR PHYS 1000)"
    const repository = createRepository(
      {
        new: () => details("new", [courseDetail("new", { prerequisite: originalPrerequisite })]),
      },
      {
        new: () =>
          prerequisites("new", {
            "COMP 1021": {
              originalText: originalPrerequisite,
              referencedCourseCodes: ["MATH 1012", "PHYS 1000"],
            },
            "MATH 1012": {
              originalText: "COMP 1001",
              referencedCourseCodes: ["COMP 1001"],
            },
          }),
      },
    )
    const resolveSpy = jest.spyOn(repository, "resolveDependencyGraph")
    const { navigation, screen } = renderDetails(repository)

    expect(await screen.findByText("Introduction to Computer Science")).toBeTruthy()
    expect(screen.getByText("Catalogue")).toBeTruthy()
    expect(screen.getByLabelText("Back to catalogue")).toBeTruthy()
    expect(screen.getByText("CSE | COMP 1021")).toBeTruthy()
    expect(screen.getByText("3 credits")).toBeTruthy()
    expect(screen.getByText("Description for new.")).toBeTruthy()
    const backTriangle = screen
      .UNSAFE_getAllByProps({ testID: "details-back-triangle" })
      .find((candidate) => Array.isArray(candidate.props.style))
    const semesterTriangle = screen
      .UNSAFE_getAllByProps({ testID: "details-semester-triangle" })
      .find((candidate) => Array.isArray(candidate.props.style))
    expect(backTriangle?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRightWidth: 8 })]),
    )
    expect(semesterTriangle?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderTopWidth: 7 })]),
    )
    expect(screen.queryByText("CWB Campus")).toBeNull()
    expect(screen.getByText("UG")).toBeTruthy()
    expect(screen.getByText(originalPrerequisite)).toBeTruthy()
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

    expect(await screen.findByText("AND")).toBeTruthy()
    expect(screen.getByText("OR")).toBeTruthy()
    expect(screen.getByText("Repeated")).toBeTruthy()
    expect(screen.getAllByTestId("dependency-node-MATH 1012")).toHaveLength(2)
    expect(screen.getByTestId("dependency-node-PHYS 1000")).toBeDisabled()
    expect(screen.getByText("Not Offered: New Semester")).toBeTruthy()
    expect(screen.queryByText("REQUIRES")).toBeNull()
    expect(screen.queryByText("MATH 1012 title")).toBeNull()
    expect(resolveSpy).toHaveBeenCalledWith("new", "COMP 1021", 1)

    fireEvent.press(screen.getAllByTestId("dependency-node-MATH 1012")[0])
    expect(navigation.push).toHaveBeenCalledWith("CourseDetails", {
      courseCode: "MATH 1012",
      parentCourseCode: "COMP 1021",
      termCode: "new",
    })

    expect(screen.queryByText("Explore Dependency Graph")).toBeNull()
    fireEvent.press(screen.getByText("View In Fullscreen"))
    expect(navigation.navigate).toHaveBeenCalledWith("DependencyExplorerFullscreen", {
      courseCode: "COMP 1021",
      termCode: "new",
    })
  })

  test("labels dependency child navigation as Back", async () => {
    const { navigation, screen } = renderDetails(createRepository(), "new", "COMP 2011")

    await screen.findByText("Introduction to Computer Science")
    expect(screen.queryByText("Catalogue")).toBeNull()
    expect(screen.getByText("Back")).toBeTruthy()

    fireEvent.press(screen.getByLabelText("Back to COMP 2011"))
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("renders compact course codes on two lines at the separator", async () => {
    const prerequisite = "COMP 1023 OR COMP 1028"
    const { screen } = renderDetails(
      createRepository(
        { new: () => details("new", [courseDetail("new", { prerequisite })]) },
        {
          new: () =>
            prerequisites("new", {
              "COMP 1021": {
                originalText: prerequisite,
                referencedCourseCodes: ["COMP 1023", "COMP 1028"],
              },
            }),
        },
      ),
    )

    for (const courseCode of ["COMP 1023", "COMP 1028"]) {
      const node = await screen.findByTestId(`dependency-node-${courseCode}`)
      expect(within(node).getByText(courseCode.replace(" ", "\n"))).toHaveProp("numberOfLines", 2)
      expect(node.props.accessibilityLabel).toContain(courseCode)
    }
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
    const { screen } = renderDetails(
      createRepository(
        {},
        {
          new: () =>
            prerequisites("new", {
              "COMP 1021": {
                originalText: "COMP 1001",
                referencedCourseCodes: ["COMP 1001"],
              },
            }),
          old: () =>
            prerequisites("old", {
              "COMP 1021": {
                originalText: "MATH 1012",
                referencedCourseCodes: ["MATH 1012"],
              },
            }),
        },
      ),
    )
    await screen.findByText("Introduction to Computer Science")
    expect(await screen.findByTestId("dependency-node-COMP 1001")).toBeTruthy()

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
    expect(await screen.findByTestId("dependency-node-MATH 1012")).toBeTruthy()
    expect(screen.queryByTestId("dependency-node-COMP 1001")).toBeNull()
  })

  test("renders inline dependency loading, retry, empty, and extracted states", async () => {
    let resolvePrerequisites: ((file: PrerequisitesFile) => void) | undefined
    const pendingPrerequisites = new Promise<PrerequisitesFile>((resolve) => {
      resolvePrerequisites = resolve
    })
    const loading = renderDetails(createRepository({}, { new: () => pendingPrerequisites }))
    await loading.screen.findByText("Introduction to Computer Science")
    expect(loading.screen.getByLabelText("Loading dependency graph")).toBeTruthy()
    loading.screen.unmount()
    resolvePrerequisites?.(prerequisites("new"))

    const prerequisitesLoader = jest
      .fn<PrerequisitesFile | Promise<PrerequisitesFile>, []>()
      .mockRejectedValueOnce(new Error("Broken prerequisite shard"))
      .mockReturnValue(prerequisites("new"))
    const retry = renderDetails(createRepository({}, { new: prerequisitesLoader }))
    expect(await retry.screen.findByText("Could not load dependency graph")).toBeTruthy()
    expect(retry.screen.getByText("Broken prerequisite shard")).toBeTruthy()
    fireEvent.press(retry.screen.getByText("Retry dependency graph"))
    expect(await retry.screen.findByText("No prerequisites")).toBeTruthy()
    expect(prerequisitesLoader).toHaveBeenCalledTimes(2)
    retry.screen.unmount()

    const extracted = renderDetails(
      createRepository(
        {},
        {
          new: () =>
            prerequisites("new", {
              "COMP 1021": {
                originalText: "Any CHEM course at or above 1000-level or CORE 1120",
                referencedCourseCodes: [],
              },
            }),
        },
      ),
    )
    expect(await extracted.screen.findAllByText("Extracted courses")).toHaveLength(2)
    expect(extracted.screen.getByTestId("dependency-node-CORE 1120")).toBeDisabled()
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

  test("shows archived sections and reloads them for the selected semester", async () => {
    const repository = createRepository(
      {},
      {},
      {
        new: () => sections("new", [section({ remarks: "New section note" })]),
        old: () =>
          sections("old", [section({ section: "T2", type: "TUT", remarks: "Old section note" })]),
      },
    )
    const { screen } = renderDetails(repository)
    expect(await screen.findByText("View 1 section")).toBeTruthy()
    fireEvent.press(screen.getByLabelText("View 1 section"))
    expect(screen.getByText("L1")).toBeTruthy()
    expect(screen.getByText("40/50")).toBeTruthy()
    expect(screen.getByText("Wait")).toBeTruthy()
    expect(screen.getByText("Mon 14:00–15:20 · Lecture Theater A")).toBeTruthy()
    expect(screen.getByText("Prof A")).toBeTruthy()
    expect(screen.getByText("Snapshot 01-09-2026")).toBeTruthy()
    expect(screen.getByText("Lecture")).toBeTruthy()
    expect(screen.getByText(/Archived schedule snapshot/)).toBeTruthy()
    fireEvent.press(screen.getByLabelText("More section information"))
    expect(screen.getByText("New section note")).toBeTruthy()
    expect(screen.getByText("COMP: 8 / 10 reserved places")).toBeTruthy()

    fireEvent.press(screen.getByTestId("details-semester-selector"))
    fireEvent.press(screen.getByLabelText("Old Semester"))
    expect(await screen.findByText("Computing Fundamentals")).toBeTruthy()
    await screen.findByText("View 1 section")
    const oldSectionsButton = screen.getByLabelText("View 1 section")
    if (!oldSectionsButton.props.accessibilityState.expanded) fireEvent.press(oldSectionsButton)
    expect(await screen.findByText("T2")).toBeTruthy()
    expect(screen.queryByText("L1")).toBeNull()
    expect(screen.queryByText("New section note")).toBeNull()
  })

  test("omits empty sections, shows loading, and retries a failed section shard", async () => {
    const empty = renderDetails(createRepository())
    await empty.screen.findByText("Introduction to Computer Science")
    await waitFor(() => expect(empty.screen.queryByTestId("course-sections-loading")).toBeNull())
    expect(empty.screen.queryByTestId("course-sections")).toBeNull()
    empty.screen.unmount()

    let resolveSections: ((value: SectionsFile) => void) | undefined
    const pending = new Promise<SectionsFile>((resolve) => {
      resolveSections = resolve
    })
    const loading = renderDetails(createRepository({}, {}, { new: () => pending }))
    await loading.screen.findByText("Introduction to Computer Science")
    expect(loading.screen.getByTestId("course-sections-loading")).toBeTruthy()
    loading.screen.unmount()
    resolveSections?.(sections("new"))

    const loader = jest
      .fn<SectionsFile | Promise<SectionsFile>, []>()
      .mockRejectedValueOnce(new Error("Broken sections shard"))
      .mockReturnValue(sections("new", [section()]))
    const retry = renderDetails(createRepository({}, {}, { new: loader }))
    expect(await retry.screen.findByText("Could not load sections")).toBeTruthy()
    expect(retry.screen.getByText("Broken sections shard")).toBeTruthy()
    fireEvent.press(retry.screen.getByText("Retry sections"))
    expect(await retry.screen.findByText("View 1 section")).toBeTruthy()
    expect(loader).toHaveBeenCalledTimes(2)
  })

  test("reveals large section lists in batches", async () => {
    const records = Array.from({ length: 12 }, (_, index) =>
      section({ section: `L${index + 1}`, remarks: "", reservations: [], association: null }),
    )
    const { screen } = renderDetails(
      createRepository({}, {}, { new: () => sections("new", records) }),
    )
    await screen.findByText("View 12 sections")
    fireEvent.press(screen.getByLabelText("View 12 sections"))
    expect(screen.getByText("L10")).toBeTruthy()
    expect(screen.queryByText("L11")).toBeNull()
    fireEvent.press(screen.getByTestId("sections-show-more"))
    expect(screen.getByText("L11")).toBeTruthy()
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
