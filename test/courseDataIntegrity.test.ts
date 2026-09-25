import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { sha256 } from "../scripts/course-data/core"
import type { CourseDataManifest } from "../scripts/course-data/types"

const projectRoot = process.cwd()
const generatedRoot = join(projectRoot, "generated/courses")

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [relative(generatedRoot, path)]
  })
}

function readManifest(): CourseDataManifest {
  return JSON.parse(readFileSync(join(generatedRoot, "manifest.json"), "utf8"))
}

describe("committed course-data integrity", () => {
  test("matches the source dataset fingerprint recorded in the manifest", () => {
    const manifest = readManifest()
    const source = readFileSync(join(projectRoot, manifest.source.path))

    expect(source.byteLength).toBe(manifest.source.bytes)
    expect(sha256(source)).toBe(manifest.source.sha256)
  })

  test("contains exactly the generated files and fingerprints recorded in the manifest", () => {
    const manifest = readManifest()
    const expectedFiles = ["manifest.json", ...manifest.files.map(({ path }) => path)].sort()

    expect(listFiles(generatedRoot).sort()).toEqual(expectedFiles)
    manifest.files.forEach((file) => {
      const content = readFileSync(join(generatedRoot, file.path))
      expect(content.byteLength).toBe(file.bytes)
      expect(sha256(content)).toBe(file.sha256)
    })
  })
})
