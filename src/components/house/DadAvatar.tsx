"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { Pose } from "@/lib/house/house";

// A stylised 3D figure of Dad: kaftan and fila cap, grey hair and beard, glasses.
// He walks the route through the doorways, then eases into the pose for where he is.

export type AvatarGoal = { x: number; z: number; yaw: number; pose: Pose; height?: number };

type Props = {
  route: [number, number][];
  goal: AvatarGoal;
  ringColor: string;
  label: string;
  faded?: boolean;
  urgent?: boolean;
  hideOnArrival?: boolean; // privacy: the bathroom shows a badge, never the figure
};

const SPEED = 1.1; // metres per second
const HIP = 0.86;
const SKIN = "#7a4a2e";
const KAFTAN = "#4a7896";
const TROUSERS = "#35607c";
const HAIR = "#d9d7d0";
const SHOE = "#2a2420";

const turn = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export function DadAvatar({ route, goal, ringColor, label, faded = false, urgent = false, hideOnArrival = false }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const lie = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const tag = useRef<THREE.Group>(null);

  const queue = useRef<[number, number][]>([]);
  const placed = useRef(false);
  const s = useRef({ yaw: goal.yaw, seat: 0, lie: 0, walk: 0, phase: 0 });

  useEffect(() => {
    const g = root.current;
    if (!g || !route.length) return;
    if (!placed.current) {
      // First render: appear in place instead of walking from the origin.
      const [x, z] = route[route.length - 1];
      g.position.set(x, 0, z);
      placed.current = true;
      return;
    }
    queue.current = [...route];
  }, [route]);

  useFrame((state, delta) => {
    const g = root.current;
    if (!g || !hips.current || !lie.current) return;
    const dt = Math.min(delta, 0.05);
    const st = s.current;
    const q = queue.current;

    let walking = false;
    let yawGoal = goal.yaw;
    if (q.length) {
      const [tx, tz] = q[0];
      const dx = tx - g.position.x;
      const dz = tz - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.04) {
        q.shift();
      } else {
        walking = true;
        yawGoal = Math.atan2(dx, dz);
        // Stand up fully before walking away from a chair or the bed.
        if (st.seat < 0.08 && st.lie < 0.08) {
          const step = Math.min(dist, SPEED * dt);
          g.position.x += (dx / dist) * step;
          g.position.z += (dz / dist) * step;
        }
      }
    }

    const pose: Pose = walking ? "standing" : goal.pose;
    const k = Math.min(1, dt * 4.5);
    st.seat += ((pose === "seated" ? 1 : 0) - st.seat) * k;
    st.lie += ((pose === "lying" ? 1 : 0) - st.lie) * k;
    st.walk += ((walking && st.seat < 0.1 && st.lie < 0.1 ? 1 : 0) - st.walk) * k;
    st.yaw = turn(st.yaw, yawGoal, Math.min(1, dt * 6));
    st.phase += dt * 7.5 * st.walk;
    g.rotation.y = st.yaw;

    const swing = Math.sin(st.phase) * 0.5 * st.walk;
    const seatH = goal.height ?? 0.45;
    hips.current.position.y = HIP + (seatH + 0.08 - HIP) * st.seat + Math.abs(Math.sin(st.phase)) * 0.03 * st.walk;
    legL.current!.rotation.x = (-Math.PI / 2) * st.seat + swing;
    legR.current!.rotation.x = (-Math.PI / 2) * st.seat - swing;
    kneeL.current!.rotation.x = (Math.PI / 2) * st.seat + Math.max(0, -swing) * 0.9;
    kneeR.current!.rotation.x = (Math.PI / 2) * st.seat + Math.max(0, swing) * 0.9;
    armL.current!.rotation.x = -swing * 0.8 - 0.35 * st.seat;
    armR.current!.rotation.x = swing * 0.8 - 0.35 * st.seat;
    elbowL.current!.rotation.x = -0.7 * st.seat - 0.25 * st.walk;
    elbowR.current!.rotation.x = -0.7 * st.seat - 0.25 * st.walk;

    // Lying: tip the whole figure back onto the bed, head towards the pillow.
    const bedH = (goal.height ?? 0.55) + 0.12;
    lie.current.rotation.x = (-Math.PI / 2) * st.lie;
    lie.current.position.set(0, bedH * st.lie, 0.85 * st.lie);

    if (body.current) body.current.visible = !(hideOnArrival && !q.length);
    if (ring.current) {
      const pulse = urgent ? 1 + 0.3 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4)) : 1;
      ring.current.scale.setScalar(pulse);
      ring.current.visible = !(hideOnArrival && !q.length);
    }
    if (tag.current) {
      tag.current.position.y = 2.05 - 1.15 * st.lie - 0.42 * st.seat;
      tag.current.visible = !(hideOnArrival && !q.length);
    }
  });

  const mat = (color: string, roughness = 0.8) => (
    <meshStandardMaterial color={color} roughness={roughness} transparent={faded} opacity={faded ? 0.35 : 1} />
  );

  return (
    <group ref={root}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.36, 0.46, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} />
      </mesh>

      <group ref={body}>
        <group ref={lie}>
          <group ref={hips} position-y={HIP}>
            {/* kaftan */}
            <mesh position-y={0.24} castShadow>
              <cylinderGeometry args={[0.16, 0.24, 0.8, 24]} />
              {mat(KAFTAN, 0.9)}
            </mesh>
            <mesh position-y={0.66} castShadow>
              <cylinderGeometry args={[0.05, 0.055, 0.1, 12]} />
              {mat(SKIN, 0.6)}
            </mesh>

            {/* head */}
            <group position-y={0.82}>
              <mesh castShadow>
                <sphereGeometry args={[0.13, 28, 20]} />
                {mat(SKIN, 0.6)}
              </mesh>
              <mesh>
                <sphereGeometry args={[0.134, 24, 12, 0, Math.PI * 2, 0.85, 0.9]} />
                {mat(HAIR, 1)}
              </mesh>
              <mesh position={[0, -0.085, 0.06]} scale={[1, 0.8, 0.75]}>
                <sphereGeometry args={[0.075, 16, 12]} />
                {mat(HAIR, 1)}
              </mesh>
              <mesh position={[0, 0.105, 0]} rotation-z={0.12} castShadow>
                <cylinderGeometry args={[0.118, 0.13, 0.1, 24]} />
                {mat(TROUSERS, 0.9)}
              </mesh>
              <mesh position={[0, -0.01, 0.13]}>
                <sphereGeometry args={[0.022, 10, 8]} />
                {mat(SKIN, 0.6)}
              </mesh>
              {[-0.045, 0.045].map((x) => (
                <group key={x} position={[x, 0.018, 0.118]}>
                  <mesh>
                    <sphereGeometry args={[0.012, 8, 8]} />
                    {mat("#141414", 0.4)}
                  </mesh>
                  <mesh position-z={0.006}>
                    <torusGeometry args={[0.03, 0.005, 8, 20]} />
                    {mat("#1d1d1d", 0.3)}
                  </mesh>
                </group>
              ))}
              <mesh position={[0, 0.018, 0.124]}>
                <boxGeometry args={[0.03, 0.006, 0.006]} />
                {mat("#1d1d1d", 0.3)}
              </mesh>
            </group>

            {/* arms */}
            {(
              [
                [-0.21, armL, elbowL],
                [0.21, armR, elbowR],
              ] as const
            ).map(([x, arm, elbow]) => (
              <group key={x} ref={arm} position={[x, 0.56, 0]}>
                <mesh position-y={-0.15} castShadow>
                  <capsuleGeometry args={[0.05, 0.22, 4, 12]} />
                  {mat(KAFTAN, 0.9)}
                </mesh>
                <group ref={elbow} position-y={-0.3}>
                  <mesh position-y={-0.12} castShadow>
                    <capsuleGeometry args={[0.042, 0.18, 4, 12]} />
                    {mat(SKIN, 0.6)}
                  </mesh>
                  <mesh position-y={-0.26}>
                    <sphereGeometry args={[0.05, 12, 10]} />
                    {mat(SKIN, 0.6)}
                  </mesh>
                </group>
              </group>
            ))}

            {/* legs */}
            {(
              [
                [-0.09, legL, kneeL],
                [0.09, legR, kneeR],
              ] as const
            ).map(([x, leg, knee]) => (
              <group key={x} ref={leg} position-x={x}>
                <mesh position-y={-0.21} castShadow>
                  <capsuleGeometry args={[0.068, 0.3, 4, 12]} />
                  {mat(TROUSERS, 0.9)}
                </mesh>
                <group ref={knee} position-y={-0.43}>
                  <mesh position-y={-0.2} castShadow>
                    <capsuleGeometry args={[0.058, 0.3, 4, 12]} />
                    {mat(TROUSERS, 0.9)}
                  </mesh>
                  <mesh position={[0, -0.4, 0.045]} castShadow>
                    <boxGeometry args={[0.1, 0.07, 0.21]} />
                    {mat(SHOE, 0.7)}
                  </mesh>
                </group>
              </group>
            ))}
          </group>
        </group>
      </group>

      <group ref={tag} position-y={2.05}>
        <Html center zIndexRange={[20, 0]} className="pointer-events-none">
          <div className="rounded-full bg-ink px-3 py-1 text-xs font-bold whitespace-nowrap text-bg">{label}</div>
        </Html>
      </group>
    </group>
  );
}
