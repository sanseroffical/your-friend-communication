-- Add columns for editing and replies
ALTER TABLE public.messages 
ADD COLUMN edited_at timestamp with time zone,
ADD COLUMN parent_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create index for replies lookup
CREATE INDEX idx_messages_parent_id ON public.messages(parent_id);

-- Allow users to update their own messages
CREATE POLICY "Users can update own messages" 
ON public.messages FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages" 
ON public.messages FOR DELETE 
USING (auth.uid() = user_id);

-- Create reactions table
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read reactions (since messages are public)
CREATE POLICY "Anyone can read reactions" 
ON public.message_reactions FOR SELECT 
USING (true);

-- Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions" 
ON public.message_reactions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" 
ON public.message_reactions FOR DELETE 
USING (auth.uid() = user_id);

-- Create typing status table
CREATE TABLE public.typing_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code text NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_code, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Anyone can read typing status
CREATE POLICY "Anyone can read typing status" 
ON public.typing_status FOR SELECT USING (true);

-- Authenticated users can manage their typing status
CREATE POLICY "Users manage own typing status" 
ON public.typing_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typing status" 
ON public.typing_status FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing status" 
ON public.typing_status FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for reactions and typing status
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;