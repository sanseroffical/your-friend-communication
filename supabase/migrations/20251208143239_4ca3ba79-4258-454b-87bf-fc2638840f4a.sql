-- Create messages table for room-based chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages in any room (public chat rooms)
CREATE POLICY "Anyone can read messages" 
ON public.messages 
FOR SELECT 
USING (true);

-- Allow anyone to insert messages (public chat rooms)
CREATE POLICY "Anyone can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;