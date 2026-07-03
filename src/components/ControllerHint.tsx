import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ControllerLayout = "xbox" | "playstation" | "generic";

/** Detects a connected gamepad and its brand for glyph rendering. */
export function useControllerStatus() {
  const [layout, setLayout] = useState<ControllerLayout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const poll = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = pads.find((p) => p);
      if (!pad) {
        setLayout((prev) => (prev === null ? prev : null));
      } else {
        const id = pad.id.toLowerCase();
        const next: ControllerLayout = /dualshock|dualsense|playstation|sony|054c/.test(id)
          ? "playstation"
          : /xbox|xinput|microsoft|045e/.test(id)
          ? "xbox"
          : "generic";
        setLayout((prev) => (prev === next ? prev : next));
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    const onConn = () => { /* poll handles it */ };
    window.addEventListener("gamepadconnected", onConn);
    window.addEventListener("gamepaddisconnected", onConn);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConn);
      window.removeEventListener("gamepaddisconnected", onConn);
    };
  }, []);

  return { connected: layout !== null, layout: layout ?? "xbox" };
}

// Which button ids we support as hints. Match INPUTS ids in lib/gamepad.ts.
export type HintButton =
  | "b0" | "b1" | "b2" | "b3"
  | "b4" | "b5" | "b6" | "b7"
  | "b8" | "b9"
  | "dpad" | "lstick";

interface GlyphSpec { text: string; className: string; }

const GLYPHS: Record<ControllerLayout, Partial<Record<HintButton, GlyphSpec>>> = {
  xbox: {
    b0: { text: "A", className: "bg-emerald-500/90 text-white" },
    b1: { text: "B", className: "bg-red-500/90 text-white" },
    b2: { text: "X", className: "bg-blue-500/90 text-white" },
    b3: { text: "Y", className: "bg-amber-400/90 text-black" },
    b4: { text: "LB", className: "bg-zinc-700 text-white" },
    b5: { text: "RB", className: "bg-zinc-700 text-white" },
    b6: { text: "LT", className: "bg-zinc-800 text-white" },
    b7: { text: "RT", className: "bg-zinc-800 text-white" },
    b8: { text: "View", className: "bg-zinc-700 text-white" },
    b9: { text: "Menu", className: "bg-zinc-700 text-white" },
  },
  playstation: {
    b0: { text: "×", className: "bg-sky-500/90 text-white" },
    b1: { text: "○", className: "bg-red-500/90 text-white" },
    b2: { text: "□", className: "bg-fuchsia-500/90 text-white" },
    b3: { text: "△", className: "bg-emerald-500/90 text-white" },
    b4: { text: "L1", className: "bg-zinc-700 text-white" },
    b5: { text: "R1", className: "bg-zinc-700 text-white" },
    b6: { text: "L2", className: "bg-zinc-800 text-white" },
    b7: { text: "R2", className: "bg-zinc-800 text-white" },
    b8: { text: "Share", className: "bg-zinc-700 text-white" },
    b9: { text: "Options", className: "bg-zinc-700 text-white" },
  },
  generic: {
    b0: { text: "1", className: "bg-primary text-primary-foreground" },
    b1: { text: "2", className: "bg-primary text-primary-foreground" },
    b2: { text: "3", className: "bg-primary text-primary-foreground" },
    b3: { text: "4", className: "bg-primary text-primary-foreground" },
    b4: { text: "L1", className: "bg-zinc-700 text-white" },
    b5: { text: "R1", className: "bg-zinc-700 text-white" },
    b6: { text: "L2", className: "bg-zinc-800 text-white" },
    b7: { text: "R2", className: "bg-zinc-800 text-white" },
    b8: { text: "Select", className: "bg-zinc-700 text-white" },
    b9: { text: "Start", className: "bg-zinc-700 text-white" },
  },
};

const DIRECTIONAL: Record<HintButton, GlyphSpec | undefined> = {
  dpad:   { text: "✥",  className: "bg-zinc-700 text-white" },
  lstick: { text: "◉",  className: "bg-zinc-700 text-white" },
  b0: undefined, b1: undefined, b2: undefined, b3: undefined,
  b4: undefined, b5: undefined, b6: undefined, b7: undefined,
  b8: undefined, b9: undefined,
};

function Glyph({ button, layout }: { button: HintButton; layout: ControllerLayout }) {
  const spec = DIRECTIONAL[button] ?? GLYPHS[layout][button];
  if (!spec) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold shadow-sm ring-1 ring-black/20",
        spec.className,
      )}
    >
      {spec.text}
    </span>
  );
}

export interface Hint { button: HintButton; label: string; }

interface Props {
  hints: Hint[];
  className?: string;
  /** Only render when a controller is connected. Default true. */
  requireController?: boolean;
}

/** A compact bar of button-glyph → label pairs. Hidden when no controller. */
export function ControllerHints({ hints, className, requireController = true }: Props) {
  const { connected, layout } = useControllerStatus();
  if (requireController && !connected) return null;
  if (hints.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {hints.map((h, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Glyph button={h.button} layout={layout} />
          {h.label}
        </span>
      ))}
    </div>
  );
}

export function ControllerHint({ button, label, className }: Hint & { className?: string }) {
  return <ControllerHints hints={[{ button, label }]} className={className} />;
}
