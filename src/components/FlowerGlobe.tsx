"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FlowerGenerationParams, FlowerInstance } from "@/types/flowers";
import { fibonacciSphere } from "@/lib/sphereDistribution";
import { generateAllTextures } from "@/lib/flowerGenerator";
import { mulberry32 } from "@/lib/seededRng";
import GlobeGlow from "./GlobeGlow";

const GLOBE_RADIUS = 2;
const FLOWER_COUNT = 900;
const GRASS_COUNT = 3000;
const BLOOM_SPEED = 0.6;
const PLANE_ASPECT = 1.5;
const FLOWER_SCALE_MULT = 2.8;
const GRASS_VARIANTS = 5;

interface FlowerGlobeProps {
  params: FlowerGenerationParams;
}

function useFlowerTextures(params: FlowerGenerationParams) {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);

  useEffect(() => {
    const canvases = generateAllTextures(params.variations, params.seed);
    const threeTextures = canvases.map((canvas) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    });
    setTextures(threeTextures);

    return () => {
      threeTextures.forEach((t) => t.dispose());
    };
  }, [params.variations, params.seed]);

  return textures;
}

function makeGrassCanvas(hueShift: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 48, 200);

  const rng = mulberry32(seed);

  const baseG = 140 + hueShift * 25;
  const baseR = 60 + Math.floor(rng() * 30);
  const c1 = `rgba(${baseR}, ${Math.min(255, baseG - 20)}, ${30 + Math.floor(rng() * 20)}, 1)`;
  const c2 = `rgba(${baseR + 20}, ${Math.min(255, baseG + 15)}, ${40 + Math.floor(rng() * 15)}, 1)`;
  const c3 = `rgba(${baseR + 30}, ${Math.min(255, baseG + 35)}, ${50 + Math.floor(rng() * 15)}, 1)`;

  const grad = ctx.createLinearGradient(24, 200, 24, 0);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.4, c2);
  grad.addColorStop(1, c3);

  const cx1 = 18 + rng() * 12;
  const cx2 = 20 + rng() * 8;

  ctx.beginPath();
  ctx.moveTo(16, 200);
  ctx.quadraticCurveTo(cx1, 90, cx2 - 6, 0);
  ctx.lineTo(cx2 + 6, 0);
  ctx.quadraticCurveTo(cx1 + 8, 90, 32, 200);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  return canvas;
}

function useGrassTextures() {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);

  useEffect(() => {
    const newTextures: THREE.CanvasTexture[] = [];
    for (let i = 0; i < GRASS_VARIANTS; i++) {
      const canvas = makeGrassCanvas(i, i * 7777 + 31);
      const tex = new THREE.CanvasTexture(canvas);
      tex.premultiplyAlpha = false;
      tex.needsUpdate = true;
      newTextures.push(tex);
    }
    setTextures(newTextures);

    return () => {
      newTextures.forEach((t) => t.dispose());
    };
  }, []);

  return textures;
}

function distributeFlowers(
  params: FlowerGenerationParams,
  count: number
): FlowerInstance[] {
  const rng = mulberry32(params.seed);
  const positions = fibonacciSphere(count, GLOBE_RADIUS);

  const totalFreq = params.variations.reduce((s, v) => s + v.frequency, 0);
  const cumulativeFreq: number[] = [];
  let cumulative = 0;
  for (const v of params.variations) {
    cumulative += v.frequency / totalFreq;
    cumulativeFreq.push(cumulative);
  }

  return positions.map(([x, y, z]) => {
    const roll = rng();
    let variationIndex = 0;
    for (let i = 0; i < cumulativeFreq.length; i++) {
      if (roll <= cumulativeFreq[i]) {
        variationIndex = i;
        break;
      }
    }

    const variation = params.variations[variationIndex];
    const scale =
      (variation.size.min + rng() * (variation.size.max - variation.size.min)) *
      FLOWER_SCALE_MULT;
    const rotationZ = rng() * Math.PI * 2;

    return {
      position: [x, y, z] as [number, number, number],
      scale,
      variationIndex,
      rotationZ,
    };
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
    const scale = 0.2 + rng() * 0.3;
    const rotationZ = rng() * Math.PI * 2;
    const variant = Math.floor(rng() * GRASS_VARIANTS);
    return {
      position: [x, y, z] as [number, number, number],
      scale,
      rotationZ,
      variant,
    };
  });
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface VariationMeshProps {
  flowers: FlowerInstance[];
  texture: THREE.CanvasTexture;
  bloomRef: React.RefObject<number>;
}

function VariationMesh({ flowers, texture, bloomRef }: VariationMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    if (!mesh || flowers.length === 0) return;

    timeRef.current += delta;
    const time = timeRef.current;
    const bp = bloomRef.current ?? 2;

    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];

      const normalizedY = (f.position[1] + GLOBE_RADIUS) / (2 * GLOBE_RADIUS);
      const flowerDelay = (1 - normalizedY) * 0.7 + (i % 7) * 0.015;
      const t = Math.max(0, Math.min(1, (bp - flowerDelay) / 0.4));
      const s = easeOutCubic(t);

      const windPhase = i * 0.37 + f.position[0] * 2.1 + f.position[2] * 1.3;
      const windStrength = 0.06 * s;
      const swayX = Math.sin(time * 1.2 + windPhase) * windStrength;
      const swayZ =
        Math.cos(time * 0.9 + windPhase * 0.7) * windStrength * 0.6;

      dummy.position.set(
        f.position[0] + swayX,
        f.position[1],
        f.position[2] + swayZ
      );
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(f.rotationZ);
      dummy.scale.set(f.scale * s, f.scale * s * PLANE_ASPECT, f.scale * s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, flowers.length]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
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

      const normalizedY =
        (g.position[1] + GLOBE_RADIUS) / (2 * GLOBE_RADIUS);
      const grassDelay = (1 - normalizedY) * 0.7 + (i % 11) * 0.01;
      const t = Math.max(0, Math.min(1, (bp - grassDelay) / 0.3));
      const s = easeOutCubic(t);

      const windPhase = i * 0.53 + g.position[0] * 3.1 + g.position[2] * 1.7;
      const windStrength = 0.04 * s;
      const swayX = Math.sin(time * 1.6 + windPhase) * windStrength;
      const swayZ =
        Math.cos(time * 1.1 + windPhase * 0.8) * windStrength * 0.5;

      dummy.position.set(
        g.position[0] + swayX,
        g.position[1],
        g.position[2] + swayZ
      );
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(g.rotationZ);
      const sc = g.scale * s;
      dummy.scale.set(sc * 0.18, sc * 1.1, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, grasses.length]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function FlowerGlobe({ params }: FlowerGlobeProps) {
  const textures = useFlowerTextures(params);
  const grassTextures = useGrassTextures();

  const flowers = useMemo(
    () => distributeFlowers(params, FLOWER_COUNT),
    [params]
  );

  const grasses = useMemo(
    () => distributeGrass(params.seed, GRASS_COUNT),
    [params.seed]
  );

  const bloomRef = useRef(0);
  const seedRef = useRef(params.seed);

  useEffect(() => {
    if (seedRef.current !== params.seed) {
      seedRef.current = params.seed;
      bloomRef.current = 0;
    }
  }, [params.seed]);

  useFrame((_, delta) => {
    if (bloomRef.current < 2) {
      bloomRef.current += delta * BLOOM_SPEED;
    }
  });

  const flowersByVariation = useMemo(() => {
    const groups: FlowerInstance[][] = params.variations.map(() => []);
    for (const f of flowers) {
      groups[f.variationIndex].push(f);
    }
    return groups;
  }, [flowers, params.variations]);

  const grassesByVariant = useMemo(() => {
    const groups: GrassInstance[][] = Array.from(
      { length: GRASS_VARIANTS },
      () => []
    );
    for (const g of grasses) {
      groups[g.variant].push(g);
    }
    return groups;
  }, [grasses]);

  if (textures.length === 0) return null;

  return (
    <group>
      <GlobeGlow radius={GLOBE_RADIUS + 0.15} />

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS - 0.02, 64, 64]} />
        <meshStandardMaterial
          color="#5a9040"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {grassTextures.length > 0 &&
        grassesByVariant.map(
          (group, i) =>
            group.length > 0 &&
            grassTextures[i] && (
              <GrassGroup
                key={`grass-${i}`}
                grasses={group}
                texture={grassTextures[i]}
                bloomRef={bloomRef}
              />
            )
        )}

      {flowersByVariation.map(
        (group, i) =>
          group.length > 0 &&
          textures[i] && (
            <VariationMesh
              key={`flower-${i}`}
              flowers={group}
              texture={textures[i]}
              bloomRef={bloomRef}
            />
          )
      )}
    </group>
  );
}
