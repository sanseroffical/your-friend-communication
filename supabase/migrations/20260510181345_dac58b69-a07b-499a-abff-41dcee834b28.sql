
-- 1) Admin whitelist table (idempotent for fresh environments)
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  added_by uuid,
  added_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  notes text
);
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- 2) Lock down increment_user_xp: only the caller can increment their own XP
CREATE OR REPLACE FUNCTION public.increment_user_xp(p_user_id uuid, p_xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_xp integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot modify another user''s XP';
  END IF;

  IF p_xp_amount < 0 OR p_xp_amount > 500 THEN
    RAISE EXCEPTION 'Invalid XP amount: must be between 0 and 500';
  END IF;

  SELECT xp INTO v_current_xp FROM public.user_levels WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_levels (user_id, xp, level)
    VALUES (p_user_id, p_xp_amount, 1 + floor(p_xp_amount / 100)::integer);
    RETURN;
  END IF;
  v_new_xp := v_current_xp + p_xp_amount;
  v_new_level := 1 + floor(v_new_xp / 100)::integer;
  UPDATE public.user_levels
  SET xp = v_new_xp, level = v_new_level, updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$;

-- 3) Quest reward claim: atomic SECURITY DEFINER, no double-claims
CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_progress_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
  v_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_quest_progress qp
  SET claimed_at = now(), updated_at = now()
  FROM public.quests q
  WHERE qp.id = p_progress_id
    AND qp.user_id = auth.uid()
    AND qp.completed_at IS NOT NULL
    AND qp.claimed_at IS NULL
    AND q.id = qp.quest_id
  RETURNING q.xp_reward, qp.user_id INTO v_xp, v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot claim reward';
  END IF;

  -- Award XP directly (bypass per-call cap since rewards are server-defined)
  INSERT INTO public.user_levels (user_id, xp, level)
  VALUES (v_user, v_xp, 1 + floor(v_xp / 100)::integer)
  ON CONFLICT (user_id) DO UPDATE
    SET xp = public.user_levels.xp + EXCLUDED.xp,
        level = 1 + floor((public.user_levels.xp + EXCLUDED.xp) / 100)::integer,
        updated_at = now();

  RETURN v_xp;
END;
$$;

-- Make sure user_levels has the unique constraint used above
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_levels_user_id_key'
  ) THEN
    ALTER TABLE public.user_levels ADD CONSTRAINT user_levels_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 4) Streak bonus claim: atomic SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.claim_streak_bonus()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_streak integer;
  v_bonus integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_streaks
  SET streak_xp_claimed_today = true, updated_at = now()
  WHERE user_id = auth.uid()
    AND streak_xp_claimed_today = false
    AND last_active_date = current_date
  RETURNING current_streak INTO v_streak;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Already claimed or no active streak';
  END IF;

  v_bonus := CASE
    WHEN v_streak >= 30 THEN 100
    WHEN v_streak >= 14 THEN 50
    WHEN v_streak >= 7 THEN 25
    WHEN v_streak >= 3 THEN 15
    WHEN v_streak >= 1 THEN 10
    ELSE 0
  END;

  IF v_bonus > 0 THEN
    INSERT INTO public.user_levels (user_id, xp, level)
    VALUES (auth.uid(), v_bonus, 1 + floor(v_bonus / 100)::integer)
    ON CONFLICT (user_id) DO UPDATE
      SET xp = public.user_levels.xp + EXCLUDED.xp,
          level = 1 + floor((public.user_levels.xp + EXCLUDED.xp) / 100)::integer,
          updated_at = now();
  END IF;

  RETURN v_bonus;
END;
$$;

-- Restrict user_streaks UPDATE so users cannot reset the claimed flag themselves
DROP POLICY IF EXISTS "Users can update own streaks" ON public.user_streaks;
CREATE POLICY "Users can update own streaks"
  ON public.user_streaks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- prevent users from re-opening a claim that's already been taken today
    AND NOT (
      streak_xp_claimed_today = false
      AND last_active_date = current_date
      AND EXISTS (
        SELECT 1 FROM public.user_streaks s
        WHERE s.user_id = auth.uid()
          AND s.streak_xp_claimed_today = true
          AND s.last_active_date = current_date
      )
    )
  );

-- 5) user_badges: prevent self-grant. Remove user INSERT, keep view; admins/system only.
DROP POLICY IF EXISTS "Users can earn own badges" ON public.user_badges;
CREATE POLICY "Admins can grant badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.award_badge(p_badge_type text, p_badge_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'first_post','social_butterfly','storyteller','early_adopter',
    'verified','popular','chatterbox','gamer','night_owl','photographer'
  ];
  v_qualifies boolean := false;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT (p_badge_type = ANY(v_allowed)) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = auth.uid() AND badge_type = p_badge_type) THEN
    RETURN false;
  END IF;

  -- Server-side eligibility checks
  IF p_badge_type = 'first_post' THEN
    SELECT count(*) INTO v_count FROM public.social_posts WHERE user_id = auth.uid();
    v_qualifies := v_count >= 1;
  ELSIF p_badge_type = 'social_butterfly' THEN
    SELECT count(*) INTO v_count FROM public.follows WHERE following_id = auth.uid();
    v_qualifies := v_count >= 10;
  ELSIF p_badge_type = 'storyteller' THEN
    SELECT count(*) INTO v_count FROM public.stories WHERE user_id = auth.uid();
    v_qualifies := v_count >= 5;
  ELSIF p_badge_type = 'photographer' THEN
    SELECT count(*) INTO v_count FROM public.social_posts
      WHERE user_id = auth.uid() AND image_url IS NOT NULL;
    v_qualifies := v_count >= 10;
  ELSE
    v_qualifies := false; -- other badges require admin grant
  END IF;

  IF NOT v_qualifies THEN RETURN false; END IF;

  INSERT INTO public.user_badges (user_id, badge_type, badge_name)
  VALUES (auth.uid(), p_badge_type, p_badge_name)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

-- 6) user_levels: prevent direct user UPDATE; INSERT only of zero-xp baseline
DROP POLICY IF EXISTS "Users can insert own level" ON public.user_levels;
CREATE POLICY "Users can insert own baseline level"
  ON public.user_levels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND xp = 0 AND level = 1);
-- (No UPDATE/DELETE policy => denied; SECURITY DEFINER funcs bypass RLS)

-- 7) hashtags: restrict UPDATE (only post_count, owned by system)
DROP POLICY IF EXISTS "Authenticated users can update hashtag counts" ON public.hashtags;
-- No replacement policy: hashtag counts must be updated by future server-side logic

-- 8) feature_requests: prevent upvote manipulation by owners
DROP POLICY IF EXISTS "Users can update own requests" ON public.feature_requests;
CREATE POLICY "Users can update own requests (no upvotes)"
  ON public.feature_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND upvotes = (SELECT upvotes FROM public.feature_requests WHERE id = feature_requests.id)
  );

-- 9) game_scores: add sanity bounds
ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_score_bounds,
  ADD CONSTRAINT game_scores_score_bounds CHECK (score >= 0 AND score <= 10000000);
ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_time_bounds,
  ADD CONSTRAINT game_scores_time_bounds CHECK (time_seconds IS NULL OR (time_seconds >= 0 AND time_seconds <= 86400));
