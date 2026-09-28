import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { buildLectureAvailability } from "./availability"
import type { SectionsFile } from "./types"
import { projectRoot } from "../course-data/paths"

export function writeAvailabilityFiles(
  termCodes: readonly string[],
  sectionsRoot = join(projectRoot, "generated/sections"),
) {
  const availabilityRoot = join(sectionsRoot, "availability")
  mkdirSync(availabilityRoot, { recursive: true })
  termCodes.forEach((termCode) => {
    const sections = JSON.parse(
      readFileSync(join(sectionsRoot, `${termCode}.json`), "utf8"),
    ) as SectionsFile
    if (sections.schemaVersion !== 1 || sections.termCode !== termCode) {
      throw new Error(`Invalid sections shard for ${termCode}`)
    }
    writeFileSync(
      join(availabilityRoot, `${termCode}.json`),
      `${JSON.stringify(buildLectureAvailability(sections))}\n`,
    )
  })
}
