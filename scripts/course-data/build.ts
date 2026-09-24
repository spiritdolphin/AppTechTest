import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { buildGeneratedCourseData, parseSourceCourses, sha256 } from "./core"
import { generatedRoot, projectRoot, sourcePath, stagingRoot } from "./paths"
import {
  COURSE_DATA_GENERATOR_VERSION,
  COURSE_DATA_SCHEMA_VERSION,
  CourseDataManifest,
  GeneratedCourseData,
  ManifestFileEntry,
} from "./types"

function jsonContent(value: unknown, pretty = false): string {
  return `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`
}

function writeGeneratedJson(
  relativePath: string,
  value: unknown,
  manifestFiles: ManifestFileEntry[],
  pretty = false,
) {
  const content = jsonContent(value, pretty)
  const outputPath = join(stagingRoot, relativePath)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, content)
  manifestFiles.push({
    path: relativePath,
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
  })
}

function writeTermFiles(data: GeneratedCourseData, manifestFiles: ManifestFileEntry[]) {
  data.semesters.semesters.forEach(({ termCode }) => {
    writeGeneratedJson(`catalogues/${termCode}.json`, data.catalogues.get(termCode), manifestFiles)
    writeGeneratedJson(`details/${termCode}.json`, data.details.get(termCode), manifestFiles)
    writeGeneratedJson(
      `prerequisites/${termCode}.json`,
      data.prerequisites.get(termCode),
      manifestFiles,
    )
  })
}

function main() {
  const source = readFileSync(sourcePath)
  const sourceCourses = parseSourceCourses(source.toString("utf8"))
  const generatedData = buildGeneratedCourseData(sourceCourses)
  const manifestFiles: ManifestFileEntry[] = []

  rmSync(stagingRoot, { recursive: true, force: true })
  mkdirSync(stagingRoot, { recursive: true })

  writeGeneratedJson("semesters.json", generatedData.semesters, manifestFiles, true)
  writeTermFiles(generatedData, manifestFiles)
  manifestFiles.sort((left, right) => left.path.localeCompare(right.path))

  const latestSemester = generatedData.semesters.semesters[0]
  if (!latestSemester) throw new Error("No semesters were generated")

  const manifest: CourseDataManifest = {
    schemaVersion: COURSE_DATA_SCHEMA_VERSION,
    generatorVersion: COURSE_DATA_GENERATOR_VERSION,
    source: {
      path: relative(projectRoot, sourcePath),
      bytes: statSync(sourcePath).size,
      recordCount: sourceCourses.length,
      sha256: sha256(source),
    },
    latestTermCode: latestSemester.termCode,
    files: manifestFiles,
  }

  writeFileSync(join(stagingRoot, "manifest.json"), jsonContent(manifest, true))
  rmSync(generatedRoot, { recursive: true, force: true })
  renameSync(stagingRoot, generatedRoot)

  console.log(
    `Generated ${sourceCourses.length.toLocaleString("en-US")} courses across ${generatedData.semesters.semesters.length} semesters.`,
  )
  console.log(`Latest semester: ${latestSemester.termName} (${latestSemester.termCode})`)
  console.log(`Output: ${relative(projectRoot, generatedRoot)}`)
}

main()
