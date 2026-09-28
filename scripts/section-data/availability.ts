import type { LectureAvailabilityFile, SectionsFile } from "./types"

export function buildLectureAvailability(sections: SectionsFile): LectureAvailabilityFile {
  const byCourseId: LectureAvailabilityFile["byCourseId"] = {}
  Object.entries(sections.sectionsByCourseId).forEach(([courseId, courseSections]) => {
    const lectures = courseSections
      .filter((section) => section.type === "LEC" && section.capacity > 0)
      .map((section) => section.open && section.enrolled < section.capacity)
    if (lectures.length > 0) byCourseId[courseId] = lectures
  })
  return { schemaVersion: 1, termCode: sections.termCode, byCourseId }
}
