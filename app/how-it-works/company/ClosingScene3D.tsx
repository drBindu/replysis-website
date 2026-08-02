"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "./scrollState";

const PARTICLE_COUNT = 220;

/** Plain Three.js, see Scene3D.tsx for why react-three-fiber isn't used here. */
export default function ClosingScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const scattered = new Float32Array(PARTICLE_COUNT * 3);
    const resolved = new Float32Array(PARTICLE_COUNT * 3);
    const current = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 3.4 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      scattered[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      scattered[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      scattered[i * 3 + 2] = radius * Math.cos(phi) * 0.6;

      const coreRadius = 1.15 + Math.random() * 0.12;
      const rTheta = Math.random() * Math.PI * 2;
      const rPhi = Math.acos(2 * Math.random() - 1);
      resolved[i * 3] = coreRadius * Math.sin(rPhi) * Math.cos(rTheta);
      resolved[i * 3 + 1] = coreRadius * Math.sin(rPhi) * Math.sin(rTheta);
      resolved[i * 3 + 2] = coreRadius * Math.cos(rPhi);

      current[i * 3] = scattered[i * 3];
      current[i * 3 + 1] = scattered[i * 3 + 1];
      current[i * 3 + 2] = scattered[i * 3 + 2];
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(current, 3);
    geometry.setAttribute("position", positionAttribute);

    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x1f883d,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x2da44e,
      emissive: new THREE.Color(0x1f883d),
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.45,
      transparent: true,
      opacity: 0,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), coreMaterial);
    scene.add(core);

    const clock = new THREE.Clock();
    let frameId: number;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const c = scrollState.closing;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        const targetX = THREE.MathUtils.lerp(scattered[ix], resolved[ix], c);
        const targetY = THREE.MathUtils.lerp(scattered[iy], resolved[iy], c);
        const targetZ = THREE.MathUtils.lerp(scattered[iz], resolved[iz], c);
        current[ix] += (targetX - current[ix]) * 0.06;
        current[iy] += (targetY - current[iy]) * 0.06;
        current[iz] += (targetZ - current[iz]) * 0.06;
      }
      positionAttribute.needsUpdate = true;

      points.rotation.y = elapsed * 0.06;
      material.opacity = 0.75 - c * 0.35;

      coreMaterial.opacity = Math.max(0, c - 0.35) * 1.5;
      core.scale.setScalar(0.4 + c * 0.6);
      core.rotation.y -= elapsed * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      core.geometry.dispose();
      coreMaterial.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />;
}
