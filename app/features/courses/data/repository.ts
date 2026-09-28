import { resolveDependencyGraph as buildDependencyGraph } from "./resolveDependencyGraph"
import type { ResolvedDependencyGraph } from "../domain/dependencyGraph"
import type {
  CatalogueFile,
  CourseDetail,
  DepartmentSummary,
  DetailsFile,
  PrerequisiteEntry,
  PrerequisitesFile,
  SectionsFile,
  CourseSection,
  SemesterSummary,
  SemestersFile,
} from "../domain/types"

export type CatalogueLoader = () => CatalogueFile | Promise<CatalogueFile>
export type DetailsLoader = () => DetailsFile | Promise<DetailsFile>
export type PrerequisitesLoader = () => PrerequisitesFile | Promise<PrerequisitesFile>
export type SectionsLoader = () => SectionsFile | Promise<SectionsFile>

export interface CourseRepositoryOptions {
  semestersFile: SemestersFile
  catalogueLoaders: Record<string, CatalogueLoader>
  detailsLoaders: Record<string, DetailsLoader>
  prerequisitesLoaders: Record<string, PrerequisitesLoader>
  sectionsLoaders?: Record<string, SectionsLoader>
}

export class CourseRepository {
  private readonly semesters: SemesterSummary[]
  private readonly semesterByCode: Map<string, SemesterSummary>
  private readonly catalogueLoaders: Record<string, CatalogueLoader>
  private readonly detailsLoaders: Record<string, DetailsLoader>
  private readonly prerequisitesLoaders: Record<string, PrerequisitesLoader>
  private readonly sectionsLoaders?: Record<string, SectionsLoader>
  private readonly catalogueCache = new Map<string, Promise<CatalogueFile>>()
  private readonly detailsCache = new Map<string, Promise<DetailsFile>>()
  private readonly prerequisitesCache = new Map<string, Promise<PrerequisitesFile>>()
  private readonly sectionsCache = new Map<string, Promise<SectionsFile>>()

  constructor({
    semestersFile,
    catalogueLoaders,
    detailsLoaders,
    prerequisitesLoaders,
    sectionsLoaders,
  }: CourseRepositoryOptions) {
    if (semestersFile.schemaVersion !== 1) {
      throw new Error(`Unsupported semester schema version: ${semestersFile.schemaVersion}`)
    }
    if (semestersFile.semesters.length === 0) throw new Error("No course semesters are available")

    this.semesters = semestersFile.semesters
    this.semesterByCode = new Map(this.semesters.map((semester) => [semester.termCode, semester]))
    this.catalogueLoaders = catalogueLoaders
    this.detailsLoaders = detailsLoaders
    this.prerequisitesLoaders = prerequisitesLoaders
    this.sectionsLoaders = sectionsLoaders

    this.semesters.forEach(({ termCode }) => {
      if (!catalogueLoaders[termCode]) {
        throw new Error(`Missing catalogue loader for semester ${termCode}`)
      }
      if (!detailsLoaders[termCode]) {
        throw new Error(`Missing details loader for semester ${termCode}`)
      }
      if (!prerequisitesLoaders[termCode]) {
        throw new Error(`Missing prerequisites loader for semester ${termCode}`)
      }
      if (sectionsLoaders && !sectionsLoaders[termCode]) {
        throw new Error(`Missing sections loader for semester ${termCode}`)
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

  loadDetails(termCode: string): Promise<DetailsFile> {
    const cached = this.detailsCache.get(termCode)
    if (cached) return cached

    const loader = this.detailsLoaders[termCode]
    if (!loader) return Promise.reject(new Error(`Unknown semester: ${termCode}`))

    const request = Promise.resolve()
      .then(loader)
      .then((details) => {
        if (details.schemaVersion !== 1) {
          throw new Error(`Unsupported details schema version: ${details.schemaVersion}`)
        }
        if (details.termCode !== termCode) {
          throw new Error(`Details term mismatch: expected ${termCode}, got ${details.termCode}`)
        }
        return details
      })
      .catch((error: unknown) => {
        this.detailsCache.delete(termCode)
        throw error
      })

    this.detailsCache.set(termCode, request)
    return request
  }

  async getCourseDetail(termCode: string, courseCode: string): Promise<CourseDetail | undefined> {
    const details = await this.loadDetails(termCode)
    return details.coursesByCode[courseCode]
  }

  loadSections(termCode: string): Promise<SectionsFile> {
    const cached = this.sectionsCache.get(termCode)
    if (cached) return cached

    const loader = this.sectionsLoaders?.[termCode]
    if (!loader) return Promise.reject(new Error(`Unknown sections semester: ${termCode}`))

    const request = Promise.resolve()
      .then(loader)
      .then((sections) => {
        if (sections.schemaVersion !== 1) {
          throw new Error(`Unsupported sections schema version: ${sections.schemaVersion}`)
        }
        if (sections.termCode !== termCode) {
          throw new Error(`Sections term mismatch: expected ${termCode}, got ${sections.termCode}`)
        }
        return sections
      })
      .catch((error: unknown) => {
        this.sectionsCache.delete(termCode)
        throw error
      })

    this.sectionsCache.set(termCode, request)
    return request
  }

  async getCourseSections(termCode: string, courseId: string): Promise<readonly CourseSection[]> {
    if (!this.sectionsLoaders) return []
    const sections = await this.loadSections(termCode)
    return sections.sectionsByCourseId[courseId] ?? []
  }

  loadPrerequisites(termCode: string): Promise<PrerequisitesFile> {
    const cached = this.prerequisitesCache.get(termCode)
    if (cached) return cached

    const loader = this.prerequisitesLoaders[termCode]
    if (!loader) return Promise.reject(new Error(`Unknown semester: ${termCode}`))

    const request = Promise.resolve()
      .then(loader)
      .then((prerequisites) => {
        if (prerequisites.schemaVersion !== 1) {
          throw new Error(
            `Unsupported prerequisites schema version: ${prerequisites.schemaVersion}`,
          )
        }
        if (prerequisites.termCode !== termCode) {
          throw new Error(
            `Prerequisites term mismatch: expected ${termCode}, got ${prerequisites.termCode}`,
          )
        }
        return prerequisites
      })
      .catch((error: unknown) => {
        this.prerequisitesCache.delete(termCode)
        throw error
      })

    this.prerequisitesCache.set(termCode, request)
    return request
  }

  async getPrerequisiteEntry(
    termCode: string,
    courseCode: string,
  ): Promise<PrerequisiteEntry | undefined> {
    const prerequisites = await this.loadPrerequisites(termCode)
    return prerequisites.byCourseCode[courseCode]
  }

  async resolveDependencyGraph(
    termCode: string,
    courseCode: string,
    maxDepth = 3,
  ): Promise<ResolvedDependencyGraph> {
    const [catalogue, prerequisites] = await Promise.all([
      this.loadCatalogue(termCode),
      this.loadPrerequisites(termCode),
    ])
    return buildDependencyGraph({ catalogue, courseCode, maxDepth, prerequisites })
  }

  async getAvailableSemestersForCourse(courseCode: string): Promise<SemesterSummary[]> {
    const availability = await Promise.all(
      this.semesters.map(async (semester) => ({
        available: (await this.loadCatalogue(semester.termCode)).courses.some(
          (course) => course.code === courseCode,
        ),
        semester,
      })),
    )

    return availability.filter(({ available }) => available).map(({ semester }) => semester)
  }
}
