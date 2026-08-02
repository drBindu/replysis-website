"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type AiRobot3DProps = {
  isSpeaking: boolean;
};

function Robot({ isSpeaking }: { isSpeaking: boolean }) {
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  const mats = useMemo(() => {
    return {
      head: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0b1220"),
        metalness: 0.7,
        roughness: 0.25,
      }),
      plate: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#111827"),
        metalness: 0.35,
        roughness: 0.55,
      }),
      eye: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#60a5fa"),
        emissive: new THREE.Color("#60a5fa"),
        emissiveIntensity: 1.1,
        metalness: 0.2,
        roughness: 0.2,
      }),
      mouth: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#a78bfa"),
        emissive: new THREE.Color("#a78bfa"),
        emissiveIntensity: 0.9,
        metalness: 0.2,
        roughness: 0.25,
      }),
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (headRef.current) {
      headRef.current.position.y = Math.sin(t * 1.2) * 0.05;
      headRef.current.rotation.y = Math.sin(t * 0.6) * 0.18;
      headRef.current.rotation.x = Math.sin(t * 0.45) * 0.08;
    }

    if (mouthRef.current) {
      if (isSpeaking) {
        mouthRef.current.scale.x = 0.8 + Math.abs(Math.sin(t * 10)) * 0.8;
        mouthRef.current.scale.y = 0.6 + Math.abs(Math.sin(t * 12)) * 0.5;
      } else {
        mouthRef.current.scale.x = 0.9;
        mouthRef.current.scale.y = 0.55;
      }
    }

    const blink = Math.sin(t * 2.2) > 0.985 ? 0.15 : 1;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = blink;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = blink;

    mats.eye.emissiveIntensity = isSpeaking ? 1.2 + Math.abs(Math.sin(t * 8)) * 0.9 : 1.1;
  });

  return (
    <group position={[0, -0.35, 0]}>
      <group ref={headRef}>
        <RoundedBox args={[1.7, 1.4, 1.4]} radius={0.22} smoothness={6} material={mats.head} />

        <RoundedBox
          args={[1.28, 0.88, 0.09]}
          radius={0.18}
          smoothness={6}
          material={mats.plate}
          position={[0, 0.05, 0.74]}
        />

        <mesh ref={leftEyeRef} material={mats.eye} position={[-0.42, 0.2, 0.82]}>
          <sphereGeometry args={[0.085, 24, 24]} />
        </mesh>
        <mesh ref={rightEyeRef} material={mats.eye} position={[0.42, 0.2, 0.82]}>
          <sphereGeometry args={[0.085, 24, 24]} />
        </mesh>

        <mesh ref={mouthRef} material={mats.mouth} position={[0, -0.18, 0.84]}>
          <boxGeometry args={[0.55, 0.12, 0.08]} />
        </mesh>
      </group>

      <mesh material={mats.plate} position={[0, -0.92, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.35, 28]} />
      </mesh>

      <RoundedBox
        args={[1.05, 0.6, 0.95]}
        radius={0.16}
        smoothness={6}
        material={mats.head}
        position={[0, -1.3, 0]}
      />
    </group>
  );
}

export default function AiRobot3D({ isSpeaking }: AiRobot3DProps) {
  return (
    <div className="w-full h-[360px] rounded-2xl border border-slate-700/50 bg-slate-950/40 overflow-hidden shadow-[0_0_45px_rgba(99,102,241,0.18)]">
      <Canvas camera={{ position: [0, 0.15, 4.4], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 4, 4]} intensity={1.25} />
        <pointLight position={[-4, 2, 3]} intensity={0.85} />
        <Environment preset="city" />
        <Robot isSpeaking={isSpeaking} />
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  );
}
