import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Wrench } from "lucide-react";

interface Settings {
  maintenance: boolean;
  maintenance_message: string;
}

export default function MaintenanceOverlay() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const { isAdmin } = useUserRole(uid);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("maintenance, maintenance_message")
        .maybeSingle();
      if (mounted && data) setSettings(data as Settings);
    };
    load();

    const channel = supabase
      .channel("app-settings-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings" },
        (payload) => setSettings(payload.new as Settings)
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!settings?.maintenance || isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="glass rounded-2xl p-8 max-w-md text-center mx-4">
        <Wrench className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
        <h1 className="text-2xl font-bold mb-2">Maintenance mode</h1>
        <p className="text-muted-foreground">{settings.maintenance_message}</p>
        <p className="text-xs text-muted-foreground mt-6">This page will update automatically when we're back.</p>
      </div>
    </div>
  );
}
