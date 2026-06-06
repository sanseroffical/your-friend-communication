import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

const keys = { up: false, down: false, left: false, right: false };

const TRACK_RADIUS = 30;
const TRACK_WIDTH = 8;
const LAPS = 3;

function Track() {
  // Glowing ring track with inner and outer walls
  const innerR = TRACK_RADIUS - TRACK_WIDTH / 2;
  const outerR = TRACK_RADIUS + TRACK_WIDTH / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <ringGeometry args={[innerR, outerR, 96]} />
        <meshStandardMaterial color="#1a1033" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Glowing edge rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[innerR - 0.15, innerR, 96]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[outerR, outerR + 0.15, 96]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>
      {/* Start/finish line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TRACK_RADIUS, 0.03, 0]}>
        <planeGeometry args={[TRACK_WIDTH, 0.4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Car({ carRef }: { carRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={carRef}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.7, -0.3]}>
        <boxGeometry args={[0.8, 0.35, 0.8]} />
        <meshStandardMaterial color="#0f0f1a" metalness={0.9} roughness={0.1} />
      </mesh>
      <pointLight position={[0, 0.5, -1.2]} color="#ec4899" intensity={1.5} distance={6} />
    </group>
  );
}

interface CarState { angle: number; speed: number; radial: number; angVel: number; }

function Drive({ carRef, state, paused, onCross }: {
  carRef: React.MutableRefObject<THREE.Group | null>;
  state: React.MutableRefObject<CarState>;
  paused: boolean;
  onCross: () => void;
}) {
  const prevAngle = useRef(state.current.angle);
  useFrame(({ camera }, dt) => {
    if (paused) return;
    const s = state.current;
    // Forward/back
    const accel = keys.up ? 18 : keys.down ? -10 : 0;
    s.speed += accel * dt;
    s.speed *= 0.985;
    s.speed = THREE.MathUtils.clamp(s.speed, -8, 22);
    // Steering -> change angle around track center; magnitude scales with speed
    const steer = (keys.left ? 1 : 0) + (keys.right ? -1 : 0);
    s.angVel = steer * (s.speed / TRACK_RADIUS) * 1.2;
    s.angle += s.angVel * dt + (s.speed / TRACK_RADIUS) * dt;
    // Radial (lane)
    s.radial += steer * dt * 2;
    s.radial = THREE.MathUtils.clamp(s.radial, -TRACK_WIDTH / 2 + 0.6, TRACK_WIDTH / 2 - 0.6);

    const r = TRACK_RADIUS + s.radial;
    const x = Math.cos(s.angle) * r;
    const z = Math.sin(s.angle) * r;
    const car = carRef.current;
    if (car) {
      car.position.set(x, 0, z);
      car.rotation.y = -s.angle + Math.PI / 2;
      // Camera follow
      const camOffset = new THREE.Vector3(Math.cos(s.angle + Math.PI) * 4, 3, Math.sin(s.angle + Math.PI) * 4);
      camera.position.lerp(new THREE.Vector3(x + camOffset.x, camOffset.y, z + camOffset.z), 0.1);
      camera.lookAt(x, 0.5, z);
    }

    // Lap crossing: angle wraps past 0
    const a = ((s.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const pa = ((prevAngle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (pa > Math.PI * 1.7 && a < Math.PI * 0.3 && s.speed > 0) onCross();
    prevAngle.current = s.angle;
  });
  return null;
}

export default function NeonRacer({ onExit }: { onExit: () => void }) {
  const carRef = useRef<THREE.Group | null>(null);
  const state = useRef<CarState>({ angle: 0, speed: 0, radial: 0, angVel: 0 });
  const [lap, setLap] = useState(0);
  const [time, setTime] = useState(0);
  const [bestLap, setBestLap] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lapStart = useRef(Date.now());
  const raceStart = useRef(Date.now());
  const { submit } = useGameScores("neon_racer_3d");

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
      if (e.code === "Escape") setPaused((p) => !p);
    };
    const u = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    };
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  useEffect(() => {
    if (paused || finished) return;
    const i = setInterval(() => setTime((Date.now() - raceStart.current) / 1000), 100);
    return () => clearInterval(i);
  }, [paused, finished]);

  const onCross = () => {
    const lapTime = (Date.now() - lapStart.current) / 1000;
    if (lapTime < 5) return; // ignore start
    setBestLap((b) => (b == null ? lapTime : Math.min(b, lapTime)));
    lapStart.current = Date.now();
    setLap((l) => {
      const next = l + 1;
      if (next >= LAPS) setFinished(true);
      return next;
    });
  };

  useEffect(() => {
    if (finished && !submitted) {
      setSubmitted(true);
      const total = (Date.now() - raceStart.current) / 1000;
      // Score = lower time is better → invert
      const score = Math.max(0, Math.round(100000 - total * 100));
      submit(score, Math.round(total)).then((r) => r.ok && toast.success(`Race saved! ${total.toFixed(2)}s`));
    }
  }, [finished, submitted, submit]);

  const restart = () => {
    state.current = { angle: 0, speed: 0, radial: 0, angVel: 0 };
    setLap(0); setTime(0); setBestLap(null); setFinished(false); setSubmitted(false);
    lapStart.current = Date.now(); raceStart.current = Date.now();
  };

  return (
    <GameShell
      title="Neon Racer"
      gameType="neon_racer_3d"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={
        <div className="flex items-center gap-3 text-xs font-mono">
          <span>Lap: <span className="text-primary">{Math.min(lap + 1, LAPS)}/{LAPS}</span></span>
          <span>Time: <span className="text-primary">{time.toFixed(1)}s</span></span>
          {bestLap != null && <span>Best: {bestLap.toFixed(2)}s</span>}
        </div>
      }
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [TRACK_RADIUS + 5, 4, 0], fov: 65 }}>
        <color attach="background" args={["#05021a"]} />
        <fog attach="fog" args={["#05021a", 25, 80]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[20, 30, 10]} intensity={0.6} castShadow />
        <pointLight position={[0, 10, 0]} color="#a855f7" intensity={2} distance={50} />
        <Track />
        <Car carRef={carRef} />
        <Drive carRef={carRef} state={state} paused={paused || finished} onCross={onCross} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#02010a" />
        </mesh>
      </Canvas>
      {finished && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-2xl font-bold mb-2">Finish!</div>
            <div className="text-muted-foreground mb-4">Total: {time.toFixed(2)}s · Best Lap: {bestLap?.toFixed(2)}s</div>
            <button onClick={restart} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Race Again</button>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-4 py-2 text-xs text-muted-foreground pointer-events-none">
        W/S accelerate · A/D steer · {LAPS} laps
      </div>
    </GameShell>
  );
}
