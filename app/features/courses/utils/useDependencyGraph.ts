import { useCallback, useEffect, useState } from "react"

import type { CourseRepository } from "../data/repository"
import type { ResolvedDependencyGraph } from "../domain/dependencyGraph"

interface UseDependencyGraphOptions {
  courseCode: string
  maxDepth: number
  repository: CourseRepository
  termCode: string
}

interface DependencyGraphLoadState {
  graph?: ResolvedDependencyGraph
  isLoading: boolean
  loadError?: string
  retry: () => void
}

export function useDependencyGraph({
  courseCode,
  maxDepth,
  repository,
  termCode,
}: UseDependencyGraphOptions): DependencyGraphLoadState {
  const [graph, setGraph] = useState<ResolvedDependencyGraph>()
  const [loadError, setLoadError] = useState<string>()
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setGraph(undefined)
    setLoadError(undefined)

    repository
      .resolveDependencyGraph(termCode, courseCode, maxDepth)
      .then((resolvedGraph) => {
        if (active) setGraph(resolvedGraph)
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Unable to load prerequisites.")
        }
      })

    return () => {
      active = false
    }
  }, [courseCode, loadAttempt, maxDepth, repository, termCode])

  const retry = useCallback(() => setLoadAttempt((attempt) => attempt + 1), [])

  return { graph, isLoading: !graph && !loadError, loadError, retry }
}
