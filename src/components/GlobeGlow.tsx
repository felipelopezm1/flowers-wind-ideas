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
uniform vec3 accentColor;
uniform float intensity;
uniform vec3 cameraPos;
uniform float time;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPos - vWorldPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));

  vec3 lightDir = normalize(cameraPos + vec3(0.0, 1.0, 0.0));
  float directional = max(0.0, dot(vNormal, lightDir));
  float wrap = directional * 0.6 + 0.4;

  float colorMix = 0.5 + 0.5 * sin(atan(cameraPos.x, cameraPos.z) + time * 0.15);
  vec3 dynamicColor = mix(glowColor, accentColor, colorMix * 0.4);

  float shimmer = 1.0 + 0.08 * sin(time * 0.8 + fresnel * 6.0);
  float glow = pow(fresnel, 2.8) * intensity * wrap * shimmer;

  gl_FragColor = vec4(dynamicColor, glow * 0.6);
}
`;

interface GlobeGlowProps {
  radius?: number;
  color?: string;
  accentColor?: string;
  intensity?: number;
}

export default function GlobeGlow({
  radius = 2.12,
  color = "#8BC34A",
  accentColor = "#C6FF00",
  intensity = 1.2,
}: GlobeGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      accentColor: { value: new THREE.Color(accentColor) },
      intensity: { value: intensity },
      cameraPos: { value: new THREE.Vector3() },
      time: { value: 0 },
    }),
    [color, accentColor, intensity]
  );

  useFrame(({ camera, clock }) => {
    uniforms.cameraPos.value.copy(camera.position);
    uniforms.time.value = clock.getElapsedTime();
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
