export type DependencyGroupOperator = "and" | "or" | "extracted"
export type DependencyNodeMarker = "cycle" | "repeated" | "more"

export interface ResolvedCourseDependency {
  kind: "course"
  courseCode: string
  title?: string
  available: boolean
  marker?: DependencyNodeMarker
  prerequisites?: ResolvedDependencyItem
}

export interface ResolvedDependencyGroup {
  kind: "group"
  operator: DependencyGroupOperator
  children: ResolvedDependencyItem[]
}

export type ResolvedDependencyItem = ResolvedCourseDependency | ResolvedDependencyGroup

export interface ResolvedDependencyGraph {
  courseCode: string
  currentCourseAvailable: boolean
  mode: "none" | "structured" | "extracted"
  originalText: string
  prerequisites?: ResolvedDependencyItem
  termCode: string
  title?: string
}
