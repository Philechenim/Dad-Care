"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { allowPress, vibrate } from "@/lib/dad/device";

// Styles for dc-hold / dc-ring / dc-row live in globals.css (CSS Modules don't pass through the Tailwind loader).

export type Tone = "ok" | "talk" | "med" | "help" | "plain";

// --tint colours the glass, the disc and the progress ring; the text class is the deep ink of the same hue.
const TONES: Record<Tone, string> = {
  ok: "[--tint:var(--dad-ok)] text-dad-ok-ink",
  talk: "[--tint:var(--dad-talk)] text-dad-talk-ink",
  med: "[--tint:var(--dad-med)] text-dad-med-ink",
  help: "[--tint:var(--dad-help)] text-dad-help-ink",
  plain: "[--tint:var(--dad-plain)] text-dad-ink",
};

type Props = {
  label: string;
  tone: Tone;
  onHold: () => void;
  icon?: ReactNode;
  holdMs?: number;
  layout?: "tile" | "row";
  onTooShort?: () => void;
  onBlocked?: () => void;
  className?: string;
};

// Fires only after a steady press (default 1 s) while the ring fills. Taps and shaky bursts do nothing.
export function HoldButton({
  label,
  tone,
  onHold,
  icon,
  holdMs = 1000,
  layout = "tile",
  onTooShort,
  onBlocked,
  className = "",
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const start = useRef(0);
  const raf = useRef(0);
  const fire = useRef(0);
  const handlers = useRef({ onHold, onTooShort, onBlocked });

  useEffect(() => {
    handlers.current = { onHold, onTooShort, onBlocked };
  }, [onHold, onTooShort, onBlocked]);
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(fire.current);
    },
    [],
  );

  const setProgress = (p: number) => ref.current?.style.setProperty("--p", String(p));

  function begin() {
    if (start.current) return;
    if (!allowPress()) {
      handlers.current.onBlocked?.();
      return;
    }
    start.current = performance.now();
    ref.current?.setAttribute("data-holding", "");
    // A timer decides when the hold completes; animation frames only draw the ring,
    // so Help still fires if the browser throttles frames.
    fire.current = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      start.current = 0;
      setProgress(1);
      ref.current?.removeAttribute("data-holding");
      vibrate(40);
      window.setTimeout(() => setProgress(0), 200);
      handlers.current.onHold();
    }, holdMs);
    const step = (now: number) => {
      if (!start.current) return;
      setProgress(Math.min(1, (now - start.current) / holdMs));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  function end() {
    if (!start.current) return;
    const held = performance.now() - start.current;
    window.clearTimeout(fire.current);
    cancelAnimationFrame(raf.current);
    start.current = 0;
    setProgress(0);
    ref.current?.removeAttribute("data-holding");
    if (held < holdMs * 0.85) handlers.current.onTooShort?.();
  }

  const shape =
    layout === "tile"
      ? "flex-col justify-center gap-4 rounded-[28px] p-3"
      : "dc-row flex-row justify-start gap-5 rounded-[24px] px-5";

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${label}. Press and hold.`}
      className={`dc-hold dc-glass ${TONES[tone]} ${shape} flex items-center ${className}`}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId); // keep the hold if the finger drifts off the button
        } catch {}
        begin();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") end();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {icon && (
        <span className="dc-ring" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={`text-[26px] leading-tight font-bold ${layout === "tile" ? "text-center" : ""}`}>{label}</span>
    </button>
  );
}
