"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const GLOW_VERTEX = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const GLOW_FRAGMENT = `
uniform vec3 glowColor;
uniform float intensity;
uniform vec3 cameraPos;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPos - vWorldPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  float glow = pow(fresnel, 3.0) * intensity;
  gl_FragColor = vec4(glowColor, glow * 0.65);
}
`;

interface GlobeGlowProps {
  radius?: number;
  color?: string;
  intensity?: number;
}

export default function GlobeGlow({
  radius = 2.12,
  color = "#E8A040",
  intensity = 1.4,
}: GlobeGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      cameraPos: { value: new THREE.Vector3() },
    }),
    [color, intensity]
  );

  useFrame(({ camera }) => {
    uniforms.cameraPos.value.copy(camera.position);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={GLOW_VERTEX}
        fragmentShader={GLOW_FRAGMENT}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
