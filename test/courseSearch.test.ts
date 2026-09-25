import { formatCredits } from "../app/features/courses/components/CourseCard"
import { catalogueFilterReducer } from "../app/features/courses/domain/catalogueFilters"
import type { CatalogueCourse } from "../app/features/courses/domain/types"
import { normalizeCourseSearch, searchCourses } from "../app/features/courses/utils/searchCourses"

function course(overrides: Partial<CatalogueCourse> = {}): CatalogueCourse {
  const code = overrides.code ?? "COMP 1000"
  const title = overrides.title ?? "Programming Fundamentals"
  return {
    id: overrides.id ?? code,
    code,
    normalizedCode: normalizeCourseSearch(code),
    title,
    normalizedTitle: normalizeCourseSearch(title),
    departmentCode: overrides.departmentCode ?? code.split(" ")[0],
    minCredits: overrides.minCredits ?? 3,
    maxCredits: overrides.maxCredits ?? 3,
  }
}

describe("course catalogue search", () => {
  const courses = [
    course({ code: "MATH 2000", title: "Introduction to COMP-1000 Systems" }),
    course({ code: "COMP 1000A", title: "Honors Programming" }),
    course({ code: "MATH 1000", title: "Comp 1000 Concepts" }),
    course({ code: "COMP 1000", title: "Programming Fundamentals" }),
    course({ code: "PHYS 1000", title: "Mechanics" }),
  ]

  test("normalizes case, spaces, and hyphens", () => {
    expect(normalizeCourseSearch("  Comp- 10 00 ")).toBe("comp1000")
  })

  test("ranks exact code, code prefix, title prefix, then substring", () => {
    expect(searchCourses(courses, { query: "comp-1000" }).map(({ code }) => code)).toEqual([
      "COMP 1000",
      "COMP 1000A",
      "MATH 1000",
      "MATH 2000",
    ])
  })

  test("filters by department before applying search", () => {
    expect(
      searchCourses(courses, { query: "1000", departmentCode: "MATH" }).map(({ code }) => code),
    ).toEqual(["MATH 1000", "MATH 2000"])
  })

  test("sorts by course code when the query is empty", () => {
    expect(searchCourses(courses).map(({ code }) => code)).toEqual([
      "COMP 1000",
      "COMP 1000A",
      "MATH 1000",
      "MATH 2000",
      "PHYS 1000",
    ])
  })

  test("formats fixed and variable credits", () => {
    expect(formatCredits(1, 1)).toBe("1 credit")
    expect(formatCredits(3, 3)).toBe("3 credits")
    expect(formatCredits(1.5, 3)).toBe("1.5–3 credits")
  })

  test("clears search and department when the semester changes", () => {
    expect(
      catalogueFilterReducer(
        { termCode: "2610", departmentCode: "COMP", query: "data" },
        { type: "setSemester", termCode: "2540" },
      ),
    ).toEqual({ termCode: "2540", departmentCode: "", query: "" })
  })
})
