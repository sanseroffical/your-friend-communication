import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Box, Gamepad2, Rocket, Swords, TrendingUp, Trophy } from "lucide-react";

const TowerStacker = lazy(() => import("@/components/games/three/TowerStacker"));
const AsteroidGunner = lazy(() => import("@/components/games/three/AsteroidGunner"));
const NeonRacer = lazy(() => import("@/components/games/three/NeonRacer"));
const PlazaParkour = lazy(() => import("@/components/games/three/PlazaParkour"));
const PlazaArena = lazy(() => import("@/components/games/three/PlazaArena"));

type GameId = "tower" | "asteroid" | "racer" | "parkour" | "arena" | null;

const GAMES: { id: Exclude<GameId, null>; title: string; desc: string; icon: any; gradient: string; tag: string }[] = [
  { id: "tower", title: "Tower Stacker 3D", desc: "Stack blocks higher and higher. One slip and it's over.", icon: TrendingUp, gradient: "from-purple-500/30 to-pink-500/30", tag: "Single-player" },
  { id: "asteroid", title: "Asteroid Gunner", desc: "6DOF space shooter. Survive endless waves.", icon: Rocket, gradient: "from-blue-500/30 to-cyan-500/30", tag: "Single-player" },
  { id: "racer", title: "Neon Racer", desc: "3-lap time trial on a glowing neon circuit.", icon: Gamepad2, gradient: "from-pink-500/30 to-orange-500/30", tag: "Single-player" },
  { id: "parkour", title: "Plaza Parkour", desc: "First-person platforming. Reach the gold goal.", icon: Box, gradient: "from-emerald-500/30 to-cyan-500/30", tag: "Single-player" },
  { id: "arena", title: "Plaza Arena", desc: "Real-time multiplayer deathmatch. Up to 8 players.", icon: Swords, gradient: "from-red-500/30 to-purple-500/30", tag: "Multiplayer" },
];

export default function Games() {
  const navigate = useNavigate();
  const [active, setActive] = useState<GameId>(null);

  if (active === "tower") return <Suspense fallback={<Loader />}><TowerStacker onExit={() => setActive(null)} /></Suspense>;
  if (active === "asteroid") return <Suspense fallback={<Loader />}><AsteroidGunner onExit={() => setActive(null)} /></Suspense>;
  if (active === "racer") return <Suspense fallback={<Loader />}><NeonRacer onExit={() => setActive(null)} /></Suspense>;
  if (active === "parkour") return <Suspense fallback={<Loader />}><PlazaParkour onExit={() => setActive(null)} /></Suspense>;
  if (active === "arena") return <Suspense fallback={<Loader />}><PlazaArena onExit={() => setActive(null)} /></Suspense>;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Scores saved to your profile</span>
          </div>
        </div>

        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            3D Games Arcade
          </h1>
          <p className="text-muted-foreground">Five hand-crafted 3D experiences. Compete on the global leaderboards.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => {
            const Icon = g.icon;
            return (
              <Card
                key={g.id}
                onClick={() => setActive(g.id)}
                className={`glass cursor-pointer group relative overflow-hidden p-6 hover:scale-[1.02] transition-transform border-primary/20`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient} opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-primary/20 text-primary">{g.tag}</span>
                  </div>
                  <h2 className="text-xl font-bold mb-1">{g.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{g.desc}</p>
                  <Button size="sm" className="w-full">Play</Button>
                </div>
              </Card>
            );
          })}
        </div>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Built with React Three Fiber · Tip: press <kbd className="px-1 rounded bg-muted">Esc</kbd> to pause
        </footer>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm text-muted-foreground">Loading game…</div>
      </div>
    </div>
  );
}
