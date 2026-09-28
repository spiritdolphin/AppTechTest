import {
  CourseSection,
  SECTIONS_SCHEMA_VERSION,
  SectionsFile,
  SourceClass,
  SourceMeeting,
  SourceReservation,
  TermSectionStats,
} from "./types"
import type { SourceCourse } from "../course-data/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertString(value: unknown, path: string): asserts value is string {
  assert(typeof value === "string", `${path} must be a string`)
}

function assertNumber(value: unknown, path: string): asserts value is number {
  assert(typeof value === "number" && Number.isFinite(value), `${path} must be a number`)
}

function assertDate(value: unknown, path: string): asserts value is Date {
  assert(value instanceof Date && !Number.isNaN(value.getTime()), `${path} must be a date`)
}

function assertSourceMeeting(value: unknown, path: string): asserts value is SourceMeeting {
  assert(isRecord(value), `${path} must be an object`)
  for (const key of ["weekday", "venue", "venue_name"] as const) {
    assertString(value[key], `${path}.${key}`)
  }
  assertDate(value.date_from, `${path}.date_from`)
  assertDate(value.date_to, `${path}.date_to`)
  for (const key of ["time_from", "time_to"] as const) {
    assert(
      typeof value[key] === "bigint" || typeof value[key] === "number",
      `${path}.${key} must be a time`,
    )
  }
  assert(Array.isArray(value.instructors), `${path}.instructors must be an array`)
  value.instructors.forEach((instructor, index) =>
    assertString(instructor, `${path}.instructors[${index}]`),
  )
}

function assertSourceReservation(value: unknown, path: string): asserts value is SourceReservation {
  assert(isRecord(value), `${path} must be an object`)
  assertString(value.name, `${path}.name`)
  assertNumber(value.quota, `${path}.quota`)
  assertNumber(value.enroll, `${path}.enroll`)
}

function assertSourceClass(value: unknown, index: number): asserts value is SourceClass {
  const path = `classes[${index}]`
  assert(isRecord(value), `${path} must be an object`)
  for (const key of [
    "term_code",
    "course_id",
    "section",
    "role",
    "type",
    "remarks",
    "status",
  ] as const) {
    assertString(value[key], `${path}.${key}`)
  }
  assert(value.term_code && value.course_id && value.section, `${path} has no class identity`)
  for (const key of ["capacity", "enroll", "wait"] as const) {
    assertNumber(value[key], `${path}.${key}`)
  }
  for (const key of ["number", "association"] as const) {
    if (value[key] !== null) assertNumber(value[key], `${path}.${key}`)
  }
  assert(typeof value.consent === "boolean", `${path}.consent must be a boolean`)
  assert(typeof value.open === "boolean", `${path}.open must be a boolean`)
  assertDate(value.timestamp, `${path}.timestamp`)
  assert(Array.isArray(value.schedules), `${path}.schedules must be an array`)
  value.schedules.forEach((meeting, meetingIndex) =>
    assertSourceMeeting(meeting, `${path}.schedules[${meetingIndex}]`),
  )
  assert(Array.isArray(value.reservations), `${path}.reservations must be an array`)
  value.reservations.forEach((reservation, reservationIndex) =>
    assertSourceReservation(reservation, `${path}.reservations[${reservationIndex}]`),
  )
}

export function parseSourceClasses(rows: unknown[], termCodes: ReadonlySet<string>): SourceClass[] {
  return rows.flatMap((row, index) => {
    if (!isRecord(row) || !termCodes.has(String(row.term_code))) return []
    assertSourceClass(row, index)
    return [row]
  })
}

function formatTime(value: bigint | number): string {
  const micros = Number(value)
  assert(Number.isInteger(micros) && micros >= 0 && micros < 86_400_000_000, "Invalid meeting time")
  const minutes = Math.floor(micros / 60_000_000)
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function toCourseSection(source: SourceClass): CourseSection {
  return {
    section: source.section,
    classNumber: source.number,
    type: source.type,
    role: source.role,
    association: source.association,
    capacity: source.capacity,
    enrolled: source.enroll,
    waitlisted: source.wait,
    consentRequired: source.consent,
    open: source.open,
    meetings: source.schedules.map((meeting) => ({
      weekday: meeting.weekday,
      dateFrom: meeting.date_from.toISOString().slice(0, 10),
      dateTo: meeting.date_to.toISOString().slice(0, 10),
      timeFrom: formatTime(meeting.time_from),
      timeTo: formatTime(meeting.time_to),
      venue: meeting.venue,
      venueName: meeting.venue_name,
      instructors: meeting.instructors.filter((instructor) => instructor.trim()),
    })),
    reservations: source.reservations.map((reservation) => ({
      name: reservation.name,
      quota: reservation.quota,
      enrolled: reservation.enroll,
    })),
    remarks: source.remarks.trim(),
    snapshotAt: source.timestamp.toISOString(),
  }
}

const typeOrder: Record<string, number> = { LEC: 0, TUT: 1, LAB: 2, IND: 3 }

function compareSections(left: CourseSection, right: CourseSection): number {
  const typeDifference = (typeOrder[left.type] ?? 4) - (typeOrder[right.type] ?? 4)
  return typeDifference || left.section.localeCompare(right.section, "en", { numeric: true })
}

export function buildSectionData(
  sourceCourses: SourceCourse[],
  sourceClasses: SourceClass[],
): { files: Map<string, SectionsFile>; stats: TermSectionStats[] } {
  const coursesByTerm = new Map<string, Set<string>>()
  sourceCourses.forEach(({ id, term_code: termCode }) => {
    const courseIds = coursesByTerm.get(termCode) ?? new Set<string>()
    courseIds.add(id)
    coursesByTerm.set(termCode, courseIds)
  })

  const latestByIdentity = new Map<string, SourceClass>()
  const sourceCounts = new Map<string, number>()
  sourceClasses.forEach((source) => {
    if (!coursesByTerm.has(source.term_code)) return
    sourceCounts.set(source.term_code, (sourceCounts.get(source.term_code) ?? 0) + 1)
    const key = `${source.term_code}:${source.course_id}:${source.section}`
    const previous = latestByIdentity.get(key)
    if (previous && previous.timestamp.getTime() === source.timestamp.getTime()) {
      throw new Error(`Duplicate schedule snapshot for ${key}`)
    }
    if (!previous || previous.timestamp < source.timestamp) latestByIdentity.set(key, source)
  })

  const files = new Map<string, SectionsFile>()
  const stats: TermSectionStats[] = []
  coursesByTerm.forEach((courseIds, termCode) => {
    const latest = [...latestByIdentity.values()].filter(
      (section) => section.term_code === termCode,
    )
    const active = latest.filter((section) => section.status === "ACTIVE")
    const matched = active.filter((section) => courseIds.has(section.course_id))
    const byCourseId = new Map<string, CourseSection[]>()
    matched.forEach((section) => {
      const sections = byCourseId.get(section.course_id) ?? []
      sections.push(toCourseSection(section))
      byCourseId.set(section.course_id, sections)
    })
    const sectionsByCourseId: Record<string, CourseSection[]> = {}
    ;[...byCourseId.keys()].sort().forEach((courseId) => {
      sectionsByCourseId[courseId] = byCourseId.get(courseId)!.sort(compareSections)
    })
    files.set(termCode, {
      schemaVersion: SECTIONS_SCHEMA_VERSION,
      termCode,
      sectionsByCourseId,
    })
    stats.push({
      termCode,
      sourceRows: sourceCounts.get(termCode) ?? 0,
      latestRows: latest.length,
      activeRows: active.length,
      matchedRows: matched.length,
      unmatchedRows: active.length - matched.length,
      coursesWithSections: byCourseId.size,
    })
  })

  stats.sort((left, right) => left.termCode.localeCompare(right.termCode))
  return { files, stats }
}
