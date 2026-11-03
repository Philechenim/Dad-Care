"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHECK_IN_TIME,
  DOSES,
  HELP_COUNTDOWN_S,
  HELP_PHONE,
  HELP_PHONE_NAME,
  LADDER_LIVE,
  MISSED_AFTER_MIN,
  REMIND_AGAIN_MIN,
  WALK_BPM,
  type DoseSlot,
} from "@/lib/dad/config";
import { readToday, saveVoiceNote, speak, vibrate, writeToday, allowPress } from "@/lib/dad/device";
import { record, startAutoFlush } from "@/lib/dad/queue";
import type { Mood } from "@/types/domain";
import { HoldButton } from "./HoldButton";
import {
  IconBack,
  IconCheck,
  IconClose,
  IconHelp,
  IconMic,
  IconNotGood,
  IconOk,
  IconPhone,
  IconPill,
  IconSoSo,
  IconSpeaker,
  IconWalk,
} from "./icons";

type View = "home" | "faces" | "notgood" | "talk" | "med" | "help" | "helpon" | "walk" | "msg";
type DoseDay = Record<string, { taken?: string; r1?: boolean; r2?: boolean; missed?: boolean }>;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const minutesNow = (d: Date) => d.getHours() * 60 + d.getMinutes();
const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const slotTime = (hhmm: string) => {
  const m = toMinutes(hhmm);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
const greeting = (d: Date) => (d.getHours() < 12 ? "Good morning" : d.getHours() < 17 ? "Good afternoon" : "Good evening");
const nextSlot = (day: DoseDay) => DOSES.find((s) => !day[s.id]?.taken);

export function DadApp() {
  const [view, setView] = useState<View>("home");
  const viewRef = useRef<View>("home");
  const [now, setNow] = useState<Date | null>(null);
  const [doseDay, setDoseDay] = useState<DoseDay>({});
  const [facesTitle, setFacesTitle] = useState("How are you?");
  const [msg, setMsg] = useState({ title: "", sub: "" });
  const [helpLeft, setHelpLeft] = useState(HELP_COUNTDOWN_S);
  const [helpOn, setHelpOn] = useState({ title: "", sub: "" });
  const [hint, setHint] = useState("");
  const [caption, setCaption] = useState("");
  const [recording, setRecording] = useState(false);
  const [beatLeft, setBeatLeft] = useState(true);

  const hintTimer = useRef(0);
  const captionTimer = useRef(0);
  const recorder = useRef<{ mr: MediaRecorder; chunks: Blob[]; started: number } | null>(null);
  const talkHeld = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const go = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const say = useCallback((text: string) => {
    speak(text);
    setCaption(text);
    window.clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaption(""), Math.max(2600, text.length * 70));
  }, []);

  const showHint = useCallback((text: string) => {
    setHint(text);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(""), 1400);
  }, []);
  const tooShort = useCallback(() => showHint("Press and hold"), [showHint]);
  const blocked = useCallback(() => showHint("Slowly. Press and hold."), [showHint]);

  const showMsg = useCallback(
    (title: string, sub: string, ms = 2800) => {
      setMsg({ title, sub });
      go("msg");
      window.setTimeout(() => {
        if (viewRef.current === "msg") go("home");
      }, ms);
    },
    [go],
  );

  const remind = useCallback(
    (slot: DoseSlot, again: boolean) => {
      if (["help", "helpon", "walk", "talk"].includes(viewRef.current)) return;
      go("med");
      vibrate([300, 150, 300]);
      const which = slot.label.toLowerCase();
      say(again ? `Reminder. It is past time for your ${which} medicine.` : `It is time for your ${which} medicine.`);
    },
    [go, say],
  );

  // Clock, dose reminders and the morning check-in, checked every 20 seconds.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      const m = minutesNow(d);
      const day = readToday<DoseDay>("doses", {});
      let changed = false;
      let reminded = false;
      for (const slot of DOSES) {
        const st = day[slot.id] ?? {};
        const late = m - toMinutes(slot.time);
        if (st.taken || late < 0) continue;
        if (!reminded && (!st.r1 || (late >= REMIND_AGAIN_MIN && !st.r2))) {
          const again = Boolean(st.r1);
          st.r1 = true;
          if (again) st.r2 = true;
          remind(slot, again);
          reminded = true;
          changed = true;
        }
        if (late >= MISSED_AFTER_MIN && !st.missed) {
          st.missed = true;
          changed = true;
          record("dose", { slot: slot.id, status: "missed", scheduled: slot.time });
        }
        day[slot.id] = st;
      }
      if (changed) writeToday("doses", day);
      setDoseDay(day);

      const checkInDue = m >= toMinutes(CHECK_IN_TIME) && m < 12 * 60;
      if (checkInDue && !reminded && viewRef.current === "home" && !readToday("checkin", null) && !readToday("checkinAsked", false)) {
        writeToday("checkinAsked", true);
        setFacesTitle("Good morning. How are you today?");
        go("faces");
        say("Good morning. How are you today?");
      }
    };
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 20_000);
    const stopFlush = startAutoFlush();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      stopFlush();
    };
  }, [go, remind, say]);

  // Help countdown: cancellable for 10 seconds, then help is called.
  const fireHelp = useCallback(() => {
    record("help", { source: "button" });
    if (LADDER_LIVE && navigator.onLine) {
      setHelpOn({ title: "Calling your family", sub: "Stay where you are. Help is being called now." });
      go("helpon");
      say("Calling your family now.");
      return;
    }
    if (HELP_PHONE) {
      setHelpOn({ title: `Calling ${HELP_PHONE_NAME}`, sub: "Your phone is calling now. Stay where you are." });
      go("helpon");
      say(`Calling ${HELP_PHONE_NAME} now.`);
      window.location.href = `tel:${HELP_PHONE}`;
      return;
    }
    setHelpOn({ title: "Help number not set", sub: "Ask Jay to add a help number to this phone." });
    go("helpon");
    say("The help number is not set up yet.");
  }, [go, say]);

  useEffect(() => {
    if (view !== "help") return;
    let left = HELP_COUNTDOWN_S;
    const timer = window.setInterval(() => {
      left -= 1;
      setHelpLeft(left);
      vibrate(60);
      if (left <= 0) {
        window.clearInterval(timer);
        fireHelp();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, fireHelp]);

  // Walking beat: a steady click and buzz to step to.
  useEffect(() => {
    if (view !== "walk") return;
    let left = true;
    const timer = window.setInterval(() => {
      left = !left;
      setBeatLeft(left);
      vibrate(50);
      const ctx = audio.current;
      if (!ctx) return;
      try {
        const gain = ctx.createGain();
        const osc = ctx.createOscillator();
        osc.frequency.value = left ? 880 : 660;
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch {}
    }, 60_000 / WALK_BPM);
    return () => {
      window.clearInterval(timer);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [view]);

  // ---------- actions ----------
  function checkIn(mood: Mood) {
    writeToday("checkin", mood);
    record("checkin", { mood });
    if (mood === "not_good") {
      go("notgood");
      say("Do you want Phil to call you?");
      return;
    }
    say("Thank you. Phil can see how you feel.");
    showMsg("Thank you", `Phil can see you are feeling ${mood === "good" ? "good" : "so-so"}.`);
  }

  function takeDose() {
    const day = readToday<DoseDay>("doses", {});
    const slot = nextSlot(day);
    if (!slot) return;
    day[slot.id] = { ...day[slot.id], taken: new Date().toISOString() };
    writeToday("doses", day);
    setDoseDay(day);
    record("dose", { slot: slot.id, status: "taken", scheduled: slot.time });
    say("Thank you. Your medicine is logged.");
    showMsg("Well done", `Your ${slot.label.toLowerCase()} medicine is logged.`);
  }

  function startWalk() {
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {}
    navigator.wakeLock
      ?.request("screen")
      .then((lock) => (wakeLock.current = lock))
      .catch(() => {});
    go("walk");
    say("Step with the beat.");
  }

  async function startRecording() {
    if (recorder.current || !allowPress()) return;
    talkHeld.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!talkHeld.current) {
        // Let go while the microphone permission prompt was open: don't start a recording nobody is holding.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.start();
      recorder.current = { mr, chunks, started: performance.now() };
      setRecording(true);
      vibrate(40);
    } catch {
      say("I cannot use the microphone. Ask Jay to allow it.");
    }
  }

  function stopRecording() {
    talkHeld.current = false;
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    setRecording(false);
    const seconds = Math.round((performance.now() - r.started) / 1000);
    r.mr.onstop = async () => {
      r.mr.stream.getTracks().forEach((t) => t.stop());
      if (seconds < 1) {
        showHint("Hold longer to speak");
        return;
      }
      const id = crypto.randomUUID();
      try {
        await saveVoiceNote(id, new Blob(r.chunks, { type: r.mr.mimeType }));
      } catch {}
      record("voice_note", { local_audio_id: id, seconds });
      say("Sent to Phil.");
      showMsg("Sent to Phil", navigator.onLine ? "Your message is on its way." : "No network. It will send when the network is back.");
    };
    r.mr.stop();
  }

  const slot = nextSlot(doseDay);
  const slotLate = slot && now ? minutesNow(now) - toMinutes(slot.time) : -1;
  const back = <HoldButton label="Back" tone="plain" layout="row" holdMs={600} icon={<IconBack />} onHold={() => go("home")} onTooShort={tooShort} onBlocked={blocked} className="h-[76px] shrink-0" />;

  return (
    <main
      className="relative flex h-dvh flex-col gap-3 overflow-hidden bg-dad-ground px-4 pb-4 text-dad-ink select-none"
      style={{ paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      {view === "home" && (
        <>
          <header className="flex items-end justify-between px-1">
            <div>
              <p className="text-xl font-bold text-dad-muted">{now ? greeting(now) : " "}</p>
              <p className="text-[44px] leading-none font-bold tabular-nums">{now ? clock(now) : " "}</p>
            </div>
            <p className="text-right text-lg leading-snug font-bold text-dad-muted">
              {now?.toLocaleDateString("en-GB", { weekday: "long" })}
              <br />
              {now?.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </p>
          </header>
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
            <HoldButton label="I'm OK" tone="ok" icon={<IconOk />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { setFacesTitle("How are you?"); go("faces"); say("How are you feeling?"); }} />
            <HoldButton label="Talk to family" tone="talk" icon={<IconMic />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { go("talk"); say("Hold the circle and speak."); }} />
            <HoldButton label="My medicine" tone="med" icon={<IconPill />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { go("med"); say(slot ? `Your ${slot.label.toLowerCase()} medicine is at ${slotTime(slot.time)}.` : "You have taken all your medicine today."); }} />
            <HoldButton label="Help" tone="help" holdMs={2000} icon={<IconHelp />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { setHelpLeft(HELP_COUNTDOWN_S); go("help"); say(`Calling for help in ${HELP_COUNTDOWN_S} seconds. Hold cancel if you are fine.`); }} />
          </div>
          <HoldButton label="Help me walk" tone="plain" layout="row" icon={<IconWalk />} onTooShort={tooShort} onBlocked={blocked} onHold={startWalk} className="h-[84px] shrink-0" />
        </>
      )}

      {view === "faces" && (
        <>
          <h1 className="px-1 pt-2 text-[32px] leading-tight font-bold text-balance">{facesTitle}</h1>
          <div className="grid min-h-0 flex-1 grid-rows-3 gap-3">
            <HoldButton label="Good" tone="ok" layout="row" icon={<IconOk />} onTooShort={tooShort} onBlocked={blocked} onHold={() => checkIn("good")} />
            <HoldButton label="So-so" tone="plain" layout="row" icon={<IconSoSo />} onTooShort={tooShort} onBlocked={blocked} onHold={() => checkIn("so_so")} />
            <HoldButton label="Not good" tone="help" layout="row" icon={<IconNotGood />} onTooShort={tooShort} onBlocked={blocked} onHold={() => checkIn("not_good")} />
          </div>
          {back}
        </>
      )}

      {view === "notgood" && (
        <>
          <h1 className="px-1 pt-2 text-[32px] leading-tight font-bold text-balance">Do you want Phil to call you?</h1>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
            <HoldButton label="Yes, call me" tone="ok" layout="row" icon={<IconPhone />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { record("checkin", { mood: "not_good", wants_call: true }); say("Okay. Phil will call you soon."); showMsg("Phil will call you", "We have told Phil."); }} />
            <HoldButton label="No, thank you" tone="plain" layout="row" icon={<IconClose />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { say("Okay. Rest well."); showMsg("Okay", "Rest well. Press I'm OK any time."); }} />
          </div>
        </>
      )}

      {view === "talk" && (
        <>
          <div className="px-1 pt-2">
            <h1 className="text-[32px] leading-tight font-bold">Talk to family</h1>
            <p className="mt-1 text-xl text-dad-muted">Hold the circle and speak. Let go to send.</p>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <button
              type="button"
              aria-label="Hold to record a voice message"
              className={`flex size-60 flex-col items-center justify-center gap-3 rounded-full bg-dad-talk-bg text-dad-talk-ink transition-transform select-none [touch-action:none] ${recording ? "scale-105" : ""}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                void startRecording();
              }}
              onPointerUp={stopRecording}
              onPointerCancel={stopRecording}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="size-14">
                <IconMic />
              </span>
              <span className="text-2xl font-bold">{recording ? "Listening…" : "Hold to talk"}</span>
            </button>
          </div>
          {back}
        </>
      )}

      {view === "med" && (
        <>
          <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-[28px] bg-dad-raised p-5">
            {slot ? (
              <>
                <div>
                  <p className="text-xl font-bold text-dad-med-ink">
                    {slotLate < 0 ? `Next: ${slot.label.toLowerCase()}` : slotLate >= MISSED_AFTER_MIN ? "Late. Please take it now." : "Time to take it now"}
                  </p>
                  <p className="text-[40px] leading-tight font-bold tabular-nums">{slotTime(slot.time)}</p>
                </div>
                <ul className="flex flex-col gap-4">
                  {slot.pills.map((p) => (
                    <li key={p.name} className="flex items-center gap-4">
                      <span
                        aria-hidden="true"
                        className={`shrink-0 border border-black/10 ${p.shape === "oval" ? "h-9 w-14 rounded-full" : p.shape === "small" ? "mx-1.5 size-9 rounded-full" : "size-12 rounded-full"}`}
                        style={{ background: p.colour }}
                      />
                      <span className="text-xl leading-tight font-bold">
                        {p.name}
                        <span className="block text-base font-normal text-dad-muted">{p.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto text-sm text-dad-muted">Example schedule. Phil sets the real medicines and photos.</p>
              </>
            ) : (
              <div className="my-auto">
                <p className="text-[32px] leading-tight font-bold">All done for today</p>
                <p className="mt-1 text-xl text-dad-muted">You have taken all your medicine.</p>
              </div>
            )}
          </section>
          {slot && <HoldButton label="I took it" tone="med" layout="row" icon={<IconCheck />} onTooShort={tooShort} onBlocked={blocked} onHold={takeDose} className="h-[96px] shrink-0" />}
          {back}
        </>
      )}

      {view === "help" && (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-2xl font-bold text-dad-muted">Calling for help in</p>
            <p className="text-[150px] leading-none font-bold text-dad-help-ink tabular-nums" aria-live="assertive">
              {helpLeft}
            </p>
            <p className="text-xl text-dad-muted">Hold Cancel if you are fine</p>
          </div>
          <HoldButton label="Cancel" tone="plain" layout="row" holdMs={600} icon={<IconClose />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { record("help", { cancelled: true }); say("Cancelled. No one was called."); showMsg("Cancelled", "No one was called."); }} className="h-[100px] shrink-0" />
        </>
      )}

      {view === "helpon" && (
        <>
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 px-2">
            <span className="grid size-24 place-items-center rounded-full bg-dad-help-bg text-dad-help-ink">
              <span className="size-11">
                <IconPhone />
              </span>
            </span>
            <h1 className="text-[34px] leading-tight font-bold text-balance">{helpOn.title}</h1>
            <p className="text-xl text-dad-muted">{helpOn.sub}</p>
          </div>
          <HoldButton label="I'm fine now" tone="ok" layout="row" icon={<IconCheck />} onTooShort={tooShort} onBlocked={blocked} onHold={() => { record("help", { resolved_by_dad: true }); go("home"); }} className="h-[88px] shrink-0" />
        </>
      )}

      {view === "walk" && (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
            <div className={`grid size-56 place-items-center rounded-full text-5xl font-bold transition-transform duration-75 ${beatLeft ? "scale-100 bg-dad-plain-bg" : "scale-105 bg-dad-ok-bg text-dad-ok-ink"}`}>
              {beatLeft ? "Left" : "Right"}
            </div>
            <p className="text-xl text-dad-muted tabular-nums">{WALK_BPM} steps a minute</p>
          </div>
          <HoldButton label="Stop" tone="plain" layout="row" holdMs={600} icon={<IconClose />} onTooShort={tooShort} onBlocked={blocked} onHold={() => go("home")} className="h-[96px] shrink-0" />
        </>
      )}

      {view === "msg" && (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 px-2">
          <span className="grid size-24 place-items-center rounded-full bg-dad-ok-bg text-dad-ok-ink">
            <span className="size-11">
              <IconCheck />
            </span>
          </span>
          <h1 className="text-[34px] leading-tight font-bold">{msg.title}</h1>
          <p className="text-xl text-dad-muted">{msg.sub}</p>
        </div>
      )}

      <p
        role="status"
        className={`pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-dad-ink px-5 py-2.5 text-lg font-bold whitespace-nowrap text-dad-ground transition-opacity ${hint ? "opacity-100" : "opacity-0"}`}
      >
        {hint}
      </p>
      <p
        aria-live="polite"
        className={`pointer-events-none absolute inset-x-4 bottom-4 flex items-start gap-3 rounded-2xl bg-dad-ink px-4 py-3 text-lg text-dad-ground shadow-lg transition-opacity ${caption ? "opacity-100" : "opacity-0"}`}
      >
        <span className="mt-1 shrink-0">
          <IconSpeaker />
        </span>
        {caption}
      </p>
    </main>
  );
}
