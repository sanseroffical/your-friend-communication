
-- 1) banned_ips
CREATE TABLE public.banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip INET NOT NULL UNIQUE,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_ips TO authenticated;
GRANT ALL ON public.banned_ips TO service_role;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage banned_ips" ON public.banned_ips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) pvp_stats
CREATE TABLE public.pvp_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  elo INTEGER NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pvp_stats TO authenticated;
GRANT INSERT, UPDATE ON public.pvp_stats TO authenticated;
GRANT ALL ON public.pvp_stats TO service_role;
ALTER TABLE public.pvp_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PvP stats readable to signed-in" ON public.pvp_stats
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users insert own pvp row" ON public.pvp_stats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pvp row" ON public.pvp_stats
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) app_settings singleton
CREATE TABLE public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  maintenance BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT NOT NULL DEFAULT 'We''ll be right back.',
  discord_notify_reports BOOLEAN NOT NULL DEFAULT false,
  discord_notify_feature_requests BOOLEAN NOT NULL DEFAULT false,
  discord_notify_announcements BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app_settings" ON public.app_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins update app_settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 4) profiles: Discord fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_avatar TEXT;

-- 5) admin bulk delete messages
CREATE OR REPLACE FUNCTION public.admin_bulk_delete_messages(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can bulk delete';
  END IF;
  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) > 500 THEN
    RAISE EXCEPTION 'Must delete between 1 and 500 messages';
  END IF;
  WITH d AS (
    DELETE FROM public.messages WHERE id = ANY(p_ids) RETURNING 1
  )
  SELECT count(*) INTO v_count FROM d;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_bulk_delete_messages(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_messages(UUID[]) TO authenticated;

-- 6) admin ban ip
CREATE OR REPLACE FUNCTION public.admin_ban_ip(p_ip INET, p_reason TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban IPs';
  END IF;
  INSERT INTO public.banned_ips (ip, reason, banned_by)
  VALUES (p_ip, p_reason, auth.uid())
  ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason, banned_by = auth.uid()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_ban_ip(INET, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_ip(INET, TEXT) TO authenticated;

-- 7) pvp result reporter (server-side ELO)
CREATE OR REPLACE FUNCTION public.record_pvp_result(p_opponent UUID, p_won BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_my_elo INTEGER;
  v_op_elo INTEGER;
  v_expected NUMERIC;
  v_k CONSTANT INTEGER := 24;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_me = p_opponent THEN RAISE EXCEPTION 'Cannot play yourself'; END IF;

  INSERT INTO public.pvp_stats (user_id) VALUES (v_me) ON CONFLICT DO NOTHING;
  INSERT INTO public.pvp_stats (user_id) VALUES (p_opponent) ON CONFLICT DO NOTHING;

  SELECT elo INTO v_my_elo FROM public.pvp_stats WHERE user_id = v_me;
  SELECT elo INTO v_op_elo FROM public.pvp_stats WHERE user_id = p_opponent;

  v_expected := 1.0 / (1.0 + power(10.0, (v_op_elo - v_my_elo) / 400.0));

  UPDATE public.pvp_stats
    SET elo = elo + round(v_k * ((CASE WHEN p_won THEN 1 ELSE 0 END) - v_expected))::int,
        wins = wins + (CASE WHEN p_won THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN p_won THEN 0 ELSE 1 END),
        updated_at = now()
  WHERE user_id = v_me;
END;
$$;
REVOKE ALL ON FUNCTION public.record_pvp_result(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pvp_result(UUID, BOOLEAN) TO authenticated;
