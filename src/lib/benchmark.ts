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
