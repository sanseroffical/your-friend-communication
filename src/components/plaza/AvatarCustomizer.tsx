import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shuffle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AvatarCustomization {
  bodyColor: string;
  headShape: string;
  hatStyle: string;
  hatColor: string;
  glassesStyle: string;
  glassesColor: string;
  shirtColor: string;
  particleEffect: string;
  // New customization fields (all optional for backward compat)
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  capeStyle?: string;
  capeColor?: string;
  auraStyle?: string;
  auraColor?: string;
  nameColor?: string;
  height?: number; // 0.85 - 1.2
  build?: number;  // 0.85 - 1.2
}

export const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
  bodyColor: "#f4c19a",
  headShape: "round",
  hatStyle: "none",
  hatColor: "#e74c3c",
  glassesStyle: "none",
  glassesColor: "#333333",
  shirtColor: "#2ecc71",
  particleEffect: "none",
  hairStyle: "short",
  hairColor: "#4a2c1a",
  eyeColor: "#2c1810",
  capeStyle: "none",
  capeColor: "#a855f7",
  auraStyle: "none",
  auraColor: "#a855f7",
  nameColor: "#ffffff",
  height: 1,
  build: 1,
};

const SKIN_COLORS = [
  "#ffe0bd", "#f4c19a", "#e0a878", "#c68863", "#8d5524",
  "#5c3a21", "#3d2817", "#f0d5b8", "#d9a679", "#a6694b",
  // Fantasy
  "#9b59b6", "#3498db", "#2ecc71", "#1abc9c", "#e91e63",
];

const HAIR_COLORS = [
  "#1a1a1a", "#3d2817", "#5c3a21", "#8b5a2b", "#c69c6d",
  "#e8c896", "#d4af37", "#b87333", "#a0522d", "#dc143c",
  "#e91e63", "#9b59b6", "#3498db", "#2ecc71", "#f8b500", "#fdfdfd",
];

const SHIRT_COLORS = [
  "#2ecc71", "#3498db", "#e74c3c", "#f39c12", "#9b59b6",
  "#1abc9c", "#34495e", "#ecf0f1", "#e67e22", "#2c3e50",
  "#ff6b9d", "#6c5ce7", "#00b894", "#fdcb6e",
];

const ACCESSORY_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#34495e", "#ecf0f1", "#e67e22", "#1abc9c", "#ffd700",
  "#000000", "#ff1493", "#00ffff", "#a855f7",
];

const EYE_COLORS = [
  "#2c1810", "#4a3520", "#1e3a5f", "#2d5016", "#0f5b8a",
  "#7c2d12", "#581c87", "#dc2626", "#fbbf24", "#10b981",
];

const NAME_COLORS = [
  "#ffffff", "#fde047", "#a855f7", "#06b6d4", "#ec4899",
  "#10b981", "#f97316", "#ef4444",
];

const HAT_STYLES = [
  { id: "none", label: "None" },
  { id: "tophat", label: "Top Hat" },
  { id: "cap", label: "Cap" },
  { id: "beanie", label: "Beanie" },
  { id: "crown", label: "Crown" },
  { id: "halo", label: "Halo" },
  { id: "wizard", label: "Wizard" },
  { id: "cowboy", label: "Cowboy" },
  { id: "propeller", label: "Propeller" },
  { id: "headphones", label: "Headphones" },
  { id: "horns", label: "Horns" },
  { id: "antenna", label: "Antenna" },
];

const GLASSES_STYLES = [
  { id: "none", label: "None" },
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "monocle", label: "Monocle" },
  { id: "cyber", label: "Cyber Visor" },
  { id: "heart", label: "Heart" },
  { id: "star", label: "Star" },
];

const HAIR_STYLES = [
  { id: "none", label: "Bald" },
  { id: "short", label: "Short" },
  { id: "long", label: "Long" },
  { id: "mohawk", label: "Mohawk" },
  { id: "afro", label: "Afro" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "spiky", label: "Spiky" },
  { id: "curly", label: "Curly" },
];

const HEAD_SHAPES = [
  { id: "round", label: "Round" },
  { id: "oval", label: "Oval" },
  { id: "square", label: "Square" },
];

const CAPE_STYLES = [
  { id: "none", label: "None" },
  { id: "cape", label: "Cape" },
  { id: "wings", label: "Wings" },
  { id: "backpack", label: "Backpack" },
  { id: "jetpack", label: "Jetpack" },
  { id: "scarf", label: "Scarf" },
];

const AURA_STYLES = [
  { id: "none", label: "None" },
  { id: "glow", label: "Soft Glow" },
  { id: "flames", label: "Flames" },
  { id: "electric", label: "Electric" },
  { id: "rainbow", label: "Rainbow" },
  { id: "shadow", label: "Shadow" },
  { id: "leaves", label: "Leaves" },
];

const PARTICLE_EFFECTS = [
  { id: "none", label: "None" },
  { id: "sparkles", label: "✨ Sparkles" },
  { id: "hearts", label: "💕 Hearts" },
  { id: "fire", label: "🔥 Fire" },
  { id: "snow", label: "❄️ Snow" },
  { id: "stars", label: "⭐ Stars" },
];

interface AvatarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentCustomization: AvatarCustomization;
  onSave: (customization: AvatarCustomization) => void;
}

const ColorPicker = ({ colors, selected, onSelect, label }: {
  colors: string[]; selected: string; onSelect: (c: string) => void; label: string;
}) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${
            selected === c ? "border-primary scale-110 ring-2 ring-primary/50" : "border-border"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  </div>
);

const OptionPicker = ({ options, selected, onSelect, label }: {
  options: { id: string; label: string }[]; selected: string; onSelect: (id: string) => void; label: string;
}) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.id}
          variant={selected === opt.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(opt.id)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  </div>
);

const SliderRow = ({ label, value, onChange, min = 0.85, max = 1.2, step = 0.01 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <Label>{label}</Label>
      <span className="text-muted-foreground tabular-nums">{value.toFixed(2)}x</span>
    </div>
    <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} />
  </div>
);

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const AvatarCustomizer = ({ isOpen, onClose, userId, currentCustomization, onSave }: AvatarCustomizerProps) => {
  const [customization, setCustomization] = useState<AvatarCustomization>({ ...DEFAULT_CUSTOMIZATION, ...currentCustomization });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCustomization({ ...DEFAULT_CUSTOMIZATION, ...currentCustomization });
  }, [currentCustomization, isOpen]);

  const update = <K extends keyof AvatarCustomization>(key: K, value: AvatarCustomization[K]) => {
    setCustomization((prev) => ({ ...prev, [key]: value }));
  };

  const randomize = () => {
    setCustomization({
      bodyColor: pick(SKIN_COLORS),
      shirtColor: pick(SHIRT_COLORS),
      headShape: pick(HEAD_SHAPES).id,
      hatStyle: pick(HAT_STYLES).id,
      hatColor: pick(ACCESSORY_COLORS),
      glassesStyle: pick(GLASSES_STYLES).id,
      glassesColor: pick(ACCESSORY_COLORS),
      hairStyle: pick(HAIR_STYLES).id,
      hairColor: pick(HAIR_COLORS),
      eyeColor: pick(EYE_COLORS),
      capeStyle: pick(CAPE_STYLES).id,
      capeColor: pick(ACCESSORY_COLORS),
      auraStyle: pick(AURA_STYLES).id,
      auraColor: pick(ACCESSORY_COLORS),
      nameColor: pick(NAME_COLORS),
      particleEffect: pick(PARTICLE_EFFECTS).id,
      height: 0.9 + Math.random() * 0.25,
      build: 0.9 + Math.random() * 0.25,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_customization: customization as any })
        .eq("id", userId);
      if (error) throw error;
      onSave(customization);
      toast({ title: "Avatar saved!" });
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Error saving avatar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Customize Your Avatar</DialogTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={randomize} title="Randomize">
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCustomization(DEFAULT_CUSTOMIZATION)} title="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[62vh]">
          <Tabs defaultValue="body" className="pr-4">
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="hair">Hair</TabsTrigger>
              <TabsTrigger value="face">Face</TabsTrigger>
              <TabsTrigger value="acc">Acc.</TabsTrigger>
              <TabsTrigger value="cape">Cape</TabsTrigger>
              <TabsTrigger value="fx">FX</TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="space-y-4 mt-4">
              <ColorPicker colors={SKIN_COLORS} selected={customization.bodyColor} onSelect={(c) => update("bodyColor", c)} label="Skin Color" />
              <ColorPicker colors={SHIRT_COLORS} selected={customization.shirtColor} onSelect={(c) => update("shirtColor", c)} label="Shirt Color" />
              <OptionPicker options={HEAD_SHAPES} selected={customization.headShape} onSelect={(id) => update("headShape", id)} label="Head Shape" />
              <SliderRow label="Height" value={customization.height ?? 1} onChange={(v) => update("height", v)} />
              <SliderRow label="Build" value={customization.build ?? 1} onChange={(v) => update("build", v)} />
            </TabsContent>

            <TabsContent value="hair" className="space-y-4 mt-4">
              <OptionPicker options={HAIR_STYLES} selected={customization.hairStyle ?? "short"} onSelect={(id) => update("hairStyle", id)} label="Hair Style" />
              {customization.hairStyle !== "none" && (
                <ColorPicker colors={HAIR_COLORS} selected={customization.hairColor ?? "#4a2c1a"} onSelect={(c) => update("hairColor", c)} label="Hair Color" />
              )}
            </TabsContent>

            <TabsContent value="face" className="space-y-4 mt-4">
              <ColorPicker colors={EYE_COLORS} selected={customization.eyeColor ?? "#2c1810"} onSelect={(c) => update("eyeColor", c)} label="Eye Color" />
              <OptionPicker options={GLASSES_STYLES} selected={customization.glassesStyle} onSelect={(id) => update("glassesStyle", id)} label="Glasses" />
              {customization.glassesStyle !== "none" && (
                <ColorPicker colors={ACCESSORY_COLORS} selected={customization.glassesColor} onSelect={(c) => update("glassesColor", c)} label="Frame Color" />
              )}
            </TabsContent>

            <TabsContent value="acc" className="space-y-4 mt-4">
              <OptionPicker options={HAT_STYLES} selected={customization.hatStyle} onSelect={(id) => update("hatStyle", id)} label="Hat" />
              {customization.hatStyle !== "none" && (
                <ColorPicker colors={ACCESSORY_COLORS} selected={customization.hatColor} onSelect={(c) => update("hatColor", c)} label="Hat Color" />
              )}
              <ColorPicker colors={NAME_COLORS} selected={customization.nameColor ?? "#ffffff"} onSelect={(c) => update("nameColor", c)} label="Name Tag Color" />
            </TabsContent>

            <TabsContent value="cape" className="space-y-4 mt-4">
              <OptionPicker options={CAPE_STYLES} selected={customization.capeStyle ?? "none"} onSelect={(id) => update("capeStyle", id)} label="Back Accessory" />
              {customization.capeStyle && customization.capeStyle !== "none" && (
                <ColorPicker colors={ACCESSORY_COLORS} selected={customization.capeColor ?? "#a855f7"} onSelect={(c) => update("capeColor", c)} label="Color" />
              )}
            </TabsContent>

            <TabsContent value="fx" className="space-y-4 mt-4">
              <OptionPicker options={AURA_STYLES} selected={customization.auraStyle ?? "none"} onSelect={(id) => update("auraStyle", id)} label="Aura" />
              {customization.auraStyle && customization.auraStyle !== "none" && (
                <ColorPicker colors={ACCESSORY_COLORS} selected={customization.auraColor ?? "#a855f7"} onSelect={(c) => update("auraColor", c)} label="Aura Color" />
              )}
              <OptionPicker options={PARTICLE_EFFECTS} selected={customization.particleEffect} onSelect={(id) => update("particleEffect", id)} label="Particle Effect" />
            </TabsContent>
          </Tabs>
        </ScrollArea>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Avatar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCustomizer;
