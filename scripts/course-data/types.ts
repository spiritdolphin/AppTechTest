export const COURSE_DATA_SCHEMA_VERSION = 1
export const COURSE_DATA_GENERATOR_VERSION = 1

export interface SourceAttribute {
  label: string
  value: string
  description: string
}

export interface SourceLearningOutcome {
  description: string
}

export interface SourceCourse {
  id: string
  term_num: number
  term_code: string
  term_name: string
  academic_year: string
  campus_code: string
  campus_name: string
  campus_nickname: string
  department_code: string
  department_nickname: string
  school_code: string
  career_code: string
  career_type: string
  prefix: string
  number: string
  title: string
  min_credits: number
  max_credits: number
  vector: string
  vector_display: string
  description: string
  previous: string
  alternate: string
  prerequisite: string
  corequisite: string
  exclusion: string
  background: string
  colist: string
  equivalence: string
  reference: string
  attributes: SourceAttribute[]
  cilos: SourceLearningOutcome[]
  timestamp: string
  status: string
}

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
  attributes: SourceAttribute[]
  learningOutcomes: string[]
  sourceTimestamp: string
  status: string
}

export interface DetailsFile {
  schemaVersion: number
  termCode: string
  coursesByCode: Record<string, CourseDetail>
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

export interface ManifestFileEntry {
  path: string
  bytes: number
  sha256: string
}

export interface CourseDataManifest {
  schemaVersion: number
  generatorVersion: number
  source: {
    path: string
    bytes: number
    recordCount: number
    sha256: string
  }
  latestTermCode: string
  files: ManifestFileEntry[]
}

export interface GeneratedCourseData {
  semesters: SemestersFile
  catalogues: Map<string, CatalogueFile>
  details: Map<string, DetailsFile>
  prerequisites: Map<string, PrerequisitesFile>
}
