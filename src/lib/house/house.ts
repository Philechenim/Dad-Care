// Dad's house as data, in metres. Both the 3D view and the plan view draw from this one file.
// EXAMPLE LAYOUT: replace with the real house once Phil sends photos, a walkthrough and room sizes.
// x runs west → east, z runs north → south, y is up. (0,0) is the north-west corner.

import type { Activity, Mood } from "@/types/domain";

export type RoomId = "sitting" | "dining" | "kitchen" | "bedroom" | "bathroom" | "veranda";
export type Room = { id: RoomId; name: string; x: number; z: number; w: number; d: number; floor: string };
export type Door = { a: RoomId | "outside"; b: RoomId; x: number; z: number; width: number; axis: "x" | "z" };
export type Pose = "standing" | "seated" | "lying";
export type Spot = { id: string; room: RoomId; label: string; x: number; z: number; yaw: number; pose: Pose; height?: number };

export const ROOMS: Room[] = [
  { id: "sitting", name: "Sitting room", x: 0, z: 0, w: 5.6, d: 4.0, floor: "#9a7350" },
  { id: "dining", name: "Dining", x: 5.6, z: 0, w: 3.0, d: 2.4, floor: "#93714f" },
  { id: "kitchen", name: "Kitchen", x: 8.6, z: 0, w: 2.6, d: 2.4, floor: "#a8a297" },
  { id: "bedroom", name: "Bedroom", x: 5.6, z: 2.4, w: 4.0, d: 4.4, floor: "#8a6646" },
  { id: "bathroom", name: "Bathroom", x: 9.6, z: 2.4, w: 1.6, d: 4.4, floor: "#8fa4a7" },
  { id: "veranda", name: "Veranda", x: 0, z: 4.0, w: 5.6, d: 2.8, floor: "#8d867b" },
];

// A door sits on the wall between two rooms. axis = the direction the wall runs.
export const DOORS: Door[] = [
  { a: "sitting", b: "dining", x: 5.6, z: 1.2, width: 1.0, axis: "z" },
  { a: "dining", b: "kitchen", x: 8.6, z: 1.2, width: 0.9, axis: "z" },
  { a: "sitting", b: "bedroom", x: 5.6, z: 3.3, width: 0.9, axis: "z" },
  { a: "bedroom", b: "bathroom", x: 9.6, z: 3.4, width: 0.8, axis: "z" },
  { a: "sitting", b: "veranda", x: 2.8, z: 4.0, width: 1.2, axis: "x" },
  { a: "outside", b: "veranda", x: 2.0, z: 6.8, width: 1.0, axis: "x" },
];

// Places Dad is often found. yaw 0 faces south (+z); Math.PI faces north.
export const SPOTS: Spot[] = [
  { id: "chair", room: "sitting", label: "His chair", x: 1.7, z: 1.6, yaw: Math.PI, pose: "seated", height: 0.45 },
  { id: "bed", room: "bedroom", label: "His bed", x: 7.9, z: 5.3, yaw: 0, pose: "lying", height: 0.55 },
  { id: "toilet", room: "bathroom", label: "Toilet", x: 10.4, z: 6.2, yaw: Math.PI, pose: "seated", height: 0.42 },
  { id: "table", room: "dining", label: "Dining table", x: 7.1, z: 1.75, yaw: Math.PI, pose: "seated", height: 0.46 },
  { id: "counter", room: "kitchen", label: "Kitchen counter", x: 9.9, z: 1.2, yaw: Math.PI, pose: "standing" },
  { id: "bench", room: "veranda", label: "Veranda bench", x: 4.6, z: 4.6, yaw: 0, pose: "seated", height: 0.44 },
  { id: "door", room: "veranda", label: "Front door", x: 2.0, z: 6.3, yaw: 0, pose: "standing" },
];

export const HOUSE = { width: 11.2, depth: 6.8, wallHeight: 1.15 };

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;
export const roomCenter = (id: RoomId): [number, number] => {
  const r = roomById(id);
  return [r.x + r.w / 2, r.z + r.d / 2];
};

/** Rooms to walk through from one room to another (breadth-first over the doors). */
export function roomPath(from: RoomId, to: RoomId): RoomId[] {
  const prev = new Map<RoomId, RoomId | null>([[from, null]]);
  const queue: RoomId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const d of DOORS) {
      const next = d.a === cur ? d.b : d.b === cur ? d.a : null;
      if (next && next !== "outside" && !prev.has(next)) {
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  const path: RoomId[] = [];
  for (let at: RoomId | null | undefined = to; at; at = prev.get(at)) path.unshift(at);
  return path[0] === from ? path : [to];
}

/** Floor points (x, z) the avatar walks through: each doorway between consecutive rooms, then the target. */
export function walkPoints(fromRoom: RoomId, to: { room: RoomId; x: number; z: number }): [number, number][] {
  const rooms = roomPath(fromRoom, to.room);
  const pts: [number, number][] = [];
  for (let i = 0; i < rooms.length - 1; i++) {
    const door = DOORS.find((d) => (d.a === rooms[i] && d.b === rooms[i + 1]) || (d.b === rooms[i] && d.a === rooms[i + 1]));
    if (door) pts.push([door.x, door.z]);
  }
  pts.push([to.x, to.z]);
  return pts;
}

// What the dashboard shows. Mirrors the `states` table.
export type DadPlace = { room: RoomId | "outside"; spot: string | null; activity: Activity; mood: Mood };
