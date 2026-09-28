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

export interface SectionMeeting {
  weekday: string
  dateFrom: string
  dateTo: string
  timeFrom: string
  timeTo: string
  venue: string
  venueName: string
  instructors: string[]
}

export interface SectionReservation {
  name: string
  quota: number
  enrolled: number
}

export interface CourseSection {
  section: string
  classNumber: number | null
  type: string
  role: string
  association: number | null
  capacity: number
  enrolled: number
  waitlisted: number
  consentRequired: boolean
  open: boolean
  meetings: SectionMeeting[]
  reservations: SectionReservation[]
  remarks: string
  snapshotAt: string
}

export interface SectionsFile {
  schemaVersion: number
  termCode: string
  sectionsByCourseId: Record<string, CourseSection[]>
}

export interface PrerequisiteEntry {
  originalText: string
  referencedCourseCodes: string[]
}

export interface PrerequisitesFile {
  schemaVersion: number
  termCode: string
  byCourseCode: Record<string, PrerequisiteEntry>
  reverseByCourseCode: Record<string, string[]>
}

export interface CourseSearchOptions {
  query?: string
  departmentCode?: string
}
