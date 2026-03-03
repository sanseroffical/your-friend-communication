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
}

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
      {/* Body / Shirt */}
      <mesh castShadow>
        <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
        <meshStandardMaterial
          color={shirtColor}
          emissive={hovered || isLocal ? shirtColor : new THREE.Color(0, 0, 0)}
          emissiveIntensity={hovered ? 0.3 : isLocal ? 0.15 : 0}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.55, 0]} castShadow scale={headScale}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.08, 0.6, 0.18]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.08, 0.6, 0.18]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.08, 0.6, 0.2]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.08, 0.6, 0.2]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>

      {/* Hat */}
      <Hat style={custom.hatStyle} color={custom.hatColor} />
      
      {/* Glasses */}
      <Glasses style={custom.glassesStyle} color={custom.glassesColor} />

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

      {/* Speaking indicator */}
      {user.isSpeaking && (
        <mesh position={[0.35, 0.8, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.8} />
        </mesh>
      )}

      {/* Name tag */}
      <Text
        position={[0, 1.1, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {user.name}
      </Text>

      {/* Chat bubble */}
      {showMessage && (
        <group position={[0, 1.5, 0]}>
          <mesh>
            <planeGeometry args={[Math.min(user.message!.length * 0.1 + 0.4, 3), 0.35]} />
            <meshBasicMaterial color="white" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.1} color="#333" anchorX="center" anchorY="middle" maxWidth={2.8}>
            {user.message!.slice(0, 50)}
          </Text>
        </group>
      )}

      {/* Selection ring for local */}
      {isLocal && (
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} />
          <meshBasicMaterial color={bodyColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ============ EXPANDED GROUND ============
const Ground = () => {
  return (
    <group>
      {/* Main ground - larger */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#4a7c59" roughness={0.9} />
      </mesh>

      {/* Plaza center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#c4a882" roughness={0.7} />
      </mesh>

      {/* Inner circle pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[3, 3.2, 64]} />
        <meshStandardMaterial color="#b09070" roughness={0.7} />
      </mesh>

      {/* Fountain */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.7, 0.4, 32]} />
        <meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.8, 16]} />
        <meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#66aadd" emissive="#4488bb" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>

      {/* Benches around center */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((angle, i) => (
        <group key={`bench-${i}`} position={[Math.cos(angle) * 10, 0, Math.sin(angle) * 10]} rotation={[0, -angle + Math.PI / 2, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[2, 0.08, 0.5]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
          <mesh position={[-0.8, 0.15, 0]} castShadow><boxGeometry args={[0.08, 0.3, 0.4]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
          <mesh position={[0.8, 0.15, 0]} castShadow><boxGeometry args={[0.08, 0.3, 0.4]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
          <mesh position={[0, 0.55, -0.22]} castShadow><boxGeometry args={[2, 0.5, 0.06]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
        </group>
      ))}

      {/* Gazebo area - right side */}
      <group position={[20, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[5, 6]} /><meshStandardMaterial color="#d4c4a8" roughness={0.6} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <group key={`pillar-${i}`}>
              <mesh position={[Math.cos(a) * 4.5, 1.5, Math.sin(a) * 4.5]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 3, 8]} /><meshStandardMaterial color="#ddd" roughness={0.4} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 3.2, 0]} castShadow><coneGeometry args={[5.5, 1.5, 6]} /><meshStandardMaterial color="#8B4513" roughness={0.7} /></mesh>
      </group>

      {/* Garden area - left side */}
      <group position={[-20, 0, 5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[6, 32]} /><meshStandardMaterial color="#3d6b40" roughness={0.9} /></mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = 3 + Math.sin(i * 2) * 1.5;
          return (
            <mesh key={`flower-${i}`} position={[Math.cos(a) * r, 0.3, Math.sin(a) * r]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshStandardMaterial color={["#ff6b6b", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"][i % 5]} />
            </mesh>
          );
        })}
      </group>

      {/* Stage / amphitheater area - back */}
      <group position={[0, 0, -22]}>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[8, 0.6, 5]} /><meshStandardMaterial color="#666" roughness={0.5} /></mesh>
        <mesh position={[0, 0.65, -2]} castShadow><boxGeometry args={[6, 0.1, 1]} /><meshStandardMaterial color="#888" roughness={0.5} /></mesh>
        {/* Audience seats */}
        {[-1, 0, 1].map((row) => (
          <mesh key={`seat-${row}`} position={[0, 0.15 + row * 0.15, 5 + row * 2]} castShadow>
            <boxGeometry args={[10, 0.3, 1.5]} /><meshStandardMaterial color="#555" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Marketplace stalls - front-right */}
      {[0, 1, 2].map((i) => (
        <group key={`stall-${i}`} position={[15 + i * 5, 0, 18]}>
          <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[3, 2, 2]} /><meshStandardMaterial color="#c4956a" roughness={0.8} /></mesh>
          <mesh position={[0, 2.3, 0]} castShadow><boxGeometry args={[3.5, 0.1, 2.5]} /><meshStandardMaterial color={["#e74c3c", "#3498db", "#2ecc71"][i]} roughness={0.6} /></mesh>
        </group>
      ))}

      {/* Trees - scattered around edges */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2 + 0.2;
        const dist = 25 + Math.sin(i * 3) * 5;
        const height = 2.5 + Math.random() * 2;
        return (
          <group key={`tree-${i}`} position={[Math.cos(angle) * dist, 0, Math.sin(angle) * dist]}>
            <mesh position={[0, height / 2, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, height, 8]} />
              <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
            </mesh>
            <mesh position={[0, height + 1, 0]} castShadow>
              <sphereGeometry args={[1.5 + Math.random() * 0.5, 8, 8]} />
              <meshStandardMaterial color={i % 3 === 0 ? "#1a4d1a" : "#2d5a1e"} roughness={0.8} />
            </mesh>
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

      {/* Pond area */}
      <group position={[-15, 0, -15]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[4, 32]} />
          <meshStandardMaterial color="#2980b9" transparent opacity={0.7} roughness={0.1} metalness={0.3} />
        </mesh>
        {/* Lily pads */}
        {[0, 1, 2].map((i) => (
          <mesh key={`lily-${i}`} rotation={[-Math.PI / 2, 0, i * 2]} position={[Math.cos(i * 2) * 2, 0.04, Math.sin(i * 2) * 2]}>
            <circleGeometry args={[0.4, 16]} />
            <meshStandardMaterial color="#27ae60" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ============ CLICK PLANE ============
const ClickPlane = ({ onMove }: { onMove: (point: THREE.Vector3) => void }) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        const point = e.point;
        const dist = Math.sqrt(point.x * point.x + point.z * point.z);
        if (dist < 35) onMove(point);
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
}

const PlazaScene = ({ localUser, remoteUsers, onMove, onUserClick }: PlazaSceneProps) => {
  const handleMove = useCallback((point: THREE.Vector3) => {
    onMove([point.x, 0, point.z]);
  }, [onMove]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 15, 15], fov: 50 }}
      style={{ background: "#87CEEB" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <Sky sunPosition={[100, 50, 100]} />

      <Ground />
      <ClickPlane onMove={handleMove} />

      <Avatar user={localUser} isLocal={true} />
      {remoteUsers.map((user) => (
        <Avatar
          key={user.id}
          user={user}
          isLocal={false}
          onClick={() => onUserClick(user.id)}
        />
      ))}

      <OrbitControls
        target={[localUser.targetPosition[0], 0.5, localUser.targetPosition[2]]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={30}
        enablePan={false}
      />
    </Canvas>
  );
};

export default PlazaScene;
