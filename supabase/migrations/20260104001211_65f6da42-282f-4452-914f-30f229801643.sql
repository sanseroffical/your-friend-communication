-- Create direct messages table for private 1-on-1 conversations
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  attachment_url text,
  attachment_type text,
  attachment_name text
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can read DMs they sent or received
CREATE POLICY "Users can read own DMs"
ON public.direct_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send DMs
CREATE POLICY "Users can send DMs"
ON public.direct_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own sent DMs
CREATE POLICY "Users can delete own sent DMs"
ON public.direct_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Users can update read_at on DMs they received
CREATE POLICY "Users can mark DMs as read"
ON public.direct_messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Create whispers table for in-chat private messages
CREATE TABLE public.whispers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code text NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whispers ENABLE ROW LEVEL SECURITY;

-- Users can read whispers they sent or received
CREATE POLICY "Users can read own whispers"
ON public.whispers
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send whispers
CREATE POLICY "Users can send whispers"
ON public.whispers
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for whispers
ALTER PUBLICATION supabase_realtime ADD TABLE public.whispers;

-- Create game sessions table
CREATE TABLE public.game_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code text NOT NULL,
  game_type text NOT NULL,
  created_by uuid NOT NULL,
  state jsonb DEFAULT '{}'::jsonb,
  players uuid[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  winner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone in a room can view game sessions
CREATE POLICY "Anyone can view game sessions"
ON public.game_sessions
FOR SELECT
USING (true);

-- Authenticated users can create games
CREATE POLICY "Authenticated users can create games"
ON public.game_sessions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Game players can update game state
CREATE POLICY "Players can update game state"
ON public.game_sessions
FOR UPDATE
USING (auth.uid() = ANY(players) OR auth.uid() = created_by);

-- Enable realtime for game sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;