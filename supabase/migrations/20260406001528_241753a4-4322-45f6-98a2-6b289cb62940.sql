
-- 1. Fix user_feedback: restrict SELECT to own feedback + admins
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.user_feedback;
CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix user_badges: restrict INSERT to own user_id
DROP POLICY IF EXISTS "Badges can be earned" ON public.user_badges;
CREATE POLICY "Users can earn own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix stories: require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view non-expired stories" ON public.stories;
CREATE POLICY "Authenticated users can view non-expired stories"
  ON public.stories FOR SELECT
  USING (auth.uid() IS NOT NULL AND expires_at > now());

-- 4. Fix story_replies: restrict SELECT to story owner or reply author
DROP POLICY IF EXISTS "Authenticated users can view story replies" ON public.story_replies;
CREATE POLICY "Story owners and reply authors can view replies"
  ON public.story_replies FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_replies.story_id
      AND stories.user_id = auth.uid()
    )
  );
