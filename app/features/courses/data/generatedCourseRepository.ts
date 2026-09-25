import { CourseRepository } from "./repository"
import type { CatalogueFile, DetailsFile, PrerequisitesFile, SemestersFile } from "../domain/types"

const semestersFile = require("../../../../generated/courses/semesters.json") as SemestersFile

const catalogueLoaders = {
  "2520": () => require("../../../../generated/courses/catalogues/2520.json") as CatalogueFile,
  "2530": () => require("../../../../generated/courses/catalogues/2530.json") as CatalogueFile,
  "2540": () => require("../../../../generated/courses/catalogues/2540.json") as CatalogueFile,
  "2610": () => require("../../../../generated/courses/catalogues/2610.json") as CatalogueFile,
}

const detailsLoaders = {
  "2520": () => require("../../../../generated/courses/details/2520.json") as DetailsFile,
  "2530": () => require("../../../../generated/courses/details/2530.json") as DetailsFile,
  "2540": () => require("../../../../generated/courses/details/2540.json") as DetailsFile,
  "2610": () => require("../../../../generated/courses/details/2610.json") as DetailsFile,
}

const prerequisitesLoaders = {
  "2520": () =>
    require("../../../../generated/courses/prerequisites/2520.json") as PrerequisitesFile,
  "2530": () =>
    require("../../../../generated/courses/prerequisites/2530.json") as PrerequisitesFile,
  "2540": () =>
    require("../../../../generated/courses/prerequisites/2540.json") as PrerequisitesFile,
  "2610": () =>
    require("../../../../generated/courses/prerequisites/2610.json") as PrerequisitesFile,
}

export const courseRepository = new CourseRepository({
  semestersFile,
  catalogueLoaders,
  detailsLoaders,
  prerequisitesLoaders,
})
