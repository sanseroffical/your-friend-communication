import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Cpu, Gauge, HardDrive, Loader2, Play, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  collectWebVitals,
  runDeviceBenchmark,
  subscribeWebVitals,
  type DeviceBenchmarkResult,
  type WebVitals,
  FpsSampler,
} from "@/lib/benchmark";

const GAMES = [
  { id: "tower", name: "Tower Stacker 3D" },
  { id: "asteroid", name: "Asteroid Gunner" },
  { id: "racer", name: "Neon Racer" },
  { id: "parkour", name: "Plaza Parkour" },
  { id: "runner", name: "Cube Runner" },
  { id: "arena", name: "Plaza Arena" },
];

function rating(total: number) {
  if (total >= 8000) return { label: "Beast Mode", color: "text-yellow-400" };
  if (total >= 6000) return { label: "Excellent", color: "text-green-400" };
  if (total >= 4000) return { label: "Solid", color: "text-blue-400" };
  if (total >= 2000) return { label: "Average", color: "text-orange-400" };
  return { label: "Potato", color: "text-red-400" };
}

function vitalRating(metric: "lcp" | "fcp" | "cls" | "inp", value: number | undefined) {
  if (value === undefined) return { label: "—", color: "text-muted-foreground" };
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    fcp: [1800, 3000],
    cls: [0.1, 0.25],
    inp: [200, 500],
  };
  const [good, poor] = thresholds[metric];
  if (value <= good) return { label: "Good", color: "text-green-400" };
  if (value <= poor) return { label: "Needs Work", color: "text-orange-400" };
  return { label: "Poor", color: "text-red-400" };
}

/* --- Device Tab --- */
function DeviceTab() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ stage: "Idle", pct: 0 });
  const [result, setResult] = useState<DeviceBenchmarkResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await runDeviceBenchmark((stage, pct) => setProgress({ stage, pct }));
      setResult(r);
    } catch (e) {
      toast.error("Benchmark failed");
      console.error(e);
    } finally {
      setRunning(false);
      setProgress({ stage: "Done", pct: 100 });
    }
  };

  const submit = async () => {
    if (!result) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to submit your score");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("benchmark_results").insert({
      user_id: user.id,
      benchmark_type: "device",
      score: result.totalScore,
      cpu_score: result.cpuScore,
      render_score: result.renderScore,
      memory_score: result.memoryScore,
      user_agent: result.userAgent,
      details: {
        cpuOpsPerSec: result.cpuOpsPerSec,
        renderFps: result.renderFps,
        memoryMBPerSec: result.memoryMBPerSec,
      },
    });
    setSubmitting(false);
    if (error) toast.error("Could not submit: " + error.message);
    else toast.success("Score submitted to leaderboard!");
  };

  const r = result ? rating(result.totalScore) : null;

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Device Performance Benchmark</CardTitle>
          <CardDescription>Runs a CPU loop, render loop, and memory allocator. Takes ~5 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {running && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progress.stage}</span>
                <span className="font-mono">{Math.round(progress.pct)}%</span>
              </div>
              <Progress value={progress.pct} />
            </div>
          )}

          {result && r && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                <p className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {result.totalScore.toLocaleString()}
                </p>
                <p className={`text-lg font-semibold ${r.color}`}>{r.label}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Metric icon={<Cpu className="h-4 w-4" />} label="CPU" value={result.cpuScore} hint={`${(result.cpuOpsPerSec / 1_000_000).toFixed(1)}M ops/s`} />
                <Metric icon={<Gauge className="h-4 w-4" />} label="Render" value={result.renderScore} hint={`${result.renderFps.toFixed(0)} FPS`} />
                <Metric icon={<HardDrive className="h-4 w-4" />} label="Memory" value={result.memoryScore} hint={`${result.memoryMBPerSec.toFixed(0)} MB/s`} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={run} disabled={running} className="flex-1">
              {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</> : <><Play className="h-4 w-4 mr-2" /> {result ? "Run Again" : "Start Benchmark"}</>}
            </Button>
            {result && (
              <Button onClick={submit} disabled={submitting} variant="secondary">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trophy className="h-4 w-4 mr-2" /> Submit</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DeviceLeaderboard />
    </div>
  );
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border bg-card/50 p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function DeviceLeaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("benchmark_results")
        .select("score, cpu_score, render_score, memory_score, user_id, created_at")
        .eq("benchmark_type", "device")
        .order("score", { ascending: false })
        .limit(10);
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] as any[] };
      const nameById = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
      setRows((data || []).map((r: any) => ({ ...r, display_name: nameById.get(r.user_id) })));
    })();
  }, []);
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4" /> Device Leaderboard — Top 10</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No submissions yet. Be first!</p>
        ) : (
          <div className="space-y-1">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs w-5 text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm truncate">{row.display_name || "Anonymous"}</span>
                </div>
                <span className="font-mono text-sm font-semibold">{row.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --- App Metrics Tab --- */
function AppMetricsTab() {
  const [vitals, setVitals] = useState<WebVitals>(() => collectWebVitals());

  useEffect(() => {
    const unsub = subscribeWebVitals((v) => setVitals((prev) => ({ ...prev, ...v })));
    const interval = setInterval(() => setVitals((prev) => ({ ...prev, ...collectWebVitals() })), 2000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const fmtMs = (n?: number) => (n === undefined ? "—" : `${n.toFixed(0)} ms`);
  const fmtCls = (n?: number) => (n === undefined ? "—" : n.toFixed(3));

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> App Performance Metrics</CardTitle>
        <CardDescription>Live Web Vitals captured from this browser session. Updates as you interact.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <VitalCard label="LCP" value={fmtMs(vitals.lcp)} rating={vitalRating("lcp", vitals.lcp)} desc="Largest Contentful Paint" />
          <VitalCard label="FCP" value={fmtMs(vitals.fcp)} rating={vitalRating("fcp", vitals.fcp)} desc="First Contentful Paint" />
          <VitalCard label="CLS" value={fmtCls(vitals.cls)} rating={vitalRating("cls", vitals.cls)} desc="Cumulative Layout Shift" />
          <VitalCard label="INP" value={fmtMs(vitals.inp)} rating={vitalRating("inp", vitals.inp)} desc="Interaction to Next Paint" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t">
          <SimpleStat label="TTFB" value={fmtMs(vitals.ttfb)} />
          <SimpleStat label="DOM Nodes" value={vitals.domNodes.toLocaleString()} />
          <SimpleStat
            label="JS Heap"
            value={vitals.jsHeapUsedMB !== undefined ? `${vitals.jsHeapUsedMB.toFixed(1)} MB` : "—"}
            hint={vitals.jsHeapLimitMB ? `of ${vitals.jsHeapLimitMB.toFixed(0)} MB` : undefined}
          />
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          Tip: click around the app then return here — interactions feed live INP samples.
        </p>
      </CardContent>
    </Card>
  );
}

function VitalCard({ label, value, rating, desc }: { label: string; value: string; rating: { label: string; color: string }; desc: string }) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold">{label}</span>
        <Badge variant="outline" className={`text-[10px] h-5 ${rating.color}`}>{rating.label}</Badge>
      </div>
      <p className="text-xl font-bold font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function SimpleStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* --- Game FPS Tab --- */
function GameFpsTab() {
  const [selectedGame, setSelectedGame] = useState(GAMES[0].id);
  const [running, setRunning] = useState(false);
  const [liveFps, setLiveFps] = useState(0);
  const [stats, setStats] = useState<{ avg: number; min: number; max: number } | null>(null);
  const samplerRef = useRef<FpsSampler | null>(null);
  const timerRef = useRef<number | null>(null);

  const start = () => {
    setStats(null);
    setRunning(true);
    const sampler = new FpsSampler();
    sampler.onSample = (fps) => setLiveFps(fps);
    sampler.start();
    samplerRef.current = sampler;
    timerRef.current = window.setTimeout(() => stop(), 10_000);
  };

  const stop = async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const sampler = samplerRef.current;
    if (!sampler) return;
    const s = sampler.stop();
    samplerRef.current = null;
    setRunning(false);
    setStats(s);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && s.count > 0) {
      const { error } = await supabase.from("benchmark_results").insert({
        user_id: user.id,
        benchmark_type: "game_fps",
        game_id: selectedGame,
        score: Math.round(s.avg),
        avg_fps: Number(s.avg.toFixed(2)),
        min_fps: Number(s.min.toFixed(2)),
        max_fps: Number(s.max.toFixed(2)),
        user_agent: navigator.userAgent,
      });
      if (!error) toast.success("FPS sample submitted to leaderboard!");
    }
  };

  useEffect(() => () => { samplerRef.current?.stop(); if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Game FPS Benchmark</CardTitle>
          <CardDescription>
            Pick a game, open it in another tab, then run this 10-second sampler while it's playing.
            Or run it here as a baseline rAF FPS test for your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {GAMES.map((g) => (
              <Button
                key={g.id}
                size="sm"
                variant={selectedGame === g.id ? "default" : "outline"}
                onClick={() => setSelectedGame(g.id)}
                disabled={running}
              >
                {g.name}
              </Button>
            ))}
          </div>

          {running && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Sampling FPS… (10s)</p>
              <p className="text-5xl font-bold font-mono mt-2">{liveFps.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">live frame rate</p>
            </div>
          )}

          {stats && !running && (
            <div className="grid grid-cols-3 gap-3">
              <Metric icon={<Gauge className="h-4 w-4" />} label="Average" value={Math.round(stats.avg)} hint="FPS" />
              <Metric icon={<Gauge className="h-4 w-4" />} label="Min" value={Math.round(stats.min)} hint="FPS" />
              <Metric icon={<Gauge className="h-4 w-4" />} label="Max" value={Math.round(stats.max)} hint="FPS" />
            </div>
          )}

          <Button onClick={running ? stop : start} className="w-full">
            {running ? "Stop Sampling" : <><Play className="h-4 w-4 mr-2" /> Start 10s FPS Sample</>}
          </Button>
        </CardContent>
      </Card>

      <GameFpsLeaderboard gameId={selectedGame} />
    </div>
  );
}

function GameFpsLeaderboard({ gameId }: { gameId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("benchmark_results")
        .select("avg_fps, min_fps, max_fps, user_id, created_at")
        .eq("benchmark_type", "game_fps")
        .eq("game_id", gameId)
        .order("avg_fps", { ascending: false })
        .limit(10);
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] as any[] };
      const nameById = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
      setRows((data || []).map((r: any) => ({ ...r, display_name: nameById.get(r.user_id) })));
    })();
  }, [gameId]);

  const game = useMemo(() => GAMES.find((g) => g.id === gameId), [gameId]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" /> {game?.name} — Top 10 by Avg FPS
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No samples yet for this game.</p>
        ) : (
          <div className="space-y-1">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs w-5 text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm truncate">{row.profiles?.display_name || "Anonymous"}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold">{Number(row.avg_fps).toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {Number(row.min_fps).toFixed(0)}–{Number(row.max_fps).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --- Page --- */
export default function Benchmark() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> Benchmark Lab</Badge>
        </div>

        <header className="mb-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Benchmark Lab
          </h1>
          <p className="text-muted-foreground">Score your device, inspect app performance, and compete on the FPS leaderboards.</p>
        </header>

        <Tabs defaultValue="device" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="device"><Cpu className="h-4 w-4 mr-1.5" />Device</TabsTrigger>
            <TabsTrigger value="app"><Activity className="h-4 w-4 mr-1.5" />App Metrics</TabsTrigger>
            <TabsTrigger value="fps"><Zap className="h-4 w-4 mr-1.5" />Game FPS</TabsTrigger>
          </TabsList>
          <TabsContent value="device" className="mt-4"><DeviceTab /></TabsContent>
          <TabsContent value="app" className="mt-4"><AppMetricsTab /></TabsContent>
          <TabsContent value="fps" className="mt-4"><GameFpsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
