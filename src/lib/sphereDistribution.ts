const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

export function fibonacciSphere(
  count: number,
  radius: number = 1
): [number, number, number][] {
  const points: [number, number, number][] = [];

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / GOLDEN_RATIO;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(theta) * Math.sin(phi);

    points.push([x, y, z]);
  }

  return points;
}
