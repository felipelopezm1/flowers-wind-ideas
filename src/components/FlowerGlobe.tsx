"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { FlowerGenerationParams, FlowerInstance } from "@/types/flowers";
import { FlowerIdea } from "@/types/ideas";
import { fibonacciSphere } from "@/lib/sphereDistribution";
import { generateAllTextures, StemColors } from "@/lib/flowerGenerator";
import { mulberry32 } from "@/lib/seededRng";
import { getStyle } from "@/lib/styles";

function parseHexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
  return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
}

const GLOBE_RADIUS = 2;
const FLOWER_COUNT = 1000;
const GRASS_COUNT = 2200;
const BLOOM_SPEED = 0.6;
const PLANE_ASPECT = 1.17;
const FLOWER_SCALE_MULT = 5.0;
const GRASS_VARIANTS = 5;

const FLY_POOL = 80;
const FLY_TRIGGER_DIST = 5.5;
const FLY_FULL_DIST = 3.5;
const LANDSCAPE_DIST = 4.0;
const LANDSCAPE_CLOSE = 2.4;
const WIND_DIR = new THREE.Vector3(1, 0.35, 0.5).normalize();

const HOVER_GROW = 1.4;

const COLOR_DEFAULT = new THREE.Color(1, 1, 1);
const COLOR_ACTIVE = new THREE.Color(0.65, 0.8, 1.0);
const COLOR_COMPLETED = new THREE.Color(1.0, 0.85, 0.4);

interface FlowerGlobeProps {
  params: FlowerGenerationParams;
  styleId?: string;
  ideas: Record<number, FlowerIdea>;
  onFlowerClick?: (
    globalIndex: number,
    position: THREE.Vector3,
    screenX: number,
    screenY: number
  ) => void;
}

function useFlowerTextures(params: FlowerGenerationParams, styleId: string) {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);
  const sc = params.sceneColors;
  const stemKey = `${sc.stemColor}|${sc.stemColorDark}|${sc.leafColor}`;

  useEffect(() => {
    try {
      const stemColors: StemColors = { stem: sc.stemColor, stemDark: sc.stemColorDark, leaf: sc.leafColor };
      const canvases = generateAllTextures(params.variations, params.seed, styleId, stemColors);
      const threeTextures = canvases.map((canvas) => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
      });
      setTextures(threeTextures);
      return () => { threeTextures.forEach((t) => t.dispose()); };
    } catch (err) {
      console.error("Flower texture generation failed:", err);
    }
  }, [params.variations, params.seed, styleId, stemKey]);

  return textures;
}

function makeGrassCanvas(
  hueShift: number, seed: number,
  baseColor: [number, number, number], tipColor: [number, number, number]
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 96; canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 96, 48);
  const rng = mulberry32(seed);
  const hueVar = hueShift * 8;
  const tuftCount = 7 + Math.floor(rng() * 5);
  for (let i = 0; i < tuftCount; i++) {
    const bx = 6 + rng() * 84, bh = 10 + rng() * 18, bw = 3 + rng() * 5;
    const lean = (rng() - 0.5) * 6;
    const rv = Math.floor((rng() - 0.5) * 18);
    const r0 = Math.max(0, Math.min(255, baseColor[0] + rv + hueVar));
    const g0 = Math.max(0, Math.min(255, baseColor[1] + rv));
    const b0 = Math.max(0, Math.min(255, baseColor[2] + rv));
    const r1 = Math.max(0, Math.min(255, tipColor[0] + rv + hueVar));
    const g1 = Math.max(0, Math.min(255, tipColor[1] + rv));
    const b1 = Math.max(0, Math.min(255, tipColor[2] + rv));
    const grad = ctx.createLinearGradient(bx, 48, bx + lean, 48 - bh);
    grad.addColorStop(0, `rgba(${r0},${g0},${b0},0.7)`);
    grad.addColorStop(0.6, `rgba(${Math.round((r0+r1)/2)},${Math.round((g0+g1)/2)},${Math.round((b0+b1)/2)},0.55)`);
    grad.addColorStop(1, `rgba(${r1},${g1},${b1},0.35)`);
    ctx.beginPath();
    ctx.moveTo(bx - bw, 48);
    ctx.quadraticCurveTo(bx + lean * 0.4 - bw * 0.2, 48 - bh * 0.5, bx + lean, 48 - bh);
    ctx.quadraticCurveTo(bx + lean * 0.4 + bw * 0.2, 48 - bh * 0.5, bx + bw, 48);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
  return canvas;
}

function useGrassTextures(grassBase: string, grassTip: string) {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);
  const colorKey = `${grassBase}|${grassTip}`;
  useEffect(() => {
    const base = parseHexToRgb(grassBase);
    const tip = parseHexToRgb(grassTip);
    const newTextures: THREE.CanvasTexture[] = [];
    for (let i = 0; i < GRASS_VARIANTS; i++) {
      const canvas = makeGrassCanvas(i, i * 7777 + 31, base, tip);
      const tex = new THREE.CanvasTexture(canvas);
      tex.premultiplyAlpha = false;
      tex.needsUpdate = true;
      newTextures.push(tex);
    }
    setTextures(newTextures);
    return () => { newTextures.forEach((t) => t.dispose()); };
  }, [colorKey]);
  return textures;
}

function distributeFlowers(params: FlowerGenerationParams, count: number): FlowerInstance[] {
  const rng = mulberry32(params.seed);
  const positions = fibonacciSphere(count, GLOBE_RADIUS);
  const totalFreq = params.variations.reduce((s, v) => s + v.frequency, 0);
  const cumulativeFreq: number[] = [];
  let cumulative = 0;
  for (const v of params.variations) { cumulative += v.frequency / totalFreq; cumulativeFreq.push(cumulative); }

  return positions.map(([x, y, z], globalIndex) => {
    const roll = rng();
    let variationIndex = 0;
    for (let i = 0; i < cumulativeFreq.length; i++) {
      if (roll <= cumulativeFreq[i]) { variationIndex = i; break; }
    }
    const variation = params.variations[variationIndex];
    const scale = (variation.size.min + rng() * (variation.size.max - variation.size.min)) * FLOWER_SCALE_MULT;
    const rotationZ = rng() * Math.PI * 2;
    return { globalIndex, position: [x, y, z] as [number, number, number], scale, variationIndex, rotationZ };
  });
}

interface GrassInstance {
  position: [number, number, number];
  scale: number;
  rotationZ: number;
  variant: number;
}

function distributeGrass(seed: number, count: number): GrassInstance[] {
  const rng = mulberry32(seed + 99999);
  const positions = fibonacciSphere(count, GLOBE_RADIUS);
  return positions.map(([x, y, z]) => {
    const scale = 0.18 + rng() * 0.25;
    const rotationZ = rng() * Math.PI * 2;
    const variant = Math.floor(rng() * GRASS_VARIANTS);
    return { position: [x, y, z] as [number, number, number], scale, rotationZ, variant };
  });
}

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }

interface VariationMeshProps {
  flowers: FlowerInstance[];
  texture: THREE.CanvasTexture;
  bloomRef: React.RefObject<number>;
  ideas: Record<number, FlowerIdea>;
  onFlowerClick?: (
    globalIndex: number,
    position: THREE.Vector3,
    screenX: number,
    screenY: number
  ) => void;
}

function VariationMesh({ flowers, texture, bloomRef, ideas, onFlowerClick }: VariationMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const hoveredRef = useRef<number>(-1);
  const hoverScales = useRef<Float32Array>(new Float32Array(flowers.length));
  const colorNeedsInit = useRef(true);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      hoveredRef.current = e.instanceId;
      document.body.style.cursor = "pointer";
    }
  }, []);

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && hoveredRef.current === e.instanceId) {
      hoveredRef.current = -1;
      document.body.style.cursor = "auto";
    }
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && onFlowerClick) {
      const f = flowers[e.instanceId];
      if (f) {
        const pos = new THREE.Vector3(f.position[0], f.position[1], f.position[2]);
        onFlowerClick(f.globalIndex, pos, e.clientX, e.clientY);
      }
    }
  }, [flowers, onFlowerClick]);

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    if (!mesh || flowers.length === 0) return;

    timeRef.current += delta;
    const time = timeRef.current;
    const bp = bloomRef.current ?? 2;
    const camDist = camera.position.length();
    const landscapeT = Math.max(0, Math.min(1, (LANDSCAPE_DIST - camDist) / (LANDSCAPE_DIST - LANDSCAPE_CLOSE)));
    const landscapeScale = 1 + landscapeT * 0.6;
    const hovered = hoveredRef.current;
    const scales = hoverScales.current;

    let colorChanged = colorNeedsInit.current;

    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      const normalizedY = (f.position[1] + GLOBE_RADIUS) / (2 * GLOBE_RADIUS);
      const flowerDelay = (1 - normalizedY) * 0.7 + (i % 7) * 0.015;
      const t = Math.max(0, Math.min(1, (bp - flowerDelay) / 0.4));
      const s = easeOutCubic(t);

      const windPhase = i * 0.37 + f.position[0] * 2.1 + f.position[2] * 1.3;
      const windStrength = 0.06 * s;
      const swayX = Math.sin(time * 1.2 + windPhase) * windStrength;
      const swayZ = Math.cos(time * 0.9 + windPhase * 0.7) * windStrength * 0.6;

      const isHovered = i === hovered;
      const targetScale = isHovered ? HOVER_GROW : 1;
      scales[i] += (targetScale - scales[i]) * Math.min(1, delta * (isHovered ? 10 : 6));

      dummy.position.set(f.position[0] + swayX, f.position[1], f.position[2] + swayZ);
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(f.rotationZ);
      const finalScale = f.scale * s * scales[i] * landscapeScale;
      dummy.scale.set(finalScale, finalScale * PLANE_ASPECT, finalScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const idea = ideas[f.globalIndex];
      let tintColor = COLOR_DEFAULT;
      if (idea) {
        tintColor = idea.status === "completed" ? COLOR_COMPLETED : COLOR_ACTIVE;
        colorChanged = true;
      }
      if (isHovered) {
        const hc = tintColor.clone().lerp(new THREE.Color(1.3, 1.3, 1.3), 0.4);
        mesh.setColorAt(i, hc);
        colorChanged = true;
      } else {
        mesh.setColorAt(i, tintColor);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (colorChanged && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
      colorNeedsInit.current = false;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, flowers.length]}
      frustumCulled={false}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.26}
        roughness={0.82}
        metalness={0.0}
      />
    </instancedMesh>
  );
}

interface GrassGroupProps {
  grasses: GrassInstance[];
  texture: THREE.CanvasTexture;
  bloomRef: React.RefObject<number>;
}

function GrassGroup({ grasses, texture, bloomRef }: GrassGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    if (!mesh || grasses.length === 0) return;
    timeRef.current += delta;
    const time = timeRef.current;
    const bp = bloomRef.current ?? 2;
    for (let i = 0; i < grasses.length; i++) {
      const g = grasses[i];
      const normalizedY = (g.position[1] + GLOBE_RADIUS) / (2 * GLOBE_RADIUS);
      const grassDelay = (1 - normalizedY) * 0.7 + (i % 11) * 0.01;
      const t = Math.max(0, Math.min(1, (bp - grassDelay) / 0.3));
      const s = easeOutCubic(t);
      const windPhase = i * 0.53 + g.position[0] * 3.1 + g.position[2] * 1.7;
      const windStrength = 0.04 * s;
      const swayX = Math.sin(time * 1.6 + windPhase) * windStrength;
      const swayZ = Math.cos(time * 1.1 + windPhase * 0.8) * windStrength * 0.5;
      dummy.position.set(g.position[0] + swayX, g.position[1], g.position[2] + swayZ);
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(g.rotationZ);
      const sc = g.scale * s;
      dummy.scale.set(sc * 0.7, sc * 0.35, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, grasses.length]} frustumCulled={false} raycast={() => {}}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

interface FlyingPetal { active: boolean; pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number; scale: number; rot: number; rotSpeed: number; texIdx: number; }
function makePetalPool(): FlyingPetal[] {
  return Array.from({ length: FLY_POOL }, () => ({ active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1, scale: 0.3, rot: 0, rotSpeed: 0, texIdx: 0 }));
}

interface FlyingPetalsProps { textures: THREE.CanvasTexture[]; flowers: FlowerInstance[]; bloomRef: React.RefObject<number>; }

function FlyingPetals({ textures, flowers, bloomRef }: FlyingPetalsProps) {
  const pool = useRef<FlyingPetal[]>(makePetalPool());
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spawnTimer = useRef(0);
  const rngRef = useRef(mulberry32(12345));

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    if (!mesh || textures.length === 0) return;
    if ((bloomRef.current ?? 0) < 1.2) return;
    const camDist = camera.position.length();
    if (camDist < LANDSCAPE_CLOSE) {
      for (let i = 0; i < FLY_POOL; i++) { pool.current[i].active = false; dummy.position.set(0, -999, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    const closeness = Math.max(0, Math.min(1, (FLY_TRIGGER_DIST - camDist) / (FLY_TRIGGER_DIST - FLY_FULL_DIST)));
    const rng = rngRef.current;
    const petals = pool.current;
    if (closeness > 0) {
      spawnTimer.current += delta;
      const spawnInterval = 0.12 / (closeness * closeness + 0.1);
      while (spawnTimer.current > spawnInterval) {
        spawnTimer.current -= spawnInterval;
        const inactive = petals.find((p) => !p.active);
        if (!inactive) break;
        const srcIdx = Math.floor(rng() * flowers.length);
        const src = flowers[srcIdx];
        inactive.active = true;
        inactive.pos.set(src.position[0], src.position[1], src.position[2]);
        const normal = inactive.pos.clone().normalize();
        inactive.pos.addScaledVector(normal, 0.15);
        const speed = 0.6 + rng() * 0.8;
        inactive.vel.copy(WIND_DIR).multiplyScalar(speed).addScaledVector(normal, 0.2 + rng() * 0.3);
        inactive.vel.x += (rng() - 0.5) * 0.3; inactive.vel.z += (rng() - 0.5) * 0.2;
        inactive.life = 0; inactive.maxLife = 3 + rng() * 4; inactive.scale = 0.15 + rng() * 0.3;
        inactive.rot = rng() * Math.PI * 2; inactive.rotSpeed = (rng() - 0.5) * 3;
        inactive.texIdx = src.variationIndex % textures.length;
      }
    }
    for (let i = 0; i < FLY_POOL; i++) {
      const p = petals[i];
      if (p.active) {
        p.life += delta;
        if (p.life >= p.maxLife) { p.active = false; } else {
          p.pos.addScaledVector(p.vel, delta); p.vel.y += delta * 0.03; p.vel.x += Math.sin(p.life * 2.5) * delta * 0.15; p.rot += p.rotSpeed * delta;
          const fadeIn = Math.min(1, p.life / 0.3); const fadeOut = Math.max(0, 1 - (p.life - p.maxLife + 1)); const opacity = fadeIn * fadeOut;
          dummy.position.copy(p.pos); dummy.quaternion.copy(camera.quaternion); dummy.rotateZ(p.rot);
          const s = p.scale * opacity; dummy.scale.set(s, s * PLANE_ASPECT, s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); continue;
        }
      }
      dummy.position.set(0, -999, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (textures.length === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, FLY_POOL]} frustumCulled={false} raycast={() => {}}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={textures[0]} transparent alphaTest={0.05} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

export default function FlowerGlobe({ params, styleId = "lush", ideas, onFlowerClick }: FlowerGlobeProps) {
  const style = getStyle(styleId);
  const sc = params.sceneColors;
  const textures = useFlowerTextures(params, styleId);
  const grassTextures = useGrassTextures(sc.grassBaseColor, sc.grassTipColor);

  const flowers = useMemo(() => distributeFlowers(params, FLOWER_COUNT), [params]);
  const grasses = useMemo(() => distributeGrass(params.seed, GRASS_COUNT), [params.seed]);

  const bloomRef = useRef(0);
  const seedRef = useRef(params.seed);

  useEffect(() => {
    if (seedRef.current !== params.seed) { seedRef.current = params.seed; bloomRef.current = 0; }
  }, [params.seed]);

  useFrame((_, delta) => { if (bloomRef.current < 2) bloomRef.current += delta * BLOOM_SPEED; });

  const flowersByVariation = useMemo(() => {
    const groups: FlowerInstance[][] = params.variations.map(() => []);
    for (const f of flowers) groups[f.variationIndex].push(f);
    return groups;
  }, [flowers, params.variations]);

  const grassesByVariant = useMemo(() => {
    const groups: GrassInstance[][] = Array.from({ length: GRASS_VARIANTS }, () => []);
    for (const g of grasses) groups[g.variant].push(g);
    return groups;
  }, [grasses]);

  const sphereColor = sc.sphereColor || style.sphereColor;

  return (
    <group>
      <mesh raycast={() => {}}>
        <sphereGeometry args={[GLOBE_RADIUS - 0.02, 64, 64]} />
        <meshStandardMaterial color={sphereColor} roughness={style.sphereRoughness} metalness={style.sphereMetalness} />
      </mesh>

      {style.grassVisible && grassTextures.length > 0 &&
        grassesByVariant.map((group, i) =>
          group.length > 0 && grassTextures[i] && (
            <GrassGroup key={`grass-${i}`} grasses={group} texture={grassTextures[i]} bloomRef={bloomRef} />
          )
        )}

      {flowersByVariation.map((group, i) =>
        group.length > 0 && textures[i] && (
          <VariationMesh key={`flower-${i}`} flowers={group} texture={textures[i]} bloomRef={bloomRef} ideas={ideas} onFlowerClick={onFlowerClick} />
        )
      )}

      <FlyingPetals textures={textures} flowers={flowers} bloomRef={bloomRef} />
    </group>
  );
}
