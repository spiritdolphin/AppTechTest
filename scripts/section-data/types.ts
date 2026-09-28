export const SECTIONS_SCHEMA_VERSION = 1

export const SCHEDULE_REVISION = "5ee0630dbac7071851fc70c1692f80bea92ade7e"
export const SCHEDULE_SOURCE_SHA256 =
  "6cd099fb5c02c4abda8ebcf06e94e2e3002eb8bc3547df331e46573c1dde7231"
export const SCHEDULE_SOURCE_URL = `https://huggingface.co/datasets/ust-archive/schedule/resolve/${SCHEDULE_REVISION}/classes.parquet`

export interface SourceMeeting {
  weekday: string
  date_from: Date
  date_to: Date
  time_from: bigint | number
  time_to: bigint | number
  venue: string
  venue_name: string
  instructors: string[]
}

export interface SourceReservation {
  name: string
  quota: number
  enroll: number
}

export interface SourceClass {
  term_code: string
  course_id: string
  section: string
  number: number | null
  role: string
  type: string
  association: number | null
  remarks: string
  capacity: number
  enroll: number
  wait: number
  consent: boolean
  open: boolean
  schedules: SourceMeeting[]
  reservations: SourceReservation[]
  status: string
  timestamp: Date
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

export interface TermSectionStats {
  termCode: string
  sourceRows: number
  latestRows: number
  activeRows: number
  matchedRows: number
  unmatchedRows: number
  coursesWithSections: number
}

export interface SectionManifest {
  schemaVersion: number
  source: {
    url: string
    revision: string
    sha256: string
    bytes: number
    rows: number
  }
  catalogueSourceSha256: string
  files: { path: string; bytes: number; sha256: string }[]
  terms: TermSectionStats[]
}
