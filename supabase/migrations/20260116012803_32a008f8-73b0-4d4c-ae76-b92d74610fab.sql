-- Fix #1: Create admin whitelist table instead of hardcoded email
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by uuid,
  added_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Only existing admins can manage the whitelist
CREATE POLICY "Only admins can view whitelist"
ON public.admin_whitelist FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage whitelist"
ON public.admin_whitelist FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing hardcoded admin email to whitelist table
INSERT INTO public.admin_whitelist (email, notes)
VALUES ('xander.owen24@gmail.com', 'Initial admin - migrated from hardcoded function')
ON CONFLICT (email) DO NOTHING;

-- Update the auto_assign_admin_role function to use whitelist table instead of hardcoded email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is in the admin whitelist
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

-- Fix #2: Add validation triggers for input length limits (using triggers instead of CHECK constraints per guidelines)

-- Validation trigger function for messages
CREATE OR REPLACE FUNCTION public.validate_message_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) > 10000 THEN
    RAISE EXCEPTION 'Message content exceeds maximum length of 10000 characters';
  END IF;
  IF length(NEW.sender_name) = 0 OR length(NEW.sender_name) > 100 THEN
    RAISE EXCEPTION 'Sender name must be between 1 and 100 characters';
  END IF;
  IF NEW.room_code !~ '^[A-Za-z0-9]{1,20}$' THEN
    RAISE EXCEPTION 'Invalid room code format';
  END IF;
  IF NEW.attachment_url IS NOT NULL AND length(NEW.attachment_url) > 2048 THEN
    RAISE EXCEPTION 'Attachment URL exceeds maximum length';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_message_before_insert
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_message_input();

-- Validation trigger function for profiles
CREATE OR REPLACE FUNCTION public.validate_profile_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL AND (length(NEW.display_name) = 0 OR length(NEW.display_name) > 50) THEN
    RAISE EXCEPTION 'Display name must be between 1 and 50 characters';
  END IF;
  IF NEW.bio IS NOT NULL AND length(NEW.bio) > 500 THEN
    RAISE EXCEPTION 'Bio exceeds maximum length of 500 characters';
  END IF;
  IF NEW.clip_id !~ '^[A-Za-z0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid clip ID format';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_before_insert
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_input();

-- Validation trigger function for social posts
CREATE OR REPLACE FUNCTION public.validate_social_post_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Post content must be between 1 and 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_social_post_before_insert
BEFORE INSERT OR UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.validate_social_post_input();

-- Validation trigger function for post comments
CREATE OR REPLACE FUNCTION public.validate_post_comment_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Comment content must be between 1 and 2000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_post_comment_before_insert
BEFORE INSERT OR UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.validate_post_comment_input();

-- Validation trigger function for wall posts
CREATE OR REPLACE FUNCTION public.validate_wall_post_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Wall post content must be between 1 and 2000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_wall_post_before_insert
BEFORE INSERT OR UPDATE ON public.wall_posts
FOR EACH ROW EXECUTE FUNCTION public.validate_wall_post_input();

-- Validation trigger function for direct messages
CREATE OR REPLACE FUNCTION public.validate_direct_message_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 10000 THEN
    RAISE EXCEPTION 'Direct message content must be between 1 and 10000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_direct_message_before_insert
BEFORE INSERT OR UPDATE ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_direct_message_input();

-- Validation trigger function for whispers
CREATE OR REPLACE FUNCTION public.validate_whisper_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 10000 THEN
    RAISE EXCEPTION 'Whisper content must be between 1 and 10000 characters';
  END IF;
  IF NEW.room_code !~ '^[A-Za-z0-9]{1,20}$' THEN
    RAISE EXCEPTION 'Invalid room code format';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_whisper_before_insert
BEFORE INSERT OR UPDATE ON public.whispers
FOR EACH ROW EXECUTE FUNCTION public.validate_whisper_input();

-- Validation trigger function for announcements
CREATE OR REPLACE FUNCTION public.validate_announcement_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 1000 THEN
    RAISE EXCEPTION 'Announcement content must be between 1 and 1000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_announcement_before_insert
BEFORE INSERT OR UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.validate_announcement_input();

-- Validation trigger for story replies
CREATE OR REPLACE FUNCTION public.validate_story_reply_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) = 0 OR length(NEW.content) > 1000 THEN
    RAISE EXCEPTION 'Story reply content must be between 1 and 1000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_story_reply_before_insert
BEFORE INSERT OR UPDATE ON public.story_replies
FOR EACH ROW EXECUTE FUNCTION public.validate_story_reply_input();