"use client";

import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import * as THREE from "three";
import { DOORS, HOUSE, ROOMS, type Room } from "@/lib/house/house";
import { DadAvatar, type AvatarGoal } from "./DadAvatar";

// Dollhouse view of Dad's house: walls cut to waist height so every room is visible from above.

type Props = {
  mode: "3d" | "plan";
  route: [number, number][];
  goal: AvatarGoal;
  ringColor: string;
  label: string;
  faded: boolean;
  urgent: boolean;
  activeRoom: string | null;
  bathroomBadge: string | null;
};

const T = 0.1; // wall thickness
const H = HOUSE.wallHeight;
const WALL = "#f3ede3";
const WALL_TOP = "#d6cab8";

type V3 = [number, number, number];

function Block({ p, s, c, r = 0.03, rough = 0.8 }: { p: V3; s: V3; c: string; r?: number; rough?: number }) {
  const radius = Math.min(r, Math.min(...s) / 2 - 0.002);
  return (
    <RoundedBox args={s} radius={Math.max(radius, 0.001)} smoothness={3} position={p} castShadow receiveShadow>
      <meshStandardMaterial color={c} roughness={rough} />
    </RoundedBox>
  );
}

function Cyl({ p, a, c, rough = 0.8 }: { p: V3; a: [number, number, number, number?]; c: string; rough?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[a[0], a[1], a[2], a[3] ?? 32]} />
      <meshStandardMaterial color={c} roughness={rough} />
    </mesh>
  );
}

/** Wall pieces for one room, inset half a wall so neighbours sit back to back, with gaps for its doors. */
function roomWalls(r: Room) {
  const edges = [
    { axis: "x" as const, line: r.z, at: r.z + T / 2, from: r.x, to: r.x + r.w },
    { axis: "x" as const, line: r.z + r.d, at: r.z + r.d - T / 2, from: r.x, to: r.x + r.w },
    { axis: "z" as const, line: r.x, at: r.x + T / 2, from: r.z, to: r.z + r.d },
    { axis: "z" as const, line: r.x + r.w, at: r.x + r.w - T / 2, from: r.z, to: r.z + r.d },
  ];
  const pieces: { cx: number; cz: number; len: number; axis: "x" | "z" }[] = [];
  for (const e of edges) {
    const gaps = DOORS.filter((d) => (d.a === r.id || d.b === r.id) && d.axis === e.axis && Math.abs((e.axis === "x" ? d.z : d.x) - e.line) < 0.01)
      .map((d) => {
        const c = e.axis === "x" ? d.x : d.z;
        return [c - d.width / 2, c + d.width / 2] as const;
      })
      .sort((a, b) => a[0] - b[0]);
    let start = e.from;
    for (const [g0, g1] of [...gaps, [e.to, e.to] as const]) {
      if (g0 - start > 0.05) {
        const mid = (start + g0) / 2;
        pieces.push({ cx: e.axis === "x" ? mid : e.at, cz: e.axis === "x" ? e.at : mid, len: g0 - start, axis: e.axis });
      }
      start = g1;
    }
  }
  return pieces;
}

function Walls() {
  const pieces = useMemo(() => ROOMS.flatMap(roomWalls), []);
  return (
    <group>
      {pieces.map((w, i) => {
        const size: V3 = w.axis === "x" ? [w.len, H, T] : [T, H, w.len];
        const cap: V3 = w.axis === "x" ? [w.len, 0.025, T + 0.01] : [T + 0.01, 0.025, w.len];
        return (
          <group key={i} position={[w.cx, 0, w.cz]}>
            <mesh position-y={H / 2} castShadow receiveShadow>
              <boxGeometry args={size} />
              <meshStandardMaterial color={WALL} roughness={0.95} />
            </mesh>
            <mesh position-y={H + 0.012}>
              <boxGeometry args={cap} />
              <meshStandardMaterial color={WALL_TOP} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Floors({ activeRoom }: { activeRoom: string | null }) {
  return (
    <group>
      {ROOMS.map((r) => (
        <mesh key={r.id} position={[r.x + r.w / 2, -0.03, r.z + r.d / 2]} receiveShadow>
          <boxGeometry args={[r.w, 0.06, r.d]} />
          <meshStandardMaterial
            color={r.floor}
            roughness={0.9}
            emissive={activeRoom === r.id ? "#ffd9a0" : "#000000"}
            emissiveIntensity={activeRoom === r.id ? 0.18 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function Armchair({ x, z, yaw }: { x: number; z: number; yaw: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <Block p={[0, 0.22, -0.06]} s={[0.82, 0.36, 0.78]} c="#7f5f49" r={0.06} />
      <Block p={[0, 0.44, -0.02]} s={[0.6, 0.1, 0.62]} c="#c8b394" r={0.04} />
      <Block p={[0, 0.62, -0.4]} s={[0.82, 0.78, 0.16]} c="#7f5f49" r={0.06} />
      <Block p={[-0.36, 0.42, -0.06]} s={[0.12, 0.42, 0.78]} c="#7f5f49" r={0.05} />
      <Block p={[0.36, 0.42, -0.06]} s={[0.12, 0.42, 0.78]} c="#7f5f49" r={0.05} />
    </group>
  );
}

function DiningChair({ x, z, yaw }: { x: number; z: number; yaw: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={yaw}>
      <Block p={[0, 0.44, -0.04]} s={[0.44, 0.05, 0.42]} c="#9b744f" r={0.015} />
      <Block p={[0, 0.74, -0.24]} s={[0.44, 0.56, 0.05]} c="#9b744f" r={0.015} />
      {[-0.18, 0.18].flatMap((lx) => [-0.22, 0.14].map((lz) => <Block key={`${lx}${lz}`} p={[lx, 0.21, lz]} s={[0.04, 0.42, 0.04]} c="#7d5c3f" r={0.01} />))}
    </group>
  );
}

function Furniture() {
  return (
    <group>
      {/* sitting room */}
      <Block p={[2.6, 0.005, 2.0]} s={[2.6, 0.01, 1.8]} c="#9d7f63" r={0.004} rough={1} />
      <Armchair x={1.7} z={1.66} yaw={Math.PI} />
      <group position={[0.62, 0, 2.2]} rotation-y={Math.PI / 2}>
        <Block p={[0, 0.22, 0]} s={[2.1, 0.4, 0.86]} c="#93a58e" r={0.07} />
        <Block p={[0, 0.58, -0.34]} s={[2.1, 0.5, 0.2]} c="#93a58e" r={0.07} />
        <Block p={[-0.62, 0.46, 0.04]} s={[0.9, 0.1, 0.64]} c="#b8c5b1" r={0.04} />
        <Block p={[0.4, 0.46, 0.04]} s={[0.9, 0.1, 0.64]} c="#b8c5b1" r={0.04} />
      </group>
      <Block p={[2.8, 0.36, 2.15]} s={[1.0, 0.05, 0.55]} c="#a27b55" r={0.015} />
      {[-0.42, 0.42].flatMap((lx) => [-0.22, 0.22].map((lz) => <Block key={`ct${lx}${lz}`} p={[2.8 + lx, 0.17, 2.15 + lz]} s={[0.04, 0.34, 0.04]} c="#7d5c3f" r={0.01} />))}
      <Block p={[2.8, 0.24, 0.36]} s={[1.7, 0.48, 0.42]} c="#6d5645" r={0.03} />
      <Block p={[2.8, 0.9, 0.3]} s={[1.25, 0.72, 0.06]} c="#1c1e20" r={0.02} rough={0.35} />
      <Cyl p={[5.15, 0.25, 0.45]} a={[0.18, 0.15, 0.5]} c="#b9a58a" />
      <mesh position={[5.15, 0.75, 0.45]} castShadow>
        <sphereGeometry args={[0.32, 20, 16]} />
        <meshStandardMaterial color="#5f8a5a" roughness={0.9} />
      </mesh>

      {/* dining */}
      <Cyl p={[7.1, 0.74, 1.1]} a={[0.56, 0.56, 0.05]} c="#a27b55" />
      <Cyl p={[7.1, 0.37, 1.1]} a={[0.07, 0.12, 0.72]} c="#7d5c3f" />
      <DiningChair x={7.1} z={1.82} yaw={Math.PI} />
      <DiningChair x={6.35} z={1.1} yaw={Math.PI / 2} />
      <DiningChair x={7.85} z={1.1} yaw={-Math.PI / 2} />

      {/* kitchen */}
      <Block p={[9.9, 0.44, 0.38]} s={[2.4, 0.88, 0.6]} c="#e9e5dd" r={0.02} />
      <Block p={[9.9, 0.9, 0.38]} s={[2.44, 0.04, 0.64]} c="#5f5a54" r={0.01} rough={0.5} />
      <Block p={[9.5, 0.93, 0.38]} s={[0.55, 0.02, 0.45]} c="#2a2a2a" r={0.005} rough={0.4} />
      <Block p={[10.85, 0.9, 1.85]} s={[0.62, 1.8, 0.62]} c="#f4f4f2" r={0.04} rough={0.4} />

      {/* bedroom */}
      <Block p={[7.9, 0.2, 5.3]} s={[1.62, 0.36, 2.14]} c="#8a6a4f" r={0.04} />
      <Block p={[7.9, 0.62, 4.22]} s={[1.62, 1.0, 0.1]} c="#7a5c43" r={0.03} />
      <Block p={[7.9, 0.46, 5.34]} s={[1.5, 0.2, 2.0]} c="#f3efe8" r={0.06} />
      <Block p={[7.9, 0.6, 4.52]} s={[0.95, 0.13, 0.36]} c="#ffffff" r={0.06} />
      <Block p={[7.9, 0.58, 5.72]} s={[1.54, 0.06, 1.3]} c="#6f8fa8" r={0.03} />
      <Block p={[6.72, 0.28, 4.45]} s={[0.46, 0.56, 0.42]} c="#9a7a5c" r={0.03} />
      <Cyl p={[6.72, 0.68, 4.45]} a={[0.09, 0.12, 0.24]} c="#efe3c8" />
      <Block p={[7.4, 0.95, 2.78]} s={[1.5, 1.9, 0.56]} c="#9a7a5c" r={0.03} />

      {/* bathroom */}
      <Cyl p={[10.4, 0.2, 6.28]} a={[0.19, 0.16, 0.4]} c="#f7f7f5" rough={0.3} />
      <Cyl p={[10.4, 0.42, 6.28]} a={[0.21, 0.21, 0.04]} c="#ffffff" rough={0.3} />
      <Block p={[10.4, 0.62, 6.6]} s={[0.46, 0.5, 0.2]} c="#f7f7f5" r={0.03} rough={0.3} />
      <Block p={[10.4, 0.82, 2.72]} s={[0.55, 0.16, 0.42]} c="#ffffff" r={0.04} rough={0.3} />
      <Cyl p={[10.4, 0.38, 2.68]} a={[0.07, 0.1, 0.74]} c="#f2f2f0" rough={0.3} />
      <Block p={[10.4, 0.03, 4.7]} s={[1.3, 0.06, 1.3]} c="#e3ebee" r={0.02} rough={0.3} />

      {/* veranda */}
      <group position={[4.6, 0, 4.4]}>
        <Block p={[0, 0.42, 0]} s={[1.5, 0.06, 0.42]} c="#9b744f" r={0.015} />
        <Block p={[0, 0.7, -0.19]} s={[1.5, 0.5, 0.05]} c="#9b744f" r={0.015} />
        {[-0.68, 0.68].map((lx) => (
          <Block key={lx} p={[lx, 0.2, 0]} s={[0.06, 0.4, 0.38]} c="#7d5c3f" r={0.01} />
        ))}
      </group>
      {[
        [0.45, 6.35],
        [5.15, 6.35],
      ].map(([x, z]) => (
        <group key={x}>
          <Cyl p={[x, 0.22, z]} a={[0.2, 0.16, 0.44]} c="#a5674b" />
          <mesh position={[x, 0.62, z]} castShadow>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshStandardMaterial color="#628f59" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[7.2, 7.75, 8.3].map((z) => (
        <Block key={z} p={[2.0, 0.01, z]} s={[0.8, 0.02, 0.42]} c="#b5ab9c" r={0.006} rough={1} />
      ))}
    </group>
  );
}

function Labels({ mode }: { mode: "3d" | "plan" }) {
  return (
    <>
      {ROOMS.map((r) => (
        <Html key={r.id} position={[r.x + r.w / 2, 0.05, mode === "plan" ? r.z + 0.4 : r.z + r.d - 0.3]} center zIndexRange={[10, 0]} className="pointer-events-none">
          <span className="rounded-md bg-surface/85 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-ink">{r.name}</span>
        </Html>
      ))}
    </>
  );
}

const ISO = new THREE.Vector3(6.5, 9.5, 10.5);
const PLAN = new THREE.Vector3(0, 15.5, 0.01);
const ORIGIN = new THREE.Vector3(0, 0, 0);

function CameraRig({ mode }: { mode: "3d" | "plan" }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const moving = useRef(true);

  useEffect(() => {
    moving.current = true;
  }, [mode]);

  useFrame((_, dt) => {
    if (!moving.current || !controls.current) return;
    const goal = mode === "plan" ? PLAN : ISO;
    const t = Math.min(1, dt * 3);
    camera.position.lerp(goal, t);
    controls.current.target.lerp(ORIGIN, t);
    controls.current.update();
    if (camera.position.distanceTo(goal) < 0.05) moving.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      enablePan={false}
      enableRotate={mode === "3d"}
      minDistance={6}
      maxDistance={22}
      maxPolarAngle={1.25}
    />
  );
}

export default function HouseScene({ mode, route, goal, ringColor, label, faded, urgent, activeRoom, bathroomBadge }: Props) {
  const bath = ROOMS.find((r) => r.id === "bathroom")!;
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: ISO.toArray(), fov: 38 }} gl={{ antialias: true }}>
      <hemisphereLight args={["#fff6ea", "#8c9686", 1.0]} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
      <CameraRig mode={mode} />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.065} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#3a4842" roughness={1} />
      </mesh>
      <ContactShadows position={[0, -0.06, 0]} opacity={0.35} scale={20} blur={2.4} far={4} />

      <group position={[-HOUSE.width / 2, 0, -HOUSE.depth / 2]}>
        <Floors activeRoom={activeRoom} />
        <Walls />
        <Furniture />
        <Labels mode={mode} />
        <DadAvatar route={route} goal={goal} ringColor={ringColor} label={label} faded={faded} urgent={urgent} hideOnArrival={bathroomBadge !== null} />
        {bathroomBadge && (
          <Html position={[bath.x + bath.w / 2, 1.5, bath.z + bath.d / 2]} center zIndexRange={[20, 0]} className="pointer-events-none">
            <div className="rounded-xl bg-ink px-3 py-2 text-center text-xs font-bold whitespace-nowrap text-bg">
              Door closed
              <span className="block font-normal opacity-80">{bathroomBadge}</span>
            </div>
          </Html>
        )}
      </group>
    </Canvas>
  );
}
