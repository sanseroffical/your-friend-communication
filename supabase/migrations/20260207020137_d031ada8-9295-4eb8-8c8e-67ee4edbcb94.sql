-- Fix storage bucket policies to require authentication

-- Fix chat-attachments bucket - drop public access and require auth
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
);

-- Fix social-images bucket - drop public access and require auth
DROP POLICY IF EXISTS "Social images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view social images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'social-images'
  AND auth.uid() IS NOT NULL
);

-- Create triggers to attach validation functions to tables
-- (Functions already exist, but triggers are missing)

-- Messages validation trigger
DROP TRIGGER IF EXISTS validate_message_trigger ON public.messages;
CREATE TRIGGER validate_message_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_input();

-- Direct messages validation trigger
DROP TRIGGER IF EXISTS validate_dm_trigger ON public.direct_messages;
CREATE TRIGGER validate_dm_trigger
BEFORE INSERT OR UPDATE ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_direct_message_input();

-- Whispers validation trigger
DROP TRIGGER IF EXISTS validate_whisper_trigger ON public.whispers;
CREATE TRIGGER validate_whisper_trigger
BEFORE INSERT OR UPDATE ON public.whispers
FOR EACH ROW
EXECUTE FUNCTION public.validate_whisper_input();

-- Social posts validation trigger
DROP TRIGGER IF EXISTS validate_social_post_trigger ON public.social_posts;
CREATE TRIGGER validate_social_post_trigger
BEFORE INSERT OR UPDATE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_social_post_input();

-- Post comments validation trigger
DROP TRIGGER IF EXISTS validate_post_comment_trigger ON public.post_comments;
CREATE TRIGGER validate_post_comment_trigger
BEFORE INSERT OR UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_post_comment_input();

-- Wall posts validation trigger
DROP TRIGGER IF EXISTS validate_wall_post_trigger ON public.wall_posts;
CREATE TRIGGER validate_wall_post_trigger
BEFORE INSERT OR UPDATE ON public.wall_posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_wall_post_input();

-- Story replies validation trigger
DROP TRIGGER IF EXISTS validate_story_reply_trigger ON public.story_replies;
CREATE TRIGGER validate_story_reply_trigger
BEFORE INSERT OR UPDATE ON public.story_replies
FOR EACH ROW
EXECUTE FUNCTION public.validate_story_reply_input();

-- Profiles validation trigger
DROP TRIGGER IF EXISTS validate_profile_trigger ON public.profiles;
CREATE TRIGGER validate_profile_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_input();

-- Announcements validation trigger
DROP TRIGGER IF EXISTS validate_announcement_trigger ON public.announcements;
CREATE TRIGGER validate_announcement_trigger
BEFORE INSERT OR UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.validate_announcement_input();