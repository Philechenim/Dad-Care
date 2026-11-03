// Small wrappers around phone features. Each one fails quietly: a missing feature must never break Dad's screen.

let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  voice =
    voices.find((v) => v.lang === "en-NG") ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null;
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    if (!voice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "en-GB";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export function vibrate(pattern: number | number[]) {
  try {
    // Browsers refuse vibration until the screen has been touched once; skip quietly until then.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(pattern);
  } catch {}
}

// Ignores shaky bursts: 4 or more touches inside 1.5 s lock input for 1.5 s.
const recent: number[] = [];
let lockedUntil = 0;
export function allowPress(now = performance.now()): boolean {
  if (now < lockedUntil) return false;
  while (recent.length && recent[0] < now - 1500) recent.shift();
  recent.push(now);
  if (recent.length >= 4) {
    lockedUntil = now + 1500;
    recent.length = 0;
    return false;
  }
  return true;
}

// Per-day storage on the phone (dose ticks, today's check-in). Keys roll over at local midnight.
const dayKey = (k: string) => `dadcare:${k}:${new Date().toLocaleDateString("en-CA")}`;
export function readToday<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(dayKey(k));
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeToday(k: string, v: unknown) {
  try {
    localStorage.setItem(dayKey(k), JSON.stringify(v));
  } catch {}
}

// Voice notes wait in IndexedDB until they can be uploaded (upload arrives with step 3).
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("dadcare", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("voice");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveVoiceNote(id: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("voice", "readwrite");
    tx.objectStore("voice").put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
