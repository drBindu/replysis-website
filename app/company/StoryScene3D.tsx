"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { scrollState } from "./scrollState";

const FRAGMENT_COUNT = 12;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Plain Three.js, see Scene3D.tsx for why react-three-fiber isn't used here. */
export default function StoryScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light1 = new THREE.PointLight(0x3fb950, 35);
    light1.position.set(5, 5, 5);
    const light2 = new THREE.PointLight(0x1f883d, 25);
    light2.position.set(-5, -3, 4);
    scene.add(light1, light2);

    const group = new THREE.Group();
    scene.add(group);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x3fb950, transparent: true, opacity: 0.1, depthWrite: false })
    );
    group.add(halo);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.01, 12, 100),
      new THREE.MeshBasicMaterial({ color: 0x1f883d, transparent: true, opacity: 0.4 })
    );
    ring1.rotation.x = Math.PI / 2;
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.008, 12, 100),
      new THREE.MeshBasicMaterial({ color: 0x3fb950, transparent: true, opacity: 0.3 })
    );
    ring2.rotation.y = Math.PI / 3;
    group.add(ring1, ring2);

    // The gem is earned, not given: it starts invisible and only resolves
    // once the fragments below have converged, tracking the three-part story.
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x2da44e,
      emissive: new THREE.Color(0x1f883d),
      emissiveIntensity: 1.05,
      roughness: 0.35,
      metalness: 0.4,
      transparent: true,
      opacity: 0,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), coreMaterial);
    core.scale.setScalar(0.001);
    group.add(core);

    // Fragments: scattered at "start with the real work", ring up at "give
    // people clear control", collapse into the core at "earn confidence".
    const fragmentGeometry = new THREE.TetrahedronGeometry(1, 0);
    const fragments: THREE.Mesh[] = [];
    const scatteredPositions: THREE.Vector3[] = [];
    const ringPositions: THREE.Vector3[] = [];
    const rotationSpeeds: THREE.Vector3[] = [];
    const fragmentScales: number[] = [];

    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const scatterRadius = 2.6 + Math.random() * 1.6;
      const scatterTheta = Math.random() * Math.PI * 2;
      const scatterPhi = Math.acos(2 * Math.random() - 1);
      scatteredPositions.push(
        new THREE.Vector3(
          scatterRadius * Math.sin(scatterPhi) * Math.cos(scatterTheta),
          scatterRadius * Math.sin(scatterPhi) * Math.sin(scatterTheta),
          scatterRadius * Math.cos(scatterPhi) * 0.6
        )
      );

      const ringAngle = (i / FRAGMENT_COUNT) * Math.PI * 2;
      const ringRadius = 2.1 + (i % 3) * 0.18;
      ringPositions.push(
        new THREE.Vector3(
          Math.cos(ringAngle) * ringRadius,
          Math.sin(ringAngle * 1.4) * 0.4,
          Math.sin(ringAngle) * ringRadius
        )
      );

      rotationSpeeds.push(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
      fragmentScales.push(0.24 + Math.random() * 0.16);

      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x1f883d : 0x2da44e,
        roughness: 0.4,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(fragmentGeometry, material);
      mesh.scale.setScalar(fragmentScales[i]);
      mesh.position.copy(scatteredPositions[i]);
      group.add(mesh);
      fragments.push(mesh);
    }

    const clock = new THREE.Clock();
    const lerpTarget = new THREE.Vector3();
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
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const s = scrollState.story;

      const toRing = smoothstep(0, 0.5, s);
      const toCore = smoothstep(0.5, 1, s);

      fragments.forEach((mesh, i) => {
        lerpTarget.lerpVectors(scatteredPositions[i], ringPositions[i], toRing);
        lerpTarget.multiplyScalar(1 - toCore);
        mesh.position.lerp(lerpTarget, 0.08);

        const spin = rotationSpeeds[i];
        const spinSlow = 1 - toRing * 0.6;
        mesh.rotation.x += delta * spin.x * spinSlow;
        mesh.rotation.y += delta * spin.y * spinSlow;
        mesh.rotation.z += delta * spin.z * spinSlow;

        mesh.scale.setScalar(fragmentScales[i] * (1 - toCore));
      });

      core.scale.setScalar(THREE.MathUtils.lerp(core.scale.x, 0.001 + toCore * 0.999, 0.08));
      coreMaterial.opacity = toCore;
      core.rotation.y = s * Math.PI * 1.4;
      core.rotation.x = 0.3 + Math.sin(elapsed * 0.2) * 0.1;

      halo.scale.setScalar((1 + Math.sin(elapsed * 0.6) * 0.04) * (0.7 + toCore * 0.3));
      ring1.rotation.z += delta * 0.5;
      ring2.rotation.x += delta * 0.3;

      group.rotation.y = 0.15 * Math.sin(elapsed * 0.1) + scrollState.mouseX * 0.08;
      group.position.x = scrollState.mouseX * 0.3;
      group.position.y = -scrollState.mouseY * 0.2;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      fragmentGeometry.dispose();
      fragments.forEach((mesh) => (mesh.material as THREE.Material).dispose());
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      ring1.geometry.dispose();
      (ring1.material as THREE.Material).dispose();
      ring2.geometry.dispose();
      (ring2.material as THREE.Material).dispose();
      core.geometry.dispose();
      coreMaterial.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />;
}
