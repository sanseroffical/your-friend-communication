import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { History, Save, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Snapshot {
  id: string;
  label: string;
  kind: string;
  created_at: string;
  profile_data: Record<string, any> | null;
  settings_data: Record<string, any> | null;
}

const PROFILE_FIELDS = [
  "display_name","avatar_url","bio","profile_theme","card_style",
  "banner_url","profile_music_url","gif_avatar_url","avatar_customization",
] as const;

const SETTINGS_FIELDS = [
  "theme","font_size","font_family","reduce_motion","high_contrast",
  "screen_reader_mode","bonzi_enabled","bonzi_chaos_level",
  "command_prompt_mode","ambient_volume",
] as const;

function pick<T extends Record<string, any>>(obj: T | null | undefined, keys: readonly string[]) {
  if (!obj) return {};
  const out: Record<string, any> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

export default function VersionHistory({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_snapshots")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setSnapshots((data as Snapshot[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const saveSnapshot = async (kind: "manual" | "auto" = "manual", customLabel?: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const { error } = await supabase.from("user_snapshots").insert({
        user_id: user.id,
        label: (customLabel || label || `Snapshot ${new Date().toLocaleString()}`).slice(0, 80),
        kind,
        profile_data: pick(profile as any, PROFILE_FIELDS),
        settings_data: pick(settings as any, SETTINGS_FIELDS),
      });
      if (error) throw error;
      setLabel("");
      toast({ title: "Snapshot saved", description: "You can restore to this version later." });
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const restore = async (snap: Snapshot) => {
    setRestoringId(snap.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      // Auto-snapshot current state before overwriting
      await saveSnapshot("auto", `Auto-backup before restoring "${snap.label}"`);
      if (snap.profile_data && Object.keys(snap.profile_data).length) {
        const { error } = await supabase.from("profiles").update(snap.profile_data).eq("id", user.id);
        if (error) throw error;
      }
      if (snap.settings_data && Object.keys(snap.settings_data).length) {
        const { error } = await supabase.from("user_settings")
          .upsert({ user_id: user.id, ...snap.settings_data }, { onConflict: "user_id" });
        if (error) throw error;
      }
      toast({ title: "Restored", description: `Reverted to "${snap.label}". Reloading…` });
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast({ title: "Restore failed", description: e.message, variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_snapshots").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); await load(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="h-11 justify-start">
            <History className="mr-2 h-4 w-4" /> Version History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version History</DialogTitle>
          <DialogDescription>
            Save snapshots of your profile, avatar, and settings — restore any of them later. Up to 50 kept.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Optional label (e.g. 'Halloween look')"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
          <Button onClick={() => saveSnapshot("manual")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save</>}
          </Button>
        </div>

        <ScrollArea className="h-[min(60vh,420px)] pr-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No snapshots yet. Save one before big changes so you can roll back.
            </p>
          ) : (
            <ul className="space-y-2">
              {snapshots.map((s) => (
                <li key={s.id} className="glass-card p-3 rounded-md flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      {s.kind === "auto" && " · auto"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="secondary" disabled={restoringId === s.id}>
                          {restoringId === s.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <RotateCcw className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your profile, avatar, and settings will be reverted to "{s.label}". Your current state
                            will be auto-saved as a backup first, and the page will reload.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => restore(s)}>Restore</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
