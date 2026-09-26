export interface ConnectorPoint {
  x: number
  y: number
}

interface ConnectorPathOptions {
  arrowSize?: number
  radius?: number
}

export function buildOrthogonalConnectorPath(
  source: ConnectorPoint,
  target: ConnectorPoint,
  { arrowSize = 7, radius = 8 }: ConnectorPathOptions = {},
): string {
  const endX = target.x - arrowSize
  const verticalDistance = target.y - source.y

  if (Math.abs(verticalDistance) < 1) {
    return `M ${source.x} ${source.y} H ${endX}`
  }

  const bendX = source.x + (endX - source.x) / 2
  const direction = Math.sign(verticalDistance)
  const curveRadius = Math.max(
    0,
    Math.min(
      radius,
      Math.abs(verticalDistance) / 2,
      Math.abs(bendX - source.x),
      Math.abs(endX - bendX),
    ),
  )

  if (curveRadius === 0) {
    return `M ${source.x} ${source.y} H ${bendX} V ${target.y} H ${endX}`
  }

  const firstHorizontalEnd = bendX - curveRadius
  const firstVerticalEnd = source.y + direction * curveRadius
  const secondVerticalStart = target.y - direction * curveRadius
  const secondHorizontalStart = bendX + curveRadius

  return [
    `M ${source.x} ${source.y}`,
    `H ${firstHorizontalEnd}`,
    `Q ${bendX} ${source.y} ${bendX} ${firstVerticalEnd}`,
    `V ${secondVerticalStart}`,
    `Q ${bendX} ${target.y} ${secondHorizontalStart} ${target.y}`,
    `H ${endX}`,
  ].join(" ")
}
