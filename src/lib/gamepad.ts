// Gamepad configuration, storage, and haptics helpers.
// A single source of truth used by the bridge hook and the settings UI.

export type ActionCode =
  | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
  | "KeyW" | "KeyA" | "KeyS" | "KeyD"
  | "KeyQ" | "KeyE" | "KeyR" | "KeyF" | "KeyZ" | "KeyX"
  | "Space" | "Enter" | "Escape" | "Tab" | "ShiftLeft"
  | "None";

export interface ActionDef {
  code: ActionCode;
  label: string;
  group: "Movement" | "Menu" | "Action" | "Modifier" | "None";
}

export const ACTIONS: ActionDef[] = [
  { code: "None", label: "— Unbound —", group: "None" },
  { code: "ArrowUp", label: "Up (Arrow)", group: "Movement" },
  { code: "ArrowDown", label: "Down (Arrow)", group: "Movement" },
  { code: "ArrowLeft", label: "Left (Arrow)", group: "Movement" },
  { code: "ArrowRight", label: "Right (Arrow)", group: "Movement" },
  { code: "KeyW", label: "W", group: "Movement" },
  { code: "KeyS", label: "S", group: "Movement" },
  { code: "KeyA", label: "A", group: "Movement" },
  { code: "KeyD", label: "D", group: "Movement" },
  { code: "Space", label: "Space / Jump / Fire", group: "Action" },
  { code: "Enter", label: "Enter / Confirm", group: "Action" },
  { code: "Escape", label: "Escape / Pause", group: "Menu" },
  { code: "Tab", label: "Tab / Cycle", group: "Menu" },
  { code: "KeyE", label: "E / Interact", group: "Action" },
  { code: "KeyF", label: "F / Use", group: "Action" },
  { code: "KeyQ", label: "Q", group: "Action" },
  { code: "KeyR", label: "R / Reload", group: "Action" },
  { code: "KeyZ", label: "Z", group: "Action" },
  { code: "KeyX", label: "X", group: "Action" },
  { code: "ShiftLeft", label: "Shift / Sprint", group: "Modifier" },
];

// Standard gamepad inputs we expose for remapping.
export interface InputDef {
  id: string;           // stable id used in mapping records
  label: string;        // human name
  hint: string;         // e.g. "Xbox: A · PS: ×"
  kind: "button" | "axis";
  buttonIndex?: number; // for kind:"button"
  axis?: "LSx-" | "LSx+" | "LSy-" | "LSy+" | "RSx-" | "RSx+" | "RSy-" | "RSy+";
}

export const INPUTS: InputDef[] = [
  { id: "b0",  label: "Face South", hint: "A / ×",             kind: "button", buttonIndex: 0 },
  { id: "b1",  label: "Face East",  hint: "B / ○",             kind: "button", buttonIndex: 1 },
  { id: "b2",  label: "Face West",  hint: "X / □",             kind: "button", buttonIndex: 2 },
  { id: "b3",  label: "Face North", hint: "Y / △",             kind: "button", buttonIndex: 3 },
  { id: "b4",  label: "Left Bumper",  hint: "LB / L1",         kind: "button", buttonIndex: 4 },
  { id: "b5",  label: "Right Bumper", hint: "RB / R1",         kind: "button", buttonIndex: 5 },
  { id: "b6",  label: "Left Trigger", hint: "LT / L2",         kind: "button", buttonIndex: 6 },
  { id: "b7",  label: "Right Trigger",hint: "RT / R2",         kind: "button", buttonIndex: 7 },
  { id: "b8",  label: "Select",       hint: "View / Share",    kind: "button", buttonIndex: 8 },
  { id: "b9",  label: "Start",        hint: "Menu / Options",  kind: "button", buttonIndex: 9 },
  { id: "b12", label: "D-Pad Up",     hint: "↑",               kind: "button", buttonIndex: 12 },
  { id: "b13", label: "D-Pad Down",   hint: "↓",               kind: "button", buttonIndex: 13 },
  { id: "b14", label: "D-Pad Left",   hint: "←",               kind: "button", buttonIndex: 14 },
  { id: "b15", label: "D-Pad Right",  hint: "→",               kind: "button", buttonIndex: 15 },
  { id: "lsl", label: "Left Stick ←", hint: "Left stick left",  kind: "axis", axis: "LSx-" },
  { id: "lsr", label: "Left Stick →", hint: "Left stick right", kind: "axis", axis: "LSx+" },
  { id: "lsu", label: "Left Stick ↑", hint: "Left stick up",    kind: "axis", axis: "LSy-" },
  { id: "lsd", label: "Left Stick ↓", hint: "Left stick down",  kind: "axis", axis: "LSy+" },
];

// Profiles: "global" is the fallback used everywhere; per-game profiles override it.
export interface ProfileDef { id: string; label: string; }
export const PROFILES: ProfileDef[] = [
  { id: "global",           label: "Global (everywhere)" },
  { id: "plaza",            label: "3D Plaza" },
  { id: "cube_runner",      label: "Cube Runner" },
  { id: "neon_racer_3d",    label: "Neon Racer" },
  { id: "tower_stacker_3d", label: "Tower Stacker 3D" },
  { id: "asteroid_gunner",  label: "Asteroid Gunner" },
  { id: "sky_shooter",      label: "Sky Shooter" },
  { id: "plaza_parkour",    label: "Plaza Parkour" },
  { id: "plaza_arena",      label: "Plaza Arena" },
  { id: "snake",            label: "Snake" },
  { id: "tetris",           label: "Tetris" },
  { id: "flappy",           label: "Flappy" },
  { id: "pacman",           label: "Pac-Man" },
  { id: "space_invaders",   label: "Space Invaders" },
  { id: "pong",             label: "Pong" },
];

// A mapping = per-input → array of action codes (empty means fall through to global).
export type Mapping = Record<string, ActionCode[]>;

export const DEFAULT_GLOBAL_MAPPING: Mapping = {
  b0:  ["Space", "Enter"],
  b1:  ["Escape"],
  b2:  ["KeyE"],
  b3:  ["KeyF"],
  b4:  ["KeyQ"],
  b5:  ["KeyR"],
  b6:  ["ShiftLeft"],
  b7:  ["KeyZ"],
  b8:  ["Tab"],
  b9:  ["Escape"],
  b12: ["ArrowUp", "KeyW"],
  b13: ["ArrowDown", "KeyS"],
  b14: ["ArrowLeft", "KeyA"],
  b15: ["ArrowRight", "KeyD"],
  lsl: ["ArrowLeft", "KeyA"],
  lsr: ["ArrowRight", "KeyD"],
  lsu: ["ArrowUp", "KeyW"],
  lsd: ["ArrowDown", "KeyS"],
};

// ------------------------- Storage -------------------------

const LS_MAP_PREFIX = "gamepad.mapping.";
const LS_HAPTICS = "gamepad.haptics";
const LS_ENABLED = "gamepad.enabled";

export function loadMapping(profile: string): Mapping {
  if (typeof localStorage === "undefined") {
    return profile === "global" ? { ...DEFAULT_GLOBAL_MAPPING } : {};
  }
  try {
    const raw = localStorage.getItem(LS_MAP_PREFIX + profile);
    if (raw) return JSON.parse(raw) as Mapping;
  } catch { /* ignore */ }
  return profile === "global" ? { ...DEFAULT_GLOBAL_MAPPING } : {};
}

export function saveMapping(profile: string, mapping: Mapping): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_MAP_PREFIX + profile, JSON.stringify(mapping));
  window.dispatchEvent(new CustomEvent("gamepad:mapping-changed", { detail: { profile } }));
}

export function resetMapping(profile: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LS_MAP_PREFIX + profile);
  window.dispatchEvent(new CustomEvent("gamepad:mapping-changed", { detail: { profile } }));
}

export function loadHapticsEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(LS_HAPTICS) !== "off";
}
export function saveHapticsEnabled(on: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_HAPTICS, on ? "on" : "off");
  window.dispatchEvent(new CustomEvent("gamepad:haptics-changed"));
}

export function loadGamepadEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(LS_ENABLED) !== "off";
}
export function saveGamepadEnabled(on: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_ENABLED, on ? "on" : "off");
  window.dispatchEvent(new CustomEvent("gamepad:enabled-changed"));
}

// ------------------------- Active profile (module-level pub/sub) -------------------------

let _activeProfile = "global";
const _profileListeners = new Set<(p: string) => void>();

export function getActiveProfile(): string { return _activeProfile; }
export function setActiveProfile(profile: string): void {
  if (_activeProfile === profile) return;
  _activeProfile = profile;
  _profileListeners.forEach((l) => l(profile));
}
export function onActiveProfileChange(cb: (p: string) => void): () => void {
  _profileListeners.add(cb);
  return () => _profileListeners.delete(cb);
}

// ------------------------- Haptics -------------------------

export interface VibrateOpts {
  duration?: number;       // ms
  strong?: number;         // 0..1
  weak?: number;           // 0..1
}

/**
 * Play a rumble effect on the first connected gamepad (or all).
 * Falls back to `navigator.vibrate` (mobile) when no controller actuator exists.
 * Respects the user's global haptics toggle.
 */
export function vibrateGamepad(opts: VibrateOpts = {}): void {
  if (!loadHapticsEnabled()) return;
  const duration = Math.max(10, Math.min(2000, opts.duration ?? 90));
  const strong = Math.max(0, Math.min(1, opts.strong ?? 0.6));
  const weak = Math.max(0, Math.min(1, opts.weak ?? 0.4));
  if (typeof navigator === "undefined") return;

  let played = false;
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (!pad) continue;
    // Standard GamepadHapticActuator (Chromium)
    const actuator =
      (pad as unknown as { vibrationActuator?: { playEffect?: (t: string, o: unknown) => Promise<unknown> } })
        .vibrationActuator;
    if (actuator?.playEffect) {
      try {
        actuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration,
          strongMagnitude: strong,
          weakMagnitude: weak,
        });
        played = true;
      } catch { /* ignore */ }
    }
  }
  if (!played && "vibrate" in navigator) {
    try { (navigator as Navigator).vibrate?.(duration); } catch { /* ignore */ }
  }
}
