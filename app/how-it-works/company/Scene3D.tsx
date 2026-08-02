"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "./scrollState";

const BAR_HEIGHTS = [1.0, 1.55, 2.1, 2.7, 3.35];
const PARTICLE_COUNT = 46;

/** Plain Three.js, see the comment near the bottom of this file for why react-three-fiber isn't used here. */
export default function Scene3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.PointLight(0x3fb950, 42);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0x1f883d, 22);
    rim.position.set(-5, -2, 3);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    // The hero object is built from the brand mark: a small cluster of
    // ascending bars, echoing the logo in the nav rather than an abstract shape.
    const barWidth = 0.62;
    const bars: THREE.Mesh[] = [];
    const barBasePositions: THREE.Vector3[] = [];
    // On desktop the copy sits in a fixed left column, so the cluster shifts
    // right to clear it. On mobile the copy stacks above full-width instead,
    // so the cluster stays centered.
    const xOffset = window.matchMedia("(min-width: 901px)").matches ? 3.3 : 0;

    BAR_HEIGHTS.forEach((height, i) => {
      const geometry = new THREE.BoxGeometry(barWidth, height, barWidth);
      const material = new THREE.MeshStandardMaterial({
        color: 0x2da44e,
        transparent: true,
        opacity: 0.55,
        roughness: 0.25,
        metalness: 0.2,
        emissive: new THREE.Color(0x1f883d),
        emissiveIntensity: 0.18,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const x = (i - (BAR_HEIGHTS.length - 1) / 2) * 0.92 + xOffset;
      const y = height / 2 - 1.6;
      mesh.position.set(x, y, 0);
      group.add(mesh);
      bars.push(mesh);
      barBasePositions.push(new THREE.Vector3(x, y, 0));

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x1f883d, transparent: true, opacity: 0.55 })
      );
      mesh.add(edges);
    });

    // A sparse field of ambient dust for depth, kept deliberately thin rather
    // than a dense scattered cloud.
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 3.4 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      particlePositions[i * 3] = Math.cos(theta) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      particlePositions[i * 3 + 2] = Math.sin(theta) * radius - 2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      color: 0x57606a,
      transparent: true,
      opacity: 0.32,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

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
      const p = scrollState.hero;

      bars.forEach((mesh, i) => {
        const base = barBasePositions[i];
        const spread = 1 + p * 0.45;
        const bob = Math.sin(elapsed * 0.6 + i * 0.8) * 0.05;
        mesh.position.x = base.x * spread;
        mesh.position.y = base.y + bob - p * 0.3;
        mesh.rotation.y = Math.sin(elapsed * 0.25 + i) * 0.08 + p * 0.15;
      });

      particles.rotation.y = elapsed * 0.015;

      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, scrollState.mouseX * 0.18, 0.05);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -scrollState.mouseY * 0.1, 0.05);

      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 9 - p * 2.6, 0.05);
      camera.lookAt(0, -0.3, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      bars.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.children.forEach((child) => {
          if (child instanceof THREE.LineSegments) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      });
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />;
}

// Plain Three.js (no react-three-fiber): this app's App Router runs against
// a React canary bundle internally, which react-three-fiber v8's reconciler
// crashes against, and fiber v9 requires React 19, a project-wide upgrade
// out of scope here. Raw Three.js has no dependency on React's reconciler,
// so it sidesteps the incompatibility entirely.
