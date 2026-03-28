import { FlowerVariation } from "@/types/flowers";
import { mulberry32 } from "./seededRng";

const TEX_W = 512;
const TEX_H = 768;
const HEAD_CENTER_Y = TEX_H * 0.35;
const HEAD_CENTER_X = TEX_W / 2;

function hexToRgba(hex: string, alpha: number = 1): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number,
  sharpness: number,
  colors: string[],
  rng: () => number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const tipRound = Math.max(0.05, 1 - sharpness * 0.4);
  const wobble = (rng() - 0.5) * width * 0.15;

  ctx.beginPath();
  ctx.moveTo(0, 0);

  const cp1x = -width * 0.55 + wobble;
  const cp1y = -length * 0.35;
  const cp2x = -width * tipRound * 0.3;
  const cp2y = -length * 0.85;
  const tipX = 0;
  const tipY = -length;

  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);

  const cp3x = width * tipRound * 0.3;
  const cp3y = -length * 0.85;
  const cp4x = width * 0.55 - wobble;
  const cp4y = -length * 0.35;

  ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, 0, 0);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, 0, -length);
  const stops = colors.length;
  for (let i = 0; i < stops; i++) {
    grad.addColorStop(i / (stops - 1), colors[i]);
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = hexToRgba(darken(colors[0], 40), 0.15);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();
}

function drawCenter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number
) {
  const grad = ctx.createRadialGradient(
    cx - radius * 0.2,
    cy - radius * 0.2,
    radius * 0.1,
    cx,
    cy,
    radius
  );
  grad.addColorStop(0, hexToRgba(color, 1));
  grad.addColorStop(0.7, darken(color, 25));
  grad.addColorStop(1, darken(color, 50));

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const dotCount = Math.floor(radius * 1.5);
  for (let i = 0; i < dotCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * radius * 0.75;
    const dx = cx + Math.cos(a) * r;
    const dy = cy + Math.sin(a) * r;
    ctx.beginPath();
    ctx.arc(dx, dy, 1 + rng() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(darken(color, 35 + rng() * 25), 0.5);
    ctx.fill();
  }
}

function drawStem(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endY: number,
  rng: () => number
) {
  const curveX = startX + (rng() - 0.5) * 30;
  const midY = (startY + endY) / 2;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(curveX, midY, startX + (rng() - 0.5) * 8, endY);

  const stemGrad = ctx.createLinearGradient(startX, startY, startX, endY);
  stemGrad.addColorStop(0, "#5a8a3c");
  stemGrad.addColorStop(1, "#3d6b2e");
  ctx.strokeStyle = stemGrad;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.stroke();

  const leafY = midY + (rng() - 0.5) * 30;
  const leafSide = rng() > 0.5 ? 1 : -1;
  const leafBaseX = curveX * 0.5 + startX * 0.5;

  ctx.save();
  ctx.translate(leafBaseX, leafY);
  ctx.rotate(leafSide * (0.3 + rng() * 0.4));

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(leafSide * 18, -12, leafSide * 30, -2);
  ctx.quadraticCurveTo(leafSide * 18, 8, 0, 0);
  ctx.closePath();

  const leafGrad = ctx.createLinearGradient(0, 0, leafSide * 30, 0);
  leafGrad.addColorStop(0, "#5a9a3c");
  leafGrad.addColorStop(1, "#3a7a2c");
  ctx.fillStyle = leafGrad;
  ctx.fill();
  ctx.restore();
}

export function generateFlowerTexture(
  variation: FlowerVariation,
  seed: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;

  const rng = mulberry32(seed);

  const headRadius = Math.min(TEX_W, TEX_H * 0.6) * 0.4;
  const petalLength =
    headRadius * (0.6 + (variation.petalLength / 300) * 0.6);
  const petalWidth = petalLength * (0.25 + (1 - variation.petalSharpness / 5) * 0.25);
  const centerRadius = headRadius * (0.15 + (variation.diameter / 250) * 0.12);

  const numPetals = variation.petalNum;
  const angleStep = (Math.PI * 2) / numPetals;

  const hasInnerLayer = numPetals >= 10;

  if (hasInnerLayer) {
    const innerCount = Math.floor(numPetals * 0.6);
    const innerStep = (Math.PI * 2) / innerCount;
    for (let i = 0; i < innerCount; i++) {
      const angle = innerStep * i + angleStep * 0.5 + (rng() - 0.5) * 0.15;
      drawPetal(
        ctx,
        HEAD_CENTER_X,
        HEAD_CENTER_Y,
        angle - Math.PI / 2,
        petalLength * 0.6,
        petalWidth * 0.7,
        variation.petalSharpness,
        variation.petalColors.map((c) => darken(c, 15)),
        rng
      );
    }
  }

  for (let i = 0; i < numPetals; i++) {
    const angle = angleStep * i + (rng() - 0.5) * 0.12;
    const lenVar = 1 + (rng() - 0.5) * 0.12;
    const widVar = 1 + (rng() - 0.5) * 0.1;

    drawPetal(
      ctx,
      HEAD_CENTER_X,
      HEAD_CENTER_Y,
      angle - Math.PI / 2,
      petalLength * lenVar,
      petalWidth * widVar,
      variation.petalSharpness,
      variation.petalColors,
      rng
    );
  }

  drawCenter(
    ctx,
    HEAD_CENTER_X,
    HEAD_CENTER_Y,
    centerRadius,
    variation.centerColor,
    rng
  );

  drawStem(ctx, HEAD_CENTER_X, HEAD_CENTER_Y + centerRadius * 0.5, TEX_H - 20, rng);

  return canvas;
}

export function generateAllTextures(
  variations: FlowerVariation[],
  baseSeed: number = 0
): HTMLCanvasElement[] {
  return variations.map((v, i) => generateFlowerTexture(v, baseSeed + i * 1000 + 7));
}
