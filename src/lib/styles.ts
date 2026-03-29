export interface FlowerStyle {
  id: string;
  name: string;
  icon: string;
  bgColor: string;
  sphereColor: string;
  sphereRoughness: number;
  sphereMetalness: number;
  glowColor: string;
  glowAccent: string;
  glowIntensity: number;
  grassVisible: boolean;
  ambientIntensity: number;
  keyLightIntensity: number;
  keyLightColor: string;
}

export const STYLES: FlowerStyle[] = [
  {
    id: "lush",
    name: "Lush",
    icon: "🌿",
    bgColor: "#FAFAF8",
    sphereColor: "#5a8a3c",
    sphereRoughness: 0.92,
    sphereMetalness: 0,
    glowColor: "#8BC34A",
    glowAccent: "#C6FF00",
    glowIntensity: 1.2,
    grassVisible: true,
    ambientIntensity: 0.65,
    keyLightIntensity: 1.1,
    keyLightColor: "#FFFDE8",
  },
  {
    id: "mono",
    name: "Mono",
    icon: "◐",
    bgColor: "#111111",
    sphereColor: "#2a2a2a",
    sphereRoughness: 0.3,
    sphereMetalness: 0.7,
    glowColor: "#aaaacc",
    glowAccent: "#6666ff",
    glowIntensity: 1.6,
    grassVisible: false,
    ambientIntensity: 0.4,
    keyLightIntensity: 1.4,
    keyLightColor: "#E0E0FF",
  },
  {
    id: "pixel",
    name: "Pixel",
    icon: "▦",
    bgColor: "#1a1a2e",
    sphereColor: "#2d6a4f",
    sphereRoughness: 1.0,
    sphereMetalness: 0,
    glowColor: "#52b788",
    glowAccent: "#95d5b2",
    glowIntensity: 0.8,
    grassVisible: true,
    ambientIntensity: 0.8,
    keyLightIntensity: 0.8,
    keyLightColor: "#FFFFFF",
  },
  {
    id: "watercolor",
    name: "Wash",
    icon: "❍",
    bgColor: "#F5F0E8",
    sphereColor: "#b8c5a8",
    sphereRoughness: 1.0,
    sphereMetalness: 0,
    glowColor: "#D4C4A0",
    glowAccent: "#E8D8B8",
    glowIntensity: 0.9,
    grassVisible: true,
    ambientIntensity: 0.85,
    keyLightIntensity: 0.6,
    keyLightColor: "#FFF8E8",
  },
  {
    id: "neon",
    name: "Neon",
    icon: "◈",
    bgColor: "#0a0a0a",
    sphereColor: "#1a1a1a",
    sphereRoughness: 0.15,
    sphereMetalness: 0.9,
    glowColor: "#ff00ff",
    glowAccent: "#00ffff",
    glowIntensity: 2.0,
    grassVisible: false,
    ambientIntensity: 0.25,
    keyLightIntensity: 0.6,
    keyLightColor: "#8800ff",
  },
];

export function getStyle(id: string): FlowerStyle {
  return STYLES.find((s) => s.id === id) || STYLES[0];
}

function getImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d")!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function putImageData(canvas: HTMLCanvasElement, data: ImageData) {
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(data, 0, 0);
}

export function applyStylePostProcess(
  canvas: HTMLCanvasElement,
  styleId: string
): HTMLCanvasElement {
  switch (styleId) {
    case "mono":
      return applyMono(canvas);
    case "pixel":
      return applyPixel(canvas);
    case "watercolor":
      return applyWatercolor(canvas);
    case "neon":
      return applyNeon(canvas);
    default:
      return canvas;
  }
}

function applyMono(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);

  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const origHue = Math.atan2(
      Math.sqrt(3) * (d[i + 1] - d[i + 2]),
      2 * d[i] - d[i + 1] - d[i + 2]
    );
    const tint = 8 + Math.sin(origHue) * 6;
    d[i] = Math.min(255, lum + tint);
    d[i + 1] = Math.min(255, lum + tint * 0.3);
    d[i + 2] = Math.min(255, lum + tint * 1.4);
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.08;
  ctx.drawImage(src, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  return out;
}

function applyPixel(src: HTMLCanvasElement): HTMLCanvasElement {
  const scale = 8;
  const sw = Math.floor(src.width / scale);
  const sh = Math.floor(src.height / scale);

  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(src, 0, 0, sw, sh);

  const imgData = sctx.getImageData(0, 0, sw, sh);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    d[i] = Math.round(d[i] / 32) * 32;
    d[i + 1] = Math.round(d[i + 1] / 32) * 32;
    d[i + 2] = Math.round(d[i + 2] / 32) * 32;
    if (d[i + 3] > 0) d[i + 3] = d[i + 3] > 80 ? 255 : 0;
  }
  sctx.putImageData(imgData, 0, 0);

  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, out.width, out.height);

  return out;
}

function applyWatercolor(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;

  ctx.filter = "blur(1.5px)";
  ctx.globalAlpha = 0.6;
  ctx.drawImage(src, 0, 0);

  ctx.filter = "none";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(src, 0, 0);

  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#E8D8C0";
  ctx.fillRect(0, 0, out.width, out.height);

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 5) continue;
    d[i] = Math.min(255, d[i] + 15);
    d[i + 1] = Math.min(255, d[i + 1] + 10);
    d[i + 2] = Math.min(255, d[i + 2] + 8);
    const fade = 0.88 + Math.random() * 0.12;
    d[i + 3] = Math.round(d[i + 3] * fade);
  }
  ctx.putImageData(imgData, 0, 0);

  return out;
}

function applyNeon(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;

  const imgData = getImageData(src);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;

    d[i] = Math.min(255, Math.round(r * (1.3 + sat * 0.5)));
    d[i + 1] = Math.min(255, Math.round(g * (1.3 + sat * 0.5)));
    d[i + 2] = Math.min(255, Math.round(b * (1.3 + sat * 0.5)));
  }
  putImageData(out, imgData);

  const glow = document.createElement("canvas");
  glow.width = src.width;
  glow.height = src.height;
  const gctx = glow.getContext("2d")!;
  gctx.filter = "blur(6px)";
  gctx.drawImage(out, 0, 0);

  ctx.drawImage(glow, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(glow, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(out, 0, 0);

  return out;
}
