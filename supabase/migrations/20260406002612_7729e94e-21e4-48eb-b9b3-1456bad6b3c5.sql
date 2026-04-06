
-- Fix stories: ensure auth required (previous migration may not have applied)
DROP POLICY IF EXISTS "Anyone can view non-expired stories" ON public.stories;
DROP POLICY IF EXISTS "Authenticated users can view non-expired stories" ON public.stories;
CREATE POLICY "Authenticated users can view non-expired stories"
  ON public.stories FOR SELECT
  USING (auth.uid() IS NOT NULL AND expires_at > now());

-- Fix user_levels: remove direct UPDATE policy, add secure function
DROP POLICY IF EXISTS "Users can update own level" ON public.user_levels;

-- Create a secure function for XP increments
CREATE OR REPLACE FUNCTION public.increment_user_xp(p_user_id uuid, p_xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp integer;
  v_current_level integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  IF p_xp_amount < 0 OR p_xp_amount > 500 THEN
    RAISE EXCEPTION 'Invalid XP amount: must be between 0 and 500';
  END IF;

  SELECT xp, level INTO v_current_xp, v_current_level
  FROM public.user_levels WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_levels (user_id, xp, level)
    VALUES (p_user_id, p_xp_amount, 1);
    RETURN;
  END IF;

  v_new_xp := v_current_xp + p_xp_amount;
  v_new_level := 1 + floor(v_new_xp / 100)::integer;

  UPDATE public.user_levels
  SET xp = v_new_xp, level = v_new_level, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Admin XP boost function (allows higher amounts)
CREATE OR REPLACE FUNCTION public.admin_boost_xp(p_target_user_id uuid, p_xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can boost XP';
  END IF;

  IF p_xp_amount < 1 OR p_xp_amount > 10000 THEN
    RAISE EXCEPTION 'XP boost must be between 1 and 10000';
  END IF;

  SELECT xp INTO v_current_xp
  FROM public.user_levels WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_levels (user_id, xp, level)
    VALUES (p_target_user_id, p_xp_amount, 1 + floor(p_xp_amount / 100)::integer);
    RETURN;
  END IF;

  v_new_xp := v_current_xp + p_xp_amount;
  v_new_level := 1 + floor(v_new_xp / 100)::integer;

  UPDATE public.user_levels
  SET xp = v_new_xp, level = v_new_level, updated_at = now()
  WHERE user_id = p_target_user_id;
END;
$$;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

-- Create shadow_bans table
CREATE TABLE IF NOT EXISTS public.shadow_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shadow_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shadow bans"
  ON public.shadow_bans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
