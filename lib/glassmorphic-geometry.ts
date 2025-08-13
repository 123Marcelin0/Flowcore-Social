export type Point = { x: number; y: number }

export function distance(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

// Cubic bezier between left/right anchors with a horizontal tension
export function cubicPath(a: Point, b: Point) {
  const dx = Math.max(40, Math.min(260, Math.abs(b.x - a.x) * 0.7))
  const c1 = { x: a.x + dx, y: a.y }
  const c2 = { x: b.x - dx, y: b.y }
  return `M ${a.x},${a.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`
}
