import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { supabase } from "@/integrations/supabase/client";
import { useClipUser } from "@/hooks/useClipUser";
import { toast } from "sonner";

const keys = { f: false, b: false, l: false, r: false, jump: false, fire: false };
const ROOM = "main";

interface RemotePlayer { id: string; name: string; color: string; pos: [number, number, number]; hp: number; }

function ArenaWorld() {
  // Simple bowl arena with cover blocks
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a0f2e" roughness={0.8} />
      </mesh>
      {[[-10, 0, 0], [10, 0, 0], [0, 0, -10], [0, 0, 10], [-7, 0, 7], [7, 0, -7]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 1.5, z]} castShadow>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#6d28d9" emissive="#6d28d9" emissiveIntensity={0.15} />
        </mesh>
      ))}
      {/* Boundary walls */}
      {[[0, 30], [0, -30], [30, 0], [-30, 0]].map(([x, z], i) => (
        <mesh key={`w${i}`} position={[x, 3, z]} rotation={[0, x === 0 ? 0 : Math.PI / 2, 0]}>
          <boxGeometry args={[60, 6, 0.4]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function RemotePlayers({ players }: { players: Record<string, RemotePlayer> }) {
  return (
    <>
      {Object.values(players).map((p) => (
        <group key={p.id} position={p.pos}>
          <mesh castShadow position={[0, 0, 0]}>
            <capsuleGeometry args={[0.4, 1, 4, 8]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.3} />
          </mesh>
          <pointLight color={p.color} intensity={0.8} distance={4} />
        </group>
      ))}
    </>
  );
}

function Bullets({ bullets }: { bullets: { pos: THREE.Vector3 }[] }) {
  return (
    <>
      {bullets.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      ))}
    </>
  );
}

interface NetBullet { id: string; from: string; ox: number; oy: number; oz: number; dx: number; dy: number; dz: number; t: number; }

function LocalPlayer({ velRef, posRef, paused, channelRef, fireFn }: {
  velRef: React.MutableRefObject<THREE.Vector3>;
  posRef: React.MutableRefObject<THREE.Vector3>;
  paused: boolean;
  channelRef: React.MutableRefObject<any>;
  fireFn: React.MutableRefObject<() => void>;
}) {
  const grounded = useRef(false);
  const fireCd = useRef(0);
  const sendCd = useRef(0);

  fireFn.current = () => {
    if (fireCd.current > 0) return;
    fireCd.current = 0.25;
    const cam = (window as any).__arenaCam as THREE.Camera | undefined;
    if (!cam) return;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    channelRef.current?.send({
      type: "broadcast", event: "shoot",
      payload: { ox: posRef.current.x, oy: posRef.current.y, oz: posRef.current.z, dx: dir.x, dy: dir.y, dz: dir.z, t: Date.now() },
    });
  };

  useFrame(({ camera }, dt) => {
    (window as any).__arenaCam = camera;
    if (paused) return;
    dt = Math.min(dt, 0.05);
    fireCd.current -= dt;
    if (keys.fire) fireFn.current();

    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (keys.f) move.add(fwd);
    if (keys.b) move.sub(fwd);
    if (keys.r) move.add(right);
    if (keys.l) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(7);

    velRef.current.x = move.x;
    velRef.current.z = move.z;
    velRef.current.y -= 22 * dt;
    if (keys.jump && grounded.current) { velRef.current.y = 8; grounded.current = false; }
    posRef.current.addScaledVector(velRef.current, dt);
    if (posRef.current.y < 1.5) { posRef.current.y = 1.5; velRef.current.y = 0; grounded.current = true; }
    // Clamp arena
    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, -29, 29);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, -29, 29);
    camera.position.copy(posRef.current);

    // Broadcast position at 15Hz
    sendCd.current -= dt;
    if (sendCd.current <= 0 && channelRef.current) {
      sendCd.current = 1 / 15;
      channelRef.current.send({
        type: "broadcast", event: "pos",
        payload: { x: posRef.current.x, y: posRef.current.y, z: posRef.current.z },
      });
    }
  });
  return null;
}

const COLORS = ["#a855f7", "#ec4899", "#06b6d4", "#fde047", "#10b981", "#f97316", "#3b82f6", "#ef4444"];

export default function PlazaArena({ onExit }: { onExit: () => void }) {
  const { user } = useClipUser();
  const myId = user?.id ?? "guest-" + Math.random().toString(36).slice(2, 8);
  const myColor = useMemo(() => COLORS[Math.floor(Math.random() * COLORS.length)], []);
  const myName = (user as any)?.display_name ?? "Player";
  const velRef = useRef(new THREE.Vector3());
  const posRef = useRef(new THREE.Vector3(Math.random() * 20 - 10, 1.5, Math.random() * 20 - 10));
  const channelRef = useRef<any>(null);
  const fireFn = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(true);
  const [players, setPlayers] = useState<Record<string, RemotePlayer>>({});
  const [bullets, setBullets] = useState<{ pos: THREE.Vector3 }[]>([]);
  const [hp, setHp] = useState(100);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const hpRef = useRef(100);
  const { submit } = useGameScores("plaza_arena_3d");

  useEffect(() => {
    const ch = supabase.channel(`arena-${ROOM}`, { config: { broadcast: { self: false }, presence: { key: myId } } });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      setPlayers((prev) => {
        const next: Record<string, RemotePlayer> = {};
        for (const [id, metas] of Object.entries(state)) {
          if (id === myId) continue;
          const meta = metas[0];
          next[id] = prev[id] ?? { id, name: meta.name, color: meta.color, pos: [0, 1.5, 0], hp: 100 };
          next[id].name = meta.name;
          next[id].color = meta.color;
        }
        return next;
      });
    });

    ch.on("broadcast", { event: "pos" }, (msg: any) => {
      const id = msg.payload.from ?? msg.event;
      // We don't get sender id directly in broadcast; use presence-aligned id via payload.from set in our send
    });

    // Better: include sender id in payload
    ch.on("broadcast", { event: "pos" }, (msg: any) => {
      const senderId = msg.payload?.id;
      if (!senderId || senderId === myId) return;
      setPlayers((p) => ({ ...p, [senderId]: { ...(p[senderId] ?? { id: senderId, name: "Player", color: "#a855f7", hp: 100, pos: [0,1.5,0] }), pos: [msg.payload.x, msg.payload.y, msg.payload.z] } }));
    });

    ch.on("broadcast", { event: "shoot" }, (msg: any) => {
      const p = msg.payload;
      if (p.from === myId) return;
      // Render a brief bullet trace, check if it hits us
      const origin = new THREE.Vector3(p.ox, p.oy, p.oz);
      const dir = new THREE.Vector3(p.dx, p.dy, p.dz).normalize();
      // March 50 units, check distance to local player
      for (let t = 0; t < 50; t += 1) {
        const pt = origin.clone().addScaledVector(dir, t);
        if (pt.distanceTo(posRef.current) < 0.8) {
          hpRef.current -= 20;
          setHp(hpRef.current);
          if (hpRef.current <= 0) {
            hpRef.current = 100; setHp(100);
            setDeaths((d) => d + 1);
            posRef.current.set(Math.random() * 20 - 10, 1.5, Math.random() * 20 - 10);
            ch.send({ type: "broadcast", event: "killed", payload: { by: p.from, victim: myId } });
            toast.error("You were eliminated!");
          }
          break;
        }
      }
      setBullets((b) => [...b, { pos: origin.clone().addScaledVector(dir, 5) }]);
      setTimeout(() => setBullets((b) => b.slice(1)), 200);
    });

    ch.on("broadcast", { event: "killed" }, (msg: any) => {
      if (msg.payload.by === myId) {
        setKills((k) => k + 1);
        toast.success("Elimination!");
      }
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ name: myName, color: myColor });
      }
    });

    // Override pos broadcaster to include id
    const origSend = ch.send.bind(ch);
    (ch as any).send = (msg: any) => {
      if (msg?.event === "pos" || msg?.event === "shoot") {
        msg.payload = { ...msg.payload, id: myId, from: myId };
      }
      return origSend(msg);
    };

    return () => { supabase.removeChannel(ch); };
  }, [myId, myColor, myName]);

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
    const mDown = (e: MouseEvent) => { if (e.button === 0) keys.fire = true; };
    const mUp = (e: MouseEvent) => { if (e.button === 0) keys.fire = false; };
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    window.addEventListener("mousedown", mDown);
    window.addEventListener("mouseup", mUp);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
      window.removeEventListener("mousedown", mDown);
      window.removeEventListener("mouseup", mUp);
    };
  }, []);

  const leave = () => {
    // Submit score on exit
    const score = kills * 100 - deaths * 25;
    if (score > 0) submit(score).then((r) => r.ok && toast.success(`Match saved: ${score}`));
    onExit();
  };

  return (
    <GameShell
      title="Plaza Arena (Multiplayer)"
      gameType="plaza_arena_3d"
      onBack={leave}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={
        <div className="flex items-center gap-3 text-xs font-mono">
          <span>HP: <span className={hp < 30 ? "text-destructive" : "text-primary"}>{hp}</span></span>
          <span>K/D: <span className="text-primary">{kills}/{deaths}</span></span>
          <span>Players: {Object.keys(players).length + 1}</span>
        </div>
      }
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.5, 0], fov: 75 }}>
        <color attach="background" args={["#0a0518"]} />
        <fog attach="fog" args={["#0a0518", 20, 50]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[20, 30, 10]} intensity={0.8} castShadow />
        <ArenaWorld />
        <RemotePlayers players={players} />
        <Bullets bullets={bullets} />
        <LocalPlayer velRef={velRef} posRef={posRef} paused={paused} channelRef={channelRef} fireFn={fireFn} />
        {!paused && <PointerLockControls />}
      </Canvas>

      {paused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center max-w-sm">
            <div className="text-2xl font-bold mb-2">Plaza Arena</div>
            <div className="text-sm text-muted-foreground mb-4">
              WASD to move · Mouse to look · Click to fire · Space to jump<br/>
              Eliminate other players. Esc to pause.
            </div>
            <button onClick={() => setPaused(false)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
              {kills + deaths > 0 ? "Resume" : "Enter Arena"}
            </button>
          </div>
        </div>
      )}

      {!paused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-3 h-3 rounded-full border-2 border-primary" />
        </div>
      )}
    </GameShell>
  );
}
