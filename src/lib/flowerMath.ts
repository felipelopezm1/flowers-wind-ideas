/**
 * Polar rose parametric equations for procedural flower generation.
 * Ported from Creativeguru97's 3DMathFlowers (p5.js → TypeScript).
 *
 * Core formula:
 *   r(phi) = (L * |sin(n/2 * phi)|^s + D)
 * where n = petalNum, L = petalLength, s = sharpness, D = diameter
 */

export function polarRoseRadius(
  phi: number,
  petalNum: number,
  petalLength: number,
  petalSharpness: number,
  diameter: number
): number {
  return (
    petalLength *
      Math.pow(Math.abs(Math.sin((petalNum / 2) * phi)), petalSharpness) +
    diameter
  );
}

export function vShape(
  A: number,
  r: number,
  a: number,
  b: number,
  c: number = 1.5
): number {
  if (Math.abs(r) < 0.001) return 0;
  return A * Math.pow(Math.E, -b * Math.pow(Math.abs(r), c)) * Math.pow(Math.abs(r), a);
}

export function bumpiness(
  A: number,
  r: number,
  f: number,
  angle: number
): number {
  return 1 + A * Math.pow(r, 2) * Math.sin(f * angle);
}
