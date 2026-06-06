import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import GameShell from "./GameShell";
import { useGameScores } from "@/hooks/useGameScores";
import { toast } from "sonner";

interface Block { pos: [number, number, number]; size: [number, number, number]; color: string; }

function Blocks({ blocks, moving }: { blocks: Block[]; moving: Block | null }) {
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.15} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      {moving && (
        <mesh position={moving.pos} castShadow>
          <boxGeometry args={moving.size} />
          <meshStandardMaterial color={moving.color} emissive={moving.color} emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function CameraRig({ targetY }: { targetY: number }) {
  useFrame(({ camera }) => {
    const desired = targetY + 4;
    camera.position.y += (desired - camera.position.y) * 0.06;
    camera.lookAt(0, targetY - 1, 0);
  });
  return null;
}

function MovingBlock({ block, setBlock, axis, speed, paused }: {
  block: Block; setBlock: (b: Block) => void; axis: "x" | "z"; speed: number; paused: boolean;
}) {
  const dir = useRef(1);
  useFrame((_, dt) => {
    if (paused) return;
    const i = axis === "x" ? 0 : 2;
    const next: [number, number, number] = [...block.pos] as [number, number, number];
    next[i] += dir.current * speed * dt;
    if (next[i] > 3) { next[i] = 3; dir.current = -1; }
    if (next[i] < -3) { next[i] = -3; dir.current = 1; }
    setBlock({ ...block, pos: next });
  });
  return null;
}

export default function TowerStacker({ onExit }: { onExit: () => void }) {
  const [blocks, setBlocks] = useState<Block[]>([{ pos: [0, 0, 0], size: [3, 0.4, 3], color: "#8b5cf6" }]);
  const [moving, setMoving] = useState<Block | null>(null);
  const [axis, setAxis] = useState<"x" | "z">("x");
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { submit } = useGameScores("tower_stacker_3d");

  const spawnNext = useCallback((base: Block) => {
    const newAxis = axis === "x" ? "z" : "x";
    const y = base.pos[1] + 0.4;
    const hue = (180 + blocks.length * 18) % 360;
    setMoving({
      pos: newAxis === "x" ? [-3, y, base.pos[2]] : [base.pos[0], y, -3],
      size: base.size,
      color: `hsl(${hue}, 75%, 60%)`,
    });
    setAxis(newAxis);
  }, [axis, blocks.length]);

  useEffect(() => { spawnNext(blocks[0]); /* eslint-disable-next-line */ }, []);

  const drop = useCallback(() => {
    if (!moving || over || paused) return;
    const top = blocks[blocks.length - 1];
    const i = axis === "x" ? 0 : 2;
    const overlap = Math.min(top.pos[i] + top.size[i] / 2, moving.pos[i] + moving.size[i] / 2) -
                    Math.max(top.pos[i] - top.size[i] / 2, moving.pos[i] - moving.size[i] / 2);
    if (overlap <= 0) {
      setOver(true);
      return;
    }
    const newSize: [number, number, number] = [...moving.size] as [number, number, number];
    newSize[i] = overlap;
    const newCenter = (Math.min(top.pos[i] + top.size[i] / 2, moving.pos[i] + moving.size[i] / 2) +
                       Math.max(top.pos[i] - top.size[i] / 2, moving.pos[i] - moving.size[i] / 2)) / 2;
    const newPos: [number, number, number] = [...moving.pos] as [number, number, number];
    newPos[i] = newCenter;
    const placed: Block = { pos: newPos, size: newSize, color: moving.color };
    const next = [...blocks, placed];
    setBlocks(next);
    spawnNext(placed);
  }, [moving, blocks, axis, over, paused, spawnNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); drop(); }
      if (e.code === "Escape") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drop]);

  useEffect(() => {
    if (over && !submitted) {
      setSubmitted(true);
      const score = (blocks.length - 1) * 100;
      submit(score).then((r) => {
        if (r.ok) toast.success(`Score saved: ${score}`);
      });
    }
  }, [over, submitted, blocks.length, submit]);

  const restart = () => {
    setBlocks([{ pos: [0, 0, 0], size: [3, 0.4, 3], color: "#8b5cf6" }]);
    setMoving(null);
    setAxis("x");
    setOver(false);
    setSubmitted(false);
    setTimeout(() => spawnNext({ pos: [0, 0, 0], size: [3, 0.4, 3], color: "#8b5cf6" }), 10);
  };

  const speed = Math.min(8, 2 + blocks.length * 0.2);
  const topY = blocks.length * 0.4;

  return (
    <GameShell
      title="Tower Stacker 3D"
      gameType="tower_stacker_3d"
      onBack={onExit}
      onRestart={restart}
      paused={paused}
      onTogglePause={() => setPaused((p) => !p)}
      hud={<span className="text-sm font-mono">Height: <span className="text-primary">{blocks.length - 1}</span></span>}
    >
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [6, 5, 6], fov: 50 }} onPointerDown={drop}>
        <color attach="background" args={["#0a0a1a"]} />
        <fog attach="fog" args={["#0a0a1a", 10, 40]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, topY + 3, 0]} intensity={1} color="#8b5cf6" />
        <Stars radius={50} depth={50} count={1500} factor={3} fade speed={0.5} />
        <CameraRig targetY={topY} />
        <Blocks blocks={blocks} moving={moving} />
        {moving && !over && !paused && (
          <MovingBlock block={moving} setBlock={setMoving} axis={axis} speed={speed} paused={paused} />
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#1a0f2e" />
        </mesh>
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
      </Canvas>
      {over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-2xl font-bold mb-2">Game Over</div>
            <div className="text-muted-foreground mb-4">Height: {blocks.length - 1} · Score: {(blocks.length - 1) * 100}</div>
            <button onClick={restart} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Play Again</button>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-4 py-2 text-xs text-muted-foreground pointer-events-none">
        Click or press Space to drop
      </div>
    </GameShell>
  );
}
