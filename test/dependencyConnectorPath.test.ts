import {
  alignedNodeTop,
  buildOrthogonalConnectorPath,
  connectorTipBeforeBoundary,
} from "../app/features/courses/utils/dependencyConnectorPath"

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

  test("stops the arrow outside the prerequisite frame", () => {
    const source = { x: 100, y: 40 }
    const tip = connectorTipBeforeBoundary(180, 100)

    expect(tip).toEqual({ x: 170, y: 100 })
    expect(buildOrthogonalConnectorPath(source, tip)).toMatch(/^M 100 40 /)
    expect(tip.x).toBeLessThan(180)
  })

  test("centers the current course on the first prerequisite course", () => {
    expect(alignedNodeTop(68, 76)).toBe(30)
    expect(alignedNodeTop(20, 76)).toBe(0)
  })
})
