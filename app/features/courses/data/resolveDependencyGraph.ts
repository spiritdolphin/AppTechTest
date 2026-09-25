import type {
  ResolvedCourseDependency,
  ResolvedDependencyGraph,
  ResolvedDependencyItem,
} from "../domain/dependencyGraph"
import { parsePrerequisite, type PrerequisiteExpression } from "../domain/prerequisiteParser"
import type { CatalogueFile, PrerequisiteEntry, PrerequisitesFile } from "../domain/types"

interface ResolveDependencyGraphOptions {
  catalogue: CatalogueFile
  courseCode: string
  maxDepth?: number
  prerequisites: PrerequisitesFile
}

interface ResolveContext {
  catalogueByCode: Map<string, CatalogueFile["courses"][number]>
  expanded: Set<string>
  maxDepth: number
  prerequisites: PrerequisitesFile
}

function uniqueCourseCodes(...groups: readonly string[][]): string[] {
  return Array.from(new Set(groups.flat()))
}

function fallbackExpression(courseCodes: string[]): PrerequisiteExpression[] {
  return courseCodes.map((courseCode) => ({ type: "course", courseCode }))
}

function expressionForEntry(entry: PrerequisiteEntry): {
  expressions: PrerequisiteExpression[]
  mode: "structured" | "extracted"
} {
  const allowedPrefixes = new Set(
    entry.referencedCourseCodes.map((courseCode) => courseCode.split(" ")[0]),
  )
  const parsed = parsePrerequisite(entry.originalText, { allowedPrefixes })
  if (parsed.complete && parsed.expression) {
    return { expressions: [parsed.expression], mode: "structured" }
  }

  const courseCodes = uniqueCourseCodes(parsed.extractedCourseCodes, entry.referencedCourseCodes)
  return {
    expressions: fallbackExpression(courseCodes),
    mode: "extracted",
  }
}

async function resolveExpression(
  expression: PrerequisiteExpression,
  ancestors: ReadonlySet<string>,
  depth: number,
  context: ResolveContext,
): Promise<ResolvedDependencyItem> {
  if (expression.type === "course") {
    return resolveCourse(expression.courseCode, ancestors, depth, context)
  }

  return {
    kind: "group",
    operator: expression.type,
    children: await Promise.all(
      expression.children.map((child) => resolveExpression(child, ancestors, depth, context)),
    ),
  }
}

async function resolveCourse(
  courseCode: string,
  ancestors: ReadonlySet<string>,
  depth: number,
  context: ResolveContext,
): Promise<ResolvedCourseDependency> {
  const catalogueCourse = context.catalogueByCode.get(courseCode)
  const node: ResolvedCourseDependency = {
    kind: "course",
    courseCode,
    title: catalogueCourse?.title,
    available: Boolean(catalogueCourse),
  }

  if (ancestors.has(courseCode)) return { ...node, marker: "cycle" }
  if (context.expanded.has(courseCode)) return { ...node, marker: "repeated" }
  context.expanded.add(courseCode)
  if (!catalogueCourse) return node

  const entry = context.prerequisites.byCourseCode[courseCode]
  if (!entry?.originalText.trim()) return node
  if (depth >= context.maxDepth) return { ...node, marker: "more" }

  const nextAncestors = new Set(ancestors)
  nextAncestors.add(courseCode)
  const parsedEntry = expressionForEntry(entry)

  if (parsedEntry.mode === "extracted") {
    node.prerequisites = {
      kind: "group",
      operator: "extracted",
      children: await Promise.all(
        parsedEntry.expressions.map((child) =>
          resolveExpression(child, nextAncestors, depth + 1, context),
        ),
      ),
    }
  } else if (parsedEntry.expressions[0]) {
    node.prerequisites = await resolveExpression(
      parsedEntry.expressions[0],
      nextAncestors,
      depth + 1,
      context,
    )
  }

  return node
}

export async function resolveDependencyGraph({
  catalogue,
  courseCode,
  maxDepth = 3,
  prerequisites,
}: ResolveDependencyGraphOptions): Promise<ResolvedDependencyGraph> {
  const catalogueByCode = new Map(catalogue.courses.map((course) => [course.code, course]))
  const currentCourse = catalogueByCode.get(courseCode)
  const entry = prerequisites.byCourseCode[courseCode]

  if (!entry?.originalText.trim()) {
    return {
      courseCode,
      currentCourseAvailable: Boolean(currentCourse),
      mode: "none",
      originalText: "",
      termCode: catalogue.termCode,
      title: currentCourse?.title,
    }
  }

  const parsedEntry = expressionForEntry(entry)
  const context: ResolveContext = {
    catalogueByCode,
    expanded: new Set([courseCode]),
    maxDepth,
    prerequisites,
  }
  const ancestors = new Set([courseCode])
  let resolved: ResolvedDependencyItem | undefined

  if (parsedEntry.mode === "extracted") {
    resolved = {
      kind: "group",
      operator: "extracted",
      children: await Promise.all(
        parsedEntry.expressions.map((expression) =>
          resolveExpression(expression, ancestors, 1, context),
        ),
      ),
    }
  } else if (parsedEntry.expressions[0]) {
    resolved = await resolveExpression(parsedEntry.expressions[0], ancestors, 1, context)
  }

  return {
    courseCode,
    currentCourseAvailable: Boolean(currentCourse),
    mode: parsedEntry.mode,
    originalText: entry.originalText,
    prerequisites: resolved,
    termCode: catalogue.termCode,
    title: currentCourse?.title,
  }
}
