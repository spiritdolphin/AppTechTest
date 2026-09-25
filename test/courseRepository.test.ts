import { courseRepository } from "../app/features/courses/data/generatedCourseRepository"
import { CourseRepository } from "../app/features/courses/data/repository"
import type {
  CatalogueFile,
  CourseDetail,
  DetailsFile,
  PrerequisitesFile,
  SemestersFile,
} from "../app/features/courses/domain/types"

const semestersFile: SemestersFile = {
  schemaVersion: 1,
  semesters: [
    {
      termNum: 2,
      termCode: "new",
      termName: "New Semester",
      academicYear: "2026-27",
      courseCount: 0,
      departments: [],
    },
    {
      termNum: 1,
      termCode: "old",
      termName: "Old Semester",
      academicYear: "2025-26",
      courseCount: 0,
      departments: [],
    },
  ],
}

function catalogue(termCode: string, courseCodes: string[] = []): CatalogueFile {
  return {
    schemaVersion: 1,
    termCode,
    courses: courseCodes.map((code) => ({
      id: `${termCode}-${code}`,
      code,
      normalizedCode: code.replaceAll(" ", "").toLowerCase(),
      title: "Course title",
      normalizedTitle: "coursetitle",
      departmentCode: code.split(" ")[0],
      minCredits: 3,
      maxCredits: 3,
    })),
  }
}

function courseDetail(termCode: string, overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    id: `${termCode}-course-id`,
    code: "COMP 1021",
    prefix: "COMP",
    number: "1021",
    title: `Introduction to Computer Science (${termCode})`,
    termNum: 1,
    termCode,
    termName: `${termCode} Semester`,
    academicYear: "2026-27",
    minCredits: 3,
    maxCredits: 3,
    vector: "",
    vectorDisplay: "[3 Credit(s)]",
    description: "Course description.",
    campusCode: "MAIN",
    campusName: "CWB Campus",
    campusNickname: "CWB",
    departmentCode: "COMP",
    departmentNickname: "COMP",
    schoolCode: "SENG",
    careerCode: "UGRD",
    careerType: "UG",
    previous: "",
    alternate: "",
    prerequisite: "",
    corequisite: "",
    exclusion: "",
    background: "",
    colist: "",
    equivalence: "",
    reference: "",
    attributes: [],
    learningOutcomes: [],
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

const catalogueLoaders = {
  new: () => catalogue("new", ["COMP 1021"]),
  old: () => catalogue("old"),
}

const detailsLoaders = {
  new: () => details("new", [courseDetail("new")]),
  old: () => details("old"),
}

const prerequisitesLoaders = {
  new: () => prerequisites("new"),
  old: () => prerequisites("old"),
}

describe("CourseRepository", () => {
  test("rejects unsupported or empty semester metadata", () => {
    expect(
      () =>
        new CourseRepository({
          semestersFile: { ...semestersFile, schemaVersion: 2 },
          catalogueLoaders,
          detailsLoaders,
          prerequisitesLoaders,
        }),
    ).toThrow("Unsupported semester schema version: 2")
    expect(
      () =>
        new CourseRepository({
          semestersFile: { ...semestersFile, semesters: [] },
          catalogueLoaders: {},
          detailsLoaders: {},
          prerequisitesLoaders: {},
        }),
    ).toThrow("No course semesters are available")
  })

  test("uses the newest generated semester", () => {
    const repository = new CourseRepository({
      semestersFile,
      catalogueLoaders,
      detailsLoaders,
      prerequisitesLoaders,
    })

    expect(repository.getLatestSemester().termCode).toBe("new")
    expect(repository.getSemesters()).toHaveLength(2)
    expect(repository.getSemester("new")).toBe(semestersFile.semesters[0])
    expect(repository.getSemester("missing")).toBeUndefined()
    expect(repository.getDepartments("new")).toEqual([])
    expect(repository.getDepartments("missing")).toEqual([])
  })

  test("loads each catalogue lazily and caches it", async () => {
    const loader = jest.fn(() => catalogue("new"))
    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: loader },
      detailsLoaders: { new: detailsLoaders.new },
      prerequisitesLoaders: { new: prerequisitesLoaders.new },
    })

    const first = await repository.loadCatalogue("new")
    const second = await repository.loadCatalogue("new")

    expect(first).toBe(second)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  test("rejects missing or mismatched catalogue loaders", async () => {
    expect(
      () =>
        new CourseRepository({
          semestersFile,
          catalogueLoaders: { new: () => catalogue("new") },
          detailsLoaders,
          prerequisitesLoaders,
        }),
    ).toThrow("Missing catalogue loader for semester old")

    expect(
      () =>
        new CourseRepository({
          semestersFile,
          catalogueLoaders,
          detailsLoaders: { new: detailsLoaders.new },
          prerequisitesLoaders,
        }),
    ).toThrow("Missing details loader for semester old")

    expect(
      () =>
        new CourseRepository({
          semestersFile,
          catalogueLoaders,
          detailsLoaders,
          prerequisitesLoaders: { new: prerequisitesLoaders.new },
        }),
    ).toThrow("Missing prerequisites loader for semester old")

    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: () => catalogue("wrong") },
      detailsLoaders: { new: detailsLoaders.new },
      prerequisitesLoaders: { new: prerequisitesLoaders.new },
    })
    await expect(repository.loadCatalogue("new")).rejects.toThrow(
      "Catalogue term mismatch: expected new, got wrong",
    )
    await expect(repository.loadCatalogue("missing")).rejects.toThrow("Unknown semester: missing")
  })

  test("validates catalogue schema and retries a failed loader", async () => {
    const loader = jest
      .fn<CatalogueFile, []>()
      .mockReturnValueOnce({ ...catalogue("new"), schemaVersion: 2 })
      .mockReturnValue(catalogue("new"))
    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: loader },
      detailsLoaders: { new: detailsLoaders.new },
      prerequisitesLoaders: { new: prerequisitesLoaders.new },
    })

    await expect(repository.loadCatalogue("new")).rejects.toThrow(
      "Unsupported catalogue schema version: 2",
    )
    await expect(repository.loadCatalogue("new")).resolves.toMatchObject({ termCode: "new" })
    expect(loader).toHaveBeenCalledTimes(2)
  })

  test("loads details lazily, caches them, and looks up courses", async () => {
    const loader = jest.fn(() => details("new", [courseDetail("new")]))
    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: catalogueLoaders.new },
      detailsLoaders: { new: loader },
      prerequisitesLoaders: { new: prerequisitesLoaders.new },
    })

    const first = await repository.loadDetails("new")
    const second = await repository.loadDetails("new")

    expect(first).toBe(second)
    expect(loader).toHaveBeenCalledTimes(1)
    await expect(repository.getCourseDetail("new", "COMP 1021")).resolves.toMatchObject({
      title: "Introduction to Computer Science (new)",
    })
    await expect(repository.getCourseDetail("new", "MISSING 1000")).resolves.toBeUndefined()
  })

  test("validates details schema and term code and retries a failed loader", async () => {
    const badSchema = jest
      .fn<DetailsFile, []>()
      .mockReturnValueOnce({ ...details("new"), schemaVersion: 2 })
      .mockReturnValue(details("new"))
    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: catalogueLoaders.new },
      detailsLoaders: { new: badSchema },
      prerequisitesLoaders: { new: prerequisitesLoaders.new },
    })

    await expect(repository.loadDetails("new")).rejects.toThrow(
      "Unsupported details schema version: 2",
    )
    await expect(repository.loadDetails("new")).resolves.toMatchObject({ termCode: "new" })
    expect(badSchema).toHaveBeenCalledTimes(2)

    const mismatched = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: catalogueLoaders.new },
      detailsLoaders: { new: () => details("wrong") },
      prerequisitesLoaders: { new: prerequisitesLoaders.new },
    })
    await expect(mismatched.loadDetails("new")).rejects.toThrow(
      "Details term mismatch: expected new, got wrong",
    )
    await expect(mismatched.loadDetails("missing")).rejects.toThrow("Unknown semester: missing")
  })

  test("finds every semester in which a course exists", async () => {
    const repository = new CourseRepository({
      semestersFile,
      catalogueLoaders,
      detailsLoaders,
      prerequisitesLoaders,
    })

    await expect(repository.getAvailableSemestersForCourse("COMP 1021")).resolves.toEqual([
      semestersFile.semesters[0],
    ])
  })

  test("loads, validates, and caches prerequisite indexes", async () => {
    const validFile = prerequisites("new", {
      "COMP 1021": {
        originalText: "MATH 1012",
        referencedCourseCodes: ["MATH 1012"],
      },
    })
    const loader = jest
      .fn<PrerequisitesFile, []>()
      .mockReturnValueOnce({ ...validFile, schemaVersion: 2 })
      .mockReturnValue(validFile)
    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: catalogueLoaders.new },
      detailsLoaders: { new: detailsLoaders.new },
      prerequisitesLoaders: { new: loader },
    })

    await expect(repository.loadPrerequisites("new")).rejects.toThrow(
      "Unsupported prerequisites schema version: 2",
    )
    const loaded = await repository.loadPrerequisites("new")
    expect(await repository.loadPrerequisites("new")).toBe(loaded)
    expect(loader).toHaveBeenCalledTimes(2)
    await expect(repository.getPrerequisiteEntry("new", "COMP 1021")).resolves.toEqual({
      originalText: "MATH 1012",
      referencedCourseCodes: ["MATH 1012"],
    })

    const mismatched = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: catalogueLoaders.new },
      detailsLoaders: { new: detailsLoaders.new },
      prerequisitesLoaders: { new: () => prerequisites("wrong") },
    })
    await expect(mismatched.loadPrerequisites("new")).rejects.toThrow(
      "Prerequisites term mismatch: expected new, got wrong",
    )
    await expect(mismatched.loadPrerequisites("missing")).rejects.toThrow(
      "Unknown semester: missing",
    )
  })

  test("loads the committed latest-semester catalogue", async () => {
    expect(courseRepository.getLatestSemester().termCode).toBe("2610")
    await expect(courseRepository.loadCatalogue("2610")).resolves.toMatchObject({
      termCode: "2610",
      courses: expect.arrayContaining([expect.objectContaining({ code: "COMP 1021" })]),
    })
    await expect(courseRepository.getCourseDetail("2610", "COMP 1021")).resolves.toMatchObject({
      code: "COMP 1021",
      termCode: "2610",
    })
    await expect(courseRepository.getPrerequisiteEntry("2610", "COMP 2011")).resolves.toEqual({
      originalText: "COMP 1023 OR COMP 1028",
      referencedCourseCodes: ["COMP 1023", "COMP 1028"],
    })
    await expect(
      courseRepository.resolveDependencyGraph("2610", "COMP 2011"),
    ).resolves.toMatchObject({
      courseCode: "COMP 2011",
      currentCourseAvailable: true,
      mode: "structured",
      prerequisites: {
        kind: "group",
        operator: "or",
        children: [
          expect.objectContaining({ courseCode: "COMP 1023", available: true }),
          expect.objectContaining({ courseCode: "COMP 1028", available: true }),
        ],
      },
    })
  })
})
