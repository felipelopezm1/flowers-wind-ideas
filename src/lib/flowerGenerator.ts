import { FlowerVariation } from "@/types/flowers";
import { mulberry32 } from "./seededRng";
import { applyStylePostProcess } from "./styles";

const TEX_W = 512;
const TEX_H = 600;
const HEAD_CX = TEX_W / 2;
const HEAD_CY = TEX_H * 0.38;
const HEAD_R = TEX_W * 0.42;

function parseColor(color: string): [number, number, number] {
  const s = color.trim();
  if (s.startsWith("rgb")) {
    const m = s.match(/(\d+\.?\d*)/g);
    if (m && m.length >= 3)
      return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
  }
  const h = s.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length >= 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(Math.max(0, Math.min(255, r)))},${Math.round(Math.max(0, Math.min(255, g)))},${Math.round(Math.max(0, Math.min(255, b)))},${a})`;
}

function shade(hex: string, amt: number): string {
  const [r, g, b] = parseColor(hex);
  return rgba(r + amt, g + amt, b + amt, 1);
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function petalPath(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  sharpness: number,
  wobble: number
) {
  const tip = Math.max(0.12, 1 - sharpness * 0.25);
  const leftBulge = 0.66 + tip * 0.14 + wobble * 0.012;
  const rightBulge = 0.78 + tip * 0.09 - wobble * 0.012;
  const tipPull = 0.88 + sharpness * 0.04;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    -width * leftBulge + wobble, -length * 0.24,
    -width * tip * 0.62, -length * 0.7,
    width * wobble * 0.01, -length * tipPull
  );
  ctx.bezierCurveTo(
    width * tip * 0.48, -length * 0.82,
    width * rightBulge - wobble, -length * 0.28,
    0, 0
  );
  ctx.closePath();
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
  depth: number,
  rng: () => number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const wobble = (rng() - 0.5) * width * 0.1;
  const parsedColors = colors.map(parseColor);

  petalPath(ctx, length, width, sharpness, wobble);
  ctx.save();
  ctx.clip();

  const baseGrad = ctx.createLinearGradient(0, 0, 0, -length);
  const darkAmt = -50 * depth;
  const brightAmt = 40 * depth;
  for (let i = 0; i < parsedColors.length; i++) {
    const t = i / Math.max(1, parsedColors.length - 1);
    const s = darkAmt + (brightAmt - darkAmt) * t;
    const [r, g, b] = parsedColors[i];
    baseGrad.addColorStop(t, rgba(r + s, g + s, b + s, 1));
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  const edgeShadow = ctx.createLinearGradient(-width * 0.65, 0, width * 0.65, 0);
  edgeShadow.addColorStop(0, "rgba(0,0,0,0.38)");
  edgeShadow.addColorStop(0.15, "rgba(0,0,0,0.12)");
  edgeShadow.addColorStop(0.35, "rgba(0,0,0,0.02)");
  edgeShadow.addColorStop(0.5, "rgba(0,0,0,0)");
  edgeShadow.addColorStop(0.65, "rgba(0,0,0,0.02)");
  edgeShadow.addColorStop(0.85, "rgba(0,0,0,0.12)");
  edgeShadow.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = edgeShadow;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  const ridgeX = (rng() - 0.5) * width * 0.05;
  const ridgeGrad = ctx.createLinearGradient(
    ridgeX - width * 0.18, 0,
    ridgeX + width * 0.18, 0
  );
  ridgeGrad.addColorStop(0, "rgba(255,255,255,0)");
  ridgeGrad.addColorStop(0.3, `rgba(255,255,240,${0.22 * depth})`);
  ridgeGrad.addColorStop(0.5, `rgba(255,255,252,${0.4 * depth})`);
  ridgeGrad.addColorStop(0.7, `rgba(255,255,240,${0.22 * depth})`);
  ridgeGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = ridgeGrad;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  const hlY = -length * (0.4 + rng() * 0.2);
  const hlR = length * 0.28;
  const hlGrad = ctx.createRadialGradient(ridgeX, hlY, 0, ridgeX, hlY, hlR);
  hlGrad.addColorStop(0, `rgba(255,255,250,${0.42 * depth})`);
  hlGrad.addColorStop(0.35, `rgba(255,255,248,${0.2 * depth})`);
  hlGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hlGrad;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  const tipColor = parsedColors[parsedColors.length - 1] || parsedColors[0];
  const tipGrad = ctx.createRadialGradient(0, -length, 0, 0, -length, length * 0.35);
  tipGrad.addColorStop(0, rgba(
    Math.min(255, tipColor[0] + 60),
    Math.min(255, tipColor[1] + 55),
    Math.min(255, tipColor[2] + 50),
    0.4
  ));
  tipGrad.addColorStop(0.5, rgba(
    Math.min(255, tipColor[0] + 30),
    Math.min(255, tipColor[1] + 25),
    Math.min(255, tipColor[2] + 20),
    0.15
  ));
  tipGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = tipGrad;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  const baseShadow = ctx.createRadialGradient(0, 0, 0, 0, 0, length * 0.4);
  baseShadow.addColorStop(0, "rgba(0,0,0,0.32)");
  baseShadow.addColorStop(0.3, "rgba(0,0,0,0.15)");
  baseShadow.addColorStop(0.7, "rgba(0,0,0,0.04)");
  baseShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = baseShadow;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  const throatShadow = ctx.createLinearGradient(0, 0, 0, -length * 0.4);
  throatShadow.addColorStop(0, `rgba(0,0,0,${0.22 * depth})`);
  throatShadow.addColorStop(0.35, `rgba(0,0,0,${0.08 * depth})`);
  throatShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = throatShadow;
  ctx.fillRect(-width, -length * 0.45, width * 2, length * 0.45);

  const foldSide = rng() > 0.5 ? 1 : -1;
  const foldGrad = ctx.createLinearGradient(
    foldSide * -width * 0.5, -length * 0.4,
    foldSide * width * 0.5, -length * 0.4
  );
  foldGrad.addColorStop(0, `rgba(0,0,0,${0.12 * depth})`);
  foldGrad.addColorStop(0.3, "rgba(0,0,0,0)");
  foldGrad.addColorStop(0.7, "rgba(255,255,255,0)");
  foldGrad.addColorStop(1, `rgba(255,255,250,${0.14 * depth})`);
  ctx.fillStyle = foldGrad;
  ctx.fillRect(-width, -length - 5, width * 2, length + 10);

  ctx.restore();

  petalPath(ctx, length, width, sharpness, wobble);
  ctx.strokeStyle = rgba(
    parsedColors[0][0] - 35,
    parsedColors[0][1] - 35,
    parsedColors[0][2] - 35,
    0.06
  );
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -length * 0.08);
  const veinBend = (rng() - 0.5) * width * 0.06;
  ctx.quadraticCurveTo(veinBend, -length * 0.5, 0, -length * 0.88);
  ctx.strokeStyle = rgba(
    parsedColors[0][0] - 20,
    parsedColors[0][1] - 20,
    parsedColors[0][2] - 20,
    0.06
  );
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
  const [cr, cg, cb] = parseColor(color);

  const shadow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.3);
  shadow.addColorStop(0, "rgba(0,0,0,0.15)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(
    cx - radius * 0.2, cy - radius * 0.2, radius * 0.05,
    cx, cy, radius
  );
  grad.addColorStop(0, rgba(Math.min(255, cr + 30), Math.min(255, cg + 25), Math.min(255, cb + 20), 1));
  grad.addColorStop(0.4, rgba(cr, cg, cb, 1));
  grad.addColorStop(0.8, rgba(cr - 25, cg - 25, cb - 25, 1));
  grad.addColorStop(1, rgba(cr - 40, cg - 40, cb - 40, 0.9));
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const dots = Math.floor(radius * 3);
  for (let i = 0; i < dots; i++) {
    const a = rng() * Math.PI * 2;
    const dr = rng() * radius * 0.82;
    const dotR = 0.5 + rng() * 1.5;
    const bright = rng() > 0.6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr, dotR, 0, Math.PI * 2);
    ctx.fillStyle = bright
      ? rgba(Math.min(255, cr + 40), Math.min(255, cg + 35), Math.min(255, cb + 30), 0.4)
      : rgba(cr - 30, cg - 30, cb - 30, 0.45);
    ctx.fill();
  }
}

interface StemColors {
  stem: string;
  stemDark: string;
  leaf: string;
}

const DEFAULT_STEM_COLORS: StemColors = {
  stem: "#4a7a34",
  stemDark: "#2e5520",
  leaf: "#4a8a30",
};

function drawStem(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endY: number,
  rng: () => number,
  colors: StemColors = DEFAULT_STEM_COLORS
) {
  const [sr, sg2, sb] = parseColor(colors.stem);
  const [dr, dg, db] = parseColor(colors.stemDark);
  const [lr, lg2, lb] = parseColor(colors.leaf);
  const midR = Math.round((sr + dr) / 2);
  const midG = Math.round((sg2 + dg) / 2);
  const midB = Math.round((sb + db) / 2);

  const curve = (rng() - 0.5) * 16;
  const midY = (startY + endY) * 0.5;
  const endX = startX + (rng() - 0.5) * 5;
  const stemWidth = 4.4 + rng() * 0.6;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(startX + curve, midY, endX, endY);
  const sg = ctx.createLinearGradient(startX, startY, startX, endY);
  sg.addColorStop(0, rgba(sr, sg2, sb, 1));
  sg.addColorStop(0.5, rgba(midR, midG, midB, 1));
  sg.addColorStop(1, rgba(dr, dg, db, 1));
  ctx.strokeStyle = sg;
  ctx.lineWidth = stemWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startX - stemWidth * 0.15, startY + 3);
  ctx.quadraticCurveTo(startX + curve * 0.85, midY, endX - stemWidth * 0.1, endY);
  ctx.strokeStyle = "rgba(255,255,245,0.12)";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.stroke();

  const calyxColor = rgba(sr + 16, sg2 + 10, sb + 6, 1);
  for (let i = 0; i < 4; i++) {
    const sa = (i / 4) * Math.PI + Math.PI * 0.5;
    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(sa);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-3, 6, 0, 12);
    ctx.quadraticCurveTo(3, 6, 0, 0);
    ctx.fillStyle = calyxColor;
    ctx.fill();
    ctx.restore();
  }

  const leafCount = 1 + Math.floor(rng() * 2);
  for (let li = 0; li < leafCount; li++) {
    const ly = startY + (endY - startY) * (0.3 + rng() * 0.35);
    const lt = (ly - startY) / (endY - startY);
    const lx = startX + curve * lt * (1 - lt) * 2;
    const side = li % 2 === 0 ? 1 : -1;
    const sz = 20 + rng() * 14;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(side * (0.35 + rng() * 0.35));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * sz * 0.5, -sz * 0.35, side * sz, -2);
    ctx.quadraticCurveTo(side * sz * 0.5, sz * 0.25, 0, 0);
    ctx.closePath();
    const lg = ctx.createLinearGradient(0, 0, side * sz, 0);
    lg.addColorStop(0, rgba(lr, lg2, lb, 1));
    lg.addColorStop(0.5, rgba(lr + 16, lg2 + 16, lb + 10, 1));
    lg.addColorStop(1, rgba(lr - 16, lg2 - 10, lb - 8, 1));
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2 * side, 0);
    ctx.quadraticCurveTo(side * sz * 0.5, -sz * 0.04, side * sz * 0.85, -1);
    ctx.strokeStyle = rgba(lr - 30, lg2 - 20, lb - 15, 0.35);
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
    petalLength * (0.3 + (1 - Math.min(v.petalSharpness, 4) / 4) * 0.32);
  const centerR = HEAD_R * (0.12 + (v.diameter / 250) * 0.1);
  const depth = Math.min(1, (v.curvature[0] + v.curvature[1]) * 0.8);
  const angleStep = (Math.PI * 2) / numPetals;

  const layers = numPetals >= 8 ? 3 : numPetals >= 5 ? 2 : 1;

  for (let layer = layers - 1; layer >= 0; layer--) {
    const layerFrac = layer / Math.max(1, layers - 1);
    const lScale = 0.45 + layerFrac * 0.55;
    const lShade = -30 * (1 - layerFrac);
    const lCount =
      layer === 0
        ? numPetals
        : Math.max(3, Math.floor(numPetals * (0.45 + layer * 0.2)));
    const lStep = (Math.PI * 2) / lCount;
    const lOffset = layer * angleStep * 0.35;

    for (let i = 0; i < lCount; i++) {
      const angle = lStep * i + lOffset + (rng() - 0.5) * 0.15;
      const lenV = 1 + (rng() - 0.5) * 0.12;
      const widV = 1 + (rng() - 0.5) * 0.1;

      drawPetal(
        ctx,
        HEAD_CX,
        HEAD_CY,
        angle - Math.PI / 2,
        petalLength * lScale * lenV,
        petalWidth * lScale * widV,
        v.petalSharpness,
        v.petalColors.map((c) => shade(c, lShade)),
        depth * (0.6 + layerFrac * 0.4),
        rng
      );
    }
  }

  const petalSeat = ctx.createRadialGradient(
    HEAD_CX,
    HEAD_CY,
    centerR * 0.55,
    HEAD_CX,
    HEAD_CY,
    centerR * 2.2
  );
  petalSeat.addColorStop(0, "rgba(70,40,10,0.14)");
  petalSeat.addColorStop(0.5, "rgba(45,25,8,0.08)");
  petalSeat.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = petalSeat;
  ctx.beginPath();
  ctx.arc(HEAD_CX, HEAD_CY, centerR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  drawCenter(ctx, HEAD_CX, HEAD_CY, centerR, v.centerColor, rng);

  const crown = ctx.createRadialGradient(
    HEAD_CX - centerR * 0.12,
    HEAD_CY - centerR * 0.18,
    0,
    HEAD_CX,
    HEAD_CY,
    centerR * 1.6
  );
  crown.addColorStop(0, "rgba(255,248,235,0.12)");
  crown.addColorStop(0.45, "rgba(255,248,235,0.04)");
  crown.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = crown;
  ctx.beginPath();
  ctx.arc(HEAD_CX, HEAD_CY, centerR * 1.55, 0, Math.PI * 2);
  ctx.fill();
}

export function generateFlowerTexture(
  variation: FlowerVariation,
  seed: number,
  stemColors?: StemColors
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  const rng = mulberry32(seed);
  const stemEnd = Math.min(TEX_H - 8, HEAD_CY + HEAD_R * 0.05 + TEX_H * 0.35);
  drawStem(ctx, HEAD_CX, HEAD_CY + HEAD_R * 0.05, stemEnd, rng, stemColors);
  renderFlowerHead(ctx, variation, rng);

  return canvas;
}

export function generateAllTextures(
  variations: FlowerVariation[],
  baseSeed: number = 0,
  styleId: string = "lush",
  stemColors?: StemColors
): HTMLCanvasElement[] {
  return variations.map((v, i) => {
    const raw = generateFlowerTexture(v, baseSeed + i * 1000 + 7, stemColors);
    return applyStylePostProcess(raw, styleId);
  });
}

export type { StemColors };
