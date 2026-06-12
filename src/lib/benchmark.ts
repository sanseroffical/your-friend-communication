/**
 * Client-side benchmarking utilities.
 * - Device: CPU math throughput, render FPS, memory allocation throughput
 * - App: Web Vitals (FCP, LCP, CLS, INP) via PerformanceObserver
 */

export type DeviceBenchmarkResult = {
  cpuScore: number;
  renderScore: number;
  memoryScore: number;
  totalScore: number;
  cpuOpsPerSec: number;
  renderFps: number;
  memoryMBPerSec: number;
  userAgent: string;
};

export type ProgressCallback = (stage: string, pct: number) => void;

/** Tight math loop. Returns operations per second. */
async function runCpuBenchmark(onProgress?: ProgressCallback): Promise<number> {
  onProgress?.("CPU math", 0);
  // Warm up
  let warm = 0;
  for (let i = 0; i < 100_000; i++) warm += Math.sqrt(i) * Math.sin(i);
  if (warm === Infinity) console.log(warm); // prevent DCE

  const DURATION_MS = 1500;
  const start = performance.now();
  let ops = 0;
  let acc = 0;
  while (performance.now() - start < DURATION_MS) {
    for (let i = 0; i < 10_000; i++) {
      acc += Math.sqrt(i + ops) * Math.sin(i) + Math.cos(i * 0.001);
    }
    ops += 10_000;
    if (ops % 200_000 === 0) {
      const pct = ((performance.now() - start) / DURATION_MS) * 100;
      onProgress?.("CPU math", Math.min(99, pct));
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  if (acc === Infinity) console.log(acc);
  const elapsed = (performance.now() - start) / 1000;
  onProgress?.("CPU math", 100);
  return ops / elapsed;
}

/** Render benchmark: count animation frames over a window. */
async function runRenderBenchmark(onProgress?: ProgressCallback): Promise<number> {
  onProgress?.("Render FPS", 0);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const DURATION_MS = 1500;
  return new Promise<number>((resolve) => {
    const start = performance.now();
    let frames = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      // Draw some work
      ctx.clearRect(0, 0, 256, 256);
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `hsl(${(elapsed + i * 10) % 360}, 70%, 50%)`;
        ctx.beginPath();
        ctx.arc(
          128 + Math.cos((elapsed + i * 100) * 0.005) * 80,
          128 + Math.sin((elapsed + i * 100) * 0.005) * 80,
          12,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      frames++;
      onProgress?.("Render FPS", Math.min(99, (elapsed / DURATION_MS) * 100));
      if (elapsed < DURATION_MS) {
        requestAnimationFrame(tick);
      } else {
        onProgress?.("Render FPS", 100);
        resolve((frames * 1000) / elapsed);
      }
    };
    requestAnimationFrame(tick);
  });
}

/** Memory benchmark: allocate and fill typed arrays. Returns MB/sec. */
async function runMemoryBenchmark(onProgress?: ProgressCallback): Promise<number> {
  onProgress?.("Memory", 0);
  const DURATION_MS = 1000;
  const CHUNK_BYTES = 1024 * 1024; // 1 MB
  const start = performance.now();
  let bytes = 0;
  const sink: Uint8Array[] = [];
  while (performance.now() - start < DURATION_MS) {
    const buf = new Uint8Array(CHUNK_BYTES);
    for (let i = 0; i < buf.length; i += 4096) buf[i] = (i & 0xff);
    sink.push(buf);
    bytes += CHUNK_BYTES;
    if (sink.length > 200) sink.shift(); // bound memory
    if (bytes % (10 * CHUNK_BYTES) === 0) {
      const pct = ((performance.now() - start) / DURATION_MS) * 100;
      onProgress?.("Memory", Math.min(99, pct));
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  const elapsed = (performance.now() - start) / 1000;
  onProgress?.("Memory", 100);
  return bytes / (1024 * 1024) / elapsed;
}

export async function runDeviceBenchmark(onProgress?: ProgressCallback): Promise<DeviceBenchmarkResult> {
  const cpuOpsPerSec = await runCpuBenchmark(onProgress);
  const renderFps = await runRenderBenchmark(onProgress);
  const memoryMBPerSec = await runMemoryBenchmark(onProgress);

  // Normalize to a 0-10000 scale; chosen so a mid-range laptop scores ~5000-7000.
  const cpuScore = Math.round(Math.min(10000, cpuOpsPerSec / 6000));
  const renderScore = Math.round(Math.min(10000, (renderFps / 144) * 7000));
  const memoryScore = Math.round(Math.min(10000, memoryMBPerSec * 5));
  const totalScore = Math.round((cpuScore + renderScore + memoryScore) / 3);

  return {
    cpuScore,
    renderScore,
    memoryScore,
    totalScore,
    cpuOpsPerSec,
    renderFps,
    memoryMBPerSec,
    userAgent: navigator.userAgent,
  };
}

/* --- Web Vitals --- */

export type WebVitals = {
  fcp?: number; // First Contentful Paint (ms)
  lcp?: number; // Largest Contentful Paint (ms)
  cls?: number; // Cumulative Layout Shift
  inp?: number; // Interaction to Next Paint (ms, max so far)
  ttfb?: number; // Time to First Byte (ms)
  domNodes: number;
  jsHeapUsedMB?: number;
  jsHeapLimitMB?: number;
};

export function collectWebVitals(): WebVitals {
  const v: WebVitals = { domNodes: document.getElementsByTagName("*").length };

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav) v.ttfb = nav.responseStart - nav.requestStart;

  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  if (fcp) v.fcp = fcp.startTime;

  // memory is non-standard
  const mem = (performance as any).memory;
  if (mem) {
    v.jsHeapUsedMB = mem.usedJSHeapSize / (1024 * 1024);
    v.jsHeapLimitMB = mem.jsHeapSizeLimit / (1024 * 1024);
  }
  return v;
}

/** Subscribe to live updates of LCP/CLS/INP. Returns an unsubscribe fn. */
export function subscribeWebVitals(cb: (v: Partial<WebVitals>) => void): () => void {
  const observers: PerformanceObserver[] = [];

  const safeObserve = (type: string, handler: PerformanceObserverCallback) => {
    try {
      const po = new PerformanceObserver(handler);
      po.observe({ type, buffered: true } as PerformanceObserverInit);
      observers.push(po);
    } catch {
      /* unsupported */
    }
  };

  let cls = 0;
  let inpMax = 0;

  safeObserve("largest-contentful-paint", (list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1] as any;
    if (last) cb({ lcp: last.renderTime || last.loadTime || last.startTime });
  });

  safeObserve("layout-shift", (list) => {
    for (const e of list.getEntries() as any[]) {
      if (!e.hadRecentInput) cls += e.value;
    }
    cb({ cls });
  });

  safeObserve("event", (list) => {
    for (const e of list.getEntries() as any[]) {
      if (e.duration > inpMax) inpMax = e.duration;
    }
    cb({ inp: inpMax });
  });

  safeObserve("paint", (list) => {
    for (const e of list.getEntries()) {
      if (e.name === "first-contentful-paint") cb({ fcp: e.startTime });
    }
  });

  return () => observers.forEach((o) => o.disconnect());
}

/** Live FPS sampler — call start, then stop to get aggregates. */
export class FpsSampler {
  private samples: number[] = [];
  private last = 0;
  private raf = 0;
  private running = false;
  onSample?: (fps: number) => void;

  start() {
    if (this.running) return;
    this.running = true;
    this.samples = [];
    this.last = performance.now();
    const tick = (t: number) => {
      const dt = t - this.last;
      this.last = t;
      if (dt > 0 && dt < 1000) {
        const fps = 1000 / dt;
        this.samples.push(fps);
        this.onSample?.(fps);
      }
      if (this.running) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    return this.getStats();
  }

  getStats() {
    if (this.samples.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    return {
      avg,
      min: Math.min(...this.samples),
      max: Math.max(...this.samples),
      count: this.samples.length,
    };
  }
}

/* ===================== Extra device tests ===================== */

export type GpuInfo = {
  vendor: string;
  renderer: string;
  webgl2: boolean;
  maxTextureSize: number;
};

export function getGpuInfo(): GpuInfo | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      webgl2: !!canvas.getContext("webgl2"),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    };
  } catch {
    return null;
  }
}

/** WebGL triangle stress: returns fps drawing N triangles for ~1.2s */
export async function runGpuBenchmark(onProgress?: ProgressCallback): Promise<{ fps: number; triangles: number }> {
  onProgress?.("GPU WebGL", 0);
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
  if (!gl) return { fps: 0, triangles: 0 };

  const vsrc = `attribute vec2 p; uniform float t; void main(){ float a=p.x*6.28+t; gl_Position=vec4(cos(a)*p.y, sin(a)*p.y, 0.0, 1.0); }`;
  const fsrc = `precision mediump float; uniform float t; void main(){ gl_FragColor=vec4(fract(t),0.5,1.0-fract(t),1.0); }`;
  const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog); gl.useProgram(prog);

  const TRIS = 20_000;
  const data = new Float32Array(TRIS * 3 * 2);
  for (let i = 0; i < data.length; i += 2) { data[i] = Math.random(); data[i + 1] = Math.random(); }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tLoc = gl.getUniformLocation(prog, "t");

  const DURATION = 1200;
  return new Promise<{ fps: number; triangles: number }>((resolve) => {
    const start = performance.now();
    let frames = 0;
    const tick = () => {
      const e = performance.now() - start;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(tLoc, e * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, TRIS * 3);
      frames++;
      onProgress?.("GPU WebGL", Math.min(99, (e / DURATION) * 100));
      if (e < DURATION) requestAnimationFrame(tick);
      else { onProgress?.("GPU WebGL", 100); resolve({ fps: (frames * 1000) / e, triangles: TRIS }); }
    };
    requestAnimationFrame(tick);
  });
}

/** Network speed: downloads N bytes from a public CDN. Returns Mbps. */
export async function runNetworkBenchmark(onProgress?: ProgressCallback): Promise<{ mbps: number; latencyMs: number; bytes: number }> {
  onProgress?.("Network", 0);
  // Latency: small HEAD
  const t0 = performance.now();
  try { await fetch("https://www.gstatic.com/generate_204", { cache: "no-store" }); } catch { /* */ }
  const latencyMs = performance.now() - t0;
  onProgress?.("Network", 30);

  // Throughput: ~1 MB image
  const url = `https://speed.cloudflare.com/__down?bytes=1048576&_=${Date.now()}`;
  const start = performance.now();
  let bytes = 0;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const buf = await res.arrayBuffer();
    bytes = buf.byteLength;
  } catch {
    return { mbps: 0, latencyMs, bytes: 0 };
  }
  const secs = (performance.now() - start) / 1000;
  const mbps = (bytes * 8) / (1024 * 1024) / Math.max(0.001, secs);
  onProgress?.("Network", 100);
  return { mbps, latencyMs, bytes };
}

/** Storage I/O: writes & reads a 2 MB blob to localStorage + IndexedDB (where supported). Returns MB/s write. */
export async function runStorageBenchmark(onProgress?: ProgressCallback): Promise<{ writeMBs: number; readMBs: number }> {
  onProgress?.("Storage", 0);
  const SIZE = 512 * 1024; // 512 KB (localStorage caps near 5 MB)
  const payload = "x".repeat(SIZE);
  const key = "__bench_io__";

  const w0 = performance.now();
  for (let i = 0; i < 4; i++) {
    try { localStorage.setItem(key + i, payload); } catch { /* quota */ }
  }
  const writeSecs = (performance.now() - w0) / 1000;
  onProgress?.("Storage", 50);

  const r0 = performance.now();
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const v = localStorage.getItem(key + i);
    if (v) total += v.length;
  }
  const readSecs = (performance.now() - r0) / 1000;
  for (let i = 0; i < 4; i++) localStorage.removeItem(key + i);
  onProgress?.("Storage", 100);
  return {
    writeMBs: (SIZE * 4) / (1024 * 1024) / Math.max(0.001, writeSecs),
    readMBs: total / (1024 * 1024) / Math.max(0.001, readSecs),
  };
}

export function getBatteryInfo(): Promise<{ level: number; charging: boolean } | null> {
  const nav: any = navigator;
  if (!nav.getBattery) return Promise.resolve(null);
  return nav.getBattery().then((b: any) => ({ level: b.level, charging: b.charging })).catch(() => null);
}

/* ===================== Stress tests ===================== */

/** DOM stress: insert/remove N nodes; returns ms/1k ops. */
export async function runDomStress(nodes = 5000, onProgress?: ProgressCallback): Promise<{ insertMs: number; layoutMs: number }> {
  onProgress?.("DOM stress", 0);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;";
  document.body.appendChild(host);

  const t0 = performance.now();
  for (let i = 0; i < nodes; i++) {
    const d = document.createElement("div");
    d.textContent = "node " + i;
    host.appendChild(d);
  }
  const insertMs = performance.now() - t0;
  onProgress?.("DOM stress", 60);

  const t1 = performance.now();
  // Force layout reads
  let h = 0;
  for (let i = 0; i < host.children.length; i++) h += (host.children[i] as HTMLElement).offsetHeight;
  const layoutMs = performance.now() - t1;
  if (h < 0) console.log(h);
  document.body.removeChild(host);
  onProgress?.("DOM stress", 100);
  return { insertMs, layoutMs };
}

/** Particle stress: simulates N point particles via integer math; returns ops/sec. */
export async function runParticleStress(particles = 50_000, onProgress?: ProgressCallback): Promise<{ fps: number; particles: number }> {
  onProgress?.("Particles", 0);
  const xs = new Float32Array(particles);
  const ys = new Float32Array(particles);
  const vx = new Float32Array(particles);
  const vy = new Float32Array(particles);
  for (let i = 0; i < particles; i++) { vx[i] = Math.random() - 0.5; vy[i] = Math.random() - 0.5; }

  const DURATION = 1500;
  const start = performance.now();
  let frames = 0;
  return new Promise<{ fps: number; particles: number }>((resolve) => {
    const tick = () => {
      for (let i = 0; i < particles; i++) {
        xs[i] += vx[i]; ys[i] += vy[i];
        if (xs[i] > 100 || xs[i] < -100) vx[i] = -vx[i];
        if (ys[i] > 100 || ys[i] < -100) vy[i] = -vy[i];
      }
      frames++;
      const e = performance.now() - start;
      onProgress?.("Particles", Math.min(99, (e / DURATION) * 100));
      if (e < DURATION) requestAnimationFrame(tick);
      else { onProgress?.("Particles", 100); resolve({ fps: (frames * 1000) / e, particles }); }
    };
    requestAnimationFrame(tick);
  });
}

/* ===================== App metrics extras ===================== */

export type ResourceStat = { name: string; type: string; sizeKB: number; durationMs: number };

export function collectResourceStats(): { totalKB: number; jsKB: number; cssKB: number; imgKB: number; count: number; top: ResourceStat[] } {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let totalKB = 0, jsKB = 0, cssKB = 0, imgKB = 0;
  const items: ResourceStat[] = [];
  for (const r of entries) {
    const kb = (r.transferSize || r.encodedBodySize || 0) / 1024;
    totalKB += kb;
    if (r.initiatorType === "script") jsKB += kb;
    else if (r.initiatorType === "link" || r.initiatorType === "css") cssKB += kb;
    else if (r.initiatorType === "img") imgKB += kb;
    items.push({ name: r.name.split("/").pop() || r.name, type: r.initiatorType, sizeKB: kb, durationMs: r.duration });
  }
  const top = items.sort((a, b) => b.sizeKB - a.sizeKB).slice(0, 8);
  return { totalKB, jsKB, cssKB, imgKB, count: entries.length, top };
}

