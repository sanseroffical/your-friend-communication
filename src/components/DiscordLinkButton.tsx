import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link as LinkIcon, Unlink, CheckCircle2, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Discord OAuth client-side redirect flow. The redirect URI must be added in the
// Discord developer portal for the configured DISCORD_CLIENT_ID.
const REDIRECT_URI = typeof window !== "undefined" ? `${window.location.origin}/?discord=1` : "";

export default function DiscordLinkButton() {
  const [discord, setDiscord] = useState<{ id: string | null; username: string | null; avatar: string | null }>({
    id: null, username: null, avatar: null,
  });
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(
    (import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined) ?? null
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles")
        .select("discord_id, discord_username, discord_avatar")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setDiscord({ id: data.discord_id, username: data.discord_username, avatar: data.discord_avatar });
    })();
  }, []);

  // Handle callback if Discord redirected back with ?code=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code || !url.searchParams.get("discord")) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("discord-oauth", {
        body: { code, redirect_uri: REDIRECT_URI },
      });
      setLoading(false);
      // clean the URL
      url.searchParams.delete("code");
      url.searchParams.delete("discord");
      window.history.replaceState({}, "", url.pathname + url.search);
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? "Failed to link Discord");
        return;
      }
      const d = (data as any).discord;
      setDiscord({ id: d.id, username: d.username, avatar: d.avatar });
      toast.success(`Linked as ${d.username}`);
    })();
  }, []);

  const beginOAuth = () => {
    if (!clientId) {
      const cid = window.prompt("Enter your Discord Client ID (one-time). Ask an admin to set VITE_DISCORD_CLIENT_ID.");
      if (!cid) return;
      setClientId(cid);
      localStorage.setItem("discord_client_id", cid);
    }
    const finalId = clientId ?? localStorage.getItem("discord_client_id");
    if (!finalId) return;
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", finalId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify");
    window.location.href = url.toString();
  };

  const unlink = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles")
      .update({ discord_id: null, discord_username: null, discord_avatar: null })
      .eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    setDiscord({ id: null, username: null, avatar: null });
    toast.success("Discord unlinked");
  };

  useEffect(() => {
    const saved = localStorage.getItem("discord_client_id");
    if (!clientId && saved) setClientId(saved);
  }, [clientId]);

  if (discord.id) {
    return (
      <div className="flex items-center gap-2">
        {discord.avatar && (
          <img
            src={`https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png?size=64`}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        )}
        <span className="text-sm">{discord.username}</span>
        <Button size="sm" variant="ghost" onClick={unlink}>
          <Unlink className="h-3 w-3 mr-1" /> Unlink
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={beginOAuth} disabled={loading}>
      <LinkIcon className="h-3 w-3 mr-1" /> Link Discord
    </Button>
  );
}
