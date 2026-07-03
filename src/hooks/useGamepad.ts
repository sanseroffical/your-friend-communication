import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  loadMapping,
  loadHapticsEnabled,
  loadGamepadEnabled,
  vibrateGamepad,
  onActiveProfileChange,
  getActiveProfile,
  setActiveProfile,
  type Mapping,
  type ActionCode,
} from "@/lib/gamepad";

const AXIS_MAP: Record<string, { axis: 0 | 1; sign: 1 | -1 }> = {
  lsl: { axis: 0, sign: -1 },
  lsr: { axis: 0, sign: 1 },
  lsu: { axis: 1, sign: -1 },
  lsd: { axis: 1, sign: 1 },
};

/**
 * Global gamepad → keyboard bridge with per-profile mappings and haptics.
 * Mounted once at the app shell so controllers drive keyboard events
 * everywhere (menus, chat, plaza, games) — not just inside games.
 * Games call setActiveProfile(gameType) to load a custom override profile.
 */
export function useGamepadBridge() {
  const pressed = useRef<Record<string, boolean>>({});
  const globalMap = useRef<Mapping>(loadMapping("global"));
  const activeMap = useRef<Mapping>(loadMapping(getActiveProfile()));
  const activeProfile = useRef<string>(getActiveProfile());
  const enabled = useRef<boolean>(loadGamepadEnabled());
  const haptics = useRef<boolean>(loadHapticsEnabled());
  const announced = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reload = () => {
      globalMap.current = loadMapping("global");
      activeMap.current = loadMapping(activeProfile.current);
      haptics.current = loadHapticsEnabled();
      enabled.current = loadGamepadEnabled();
    };
    const onProfile = (p: string) => {
      activeProfile.current = p;
      activeMap.current = loadMapping(p);
    };
    const offProfile = onActiveProfileChange(onProfile);
    window.addEventListener("gamepad:mapping-changed", reload);
    window.addEventListener("gamepad:haptics-changed", reload);
    window.addEventListener("gamepad:enabled-changed", reload);

    const dispatch = (type: "keydown" | "keyup", code: ActionCode) => {
      if (code === "None") return;
      const key = code.startsWith("Key")
        ? code.slice(3).toLowerCase()
        : code.startsWith("Arrow")
        ? code
        : code === "Space"
        ? " "
        : code === "ShiftLeft"
        ? "Shift"
        : code;
      const ev = new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true,
      });
      (window.document.activeElement ?? window).dispatchEvent(ev);
    };

    // Resolve the actions bound to an input id, honouring the active
    // profile first and falling back to the global mapping.
    const resolveActions = (inputId: string): ActionCode[] => {
      const a = activeMap.current[inputId];
      if (a && a.length) return a;
      if (activeProfile.current !== "global") {
        const g = globalMap.current[inputId];
        if (g && g.length) return g;
      }
      return [];
    };

    const setState = (inputId: string, down: boolean) => {
      const wasDown = !!pressed.current[inputId];
      if (down === wasDown) return;
      pressed.current[inputId] = down;
      const actions = resolveActions(inputId);
      for (const c of actions) dispatch(down ? "keydown" : "keyup", c);
      if (down && haptics.current && actions.length) {
        vibrateGamepad({ duration: 40, strong: 0.35, weak: 0.25 });
      }
    };

    let raf = 0;
    const poll = () => {
      if (!enabled.current) { raf = requestAnimationFrame(poll); return; }
      const pads = navigator.getGamepads?.() ?? [];
      for (const pad of pads) {
        if (!pad) continue;
        if (!announced.current) {
          announced.current = true;
          toast.success(`Controller connected: ${pad.id.split("(")[0].trim()}`);
          vibrateGamepad({ duration: 180, strong: 0.5, weak: 0.5 });
        }
        // Buttons 0-15
        pad.buttons.forEach((b, i) => {
          if (i > 15) return;
          const inputId = `b${i}`;
          const down = typeof b === "object" ? b.pressed : (b as unknown as number) > 0.5;
          setState(inputId, down);
        });
        // Left-stick axes → 4 virtual inputs
        const [lx = 0, ly = 0] = pad.axes;
        const DZ = 0.35;
        for (const id of Object.keys(AXIS_MAP)) {
          const { axis, sign } = AXIS_MAP[id];
          const v = axis === 0 ? lx : ly;
          const active = sign === 1 ? v > DZ : v < -DZ;
          setState(id, active);
        }
      }
      raf = requestAnimationFrame(poll);
    };

    const onConnect = (e: GamepadEvent) => {
      announced.current = false;
      toast.success(`🎮 ${e.gamepad.id.split("(")[0].trim()} ready`);
      vibrateGamepad({ duration: 200, strong: 0.6, weak: 0.6 });
    };
    const onDisconnect = () => {
      announced.current = false;
      for (const id of Object.keys(pressed.current)) setState(id, false);
      toast.message("Controller disconnected");
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    raf = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
      window.removeEventListener("gamepad:mapping-changed", reload);
      window.removeEventListener("gamepad:haptics-changed", reload);
      window.removeEventListener("gamepad:enabled-changed", reload);
      offProfile();
      for (const id of Object.keys(pressed.current)) {
        if (pressed.current[id]) dispatch("keyup", (resolveActions(id)[0] as ActionCode) ?? "None");
      }
      pressed.current = {};
    };
  }, []);
}

/**
 * Games call this to switch the active mapping profile while mounted.
 * The bridge automatically reverts to "global" on unmount.
 */
export function useGamepadProfile(profile: string) {
  useEffect(() => {
    const prev = getActiveProfile();
    setActiveProfile(profile);
    return () => setActiveProfile(prev);
  }, [profile]);
}
