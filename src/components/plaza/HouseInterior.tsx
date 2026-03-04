import { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { AvatarCustomization, DEFAULT_CUSTOMIZATION } from "./AvatarCustomizer";

// ============ TYPES ============
export interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  color: string;
  placedBy: string;
}

export interface InteriorMessage {
  id: string;
  sender: string;
  text: string;
  time: number;
  position: [number, number, number];
}

interface HouseInteriorProps {
  houseName: string;
  houseColor: string;
  messages: InteriorMessage[];
  placedObjects: PlacedObject[];
  onPlaceObject: (obj: Omit<PlacedObject, "id">) => void;
  onExit: () => void;
  placingMode: { type: string; color: string } | null;
  userName: string;
  customization?: AvatarCustomization;
  avatarPosition?: [number, number, number];
  onAvatarMove?: (pos: [number, number, number]) => void;
}

// ============ PLACEABLE OBJECT DEFINITIONS ============
export const PLACEABLE_OBJECTS = [
  { type: "chair", label: "🪑 Chair", icon: "🪑" },
  { type: "table", label: "🪵 Table", icon: "🪵" },
  { type: "lamp", label: "💡 Lamp", icon: "💡" },
  { type: "plant", label: "🪴 Plant", icon: "🪴" },
  { type: "painting", label: "🖼️ Painting", icon: "🖼️" },
  { type: "bookshelf", label: "📚 Bookshelf", icon: "📚" },
  { type: "rug", label: "🟫 Rug", icon: "🟫" },
  { type: "tv", label: "📺 TV", icon: "📺" },
  { type: "speaker", label: "🔊 Speaker", icon: "🔊" },
  { type: "trophy", label: "🏆 Trophy", icon: "🏆" },
];

export const OBJECT_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#ecf0f1", "#34495e", "#d35400",
  "#8B4513", "#ffd700", "#ff69b4", "#00ced1",
];

// ============ 3D FURNITURE COMPONENTS ============

const Chair3D = ({ position, color }: { position: [number, number, number]; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.5, 0.05, 0.5]} /><meshStandardMaterial color={col} /></mesh>
      {[[-0.2, 0.12, -0.2], [0.2, 0.12, -0.2], [-0.2, 0.12, 0.2], [0.2, 0.12, 0.2]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.025, 0.025, 0.25, 8]} /><meshStandardMaterial color={col} /></mesh>
      ))}
      <mesh position={[0, 0.5, -0.22]}><boxGeometry args={[0.5, 0.5, 0.04]} /><meshStandardMaterial color={col} /></mesh>
    </group>
  );
};

const Table3D = ({ position, color }: { position: [number, number, number]; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[1, 0.06, 0.6]} /><meshStandardMaterial color={col} /></mesh>
      {[[-0.42, 0.18, -0.22], [0.42, 0.18, -0.22], [-0.42, 0.18, 0.22], [0.42, 0.18, 0.22]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.03, 0.03, 0.38, 8]} /><meshStandardMaterial color={col} /></mesh>
      ))}
    </group>
  );
};

const Lamp3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <group position={position}>
    <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.03, 0.05, 0.8, 8]} /><meshStandardMaterial color="#555" metalness={0.5} /></mesh>
    <mesh position={[0, 0.85, 0]}><coneGeometry args={[0.2, 0.25, 16]} /><meshStandardMaterial color={color} /></mesh>
    <pointLight position={[position[0], position[1] + 1, position[2]]} intensity={0.5} distance={4} color="#ffeaa7" />
  </group>
);

const Plant3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <group position={position}>
    <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.12, 0.15, 0.25, 8]} /><meshStandardMaterial color="#8B4513" /></mesh>
    <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color={color || "#27ae60"} /></mesh>
    <mesh position={[0.1, 0.45, 0.05]}><sphereGeometry args={[0.12, 8, 8]} /><meshStandardMaterial color="#2ecc71" /></mesh>
  </group>
);

const Painting3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <group position={position}>
    <mesh><boxGeometry args={[0.6, 0.45, 0.03]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
    <mesh position={[0, 0, 0.02]}><planeGeometry args={[0.5, 0.35]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} /></mesh>
  </group>
);

const Bookshelf3D = ({ position, color }: { position: [number, number, number]; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.8, 1.2, 0.3]} /><meshStandardMaterial color={col} /></mesh>
      {[0.25, 0.55, 0.85].map((y, i) => (
        <mesh key={i} position={[0, y, 0.01]}><boxGeometry args={[0.7, 0.04, 0.28]} /><meshStandardMaterial color={col} /></mesh>
      ))}
      {/* Books */}
      {[0.3, 0.6, 0.9].map((y, row) =>
        [-0.25, -0.1, 0.05, 0.2].map((x, i) => (
          <mesh key={`${row}-${i}`} position={[x, y, 0.05]}>
            <boxGeometry args={[0.08, 0.15, 0.18]} />
            <meshStandardMaterial color={["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"][((row * 4 + i) % 5)]} />
          </mesh>
        ))
      )}
    </group>
  );
};

const Rug3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <mesh position={[position[0], 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[1.5, 1]} />
    <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
  </mesh>
);

const TV3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <group position={position}>
    <mesh><boxGeometry args={[0.8, 0.5, 0.04]} /><meshStandardMaterial color="#111" /></mesh>
    <mesh position={[0, 0, 0.025]}><planeGeometry args={[0.7, 0.4]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.03, 0.05, 0.1, 8]} /><meshStandardMaterial color="#333" /></mesh>
  </group>
);

const Speaker3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <group position={position}>
    <mesh><boxGeometry args={[0.25, 0.4, 0.2]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.05, 0.11]}><circleGeometry args={[0.08, 16]} /><meshStandardMaterial color="#222" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -0.08, 0.11]}><circleGeometry args={[0.04, 16]} /><meshStandardMaterial color="#222" side={THREE.DoubleSide} /></mesh>
  </group>
);

const Trophy3D = ({ position, color }: { position: [number, number, number]; color: string }) => (
  <group position={position}>
    <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.08, 0.1, 0.1, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
    <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.02, 0.02, 0.1, 8]} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.1, 0.06, 0.12, 16]} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.2} /></mesh>
  </group>
);

// ============ RENDER PLACED OBJECT ============
const PlacedObject3D = ({ obj }: { obj: PlacedObject }) => {
  switch (obj.type) {
    case "chair": return <Chair3D position={obj.position} color={obj.color} />;
    case "table": return <Table3D position={obj.position} color={obj.color} />;
    case "lamp": return <Lamp3D position={obj.position} color={obj.color} />;
    case "plant": return <Plant3D position={obj.position} color={obj.color} />;
    case "painting": return <Painting3D position={obj.position} color={obj.color} />;
    case "bookshelf": return <Bookshelf3D position={obj.position} color={obj.color} />;
    case "rug": return <Rug3D position={obj.position} color={obj.color} />;
    case "tv": return <TV3D position={obj.position} color={obj.color} />;
    case "speaker": return <Speaker3D position={obj.position} color={obj.color} />;
    case "trophy": return <Trophy3D position={obj.position} color={obj.color} />;
    default: return (
      <mesh position={obj.position}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color={obj.color} /></mesh>
    );
  }
};

// ============ FLOATING MESSAGE BUBBLE ============
const MessageBubble = ({ msg }: { msg: InteriorMessage }) => {
  const ref = useRef<THREE.Group>(null);
  const age = (Date.now() - msg.time) / 1000;
  const opacity = Math.max(0, 1 - age / 30);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = msg.position[1] + Math.sin(state.clock.elapsedTime * 1.5 + msg.position[0]) * 0.03;
      // Face camera
      ref.current.lookAt(state.camera.position);
    }
  });

  if (opacity <= 0) return null;

  const bubbleWidth = Math.min(msg.text.length * 0.06 + 0.4, 2.5);

  return (
    <group ref={ref} position={msg.position}>
      {/* Bubble background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[bubbleWidth, 0.35]} />
        <meshBasicMaterial color="white" transparent opacity={opacity * 0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Sender name */}
      <Text position={[0, 0.1, 0]} fontSize={0.06} color="#3498db" anchorX="center" anchorY="middle" maxWidth={bubbleWidth - 0.1}>
        {msg.sender}
      </Text>
      {/* Message text */}
      <Text position={[0, -0.04, 0]} fontSize={0.08} color="#333" anchorX="center" anchorY="middle" maxWidth={bubbleWidth - 0.1}>
        {msg.text.slice(0, 60)}
      </Text>
      {/* Tail */}
      <mesh position={[0, -0.2, -0.01]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.08, 0.08]} />
        <meshBasicMaterial color="white" transparent opacity={opacity * 0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ============ DEFAULT FURNITURE (built-in) ============
const DefaultFurniture = ({ houseColor }: { houseColor: string }) => (
  <group>
    {/* Couch */}
    <group position={[-2.5, 0, 0]}>
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.6, 0.3, 1.8]} /><meshStandardMaterial color="#7f8c8d" /></mesh>
      <mesh position={[-0.25, 0.5, 0]}><boxGeometry args={[0.1, 0.3, 1.8]} /><meshStandardMaterial color="#95a5a6" /></mesh>
      <mesh position={[0, 0.25, -0.85]}><boxGeometry args={[0.6, 0.3, 0.1]} /><meshStandardMaterial color="#95a5a6" /></mesh>
      <mesh position={[0, 0.25, 0.85]}><boxGeometry args={[0.6, 0.3, 0.1]} /><meshStandardMaterial color="#95a5a6" /></mesh>
      {/* Cushions */}
      <mesh position={[0.05, 0.42, -0.4]}><boxGeometry args={[0.4, 0.1, 0.6]} /><meshStandardMaterial color="#e74c3c" /></mesh>
      <mesh position={[0.05, 0.42, 0.4]}><boxGeometry args={[0.4, 0.1, 0.6]} /><meshStandardMaterial color="#3498db" /></mesh>
    </group>

    {/* Coffee table */}
    <group position={[-1.2, 0, 0]}>
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.6, 0.04, 1]} /><meshStandardMaterial color="#8B4513" /></mesh>
      {[[-0.25, 0.09, -0.4], [0.25, 0.09, -0.4], [-0.25, 0.09, 0.4], [0.25, 0.09, 0.4]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><cylinderGeometry args={[0.025, 0.025, 0.18, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      ))}
      {/* Items on table */}
      <mesh position={[0.1, 0.26, 0]}><cylinderGeometry args={[0.04, 0.04, 0.1, 8]} /><meshStandardMaterial color="#e67e22" /></mesh>
      <mesh position={[-0.15, 0.24, 0.15]}><boxGeometry args={[0.15, 0.02, 0.1]} /><meshStandardMaterial color="#2c3e50" /></mesh>
    </group>

    {/* TV on wall */}
    <group position={[2.95, 1.5, 0]}>
      <mesh><boxGeometry args={[0.05, 0.8, 1.4]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[-0.03, 0, 0]}><planeGeometry args={[0.01, 0.7, 1.3]} /><meshStandardMaterial color="#1a1a2e" emissive="#0066ff" emissiveIntensity={0.15} /></mesh>
    </group>

    {/* Kitchen area */}
    <group position={[0, 0, -2.5]}>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[2, 0.9, 0.6]} /><meshStandardMaterial color="#ecf0f1" /></mesh>
      <mesh position={[0, 0.92, 0]}><boxGeometry args={[2, 0.04, 0.65]} /><meshStandardMaterial color="#bdc3c7" roughness={0.2} metalness={0.3} /></mesh>
      {/* Sink */}
      <mesh position={[-0.3, 0.93, 0]}><cylinderGeometry args={[0.12, 0.12, 0.04, 16]} /><meshStandardMaterial color="#95a5a6" metalness={0.5} /></mesh>
      {/* Stove */}
      {[0.3, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.95, 0]}><cylinderGeometry args={[0.06, 0.06, 0.01, 16]} /><meshStandardMaterial color="#2c3e50" /></mesh>
      ))}
    </group>

    {/* Dining table & chairs */}
    <group position={[0, 0, 2]}>
      <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.5, 0.5, 0.04, 16]} /><meshStandardMaterial color="#8B4513" /></mesh>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.08, 0.12, 0.38, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      {[0, Math.PI / 2, Math.PI, 1.5 * Math.PI].map((a, i) => (
        <Chair3D key={i} position={[Math.cos(a) * 0.8, 0, 2 + Math.sin(a) * 0.8]} color="#8B4513" />
      ))}
    </group>

    {/* Ceiling light */}
    <pointLight position={[0, 2.8, 0]} intensity={0.8} distance={10} color="#fff5e0" />
    <mesh position={[0, 2.85, 0]}>
      <cylinderGeometry args={[0.15, 0.25, 0.1, 16]} />
      <meshStandardMaterial color="#ffeaa7" emissive="#ffeaa7" emissiveIntensity={0.5} />
    </mesh>

    {/* Floor lamp corner */}
    <Lamp3D position={[2.5, 0, 2.5]} color="#f39c12" />

    {/* Rug */}
    <Rug3D position={[-1.5, 0, 0]} color={houseColor} />

    {/* Wall clock */}
    <group position={[0, 2.2, -2.98]}>
      <mesh><circleGeometry args={[0.2, 32]} /><meshStandardMaterial color="#ecf0f1" side={THREE.DoubleSide} /></mesh>
      <mesh><ringGeometry args={[0.18, 0.21, 32]} /><meshStandardMaterial color="#2c3e50" side={THREE.DoubleSide} /></mesh>
    </group>

    {/* Potted plants */}
    <Plant3D position={[2.5, 0, -2.5]} color="#27ae60" />
    <Plant3D position={[-2.5, 0, -2.5]} color="#2ecc71" />
  </group>
);

// ============ ROOM SHELL ============
const RoomShell = ({ houseColor }: { houseColor: string }) => {
  const wallColor = useMemo(() => {
    const c = new THREE.Color(houseColor);
    c.lerp(new THREE.Color("#ffffff"), 0.5);
    return c;
  }, [houseColor]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#c4956a" roughness={0.8} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.5, -3]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh position={[3, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall with door gap */}
      <mesh position={[-1.75, 1.5, 3]}>
        <planeGeometry args={[2.5, 3]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.75, 1.5, 3]}>
        <planeGeometry args={[2.5, 3]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.5, 3]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Door frame */}
      <mesh position={[-0.52, 1, 3]}><boxGeometry args={[0.05, 2, 0.1]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0.52, 1, 3]}><boxGeometry args={[0.05, 2, 0.1]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0, 2.02, 3]}><boxGeometry args={[1.1, 0.05, 0.1]} /><meshStandardMaterial color="#5c3a1e" /></mesh>

      {/* Window on back wall */}
      <group position={[0, 1.8, -2.98]}>
        <mesh><planeGeometry args={[1.2, 0.8]} /><meshStandardMaterial color="#87CEEB" transparent opacity={0.5} emissive="#87CEEB" emissiveIntensity={0.2} side={THREE.DoubleSide} /></mesh>
        <mesh><boxGeometry args={[1.25, 0.04, 0.05]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.04, 0.85, 0.05]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      </group>

      {/* Baseboards */}
      <mesh position={[0, 0.05, -2.98]}><boxGeometry args={[6, 0.1, 0.04]} /><meshStandardMaterial color="#ddd" /></mesh>
      <mesh position={[-2.98, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[6, 0.1, 0.04]} /><meshStandardMaterial color="#ddd" /></mesh>
      <mesh position={[2.98, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[6, 0.1, 0.04]} /><meshStandardMaterial color="#ddd" /></mesh>
    </group>
  );
};

// ============ EXIT DOOR (clickable) ============
const ExitDoor = ({ onExit }: { onExit: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={[0, 0, 3.05]} onClick={(e) => { e.stopPropagation(); onExit(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.9, 2, 0.08]} />
        <meshStandardMaterial color={hovered ? "#c0392b" : "#8B4513"} emissive={hovered ? "#c0392b" : "#000"} emissiveIntensity={hovered ? 0.4 : 0} />
      </mesh>
      <mesh position={[0.3, 1, 0.05]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#ffd700" metalness={0.8} /></mesh>
      <Text position={[0, 2.3, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">
        🚪 Exit House
      </Text>
      {hovered && (
        <Text position={[0, 2.55, 0]} fontSize={0.09} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">
          Click to leave
        </Text>
      )}
    </group>
  );
};

// ============ CLICK PLANE FOR OBJECT PLACEMENT ============
const PlacementPlane = ({ active, onPlace }: { active: boolean; onPlace: (pos: [number, number, number]) => void }) => {
  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null);

  if (!active) return null;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          const p = e.point;
          if (Math.abs(p.x) < 2.8 && Math.abs(p.z) < 2.8) {
            onPlace([p.x, 0, p.z]);
          }
        }}
        onPointerMove={(e) => {
          const p = e.point;
          setHoverPos([p.x, 0.05, p.z]);
        }}
        onPointerLeave={() => setHoverPos(null)}
      >
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial />
      </mesh>
      {hoverPos && (
        <mesh position={hoverPos}>
          <ringGeometry args={[0.15, 0.2, 16]} />
          <meshBasicMaterial color="#3498db" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ============ MOVEMENT PLANE (click to move avatar) ============
const MovementPlane = ({ active, onMove }: { active: boolean; onMove: (pos: [number, number, number]) => void }) => {
  if (!active) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        const p = e.point;
        if (Math.abs(p.x) < 2.8 && Math.abs(p.z) < 2.8) {
          onMove([p.x, 0, p.z]);
        }
      }}
    >
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial />
    </mesh>
  );
};

// ============ INTERIOR AVATAR ============
const InteriorAvatar = ({ position, targetPosition, customization, name }: {
  position: [number, number, number];
  targetPosition: [number, number, number];
  customization: AvatarCustomization;
  name: string;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyColor = useMemo(() => new THREE.Color(customization.bodyColor), [customization.bodyColor]);
  const shirtColor = useMemo(() => new THREE.Color(customization.shirtColor), [customization.shirtColor]);

  useFrame(() => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    pos.x += (targetPosition[0] - pos.x) * 0.08;
    pos.z += (targetPosition[2] - pos.z) * 0.08;
    pos.y = 0.35;

    const dx = targetPosition[0] - pos.x;
    const dz = targetPosition[2] - pos.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const angle = Math.atan2(dx, dz);
      groupRef.current.rotation.y += (angle - groupRef.current.rotation.y) * 0.1;
    }
  });

  const headScale: [number, number, number] = customization.headShape === "oval" ? [1, 1.2, 1] : customization.headShape === "square" ? [1.1, 1, 1.1] : [1, 1, 1];

  return (
    <group ref={groupRef} position={[position[0], 0.35, position[2]]}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.15, 0.3, 8, 16]} />
        <meshStandardMaterial color={shirtColor} emissive={shirtColor} emissiveIntensity={0.15} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.35, 0]} castShadow scale={headScale}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.05, 0.38, 0.12]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.05, 0.38, 0.12]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.05, 0.38, 0.13]}><sphereGeometry args={[0.012, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.05, 0.38, 0.13]}><sphereGeometry args={[0.012, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      {/* Name */}
      <Text position={[0, 0.7, 0]} fontSize={0.08} color="white" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000000">
        {name}
      </Text>
      {/* Ground ring */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.24, 32]} />
        <meshBasicMaterial color={bodyColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ============ MAIN INTERIOR SCENE ============
const HouseInterior = ({ houseName, houseColor, messages, placedObjects, onPlaceObject, onExit, placingMode, userName, customization, avatarPosition, onAvatarMove }: HouseInteriorProps) => {
  const custom = customization || DEFAULT_CUSTOMIZATION;
  const [localAvatarPos, setLocalAvatarPos] = useState<[number, number, number]>(avatarPosition || [0, 0, 2]);
  const [targetPos, setTargetPos] = useState<[number, number, number]>(avatarPosition || [0, 0, 2]);

  const handlePlace = useCallback((pos: [number, number, number]) => {
    if (!placingMode) return;
    onPlaceObject({
      type: placingMode.type,
      position: pos,
      color: placingMode.color,
      placedBy: userName,
    });
  }, [placingMode, onPlaceObject, userName]);

  const handleAvatarMove = useCallback((pos: [number, number, number]) => {
    setTargetPos(pos);
    onAvatarMove?.(pos);
  }, [onAvatarMove]);

  return (
    <Canvas shadows camera={{ position: [0, 4, 6], fov: 55 }} style={{ background: "#1a1a2e" }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 5, 3]} intensity={0.6} castShadow />

      <RoomShell houseColor={houseColor} />
      <DefaultFurniture houseColor={houseColor} />
      <ExitDoor onExit={onExit} />

      {/* Interior Avatar */}
      <InteriorAvatar
        position={localAvatarPos}
        targetPosition={targetPos}
        customization={custom}
        name={userName}
      />

      {/* User-placed objects */}
      {placedObjects.map((obj) => (
        <PlacedObject3D key={obj.id} obj={obj} />
      ))}

      {/* Chat messages as floating bubbles */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}

      {/* Placement mode OR movement mode */}
      {placingMode ? (
        <PlacementPlane active={true} onPlace={handlePlace} />
      ) : (
        <MovementPlane active={true} onMove={handleAvatarMove} />
      )}

      {/* House name */}
      <Text position={[0, 2.8, -2.95]} fontSize={0.18} color="#333" anchorX="center">
        🏠 {houseName}
      </Text>

      <OrbitControls target={[targetPos[0], 1.2, targetPos[2]]} maxPolarAngle={Math.PI / 2} minDistance={2} maxDistance={8} enablePan={true} panSpeed={0.5} />
    </Canvas>
  );
};

export default HouseInterior;
