import { parquetReadObjects } from "hyparquet"
import { compressors } from "hyparquet-compressors"
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { buildSectionData, parseSourceClasses } from "./core"
import {
  SCHEDULE_REVISION,
  SCHEDULE_SOURCE_SHA256,
  SCHEDULE_SOURCE_URL,
  SECTIONS_SCHEMA_VERSION,
  SectionManifest,
} from "./types"
import { parseSourceCourses, sha256 } from "../course-data/core"
import { projectRoot, sourcePath } from "../course-data/paths"

const generatedRoot = join(projectRoot, "generated/sections")
const stagingRoot = join(projectRoot, "generated/.sections-build")

function jsonContent(value: unknown, pretty = false): string {
  return `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`
}

async function loadSource(): Promise<Uint8Array> {
  const localPath = process.argv[2]
  if (localPath) return readFileSync(localPath)

  const response = await fetch(SCHEDULE_SOURCE_URL)
  if (!response.ok) throw new Error(`Schedule download failed: HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function main() {
  const source = await loadSource()
  const sourceSha = sha256(source)
  if (sourceSha !== SCHEDULE_SOURCE_SHA256) {
    throw new Error(`Schedule source fingerprint mismatch: ${sourceSha}`)
  }

  const catalogueSource = readFileSync(sourcePath)
  const courses = parseSourceCourses(catalogueSource.toString("utf8"))
  const termCodes = new Set(courses.map((course) => course.term_code))
  const file = {
    byteLength: source.byteLength,
    slice: (start: number, end: number) => Uint8Array.from(source.subarray(start, end)).buffer,
  }
  const rows = await parquetReadObjects({ file, compressors })
  const classes = parseSourceClasses(rows, termCodes)
  const { files, stats } = buildSectionData(courses, classes)

  rmSync(stagingRoot, { recursive: true, force: true })
  mkdirSync(stagingRoot, { recursive: true })
  const manifestFiles: SectionManifest["files"] = []
  for (const termCode of [...termCodes].sort()) {
    const sectionFile = files.get(termCode)
    if (!sectionFile) throw new Error(`Missing sections for ${termCode}`)
    const content = jsonContent(sectionFile)
    const path = `${termCode}.json`
    writeFileSync(join(stagingRoot, path), content)
    manifestFiles.push({ path, bytes: Buffer.byteLength(content), sha256: sha256(content) })
  }

  const manifest: SectionManifest = {
    schemaVersion: SECTIONS_SCHEMA_VERSION,
    source: {
      url: SCHEDULE_SOURCE_URL,
      revision: SCHEDULE_REVISION,
      sha256: sourceSha,
      bytes: source.byteLength,
      rows: rows.length,
    },
    catalogueSourceSha256: sha256(catalogueSource),
    files: manifestFiles,
    terms: stats,
  }
  writeFileSync(join(stagingRoot, "manifest.json"), jsonContent(manifest, true))
  rmSync(generatedRoot, { recursive: true, force: true })
  renameSync(stagingRoot, generatedRoot)

  console.log(`Generated sections from ${rows.length.toLocaleString("en-US")} schedule rows.`)
  stats.forEach((term) => {
    console.log(
      `${term.termCode}: ${term.matchedRows} matched sections for ${term.coursesWithSections} courses; ${term.unmatchedRows} unmatched active sections omitted.`,
    )
  })
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
