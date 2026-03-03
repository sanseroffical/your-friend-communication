import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Mountain, Waves, Stars, Flame, TreePine, CloudRain, Snowflake, Mic, MicOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface RoomEnvironmentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeEnvironment: string | null;
  onSetEnvironment: (env: string | null) => void;
}

interface Environment {
  id: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  particles: string;
  description: string;
}

const ENVIRONMENTS: Environment[] = [
  { id: "aurora", name: "Aurora Borealis", icon: <Stars className="h-4 w-4" />, gradient: "from-emerald-900/30 via-cyan-900/20 to-purple-900/30", particles: "aurora", description: "Northern lights shimmer across the sky" },
  { id: "ocean", name: "Deep Ocean", icon: <Waves className="h-4 w-4" />, gradient: "from-blue-900/40 via-cyan-900/30 to-blue-800/40", particles: "bubbles", description: "Underwater world with floating bubbles" },
  { id: "volcano", name: "Volcanic Cavern", icon: <Flame className="h-4 w-4" />, gradient: "from-red-900/30 via-orange-900/20 to-red-800/30", particles: "embers", description: "Glowing embers drift upward" },
  { id: "forest", name: "Enchanted Forest", icon: <TreePine className="h-4 w-4" />, gradient: "from-green-900/30 via-emerald-900/20 to-green-800/30", particles: "fireflies", description: "Fireflies dance through the trees" },
  { id: "space", name: "Outer Space", icon: <Stars className="h-4 w-4" />, gradient: "from-indigo-950/40 via-purple-950/30 to-blue-950/40", particles: "stars", description: "Floating among the stars" },
  { id: "rain", name: "Rainy City", icon: <CloudRain className="h-4 w-4" />, gradient: "from-slate-900/40 via-gray-900/30 to-slate-800/40", particles: "rain", description: "Cozy rain atmosphere" },
  { id: "snow", name: "Winter Wonderland", icon: <Snowflake className="h-4 w-4" />, gradient: "from-sky-900/20 via-blue-900/15 to-sky-800/20", particles: "snow", description: "Gentle snowfall" },
  { id: "mountain", name: "Mountain Summit", icon: <Mountain className="h-4 w-4" />, gradient: "from-amber-900/20 via-orange-900/15 to-yellow-900/20", particles: "clouds", description: "Above the clouds at golden hour" },
];

const ParticleCanvas = ({ type }: { type: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }[] = [];
    const count = type === "rain" ? 100 : type === "snow" ? 60 : 40;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: type === "rain" ? -1 : (Math.random() - 0.5) * 0.5,
        vy: type === "rain" ? 8 : type === "snow" ? 0.5 + Math.random() : type === "embers" ? -(0.5 + Math.random()) : (Math.random() - 0.5) * 0.3,
        size: type === "rain" ? 1 : type === "stars" ? Math.random() * 2 : 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.7,
        hue: type === "aurora" ? 120 + Math.random() * 180 : type === "fireflies" ? 50 + Math.random() * 20 : type === "embers" ? Math.random() * 40 : 200,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        p.opacity += (Math.random() - 0.5) * 0.02;
        p.opacity = Math.max(0.1, Math.min(1, p.opacity));

        if (type === "rain") {
          ctx.strokeStyle = `hsla(210, 80%, 70%, ${p.opacity * 0.4})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = type === "aurora"
            ? `hsla(${p.hue}, 80%, 60%, ${p.opacity * 0.5})`
            : type === "bubbles"
            ? `hsla(200, 80%, 70%, ${p.opacity * 0.3})`
            : type === "embers"
            ? `hsla(${p.hue}, 100%, 60%, ${p.opacity * 0.7})`
            : type === "fireflies"
            ? `hsla(${p.hue}, 100%, 70%, ${p.opacity * 0.8})`
            : type === "stars"
            ? `hsla(220, 80%, 90%, ${p.opacity})`
            : type === "snow"
            ? `hsla(210, 20%, 95%, ${p.opacity * 0.7})`
            : `hsla(0, 0%, 90%, ${p.opacity * 0.3})`;
          ctx.fill();
        }
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [type]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

export const RoomOverlay = ({ environment }: { environment: string | null }) => {
  if (!environment) return null;
  const env = ENVIRONMENTS.find((e) => e.id === environment);
  if (!env) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none z-0 bg-gradient-to-b ${env.gradient} transition-all duration-1000`}>
      <ParticleCanvas type={env.particles} />
    </div>
  );
};

const RoomEnvironment = ({ isOpen, onOpenChange, activeEnvironment, onSetEnvironment }: RoomEnvironmentProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Room Environments
          </SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-2 mb-4">
          Transform your chatroom with immersive animated backgrounds and particle effects.
        </p>
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="space-y-2 pr-2">
            {activeEnvironment && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-3 text-xs"
                onClick={() => onSetEnvironment(null)}
              >
                <X className="h-3 w-3 mr-1" /> Clear Environment
              </Button>
            )}
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                onClick={() => onSetEnvironment(env.id === activeEnvironment ? null : env.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-muted ${
                  activeEnvironment === env.id ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${env.gradient} flex items-center justify-center`}>
                  {env.icon}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">{env.name}</p>
                  <p className="text-xs text-muted-foreground">{env.description}</p>
                </div>
                {activeEnvironment === env.id && (
                  <Badge variant="default" className="text-[10px]">Active</Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default RoomEnvironment;
