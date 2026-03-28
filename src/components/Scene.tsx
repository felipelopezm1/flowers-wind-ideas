"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import FlowerGlobe from "./FlowerGlobe";
import { FlowerGenerationParams } from "@/types/flowers";

interface SceneProps {
  params: FlowerGenerationParams;
}

export default function Scene({ params }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 7], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#FAFAF8"]} />

      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} />
      <directionalLight
        position={[-3, 4, -2]}
        intensity={0.25}
        color="#E8D5B7"
      />

      <Suspense fallback={null}>
        <FlowerGlobe params={params} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={1.8}
        maxDistance={12}
        dampingFactor={0.04}
        enableDamping
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI - 0.3}
      />
    </Canvas>
  );
}
