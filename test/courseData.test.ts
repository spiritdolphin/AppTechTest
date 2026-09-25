import {
  buildGeneratedCourseData,
  extractReferencedCourseCodes,
  normalizeSearchText,
  parseSourceCourses,
  sha256,
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

  test("parses a valid source course and calculates stable fingerprints", () => {
    const course = sourceCourse()

    expect(parseSourceCourses(JSON.stringify([course]))).toEqual([course])
    expect(sha256("UST Course Explorer")).toBe(
      "c64ba4ce9c9ce4d0d816a6c0d459bfa4a85b568f2e68c61b75b803257b5a670f",
    )
  })

  test.each([
    ["a non-array root", {}, "courses.json must contain an array"],
    ["a non-object course", [null], "courses[0] must be an object"],
    [
      "a missing string",
      [{ ...sourceCourse(), title: undefined }],
      "courses[0].title must be a string",
    ],
    [
      "a non-finite number",
      [{ ...sourceCourse(), term_num: null }],
      "courses[0].term_num must be a finite number",
    ],
    [
      "invalid attributes",
      [{ ...sourceCourse(), attributes: {} }],
      "courses[0].attributes must be an array",
    ],
    [
      "an invalid attribute",
      [{ ...sourceCourse(), attributes: [null] }],
      "courses[0].attributes[0] must be an object",
    ],
    [
      "an invalid attribute label",
      [
        {
          ...sourceCourse(),
          attributes: [{ label: 1, value: "A", description: "Attribute" }],
        },
      ],
      "courses[0].attributes[0].label must be a string",
    ],
    [
      "an invalid attribute value",
      [
        {
          ...sourceCourse(),
          attributes: [{ label: "A", value: 1, description: "Attribute" }],
        },
      ],
      "courses[0].attributes[0].value must be a string",
    ],
    [
      "an invalid attribute description",
      [
        {
          ...sourceCourse(),
          attributes: [{ label: "A", value: "A", description: 1 }],
        },
      ],
      "courses[0].attributes[0].description must be a string",
    ],
    [
      "invalid learning outcomes",
      [{ ...sourceCourse(), cilos: {} }],
      "courses[0].cilos must be an array",
    ],
    [
      "an invalid learning outcome",
      [{ ...sourceCourse(), cilos: [null] }],
      "courses[0].cilos[0] must be an object",
    ],
    [
      "an invalid learning outcome description",
      [{ ...sourceCourse(), cilos: [{ description: 1 }] }],
      "courses[0].cilos[0].description must be a string",
    ],
    [
      "an empty identity field",
      [{ ...sourceCourse(), term_code: "" }],
      "courses[0] is missing a required course identity field",
    ],
  ])("rejects %s", (_case, value, message) => {
    expect(() => parseSourceCourses(JSON.stringify(value))).toThrow(message)
  })

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

  test("rejects empty input and inconsistent metadata within one semester", () => {
    expect(() => buildGeneratedCourseData([])).toThrow("courses.json contains no courses")
    expect(() =>
      buildGeneratedCourseData([
        sourceCourse(),
        sourceCourse({ id: "inconsistent", number: "2024", term_name: "Wrong Semester" }),
      ]),
    ).toThrow("Inconsistent semester metadata for term 2610")
  })

  test("sorts department summaries and falls back to the department code for an empty name", () => {
    const generated = buildGeneratedCourseData([
      sourceCourse(),
      sourceCourse({
        id: "accounting-id",
        department_code: "ACCT",
        department_nickname: "",
        prefix: "ACCT",
        number: "1010",
        prerequisite: "",
      }),
    ])

    expect(generated.semesters.semesters[0].departments).toEqual([
      { code: "ACCT", name: "ACCT", courseCount: 1 },
      { code: "COMP", name: "COMP", courseCount: 1 },
    ])
  })
})
