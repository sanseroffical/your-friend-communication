import { useEffect, useState, useCallback } from 'react';

const SCAN_KEY = 'cmd_mode_scanline_opacity';
const CARET_KEY = 'cmd_mode_caret_speed_ms';
const REDUCED_MOTION_KEY = 'cmd_mode_respect_reduced_motion';

export const DEFAULT_SCANLINE = 40; // 0-100 (% of base opacity)
export const DEFAULT_CARET_MS = 1000; // ms per blink cycle
export const DEFAULT_RESPECT_REDUCED_MOTION = true;

export function useCmdModeSettings() {
  const [scanline, setScanlineState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SCANLINE;
    const v = Number(localStorage.getItem(SCAN_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : DEFAULT_SCANLINE;
  });
  const [caretMs, setCaretMsState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_CARET_MS;
    const v = Number(localStorage.getItem(CARET_KEY));
    return Number.isFinite(v) && v >= 100 && v <= 4000 ? v : DEFAULT_CARET_MS;
  });
  const [respectReducedMotion, setRespectReducedMotionState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return DEFAULT_RESPECT_REDUCED_MOTION;
    const raw = localStorage.getItem(REDUCED_MOTION_KEY);
    if (raw === null) return DEFAULT_RESPECT_REDUCED_MOTION;
    return raw === 'true';
  });

  // Apply as CSS custom properties + class on <html>
  useEffect(() => {
    const root = document.documentElement;
    // Base opacity is 0.04; scale by user value (0-100 -> 0-0.12)
    const opacity = (scanline / 100) * 0.12;
    root.style.setProperty('--cmd-scanline-opacity', String(opacity));
    root.style.setProperty('--cmd-caret-duration', `${caretMs}ms`);
    root.classList.toggle('cmd-respect-reduced-motion', respectReducedMotion);
  }, [scanline, caretMs, respectReducedMotion]);

  const setScanline = useCallback((v: number) => {
    setScanlineState(v);
    try { localStorage.setItem(SCAN_KEY, String(v)); } catch {}
  }, []);
  const setCaretMs = useCallback((v: number) => {
    setCaretMsState(v);
    try { localStorage.setItem(CARET_KEY, String(v)); } catch {}
  }, []);
  const setRespectReducedMotion = useCallback((v: boolean) => {
    setRespectReducedMotionState(v);
    try { localStorage.setItem(REDUCED_MOTION_KEY, String(v)); } catch {}
  }, []);

  return {
    scanline,
    setScanline,
    caretMs,
    setCaretMs,
    respectReducedMotion,
    setRespectReducedMotion,
  };
}
