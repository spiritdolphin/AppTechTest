import { resolveDependencyGraph } from "../app/features/courses/data/resolveDependencyGraph"
import type {
  ResolvedCourseDependency,
  ResolvedDependencyItem,
} from "../app/features/courses/domain/dependencyGraph"
import type {
  CatalogueFile,
  PrerequisiteEntry,
  PrerequisitesFile,
} from "../app/features/courses/domain/types"

function catalogue(courseCodes: string[]): CatalogueFile {
  return {
    schemaVersion: 1,
    termCode: "2610",
    courses: courseCodes.map((code) => ({
      id: code,
      code,
      normalizedCode: code.replaceAll(" ", "").toLowerCase(),
      title: `${code} title`,
      normalizedTitle: `${code.replaceAll(" ", "").toLowerCase()}title`,
      departmentCode: code.split(" ")[0],
      minCredits: 3,
      maxCredits: 3,
    })),
  }
}

function prerequisiteFile(entries: Record<string, PrerequisiteEntry>): PrerequisitesFile {
  return {
    schemaVersion: 1,
    termCode: "2610",
    byCourseCode: entries,
    reverseByCourseCode: {},
  }
}

function courseNodes(item: ResolvedDependencyItem | undefined): ResolvedCourseDependency[] {
  if (!item) return []
  if (item.kind === "course") {
    return [item, ...courseNodes(item.prerequisites)]
  }
  return item.children.flatMap(courseNodes)
}

describe("resolveDependencyGraph", () => {
  test("resolves nested prerequisites and marks missing, repeated, and cyclic nodes", async () => {
    const graph = await resolveDependencyGraph({
      catalogue: catalogue(["COMP 4000", "COMP 3000", "MATH 2000"]),
      courseCode: "COMP 4000",
      prerequisites: prerequisiteFile({
        "COMP 4000": {
          originalText: "COMP 3000 AND (MATH 2000 OR PHYS 1000)",
          referencedCourseCodes: ["COMP 3000", "MATH 2000", "PHYS 1000"],
        },
        "COMP 3000": {
          originalText: "MATH 2000 AND COMP 4000",
          referencedCourseCodes: ["MATH 2000", "COMP 4000"],
        },
      }),
    })

    expect(graph).toMatchObject({
      courseCode: "COMP 4000",
      currentCourseAvailable: true,
      mode: "structured",
      originalText: "COMP 3000 AND (MATH 2000 OR PHYS 1000)",
    })

    const nodes = courseNodes(graph.prerequisites)
    expect(nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ courseCode: "COMP 3000", available: true }),
        expect.objectContaining({ courseCode: "MATH 2000", marker: "repeated" }),
        expect.objectContaining({ courseCode: "COMP 4000", marker: "cycle" }),
        expect.objectContaining({ courseCode: "PHYS 1000", available: false }),
      ]),
    )
  })

  test("uses an extracted-course group for partially understood text", async () => {
    const graph = await resolveDependencyGraph({
      catalogue: catalogue(["CHEM 3010"]),
      courseCode: "CHEM 3010",
      prerequisites: prerequisiteFile({
        "CHEM 3010": {
          originalText: "Any CHEM course at or above 1000-level or CORE 1120",
          referencedCourseCodes: [],
        },
      }),
    })

    expect(graph.mode).toBe("extracted")
    expect(graph.prerequisites).toMatchObject({
      kind: "group",
      operator: "extracted",
      children: [
        expect.objectContaining({ kind: "course", courseCode: "CORE 1120", available: false }),
      ],
    })
  })

  test("keeps an extracted fallback when it appears in a nested course", async () => {
    const graph = await resolveDependencyGraph({
      catalogue: catalogue(["COMP 4000", "COMP 3000"]),
      courseCode: "COMP 4000",
      prerequisites: prerequisiteFile({
        "COMP 4000": {
          originalText: "COMP 3000",
          referencedCourseCodes: ["COMP 3000"],
        },
        "COMP 3000": {
          originalText: "Any MATH course at or above 1000-level or CORE 1120",
          referencedCourseCodes: ["CORE 1120"],
        },
      }),
    })

    expect(graph.prerequisites).toMatchObject({
      kind: "course",
      courseCode: "COMP 3000",
      prerequisites: {
        kind: "group",
        operator: "extracted",
        children: [expect.objectContaining({ courseCode: "CORE 1120", available: false })],
      },
    })
  })

  test("keeps an empty extracted group when natural language contains no course code", async () => {
    const graph = await resolveDependencyGraph({
      catalogue: catalogue(["COMP 4000"]),
      courseCode: "COMP 4000",
      prerequisites: prerequisiteFile({
        "COMP 4000": {
          originalText: "Level 3 or above in HKDSE Mathematics",
          referencedCourseCodes: [],
        },
      }),
    })

    expect(graph).toMatchObject({
      mode: "extracted",
      originalText: "Level 3 or above in HKDSE Mathematics",
      prerequisites: { kind: "group", operator: "extracted", children: [] },
    })
  })

  test("handles a course with no prerequisites", async () => {
    const graph = await resolveDependencyGraph({
      catalogue: catalogue(["COMP 1000"]),
      courseCode: "COMP 1000",
      prerequisites: prerequisiteFile({}),
    })

    expect(graph).toMatchObject({ mode: "none", originalText: "" })
    expect(graph.prerequisites).toBeUndefined()
  })

  test("bounds automatic expansion and keeps a continuation node", async () => {
    const graph = await resolveDependencyGraph({
      catalogue: catalogue(["COMP 4000", "COMP 3000", "COMP 2000"]),
      courseCode: "COMP 4000",
      maxDepth: 1,
      prerequisites: prerequisiteFile({
        "COMP 4000": {
          originalText: "COMP 3000",
          referencedCourseCodes: ["COMP 3000"],
        },
        "COMP 3000": {
          originalText: "COMP 2000",
          referencedCourseCodes: ["COMP 2000"],
        },
      }),
    })

    expect(graph.prerequisites).toMatchObject({
      kind: "course",
      courseCode: "COMP 3000",
      marker: "more",
    })
    expect(graph.prerequisites).not.toHaveProperty("prerequisites")
  })
})
