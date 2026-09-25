import { courseRepository } from "../app/features/courses/data/generatedCourseRepository"
import { CourseRepository } from "../app/features/courses/data/repository"
import type { CatalogueFile, SemestersFile } from "../app/features/courses/domain/types"

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

function catalogue(termCode: string): CatalogueFile {
  return { schemaVersion: 1, termCode, courses: [] }
}

describe("CourseRepository", () => {
  test("uses the newest generated semester", () => {
    const repository = new CourseRepository({
      semestersFile,
      catalogueLoaders: {
        new: () => catalogue("new"),
        old: () => catalogue("old"),
      },
    })

    expect(repository.getLatestSemester().termCode).toBe("new")
    expect(repository.getSemesters()).toHaveLength(2)
  })

  test("loads each catalogue lazily and caches it", async () => {
    const loader = jest.fn(() => catalogue("new"))
    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: loader },
    })

    const first = await repository.loadCatalogue("new")
    const second = await repository.loadCatalogue("new")

    expect(first).toBe(second)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  test("rejects missing or mismatched catalogue loaders", async () => {
    expect(
      () =>
        new CourseRepository({ semestersFile, catalogueLoaders: { new: () => catalogue("new") } }),
    ).toThrow("Missing catalogue loader for semester old")

    const repository = new CourseRepository({
      semestersFile: { ...semestersFile, semesters: [semestersFile.semesters[0]] },
      catalogueLoaders: { new: () => catalogue("wrong") },
    })
    await expect(repository.loadCatalogue("new")).rejects.toThrow(
      "Catalogue term mismatch: expected new, got wrong",
    )
    await expect(repository.loadCatalogue("missing")).rejects.toThrow("Unknown semester: missing")
  })

  test("loads the committed latest-semester catalogue", async () => {
    expect(courseRepository.getLatestSemester().termCode).toBe("2610")
    await expect(courseRepository.loadCatalogue("2610")).resolves.toMatchObject({
      termCode: "2610",
      courses: expect.arrayContaining([expect.objectContaining({ code: "COMP 1021" })]),
    })
  })
})
