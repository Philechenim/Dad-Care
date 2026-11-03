// Settings for Dad's screen. In step 3 these move into the dashboard so Phil can edit them;
// until then they live here. Never put real names or phone numbers in this file: use .env.local.

export type Pill = { name: string; note: string; colour: string; shape: "round" | "small" | "oval" };
export type DoseSlot = { id: string; label: string; time: string; pills: Pill[] };

// Example schedule (not medical advice). Phil replaces it with Dad's real medicines, times and pill photos.
const levodopa: Pill = { name: "Carbidopa-levodopa", note: "1 tablet", colour: "#F2C94C", shape: "round" };
export const DOSES: DoseSlot[] = [
  {
    id: "morning",
    label: "Morning",
    time: "07:00",
    pills: [
      levodopa,
      { name: "Aspirin 75 mg", note: "1 small tablet", colour: "#F4F3EE", shape: "small" },
      { name: "Bisoprolol 5 mg", note: "1 tablet", colour: "#F2A65A", shape: "round" },
    ],
  },
  { id: "midday", label: "Midday", time: "13:00", pills: [levodopa] },
  {
    id: "evening",
    label: "Evening",
    time: "19:00",
    pills: [levodopa, { name: "Atorvastatin 20 mg", note: "1 tablet", colour: "#FFFFFF", shape: "oval" }],
  },
];

export const CHECK_IN_TIME = "08:00"; // daily "Good morning, how are you today?"
export const REMIND_AGAIN_MIN = 30; // second reminder
export const MISSED_AFTER_MIN = 60; // Phil gets a quiet alert (step 4)
export const WALK_BPM = 96; // set with Dad's physiotherapist
export const HELP_COUNTDOWN_S = 10;

// Step 4 switches this on: Help then starts the voice-call + SMS ladder to the Jos contacts.
// Until then Help places a direct phone call, so the screen never promises a call that is not happening.
export const LADDER_LIVE = false;
export const HELP_PHONE = process.env.NEXT_PUBLIC_HELP_PHONE ?? "";
export const HELP_PHONE_NAME = process.env.NEXT_PUBLIC_HELP_PHONE_NAME ?? "Phil";
