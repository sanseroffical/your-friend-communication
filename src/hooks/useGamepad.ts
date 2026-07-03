import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Global gamepad → keyboard bridge.
 * Maps standard gamepad buttons/axes to synthetic KeyboardEvents so every
 * existing keyboard-driven game (and the plaza) works with a controller
 * without any per-game changes.
 *
 * Mapping (standard layout):
 *  - Left stick + D-Pad → ArrowUp/Down/Left/Right (+ WASD duplicate)
 *  - A (0) / Cross     → Space + Enter
 *  - B (1) / Circle    → Escape
 *  - X (2) / Square    → KeyE
 *  - Y (3) / Triangle  → KeyF
 *  - LB/RB (4/5)       → KeyQ / KeyR
 *  - LT/RT (6/7)       → ShiftLeft / KeyZ
 *  - Start (9)         → Escape (pause)
 *  - Select (8)        → Tab
 */
export function useGamepadBridge(enabled = true) {
  const pressed = useRef<Record<string, boolean>>({});
  const announced = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const dispatch = (type: "keydown" | "keyup", code: string) => {
      const key = code.startsWith("Key")
        ? code.slice(3).toLowerCase()
        : code.startsWith("Arrow")
        ? code
        : code === "Space"
        ? " "
        : code === "Enter"
        ? "Enter"
        : code === "Escape"
        ? "Escape"
        : code === "Tab"
        ? "Tab"
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

    const setState = (code: string, down: boolean) => {
      const was = !!pressed.current[code];
      if (down && !was) {
        pressed.current[code] = true;
        dispatch("keydown", code);
      } else if (!down && was) {
        pressed.current[code] = false;
        dispatch("keyup", code);
      }
    };

    const BUTTON_MAP: Record<number, string[]> = {
      0: ["Space", "Enter"],
      1: ["Escape"],
      2: ["KeyE"],
      3: ["KeyF"],
      4: ["KeyQ"],
      5: ["KeyR"],
      6: ["ShiftLeft"],
      7: ["KeyZ"],
      8: ["Tab"],
      9: ["Escape"],
      12: ["ArrowUp", "KeyW"],
      13: ["ArrowDown", "KeyS"],
      14: ["ArrowLeft", "KeyA"],
      15: ["ArrowRight", "KeyD"],
    };

    let raf = 0;
    const poll = () => {
      const pads = navigator.getGamepads?.() ?? [];
      for (const pad of pads) {
        if (!pad) continue;
        if (!announced.current) {
          announced.current = true;
          toast.success(`Controller connected: ${pad.id.split("(")[0].trim()}`);
        }
        // Buttons
        pad.buttons.forEach((b, i) => {
          const codes = BUTTON_MAP[i];
          if (!codes) return;
          const down = typeof b === "object" ? b.pressed : (b as unknown as number) > 0.5;
          for (const c of codes) setState(c, down);
        });
        // Left stick → arrows + WASD
        const [lx = 0, ly = 0] = pad.axes;
        const DZ = 0.35;
        setState("ArrowLeft", lx < -DZ);
        setState("KeyA", lx < -DZ);
        setState("ArrowRight", lx > DZ);
        setState("KeyD", lx > DZ);
        setState("ArrowUp", ly < -DZ);
        setState("KeyW", ly < -DZ);
        setState("ArrowDown", ly > DZ);
        setState("KeyS", ly > DZ);
      }
      raf = requestAnimationFrame(poll);
    };

    const onConnect = (e: GamepadEvent) => {
      announced.current = false;
      toast.success(`🎮 ${e.gamepad.id.split("(")[0].trim()} ready`);
    };
    const onDisconnect = () => {
      announced.current = false;
      // release everything
      for (const code of Object.keys(pressed.current)) setState(code, false);
      toast.message("Controller disconnected");
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    raf = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
      for (const code of Object.keys(pressed.current)) {
        if (pressed.current[code]) dispatch("keyup", code);
      }
      pressed.current = {};
    };
  }, [enabled]);
}
