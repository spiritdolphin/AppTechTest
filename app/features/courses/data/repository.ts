import type {
  CatalogueFile,
  DepartmentSummary,
  SemesterSummary,
  SemestersFile,
} from "../domain/types"

export type CatalogueLoader = () => CatalogueFile | Promise<CatalogueFile>

export interface CourseRepositoryOptions {
  semestersFile: SemestersFile
  catalogueLoaders: Record<string, CatalogueLoader>
}

export class CourseRepository {
  private readonly semesters: SemesterSummary[]
  private readonly semesterByCode: Map<string, SemesterSummary>
  private readonly catalogueLoaders: Record<string, CatalogueLoader>
  private readonly catalogueCache = new Map<string, Promise<CatalogueFile>>()

  constructor({ semestersFile, catalogueLoaders }: CourseRepositoryOptions) {
    if (semestersFile.schemaVersion !== 1) {
      throw new Error(`Unsupported semester schema version: ${semestersFile.schemaVersion}`)
    }
    if (semestersFile.semesters.length === 0) throw new Error("No course semesters are available")

    this.semesters = semestersFile.semesters
    this.semesterByCode = new Map(this.semesters.map((semester) => [semester.termCode, semester]))
    this.catalogueLoaders = catalogueLoaders

    this.semesters.forEach(({ termCode }) => {
      if (!catalogueLoaders[termCode]) {
        throw new Error(`Missing catalogue loader for semester ${termCode}`)
      }
    })
  }

  getSemesters(): readonly SemesterSummary[] {
    return this.semesters
  }

  getLatestSemester(): SemesterSummary {
    return this.semesters[0]
  }

  getSemester(termCode: string): SemesterSummary | undefined {
    return this.semesterByCode.get(termCode)
  }

  getDepartments(termCode: string): readonly DepartmentSummary[] {
    return this.semesterByCode.get(termCode)?.departments ?? []
  }

  loadCatalogue(termCode: string): Promise<CatalogueFile> {
    const cached = this.catalogueCache.get(termCode)
    if (cached) return cached

    const loader = this.catalogueLoaders[termCode]
    if (!loader) return Promise.reject(new Error(`Unknown semester: ${termCode}`))

    const request = Promise.resolve()
      .then(loader)
      .then((catalogue) => {
        if (catalogue.schemaVersion !== 1) {
          throw new Error(`Unsupported catalogue schema version: ${catalogue.schemaVersion}`)
        }
        if (catalogue.termCode !== termCode) {
          throw new Error(
            `Catalogue term mismatch: expected ${termCode}, got ${catalogue.termCode}`,
          )
        }
        return catalogue
      })
      .catch((error: unknown) => {
        this.catalogueCache.delete(termCode)
        throw error
      })

    this.catalogueCache.set(termCode, request)
    return request
  }
}
