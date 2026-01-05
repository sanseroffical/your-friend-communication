-- Add command_prompt_mode to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS command_prompt_mode boolean DEFAULT false;

-- Add entries to update_log for recent updates
INSERT INTO public.update_log (version, title, description, changes, released_at) VALUES
('1.5.0', 'Games & Private Messages', 'Added comprehensive gaming system and private messaging with clipID support', 
 '["Multiplayer games: Tic-Tac-Toe, Trivia, Word Guess, Rock-Paper-Scissors", "Solo mini-games: Snake, Memory, Clicker", "Direct messages using clipID", "In-chat whispers", "Game panel in sidebar"]'::jsonb,
 now() - interval '1 day'),
('1.6.0', 'User Customization & Social', 'Enhanced user customization, social features, and admin tools',
 '["Command prompt mode (terminal-style chat)", "Social media links section", "Support the developers option", "Clippy vs Bonzi rivalry", "Expanded admin powers", "New games: Hangman, 2048, Minesweeper, Typing Race"]'::jsonb,
 now());

-- Create announcements table for admins to broadcast
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements"
ON public.announcements FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));