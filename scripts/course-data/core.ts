import { createHash } from "node:crypto"

import {
  COURSE_DATA_SCHEMA_VERSION,
  CatalogueCourse,
  CatalogueFile,
  CourseDetail,
  DetailsFile,
  GeneratedCourseData,
  PrerequisiteEntry,
  PrerequisitesFile,
  SemesterSummary,
  SourceAttribute,
  SourceCourse,
  SourceLearningOutcome,
} from "./types"

const SOURCE_STRING_FIELDS = [
  "id",
  "term_code",
  "term_name",
  "academic_year",
  "campus_code",
  "campus_name",
  "campus_nickname",
  "department_code",
  "department_nickname",
  "school_code",
  "career_code",
  "career_type",
  "prefix",
  "number",
  "title",
  "vector",
  "vector_display",
  "description",
  "previous",
  "alternate",
  "prerequisite",
  "corequisite",
  "exclusion",
  "background",
  "colist",
  "equivalence",
  "reference",
  "timestamp",
  "status",
] as const satisfies readonly (keyof SourceCourse)[]

const SOURCE_NUMBER_FIELDS = [
  "term_num",
  "min_credits",
  "max_credits",
] as const satisfies readonly (keyof SourceCourse)[]

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${path} must be a string`)
}

function assertFiniteNumber(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`)
  }
}

function assertAttributes(value: unknown, path: string): asserts value is SourceAttribute[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)

  value.forEach((attribute, index) => {
    if (!isRecord(attribute)) throw new Error(`${path}[${index}] must be an object`)
    assertString(attribute.label, `${path}[${index}].label`)
    assertString(attribute.value, `${path}[${index}].value`)
    assertString(attribute.description, `${path}[${index}].description`)
  })
}

function assertLearningOutcomes(
  value: unknown,
  path: string,
): asserts value is SourceLearningOutcome[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)

  value.forEach((outcome, index) => {
    if (!isRecord(outcome)) throw new Error(`${path}[${index}] must be an object`)
    assertString(outcome.description, `${path}[${index}].description`)
  })
}

function assertSourceCourse(value: unknown, index: number): asserts value is SourceCourse {
  const path = `courses[${index}]`
  if (!isRecord(value)) throw new Error(`${path} must be an object`)

  SOURCE_STRING_FIELDS.forEach((field) => assertString(value[field], `${path}.${field}`))
  SOURCE_NUMBER_FIELDS.forEach((field) => assertFiniteNumber(value[field], `${path}.${field}`))
  assertAttributes(value.attributes, `${path}.attributes`)
  assertLearningOutcomes(value.cilos, `${path}.cilos`)

  if (!value.term_code || !value.prefix || !value.number || !value.title) {
    throw new Error(`${path} is missing a required course identity field`)
  }
}

export function parseSourceCourses(json: string): SourceCourse[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error("courses.json must contain an array")
  parsed.forEach(assertSourceCourse)
  return parsed
}

export function sha256(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex")
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s-]+/g, "")
}

export function courseCode(course: Pick<SourceCourse, "prefix" | "number">): string {
  return `${course.prefix.trim().toUpperCase()} ${course.number.trim().toUpperCase()}`
}

export function extractReferencedCourseCodes(
  prerequisite: string,
  knownPrefixes: ReadonlySet<string>,
): string[] {
  const references = new Set<string>()
  const pattern = /\b([A-Z]{2,5})\s*-?\s*(\d{4}[A-Z]?)\b/gi

  for (const match of prerequisite.matchAll(pattern)) {
    const prefix = match[1].toUpperCase()
    if (knownPrefixes.has(prefix)) {
      references.add(`${prefix} ${match[2].toUpperCase()}`)
    }
  }

  return [...references].sort(compareText)
}

function toCatalogueCourse(source: SourceCourse): CatalogueCourse {
  const code = courseCode(source)
  return {
    id: source.id,
    code,
    normalizedCode: normalizeSearchText(code),
    title: source.title,
    normalizedTitle: normalizeSearchText(source.title),
    departmentCode: source.department_code,
    minCredits: source.min_credits,
    maxCredits: source.max_credits,
  }
}

function toCourseDetail(source: SourceCourse): CourseDetail {
  return {
    id: source.id,
    code: courseCode(source),
    prefix: source.prefix,
    number: source.number,
    title: source.title,
    termNum: source.term_num,
    termCode: source.term_code,
    termName: source.term_name,
    academicYear: source.academic_year,
    minCredits: source.min_credits,
    maxCredits: source.max_credits,
    vector: source.vector,
    vectorDisplay: source.vector_display,
    description: source.description,
    campusCode: source.campus_code,
    campusName: source.campus_name,
    campusNickname: source.campus_nickname,
    departmentCode: source.department_code,
    departmentNickname: source.department_nickname,
    schoolCode: source.school_code,
    careerCode: source.career_code,
    careerType: source.career_type,
    previous: source.previous,
    alternate: source.alternate,
    prerequisite: source.prerequisite,
    corequisite: source.corequisite,
    exclusion: source.exclusion,
    background: source.background,
    colist: source.colist,
    equivalence: source.equivalence,
    reference: source.reference,
    attributes: source.attributes,
    learningOutcomes: source.cilos.map(({ description }) => description),
    sourceTimestamp: source.timestamp,
    status: source.status,
  }
}

function buildSemesterSummary(courses: SourceCourse[]): SemesterSummary {
  const first = courses[0]
  if (!first) throw new Error("Cannot build an empty semester")

  const departmentCounts = new Map<string, { name: string; count: number }>()

  courses.forEach((course) => {
    if (
      course.term_num !== first.term_num ||
      course.term_name !== first.term_name ||
      course.academic_year !== first.academic_year
    ) {
      throw new Error(`Inconsistent semester metadata for term ${first.term_code}`)
    }

    const current = departmentCounts.get(course.department_code)
    departmentCounts.set(course.department_code, {
      name: course.department_nickname || course.department_code,
      count: (current?.count ?? 0) + 1,
    })
  })

  return {
    termNum: first.term_num,
    termCode: first.term_code,
    termName: first.term_name,
    academicYear: first.academic_year,
    courseCount: courses.length,
    departments: [...departmentCounts]
      .sort(([left], [right]) => compareText(left, right))
      .map(([code, { name, count }]) => ({ code, name, courseCount: count })),
  }
}

function buildTermData(
  courses: SourceCourse[],
  knownPrefixes: ReadonlySet<string>,
): {
  catalogue: CatalogueFile
  details: DetailsFile
  prerequisites: PrerequisitesFile
} {
  const first = courses[0]
  if (!first) throw new Error("Cannot build an empty semester")

  const sorted = [...courses].sort((left, right) =>
    compareText(courseCode(left), courseCode(right)),
  )
  const catalogueCourses: CatalogueCourse[] = []
  const coursesByCode: Record<string, CourseDetail> = {}
  const byCourseCode: Record<string, PrerequisiteEntry> = {}
  const reverseSets = new Map<string, Set<string>>()

  sorted.forEach((source) => {
    const code = courseCode(source)
    if (coursesByCode[code]) {
      throw new Error(`Duplicate course ${code} in term ${first.term_code}`)
    }

    catalogueCourses.push(toCatalogueCourse(source))
    coursesByCode[code] = toCourseDetail(source)

    if (source.prerequisite.trim()) {
      const referencedCourseCodes = extractReferencedCourseCodes(source.prerequisite, knownPrefixes)
      byCourseCode[code] = {
        originalText: source.prerequisite,
        referencedCourseCodes,
      }

      referencedCourseCodes.forEach((reference) => {
        const dependents = reverseSets.get(reference) ?? new Set<string>()
        dependents.add(code)
        reverseSets.set(reference, dependents)
      })
    }
  })

  const reverseByCourseCode: Record<string, string[]> = {}
  const reverseEntries = [...reverseSets]
  reverseEntries
    .sort(([left], [right]) => compareText(left, right))
    .forEach(([code, dependents]) => {
      reverseByCourseCode[code] = [...dependents].sort(compareText)
    })

  return {
    catalogue: {
      schemaVersion: COURSE_DATA_SCHEMA_VERSION,
      termCode: first.term_code,
      courses: catalogueCourses,
    },
    details: {
      schemaVersion: COURSE_DATA_SCHEMA_VERSION,
      termCode: first.term_code,
      coursesByCode,
    },
    prerequisites: {
      schemaVersion: COURSE_DATA_SCHEMA_VERSION,
      termCode: first.term_code,
      byCourseCode,
      reverseByCourseCode,
    },
  }
}

export function buildGeneratedCourseData(sourceCourses: SourceCourse[]): GeneratedCourseData {
  if (sourceCourses.length === 0) throw new Error("courses.json contains no courses")

  const knownPrefixes = new Set(sourceCourses.map(({ prefix }) => prefix.trim().toUpperCase()))
  const terms = new Map<string, SourceCourse[]>()
  sourceCourses.forEach((course) => {
    const courses = terms.get(course.term_code) ?? []
    courses.push(course)
    terms.set(course.term_code, courses)
  })

  const termGroups = [...terms.values()].sort((left, right) => {
    const termDifference = right[0].term_num - left[0].term_num
    return termDifference || compareText(right[0].term_code, left[0].term_code)
  })

  const catalogues = new Map<string, CatalogueFile>()
  const details = new Map<string, DetailsFile>()
  const prerequisites = new Map<string, PrerequisitesFile>()

  termGroups.forEach((courses) => {
    const termData = buildTermData(courses, knownPrefixes)
    const termCode = courses[0].term_code
    catalogues.set(termCode, termData.catalogue)
    details.set(termCode, termData.details)
    prerequisites.set(termCode, termData.prerequisites)
  })

  return {
    semesters: {
      schemaVersion: COURSE_DATA_SCHEMA_VERSION,
      semesters: termGroups.map(buildSemesterSummary),
    },
    catalogues,
    details,
    prerequisites,
  }
}
