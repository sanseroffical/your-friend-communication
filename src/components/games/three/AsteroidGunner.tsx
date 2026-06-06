import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

interface Asteroid { id: number; pos: THREE.Vector3; vel: THREE.Vector3; size: number; rot: THREE.Euler; }
interface Bullet { id: number; pos: THREE.Vector3; vel: THREE.Vector3; life: number; }

const keys = { up: false, down: false, left: false, right: false, fire: false };

function Scene({ onScore, onDeath, paused, scoreRef, hpRef }: {
  onScore: (n: number) => void; onDeath: () => void; paused: boolean;
  scoreRef: React.MutableRefObject<number>; hpRef: React.MutableRefObject<number>;
}) {
  const ship = useRef<THREE.Group>(null!);
  const asteroids = useRef<Asteroid[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const bulletMeshRef = useRef<THREE.InstancedMesh>(null!);
  const idCounter = useRef(0);
  const fireCooldown = useRef(0);
  const spawnTimer = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();

  const spawnAsteroid = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30;
    const pos = new THREE.Vector3(Math.cos(angle) * dist, (Math.random() - 0.5) * 8, Math.sin(angle) * dist);
    const target = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
    const vel = target.sub(pos).normalize().multiplyScalar(2 + Math.random() * 3);
    asteroids.current.push({
      id: idCounter.current++, pos, vel,
      size: 0.8 + Math.random() * 1.4,
      rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
    });
  }, []);

  useFrame((_, dt) => {
    if (paused) return;
    const s = ship.current;
    if (!s) return;
    const speed = 8 * dt;
    if (keys.left) s.rotation.z += 2 * dt;
    if (keys.right) s.rotation.z -= 2 * dt;
    if (keys.up) s.rotation.x -= 1.5 * dt;
    if (keys.down) s.rotation.x += 1.5 * dt;
    s.position.x += (keys.right ? 1 : keys.left ? -1 : 0) * speed;
    s.position.y += (keys.up ? -1 : keys.down ? 1 : 0) * speed * 0.6;
    s.position.x = THREE.MathUtils.clamp(s.position.x, -10, 10);
    s.position.y = THREE.MathUtils.clamp(s.position.y, -5, 5);

    fireCooldown.current -= dt;
    if (keys.fire && fireCooldown.current <= 0) {
      fireCooldown.current = 0.15;
      bullets.current.push({
        id: idCounter.current++,
        pos: s.position.clone(),
        vel: new THREE.Vector3(0, 0, -35),
        life: 2,
      });
    }

    spawnTimer.current -= dt;
    if (spawnTimer.current <= 0) {
      spawnTimer.current = Math.max(0.3, 1.5 - scoreRef.current / 5000);
      spawnAsteroid();
    }

    // Update asteroids
    for (const a of asteroids.current) {
      a.pos.addScaledVector(a.vel, dt);
      a.rot.x += dt * 0.5; a.rot.y += dt * 0.3;
    }
    asteroids.current = asteroids.current.filter((a) => a.pos.length() < 60);

    // Update bullets
    for (const b of bullets.current) {
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
    }
    bullets.current = bullets.current.filter((b) => b.life > 0);

    // Collisions: bullet/asteroid
    for (const b of bullets.current) {
      for (const a of asteroids.current) {
        if (b.pos.distanceTo(a.pos) < a.size + 0.3) {
          a.size -= 0.6;
          b.life = 0;
          if (a.size <= 0.4) {
            scoreRef.current += 100;
            onScore(scoreRef.current);
            a.pos.set(999, 999, 999);
          } else {
            scoreRef.current += 25;
            onScore(scoreRef.current);
          }
        }
      }
    }
    asteroids.current = asteroids.current.filter((a) => a.size > 0.4);

    // Collisions: asteroid/ship
    for (const a of asteroids.current) {
      if (a.pos.distanceTo(s.position) < a.size + 0.8) {
        a.pos.set(999, 999, 999);
        hpRef.current -= 20;
        if (hpRef.current <= 0) onDeath();
      }
    }

    // Update instanced meshes
    if (meshRef.current) {
      meshRef.current.count = asteroids.current.length;
      asteroids.current.forEach((a, i) => {
        dummy.position.copy(a.pos);
        dummy.rotation.copy(a.rot);
        dummy.scale.setScalar(a.size);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (bulletMeshRef.current) {
      bulletMeshRef.current.count = bullets.current.length;
      bullets.current.forEach((b, i) => {
        dummy.position.copy(b.pos);
        dummy.scale.setScalar(0.2);
        dummy.updateMatrix();
        bulletMeshRef.current.setMatrixAt(i, dummy.matrix);
      });
      bulletMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    camera.position.x += (s.position.x * 0.3 - camera.position.x) * 0.1;
    camera.position.y += (2 + s.position.y * 0.2 - camera.position.y) * 0.1;
    camera.lookAt(s.position.x, s.position.y, s.position.z - 5);
  });

  return (
    <>
      <group ref={ship} position={[0, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.5, 1.5, 8]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, -0.5, 0.3]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.2, 0.6, 6]} />
          <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0, -0.5, 0]} color="#fb923c" intensity={1} distance={4} />
      </group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 200]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={bulletMeshRef} args={[undefined, undefined, 100]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={2} />
      </instancedMesh>
    </>
  );
}

export default function AsteroidGunner({ onExit }: { onExit: () => void }) {
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const scoreRef = useRef(0);
  const hpRef = useRef(100);
  const { submit } = useGameScores("asteroid_gunner_3d");
  const startTime = useRef(Date.now());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
      if (e.code === "Space") { keys.fire = true; e.preventDefault(); }
      if (e.code === "Escape") setPaused((p) => !p);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
      if (e.code === "Space") keys.fire = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHp(hpRef.current), 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (over && !submitted) {
      setSubmitted(true);
      const time = Math.round((Date.now() - startTime.current) / 1000);
      submit(scoreRef.current, time).then((r) => r.ok && toast.success(`Score saved: ${scoreRef.current}`));
    }
  }, [over, submitted, submit]);

  const restart = () => {
    scoreRef.current = 0; hpRef.current = 100;
    setScore(0); setHp(100); setOver(false); setSubmitted(false);
    startTime.current = Date.now();
  };

  return (
    <GameShell
      title="Asteroid Gunner"
      gameType="asteroid_gunner_3d"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={
        <div className="flex items-center gap-3 text-xs font-mono">
          <span>Score: <span className="text-primary">{score}</span></span>
          <span>HP: <span className={hp < 30 ? "text-destructive" : "text-primary"}>{hp}</span></span>
        </div>
      }
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 2, 8], fov: 60 }}>
        <color attach="background" args={["#000010"]} />
        <fog attach="fog" args={["#000010", 20, 60]} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
        <Scene onScore={setScore} onDeath={() => setOver(true)} paused={paused} scoreRef={scoreRef} hpRef={hpRef} />
      </Canvas>
      {over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-2xl font-bold mb-2">Ship Destroyed</div>
            <div className="text-muted-foreground mb-4">Final Score: {score}</div>
            <button onClick={restart} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Play Again</button>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-4 py-2 text-xs text-muted-foreground pointer-events-none">
        WASD/Arrows · Space to fire · Esc to pause
      </div>
    </GameShell>
  );
}
