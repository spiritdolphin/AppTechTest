import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { normalizeSearchText, parseSourceCourses, sha256 } from "./core"
import { generatedRoot, projectRoot, sourcePath } from "./paths"
import type { SourceCourse } from "./types"
import {
  COURSE_DATA_GENERATOR_VERSION,
  COURSE_DATA_SCHEMA_VERSION,
  CatalogueFile,
  CourseDataManifest,
  DetailsFile,
  PrerequisitesFile,
  SemestersFile,
} from "./types"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [relative(generatedRoot, path)]
  })
}

function validateFileFingerprints(manifest: CourseDataManifest) {
  const expected = new Set(["manifest.json", ...manifest.files.map(({ path }) => path)])
  const actual = listFiles(generatedRoot)

  assert(
    actual.length === expected.size,
    "Generated course-data file count does not match manifest",
  )
  actual.forEach((path) => assert(expected.has(path), `Unexpected generated file: ${path}`))

  manifest.files.forEach((file) => {
    const path = join(generatedRoot, file.path)
    const content = readFileSync(path)
    assert(content.byteLength === file.bytes, `Generated file size mismatch: ${file.path}`)
    assert(sha256(content) === file.sha256, `Generated file fingerprint mismatch: ${file.path}`)
  })
}

function validateSemesterFiles(semestersFile: SemestersFile, sourceCourses: SourceCourse[]) {
  assert(
    semestersFile.schemaVersion === COURSE_DATA_SCHEMA_VERSION,
    "Unsupported semesters schema version",
  )
  assert(semestersFile.semesters.length > 0, "No generated semesters found")

  const sourceCounts = new Map<string, number>()
  sourceCourses.forEach(({ term_code: termCode }) => {
    sourceCounts.set(termCode, (sourceCounts.get(termCode) ?? 0) + 1)
  })
  assert(
    semestersFile.semesters.length === sourceCounts.size,
    "Generated semester count does not match source dataset",
  )

  semestersFile.semesters.forEach((semester, index) => {
    if (index > 0) {
      assert(
        semestersFile.semesters[index - 1].termNum >= semester.termNum,
        "Semesters must be sorted newest first",
      )
    }

    assert(
      sourceCounts.get(semester.termCode) === semester.courseCount,
      `Source count mismatch for ${semester.termCode}`,
    )
    assert(
      semester.departments.reduce((sum, department) => sum + department.courseCount, 0) ===
        semester.courseCount,
      `Department counts do not add up for ${semester.termCode}`,
    )

    const catalogue = readJson<CatalogueFile>(
      join(generatedRoot, `catalogues/${semester.termCode}.json`),
    )
    const details = readJson<DetailsFile>(join(generatedRoot, `details/${semester.termCode}.json`))
    const prerequisites = readJson<PrerequisitesFile>(
      join(generatedRoot, `prerequisites/${semester.termCode}.json`),
    )

    ;[catalogue, details, prerequisites].forEach((file) => {
      assert(file.schemaVersion === COURSE_DATA_SCHEMA_VERSION, "Unsupported shard schema version")
      assert(file.termCode === semester.termCode, `Wrong term code in ${semester.termCode} shard`)
    })

    assert(
      catalogue.courses.length === semester.courseCount,
      `Catalogue count mismatch for ${semester.termCode}`,
    )
    assert(
      Object.keys(details.coursesByCode).length === semester.courseCount,
      `Details count mismatch for ${semester.termCode}`,
    )

    let previousCode = ""
    catalogue.courses.forEach((course) => {
      assert(course.code > previousCode, `Catalogue order or duplicate error at ${course.code}`)
      previousCode = course.code
      assert(
        course.normalizedCode === normalizeSearchText(course.code),
        `Invalid normalized code for ${course.code}`,
      )
      assert(
        course.normalizedTitle === normalizeSearchText(course.title),
        `Invalid normalized title for ${course.code}`,
      )
      assert(
        details.coursesByCode[course.code]?.code === course.code,
        `Missing details for ${course.code}`,
      )
    })

    Object.entries(prerequisites.byCourseCode).forEach(([code, prerequisite]) => {
      assert(details.coursesByCode[code], `Prerequisite owner is missing from details: ${code}`)
      assert(prerequisite.originalText.trim(), `Empty prerequisite text for ${code}`)
      assert(
        prerequisite.originalText === details.coursesByCode[code].prerequisite,
        `Prerequisite text mismatch for ${code}`,
      )
      assert(
        new Set(prerequisite.referencedCourseCodes).size ===
          prerequisite.referencedCourseCodes.length,
        `Duplicate prerequisite reference for ${code}`,
      )
      prerequisite.referencedCourseCodes.forEach((reference) => {
        assert(
          prerequisites.reverseByCourseCode[reference]?.includes(code),
          `Missing reverse prerequisite edge: ${reference} -> ${code}`,
        )
      })
    })

    Object.entries(prerequisites.reverseByCourseCode).forEach(([reference, dependents]) => {
      dependents.forEach((dependent) => {
        assert(
          prerequisites.byCourseCode[dependent]?.referencedCourseCodes.includes(reference),
          `Unexpected reverse prerequisite edge: ${reference} -> ${dependent}`,
        )
      })
    })
  })
}

function main() {
  const manifestPath = join(generatedRoot, "manifest.json")
  const manifest = readJson<CourseDataManifest>(manifestPath)
  const source = readFileSync(sourcePath)
  const sourceCourses = parseSourceCourses(source.toString("utf8"))

  assert(
    manifest.schemaVersion === COURSE_DATA_SCHEMA_VERSION,
    "Unsupported manifest schema version",
  )
  assert(
    manifest.generatorVersion === COURSE_DATA_GENERATOR_VERSION,
    "Generated data uses a different generator version",
  )
  assert(
    manifest.source.path === relative(projectRoot, sourcePath),
    "Manifest source path mismatch",
  )
  assert(manifest.source.bytes === statSync(sourcePath).size, "Source dataset size mismatch")
  assert(manifest.source.recordCount === sourceCourses.length, "Source record count mismatch")
  assert(manifest.source.sha256 === sha256(source), "Source dataset fingerprint mismatch")

  validateFileFingerprints(manifest)
  const semestersFile = readJson<SemestersFile>(join(generatedRoot, "semesters.json"))
  validateSemesterFiles(semestersFile, sourceCourses)
  assert(
    manifest.latestTermCode === semestersFile.semesters[0].termCode,
    "Latest semester does not match manifest",
  )

  console.log(
    `Course data is valid: ${sourceCourses.length.toLocaleString("en-US")} courses, ${semestersFile.semesters.length} semesters, ${manifest.files.length} generated files.`,
  )
  console.log(`Source SHA-256: ${manifest.source.sha256}`)
}

main()
