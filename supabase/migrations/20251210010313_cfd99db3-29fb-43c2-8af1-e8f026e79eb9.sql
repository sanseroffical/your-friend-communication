-- Create table to store chat history per user
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_code)
);

-- Enable RLS
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat history
CREATE POLICY "Users can view own chat history"
ON public.chat_history FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own chat history
CREATE POLICY "Users can insert own chat history"
ON public.chat_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own chat history
CREATE POLICY "Users can update own chat history"
ON public.chat_history FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own chat history
CREATE POLICY "Users can delete own chat history"
ON public.chat_history FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX idx_chat_history_last_accessed ON public.chat_history(last_accessed_at DESC);