import { CourseRepository } from "./repository"
import type { CatalogueFile, SemestersFile } from "../domain/types"

const semestersFile = require("../../../../generated/courses/semesters.json") as SemestersFile

const catalogueLoaders = {
  "2520": () => require("../../../../generated/courses/catalogues/2520.json") as CatalogueFile,
  "2530": () => require("../../../../generated/courses/catalogues/2530.json") as CatalogueFile,
  "2540": () => require("../../../../generated/courses/catalogues/2540.json") as CatalogueFile,
  "2610": () => require("../../../../generated/courses/catalogues/2610.json") as CatalogueFile,
}

export const courseRepository = new CourseRepository({ semestersFile, catalogueLoaders })
