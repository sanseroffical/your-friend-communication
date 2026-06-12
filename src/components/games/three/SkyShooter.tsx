import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Cloud } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

interface Enemy { id: number; x: number; y: number; z: number; hp: number; }
interface Bullet { id: number; x: number; y: number; z: number; }

const BOUND_X = 6;
const BOUND_Y = 3.5;

function Ship({ pos, paused }: { pos: { x: number; y: number }; paused: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current || paused) return;
    ref.current.position.x += (pos.x - ref.current.position.x) * Math.min(1, dt * 14);
    ref.current.position.y += (pos.y - ref.current.position.y) * Math.min(1, dt * 14);
    ref.current.rotation.z = -(pos.x - ref.current.position.x) * 0.4;
  });
  return (
    <group ref={ref} position={[0, 0, 4]}>
      <mesh castShadow>
        <coneGeometry args={[0.35, 1.1, 12]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0ea5e9" emissiveIntensity={0.7} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.1, 0.4]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.1, 1.4, 0.2]} />
        <meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Enemies({ items }: { items: Enemy[] }) {
  return (
    <group>
      {items.map((e) => (
        <mesh key={e.id} position={[e.x, e.y, e.z]} rotation={[e.z * 0.1, e.z * 0.2, 0]} castShadow>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Bullets({ items }: { items: Bullet[] }) {
  return (
    <group>
      {items.map((b) => (
        <mesh key={b.id} position={[b.x, b.y, b.z]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function SkyShooter({ onExit }: { onExit: () => void }) {
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const posRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<Record<string, boolean>>({});
  const startRef = useRef(performance.now());
  const lastSpawnRef = useRef(0);
  const lastShotRef = useRef(0);
  const idRef = useRef(0);
  const { submitScore } = useGameScores("sky_shooter");

  const restart = useCallback(() => {
    setEnemies([]); setBullets([]); setScore(0); setLives(3);
    setPos({ x: 0, y: 0 }); posRef.current = { x: 0, y: 0 };
    setGameOver(false); setPaused(false);
    startRef.current = performance.now();
    lastSpawnRef.current = 0; lastShotRef.current = 0;
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaused((p) => !p);
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (paused || gameOver) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - startRef.current) / 1000;
      const k = keysRef.current;

      // movement
      const sp = 6;
      let nx = posRef.current.x, ny = posRef.current.y;
      if (k["arrowleft"] || k["a"]) nx -= sp * dt;
      if (k["arrowright"] || k["d"]) nx += sp * dt;
      if (k["arrowup"] || k["w"]) ny += sp * dt;
      if (k["arrowdown"] || k["s"]) ny -= sp * dt;
      nx = Math.max(-BOUND_X, Math.min(BOUND_X, nx));
      ny = Math.max(-BOUND_Y, Math.min(BOUND_Y, ny));
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });

      // shoot
      if ((k[" "] || k["space"]) && now - lastShotRef.current > 160) {
        lastShotRef.current = now;
        setBullets((prev) => [...prev, { id: idRef.current++, x: nx, y: ny, z: 3 }]);
      }

      // bullets move
      setBullets((prev) =>
        prev.map((b) => ({ ...b, z: b.z - 22 * dt })).filter((b) => b.z > -40)
      );

      // spawn
      if (now - lastSpawnRef.current > Math.max(280, 900 - elapsed * 10)) {
        lastSpawnRef.current = now;
        setEnemies((prev) => [
          ...prev,
          {
            id: idRef.current++,
            x: (Math.random() * 2 - 1) * BOUND_X,
            y: (Math.random() * 2 - 1) * BOUND_Y,
            z: -40,
            hp: 1,
          },
        ]);
      }

      // enemies move + collisions
      setEnemies((prevE) => {
        const speed = 6 + Math.min(10, elapsed * 0.3);
        let next = prevE.map((e) => ({ ...e, z: e.z + speed * dt }));

        // bullet hits
        setBullets((prevB) => {
          const remainingBullets: Bullet[] = [];
          for (const b of prevB) {
            let hit = false;
            for (const e of next) {
              if (e.hp > 0 && Math.abs(b.z - e.z) < 0.6 && Math.abs(b.x - e.x) < 0.6 && Math.abs(b.y - e.y) < 0.6) {
                e.hp = 0;
                hit = true;
                setScore((s) => s + 10);
                break;
              }
            }
            if (!hit) remainingBullets.push(b);
          }
          return remainingBullets;
        });

        // ship collisions
        for (const e of next) {
          if (e.hp > 0 && Math.abs(e.z - 4) < 0.7 && Math.abs(e.x - posRef.current.x) < 0.7 && Math.abs(e.y - posRef.current.y) < 0.7) {
            e.hp = 0;
            setLives((l) => {
              const nv = l - 1;
              if (nv <= 0) {
                setGameOver(true);
                const final = score;
                submitScore(final, elapsed).catch(() => {});
                toast.error(`Down! Final score: ${final}`);
              } else {
                toast.warning(`Hit! ${nv} lives left`);
              }
              return nv;
            });
          }
        }

        return next.filter((e) => e.hp > 0 && e.z < 8);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, gameOver, submitScore, score]);

  return (
    <GameShell
      title="Sky Shooter"
      gameType="sky_shooter"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={
        <div className="text-sm font-mono text-primary px-1 flex items-center gap-3">
          <span>Score {score}</span>
          <span className="text-red-400">♥ {lives}</span>
        </div>
      }
    >
      <Canvas shadows camera={{ position: [0, 0.5, 8.5], fov: 60 }}>
        <color attach="background" args={["#0b1026"]} />
        <fog attach="fog" args={["#0b1026", 18, 48]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[6, 8, 4]} intensity={1.1} castShadow />
        <Suspense fallback={null}>
          <Stars radius={120} depth={60} count={2200} factor={4} fade speed={1} />
          <Cloud position={[-6, 2, -10]} speed={0.2} opacity={0.35} />
          <Cloud position={[6, -2, -18]} speed={0.2} opacity={0.3} />
          <Ship pos={pos} paused={paused || gameOver} />
          <Enemies items={enemies} />
          <Bullets items={bullets} />
        </Suspense>
      </Canvas>

      {gameOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center max-w-xs">
            <div className="text-2xl font-bold mb-1">Shot down!</div>
            <div className="text-sm text-muted-foreground mb-4">
              Final score: <span className="text-primary font-mono">{score}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={restart} className="flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">Retry</button>
              <button onClick={onExit} className="flex-1 px-3 py-2 rounded-md bg-muted text-sm">Exit</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 glass rounded-xl px-3 py-2 text-xs text-muted-foreground pointer-events-none">
        WASD/Arrows to fly · Space to shoot · Esc to pause
      </div>
    </GameShell>
  );
}
