-- Add video_url column to social_posts table for video support
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS video_url text;