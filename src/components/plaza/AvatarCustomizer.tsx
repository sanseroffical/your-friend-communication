import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

export const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
  bodyColor: "#3498db",
  headShape: "round",
  hatStyle: "none",
  hatColor: "#e74c3c",
  glassesStyle: "none",
  glassesColor: "#333333",
  shirtColor: "#2ecc71",
  particleEffect: "none",
};

const BODY_COLORS = [
  "#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#e91e63", "#00bcd4", "#8bc34a",
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#f8b500", "#6c5ce7",
];

const SHIRT_COLORS = [
  "#2ecc71", "#3498db", "#e74c3c", "#f39c12", "#9b59b6",
  "#1abc9c", "#34495e", "#ecf0f1", "#e67e22", "#2c3e50",
];

const HAT_STYLES = [
  { id: "none", label: "None" },
  { id: "tophat", label: "Top Hat" },
  { id: "cap", label: "Cap" },
  { id: "beanie", label: "Beanie" },
  { id: "crown", label: "Crown" },
  { id: "halo", label: "Halo" },
];

const HAT_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#34495e", "#ecf0f1", "#e67e22", "#1abc9c", "#ffd700",
];

const GLASSES_STYLES = [
  { id: "none", label: "None" },
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "monocle", label: "Monocle" },
];

const HEAD_SHAPES = [
  { id: "round", label: "Round" },
  { id: "oval", label: "Oval" },
  { id: "square", label: "Square" },
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
  colors: string[];
  selected: string;
  onSelect: (c: string) => void;
  label: string;
}) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`w-8 h-8 rounded-full border-2 transition-transform ${
            selected === c ? "border-primary scale-110 ring-2 ring-primary/50" : "border-border"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  </div>
);

const OptionPicker = ({ options, selected, onSelect, label }: {
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
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

const AvatarCustomizer = ({ isOpen, onClose, userId, currentCustomization, onSave }: AvatarCustomizerProps) => {
  const [customization, setCustomization] = useState<AvatarCustomization>(currentCustomization);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCustomization(currentCustomization);
  }, [currentCustomization, isOpen]);

  const update = (key: keyof AvatarCustomization, value: string) => {
    setCustomization((prev) => ({ ...prev, [key]: value }));
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
      <DialogContent className="max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Customize Your Avatar</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <Tabs defaultValue="body" className="pr-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="head">Head</TabsTrigger>
              <TabsTrigger value="accessories">Acc.</TabsTrigger>
              <TabsTrigger value="effects">FX</TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="space-y-4 mt-4">
              <ColorPicker colors={BODY_COLORS} selected={customization.bodyColor} onSelect={(c) => update("bodyColor", c)} label="Skin Color" />
              <ColorPicker colors={SHIRT_COLORS} selected={customization.shirtColor} onSelect={(c) => update("shirtColor", c)} label="Shirt Color" />
            </TabsContent>

            <TabsContent value="head" className="space-y-4 mt-4">
              <OptionPicker options={HEAD_SHAPES} selected={customization.headShape} onSelect={(id) => update("headShape", id)} label="Head Shape" />
            </TabsContent>

            <TabsContent value="accessories" className="space-y-4 mt-4">
              <OptionPicker options={HAT_STYLES} selected={customization.hatStyle} onSelect={(id) => update("hatStyle", id)} label="Hat" />
              {customization.hatStyle !== "none" && (
                <ColorPicker colors={HAT_COLORS} selected={customization.hatColor} onSelect={(c) => update("hatColor", c)} label="Hat Color" />
              )}
              <OptionPicker options={GLASSES_STYLES} selected={customization.glassesStyle} onSelect={(id) => update("glassesStyle", id)} label="Glasses" />
            </TabsContent>

            <TabsContent value="effects" className="space-y-4 mt-4">
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
