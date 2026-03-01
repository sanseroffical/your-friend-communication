import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useActivityTracking() {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id || null;
    });
  }, []);

  const trackActivity = useCallback(async (activityType: string, metadata: Record<string, unknown> = {}) => {
    if (!userIdRef.current) return;
    try {
      await supabase.from("user_activity").insert({
        user_id: userIdRef.current,
        activity_type: activityType,
        metadata,
      } as any);
    } catch (e) {
      // Silent fail - tracking should not block UX
    }
  }, []);

  return { trackActivity };
}
