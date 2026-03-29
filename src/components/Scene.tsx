"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense } from "react";
import * as THREE from "three";
import gsap from "gsap";
import FlowerGlobe from "./FlowerGlobe";
import GlobeGlow from "./GlobeGlow";
import { FlowerGenerationParams } from "@/types/flowers";
import { FlowerIdea } from "@/types/ideas";
import { getStyle } from "@/lib/styles";

const GLOBE_RADIUS = 2;
const LANDSCAPE_DIST = 4.0;
const LANDSCAPE_CLOSE = 2.4;

export interface TravelRequest {
  id: number;
  type: "in" | "out" | "side";
}

interface DynamicLightsProps {
  ambientIntensity: number;
  keyIntensity: number;
  keyColor: string;
}

function DynamicLights({ ambientIntensity, keyIntensity, keyColor }: DynamicLightsProps) {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ camera }) => {
    const angle = Math.atan2(camera.position.x, camera.position.z);
    if (keyRef.current) keyRef.current.position.set(Math.sin(angle + 0.8) * 6, 7, Math.cos(angle + 0.8) * 6);
    if (fillRef.current) fillRef.current.position.set(Math.sin(angle - 1.5) * 4, 3, Math.cos(angle - 1.5) * 4);
  });

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight ref={keyRef} position={[5, 7, 5]} intensity={keyIntensity} color={keyColor} />
      <directionalLight ref={fillRef} position={[-3, 3, -2]} intensity={0.25} color="#E8EDD5" />
      <directionalLight position={[0, -3, 4]} intensity={0.15} color="#D4E8C0" />
    </>
  );
}

interface CameraControllerProps {
  focusBias: number;
}

function CameraController({ focusBias }: CameraControllerProps) {
  const targetRef = useRef(new THREE.Vector3());
  const originVec = useMemo(() => new THREE.Vector3(), []);
  const biasRef = useRef(0);

  useEffect(() => {
    const tweenTarget = { value: biasRef.current };
    const tween = gsap.to(tweenTarget, {
      value: focusBias,
      duration: 0.55,
      ease: "power3.out",
      onUpdate: () => {
        biasRef.current = tweenTarget.value;
      },
    });

    return () => {
      tween.kill();
    };
  }, [focusBias]);

  useFrame(({ camera, controls }) => {
    const ctrl = controls as any;
    if (!ctrl || typeof ctrl.target === "undefined") return;
    const camDist = camera.position.length();
    const landscapeT = Math.max(0, Math.min(1, (LANDSCAPE_DIST - camDist) / (LANDSCAPE_DIST - LANDSCAPE_CLOSE)));
    if (landscapeT > 0.01) {
      const camDir = camera.position.clone().normalize();
      const surfacePoint = camDir.multiplyScalar(GLOBE_RADIUS * landscapeT);
      targetRef.current.lerp(surfacePoint, 0.06);
      const basePolar = 0.3;
      const landscapePolar = 1.1;
      ctrl.minPolarAngle = basePolar + (landscapePolar - basePolar) * landscapeT * 0.5;
    } else {
      targetRef.current.lerp(originVec, 0.08);
      ctrl.minPolarAngle = 0.3;
    }

    ctrl.target.set(
      targetRef.current.x + biasRef.current,
      targetRef.current.y,
      targetRef.current.z
    );
  });

  return null;
}

interface TravelControllerProps {
  request: TravelRequest | null;
  focusBias: number;
  onHalfway?: () => void;
  onComplete?: () => void;
}

function quadraticPoint(
  start: THREE.Vector3,
  mid: THREE.Vector3,
  end: THREE.Vector3,
  t: number
) {
  const a = start.clone().lerp(mid, t);
  const b = mid.clone().lerp(end, t);
  return a.lerp(b, t);
}

function TravelController({
  request,
  focusBias,
  onHalfway,
  onComplete,
}: TravelControllerProps) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const ctrl = controls as any;
    if (!request || !ctrl) return;

    const startPos = camera.position.clone();
    const startTarget = ctrl.target.clone();
    const yAxis = new THREE.Vector3(0, 1, 0);

    const rotation =
      request.type === "side" ? 0.95 : request.type === "in" ? 0.45 : -0.4;
    const distanceScale =
      request.type === "in" ? 0.84 : request.type === "out" ? 1.16 : 1;

    const endPos = startPos.clone().applyAxisAngle(yAxis, rotation);
    endPos.multiplyScalar(distanceScale);
    endPos.y += request.type === "in" ? 0.4 : request.type === "side" ? 0.2 : 0.3;

    const endTarget = new THREE.Vector3(focusBias, 0, 0);
    const midPos = startPos
      .clone()
      .lerp(endPos, 0.5)
      .applyAxisAngle(yAxis, request.type === "side" ? 0.3 : 0.18);
    midPos.y += request.type === "in" ? 1.2 : 0.85;

    const midTarget = startTarget.clone().lerp(endTarget, 0.5);
    midTarget.y += 0.15;

    const proxy = { t: 0 };
    let didHalfway = false;

    const timeline = gsap.to(proxy, {
      t: 1,
      duration: 1.2,
      ease: "power2.inOut",
      onUpdate: () => {
        if (!didHalfway && proxy.t >= 0.5) {
          didHalfway = true;
          onHalfway?.();
        }

        const nextPos = quadraticPoint(startPos, midPos, endPos, proxy.t);
        const nextTarget = quadraticPoint(startTarget, midTarget, endTarget, proxy.t);

        camera.position.copy(nextPos);
        ctrl.target.copy(nextTarget);
        ctrl.update();
      },
      onComplete: () => {
        onComplete?.();
      },
    });

    return () => {
      timeline.kill();
    };
  }, [camera, controls, request, focusBias, onHalfway, onComplete]);

  return null;
}

interface SceneProps {
  params: FlowerGenerationParams | null;
  locked: boolean;
  styleId: string;
  ideas: Record<number, FlowerIdea>;
  focusBias: number;
  travelRequest: TravelRequest | null;
  onFlowerClick?: (
    globalIndex: number,
    position: THREE.Vector3,
    screenX: number,
    screenY: number
  ) => void;
  onTravelHalfway?: () => void;
  onTravelComplete?: () => void;
}

export default function Scene({
  params,
  locked,
  styleId,
  ideas,
  focusBias,
  travelRequest,
  onFlowerClick,
  onTravelHalfway,
  onTravelComplete,
}: SceneProps) {
  const style = getStyle(styleId);
  const sc = params?.sceneColors;
  const bgColor = sc?.bgColor || style.bgColor;
  const lightColor = sc?.lightColor || style.keyLightColor;
  const lightIntensity = sc?.lightIntensity ?? style.keyLightIntensity;

  return (
    <Canvas
      camera={{ position: [0, 2, 7], fov: 50 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[bgColor]} />
      <DynamicLights ambientIntensity={style.ambientIntensity} keyIntensity={lightIntensity} keyColor={lightColor} />

      <Suspense fallback={null}>
        {params ? (
          <FlowerGlobe params={params} styleId={styleId} ideas={ideas} onFlowerClick={onFlowerClick} />
        ) : (
          <GlobeGlow radius={2.15} intensity={0.6} color={style.glowColor} accentColor={style.glowAccent} />
        )}
      </Suspense>

      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={0.8} mipmapBlur />
      </EffectComposer>

      <CameraController focusBias={focusBias} />
      <TravelController
        request={travelRequest}
        focusBias={focusBias}
        onHalfway={onTravelHalfway}
        onComplete={onTravelComplete}
      />

      <OrbitControls
        enablePan={false} enableRotate={!locked} enableZoom={!locked}
        minDistance={1.2} maxDistance={12} dampingFactor={0.04} enableDamping
        rotateSpeed={0.6} zoomSpeed={0.8} minPolarAngle={0.3} maxPolarAngle={Math.PI - 0.3} makeDefault
      />

      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport axisColors={["#e74c3c", "#2ecc71", "#3498db"]} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}
