-- Add banner_url column to profiles table for profile cover images
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT;