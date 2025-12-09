-- Create users table with unique clipID
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a clipID exists (for login)
CREATE POLICY "Anyone can read users"
ON public.users
FOR SELECT
USING (true);

-- Anyone can create a user (signup)
CREATE POLICY "Anyone can create users"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Add index for faster clipID lookups
CREATE INDEX idx_users_clip_id ON public.users(clip_id);

-- Update messages table to reference users instead of just sender_name
ALTER TABLE public.messages ADD COLUMN user_id UUID REFERENCES public.users(id);

-- Create index for user_id lookups
CREATE INDEX idx_messages_user_id ON public.messages(user_id);