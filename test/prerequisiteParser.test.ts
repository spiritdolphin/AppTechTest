import { parsePrerequisite } from "../app/features/courses/domain/prerequisiteParser"

describe("parsePrerequisite", () => {
  test("treats an empty prerequisite as a complete expression with no courses", () => {
    expect(parsePrerequisite("  ")).toEqual({
      complete: true,
      extractedCourseCodes: [],
      originalText: "  ",
    })
  })

  test.each([
    ["COMP 1023", "COMP 1023"],
    ["COMP1023", "COMP 1023"],
    ["MATH-1234", "MATH 1234"],
  ])("extracts normalized course codes from %s", (text, expectedCode) => {
    expect(parsePrerequisite(text)).toMatchObject({
      complete: true,
      expression: { type: "course", courseCode: expectedCode },
      extractedCourseCodes: [expectedCode],
    })
  })

  test("parses AND, OR, parentheses, and operator precedence", () => {
    expect(parsePrerequisite("COMP 1023 AND (MATH 1234 OR MATH 1235)")).toMatchObject({
      complete: true,
      expression: {
        type: "and",
        children: [
          { type: "course", courseCode: "COMP 1023" },
          {
            type: "or",
            children: [
              { type: "course", courseCode: "MATH 1234" },
              { type: "course", courseCode: "MATH 1235" },
            ],
          },
        ],
      },
    })

    expect(parsePrerequisite("COMP 1023 AND MATH 1234 OR PHYS 1111").expression).toEqual({
      type: "or",
      children: [
        {
          type: "and",
          children: [
            { type: "course", courseCode: "COMP 1023" },
            { type: "course", courseCode: "MATH 1234" },
          ],
        },
        { type: "course", courseCode: "PHYS 1111" },
      ],
    })
  })

  test("inherits a nearby prefix for unambiguous shorthand", () => {
    const options = { allowedPrefixes: new Set(["UFUG"]) }
    expect(parsePrerequisite("UFUG 1103 OR 1106", options)).toMatchObject({
      complete: true,
      expression: {
        type: "or",
        children: [
          { type: "course", courseCode: "UFUG 1103" },
          { type: "course", courseCode: "UFUG 1106" },
        ],
      },
      extractedCourseCodes: ["UFUG 1103", "UFUG 1106"],
    })

    expect(parsePrerequisite("UFUG 1103 OR at least 1106", options).extractedCourseCodes).toEqual([
      "UFUG 1103",
    ])
    expect(parsePrerequisite("UFUG 1103; OR 1106", options).extractedCourseCodes).toEqual([
      "UFUG 1103",
    ])
  })

  test("falls back safely for natural language while retaining legitimate codes", () => {
    expect(parsePrerequisite("Any CHEM course at or above 1000-level or CORE 1120")).toMatchObject({
      complete: false,
      expression: undefined,
      extractedCourseCodes: ["CORE 1120"],
    })
    expect(parsePrerequisite("CHEM 1010 prior to 2022-23").extractedCourseCodes).toEqual([
      "CHEM 1010",
    ])
    expect(parsePrerequisite("FINA 7900A from 2011-12").extractedCourseCodes).toEqual([
      "FINA 7900A",
    ])
    expect(parsePrerequisite("Level 3 or above in HKDSE Biology").extractedCourseCodes).toEqual([])
  })

  test("never emits reserved natural-language prefixes and deduplicates references", () => {
    const parsed = parsePrerequisite("COMP 1023 OR COMP1023 prior TO 2022, ABOVE 1000, FROM 2011")

    expect(parsed.complete).toBe(false)
    expect(parsed.extractedCourseCodes).toEqual(["COMP 1023"])
    expect(parsed.extractedCourseCodes).not.toEqual(
      expect.arrayContaining(["TO 2022", "ABOVE 1000", "FROM 2011"]),
    )
  })

  test("uses a reviewed prefix registry while retaining the CORE legacy prefix", () => {
    const parsed = parsePrerequisite("TAKE 1234 OR COMP 1023 OR CORE 1120", {
      allowedPrefixes: new Set(["COMP"]),
    })

    expect(parsed.complete).toBe(false)
    expect(parsed.extractedCourseCodes).toEqual(["COMP 1023", "CORE 1120"])
  })

  test.each([
    ["COMP 1023 AND", ["COMP 1023"]],
    ["(COMP 1023 OR MATH 1012", ["COMP 1023", "MATH 1012"]],
    ["AND COMP 1023", ["COMP 1023"]],
  ])("falls back safely for an incomplete expression: %s", (text, extractedCourseCodes) => {
    expect(parsePrerequisite(text)).toMatchObject({
      complete: false,
      expression: undefined,
      extractedCourseCodes,
      originalText: text,
    })
  })
})
