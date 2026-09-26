import { buildOrthogonalConnectorPath } from "../app/features/courses/utils/dependencyConnectorPath"

describe("buildOrthogonalConnectorPath", () => {
  test("draws a straight connector for aligned anchors", () => {
    expect(buildOrthogonalConnectorPath({ x: 100, y: 40 }, { x: 160, y: 40 })).toBe(
      "M 100 40 H 153",
    )
  })

  test("draws rounded downward turns", () => {
    expect(buildOrthogonalConnectorPath({ x: 100, y: 40 }, { x: 180, y: 100 })).toBe(
      "M 100 40 H 128.5 Q 136.5 40 136.5 48 V 92 Q 136.5 100 144.5 100 H 173",
    )
  })

  test("draws rounded upward turns", () => {
    expect(buildOrthogonalConnectorPath({ x: 100, y: 100 }, { x: 180, y: 40 })).toBe(
      "M 100 100 H 128.5 Q 136.5 100 136.5 92 V 48 Q 136.5 40 144.5 40 H 173",
    )
  })
})
