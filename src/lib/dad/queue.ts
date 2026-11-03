import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { EventType } from "@/types/domain";

// Everything Dad does is written here first, then sent to Supabase when the phone is online
// and signed in. Weak data or a power cut never loses a check-in or a dose.

type Queued = { id: string; type: EventType; value: Record<string, unknown>; occurred_at: string };

const KEY = "dadcare:queue";

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function write(q: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {}
}

export function record(type: EventType, value: Record<string, unknown> = {}) {
  const ev: Queued = { id: crypto.randomUUID(), type, value, occurred_at: new Date().toISOString() };
  write([...read(), ev]);
  void flush();
  return ev;
}

let flushing = false;
let householdId: string | null = null;

export async function flush() {
  if (flushing || !hasSupabaseEnv || !navigator.onLine) return;
  const q = read();
  if (!q.length) return;
  flushing = true;
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return; // Dad's phone is signed in during setup (step 3)

    if (!householdId) {
      const { data } = await supabase.from("people").select("household_id").eq("user_id", auth.user.id).maybeSingle();
      householdId = data?.household_id ?? null;
    }
    if (!householdId) return;

    const { error } = await supabase.from("events").insert(
      q.map((e) => ({ household_id: householdId, type: e.type, value: { ...e.value, client_id: e.id }, occurred_at: e.occurred_at })),
    );
    if (!error) {
      const sent = new Set(q.map((e) => e.id));
      write(read().filter((e) => !sent.has(e.id)));
    }
  } finally {
    flushing = false;
  }
}

export function startAutoFlush() {
  const onOnline = () => void flush();
  window.addEventListener("online", onOnline);
  const timer = window.setInterval(() => void flush(), 60_000);
  void flush();
  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(timer);
  };
}
