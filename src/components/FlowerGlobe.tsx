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
const FLOWER_COUNT = 2200;
const BLOOM_SPEED = 0.6;

interface FlowerGlobeProps {
  params: FlowerGenerationParams;
}

function useFlowerTextures(params: FlowerGenerationParams) {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([]);

  useEffect(() => {
    const canvases = generateAllTextures(params.variations);
    const threeTextures = canvases.map((canvas) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    });
    setTextures(threeTextures);

    return () => {
      threeTextures.forEach((t) => t.dispose());
    };
  }, [params.variations]);

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
      variation.size.min + rng() * (variation.size.max - variation.size.min);
    const rotationZ = rng() * Math.PI * 2;

    return {
      position: [x, y, z] as [number, number, number],
      scale,
      variationIndex,
      rotationZ,
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

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || flowers.length === 0) return;

    const bp = bloomRef.current ?? 2;

    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];

      const normalizedY = (f.position[1] + GLOBE_RADIUS) / (2 * GLOBE_RADIUS);
      const flowerDelay = (1 - normalizedY) * 0.7 + (i % 7) * 0.015;
      const t = Math.max(0, Math.min(1, (bp - flowerDelay) / 0.4));
      const s = easeOutCubic(t);

      dummy.position.set(...f.position);
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(f.rotationZ);
      dummy.scale.setScalar(f.scale * s);
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

export default function FlowerGlobe({ params }: FlowerGlobeProps) {
  const textures = useFlowerTextures(params);
  const flowers = useMemo(
    () => distributeFlowers(params, FLOWER_COUNT),
    [params]
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

  if (textures.length === 0) return null;

  return (
    <group>
      <GlobeGlow radius={GLOBE_RADIUS + 0.15} />

      {flowersByVariation.map(
        (group, i) =>
          group.length > 0 &&
          textures[i] && (
            <VariationMesh
              key={i}
              flowers={group}
              texture={textures[i]}
              bloomRef={bloomRef}
            />
          )
      )}
    </group>
  );
}
