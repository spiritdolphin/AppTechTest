export interface DepartmentSummary {
  code: string
  name: string
  courseCount: number
}

export interface SemesterSummary {
  termNum: number
  termCode: string
  termName: string
  academicYear: string
  courseCount: number
  departments: DepartmentSummary[]
}

export interface SemestersFile {
  schemaVersion: number
  semesters: SemesterSummary[]
}

export interface CatalogueCourse {
  id: string
  code: string
  normalizedCode: string
  title: string
  normalizedTitle: string
  departmentCode: string
  minCredits: number
  maxCredits: number
}

export interface CatalogueFile {
  schemaVersion: number
  termCode: string
  courses: CatalogueCourse[]
}

export interface CourseSearchOptions {
  query?: string
  departmentCode?: string
}
