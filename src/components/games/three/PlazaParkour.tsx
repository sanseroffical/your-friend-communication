import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

interface Platform { pos: [number, number, number]; size: [number, number, number]; color: string; moving?: { axis: "x" | "z"; amp: number; speed: number }; checkpoint?: boolean; goal?: boolean; }

const PLATFORMS: Platform[] = [
  { pos: [0, 0, 0], size: [6, 0.5, 6], color: "#8b5cf6" },
  { pos: [0, 0.5, -6], size: [3, 0.5, 3], color: "#6366f1" },
  { pos: [4, 1, -10], size: [2, 0.5, 2], color: "#6366f1" },
  { pos: [8, 2, -14], size: [2, 0.5, 2], color: "#06b6d4", moving: { axis: "z", amp: 3, speed: 1.2 } },
  { pos: [12, 3, -10], size: [2, 0.5, 2], color: "#10b981", checkpoint: true },
  { pos: [16, 4, -6], size: [2, 0.5, 2], color: "#06b6d4", moving: { axis: "x", amp: 3, speed: 1.5 } },
  { pos: [20, 5, -2], size: [3, 0.5, 3], color: "#6366f1" },
  { pos: [22, 6, 4], size: [2, 0.5, 2], color: "#06b6d4", moving: { axis: "z", amp: 4, speed: 2 } },
  { pos: [22, 7, 10], size: [4, 0.5, 4], color: "#fde047", goal: true },
];

const keys = { f: false, b: false, l: false, r: false, jump: false };

function Player({ velRef, posRef, onFall, onCheckpoint, onGoal, paused, respawn }: {
  velRef: React.MutableRefObject<THREE.Vector3>;
  posRef: React.MutableRefObject<THREE.Vector3>;
  onFall: () => void; onCheckpoint: () => void; onGoal: () => void;
  paused: boolean;
  respawn: React.MutableRefObject<THREE.Vector3>;
}) {
  const groundedRef = useRef(false);
  const movingPlatforms = useMemo(() =>
    PLATFORMS.map((p, i) => ({ ...p, idx: i, origin: [...p.pos] as [number, number, number] })), []);
  const platStates = useRef(movingPlatforms.map(() => ({ x: 0, z: 0 })));

  useFrame(({ camera }, dt) => {
    if (paused) return;
    dt = Math.min(dt, 0.05);

    // Update moving platforms
    const t = performance.now() / 1000;
    movingPlatforms.forEach((p, i) => {
      if (p.moving) {
        const off = Math.sin(t * p.moving.speed) * p.moving.amp;
        if (p.moving.axis === "x") { platStates.current[i].x = off; platStates.current[i].z = 0; }
        else { platStates.current[i].z = off; platStates.current[i].x = 0; }
      }
    });

    // Movement
    const speed = 6;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (keys.f) move.add(fwd);
    if (keys.b) move.sub(fwd);
    if (keys.r) move.add(right);
    if (keys.l) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

    velRef.current.x = move.x;
    velRef.current.z = move.z;
    velRef.current.y -= 22 * dt;

    if (keys.jump && groundedRef.current) {
      velRef.current.y = 9;
      groundedRef.current = false;
    }

    posRef.current.addScaledVector(velRef.current, dt);

    // Ground checks
    groundedRef.current = false;
    for (let i = 0; i < movingPlatforms.length; i++) {
      const p = movingPlatforms[i];
      const ox = p.origin[0] + platStates.current[i].x;
      const oz = p.origin[2] + platStates.current[i].z;
      const top = p.origin[1] + p.size[1] / 2;
      const sx = p.size[0] / 2, sz = p.size[2] / 2;
      const px = posRef.current.x, pz = posRef.current.z, py = posRef.current.y;
      if (px > ox - sx && px < ox + sx && pz > oz - sz && pz < oz + sz) {
        if (py - 1.5 <= top && py - 1.5 >= top - 0.5 && velRef.current.y <= 0) {
          posRef.current.y = top + 1.5;
          velRef.current.y = 0;
          groundedRef.current = true;
          if (p.checkpoint) { respawn.current.copy(posRef.current); onCheckpoint(); }
          if (p.goal) onGoal();
          // Carry on moving platform
          if (p.moving) {
            // already factored in via platform offset; not perfectly sticky but OK
          }
        }
      }
    }

    // Fall off
    if (posRef.current.y < -15) {
      onFall();
      posRef.current.copy(respawn.current);
      velRef.current.set(0, 0, 0);
    }

    camera.position.copy(posRef.current);
  });

  return (
    <>
      {movingPlatforms.map((p, i) => (
        <mesh
          key={i}
          position={[p.origin[0] + platStates.current[i]?.x || 0, p.origin[1], p.origin[2] + platStates.current[i]?.z || 0]}
          castShadow receiveShadow
        >
          <boxGeometry args={p.size} />
          <meshStandardMaterial
            color={p.color}
            emissive={p.color}
            emissiveIntensity={p.goal ? 0.6 : p.checkpoint ? 0.4 : 0.1}
          />
        </mesh>
      ))}
    </>
  );
}

function MovingPlatformsVisual() { return null; }

export default function PlazaParkour({ onExit }: { onExit: () => void }) {
  const velRef = useRef(new THREE.Vector3(0, 0, 0));
  const posRef = useRef(new THREE.Vector3(0, 2, 0));
  const respawn = useRef(new THREE.Vector3(0, 2, 0));
  const [paused, setPaused] = useState(true);
  const [falls, setFalls] = useState(0);
  const [checkpoints, setCheckpoints] = useState(0);
  const [time, setTime] = useState(0);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const startTime = useRef(Date.now());
  const lockRef = useRef<any>(null);
  const { submit } = useGameScores("plaza_parkour_3d");

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keys.f = true;
      if (e.code === "KeyS") keys.b = true;
      if (e.code === "KeyA") keys.l = true;
      if (e.code === "KeyD") keys.r = true;
      if (e.code === "Space") { keys.jump = true; e.preventDefault(); }
      if (e.code === "Escape") setPaused(true);
    };
    const u = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keys.f = false;
      if (e.code === "KeyS") keys.b = false;
      if (e.code === "KeyA") keys.l = false;
      if (e.code === "KeyD") keys.r = false;
      if (e.code === "Space") keys.jump = false;
    };
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  useEffect(() => {
    if (paused || done) return;
    const i = setInterval(() => setTime((Date.now() - startTime.current) / 1000), 100);
    return () => clearInterval(i);
  }, [paused, done]);

  useEffect(() => {
    if (done && !submitted) {
      setSubmitted(true);
      const t = (Date.now() - startTime.current) / 1000;
      const score = Math.max(0, Math.round(100000 - t * 100 - falls * 500));
      submit(score, Math.round(t)).then((r) => r.ok && toast.success(`Run saved! ${t.toFixed(1)}s · ${falls} falls`));
    }
  }, [done, submitted, falls, submit]);

  const restart = () => {
    posRef.current.set(0, 2, 0); respawn.current.set(0, 2, 0); velRef.current.set(0, 0, 0);
    setFalls(0); setCheckpoints(0); setTime(0); setDone(false); setSubmitted(false);
    startTime.current = Date.now();
  };

  return (
    <GameShell
      title="Plaza Parkour"
      gameType="plaza_parkour_3d"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={
        <div className="flex items-center gap-3 text-xs font-mono">
          <span>Time: <span className="text-primary">{time.toFixed(1)}s</span></span>
          <span>Falls: <span className="text-destructive">{falls}</span></span>
        </div>
      }
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2, 0], fov: 75 }}>
        <color attach="background" args={["#0a0518"]} />
        <fog attach="fog" args={["#0a0518", 15, 60]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[20, 30, 10]} intensity={0.9} castShadow shadow-mapSize={[2048, 2048]} />
        <hemisphereLight args={["#a855f7", "#1a0033", 0.3]} />
        <Player
          velRef={velRef} posRef={posRef}
          onFall={() => setFalls((f) => f + 1)}
          onCheckpoint={() => setCheckpoints((c) => c + 1)}
          onGoal={() => setDone(true)}
          paused={paused}
          respawn={respawn}
        />
        {!paused && <PointerLockControls ref={lockRef} />}
      </Canvas>

      {paused && !done && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center max-w-sm">
            <div className="text-2xl font-bold mb-2">Plaza Parkour</div>
            <div className="text-sm text-muted-foreground mb-4">
              WASD to move · Mouse to look · Space to jump<br/>
              Reach the glowing yellow platform!
            </div>
            <button
              onClick={() => { setPaused(false); startTime.current = Date.now() - time * 1000; }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
            >
              {time > 0 ? "Resume" : "Start"}
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-2xl font-bold mb-2">Finished!</div>
            <div className="text-muted-foreground mb-4">{time.toFixed(2)}s · {falls} falls</div>
            <button onClick={restart} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Run Again</button>
          </div>
        </div>
      )}

      {!paused && !done && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-primary/80" />
        </div>
      )}
    </GameShell>
  );
}
