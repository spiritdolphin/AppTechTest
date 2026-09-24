import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))

export const projectRoot = resolve(scriptDirectory, "../..")
export const sourcePath = join(projectRoot, "courses.json")
export const generatedRoot = join(projectRoot, "generated/courses")
export const stagingRoot = join(projectRoot, "generated/.courses-build")
