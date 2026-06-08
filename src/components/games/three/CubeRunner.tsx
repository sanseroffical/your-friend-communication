import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

interface Obstacle { id: number; x: number; z: number; size: number; color: string; }

const COLORS = ["#ef4444", "#f97316", "#a855f7", "#06b6d4", "#10b981", "#ec4899"];
const LANE_LIMIT = 3.2;

function Player({ targetX, paused }: { targetX: number; paused: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current || paused) return;
    ref.current.position.x += (targetX - ref.current.position.x) * Math.min(1, dt * 12);
    ref.current.rotation.x += dt * 6;
    ref.current.rotation.y += dt * 4;
  });
  return (
    <mesh ref={ref} position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial color="#22d3ee" emissive="#0ea5e9" emissiveIntensity={0.6} metalness={0.4} roughness={0.3} />
    </mesh>
  );
}

function Ground({ scroll }: { scroll: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 200]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {Array.from({ length: 40 }).map((_, i) => {
        const z = ((i * 5 + scroll) % 200) - 100;
        return (
          <mesh key={i} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12, 0.05]} />
            <meshBasicMaterial color="#a855f7" />
          </mesh>
        );
      })}
    </group>
  );
}

function Obstacles({ items }: { items: Obstacle[] }) {
  return (
    <group>
      {items.map((o) => (
        <mesh key={o.id} position={[o.x, o.size / 2, o.z]} castShadow rotation={[0, o.z * 0.1, 0]}>
          <boxGeometry args={[o.size, o.size, o.size]} />
          <meshStandardMaterial color={o.color} emissive={o.color} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  useFrame(({ camera }) => {
    const target = new THREE.Vector3(0, 4.5, 7);
    camera.position.lerp(target, 0.1);
    camera.lookAt(0, 0.5, -2);
  });
  return null;
}

export default function CubeRunner({ onExit }: { onExit: () => void }) {
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [targetX, setTargetX] = useState(0);
  const [items, setItems] = useState<Obstacle[]>([]);
  const [scroll, setScroll] = useState(0);
  const startRef = useRef(performance.now());
  const lastSpawnRef = useRef(0);
  const idRef = useRef(0);
  const xRef = useRef(0);
  const { submitScore } = useGameScores("cube_runner");

  const restart = useCallback(() => {
    setItems([]); setScore(0); setTargetX(0); xRef.current = 0;
    setGameOver(false); setPaused(false); setScroll(0);
    startRef.current = performance.now();
    lastSpawnRef.current = 0;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaused((p) => !p);
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        xRef.current = Math.max(-LANE_LIMIT, xRef.current - 1.2); setTargetX(xRef.current);
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        xRef.current = Math.min(LANE_LIMIT, xRef.current + 1.2); setTargetX(xRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (paused || gameOver) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - startRef.current) / 1000;
      const speed = 8 + Math.min(18, elapsed * 0.4);

      setScroll((s) => (s + speed * dt) % 200);

      setItems((prev) => {
        const moved = prev
          .map((o) => ({ ...o, z: o.z + speed * dt }))
          .filter((o) => o.z < 10);

        // spawn
        if (now - lastSpawnRef.current > Math.max(180, 600 - elapsed * 6)) {
          lastSpawnRef.current = now;
          const x = (Math.random() * 2 - 1) * LANE_LIMIT;
          const size = 0.7 + Math.random() * 0.6;
          moved.push({
            id: idRef.current++, x, z: -90, size,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
          });
        }

        // collision
        for (const o of moved) {
          if (o.z > -1.2 && o.z < 1.2 && Math.abs(o.x - xRef.current) < 0.5 + o.size / 2) {
            setGameOver(true);
            const finalScore = Math.floor(elapsed * 10);
            submitScore(finalScore, elapsed).catch(() => {});
            toast.success(`Game over! Score: ${finalScore}`);
            break;
          }
        }
        return moved;
      });

      setScore(Math.floor(elapsed * 10));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, gameOver, submitScore]);

  return (
    <GameShell
      title="Cube Runner"
      gameType="cube_runner"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={<div className="text-sm font-mono text-primary px-1">Score {score}</div>}
    >
      <Canvas shadows camera={{ position: [0, 5, 8], fov: 55 }}>
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 12, 70]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[6, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <Suspense fallback={null}>
          <Stars radius={80} depth={40} count={1500} factor={3} fade speed={1} />
          <Ground scroll={scroll} />
          <Player targetX={targetX} paused={paused || gameOver} />
          <Obstacles items={items} />
        </Suspense>
        <CameraRig />
      </Canvas>

      {gameOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center max-w-xs">
            <div className="text-2xl font-bold mb-1">Crash!</div>
            <div className="text-sm text-muted-foreground mb-4">Final score: <span className="text-primary font-mono">{score}</span></div>
            <div className="flex gap-2">
              <button onClick={restart} className="flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">Retry</button>
              <button onClick={onExit} className="flex-1 px-3 py-2 rounded-md bg-muted text-sm">Exit</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 glass rounded-xl px-3 py-2 text-xs text-muted-foreground pointer-events-none">
        ← / A · → / D · Esc to pause
      </div>
    </GameShell>
  );
}
