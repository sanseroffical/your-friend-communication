import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Sky } from "@react-three/drei";
import * as THREE from "three";
import { AvatarCustomization, DEFAULT_CUSTOMIZATION } from "./AvatarCustomizer";

export interface PlazaUser {
  id: string;
  name: string;
  avatarColor: string;
  position: [number, number, number];
  targetPosition: [number, number, number];
  message?: string;
  messageTime?: number;
  isAdmin?: boolean;
  isModerator?: boolean;
  customization?: AvatarCustomization;
  isSpeaking?: boolean;
  emote?: string;
  emoteTime?: number;
}

// Collision zones: { center, radius } for circular, or AABB for boxes
interface CollisionZone {
  type: "circle" | "box";
  x: number;
  z: number;
  radius?: number;
  halfW?: number;
  halfD?: number;
}

const COLLISION_ZONES: CollisionZone[] = [
  // Fountain
  { type: "circle", x: 0, z: 0, radius: 2 },
  // Gazebo pillars area
  { type: "circle", x: 20, z: 0, radius: 5.5 },
  // Pond
  { type: "circle", x: -15, z: -15, radius: 4.5 },
  // Stage
  { type: "box", x: 0, z: -22, halfW: 5, halfD: 3.5 },
  // Jukebox
  { type: "circle", x: 12, z: -8, radius: 1.5 },
  // Bulletin board
  { type: "circle", x: -10, z: 8, radius: 1.5 },
  // Houses
  { type: "box", x: -22, z: -8, halfW: 3, halfD: 3 },
  { type: "box", x: -22, z: -16, halfW: 3, halfD: 3 },
  { type: "box", x: 28, z: -10, halfW: 3, halfD: 3 },
  // Marketplace stalls
  { type: "box", x: 15, z: 18, halfW: 2, halfD: 1.5 },
  { type: "box", x: 20, z: 18, halfW: 2, halfD: 1.5 },
  { type: "box", x: 25, z: 18, halfW: 2, halfD: 1.5 },
];

export const checkCollision = (x: number, z: number): boolean => {
  for (const zone of COLLISION_ZONES) {
    if (zone.type === "circle") {
      const dx = x - zone.x;
      const dz = z - zone.z;
      if (Math.sqrt(dx * dx + dz * dz) < (zone.radius || 1)) return true;
    } else {
      if (
        Math.abs(x - zone.x) < (zone.halfW || 1) &&
        Math.abs(z - zone.z) < (zone.halfD || 1)
      ) return true;
    }
  }
  // World boundary
  if (Math.sqrt(x * x + z * z) > 35) return true;
  return false;
};

// Interactive object IDs
export type InteractableId = "jukebox" | "bulletin" | "game-station-1" | "game-station-2" | "game-station-3" | "house-1" | "house-2" | "house-3";

const INTERACT_ZONES: Array<{ id: InteractableId; x: number; z: number; radius: number }> = [
  { id: "jukebox", x: 12, z: -8, radius: 3 },
  { id: "bulletin", x: -10, z: 8, radius: 3 },
  { id: "game-station-1", x: 15, z: 18, radius: 3 },
  { id: "game-station-2", x: 20, z: 18, radius: 3 },
  { id: "game-station-3", x: 25, z: 18, radius: 3 },
  { id: "house-1", x: -22, z: -8, radius: 5 },
  { id: "house-2", x: -22, z: -16, radius: 5 },
  { id: "house-3", x: 28, z: -10, radius: 5 },
];

export const getNearbyInteractable = (x: number, z: number): InteractableId | null => {
  for (const zone of INTERACT_ZONES) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (Math.sqrt(dx * dx + dz * dz) < zone.radius) return zone.id;
  }
  return null;
};

// ============ EMOTE DISPLAY ============
const EMOTE_MAP: Record<string, string> = {
  wave: "👋",
  dance: "💃",
  clap: "👏",
  laugh: "😂",
  heart: "❤️",
  thumbsup: "👍",
  fire: "🔥",
  sad: "😢",
};

const EmoteDisplay = ({ emote, emoteTime }: { emote?: string; emoteTime?: number }) => {
  const ref = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (emote && emoteTime && Date.now() - emoteTime < 3000) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [emote, emoteTime]);

  useFrame((state) => {
    if (ref.current && visible) {
      ref.current.position.y = 1.8 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      ref.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  if (!visible || !emote || !EMOTE_MAP[emote]) return null;

  return (
    <group ref={ref} position={[0, 1.8, 0]}>
      <Text fontSize={0.4} anchorX="center" anchorY="middle">
        {EMOTE_MAP[emote]}
      </Text>
    </group>
  );
};

export { EMOTE_MAP };

// ============ HAT COMPONENT ============
const Hat = ({ style, color }: { style: string; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  if (style === "none") return null;
  if (style === "tophat") {
    return (
      <group position={[0, 0.85, 0]}>
        <mesh><cylinderGeometry args={[0.18, 0.18, 0.3, 16]} /><meshStandardMaterial color={col} /></mesh>
        <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04, 16]} /><meshStandardMaterial color={col} /></mesh>
      </group>
    );
  }
  if (style === "cap") {
    return (
      <group position={[0, 0.72, 0.05]}>
        <mesh><sphereGeometry args={[0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={col} /></mesh>
        <mesh position={[0, -0.02, 0.18]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.2, 0.02, 0.15]} /><meshStandardMaterial color={col} /></mesh>
      </group>
    );
  }
  if (style === "beanie") {
    return (
      <group position={[0, 0.78, 0]}>
        <mesh><sphereGeometry args={[0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={col} /></mesh>
        <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color={col} /></mesh>
      </group>
    );
  }
  if (style === "crown") {
    return (
      <group position={[0, 0.82, 0]}>
        <mesh><cylinderGeometry args={[0.22, 0.25, 0.15, 5]} /><meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} /></mesh>
      </group>
    );
  }
  if (style === "halo") {
    return (
      <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.03, 8, 32]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
      </mesh>
    );
  }
  return null;
};

// ============ GLASSES COMPONENT ============
const Glasses = ({ style, color }: { style: string; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  if (style === "none") return null;
  const lensRadius = style === "round" ? 0.06 : 0.05;
  const isSunglasses = style === "sunglasses";
  if (style === "monocle") {
    return (
      <group position={[0.08, 0.6, 0.18]}>
        <mesh><torusGeometry args={[0.06, 0.008, 8, 16]} /><meshStandardMaterial color={col} /></mesh>
      </group>
    );
  }
  return (
    <group position={[0, 0.6, 0.18]}>
      <mesh position={[-0.08, 0, 0]}><torusGeometry args={[lensRadius, 0.006, 8, 16]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0.08, 0, 0]}><torusGeometry args={[lensRadius, 0.006, 8, 16]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.04, 0.006, 0.006]} /><meshStandardMaterial color={col} /></mesh>
      {isSunglasses && (
        <>
          <mesh position={[-0.08, 0, -0.005]}><circleGeometry args={[lensRadius, 16]} /><meshStandardMaterial color="#111" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0.08, 0, -0.005]}><circleGeometry args={[lensRadius, 16]} /><meshStandardMaterial color="#111" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
        </>
      )}
    </group>
  );
};

// ============ AVATAR COMPONENT ============
interface AvatarProps {
  user: PlazaUser;
  isLocal: boolean;
  onClick?: () => void;
}

const Avatar = ({ user, isLocal, onClick }: AvatarProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const bobOffset = useRef(Math.random() * Math.PI * 2);
  const custom = user.customization || DEFAULT_CUSTOMIZATION;

  useFrame((state) => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const [tx, , tz] = user.targetPosition;
    pos.x += (tx - pos.x) * 0.05;
    pos.z += (tz - pos.z) * 0.05;
    const bob = Math.sin(state.clock.elapsedTime * 2 + bobOffset.current) * 0.05;
    pos.y = 0.5 + bob;
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const angle = Math.atan2(dx, dz);
      groupRef.current.rotation.y += (angle - groupRef.current.rotation.y) * 0.1;
    }
  });

  const bodyColor = useMemo(() => new THREE.Color(custom.bodyColor), [custom.bodyColor]);
  const shirtColor = useMemo(() => new THREE.Color(custom.shirtColor), [custom.shirtColor]);
  const showMessage = user.message && user.messageTime && Date.now() - user.messageTime < 5000;
  const headScale: [number, number, number] = custom.headShape === "oval" ? [1, 1.2, 1] : custom.headShape === "square" ? [1.1, 1, 1.1] : [1, 1, 1];

  return (
    <group
      ref={groupRef}
      position={[user.position[0], 0.5, user.position[2]]}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow>
        <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
        <meshStandardMaterial color={shirtColor} emissive={hovered || isLocal ? shirtColor : new THREE.Color(0, 0, 0)} emissiveIntensity={hovered ? 0.3 : isLocal ? 0.15 : 0} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow scale={headScale}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[-0.08, 0.6, 0.18]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.08, 0.6, 0.18]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.08, 0.6, 0.2]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.08, 0.6, 0.2]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <Hat style={custom.hatStyle} color={custom.hatColor} />
      <Glasses style={custom.glassesStyle} color={custom.glassesColor} />

      {/* Emote */}
      <EmoteDisplay emote={user.emote} emoteTime={user.emoteTime} />

      {/* Admin/Mod badge */}
      {user.isAdmin && (
        <group position={[0, 1.25, 0]}>
          <mesh><planeGeometry args={[0.55, 0.18]} /><meshBasicMaterial color="#ffd700" transparent opacity={0.9} side={THREE.DoubleSide} /></mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.08} color="#000" anchorX="center" anchorY="middle">🛡️ ADMIN</Text>
        </group>
      )}
      {user.isModerator && !user.isAdmin && (
        <group position={[0, 1.25, 0]}>
          <mesh><planeGeometry args={[0.45, 0.18]} /><meshBasicMaterial color="#3498db" transparent opacity={0.9} side={THREE.DoubleSide} /></mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.08} color="#fff" anchorX="center" anchorY="middle">🔰 MOD</Text>
        </group>
      )}

      {user.isSpeaking && (
        <mesh position={[0.35, 0.8, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.8} />
        </mesh>
      )}

      <Text position={[0, 1.1, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
        {user.name}
      </Text>

      {showMessage && (
        <group position={[0, 1.5, 0]}>
          <mesh><planeGeometry args={[Math.min(user.message!.length * 0.1 + 0.4, 3), 0.35]} /><meshBasicMaterial color="white" transparent opacity={0.9} side={THREE.DoubleSide} /></mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.1} color="#333" anchorX="center" anchorY="middle" maxWidth={2.8}>{user.message!.slice(0, 50)}</Text>
        </group>
      )}

      {isLocal && (
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} />
          <meshBasicMaterial color={bodyColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ============ INTERACTIVE OBJECTS ============

// Jukebox
const Jukebox = ({ onClick }: { onClick: () => void }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (ref.current) {
      // Subtle glow pulse
      ref.current.children.forEach((child) => {
        if ((child as THREE.Mesh).material && "emissiveIntensity" in ((child as THREE.Mesh).material as any)) {
          ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        }
      });
    }
  });

  return (
    <group ref={ref} position={[12, 0, -8]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {/* Body */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[1.2, 2, 0.8]} />
        <meshStandardMaterial color="#8B0000" roughness={0.4} metalness={0.3} emissive="#ff4444" emissiveIntensity={hovered ? 0.5 : 0.2} />
      </mesh>
      {/* Top arch */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.3, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#ffd700" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Speaker grille */}
      <mesh position={[0, 0.7, 0.41]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Music notes floating */}
      <Text position={[0.8, 2.5, 0]} fontSize={0.3} anchorX="center">🎵</Text>
      <Text position={[-0.5, 2.8, 0]} fontSize={0.25} anchorX="center">🎶</Text>
      {/* Label */}
      <Text position={[0, 2.8, 0.5]} fontSize={0.15} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">
        JUKEBOX
      </Text>
      {hovered && (
        <Text position={[0, 3.2, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">
          Click to play music!
        </Text>
      )}
    </group>
  );
};

// Bulletin Board
const BulletinBoard = ({ onClick }: { onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={[-10, 0, 8]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {/* Posts */}
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[0.15, 2, 0.15]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0, 2.2, 0]} castShadow><boxGeometry args={[0.15, 2, 0.15]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      {/* Board */}
      <mesh position={[0, 2.2, 0.1]} castShadow>
        <boxGeometry args={[2.5, 1.8, 0.1]} />
        <meshStandardMaterial color="#d2691e" roughness={0.8} emissive={hovered ? "#443322" : "#000"} emissiveIntensity={0.3} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 2.2, 0.16]}>
        <boxGeometry args={[2.6, 1.9, 0.02]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Pinned notes */}
      <mesh position={[-0.5, 2.5, 0.18]}><planeGeometry args={[0.6, 0.5]} /><meshStandardMaterial color="#fffacd" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.4, 2.0, 0.18]}><planeGeometry args={[0.5, 0.4]} /><meshStandardMaterial color="#98fb98" side={THREE.DoubleSide} /></mesh>
      <mesh position={[-0.3, 1.7, 0.18]}><planeGeometry args={[0.55, 0.45]} /><meshStandardMaterial color="#ffb6c1" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.5, 2.6, 0.18]}><planeGeometry args={[0.5, 0.4]} /><meshStandardMaterial color="#add8e6" side={THREE.DoubleSide} /></mesh>
      {/* Pins */}
      {[[-0.5, 2.7], [0.4, 2.2], [-0.3, 1.9], [0.5, 2.8]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color={["#e74c3c", "#3498db", "#f39c12", "#2ecc71"][i]} /></mesh>
      ))}
      <Text position={[0, 3.3, 0.1]} fontSize={0.18} color="#8B4513" anchorX="center" outlineWidth={0.01} outlineColor="#000">
        📋 BULLETIN BOARD
      </Text>
      {hovered && (
        <Text position={[0, 3.6, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">
          Click to read announcements!
        </Text>
      )}
    </group>
  );
};

// Game Station (at marketplace stalls)
const GameStation = ({ position, gameLabel, color, onClick }: { position: [number, number, number]; gameLabel: string; color: string; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[3, 2, 2]} /><meshStandardMaterial color="#c4956a" roughness={0.8} /></mesh>
      <mesh position={[0, 2.3, 0]} castShadow><boxGeometry args={[3.5, 0.1, 2.5]} /><meshStandardMaterial color={color} roughness={0.6} emissive={hovered ? color : "#000"} emissiveIntensity={0.3} /></mesh>
      {/* Arcade screen */}
      <mesh position={[0, 1.3, 1.01]}>
        <planeGeometry args={[1.5, 0.8]} />
        <meshStandardMaterial color="#111" emissive="#0066ff" emissiveIntensity={0.4 + (hovered ? 0.3 : 0)} />
      </mesh>
      <Text position={[0, 1.3, 1.02]} fontSize={0.15} color="#0ff" anchorX="center">
        {gameLabel}
      </Text>
      <Text position={[0, 2.8, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">
        🎮 {gameLabel}
      </Text>
      {hovered && (
        <Text position={[0, 3.2, 0]} fontSize={0.11} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">
          Click to play!
        </Text>
      )}
    </group>
  );
};

// House
const House = ({ position, color, label, onClick }: { position: [number, number, number]; color: string; label: string; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {/* Walls */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={hovered ? color : "#000"} emissiveIntensity={0.15} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.8, 2.01]}>
        <boxGeometry args={[0.8, 1.6, 0.05]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      {/* Door knob */}
      <mesh position={[0.25, 0.8, 2.05]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffd700" metalness={0.8} />
      </mesh>
      {/* Windows */}
      {[[-1.2, 2, 2.01], [1.2, 2, 2.01]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color="#87CEEB" transparent opacity={0.6} emissive="#ffeaa7" emissiveIntensity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Chimney */}
      <mesh position={[1, 4, -1]} castShadow>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <Text position={[0, 5, 0]} fontSize={0.15} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">
        🏠 {label}
      </Text>
      {hovered && (
        <Text position={[0, 5.4, 0]} fontSize={0.11} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">
          Click to enter!
        </Text>
      )}
    </group>
  );
};

// ============ EXPANDED GROUND ============
const Ground = () => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#4a7c59" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#c4a882" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[3, 3.2, 64]} />
        <meshStandardMaterial color="#b09070" roughness={0.7} />
      </mesh>

      {/* Fountain */}
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[1.5, 1.7, 0.4, 32]} /><meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} /></mesh>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.2, 0.25, 0.8, 16]} /><meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} /></mesh>
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial color="#66aadd" emissive="#4488bb" emissiveIntensity={0.3} transparent opacity={0.7} /></mesh>

      {/* Benches */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((angle, i) => (
        <group key={`bench-${i}`} position={[Math.cos(angle) * 10, 0, Math.sin(angle) * 10]} rotation={[0, -angle + Math.PI / 2, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[2, 0.08, 0.5]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
          <mesh position={[-0.8, 0.15, 0]} castShadow><boxGeometry args={[0.08, 0.3, 0.4]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
          <mesh position={[0.8, 0.15, 0]} castShadow><boxGeometry args={[0.08, 0.3, 0.4]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
          <mesh position={[0, 0.55, -0.22]} castShadow><boxGeometry args={[2, 0.5, 0.06]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
        </group>
      ))}

      {/* Gazebo */}
      <group position={[20, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[5, 6]} /><meshStandardMaterial color="#d4c4a8" roughness={0.6} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (<mesh key={`pillar-${i}`} position={[Math.cos(a) * 4.5, 1.5, Math.sin(a) * 4.5]} castShadow><cylinderGeometry args={[0.12, 0.12, 3, 8]} /><meshStandardMaterial color="#ddd" roughness={0.4} /></mesh>);
        })}
        <mesh position={[0, 3.2, 0]} castShadow><coneGeometry args={[5.5, 1.5, 6]} /><meshStandardMaterial color="#8B4513" roughness={0.7} /></mesh>
      </group>

      {/* Garden */}
      <group position={[-20, 0, 5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[6, 32]} /><meshStandardMaterial color="#3d6b40" roughness={0.9} /></mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = 3 + Math.sin(i * 2) * 1.5;
          return (<mesh key={`flower-${i}`} position={[Math.cos(a) * r, 0.3, Math.sin(a) * r]}><sphereGeometry args={[0.3, 8, 8]} /><meshStandardMaterial color={["#ff6b6b", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"][i % 5]} /></mesh>);
        })}
      </group>

      {/* Stage */}
      <group position={[0, 0, -22]}>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[8, 0.6, 5]} /><meshStandardMaterial color="#666" roughness={0.5} /></mesh>
        <mesh position={[0, 0.65, -2]} castShadow><boxGeometry args={[6, 0.1, 1]} /><meshStandardMaterial color="#888" roughness={0.5} /></mesh>
        {[-1, 0, 1].map((row) => (
          <mesh key={`seat-${row}`} position={[0, 0.15 + row * 0.15, 5 + row * 2]} castShadow><boxGeometry args={[10, 0.3, 1.5]} /><meshStandardMaterial color="#555" roughness={0.6} /></mesh>
        ))}
      </group>

      {/* Paths connecting areas */}
      {/* Path to houses */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.01, -10]}>
        <planeGeometry args={[2, 20]} />
        <meshStandardMaterial color="#c4a882" roughness={0.7} />
      </mesh>
      {/* Path to jukebox */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.01, -4]}>
        <planeGeometry args={[2, 10]} />
        <meshStandardMaterial color="#c4a882" roughness={0.7} />
      </mesh>

      {/* Trees */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2 + 0.2;
        const dist = 25 + Math.sin(i * 3) * 5;
        const height = 2.5 + Math.random() * 2;
        return (
          <group key={`tree-${i}`} position={[Math.cos(angle) * dist, 0, Math.sin(angle) * dist]}>
            <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.15, 0.2, height, 8]} /><meshStandardMaterial color="#5c3a1e" roughness={0.9} /></mesh>
            <mesh position={[0, height + 1, 0]} castShadow><sphereGeometry args={[1.5 + Math.random() * 0.5, 8, 8]} /><meshStandardMaterial color={i % 3 === 0 ? "#1a4d1a" : "#2d5a1e"} roughness={0.8} /></mesh>
          </group>
        );
      })}

      {/* Lampposts */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={`lamp-${i}`} position={[Math.cos(angle) * 14, 0, Math.sin(angle) * 14]}>
            <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.05, 0.08, 4, 8]} /><meshStandardMaterial color="#444" metalness={0.5} /></mesh>
            <mesh position={[0, 4.2, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffeaa7" emissiveIntensity={0.3} /></mesh>
            <pointLight position={[Math.cos(angle) * 14, 4.5, Math.sin(angle) * 14]} intensity={0.3} distance={8} color="#ffeaa7" />
          </group>
        );
      })}

      {/* Pond */}
      <group position={[-15, 0, -15]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><circleGeometry args={[4, 32]} /><meshStandardMaterial color="#2980b9" transparent opacity={0.7} roughness={0.1} metalness={0.3} /></mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={`lily-${i}`} rotation={[-Math.PI / 2, 0, i * 2]} position={[Math.cos(i * 2) * 2, 0.04, Math.sin(i * 2) * 2]}><circleGeometry args={[0.4, 16]} /><meshStandardMaterial color="#27ae60" side={THREE.DoubleSide} /></mesh>
        ))}
      </group>
    </group>
  );
};

// ============ CLICK PLANE ============
const ClickPlane = ({ onMove }: { onMove: (point: THREE.Vector3) => void }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}
      onClick={(e) => {
        e.stopPropagation();
        const point = e.point;
        if (!checkCollision(point.x, point.z)) {
          onMove(point);
        }
      }}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial />
    </mesh>
  );
};

// ============ MAIN SCENE ============
interface PlazaSceneProps {
  localUser: PlazaUser;
  remoteUsers: PlazaUser[];
  onMove: (position: [number, number, number]) => void;
  onUserClick: (userId: string) => void;
  onInteract?: (id: InteractableId) => void;
}

const PlazaScene = ({ localUser, remoteUsers, onMove, onUserClick, onInteract }: PlazaSceneProps) => {
  const handleMove = useCallback((point: THREE.Vector3) => {
    onMove([point.x, 0, point.z]);
  }, [onMove]);

  const handleInteract = useCallback((id: InteractableId) => {
    onInteract?.(id);
  }, [onInteract]);

  return (
    <Canvas shadows camera={{ position: [0, 15, 15], fov: 50 }} style={{ background: "#87CEEB" }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 5]} intensity={1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={80} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
      <Sky sunPosition={[100, 50, 100]} />

      <Ground />
      <ClickPlane onMove={handleMove} />

      {/* Interactive objects */}
      <Jukebox onClick={() => handleInteract("jukebox")} />
      <BulletinBoard onClick={() => handleInteract("bulletin")} />
      <GameStation position={[15, 0, 18]} gameLabel="Snake" color="#e74c3c" onClick={() => handleInteract("game-station-1")} />
      <GameStation position={[20, 0, 18]} gameLabel="Tetris" color="#3498db" onClick={() => handleInteract("game-station-2")} />
      <GameStation position={[25, 0, 18]} gameLabel="Memory" color="#2ecc71" onClick={() => handleInteract("game-station-3")} />

      {/* Houses */}
      <House position={[-22, 0, -8]} color="#e8d5b7" label="Cozy Cabin" onClick={() => handleInteract("house-1")} />
      <House position={[-22, 0, -16]} color="#b0c4de" label="Blue House" onClick={() => handleInteract("house-2")} />
      <House position={[28, 0, -10]} color="#deb887" label="Treehouse" onClick={() => handleInteract("house-3")} />

      <Avatar user={localUser} isLocal={true} />
      {remoteUsers.map((user) => (
        <Avatar key={user.id} user={user} isLocal={false} onClick={() => onUserClick(user.id)} />
      ))}

      <OrbitControls target={[localUser.targetPosition[0], 0.5, localUser.targetPosition[2]]} maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={30} enablePan={false} />
    </Canvas>
  );
};

export default PlazaScene;
