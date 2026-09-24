import {
  buildGeneratedCourseData,
  extractReferencedCourseCodes,
  normalizeSearchText,
} from "../scripts/course-data/core"
import { SourceCourse } from "../scripts/course-data/types"

function sourceCourse(overrides: Partial<SourceCourse> = {}): SourceCourse {
  return {
    id: "course-id",
    term_num: 104,
    term_code: "2610",
    term_name: "2026-27 Fall",
    academic_year: "2026-27",
    campus_code: "MAIN",
    campus_name: "CWB Campus",
    campus_nickname: "CWB",
    department_code: "COMP",
    department_nickname: "COMP",
    school_code: "SENG",
    career_code: "UGRD",
    career_type: "UG",
    prefix: "COMP",
    number: "2023",
    title: "Data Structures",
    min_credits: 3,
    max_credits: 3,
    vector: "",
    vector_display: "[3 Credit(s)]",
    description: "A course description.",
    previous: "",
    alternate: "",
    prerequisite: "COMP 1023 AND (MATH1234 OR MATH-1235)",
    corequisite: "",
    exclusion: "",
    background: "",
    colist: "",
    equivalence: "",
    reference: "",
    attributes: [],
    cilos: [{ description: "Explain data structures." }],
    timestamp: "2026-07-20T21:35:56.478000Z",
    status: "ACTIVE",
    ...overrides,
  }
}

describe("course-data preprocessing", () => {
  const knownPrefixes = new Set(["COMP", "MATH"])

  test("normalizes case, whitespace, and hyphens for search", () => {
    expect(normalizeSearchText("  Comp- 2023 ")).toBe("comp2023")
    expect(normalizeSearchText("Data- Structures")).toBe("datastructures")
  })

  test("extracts and deduplicates spaced, compact, and hyphenated course codes", () => {
    expect(
      extractReferencedCourseCodes(
        "COMP 1023 and MATH1234 or MATH-1235; COMP1023 from 2011 OR 1106",
        knownPrefixes,
      ),
    ).toEqual(["COMP 1023", "MATH 1234", "MATH 1235"])
  })

  test("builds sorted semester shards and forward/reverse prerequisite indexes", () => {
    const generated = buildGeneratedCourseData([
      sourceCourse(),
      sourceCourse({
        id: "prerequisite-id",
        number: "1023",
        title: "Introduction to Programming",
        prerequisite: "",
      }),
      sourceCourse({
        id: "older-id",
        term_num: 103,
        term_code: "2540",
        term_name: "2025-26 Summer",
        academic_year: "2025-26",
        department_code: "MATH",
        department_nickname: "MATH",
        prefix: "MATH",
        number: "1234",
        title: "A Previously Offered Mathematics Course",
        prerequisite: "",
      }),
    ])

    expect(generated.semesters.semesters.map(({ termCode }) => termCode)).toEqual(["2610", "2540"])
    expect(generated.catalogues.get("2610")?.courses.map(({ code }) => code)).toEqual([
      "COMP 1023",
      "COMP 2023",
    ])
    expect(
      generated.prerequisites.get("2610")?.byCourseCode["COMP 2023"].referencedCourseCodes,
    ).toEqual(["COMP 1023", "MATH 1234", "MATH 1235"])
    expect(generated.prerequisites.get("2610")?.reverseByCourseCode["COMP 1023"]).toEqual([
      "COMP 2023",
    ])
  })

  test("rejects duplicate course codes within a semester", () => {
    expect(() =>
      buildGeneratedCourseData([sourceCourse(), sourceCourse({ id: "duplicate-id" })]),
    ).toThrow("Duplicate course COMP 2023 in term 2610")
  })
})
