import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Sky, Stars } from "@react-three/drei";
import * as THREE from "three";

// ============ TIME OF DAY HELPER ============
const getTimeOfDay = () => {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
};

const getTimeColors = (hours: number) => {
  if (hours < 5 || hours >= 21) {
    return {
      skyColor: "#0a0a2e", ambientIntensity: 0.08, ambientColor: "#2233aa",
      dirIntensity: 0.05, dirColor: "#4466aa",
      sunPosition: [0, -50, 100] as [number, number, number],
      fogColor: "#0a0a2e", lampIntensity: 0.8, showStars: true, sunsetFactor: 0,
    };
  }
  if (hours < 7) {
    const t = (hours - 5) / 2;
    return {
      skyColor: `#${Math.round(0x0a + t * (0x87 - 0x0a)).toString(16).padStart(2, '0')}${Math.round(0x0a + t * (0xCE - 0x0a)).toString(16).padStart(2, '0')}${Math.round(0x2e + t * (0xEB - 0x2e)).toString(16).padStart(2, '0')}`,
      ambientIntensity: 0.08 + t * 0.42, ambientColor: "#ffccaa",
      dirIntensity: 0.05 + t * 0.95, dirColor: "#ffaa77",
      sunPosition: [100 * t, 10 + t * 40, 100] as [number, number, number],
      fogColor: "#ffddbb", lampIntensity: 0.8 - t * 0.7, showStars: t < 0.3, sunsetFactor: 1 - t,
    };
  }
  if (hours < 17) {
    return {
      skyColor: "#87CEEB", ambientIntensity: 0.5, ambientColor: "#ffffff",
      dirIntensity: 1, dirColor: "#ffffff",
      sunPosition: [100, 50 + Math.sin((hours - 7) / 10 * Math.PI) * 50, 100] as [number, number, number],
      fogColor: "#87CEEB", lampIntensity: 0, showStars: false, sunsetFactor: 0,
    };
  }
  if (hours < 19) {
    const t = (hours - 17) / 2;
    return {
      skyColor: `#${Math.round(0x87 - t * (0x87 - 0x1a)).toString(16).padStart(2, '0')}${Math.round(0xCE - t * (0xCE - 0x0a)).toString(16).padStart(2, '0')}${Math.round(0xEB - t * (0xEB - 0x3e)).toString(16).padStart(2, '0')}`,
      ambientIntensity: 0.5 - t * 0.35, ambientColor: "#ffaa66",
      dirIntensity: 1 - t * 0.8, dirColor: "#ff7744",
      sunPosition: [100 * (1 - t), 50 - t * 60, 100] as [number, number, number],
      fogColor: "#ff8844", lampIntensity: t * 0.8, showStars: t > 0.7, sunsetFactor: t,
    };
  }
  const t = (hours - 19) / 2;
  return {
    skyColor: `#${Math.round(0x1a - t * (0x1a - 0x0a)).toString(16).padStart(2, '0')}${Math.round(0x0a).toString(16).padStart(2, '0')}${Math.round(0x3e - t * (0x3e - 0x2e)).toString(16).padStart(2, '0')}`,
    ambientIntensity: 0.15 - t * 0.07, ambientColor: "#3344aa",
    dirIntensity: 0.2 - t * 0.15, dirColor: "#4466aa",
    sunPosition: [0, -10 - t * 40, 100] as [number, number, number],
    fogColor: "#0a0a2e", lampIntensity: 0.8, showStars: true, sunsetFactor: 0,
  };
};

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

export interface UserHouse {
  id: string;
  user_id: string;
  house_name: string;
  house_color: string;
  house_style: string;
  position_x: number;
  position_z: number;
  owner_name?: string;
}

// ============ WEATHER TYPES ============
export type WeatherType = "clear" | "rain" | "snow" | "cloudy" | "storm";

interface WeatherState {
  type: WeatherType;
  intensity: number; // 0-1
  temperature: number;
  windSpeed: number;
}

// Fetch real weather, fallback to simulated
export const fetchWeather = async (): Promise<WeatherState> => {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    const { latitude, longitude } = pos.coords;
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m`);
    const data = await res.json();
    const code = data.current?.weather_code || 0;
    const temp = data.current?.temperature_2m || 20;
    const wind = data.current?.wind_speed_10m || 0;
    
    let type: WeatherType = "clear";
    let intensity = 0;
    if (code >= 95) { type = "storm"; intensity = 0.9; }
    else if (code >= 61) { type = "rain"; intensity = 0.7; }
    else if (code >= 51) { type = "rain"; intensity = 0.4; }
    else if (code >= 71) { type = "snow"; intensity = 0.6; }
    else if (code >= 41 && code <= 49) { type = "cloudy"; intensity = 0.6; }
    else if (code >= 1 && code <= 3) { type = "cloudy"; intensity = 0.3; }
    
    if (temp <= 0 && type === "rain") { type = "snow"; }
    
    return { type, intensity, temperature: temp, windSpeed: wind };
  } catch {
    // Simulated fallback
    return getSimulatedWeather();
  }
};

const getSimulatedWeather = (): WeatherState => {
  const hour = new Date().getHours();
  const seed = Math.floor(Date.now() / (1000 * 60 * 30)); // changes every 30 min
  const rng = (seed * 9301 + 49297) % 233280;
  const val = rng / 233280;
  
  if (val < 0.4) return { type: "clear", intensity: 0, temperature: 22, windSpeed: 5 };
  if (val < 0.6) return { type: "cloudy", intensity: 0.4, temperature: 18, windSpeed: 8 };
  if (val < 0.8) return { type: "rain", intensity: 0.5, temperature: 15, windSpeed: 12 };
  if (val < 0.9) return { type: "snow", intensity: 0.5, temperature: -2, windSpeed: 6 };
  return { type: "storm", intensity: 0.8, temperature: 12, windSpeed: 25 };
};

// ============ WEATHER PARTICLES ============
const RainParticles = ({ intensity }: { intensity: number }) => {
  const count = Math.floor(intensity * 2000);
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = (pos as any).array[i * 3 + 1];
      y -= 0.5 + intensity * 0.3;
      if (y < 0) y = 25 + Math.random() * 5;
      (pos as any).array[i * 3 + 1] = y;
      (pos as any).array[i * 3] += (Math.random() - 0.5) * 0.02;
    }
    pos.needsUpdate = true;
  });

  if (count === 0) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#aaccff" size={0.08} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

const SnowParticles = ({ intensity }: { intensity: number }) => {
  const count = Math.floor(intensity * 1500);
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = (pos as any).array[i * 3 + 1];
      y -= 0.08 + intensity * 0.05;
      if (y < 0) y = 25 + Math.random() * 5;
      (pos as any).array[i * 3 + 1] = y;
      (pos as any).array[i * 3] += Math.sin(t + i) * 0.01;
      (pos as any).array[i * 3 + 2] += Math.cos(t * 0.7 + i) * 0.01;
    }
    pos.needsUpdate = true;
  });

  if (count === 0) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.15} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
};

const CloudLayer = ({ intensity }: { intensity: number }) => {
  const clouds = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; scale: number; opacity: number }> = [];
    const count = Math.floor(5 + intensity * 15);
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: [(Math.random() - 0.5) * 100, 18 + Math.random() * 8, (Math.random() - 0.5) * 100],
        scale: 3 + Math.random() * 8,
        opacity: 0.3 + intensity * 0.4,
      });
    }
    return arr;
  }, [intensity]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.x += 0.003 * (1 + (i % 3) * 0.5);
        if (child.position.x > 60) child.position.x = -60;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.pos}>
          <sphereGeometry args={[cloud.scale, 8, 6]} />
          <meshBasicMaterial color="#cccccc" transparent opacity={cloud.opacity} />
        </mesh>
      ))}
    </group>
  );
};

// ============ COLLISION & INTERACTION ============
interface CollisionZone {
  type: "circle" | "box";
  x: number;
  z: number;
  radius?: number;
  halfW?: number;
  halfD?: number;
}

const STATIC_COLLISION_ZONES: CollisionZone[] = [
  // === TOWN CENTER ===
  { type: "circle", x: 0, z: 0, radius: 2 },       // Fountain
  { type: "circle", x: 20, z: 0, radius: 5.5 },     // Gazebo
  { type: "circle", x: -15, z: -15, radius: 4.5 },   // Pond
  { type: "box", x: 0, z: -28, halfW: 5, halfD: 3.5 }, // Stage
  { type: "circle", x: 12, z: -8, radius: 1.5 },     // Jukebox
  { type: "circle", x: -10, z: 8, radius: 1.5 },     // Bulletin
  { type: "box", x: 15, z: 22, halfW: 2, halfD: 1.5 },  // Game stations
  { type: "box", x: 20, z: 22, halfW: 2, halfD: 1.5 },
  { type: "box", x: 25, z: 22, halfW: 2, halfD: 1.5 },
  { type: "circle", x: -30, z: 20, radius: 3 },      // Park pond
  { type: "box", x: 35, z: 10, halfW: 4, halfD: 3 }, // Library
  { type: "circle", x: -35, z: -25, radius: 6 },     // Amphitheater

  // === DESERT BIOME (NE quadrant ~60-100, 0-100) ===
  { type: "circle", x: 75, z: 30, radius: 3 },   // Oasis pond
  { type: "circle", x: 80, z: 15, radius: 1.5 },  // Pyramid 1
  { type: "circle", x: 90, z: 25, radius: 2 },    // Pyramid 2
  { type: "circle", x: 70, z: 10, radius: 1.2 },  // Cactus cluster 1
  { type: "circle", x: 85, z: 35, radius: 1.2 },  // Cactus cluster 2
  { type: "box", x: 75, z: 45, halfW: 3, halfD: 2 }, // Desert ruins

  // === SNOW BIOME (NW quadrant ~-60 to -100, 0-100) ===
  { type: "circle", x: -75, z: 25, radius: 5 },  // Frozen lake
  { type: "circle", x: -80, z: 10, radius: 2 },   // Igloo 1
  { type: "circle", x: -70, z: 40, radius: 2 },   // Igloo 2
  { type: "box", x: -85, z: 35, halfW: 2.5, halfD: 2.5 }, // Ice castle
  { type: "circle", x: -65, z: 15, radius: 1.5 }, // Snowman

  // === BEACH BIOME (SE quadrant ~60-100, -60 to -100) ===
  { type: "circle", x: 75, z: -70, radius: 8 },   // Ocean water
  { type: "box", x: 70, z: -55, halfW: 2, halfD: 1.5 }, // Beach shack
  { type: "circle", x: 80, z: -55, radius: 1 },    // Palm 1
  { type: "circle", x: 85, z: -60, radius: 1 },    // Palm 2
  { type: "circle", x: 65, z: -60, radius: 1 },    // Palm 3
  { type: "box", x: 90, z: -50, halfW: 1.5, halfD: 1 }, // Surfboard rack

  // === VOLCANIC BIOME (SW quadrant ~-60 to -100, -60 to -100) ===
  { type: "circle", x: -75, z: -70, radius: 6 },  // Volcano
  { type: "circle", x: -80, z: -55, radius: 3 },  // Lava pool 1
  { type: "circle", x: -65, z: -60, radius: 2.5 }, // Lava pool 2
  { type: "circle", x: -70, z: -85, radius: 2 },   // Obsidian formation
  { type: "circle", x: -85, z: -80, radius: 1.5 }, // Fire geyser

  // === FOREST BIOME (N center ~-30 to 30, 50-100) ===
  { type: "circle", x: 0, z: 75, radius: 3 },     // Ancient tree
  { type: "circle", x: -15, z: 70, radius: 2 },   // Mushroom ring
  { type: "circle", x: 15, z: 80, radius: 2 },    // Fairy pond
  { type: "box", x: -10, z: 85, halfW: 2, halfD: 2 }, // Treehouse
  { type: "box", x: 10, z: 90, halfW: 2, halfD: 1.5 }, // Log cabin
];

// Dynamic collision zones for user houses
let dynamicCollisionZones: CollisionZone[] = [];
let dynamicInteractZones: Array<{ id: string; x: number; z: number; radius: number }> = [];

export const setDynamicHouses = (houses: UserHouse[]) => {
  dynamicCollisionZones = houses.map(h => ({
    type: "box" as const, x: h.position_x, z: h.position_z, halfW: 3, halfD: 3,
  }));
  dynamicInteractZones = houses.map(h => ({
    id: `user-house-${h.user_id}`, x: h.position_x, z: h.position_z, radius: 5,
  }));
};

export const checkCollision = (x: number, z: number): boolean => {
  const allZones = [...STATIC_COLLISION_ZONES, ...dynamicCollisionZones];
  for (const zone of allZones) {
    if (zone.type === "circle") {
      const dx = x - zone.x;
      const dz = z - zone.z;
      if (Math.sqrt(dx * dx + dz * dz) < (zone.radius || 1)) return true;
    } else {
      if (Math.abs(x - zone.x) < (zone.halfW || 1) && Math.abs(z - zone.z) < (zone.halfD || 1)) return true;
    }
  }
  // Expanded world boundary
  if (Math.abs(x) > 105 || Math.abs(z) > 105) return true;
  return false;
};

export type InteractableId = string;

const STATIC_INTERACT_ZONES: Array<{ id: InteractableId; x: number; z: number; radius: number }> = [
  { id: "jukebox", x: 12, z: -8, radius: 3 },
  { id: "bulletin", x: -10, z: 8, radius: 3 },
  { id: "game-station-1", x: 15, z: 22, radius: 3 },
  { id: "game-station-2", x: 20, z: 22, radius: 3 },
  { id: "game-station-3", x: 25, z: 22, radius: 3 },
];

export const getNearbyInteractable = (x: number, z: number): InteractableId | null => {
  const allZones = [...STATIC_INTERACT_ZONES, ...dynamicInteractZones];
  for (const zone of allZones) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (Math.sqrt(dx * dx + dz * dz) < zone.radius) return zone.id;
  }
  return null;
};

// ============ EMOTE ============
const EMOTE_MAP: Record<string, string> = {
  wave: "👋", dance: "💃", clap: "👏", laugh: "😂",
  heart: "❤️", thumbsup: "👍", fire: "🔥", sad: "😢",
  party: "🎉", think: "🤔", cool: "😎", music: "🎵",
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
      <Text fontSize={0.4} anchorX="center" anchorY="middle">{EMOTE_MAP[emote]}</Text>
    </group>
  );
};

export { EMOTE_MAP };

// ============ HAT ============
const Hat = ({ style, color }: { style: string; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  if (style === "none") return null;
  if (style === "tophat") return (
    <group position={[0, 0.85, 0]}>
      <mesh><cylinderGeometry args={[0.18, 0.18, 0.3, 16]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04, 16]} /><meshStandardMaterial color={col} /></mesh>
    </group>
  );
  if (style === "cap") return (
    <group position={[0, 0.72, 0.05]}>
      <mesh><sphereGeometry args={[0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0, -0.02, 0.18]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.2, 0.02, 0.15]} /><meshStandardMaterial color={col} /></mesh>
    </group>
  );
  if (style === "beanie") return (
    <group position={[0, 0.78, 0]}>
      <mesh><sphereGeometry args={[0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color={col} /></mesh>
    </group>
  );
  if (style === "crown") return (
    <group position={[0, 0.82, 0]}>
      <mesh><cylinderGeometry args={[0.22, 0.25, 0.15, 5]} /><meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} /></mesh>
    </group>
  );
  if (style === "halo") return (
    <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.25, 0.03, 8, 32]} />
      <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
    </mesh>
  );
  return null;
};

// ============ GLASSES ============
const Glasses = ({ style, color }: { style: string; color: string }) => {
  const col = useMemo(() => new THREE.Color(color), [color]);
  if (style === "none") return null;
  const lensRadius = style === "round" ? 0.06 : 0.05;
  const isSunglasses = style === "sunglasses";
  if (style === "monocle") return (
    <group position={[0.08, 0.6, 0.18]}>
      <mesh><torusGeometry args={[0.06, 0.008, 8, 16]} /><meshStandardMaterial color={col} /></mesh>
    </group>
  );
  return (
    <group position={[0, 0.6, 0.18]}>
      <mesh position={[-0.08, 0, 0]}><torusGeometry args={[lensRadius, 0.006, 8, 16]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0.08, 0, 0]}><torusGeometry args={[lensRadius, 0.006, 8, 16]} /><meshStandardMaterial color={col} /></mesh>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.04, 0.006, 0.006]} /><meshStandardMaterial color={col} /></mesh>
      {isSunglasses && <>
        <mesh position={[-0.08, 0, -0.005]}><circleGeometry args={[lensRadius, 16]} /><meshStandardMaterial color="#111" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0.08, 0, -0.005]}><circleGeometry args={[lensRadius, 16]} /><meshStandardMaterial color="#111" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      </>}
    </group>
  );
};

// ============ AVATAR ============
interface AvatarProps { user: PlazaUser; isLocal: boolean; onClick?: () => void; }

const Avatar = ({ user, isLocal, onClick }: AvatarProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const bobOffset = useRef(Math.random() * Math.PI * 2);
  const custom = user.customization || DEFAULT_CUSTOMIZATION;

  const isDancing = user.emote === "dance" && user.emoteTime && Date.now() - user.emoteTime < 5000;
  const isWaving = user.emote === "wave" && user.emoteTime && Date.now() - user.emoteTime < 3000;
  const isClapping = user.emote === "clap" && user.emoteTime && Date.now() - user.emoteTime < 3000;
  const isLaughing = user.emote === "laugh" && user.emoteTime && Date.now() - user.emoteTime < 3000;
  const isParty = user.emote === "party" && user.emoteTime && Date.now() - user.emoteTime < 4000;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const pos = groupRef.current.position;
    const [tx, , tz] = user.targetPosition;
    pos.x += (tx - pos.x) * 0.05;
    pos.z += (tz - pos.z) * 0.05;

    if (isDancing || isParty) {
      // Dance: aggressive bobbing + spinning
      const danceSpeed = isParty ? 6 : 4;
      pos.y = 0.5 + Math.abs(Math.sin(t * danceSpeed)) * 0.35;
      groupRef.current.rotation.y += (isParty ? 0.08 : 0.05);
      // Body tilt side-to-side
      if (bodyRef.current) {
        bodyRef.current.rotation.z = Math.sin(t * danceSpeed * 1.5) * 0.25;
        bodyRef.current.rotation.x = Math.cos(t * danceSpeed) * 0.1;
      }
      // Head bop
      if (headRef.current) {
        headRef.current.rotation.z = Math.sin(t * danceSpeed * 2) * 0.15;
        headRef.current.position.y = 0.55 + Math.sin(t * danceSpeed * 2) * 0.03;
      }
    } else if (isWaving) {
      pos.y = 0.5 + Math.sin(t * 2 + bobOffset.current) * 0.05;
      // Gentle side lean
      if (bodyRef.current) {
        bodyRef.current.rotation.z = Math.sin(t * 5) * 0.12;
        bodyRef.current.rotation.x = 0;
      }
      if (headRef.current) {
        headRef.current.rotation.z = Math.sin(t * 5) * 0.08;
        headRef.current.position.y = 0.55;
      }
    } else if (isClapping) {
      pos.y = 0.5 + Math.abs(Math.sin(t * 8)) * 0.05;
      if (bodyRef.current) {
        bodyRef.current.rotation.z = 0;
        bodyRef.current.rotation.x = Math.sin(t * 8) * 0.06;
      }
      if (headRef.current) {
        headRef.current.position.y = 0.55 + Math.abs(Math.sin(t * 8)) * 0.02;
        headRef.current.rotation.z = 0;
      }
    } else if (isLaughing) {
      pos.y = 0.5 + Math.random() * 0.03;
      if (bodyRef.current) {
        bodyRef.current.rotation.x = Math.sin(t * 10) * 0.08;
        bodyRef.current.rotation.z = 0;
      }
      if (headRef.current) {
        headRef.current.rotation.x = -0.15 + Math.sin(t * 10) * 0.1;
        headRef.current.rotation.z = 0;
        headRef.current.position.y = 0.55;
      }
    } else {
      // Normal idle
      pos.y = 0.5 + Math.sin(t * 2 + bobOffset.current) * 0.05;
      if (bodyRef.current) { bodyRef.current.rotation.z = 0; bodyRef.current.rotation.x = 0; }
      if (headRef.current) { headRef.current.rotation.z = 0; headRef.current.rotation.x = 0; headRef.current.position.y = 0.55; }
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        const angle = Math.atan2(dx, dz);
        groupRef.current.rotation.y += (angle - groupRef.current.rotation.y) * 0.1;
      }
    }
  });

  const bodyColor = useMemo(() => new THREE.Color(custom.bodyColor), [custom.bodyColor]);
  const shirtColor = useMemo(() => new THREE.Color(custom.shirtColor), [custom.shirtColor]);
  const showMessage = user.message && user.messageTime && Date.now() - user.messageTime < 5000;
  const headScale: [number, number, number] = custom.headShape === "oval" ? [1, 1.2, 1] : custom.headShape === "square" ? [1.1, 1, 1.1] : [1, 1, 1];

  return (
    <group ref={groupRef} position={[user.position[0], 0.5, user.position[2]]} onClick={onClick}
      onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh ref={bodyRef} castShadow><capsuleGeometry args={[0.25, 0.5, 8, 16]} /><meshStandardMaterial color={shirtColor} emissive={hovered || isLocal ? shirtColor : new THREE.Color(0, 0, 0)} emissiveIntensity={hovered ? 0.3 : isLocal ? 0.15 : 0} /></mesh>
      <mesh ref={headRef} position={[0, 0.55, 0]} castShadow scale={headScale}><sphereGeometry args={[0.22, 16, 16]} /><meshStandardMaterial color={bodyColor} /></mesh>
      {/* Disco floor effect when dancing */}
      {isDancing && (
        <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 0.6, 32]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.3 + Math.sin(Date.now() * 0.01) * 0.2} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[-0.08, 0.6, 0.18]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[0.08, 0.6, 0.18]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="white" /></mesh>
      <mesh position={[-0.08, 0.6, 0.2]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.08, 0.6, 0.2]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <Hat style={custom.hatStyle} color={custom.hatColor} />
      <Glasses style={custom.glassesStyle} color={custom.glassesColor} />
      <EmoteDisplay emote={user.emote} emoteTime={user.emoteTime} />
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
        <mesh position={[0.35, 0.8, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.8} /></mesh>
      )}
      <Text position={[0, 1.1, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">{user.name}</Text>
      {showMessage && (
        <group position={[0, 1.5, 0]}>
          <mesh><planeGeometry args={[Math.min(user.message!.length * 0.1 + 0.4, 3), 0.35]} /><meshBasicMaterial color="white" transparent opacity={0.9} side={THREE.DoubleSide} /></mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.1} color="#333" anchorX="center" anchorY="middle" maxWidth={2.8}>{user.message!.slice(0, 50)}</Text>
        </group>
      )}
      {isLocal && (
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} /><meshBasicMaterial color={bodyColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ============ INTERACTIVE OBJECTS ============
const Jukebox = ({ onClick }: { onClick: () => void }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  return (
    <group ref={ref} position={[12, 0, -8]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[1.2, 2, 0.8]} /><meshStandardMaterial color="#8B0000" roughness={0.4} metalness={0.3} emissive="#ff4444" emissiveIntensity={hovered ? 0.5 : 0.2} /></mesh>
      <mesh position={[0, 2.2, 0]} castShadow><cylinderGeometry args={[0.6, 0.6, 0.3, 16, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#ffd700" metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[0, 0.7, 0.41]}><planeGeometry args={[0.8, 0.6]} /><meshStandardMaterial color="#333" /></mesh>
      <Text position={[0.8, 2.5, 0]} fontSize={0.3} anchorX="center">🎵</Text>
      <Text position={[-0.5, 2.8, 0]} fontSize={0.25} anchorX="center">🎶</Text>
      <Text position={[0, 2.8, 0.5]} fontSize={0.15} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">JUKEBOX</Text>
      {hovered && <Text position={[0, 3.2, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">Click to play music!</Text>}
    </group>
  );
};

const BulletinBoard = ({ onClick }: { onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={[-10, 0, 8]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[0.15, 2, 0.15]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0, 2.2, 0]} castShadow><boxGeometry args={[0.15, 2, 0.15]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0, 2.2, 0.1]} castShadow><boxGeometry args={[2.5, 1.8, 0.1]} /><meshStandardMaterial color="#d2691e" roughness={0.8} emissive={hovered ? "#443322" : "#000"} emissiveIntensity={0.3} /></mesh>
      <mesh position={[0, 2.2, 0.16]}><boxGeometry args={[2.6, 1.9, 0.02]} /><meshStandardMaterial color="#8B4513" /></mesh>
      <mesh position={[-0.5, 2.5, 0.18]}><planeGeometry args={[0.6, 0.5]} /><meshStandardMaterial color="#fffacd" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.4, 2.0, 0.18]}><planeGeometry args={[0.5, 0.4]} /><meshStandardMaterial color="#98fb98" side={THREE.DoubleSide} /></mesh>
      <mesh position={[-0.3, 1.7, 0.18]}><planeGeometry args={[0.55, 0.45]} /><meshStandardMaterial color="#ffb6c1" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.5, 2.6, 0.18]}><planeGeometry args={[0.5, 0.4]} /><meshStandardMaterial color="#add8e6" side={THREE.DoubleSide} /></mesh>
      {[[-0.5, 2.7], [0.4, 2.2], [-0.3, 1.9], [0.5, 2.8]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color={["#e74c3c", "#3498db", "#f39c12", "#2ecc71"][i]} /></mesh>
      ))}
      <Text position={[0, 3.3, 0.1]} fontSize={0.18} color="#8B4513" anchorX="center" outlineWidth={0.01} outlineColor="#000">📋 BULLETIN BOARD</Text>
      {hovered && <Text position={[0, 3.6, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">Click to read announcements!</Text>}
    </group>
  );
};

const GameStation = ({ position, gameLabel, color, onClick }: { position: [number, number, number]; gameLabel: string; color: string; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[3, 2, 2]} /><meshStandardMaterial color="#c4956a" roughness={0.8} /></mesh>
      <mesh position={[0, 2.3, 0]} castShadow><boxGeometry args={[3.5, 0.1, 2.5]} /><meshStandardMaterial color={color} roughness={0.6} emissive={hovered ? color : "#000"} emissiveIntensity={0.3} /></mesh>
      <mesh position={[0, 1.3, 1.01]}><planeGeometry args={[1.5, 0.8]} /><meshStandardMaterial color="#111" emissive="#0066ff" emissiveIntensity={0.4 + (hovered ? 0.3 : 0)} /></mesh>
      <Text position={[0, 1.3, 1.02]} fontSize={0.15} color="#0ff" anchorX="center">{gameLabel}</Text>
      <Text position={[0, 2.8, 0]} fontSize={0.12} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">🎮 {gameLabel}</Text>
      {hovered && <Text position={[0, 3.2, 0]} fontSize={0.11} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">Click to play!</Text>}
    </group>
  );
};

// User-owned house
const UserHouse3D = ({ house, onClick }: { house: UserHouse; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const pos: [number, number, number] = [house.position_x, 0, house.position_z];
  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[4, 3, 4]} /><meshStandardMaterial color={house.house_color} roughness={0.7} emissive={hovered ? house.house_color : "#000"} emissiveIntensity={0.15} /></mesh>
      <mesh position={[0, 3.5, 0]} castShadow><coneGeometry args={[3.5, 2, 4]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
      <mesh position={[0, 0.8, 2.01]}><boxGeometry args={[0.8, 1.6, 0.05]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0.25, 0.8, 2.05]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#ffd700" metalness={0.8} /></mesh>
      {[[-1.2, 2, 2.01], [1.2, 2, 2.01]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><planeGeometry args={[0.6, 0.6]} /><meshStandardMaterial color="#87CEEB" transparent opacity={0.6} emissive="#ffeaa7" emissiveIntensity={0.3} side={THREE.DoubleSide} /></mesh>
      ))}
      <mesh position={[1, 4, -1]} castShadow><boxGeometry args={[0.5, 1, 0.5]} /><meshStandardMaterial color="#666" /></mesh>
      {/* Mailbox */}
      <group position={[2.5, 0, 2]}>
        <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.05, 0.05, 0.8, 8]} /><meshStandardMaterial color="#555" /></mesh>
        <mesh position={[0, 0.85, 0]}><boxGeometry args={[0.3, 0.2, 0.15]} /><meshStandardMaterial color="#e74c3c" /></mesh>
      </group>
      <Text position={[0, 5, 0]} fontSize={0.15} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">🏠 {house.house_name}</Text>
      <Text position={[0, 4.7, 0]} fontSize={0.1} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">{house.owner_name || "User"}'s House</Text>
      {hovered && <Text position={[0, 5.4, 0]} fontSize={0.11} color="#ffd700" anchorX="center" outlineWidth={0.01} outlineColor="#000">Click to enter!</Text>}
    </group>
  );
};

// ============ BIOME COMPONENTS ============

// Desert Biome — sand, cacti, pyramids, oasis, ruins
const DesertBiome = () => (
  <group>
    {/* Sand ground */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[80, -0.005, 25]} receiveShadow>
      <planeGeometry args={[55, 55]} /><meshStandardMaterial color="#e8c87a" roughness={0.95} />
    </mesh>
    {/* Sand dunes */}
    {[{ x: 65, z: 20, s: 4 }, { x: 95, z: 40, s: 5 }, { x: 85, z: 10, s: 3.5 }, { x: 70, z: 45, s: 3 }].map((d, i) => (
      <mesh key={`dune-${i}`} position={[d.x, d.s * 0.25, d.z]} castShadow>
        <sphereGeometry args={[d.s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d4b06a" roughness={0.9} />
      </mesh>
    ))}
    {/* Pyramids */}
    <mesh position={[80, 2.5, 15]} castShadow><coneGeometry args={[3, 5, 4]} /><meshStandardMaterial color="#c9a84c" roughness={0.6} /></mesh>
    <mesh position={[90, 1.8, 25]} castShadow><coneGeometry args={[2, 3.5, 4]} /><meshStandardMaterial color="#c9a84c" roughness={0.6} /></mesh>
    {/* Oasis */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[75, 0.03, 30]}><circleGeometry args={[3, 32]} /><meshStandardMaterial color="#2980b9" transparent opacity={0.7} roughness={0.1} metalness={0.3} /></mesh>
    {[0, 1, 2].map(i => (
      <group key={`oasis-palm-${i}`} position={[73 + i * 2.5, 0, 28 + (i % 2) * 3]}>
        <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, 3, 8]} /><meshStandardMaterial color="#8B6914" /></mesh>
        <mesh position={[0, 3.2, 0]}><sphereGeometry args={[1.2, 8, 8]} /><meshStandardMaterial color="#228B22" /></mesh>
      </group>
    ))}
    {/* Cacti */}
    {[{ x: 70, z: 10 }, { x: 85, z: 35 }, { x: 92, z: 15 }, { x: 68, z: 38 }, { x: 78, z: 5 }].map((c, i) => (
      <group key={`cactus-${i}`} position={[c.x, 0, c.z]}>
        <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.15, 0.18, 1.6, 8]} /><meshStandardMaterial color="#2d6a2d" /></mesh>
        <mesh position={[0.2, 1.2, 0]} rotation={[0, 0, Math.PI / 4]}><cylinderGeometry args={[0.08, 0.1, 0.5, 6]} /><meshStandardMaterial color="#2d6a2d" /></mesh>
        <mesh position={[-0.15, 0.9, 0]} rotation={[0, 0, -Math.PI / 3]}><cylinderGeometry args={[0.07, 0.09, 0.4, 6]} /><meshStandardMaterial color="#2d6a2d" /></mesh>
      </group>
    ))}
    {/* Desert ruins */}
    <group position={[75, 0, 45]}>
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[5, 2, 3]} /><meshStandardMaterial color="#b5a07a" roughness={0.9} /></mesh>
      <mesh position={[-1.5, 2.2, 0]} castShadow><boxGeometry args={[1, 0.5, 3]} /><meshStandardMaterial color="#a89060" roughness={0.9} /></mesh>
      <mesh position={[1.8, 1.8, 0]} castShadow><boxGeometry args={[0.8, 0.4, 2.5]} /><meshStandardMaterial color="#a89060" roughness={0.9} /></mesh>
      <Text position={[0, 3, 0]} fontSize={0.2} color="#c9a84c" anchorX="center" outlineWidth={0.01} outlineColor="#000">🏛️ Ancient Ruins</Text>
    </group>
    <Text position={[80, 5, 25]} fontSize={0.35} color="#c9a84c" anchorX="center" outlineWidth={0.02} outlineColor="#000">🏜️ Desert Biome</Text>
  </group>
);

// Snow Biome — ice, igloos, frozen lake, ice castle, snowman
const SnowBiome = () => {
  const iceRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (iceRef.current) {
      (iceRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });
  return (
    <group>
      {/* Snow ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-80, 0.005, 25]} receiveShadow>
        <planeGeometry args={[55, 55]} /><meshStandardMaterial color="#e8eef5" roughness={0.6} />
      </mesh>
      {/* Snow mounds */}
      {[{ x: -70, z: 30, s: 3 }, { x: -90, z: 15, s: 4 }, { x: -75, z: 45, s: 2.5 }].map((d, i) => (
        <mesh key={`snow-mound-${i}`} position={[d.x, d.s * 0.2, d.z]} castShadow>
          <sphereGeometry args={[d.s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#dde8f0" roughness={0.5} />
        </mesh>
      ))}
      {/* Frozen lake */}
      <mesh ref={iceRef} rotation={[-Math.PI / 2, 0, 0]} position={[-75, 0.03, 25]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#a8d8ea" transparent opacity={0.8} roughness={0.05} metalness={0.5} emissive="#a8d8ea" emissiveIntensity={0.1} />
      </mesh>
      {/* Igloos */}
      {[{ x: -80, z: 10 }, { x: -70, z: 40 }].map((ig, i) => (
        <group key={`igloo-${i}`} position={[ig.x, 0, ig.z]}>
          <mesh castShadow><sphereGeometry args={[2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e0e8f0" roughness={0.4} /></mesh>
          <mesh position={[1.8, 0.4, 0]} castShadow><boxGeometry args={[1, 0.8, 0.8]} /><meshStandardMaterial color="#d0d8e0" /></mesh>
          <mesh position={[2.3, 0.4, 0]}><boxGeometry args={[0.1, 0.6, 0.6]} /><meshStandardMaterial color="#333" /></mesh>
        </group>
      ))}
      {/* Ice castle */}
      <group position={[-85, 0, 35]}>
        <mesh position={[0, 2.5, 0]} castShadow><boxGeometry args={[5, 5, 5]} /><meshStandardMaterial color="#c8ddf0" roughness={0.1} metalness={0.3} transparent opacity={0.85} /></mesh>
        {[[-2, 0, -2], [2, 0, -2], [-2, 0, 2], [2, 0, 2]].map(([x, , z], i) => (
          <mesh key={i} position={[x, 4, z]} castShadow><cylinderGeometry args={[0.3, 0.4, 3, 8]} /><meshStandardMaterial color="#b0ccee" roughness={0.1} metalness={0.4} transparent opacity={0.8} /></mesh>
        ))}
        {[[-2, 5.8, -2], [2, 5.8, -2], [-2, 5.8, 2], [2, 5.8, 2]].map(([x, y, z], i) => (
          <mesh key={`tower-${i}`} position={[x, y, z]}><coneGeometry args={[0.5, 1, 8]} /><meshStandardMaterial color="#a0bcee" metalness={0.5} /></mesh>
        ))}
        <Text position={[0, 6, 0]} fontSize={0.2} color="#a0bcee" anchorX="center" outlineWidth={0.01} outlineColor="#000">🏰 Ice Castle</Text>
      </group>
      {/* Snowman */}
      <group position={[-65, 0, 15]}>
        <mesh position={[0, 0.5, 0]} castShadow><sphereGeometry args={[0.7, 16, 16]} /><meshStandardMaterial color="#f0f4f8" /></mesh>
        <mesh position={[0, 1.3, 0]} castShadow><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="#f0f4f8" /></mesh>
        <mesh position={[0, 1.9, 0]} castShadow><sphereGeometry args={[0.35, 16, 16]} /><meshStandardMaterial color="#f0f4f8" /></mesh>
        <mesh position={[0, 1.9, 0.33]}><coneGeometry args={[0.06, 0.3, 8]} /><meshStandardMaterial color="#e67e22" /></mesh>
        <mesh position={[-0.1, 2, 0.3]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0.1, 2, 0.3]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0, 2.3, 0]}><cylinderGeometry args={[0.35, 0.3, 0.15, 16]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[0.2, 0.2, 0.3, 16]} /><meshStandardMaterial color="#333" /></mesh>
      </group>
      {/* Pine trees */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = 18 + (i % 3) * 5;
        return (
          <group key={`pine-${i}`} position={[-80 + Math.cos(a) * r, 0, 25 + Math.sin(a) * r]}>
            <mesh position={[0, 1, 0]} castShadow><cylinderGeometry args={[0.1, 0.15, 2, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
            <mesh position={[0, 2.5, 0]} castShadow><coneGeometry args={[1, 2.5, 8]} /><meshStandardMaterial color="#1a4d2e" /></mesh>
            <mesh position={[0, 2, 0]} castShadow><coneGeometry args={[1.2, 1.5, 8]} /><meshStandardMaterial color="#1a5530" /></mesh>
          </group>
        );
      })}
      <Text position={[-80, 7, 25]} fontSize={0.35} color="#a0bcee" anchorX="center" outlineWidth={0.02} outlineColor="#000">❄️ Snow Biome</Text>
    </group>
  );
};

// Beach Biome — sand, ocean, palms, shack, surfboards
const BeachBiome = () => {
  const waterRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = 0.03 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
    }
  });
  return (
    <group>
      {/* Beach sand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[80, -0.005, -60]} receiveShadow>
        <planeGeometry args={[55, 55]} /><meshStandardMaterial color="#f0d9a0" roughness={0.85} />
      </mesh>
      {/* Ocean */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[75, 0.03, -70]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#1a6eb0" transparent opacity={0.75} roughness={0.05} metalness={0.4} />
      </mesh>
      {/* Waves (static foam lines) */}
      {[0, 1, 2].map(i => (
        <mesh key={`wave-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[75, 0.04, -63 + i * 1.5]}>
          <planeGeometry args={[12, 0.3]} /><meshStandardMaterial color="#d0e8f0" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Palm trees */}
      {[{ x: 80, z: -55 }, { x: 85, z: -60 }, { x: 65, z: -60 }, { x: 70, z: -50 }, { x: 90, z: -55 }].map((p, i) => (
        <group key={`palm-${i}`} position={[p.x, 0, p.z]}>
          <mesh position={[0, 2, 0]} castShadow rotation={[0.1 * (i % 2 === 0 ? 1 : -1), 0, 0.05 * i]}>
            <cylinderGeometry args={[0.12, 0.18, 4, 8]} /><meshStandardMaterial color="#8B6914" />
          </mesh>
          <mesh position={[0.2, 4, 0]}><sphereGeometry args={[1.3, 8, 8]} /><meshStandardMaterial color="#228B22" /></mesh>
          {/* Coconuts */}
          <mesh position={[0.3, 3.5, 0.2]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
        </group>
      ))}
      {/* Beach shack */}
      <group position={[70, 0, -55]}>
        <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[3, 2, 2.5]} /><meshStandardMaterial color="#c4956a" roughness={0.85} /></mesh>
        <mesh position={[0, 2.3, 0]} castShadow><boxGeometry args={[3.5, 0.15, 3]} /><meshStandardMaterial color="#8B6914" roughness={0.8} /></mesh>
        <mesh position={[0, 0.7, 1.26]}><boxGeometry args={[0.7, 1.4, 0.05]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
        <Text position={[0, 3, 0]} fontSize={0.15} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">🏖️ Beach Shack</Text>
      </group>
      {/* Surfboard rack */}
      <group position={[90, 0, -50]}>
        <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.1, 1.6, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
        <mesh position={[0.8, 0.8, 0]}><boxGeometry args={[0.1, 1.6, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
        <mesh position={[0.4, 1.2, 0]}><boxGeometry args={[1, 0.08, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
        {/* Surfboards */}
        <mesh position={[0.15, 0.9, 0.1]} rotation={[0.1, 0, 0.05]}><boxGeometry args={[0.15, 1.8, 0.04]} /><meshStandardMaterial color="#e74c3c" /></mesh>
        <mesh position={[0.5, 0.9, 0.1]} rotation={[0.1, 0, -0.03]}><boxGeometry args={[0.15, 1.8, 0.04]} /><meshStandardMaterial color="#3498db" /></mesh>
      </group>
      {/* Beach umbrella */}
      <group position={[78, 0, -58]}>
        <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.04, 0.04, 3, 8]} /><meshStandardMaterial color="#ddd" /></mesh>
        <mesh position={[0, 3, 0]}><coneGeometry args={[1.5, 0.5, 8]} /><meshStandardMaterial color="#e74c3c" /></mesh>
      </group>
      <Text position={[78, 5, -60]} fontSize={0.35} color="#1a6eb0" anchorX="center" outlineWidth={0.02} outlineColor="#000">🏖️ Beach Biome</Text>
    </group>
  );
};

// Volcanic Biome — dark rock, lava pools, volcano, obsidian, geysers
const VolcanicBiome = () => {
  const lavaRef1 = useRef<THREE.Mesh>(null);
  const lavaRef2 = useRef<THREE.Mesh>(null);
  const geyserRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lavaRef1.current) {
      (lavaRef1.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 1.5) * 0.3;
    }
    if (lavaRef2.current) {
      (lavaRef2.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(t * 2 + 1) * 0.3;
    }
    if (geyserRef.current) {
      geyserRef.current.scale.y = 1 + Math.max(0, Math.sin(t * 0.5)) * 2;
      geyserRef.current.visible = Math.sin(t * 0.5) > -0.3;
    }
  });

  return (
    <group>
      {/* Dark rock ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-80, -0.005, -70]} receiveShadow>
        <planeGeometry args={[55, 55]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>
      {/* Cracked earth texture overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-80, 0.001, -70]}>
        <ringGeometry args={[10, 25, 32]} /><meshStandardMaterial color="#3a2a1a" roughness={0.9} transparent opacity={0.4} />
      </mesh>
      {/* Volcano */}
      <group position={[-75, 0, -70]}>
        <mesh castShadow><coneGeometry args={[6, 10, 16]} /><meshStandardMaterial color="#3d2b1f" roughness={0.9} /></mesh>
        <mesh position={[0, 5, 0]}><coneGeometry args={[1.5, 1, 16]} /><meshStandardMaterial color="#1a0a00" /></mesh>
        {/* Lava glow at top */}
        <mesh position={[0, 4.8, 0]}><sphereGeometry args={[1, 16, 16]} /><meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={0.8} transparent opacity={0.6} /></mesh>
        <pointLight position={[0, 5.5, 0]} color="#ff4400" intensity={2} distance={20} />
        <Text position={[0, 11, 0]} fontSize={0.3} color="#ff6600" anchorX="center" outlineWidth={0.02} outlineColor="#000">🌋 Volcano</Text>
      </group>
      {/* Lava pools */}
      <mesh ref={lavaRef1} rotation={[-Math.PI / 2, 0, 0]} position={[-80, 0.04, -55]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#ff3300" emissive="#ff4400" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      <pointLight position={[-80, 1, -55]} color="#ff4400" intensity={1} distance={10} />
      <mesh ref={lavaRef2} rotation={[-Math.PI / 2, 0, 0]} position={[-65, 0.04, -60]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff5500" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
      <pointLight position={[-65, 1, -60]} color="#ff5500" intensity={0.8} distance={8} />
      {/* Obsidian formations */}
      <group position={[-70, 0, -85]}>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[Math.cos(i * 1.5) * 1.5, 1 + i * 0.3, Math.sin(i * 1.5) * 1.5]} castShadow>
            <dodecahedronGeometry args={[0.6 + i * 0.15, 0]} /><meshStandardMaterial color="#1a1a2e" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
        <Text position={[0, 3.5, 0]} fontSize={0.15} color="#6a5acd" anchorX="center" outlineWidth={0.01} outlineColor="#000">💎 Obsidian</Text>
      </group>
      {/* Fire geyser */}
      <group position={[-85, 0, -80]}>
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.8, 1, 0.2, 16]} /><meshStandardMaterial color="#444" /></mesh>
        <group ref={geyserRef}>
          <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.3, 0.6, 3, 8]} /><meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={1} transparent opacity={0.5} /></mesh>
        </group>
        <pointLight position={[0, 2, 0]} color="#ff6600" intensity={1.5} distance={8} />
      </group>
      {/* Dark rocks scattered */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 10 + (i % 4) * 5;
        return (
          <mesh key={`rock-${i}`} position={[-80 + Math.cos(a) * r, 0.3 + (i % 3) * 0.2, -70 + Math.sin(a) * r]} castShadow>
            <dodecahedronGeometry args={[0.4 + (i % 3) * 0.2, 0]} /><meshStandardMaterial color="#333" roughness={0.9} />
          </mesh>
        );
      })}
      <Text position={[-78, 12, -70]} fontSize={0.35} color="#ff6600" anchorX="center" outlineWidth={0.02} outlineColor="#000">🌋 Volcanic Biome</Text>
    </group>
  );
};

// Forest Biome — dense trees, mushrooms, fairy pond, treehouse, log cabin
const ForestBiome = () => (
  <group>
    {/* Forest floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 80]} receiveShadow>
      <planeGeometry args={[65, 45]} /><meshStandardMaterial color="#2d5a1e" roughness={0.95} />
    </mesh>
    {/* Dense trees */}
    {Array.from({ length: 20 }).map((_, i) => {
      const x = -25 + (i % 5) * 12 + Math.sin(i * 7) * 3;
      const z = 60 + Math.floor(i / 5) * 10 + Math.cos(i * 5) * 3;
      const h = 3 + (i % 4);
      return (
        <group key={`ftree-${i}`} position={[x, 0, z]}>
          <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.15, 0.25, h, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
          <mesh position={[0, h + 0.8, 0]} castShadow><sphereGeometry args={[1.5 + (i % 3) * 0.4, 8, 8]} /><meshStandardMaterial color={i % 3 === 0 ? "#1a4d1a" : i % 3 === 1 ? "#2d6a2d" : "#1a5530"} roughness={0.8} /></mesh>
        </group>
      );
    })}
    {/* Ancient tree (centerpiece) */}
    <group position={[0, 0, 75]}>
      <mesh position={[0, 3, 0]} castShadow><cylinderGeometry args={[0.8, 1.2, 6, 12]} /><meshStandardMaterial color="#4a2810" roughness={0.9} /></mesh>
      <mesh position={[0, 7, 0]} castShadow><sphereGeometry args={[4, 12, 12]} /><meshStandardMaterial color="#1a4d1a" roughness={0.8} /></mesh>
      <mesh position={[2, 5, 0]} castShadow><sphereGeometry args={[2, 8, 8]} /><meshStandardMaterial color="#2d5a1e" roughness={0.8} /></mesh>
      <mesh position={[-1.5, 5.5, 1.5]} castShadow><sphereGeometry args={[2.5, 8, 8]} /><meshStandardMaterial color="#1a5530" roughness={0.8} /></mesh>
      <Text position={[0, 10, 0]} fontSize={0.25} color="#1a5530" anchorX="center" outlineWidth={0.01} outlineColor="#000">🌳 Ancient Tree</Text>
    </group>
    {/* Mushroom ring */}
    <group position={[-15, 0, 70]}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 1.5;
        const colors = ["#e74c3c", "#ff6b6b", "#c0392b", "#e74c3c", "#ff4757", "#e74c3c", "#c0392b", "#ff6b6b"];
        return (
          <group key={`mush-${i}`} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.04, 0.05, 0.3, 8]} /><meshStandardMaterial color="#ddd" /></mesh>
            <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={colors[i]} /></mesh>
          </group>
        );
      })}
      {/* Fairy ring glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[1.2, 1.8, 32]} /><meshStandardMaterial color="#90EE90" emissive="#90EE90" emissiveIntensity={0.3} transparent opacity={0.3} side={THREE.DoubleSide} /></mesh>
    </group>
    {/* Fairy pond */}
    <group position={[15, 0, 80]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><circleGeometry args={[2, 32]} /><meshStandardMaterial color="#4488aa" transparent opacity={0.6} emissive="#66aadd" emissiveIntensity={0.2} /></mesh>
      <pointLight position={[0, 1, 0]} color="#66ffaa" intensity={0.5} distance={6} />
    </group>
    {/* Treehouse */}
    <group position={[-10, 0, 85]}>
      <mesh position={[0, 2.5, 0]} castShadow><cylinderGeometry args={[0.3, 0.4, 5, 8]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      <mesh position={[0, 5.5, 0]} castShadow><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#8B6914" roughness={0.8} /></mesh>
      <mesh position={[0, 7, 0]} castShadow><coneGeometry args={[2.5, 1.5, 4]} /><meshStandardMaterial color="#2d5a1e" roughness={0.8} /></mesh>
      <mesh position={[0, 7.5, 0]} castShadow><sphereGeometry args={[3, 8, 8]} /><meshStandardMaterial color="#1a4d1a" roughness={0.8} /></mesh>
      <Text position={[0, 9, 0]} fontSize={0.15} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">🌿 Treehouse</Text>
    </group>
    {/* Log cabin */}
    <group position={[10, 0, 90]}>
      <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[4, 2, 3]} /><meshStandardMaterial color="#6b3a1e" roughness={0.9} /></mesh>
      <mesh position={[0, 2.5, 0]} castShadow><boxGeometry args={[4.5, 1, 3.5]} /><meshStandardMaterial color="#5c3a1e" roughness={0.9} /></mesh>
      <mesh position={[0, 0.7, 1.51]}><boxGeometry args={[0.7, 1.4, 0.05]} /><meshStandardMaterial color="#3a1a0a" /></mesh>
      <mesh position={[1, 4, -1]} castShadow><boxGeometry args={[0.4, 1.5, 0.4]} /><meshStandardMaterial color="#555" /></mesh>
      <Text position={[0, 4, 0]} fontSize={0.15} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">🏕️ Log Cabin</Text>
    </group>
    <Text position={[0, 10, 75]} fontSize={0.35} color="#2d6a2d" anchorX="center" outlineWidth={0.02} outlineColor="#000">🌲 Forest Biome</Text>
  </group>
);

// ============ EXPANDED GROUND ============
const Ground = () => (
  <group>
    {/* Main town ground (center) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial color="#4a7c59" roughness={0.9} /></mesh>
    {/* Town center cobblestone */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><circleGeometry args={[10, 64]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow><ringGeometry args={[3, 3.2, 64]} /><meshStandardMaterial color="#b09070" roughness={0.7} /></mesh>

    {/* Biome transition zones (blending rings) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[80, -0.01, 25]}><circleGeometry args={[30, 32]} /><meshStandardMaterial color="#c4a870" roughness={0.9} transparent opacity={0.5} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-80, -0.01, 25]}><circleGeometry args={[30, 32]} /><meshStandardMaterial color="#c0ccd5" roughness={0.7} transparent opacity={0.4} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[80, -0.01, -60]}><circleGeometry args={[30, 32]} /><meshStandardMaterial color="#c4a870" roughness={0.85} transparent opacity={0.4} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-80, -0.01, -70]}><circleGeometry args={[30, 32]} /><meshStandardMaterial color="#2a2a2a" roughness={0.95} transparent opacity={0.4} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 80]}><planeGeometry args={[65, 50]} /><meshStandardMaterial color="#1a4a20" roughness={0.95} transparent opacity={0.5} /></mesh>

    {/* Fountain */}
    <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[1.5, 1.7, 0.4, 32]} /><meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} /></mesh>
    <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.2, 0.25, 0.8, 16]} /><meshStandardMaterial color="#8899aa" roughness={0.3} metalness={0.2} /></mesh>
    <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial color="#66aadd" emissive="#4488bb" emissiveIntensity={0.3} transparent opacity={0.7} /></mesh>

    {/* Benches */}
    {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((angle, i) => (
      <group key={`bench-${i}`} position={[Math.cos(angle) * 10, 0, Math.sin(angle) * 10]} rotation={[0, -angle + Math.PI / 2, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[2, 0.08, 0.5]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
        <mesh position={[-0.8, 0.15, 0]}><boxGeometry args={[0.08, 0.3, 0.4]} /><meshStandardMaterial color="#8B4513" /></mesh>
        <mesh position={[0.8, 0.15, 0]}><boxGeometry args={[0.08, 0.3, 0.4]} /><meshStandardMaterial color="#8B4513" /></mesh>
        <mesh position={[0, 0.55, -0.22]}><boxGeometry args={[2, 0.5, 0.06]} /><meshStandardMaterial color="#8B4513" /></mesh>
      </group>
    ))}

    {/* Gazebo */}
    <group position={[20, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[5, 6]} /><meshStandardMaterial color="#d4c4a8" roughness={0.6} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 4.5, 1.5, Math.sin(a) * 4.5]} castShadow><cylinderGeometry args={[0.12, 0.12, 3, 8]} /><meshStandardMaterial color="#ddd" roughness={0.4} /></mesh>;
      })}
      <mesh position={[0, 3.2, 0]} castShadow><coneGeometry args={[5.5, 1.5, 6]} /><meshStandardMaterial color="#8B4513" roughness={0.7} /></mesh>
    </group>

    {/* Garden */}
    <group position={[-20, 0, 5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[6, 32]} /><meshStandardMaterial color="#3d6b40" roughness={0.9} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 3 + Math.sin(i * 2) * 1.5;
        return <mesh key={i} position={[Math.cos(a) * r, 0.3, Math.sin(a) * r]}><sphereGeometry args={[0.3, 8, 8]} /><meshStandardMaterial color={["#ff6b6b", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"][i % 5]} /></mesh>;
      })}
    </group>

    {/* Stage */}
    <group position={[0, 0, -28]}>
      <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[10, 0.6, 6]} /><meshStandardMaterial color="#666" roughness={0.5} /></mesh>
      <mesh position={[0, 0.65, -2.5]} castShadow><boxGeometry args={[8, 0.1, 1]} /><meshStandardMaterial color="#888" roughness={0.5} /></mesh>
      {[-1, 0, 1].map((row) => (
        <mesh key={row} position={[0, 0.15 + row * 0.15, 5 + row * 2]} castShadow><boxGeometry args={[12, 0.3, 1.5]} /><meshStandardMaterial color="#555" roughness={0.6} /></mesh>
      ))}
    </group>

    {/* Library */}
    <group position={[35, 0, 10]}>
      <mesh position={[0, 2, 0]} castShadow><boxGeometry args={[6, 4, 5]} /><meshStandardMaterial color="#d4c4a8" roughness={0.7} /></mesh>
      <mesh position={[0, 4.5, 0]} castShadow><boxGeometry args={[7, 1, 6]} /><meshStandardMaterial color="#8B4513" roughness={0.8} /></mesh>
      <mesh position={[0, 0.8, 2.51]}><boxGeometry args={[1, 1.6, 0.05]} /><meshStandardMaterial color="#5c3a1e" /></mesh>
      {[[-1.5, 2.5, 2.51], [1.5, 2.5, 2.51]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}><planeGeometry args={[0.8, 0.8]} /><meshStandardMaterial color="#87CEEB" transparent opacity={0.5} side={THREE.DoubleSide} /></mesh>
      ))}
      <Text position={[0, 5.5, 0]} fontSize={0.2} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">📚 Library</Text>
    </group>

    {/* Park with pond */}
    <group position={[-30, 0, 20]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><circleGeometry args={[5, 32]} /><meshStandardMaterial color="#2980b9" transparent opacity={0.7} roughness={0.1} metalness={0.3} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i * 1.5]} position={[Math.cos(i * 1.5) * 2.5, 0.04, Math.sin(i * 1.5) * 2.5]}><circleGeometry args={[0.4, 16]} /><meshStandardMaterial color="#27ae60" side={THREE.DoubleSide} /></mesh>
      ))}
      {[0, Math.PI / 2, Math.PI, 1.5 * Math.PI].map((a, i) => (
        <group key={i} position={[Math.cos(a) * 7, 0, Math.sin(a) * 7]} rotation={[0, -a, 0]}>
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[1.5, 0.08, 0.4]} /><meshStandardMaterial color="#8B4513" /></mesh>
          <mesh position={[0, 0.5, -0.18]}><boxGeometry args={[1.5, 0.4, 0.05]} /><meshStandardMaterial color="#8B4513" /></mesh>
        </group>
      ))}
    </group>

    {/* Original pond */}
    <group position={[-15, 0, -15]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><circleGeometry args={[4, 32]} /><meshStandardMaterial color="#2980b9" transparent opacity={0.7} roughness={0.1} metalness={0.3} /></mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i * 2]} position={[Math.cos(i * 2) * 2, 0.04, Math.sin(i * 2) * 2]}><circleGeometry args={[0.4, 16]} /><meshStandardMaterial color="#27ae60" side={THREE.DoubleSide} /></mesh>
      ))}
    </group>

    {/* Amphitheater */}
    <group position={[-35, 0, -25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[6, 32]} /><meshStandardMaterial color="#888" roughness={0.6} /></mesh>
      {[0, 1, 2].map((ring) => (
        <mesh key={ring} position={[0, 0.2 + ring * 0.4, 0]}><cylinderGeometry args={[4 + ring * 1.5, 4 + ring * 1.5, 0.4, 32, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#777" roughness={0.6} /></mesh>
      ))}
      <Text position={[0, 3, 0]} fontSize={0.2} color="#fff" anchorX="center" outlineWidth={0.01} outlineColor="#000">🎭 Amphitheater</Text>
    </group>

    {/* Paths — extended to biomes */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.01, -10]}><planeGeometry args={[2, 25]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.01, -4]}><planeGeometry args={[2, 12]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 15]}><planeGeometry args={[2, 15]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, Math.PI / 4, 0]} position={[-22, 0.01, 12]}><planeGeometry args={[2, 18]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, -Math.PI / 6, 0]} position={[28, 0.01, 5]}><planeGeometry args={[2, 15]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    {/* Path to desert */}
    <mesh rotation={[-Math.PI / 2, -Math.PI / 8, 0]} position={[45, 0.01, 15]}><planeGeometry args={[2, 40]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    {/* Path to snow */}
    <mesh rotation={[-Math.PI / 2, Math.PI / 8, 0]} position={[-45, 0.01, 15]}><planeGeometry args={[2, 40]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    {/* Path to beach */}
    <mesh rotation={[-Math.PI / 2, Math.PI / 6, 0]} position={[45, 0.01, -35]}><planeGeometry args={[2, 45]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    {/* Path to volcanic */}
    <mesh rotation={[-Math.PI / 2, -Math.PI / 6, 0]} position={[-45, 0.01, -40]}><planeGeometry args={[2, 45]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>
    {/* Path to forest */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 50]}><planeGeometry args={[2, 40]} /><meshStandardMaterial color="#c4a882" roughness={0.7} /></mesh>

    {/* Town trees */}
    {Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2 + 0.2;
      const dist = 35 + Math.sin(i * 3) * 8;
      const height = 2.5 + (i % 4) * 0.5;
      return (
        <group key={`tree-${i}`} position={[Math.cos(angle) * dist, 0, Math.sin(angle) * dist]}>
          <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.15, 0.2, height, 8]} /><meshStandardMaterial color="#5c3a1e" roughness={0.9} /></mesh>
          <mesh position={[0, height + 1, 0]} castShadow><sphereGeometry args={[1.5 + (i % 3) * 0.3, 8, 8]} /><meshStandardMaterial color={i % 3 === 0 ? "#1a4d1a" : "#2d5a1e"} roughness={0.8} /></mesh>
        </group>
      );
    })}

    {/* Lampposts */}
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const dist = 14 + (i % 2) * 10;
      return (
        <group key={`lamp-${i}`} position={[Math.cos(angle) * dist, 0, Math.sin(angle) * dist]}>
          <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.05, 0.08, 4, 8]} /><meshStandardMaterial color="#444" metalness={0.5} /></mesh>
          <mesh position={[0, 4.2, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#ffeaa7" emissive="#ffeaa7" emissiveIntensity={0.3} /></mesh>
        </group>
      );
    })}

    {/* Flower beds */}
    {[{ x: 8, z: 8 }, { x: -5, z: 12 }, { x: 14, z: -2 }].map((bed, bi) => (
      <group key={`bed-${bi}`} position={[bed.x, 0, bed.z]}>
        {Array.from({ length: 6 }).map((_, fi) => {
          const a = (fi / 6) * Math.PI * 2;
          return <mesh key={fi} position={[Math.cos(a) * 0.8, 0.15, Math.sin(a) * 0.8]}><sphereGeometry args={[0.12, 8, 8]} /><meshStandardMaterial color={["#ff6b6b", "#feca57", "#ff9ff3", "#54a0ff", "#2ecc71", "#e67e22"][fi]} /></mesh>;
        })}
      </group>
    ))}

    {/* Biome signposts at paths */}
    {[
      { x: 30, z: 15, label: "🏜️ Desert →", rot: -0.4 },
      { x: -30, z: 15, label: "← ❄️ Snow", rot: 0.4 },
      { x: 30, z: -20, label: "🏖️ Beach →", rot: 0.3 },
      { x: -30, z: -20, label: "← 🌋 Volcanic", rot: -0.3 },
      { x: 0, z: 35, label: "🌲 Forest ↑", rot: 0 },
    ].map((sign, i) => (
      <group key={`sign-${i}`} position={[sign.x, 0, sign.z]} rotation={[0, sign.rot, 0]}>
        <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.05, 0.05, 1.6, 8]} /><meshStandardMaterial color="#8B4513" /></mesh>
        <mesh position={[0, 1.7, 0]}><boxGeometry args={[1.8, 0.4, 0.06]} /><meshStandardMaterial color="#d2b48c" /></mesh>
        <Text position={[0, 1.7, 0.04]} fontSize={0.1} color="#333" anchorX="center">{sign.label}</Text>
      </group>
    ))}
  </group>
);

// ============ CLICK PLANE ============
const ClickPlane = ({ onMove }: { onMove: (point: THREE.Vector3) => void }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}
    onClick={(e) => { e.stopPropagation(); if (!checkCollision(e.point.x, e.point.z)) onMove(e.point); }}>
    <planeGeometry args={[220, 220]} />
    <meshBasicMaterial />
  </mesh>
);

// ============ WEATHER DISPLAY ============
const WeatherDisplay = ({ weather }: { weather: WeatherState }) => {
  if (weather.type === "rain" || weather.type === "storm") return <RainParticles intensity={weather.intensity} />;
  if (weather.type === "snow") return <SnowParticles intensity={weather.intensity} />;
  return null;
};

// ============ MAIN SCENE ============
interface PlazaSceneProps {
  localUser: PlazaUser;
  remoteUsers: PlazaUser[];
  onMove: (position: [number, number, number]) => void;
  onUserClick: (userId: string) => void;
  onInteract?: (id: InteractableId) => void;
  userHouses?: UserHouse[];
  weather?: WeatherState;
}

const PlazaScene = ({ localUser, remoteUsers, onMove, onUserClick, onInteract, userHouses = [], weather }: PlazaSceneProps) => {
  const handleMove = useCallback((point: THREE.Vector3) => { onMove([point.x, 0, point.z]); }, [onMove]);
  const handleInteract = useCallback((id: InteractableId) => { onInteract?.(id); }, [onInteract]);

  const [timeColors, setTimeColors] = useState(() => getTimeColors(getTimeOfDay()));
  useEffect(() => {
    const interval = setInterval(() => setTimeColors(getTimeColors(getTimeOfDay())), 30000);
    return () => clearInterval(interval);
  }, []);

  // Update dynamic collision for user houses
  useEffect(() => { setDynamicHouses(userHouses); }, [userHouses]);

  const currentWeather = weather || { type: "clear" as WeatherType, intensity: 0, temperature: 20, windSpeed: 0 };

  return (
    <Canvas shadows camera={{ position: [0, 15, 15], fov: 50 }} style={{ background: timeColors.skyColor }}>
      <ambientLight intensity={timeColors.ambientIntensity * (currentWeather.type === "cloudy" || currentWeather.type === "rain" || currentWeather.type === "storm" ? 0.7 : 1)} color={timeColors.ambientColor} />
      <directionalLight position={timeColors.sunPosition} intensity={timeColors.dirIntensity * (currentWeather.type === "storm" ? 0.3 : currentWeather.type === "rain" || currentWeather.type === "cloudy" ? 0.6 : 1)} color={timeColors.dirColor} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={200} shadow-camera-left={-110} shadow-camera-right={110} shadow-camera-top={110} shadow-camera-bottom={-110} />
      <Sky sunPosition={timeColors.sunPosition} />
      {timeColors.showStars && currentWeather.type === "clear" && <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />}
      <fog attach="fog" args={[currentWeather.type === "storm" ? "#334" : timeColors.skyColor, 80, 180]} />

      {/* Weather */}
      <WeatherDisplay weather={currentWeather} />
      {(currentWeather.type === "cloudy" || currentWeather.type === "rain" || currentWeather.type === "storm") && <CloudLayer intensity={currentWeather.intensity} />}

      <Ground />
      <DesertBiome />
      <SnowBiome />
      <BeachBiome />
      <VolcanicBiome />
      <ForestBiome />
      <ClickPlane onMove={handleMove} />

      {/* Static interactive objects */}
      <Jukebox onClick={() => handleInteract("jukebox")} />
      <BulletinBoard onClick={() => handleInteract("bulletin")} />
      <GameStation position={[15, 0, 22]} gameLabel="Snake" color="#e74c3c" onClick={() => handleInteract("game-station-1")} />
      <GameStation position={[20, 0, 22]} gameLabel="Tetris" color="#3498db" onClick={() => handleInteract("game-station-2")} />
      <GameStation position={[25, 0, 22]} gameLabel="Memory" color="#2ecc71" onClick={() => handleInteract("game-station-3")} />

      {/* User houses */}
      {userHouses.map((house) => (
        <UserHouse3D key={house.id} house={house} onClick={() => handleInteract(`user-house-${house.user_id}`)} />
      ))}

      {/* Lamppost lights */}
      {timeColors.lampIntensity > 0 && Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const dist = 14 + (i % 2) * 10;
        return <pointLight key={i} position={[Math.cos(angle) * dist, 4.5, Math.sin(angle) * dist]} intensity={timeColors.lampIntensity} distance={12} color="#ffeaa7" />;
      })}

      <Avatar user={localUser} isLocal={true} />
      {remoteUsers.map((user) => (
        <Avatar key={user.id} user={user} isLocal={false} onClick={() => onUserClick(user.id)} />
      ))}

      <OrbitControls target={[localUser.targetPosition[0], 0.5, localUser.targetPosition[2]]} maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={80} enablePan={false} />
    </Canvas>
  );
};

export default PlazaScene;
