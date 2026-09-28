import { readFileSync } from "node:fs"
import { join } from "node:path"

import { writeAvailabilityFiles } from "./buildAvailability"
import type { SectionManifest } from "./types"
import { projectRoot } from "../course-data/paths"

const manifest = JSON.parse(
  readFileSync(join(projectRoot, "generated/sections/manifest.json"), "utf8"),
) as SectionManifest
writeAvailabilityFiles(manifest.terms.map((term) => term.termCode))
