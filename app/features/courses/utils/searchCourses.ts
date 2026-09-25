import type { CatalogueCourse, CourseSearchOptions } from "../domain/types"

export function normalizeCourseSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s-]+/g, "")
}

function compareCourseCodes(left: CatalogueCourse, right: CatalogueCourse): number {
  if (left.code < right.code) return -1
  if (left.code > right.code) return 1
  return 0
}

function matchRank(course: CatalogueCourse, normalizedQuery: string): number | undefined {
  if (course.normalizedCode === normalizedQuery) return 0
  if (course.normalizedCode.startsWith(normalizedQuery)) return 1
  if (course.normalizedTitle.startsWith(normalizedQuery)) return 2
  if (
    course.normalizedCode.includes(normalizedQuery) ||
    course.normalizedTitle.includes(normalizedQuery)
  ) {
    return 3
  }

  return undefined
}

export function searchCourses(
  courses: readonly CatalogueCourse[],
  { query = "", departmentCode }: CourseSearchOptions = {},
): CatalogueCourse[] {
  const normalizedQuery = normalizeCourseSearch(query)
  const departmentCourses = departmentCode
    ? courses.filter((course) => course.departmentCode === departmentCode)
    : [...courses]

  if (!normalizedQuery) return departmentCourses.sort(compareCourseCodes)

  return departmentCourses
    .map((course) => ({ course, rank: matchRank(course, normalizedQuery) }))
    .filter((match): match is { course: CatalogueCourse; rank: number } => match.rank !== undefined)
    .sort((left, right) => left.rank - right.rank || compareCourseCodes(left.course, right.course))
    .map(({ course }) => course)
}
