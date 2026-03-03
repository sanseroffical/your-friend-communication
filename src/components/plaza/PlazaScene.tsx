import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Sky, Environment, Plane } from "@react-three/drei";
import * as THREE from "three";

interface PlazaUser {
  id: string;
  name: string;
  avatarColor: string;
  position: [number, number, number];
  targetPosition: [number, number, number];
  message?: string;
  messageTime?: number;
}

interface AvatarProps {
  user: PlazaUser;
  isLocal: boolean;
  onClick?: () => void;
}

const Avatar = ({ user, isLocal, onClick }: AvatarProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const bobOffset = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth movement towards target
    const pos = groupRef.current.position;
    const [tx, ty, tz] = user.targetPosition;
    pos.x += (tx - pos.x) * 0.05;
    pos.z += (tz - pos.z) * 0.05;

    // Bob animation
    const bob = Math.sin(state.clock.elapsedTime * 2 + bobOffset.current) * 0.05;
    pos.y = 0.5 + bob;

    // Face movement direction
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const angle = Math.atan2(dx, dz);
      groupRef.current.rotation.y += (angle - groupRef.current.rotation.y) * 0.1;
    }
  });

  const color = useMemo(() => new THREE.Color(user.avatarColor), [user.avatarColor]);
  const showMessage = user.message && user.messageTime && Date.now() - user.messageTime < 5000;

  return (
    <group
      ref={groupRef}
      position={[user.position[0], 0.5, user.position[2]]}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Body */}
      <mesh ref={bodyRef} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={hovered || isLocal ? color : new THREE.Color(0, 0, 0)}
          emissiveIntensity={hovered ? 0.3 : isLocal ? 0.15 : 0}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.08, 0.6, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.08, 0.6, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.08, 0.6, 0.2]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.08, 0.6, 0.2]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>

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
        <group position={[0, 1.4, 0]}>
          <mesh>
            <planeGeometry args={[Math.min(user.message!.length * 0.1 + 0.4, 3), 0.35]} />
            <meshBasicMaterial color="white" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.1}
            color="#333"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.8}
          >
            {user.message!.slice(0, 50)}
          </Text>
        </group>
      )}

      {/* Selection ring for local */}
      {isLocal && (
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const Ground = () => {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[20, 64]} />
        <meshStandardMaterial color="#4a7c59" roughness={0.9} />
      </mesh>

      {/* Plaza center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#c4a882" roughness={0.7} />
      </mesh>

      {/* Inner circle pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[2, 2.2, 64]} />
        <meshStandardMaterial color="#b09070" roughness={0.7} />
      </mesh>

      {/* Fountain base */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.4, 0.4, 32]} />
        <meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 16]} />
        <meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Benches */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <group key={i} position={[Math.cos(angle) * 8, 0, Math.sin(angle) * 8]} rotation={[0, -angle + Math.PI / 2, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[2, 0.08, 0.5]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
          <mesh position={[-0.8, 0.15, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.4]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
          <mesh position={[0.8, 0.15, 0]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.4]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Trees */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const angle = (i / 8) * Math.PI * 2 + 0.3;
        const dist = 12 + Math.sin(i * 3) * 2;
        return (
          <group key={`tree-${i}`} position={[Math.cos(angle) * dist, 0, Math.sin(angle) * dist]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 3, 8]} />
              <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
            </mesh>
            <mesh position={[0, 3.5, 0]} castShadow>
              <sphereGeometry args={[1.5, 8, 8]} />
              <meshStandardMaterial color="#2d5a1e" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

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
        if (dist < 18) {
          onMove(point);
        }
      }}
    >
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial />
    </mesh>
  );
};

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
      camera={{ position: [0, 12, 12], fov: 50 }}
      style={{ background: "#87CEEB" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
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
        maxDistance={20}
        enablePan={false}
      />
    </Canvas>
  );
};

export default PlazaScene;
