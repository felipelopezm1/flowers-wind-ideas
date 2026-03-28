import { FlowerVariation } from "@/types/flowers";
import { polarRoseRadius, vShape } from "./flowerMath";

const TEXTURE_SIZE = 512;

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

export function generateFlowerTexture(variation: FlowerVariation): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const data = imageData.data;

  const half = TEXTURE_SIZE / 2;
  const colors = variation.petalColors.map(parseHex);
  const centerCol = parseHex(variation.centerColor);

  const maxEnvelope = variation.petalLength + variation.diameter;
  const renderScale = (half * 0.88) / maxEnvelope;
  const centerDiskR = half * 0.07;

  for (let py = 0; py < TEXTURE_SIZE; py++) {
    for (let px = 0; px < TEXTURE_SIZE; px++) {
      const dx = px - half;
      const dy = py - half;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const phi = Math.atan2(dy, dx);

      const envelope = polarRoseRadius(
        phi,
        variation.petalNum,
        variation.petalLength,
        variation.petalSharpness,
        variation.diameter
      );

      const bumpMod =
        1 +
        variation.bumpiness * 0.02 * Math.sin(variation.bumpFrequency * phi);
      const pixelMaxR = envelope * bumpMod * renderScale;

      if (dist > pixelMaxR) continue;

      const idx = (py * TEXTURE_SIZE + px) * 4;
      const t = dist / pixelMaxR;

      if (dist < centerDiskR) {
        const cBlend = dist / centerDiskR;
        const innerCenter = lerpColor(
          [centerCol[0] + 30, centerCol[1] + 20, centerCol[2]],
          centerCol,
          cBlend
        );
        data[idx] = Math.min(255, innerCenter[0]);
        data[idx + 1] = Math.min(255, innerCenter[1]);
        data[idx + 2] = Math.min(255, innerCenter[2]);
        data[idx + 3] = 255;
        continue;
      }

      const zDepth = vShape(1, t * 3, variation.curvature[0], variation.curvature[1]);
      const shadeFactor = 0.55 + 0.45 * Math.min(1, zDepth * 2);

      const colorProgress = t;
      const segmentFloat = colorProgress * (colors.length - 1);
      const colorIdx = Math.floor(segmentFloat);
      const nextIdx = Math.min(colorIdx + 1, colors.length - 1);
      const blend = segmentFloat - colorIdx;

      const baseColor = lerpColor(colors[colorIdx], colors[nextIdx], blend);

      const r = Math.min(255, Math.max(0, baseColor[0] * shadeFactor));
      const g = Math.min(255, Math.max(0, baseColor[1] * shadeFactor));
      const b = Math.min(255, Math.max(0, baseColor[2] * shadeFactor));

      const edgeSoftness = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;
      const alpha = Math.floor(edgeSoftness * 255);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateAllTextures(
  variations: FlowerVariation[]
): HTMLCanvasElement[] {
  return variations.map((v) => generateFlowerTexture(v));
}
