import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sky } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

interface Ring { id: number; x: number; y: number; z: number; hue: number; }
interface Cloud { id: number; x: number; y: number; z: number; s: number; }

const X_LIMIT = 6;
const Y_LIMIT_HI = 6;
const Y_LIMIT_LO = 0.6;

function Board({ tx, ty, paused }: { tx: number; ty: number; paused: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!ref.current || paused) return;
    ref.current.position.x += (tx - ref.current.position.x) * Math.min(1, dt * 10);
    ref.current.position.y += (ty - ref.current.position.y) * Math.min(1, dt * 10);
    ref.current.rotation.z = -(tx - ref.current.position.x) * 0.15;
    ref.current.rotation.x = 0.05 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
  });
  return (
    <group ref={ref} position={[0, 2.2, 0]}>
      {/* board */}
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.12, 0.6]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* rider silhouette */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.18, 0.55, 6, 10]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.6} />
      </mesh>
      {/* trail */}
      <mesh position={[0, 0, 1.4]}>
        <coneGeometry args={[0.2, 2.4, 12]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Rings({ items, scroll }: { items: Ring[]; scroll: number }) {
  return (
    <group>
      {items.map((r) => (
        <mesh key={r.id} position={[r.x, r.y, r.z + scroll]} rotation={[0, 0, 0]}>
          <torusGeometry args={[1.1, 0.12, 12, 32]} />
          <meshStandardMaterial
            color={`hsl(${r.hue}, 90%, 60%)`}
            emissive={`hsl(${r.hue}, 90%, 55%)`}
            emissiveIntensity={0.9}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Clouds({ items, scroll }: { items: Cloud[]; scroll: number }) {
  return (
    <group>
      {items.map((c) => (
        <mesh key={c.id} position={[c.x, c.y, c.z + scroll]}>
          <sphereGeometry args={[c.s, 10, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  useFrame(({ camera }) => {
    const t = new THREE.Vector3(0, 3.2, 6);
    camera.position.lerp(t, 0.1);
    camera.lookAt(0, 2.4, -3);
  });
  return null;
}

export default function SkySurfer({ onExit }: { onExit: () => void }) {
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(2.2);
  const [rings, setRings] = useState<Ring[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [scroll, setScroll] = useState(0);
  const start = useRef(performance.now());
  const idRef = useRef(1);
  const targetRef = useRef({ x: 0, y: 2.2 });
  const { submitScore } = useGameScores("sky_surfer");

  const restart = useCallback(() => {
    setRings([]); setClouds([]); setScore(0); setCombo(0);
    setTx(0); setTy(2.2); targetRef.current = { x: 0, y: 2.2 };
    setGameOver(false); setPaused(false); setScroll(0);
    start.current = performance.now();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaused((p) => !p);
      const step = 1.1;
      if (e.key === "ArrowLeft" || e.key === "a") targetRef.current.x = Math.max(-X_LIMIT, targetRef.current.x - step);
      if (e.key === "ArrowRight" || e.key === "d") targetRef.current.x = Math.min(X_LIMIT, targetRef.current.x + step);
      if (e.key === "ArrowUp" || e.key === "w") targetRef.current.y = Math.min(Y_LIMIT_HI, targetRef.current.y + step);
      if (e.key === "ArrowDown" || e.key === "s") targetRef.current.y = Math.max(Y_LIMIT_LO, targetRef.current.y - step);
      setTx(targetRef.current.x); setTy(targetRef.current.y);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (paused || gameOver) return;
    let raf = 0; let last = performance.now();
    let ringSpawn = 0; let cloudSpawn = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const elapsed = (now - start.current) / 1000;
      const speed = 14 + Math.min(24, elapsed * 0.5);
      setScroll((s) => s + speed * dt);

      // spawn rings
      if (now - ringSpawn > Math.max(220, 700 - elapsed * 8)) {
        ringSpawn = now;
        setRings((prev) => [
          ...prev,
          {
            id: idRef.current++,
            x: (Math.random() * 2 - 1) * X_LIMIT * 0.85,
            y: Y_LIMIT_LO + Math.random() * (Y_LIMIT_HI - Y_LIMIT_LO),
            z: -80 - scroll,
            hue: Math.floor(Math.random() * 360),
          },
        ]);
      }
      if (now - cloudSpawn > 240) {
        cloudSpawn = now;
        setClouds((prev) => [
          ...prev,
          {
            id: idRef.current++,
            x: (Math.random() * 2 - 1) * 14,
            y: 1 + Math.random() * 8,
            z: -90 - scroll,
            s: 1.5 + Math.random() * 2.5,
          },
        ]);
      }

      // collision / passing
      setRings((prev) => {
        const kept: Ring[] = [];
        let scoredThisFrame = 0;
        for (const r of prev) {
          const wz = r.z + scroll;
          if (wz > 4) continue; // gone
          if (wz > -0.6 && wz < 0.6) {
            const dx = r.x - targetRef.current.x;
            const dy = r.y - targetRef.current.y;
            if (Math.sqrt(dx * dx + dy * dy) < 1.1) {
              scoredThisFrame += 10;
              continue;
            }
          }
          kept.push(r);
        }
        if (scoredThisFrame > 0) {
          setCombo((c) => c + 1);
          setScore((s) => s + scoredThisFrame + Math.floor(combo * 2));
        }
        return kept;
      });
      setClouds((prev) => prev.filter((c) => c.z + scroll < 4));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, gameOver, scroll, combo]);

  // End game after 90s
  useEffect(() => {
    if (paused || gameOver) return;
    const t = setTimeout(() => {
      setGameOver(true);
      const elapsed = (performance.now() - start.current) / 1000;
      submitScore(score, elapsed).catch(() => {});
      toast.success(`Time's up! Score: ${score}`);
    }, 90_000);
    return () => clearTimeout(t);
  }, [paused, gameOver, score, submitScore]);

  return (
    <GameShell
      title="Sky Surfer"
      gameType="sky_surfer"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={
        <div className="text-sm font-mono text-primary px-1">
          Score {score} <span className="text-muted-foreground ml-2">×{combo}</span>
        </div>
      }
    >
      <Canvas shadows camera={{ position: [0, 3, 8], fov: 60 }}>
        <color attach="background" args={["#0b1224"]} />
        <fog attach="fog" args={["#152036", 20, 90]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 12, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <Suspense fallback={null}>
          <Sky sunPosition={[100, 20, 100]} turbidity={4} rayleigh={2} />
          <Stars radius={80} depth={40} count={800} factor={3} fade speed={0.5} />
          <Board tx={tx} ty={ty} paused={paused || gameOver} />
          <Rings items={rings} scroll={scroll} />
          <Clouds items={clouds} scroll={scroll} />
        </Suspense>
        <CameraRig />
      </Canvas>

      {gameOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center max-w-xs">
            <div className="text-2xl font-bold mb-1">Ride Over</div>
            <div className="text-sm text-muted-foreground mb-4">
              Score: <span className="text-primary font-mono">{score}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={restart} className="flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">Ride again</button>
              <button onClick={onExit} className="flex-1 px-3 py-2 rounded-md bg-muted text-sm">Exit</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 glass rounded-xl px-3 py-2 text-xs text-muted-foreground pointer-events-none">
        Arrows / WASD to steer · fly through neon rings · 90s to score high
      </div>
    </GameShell>
  );
}
