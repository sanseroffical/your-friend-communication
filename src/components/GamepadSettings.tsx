import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  ACTIONS, INPUTS, PROFILES,
  loadMapping, saveMapping, resetMapping,
  loadHapticsEnabled, saveHapticsEnabled,
  loadGamepadEnabled, saveGamepadEnabled,
  vibrateGamepad,
  DEFAULT_GLOBAL_MAPPING,
  type ActionCode, type Mapping,
} from "@/lib/gamepad";

interface Props {
  trigger?: React.ReactNode;
}

export default function GamepadSettings({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<string>("global");
  const [mapping, setMapping] = useState<Mapping>(() => loadMapping("global"));
  const [haptics, setHaptics] = useState<boolean>(() => loadHapticsEnabled());
  const [enabled, setEnabled] = useState<boolean>(() => loadGamepadEnabled());
  const [connected, setConnected] = useState<string | null>(null);
  const [livePressed, setLivePressed] = useState<Set<string>>(new Set());

  // Refresh mapping when profile changes.
  useEffect(() => { setMapping(loadMapping(profile)); }, [profile]);

  // Detect connected controller + live-highlight buttons while dialog is open.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = pads.find((p) => p);
      setConnected(pad ? pad.id.split("(")[0].trim() : null);
      if (pad) {
        const next = new Set<string>();
        pad.buttons.forEach((b, i) => {
          if (i > 15) return;
          const down = typeof b === "object" ? b.pressed : (b as unknown as number) > 0.5;
          if (down) next.add(`b${i}`);
        });
        const [lx = 0, ly = 0] = pad.axes;
        const DZ = 0.35;
        if (lx < -DZ) next.add("lsl");
        if (lx > DZ) next.add("lsr");
        if (ly < -DZ) next.add("lsu");
        if (ly > DZ) next.add("lsd");
        setLivePressed(next);
      } else {
        setLivePressed(new Set());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const setBinding = (inputId: string, action: ActionCode) => {
    const next: Mapping = { ...mapping, [inputId]: action === "None" ? [] : [action] };
    setMapping(next);
    saveMapping(profile, next);
  };

  const doReset = () => {
    resetMapping(profile);
    const fresh = loadMapping(profile);
    setMapping(fresh);
    toast.success(`${PROFILES.find((p) => p.id === profile)?.label ?? profile} mapping reset`);
  };

  const currentBinding = (inputId: string): ActionCode => {
    const arr = mapping[inputId];
    if (arr && arr.length) return arr[0];
    if (profile !== "global") {
      const g = DEFAULT_GLOBAL_MAPPING[inputId];
      if (g && g.length) return g[0];
    }
    return "None";
  };

  const isFallback = (inputId: string) => !(mapping[inputId] && mapping[inputId].length);

  const groupedInputs = useMemo(() => {
    return {
      Face: INPUTS.filter((i) => i.id.match(/^b[0-3]$/)),
      Shoulders: INPUTS.filter((i) => ["b4","b5","b6","b7"].includes(i.id)),
      System: INPUTS.filter((i) => ["b8","b9"].includes(i.id)),
      DPad: INPUTS.filter((i) => ["b12","b13","b14","b15"].includes(i.id)),
      Stick: INPUTS.filter((i) => i.kind === "axis"),
    } as const;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Gamepad2 className="h-4 w-4" /> Controller
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gradient-primary">
            <Gamepad2 className="h-5 w-5" /> Controller Settings
          </DialogTitle>
          <DialogDescription>
            Remap buttons per game and tune haptics. Controller works everywhere in the app — not just games.
          </DialogDescription>
        </DialogHeader>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
          <Badge variant={connected ? "default" : "secondary"} className="gap-1">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
            {connected ?? "No controller detected"}
          </Badge>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Label htmlFor="gp-enabled" className="text-xs">Enable</Label>
            <Switch id="gp-enabled" checked={enabled} onCheckedChange={(v) => { setEnabled(v); saveGamepadEnabled(v); }} />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="gp-haptics" className="text-xs">Haptics</Label>
            <Switch id="gp-haptics" checked={haptics} onCheckedChange={(v) => { setHaptics(v); saveHapticsEnabled(v); }} />
          </div>
          <Button
            variant="ghost" size="sm" className="gap-1"
            onClick={() => { saveHapticsEnabled(true); vibrateGamepad({ duration: 250, strong: 0.8, weak: 0.4 }); setHaptics(true); }}
          >
            <Zap className="h-3.5 w-3.5" /> Test rumble
          </Button>
        </div>

        {/* Profile picker */}
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Profile:</Label>
          <Select value={profile} onValueChange={setProfile}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROFILES.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={doReset} className="gap-1 shrink-0">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
        {profile !== "global" && (
          <p className="text-xs text-muted-foreground -mt-1">
            Empty bindings fall back to your Global mapping.
          </p>
        )}

        {/* Bindings */}
        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-4">
            {Object.entries(groupedInputs).map(([groupName, inputs]) => (
              <div key={groupName}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{groupName}</div>
                <div className="space-y-1.5">
                  {inputs.map((inp) => {
                    const live = livePressed.has(inp.id);
                    const value = currentBinding(inp.id);
                    return (
                      <div
                        key={inp.id}
                        className={`flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                          live ? "border-primary bg-primary/10" : "border-border/60"
                        }`}
                      >
                        <div className="w-40 shrink-0">
                          <div className="text-sm font-medium">{inp.label}</div>
                          <div className="text-[10px] text-muted-foreground">{inp.hint}</div>
                        </div>
                        <Select value={value} onValueChange={(v) => setBinding(inp.id, v as ActionCode)}>
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIONS.map((a) => (
                              <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isFallback(inp.id) && value !== "None" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">global</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
