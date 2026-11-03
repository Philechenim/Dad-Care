"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SPOTS, roomById, walkPoints, type RoomId } from "@/lib/house/house";
import type { Activity, Mood } from "@/types/domain";
import type { AvatarGoal } from "./DadAvatar";

const HouseScene = dynamic(() => import("./HouseScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading the house…</div>,
});

// Until the room sensors are installed, these buttons stand in for them.
const PLACES: { id: string; label: string; spot: string | null; activity: Activity }[] = [
  { id: "chair", label: "His chair", spot: "chair", activity: "in_chair" },
  { id: "bed", label: "Bed (nap)", spot: "bed", activity: "napping" },
  { id: "table", label: "Dining table", spot: "table", activity: "in_room" },
  { id: "counter", label: "Kitchen", spot: "counter", activity: "in_room" },
  { id: "toilet", label: "Bathroom", spot: "toilet", activity: "bathroom" },
  { id: "bench", label: "Veranda", spot: "bench", activity: "in_room" },
  { id: "out", label: "Goes out", spot: null, activity: "out" },
];

const MOODS: { id: Mood; label: string; colour: string; dot: string }[] = [
  { id: "good", label: "Good", colour: "#2e7d57", dot: "bg-ok" },
  { id: "so_so", label: "So-so", colour: "#c08a1e", dot: "bg-warn" },
  { id: "not_good", label: "Not good", colour: "#c4473b", dot: "bg-crit" },
];

const FRONT_DOOR: [number, number] = [2.0, 6.8];
const OUTSIDE: AvatarGoal = { x: 2.0, z: 7.8, yaw: 0, pose: "standing" };

function statusText(activity: Activity, room: RoomId | "outside") {
  switch (activity) {
    case "in_chair":
      return "In his chair";
    case "napping":
      return "Napping";
    case "asleep":
      return "Asleep";
    case "bathroom":
      return "In the bathroom";
    case "out":
      return "Out of the house";
    case "moving":
      return "Moving around";
    case "unsure":
      return "Not sure";
    default:
      return room === "outside" ? "Outside" : `In the ${roomById(room).name.toLowerCase()}`;
  }
}

function goalFor(placeId: string): { goal: AvatarGoal; room: RoomId | "outside" } {
  const place = PLACES.find((p) => p.id === placeId)!;
  const spot = place.spot ? SPOTS.find((s) => s.id === place.spot) : null;
  if (!spot) return { goal: OUTSIDE, room: "outside" };
  return { goal: { x: spot.x, z: spot.z, yaw: spot.yaw, pose: spot.pose, height: spot.height }, room: spot.room };
}

export function HouseDashboard() {
  const [mode, setMode] = useState<"3d" | "plan">("3d");
  const [placeId, setPlaceId] = useState("chair");
  const [mood, setMood] = useState<Mood>("good");
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [route, setRoute] = useState<[number, number][]>(() => {
    const { goal } = goalFor("chair");
    return [[goal.x, goal.z]];
  });

  useEffect(() => {
    // The clock is read only in the browser; Next pre-renders this page without it.
    const tick = () => {
      setNow(Date.now());
      setSince((s) => s ?? Date.now() - 22 * 60_000); // example start: in his chair for 22 min
    };
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const place = PLACES.find((p) => p.id === placeId)!;
  const { goal, room } = useMemo(() => goalFor(placeId), [placeId]);
  const moodInfo = MOODS.find((m) => m.id === mood)!;
  const minutes = now && since ? Math.max(0, Math.floor((now - since) / 60_000)) : null;
  const status = statusText(place.activity, room);
  const forHowLong = minutes === null ? "" : minutes < 1 ? "just now" : `${minutes} min`;

  function moveTo(id: string, at: number) {
    if (id === placeId) return;
    const from = goalFor(placeId);
    const to = goalFor(id);
    // Walk through the doorways; going out or coming home passes the front door.
    const start: RoomId = from.room === "outside" ? "veranda" : from.room;
    let pts: [number, number][];
    if (to.room === "outside") pts = [...walkPoints(start, { room: "veranda", x: FRONT_DOOR[0], z: FRONT_DOOR[1] - 0.4 }), FRONT_DOOR, [OUTSIDE.x, OUTSIDE.z]];
    else pts = walkPoints(start, { room: to.room, x: to.goal.x, z: to.goal.z });
    if (from.room === "outside") pts = [FRONT_DOOR, ...pts];
    setRoute(pts);
    setPlaceId(id);
    setSince(at);
    setNow(at);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dad&apos;s house</h1>
          <p className="text-sm text-muted">Jos · example layout until the real photos and room sizes arrive</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="View">
          {(["3d", "plan"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${mode === m ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {m === "3d" ? "3D" : "Plan"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative h-[min(68vh,640px)] min-h-[380px] overflow-hidden rounded-2xl border border-line bg-[#eef0ea]" aria-label="3D view of Dad's house">
          <HouseScene
            mode={mode}
            route={route}
            goal={goal}
            ringColor={moodInfo.colour}
            label={`Dad · ${status}`}
            faded={place.activity === "out"}
            urgent={mood === "not_good"}
            activeRoom={room === "outside" ? null : room}
            bathroomBadge={place.activity === "bathroom" ? forHowLong || "just now" : null}
          />
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-surface/85 px-2 py-1 text-xs text-muted">
            {mode === "3d" ? "Drag to turn · scroll to zoom" : "Plan view from above"}
          </p>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted">Right now</p>
            <p className="mt-1 text-2xl leading-tight font-bold">{status}</p>
            <p className="mt-1 text-sm text-muted tabular-nums">{forHowLong && `for ${forHowLong}`}</p>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <span className={`size-2.5 rounded-full ${moodInfo.dot}`} />
              Last check-in: {moodInfo.label}
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-bold">Sensor simulator</h2>
            <p className="mt-1 text-sm text-muted">Stands in for the room sensors until Jay installs them.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PLACES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => moveTo(p.id, performance.timeOrigin + e.timeStamp)}
                  aria-pressed={placeId === p.id}
                  className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${placeId === p.id ? "border-accent bg-accent text-on-accent" : "border-line bg-surface-2 hover:border-accent"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">Check-in mood</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id)}
                  aria-pressed={mood === m.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${mood === m.id ? "border-ink" : "border-line"} bg-surface-2`}
                >
                  <span className={`size-2 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              ))}
            </div>
          </section>

          <Link href="/dashboard/status" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
            Backend status
          </Link>
        </aside>
      </div>
    </main>
  );
}
