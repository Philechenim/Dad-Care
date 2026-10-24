import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dad Care · Dad" };

const buttons = [
  { label: "I'm OK", className: "bg-dad-ok" },
  { label: "Talk to family", className: "bg-dad-talk" },
  { label: "My medicine", className: "bg-dad-med" },
  { label: "Help", className: "bg-dad-help" },
];

// Layout shell only. Press-and-hold, speech and the real actions arrive in step 2.
export default function DadScreen() {
  return (
    <main className="flex min-h-dvh flex-col gap-3 bg-dad-bg p-4 text-dad-ink">
      <p className="font-display text-2xl font-bold">Good day</p>
      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3">
        {buttons.map((b) => (
          <div
            key={b.label}
            className={`flex items-center justify-center rounded-3xl p-3 text-center text-2xl font-bold text-white ${b.className}`}
          >
            {b.label}
          </div>
        ))}
      </div>
      <p className="text-center text-sm">Preview. Buttons become active in step 2.</p>
    </main>
  );
}
