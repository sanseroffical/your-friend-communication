-- SECURITY FIX: Require authentication for user data access
-- This migration restricts anonymous access while maintaining social features for logged-in users

-- Fix messages table - require authentication to read chat messages
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
CREATE POLICY "Authenticated users can read messages"
ON public.messages FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix profiles table - require authentication to view profiles
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix social_posts table - require authentication
DROP POLICY IF EXISTS "Anyone can view posts" ON public.social_posts;
CREATE POLICY "Authenticated users can view posts"
ON public.social_posts FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix follows table - require authentication
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Authenticated users can view follows"
ON public.follows FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix post_likes table - require authentication
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view likes"
ON public.post_likes FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix typing_status table - require authentication (prevents activity tracking)
DROP POLICY IF EXISTS "Anyone can read typing status" ON public.typing_status;
CREATE POLICY "Authenticated users can read typing status"
ON public.typing_status FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix wall_posts table - require authentication
DROP POLICY IF EXISTS "Anyone can view wall posts" ON public.wall_posts;
CREATE POLICY "Authenticated users can view wall posts"
ON public.wall_posts FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix post_comments table - require authentication
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Authenticated users can view comments"
ON public.post_comments FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix story_reactions table - require authentication
DROP POLICY IF EXISTS "Anyone can view story reactions" ON public.story_reactions;
CREATE POLICY "Authenticated users can view story reactions"
ON public.story_reactions FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix story_replies table - require authentication
DROP POLICY IF EXISTS "Anyone can view story replies" ON public.story_replies;
CREATE POLICY "Authenticated users can view story replies"
ON public.story_replies FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix game_sessions table - require authentication
DROP POLICY IF EXISTS "Anyone can view game sessions" ON public.game_sessions;
CREATE POLICY "Authenticated users can view game sessions"
ON public.game_sessions FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix message_reactions table - require authentication
DROP POLICY IF EXISTS "Anyone can read reactions" ON public.message_reactions;
CREATE POLICY "Authenticated users can read reactions"
ON public.message_reactions FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix user_levels table - require authentication
DROP POLICY IF EXISTS "Anyone can view user levels" ON public.user_levels;
CREATE POLICY "Authenticated users can view user levels"
ON public.user_levels FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix user_badges table - require authentication
DROP POLICY IF EXISTS "Anyone can view badges" ON public.user_badges;
CREATE POLICY "Authenticated users can view badges"
ON public.user_badges FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix hashtags table - require authentication
DROP POLICY IF EXISTS "Anyone can view hashtags" ON public.hashtags;
CREATE POLICY "Authenticated users can view hashtags"
ON public.hashtags FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix post_hashtags table - require authentication
DROP POLICY IF EXISTS "Anyone can view post hashtags" ON public.post_hashtags;
CREATE POLICY "Authenticated users can view post hashtags"
ON public.post_hashtags FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix room_themes table - require authentication
DROP POLICY IF EXISTS "Anyone can view room themes" ON public.room_themes;
CREATE POLICY "Authenticated users can view room themes"
ON public.room_themes FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix story_highlights table - require authentication
DROP POLICY IF EXISTS "Anyone can view highlights" ON public.story_highlights;
CREATE POLICY "Authenticated users can view highlights"
ON public.story_highlights FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix highlight_stories table - require authentication
DROP POLICY IF EXISTS "Anyone can view highlight stories" ON public.highlight_stories;
CREATE POLICY "Authenticated users can view highlight stories"
ON public.highlight_stories FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix game_scores table - require authentication
DROP POLICY IF EXISTS "Anyone can view game scores" ON public.game_scores;
CREATE POLICY "Authenticated users can view game scores"
ON public.game_scores FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- SECURITY FIX: Update auto_assign_admin_role to use admin_whitelist instead of hardcoded email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is in the active admin whitelist
  IF EXISTS (
    SELECT 1 FROM public.admin_whitelist 
    WHERE email = NEW.email AND is_active = true
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role auto-assigned: user_id=%, email=%', NEW.id, NEW.email;
  END IF;
  RETURN NEW;
END;
$$;

-- Migrate existing hardcoded admin email to whitelist table
INSERT INTO public.admin_whitelist (email, notes)
VALUES ('xander.owen24@gmail.com', 'Initial admin - migrated from hardcoded value')
ON CONFLICT (email) DO NOTHING;