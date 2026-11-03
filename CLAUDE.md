@AGENTS.md

# Dad Care

Phil (Abuja) watches over his father in Jos, who lives with parkinsonism after a stroke and a heart attack.
Spec v1 is summarised in `docs/prototype.html` (open it in a browser: "What we can build now" tab has the plan).

## Stack
- Next.js 16 App Router, TypeScript, Tailwind v4 (tokens in `src/app/globals.css`). Middleware is `src/proxy.ts` in Next 16.
- Supabase (hosted): Postgres + Auth + Realtime. Schema lives in `supabase/migrations/`; never edit a migration that has run, add a new one.
- Supabase clients: `src/lib/supabase/client.ts` (browser), `server.ts` (server), `proxy.ts` (session refresh).

## Product rules (from the spec)
- Dad never types or swipes. Every action is press-and-hold (~1 s), spoken aloud, with large text and no scrolling.
- Calm by default: Phil's screen is green most of the time; only urgent things get loud.
- No cameras, no audio recording except a voice note Dad holds to send. "Pause sharing" is shown to Phil, never hidden.
- Silence is never "all fine": offline sensors or phone show as "Not sure" / "offline since".
- Built for Nigeria: queue events offline, fall back to SMS and voice calls, timezone Africa/Lagos.

## Decisions (answered 2026-11-03)
- Dad will wear a watch or bracelet every day: wearable fall detection stays in the plan.
- Jesse (Jay), Phil's elder brother in Jos, does the house setup and fixes sensors.
- Emergency ladder: 1. Mom, 2. Jay. Reachable hours not given yet (assume any time). Phil's own number still needed for the offline Help fallback.
- The house has stable Wi-Fi.
- Real names and numbers live only in `config/household.local.json` (gitignored). Never commit them or put them in code.

## Design (Dad's screen)
- Follows taste-skill app-screen rules: one typeface (Atkinson Hyperlegible), flat fills, no gradients, shadows, glows, indigo or violet, no tiny uppercase labels.
- Soft palette: each button is a pale field with deep ink of the same hue (contrast above 7:1). Phil asked for colours that are not harsh.

## Build order
1. Foundation (done: this scaffold + schema) · 2. Dad's PWA · 3. Phil's dashboard · 4. Alert engine + ladder (Termii / Africa's Talking)
5. Simulator publishing to MQTT · 6. House map setup · 7. Real sensors one at a time

## Working with Phil
- He is new to frontend: explain changes step by step in plain language.
- Keep token use lean.
