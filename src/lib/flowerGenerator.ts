import { FlowerVariation } from "@/types/flowers";
import { mulberry32 } from "./seededRng";

const TEX_W = 512;
const TEX_H = 768;
const HEAD_CX = TEX_W / 2;
const HEAD_CY = TEX_H * 0.32;
const HEAD_R = TEX_W * 0.42;

function parseColor(color: string): [number, number, number] {
  const s = color.trim();

  if (s.startsWith("rgb")) {
    const m = s.match(/(\d+\.?\d*)/g);
    if (m && m.length >= 3) {
      return [
        Math.round(parseFloat(m[0])),
        Math.round(parseFloat(m[1])),
        Math.round(parseFloat(m[2])),
      ];
    }
  }

  const h = s.replace("#", "");
  let r = 0,
    g = 0,
    b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length >= 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }

  return [
    isNaN(r) ? 128 : r,
    isNaN(g) ? 128 : g,
    isNaN(b) ? 128 : b,
  ];
}

function hexToRgba(hex: string, a: number = 1): string {
  const [r, g, b] = parseColor(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function shadeHex(hex: string, amount: number): string {
  const [r, g, b] = parseColor(hex);
  return `rgb(${Math.round(Math.max(0, Math.min(255, r + amount)))},${Math.round(Math.max(0, Math.min(255, g + amount)))},${Math.round(Math.max(0, Math.min(255, b + amount)))})`;
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
  curvatureDepth: number,
  rng: () => number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const tipControl = Math.max(0.05, 1 - sharpness * 0.35);
  const wobble = (rng() - 0.5) * width * 0.12;

  ctx.beginPath();
  ctx.moveTo(0, 0);

  ctx.bezierCurveTo(
    -width * 0.6 + wobble,
    -length * 0.32,
    -width * tipControl * 0.35,
    -length * 0.82,
    0,
    -length
  );

  ctx.bezierCurveTo(
    width * tipControl * 0.35,
    -length * 0.82,
    width * 0.6 - wobble,
    -length * 0.32,
    0,
    0
  );
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, 0, -length);
  const stops = colors.length;

  const baseDark = -25 * curvatureDepth;
  const tipBright = 20 * curvatureDepth;
  for (let i = 0; i < stops; i++) {
    const t = i / Math.max(1, stops - 1);
    const shade = baseDark + (tipBright - baseDark) * t;
    grad.addColorStop(t, shadeHex(colors[i], shade));
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -length * 0.05);
  ctx.quadraticCurveTo(
    (rng() - 0.5) * width * 0.08,
    -length * 0.5,
    0,
    -length * 0.92
  );
  ctx.strokeStyle = hexToRgba(shadeHex(colors[0], -50), 0.08);
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(shadeHex(colors[0], -40), 0.1);
  ctx.lineWidth = 0.5;
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
    cx - radius * 0.15,
    cy - radius * 0.15,
    radius * 0.05,
    cx,
    cy,
    radius
  );
  grad.addColorStop(0, hexToRgba(color, 1));
  grad.addColorStop(0.5, shadeHex(color, -20));
  grad.addColorStop(1, shadeHex(color, -45));
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const dots = Math.floor(radius * 2.5);
  for (let i = 0; i < dots; i++) {
    const a = rng() * Math.PI * 2;
    const dr = rng() * radius * 0.8;
    const dotR = 0.7 + rng() * 1.3;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr, dotR, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(shadeHex(color, -30 - rng() * 20), 0.5);
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
  const curveAmt = (rng() - 0.5) * 16;
  const midY = (startY + endY) * 0.5;
  const endX = startX + (rng() - 0.5) * 5;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(startX + curveAmt, midY, endX, endY);
  const stemGrad = ctx.createLinearGradient(startX, startY, startX, endY);
  stemGrad.addColorStop(0, "#4a7a34");
  stemGrad.addColorStop(0.5, "#3d6b2a");
  stemGrad.addColorStop(1, "#2e5520");
  ctx.strokeStyle = stemGrad;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();

  for (let i = 0; i < 5; i++) {
    const sepalAngle = (i / 5) * Math.PI + Math.PI * 0.5;
    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(sepalAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, 9, 0, 18);
    ctx.quadraticCurveTo(4, 9, 0, 0);
    ctx.fillStyle = "#4a7a34";
    ctx.fill();
    ctx.restore();
  }

  const leafCount = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < leafCount; i++) {
    const leafY = startY + (endY - startY) * (0.3 + rng() * 0.35);
    const interpT = (leafY - startY) / (endY - startY);
    const leafX = startX + curveAmt * interpT * (1 - interpT) * 2;
    const side = i % 2 === 0 ? 1 : -1;
    const size = 20 + rng() * 14;

    ctx.save();
    ctx.translate(leafX, leafY);
    ctx.rotate(side * (0.35 + rng() * 0.35));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * size * 0.5, -size * 0.35, side * size, -2);
    ctx.quadraticCurveTo(side * size * 0.5, size * 0.25, 0, 0);
    ctx.closePath();
    const leafGrad = ctx.createLinearGradient(0, 0, side * size, 0);
    leafGrad.addColorStop(0, "#4a8a30");
    leafGrad.addColorStop(0.5, "#5a9a3a");
    leafGrad.addColorStop(1, "#3a7a28");
    ctx.fillStyle = leafGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2 * side, 0);
    ctx.quadraticCurveTo(side * size * 0.5, -size * 0.04, side * size * 0.85, -1);
    ctx.strokeStyle = "rgba(50,90,30,0.35)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.restore();
  }
}

function renderFlowerHead(
  ctx: CanvasRenderingContext2D,
  v: FlowerVariation,
  rng: () => number
) {
  const numPetals = v.petalNum;
  const petalLength = HEAD_R * (0.55 + (v.petalLength / 300) * 0.45);
  const petalWidth =
    petalLength * (0.22 + (1 - Math.min(v.petalSharpness, 4) / 4) * 0.28);
  const centerR = HEAD_R * (0.12 + (v.diameter / 250) * 0.1);

  const curvatureDepth = Math.min(1, (v.curvature[0] + v.curvature[1]) * 0.8);

  const angleStep = (Math.PI * 2) / numPetals;

  if (numPetals >= 10) {
    const innerCount = Math.floor(numPetals * 0.6);
    const innerStep = (Math.PI * 2) / innerCount;
    for (let i = 0; i < innerCount; i++) {
      const angle = innerStep * i + angleStep * 0.5 + (rng() - 0.5) * 0.15;
      drawPetal(
        ctx,
        HEAD_CX,
        HEAD_CY,
        angle - Math.PI / 2,
        petalLength * 0.55,
        petalWidth * 0.65,
        v.petalSharpness,
        v.petalColors.map((c) => shadeHex(c, -15)),
        curvatureDepth * 0.7,
        rng
      );
    }
  }

  for (let i = 0; i < numPetals; i++) {
    const angle = angleStep * i + (rng() - 0.5) * 0.12;
    const lenVar = 1 + (rng() - 0.5) * 0.1;
    const widVar = 1 + (rng() - 0.5) * 0.08;

    drawPetal(
      ctx,
      HEAD_CX,
      HEAD_CY,
      angle - Math.PI / 2,
      petalLength * lenVar,
      petalWidth * widVar,
      v.petalSharpness,
      v.petalColors,
      curvatureDepth,
      rng
    );
  }

  drawCenter(ctx, HEAD_CX, HEAD_CY, centerR, v.centerColor, rng);
}

export function generateFlowerTexture(
  variation: FlowerVariation,
  seed: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  const rng = mulberry32(seed);

  const centerBottom = HEAD_CY + HEAD_R * 0.05;
  drawStem(ctx, HEAD_CX, centerBottom, TEX_H - 12, rng);

  renderFlowerHead(ctx, variation, rng);

  return canvas;
}

export function generateAllTextures(
  variations: FlowerVariation[],
  baseSeed: number = 0
): HTMLCanvasElement[] {
  return variations.map((v, i) =>
    generateFlowerTexture(v, baseSeed + i * 1000 + 7)
  );
}
