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

export interface CourseAttribute {
  label: string
  value: string
  description: string
}

export interface CourseDetail {
  id: string
  code: string
  prefix: string
  number: string
  title: string
  termNum: number
  termCode: string
  termName: string
  academicYear: string
  minCredits: number
  maxCredits: number
  vector: string
  vectorDisplay: string
  description: string
  campusCode: string
  campusName: string
  campusNickname: string
  departmentCode: string
  departmentNickname: string
  schoolCode: string
  careerCode: string
  careerType: string
  previous: string
  alternate: string
  prerequisite: string
  corequisite: string
  exclusion: string
  background: string
  colist: string
  equivalence: string
  reference: string
  attributes: CourseAttribute[]
  learningOutcomes: string[]
  sourceTimestamp: string
  status: string
}

export interface DetailsFile {
  schemaVersion: number
  termCode: string
  coursesByCode: Record<string, CourseDetail>
}

export interface CourseSearchOptions {
  query?: string
  departmentCode?: string
}
