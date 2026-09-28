import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { buildLectureAvailability } from "./availability"
import {
  SCHEDULE_REVISION,
  SCHEDULE_SOURCE_SHA256,
  SCHEDULE_SOURCE_URL,
  SECTIONS_SCHEMA_VERSION,
  SectionManifest,
  SectionsFile,
} from "./types"
import { parseSourceCourses, sha256 } from "../course-data/core"
import { projectRoot, sourcePath } from "../course-data/paths"

const generatedRoot = join(projectRoot, "generated/sections")

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function main() {
  const manifest = readJson<SectionManifest>(join(generatedRoot, "manifest.json"))
  const coursesSource = readFileSync(sourcePath)
  const courses = parseSourceCourses(coursesSource.toString("utf8"))
  const termCodes = [...new Set(courses.map((course) => course.term_code))].sort()
  const courseIds = new Set(courses.map((course) => `${course.term_code}:${course.id}`))

  assert(manifest.schemaVersion === SECTIONS_SCHEMA_VERSION, "Unsupported sections manifest schema")
  assert(manifest.source.url === SCHEDULE_SOURCE_URL, "Schedule source URL mismatch")
  assert(manifest.source.revision === SCHEDULE_REVISION, "Schedule source revision mismatch")
  assert(manifest.source.sha256 === SCHEDULE_SOURCE_SHA256, "Schedule source fingerprint mismatch")
  assert(
    manifest.catalogueSourceSha256 === sha256(coursesSource),
    "Catalogue source changed; rebuild sections",
  )
  assert(manifest.files.length === termCodes.length, "Sections shard count mismatch")
  assert(manifest.terms.length === termCodes.length, "Sections term statistics mismatch")

  const actualFiles = readdirSync(generatedRoot).sort()
  const expectedFiles = [
    "availability",
    "manifest.json",
    ...manifest.files.map((file) => file.path),
  ].sort()
  assert(
    JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    "Sections file list mismatch",
  )
  assert(
    JSON.stringify(readdirSync(join(generatedRoot, "availability")).sort()) ===
      JSON.stringify(termCodes.map((termCode) => `${termCode}.json`).sort()),
    "Lecture availability file list mismatch",
  )

  termCodes.forEach((termCode) => {
    const entry = manifest.files.find((file) => file.path === `${termCode}.json`)
    const stats = manifest.terms.find((term) => term.termCode === termCode)
    assert(entry && stats, `Missing sections manifest entry for ${termCode}`)
    const path = join(generatedRoot, entry.path)
    const content = readFileSync(path)
    assert(statSync(path).size === entry.bytes, `Sections file size mismatch: ${termCode}`)
    assert(sha256(content) === entry.sha256, `Sections file hash mismatch: ${termCode}`)
    const file = readJson<SectionsFile>(path)
    assert(file.schemaVersion === SECTIONS_SCHEMA_VERSION, `Sections schema mismatch: ${termCode}`)
    assert(file.termCode === termCode, `Sections term mismatch: ${termCode}`)
    const availabilityPath = join(generatedRoot, "availability", `${termCode}.json`)
    const availability = readJson<ReturnType<typeof buildLectureAvailability>>(availabilityPath)
    assert(
      JSON.stringify(availability) === JSON.stringify(buildLectureAvailability(file)),
      `Lecture availability mismatch: ${termCode}`,
    )

    let sectionCount = 0
    Object.entries(file.sectionsByCourseId).forEach(([courseId, sections]) => {
      assert(
        courseIds.has(`${termCode}:${courseId}`),
        `Unknown section course: ${termCode}:${courseId}`,
      )
      assert(sections.length > 0, `Empty section group: ${termCode}:${courseId}`)
      const identities = new Set<string>()
      sections.forEach((section) => {
        assert(section.section.trim(), `Empty section code: ${termCode}:${courseId}`)
        assert(!identities.has(section.section), `Duplicate section: ${termCode}:${courseId}`)
        identities.add(section.section)
        assert(!Number.isNaN(Date.parse(section.snapshotAt)), "Invalid section snapshot time")
        section.meetings.forEach((meeting) => {
          assert(/^\d{2}:\d{2}$/.test(meeting.timeFrom), "Invalid meeting start time")
          assert(/^\d{2}:\d{2}$/.test(meeting.timeTo), "Invalid meeting end time")
        })
        sectionCount++
      })
    })
    assert(sectionCount === stats.matchedRows, `Matched section count mismatch: ${termCode}`)
    assert(
      Object.keys(file.sectionsByCourseId).length === stats.coursesWithSections,
      `Section course count mismatch: ${termCode}`,
    )
    assert(stats.activeRows === stats.matchedRows + stats.unmatchedRows, "Active count mismatch")
    assert(stats.sourceRows >= stats.latestRows, "Source count mismatch")
    assert(stats.latestRows >= stats.activeRows, "Latest count mismatch")
  })

  console.log(
    `Section data is valid: ${manifest.terms.reduce((count, term) => count + term.matchedRows, 0).toLocaleString("en-US")} sections across ${termCodes.length} semesters.`,
  )
  console.log(`Source revision: ${manifest.source.revision}`)
}

main()
