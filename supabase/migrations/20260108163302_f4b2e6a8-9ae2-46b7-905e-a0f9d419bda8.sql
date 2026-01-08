-- Add profile customization columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_theme text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'default';