"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "./scrollState";

const MODULE_COUNT = 9;

/** Plain Three.js, see Scene3D.tsx for why react-three-fiber isn't used here. */
export default function ProductScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.6, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const key = new THREE.PointLight(0x3fb950, 30);
    key.position.set(4, 5, 5);
    scene.add(key);

    const group = new THREE.Group();
    scene.add(group);

    const moduleGeometry = new THREE.IcosahedronGeometry(0.26, 0);
    const modules: THREE.Mesh[] = [];
    const orbitRadii: number[] = [];
    const orbitSpeeds: number[] = [];
    const orbitOffsets: number[] = [];

    for (let i = 0; i < MODULE_COUNT; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? 0x1f883d : 0x2da44e,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(moduleGeometry, material);
      group.add(mesh);
      modules.push(mesh);
      orbitRadii.push(1.6 + (i % 3) * 0.85);
      orbitSpeeds.push(0.12 + (i % 4) * 0.05);
      orbitOffsets.push((i / MODULE_COUNT) * Math.PI * 2);
    }

    const ringGeometry = new THREE.TorusGeometry(1, 0.006, 8, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x1f883d, transparent: true, opacity: 0.16 });
    const orbitRings = [1.6, 2.45, 3.3].map((radius) => {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.scale.setScalar(radius);
      ring.rotation.x = Math.PI / 2.3;
      group.add(ring);
      return ring;
    });

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
      const p = scrollState.product;

      modules.forEach((mesh, i) => {
        const angle = orbitOffsets[i] + elapsed * orbitSpeeds[i];
        const radius = orbitRadii[i] * (0.55 + p * 0.45);
        mesh.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 0.7) * 0.7,
          Math.sin(angle) * radius * 0.6
        );
        mesh.rotation.x += 0.006;
        mesh.rotation.y += 0.008;
      });

      orbitRings.forEach((ring, i) => {
        ring.rotation.z = elapsed * (0.05 + i * 0.02);
      });

      group.rotation.y = p * 0.9 + elapsed * 0.02;
      group.rotation.x = -0.1 + scrollState.mouseY * 0.12;
      group.position.x = scrollState.mouseX * 0.3;

      const targetScale = 0.7 + p * 0.4;
      group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, targetScale, 0.06));

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      moduleGeometry.dispose();
      modules.forEach((mesh) => (mesh.material as THREE.Material).dispose());
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />;
}
