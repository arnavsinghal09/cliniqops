"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Constellation() {
  const group = useRef<THREE.Group>(null);
  // viewport gives the world-space width/height at z=0, so the invisible
  // catcher plane can be sized to always fill the canvas.
  const { viewport } = useThree();

  const { positions, linePositions } = useMemo(() => {
    const COUNT = 80;
    const RADIUS = 2.1;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = i * 2.399963; // golden angle
      pts.push(
        new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r)
          .multiplyScalar(RADIUS)
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.4,
              (Math.random() - 0.5) * 0.4,
              (Math.random() - 0.5) * 0.4,
            ),
          ),
      );
    }
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => p.toArray(positions, i * 3));

    const segs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].distanceTo(pts[j]) < 1.15) {
          segs.push(...pts[i].toArray(), ...pts[j].toArray());
        }
      }
    }
    return { positions, linePositions: new Float32Array(segs) };
  }, []);

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: any) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    velocity.current = { x: 0, y: 0 };
    e.target.setPointerCapture?.(e.pointerId);
  };

  const onPointerUp = (e: any) => {
    dragging.current = false;
    e.target.releasePointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: any) => {
    if (!dragging.current || !group.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    group.current.rotation.y += dx * 0.005;
    group.current.rotation.x += dy * 0.005;
    velocity.current = { x: dy * 0.005, y: dx * 0.005 };
  };

  useFrame((_, delta) => {
    if (!group.current) return;
    if (dragging.current) return;
    group.current.rotation.y += velocity.current.y;
    group.current.rotation.x += velocity.current.x;
    velocity.current.y *= 0.94;
    velocity.current.x *= 0.94;
    if (
      Math.abs(velocity.current.y) < 0.0002 &&
      Math.abs(velocity.current.x) < 0.0002
    ) {
      group.current.rotation.y += delta * 0.12;
    }
    group.current.rotation.x = Math.max(
      -0.8,
      Math.min(0.8, group.current.rotation.x),
    );
  });

  return (
    <>
      {/* Invisible full-frame catcher: fills the canvas at z=0 so a pointer
          press ANYWHERE registers, not just when you land on a node. It's the
          drag surface; the visible constellation just rides the group's
          rotation. visible={false} keeps it from rendering but it still
          receives raycasted pointer events. Scaled 1.5x for safety margin. */}
      <mesh
        position={[0, 0, 0]}
        scale={[viewport.width * 1.5, viewport.height * 1.5, 1]}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerUp}
      >
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={group}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[linePositions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4CAF7D" transparent opacity={0.25} />
        </lineSegments>

        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial color="#1D4D35" size={0.09} sizeAttenuation />
        </points>
      </group>
    </>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ cursor: "grab" }}
      onPointerDown={(e) => (e.currentTarget.style.cursor = "grabbing")}
      onPointerUp={(e) => (e.currentTarget.style.cursor = "grab")}
    >
      <Constellation />
    </Canvas>
  );
}
