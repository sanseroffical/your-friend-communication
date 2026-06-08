
-- 1) Fix feature_requests upvote bypass (self-join referenced wrong alias)
DROP POLICY IF EXISTS "Users can update own requests (no upvotes)" ON public.feature_requests;
CREATE POLICY "Users can update own requests (no upvotes)"
ON public.feature_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND upvotes = (SELECT fr.upvotes FROM public.feature_requests fr WHERE fr.id = feature_requests.id)
);

-- 2) user_quest_progress: prevent users from forging completion/claim and from
--    arbitrarily inflating progress. Progress can only move forward by small
--    increments, completed_at only fires when threshold reached, and claimed_at
--    can only be written by SECURITY DEFINER RPC (claim_quest_reward).
CREATE OR REPLACE FUNCTION public.guard_user_quest_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_required integer;
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.quest_id IS DISTINCT FROM OLD.quest_id THEN
    RAISE EXCEPTION 'Cannot reassign quest progress';
  END IF;

  -- claimed_at is RPC-only
  IF NEW.claimed_at IS DISTINCT FROM OLD.claimed_at THEN
    RAISE EXCEPTION 'claimed_at can only be set via claim_quest_reward()';
  END IF;

  -- progress must move forward, capped per update to limit abuse
  IF NEW.current_progress < COALESCE(OLD.current_progress, 0) THEN
    RAISE EXCEPTION 'Quest progress cannot decrease';
  END IF;
  IF NEW.current_progress - COALESCE(OLD.current_progress, 0) > 50 THEN
    RAISE EXCEPTION 'Quest progress increment too large';
  END IF;

  SELECT requirement_count INTO v_required
  FROM public.quests WHERE id = NEW.quest_id;

  IF v_required IS NOT NULL AND NEW.current_progress > v_required THEN
    NEW.current_progress := v_required;
  END IF;

  -- completed_at only valid when threshold met, and cannot be cleared
  IF NEW.completed_at IS NOT NULL
     AND OLD.completed_at IS NULL
     AND (v_required IS NULL OR NEW.current_progress < v_required) THEN
    RAISE EXCEPTION 'Cannot mark quest complete before meeting requirement';
  END IF;
  IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Cannot clear quest completion';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_quest_progress_trg ON public.user_quest_progress;
CREATE TRIGGER guard_user_quest_progress_trg
BEFORE UPDATE ON public.user_quest_progress
FOR EACH ROW EXECUTE FUNCTION public.guard_user_quest_progress();

-- Also guard INSERT: cannot create an already-completed/claimed row
CREATE OR REPLACE FUNCTION public.guard_user_quest_progress_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_required integer;
BEGIN
  IF NEW.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot insert pre-claimed quest progress';
  END IF;
  SELECT requirement_count INTO v_required FROM public.quests WHERE id = NEW.quest_id;
  IF v_required IS NOT NULL AND NEW.current_progress > v_required THEN
    NEW.current_progress := v_required;
  END IF;
  IF NEW.completed_at IS NOT NULL
     AND (v_required IS NULL OR NEW.current_progress < v_required) THEN
    RAISE EXCEPTION 'Cannot insert completed quest progress without meeting requirement';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_quest_progress_insert_trg ON public.user_quest_progress;
CREATE TRIGGER guard_user_quest_progress_insert_trg
BEFORE INSERT ON public.user_quest_progress
FOR EACH ROW EXECUTE FUNCTION public.guard_user_quest_progress_insert();

-- 3) user_streaks: prevent re-claiming streak bonus by resetting the flag on
--    the same day. Allow false only when the active date is rolling forward.
CREATE OR REPLACE FUNCTION public.guard_user_streaks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot reassign streak';
  END IF;

  -- Block resetting today's claim flag to false
  IF OLD.streak_xp_claimed_today = true
     AND NEW.streak_xp_claimed_today = false
     AND NEW.last_active_date = OLD.last_active_date
     AND OLD.last_active_date = CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot reset streak claim flag for the current day';
  END IF;

  -- Prevent retroactively lowering longest_streak
  IF NEW.longest_streak < OLD.longest_streak THEN
    NEW.longest_streak := OLD.longest_streak;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_streaks_trg ON public.user_streaks;
CREATE TRIGGER guard_user_streaks_trg
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW EXECUTE FUNCTION public.guard_user_streaks();
