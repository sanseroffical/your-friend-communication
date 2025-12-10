-- Clear existing test messages (public testing app)
TRUNCATE public.messages;

-- Drop old policies on messages
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;

-- Drop the foreign key constraint to old users table
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Now we can drop the old users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Create new foreign key to auth.users
ALTER TABLE public.messages
  ADD CONSTRAINT messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- New secure RLS policies for messages
-- Anyone can read messages (public rooms per project design)
CREATE POLICY "Anyone can read messages"
ON public.messages FOR SELECT
USING (true);

-- Only authenticated users can insert their own messages
CREATE POLICY "Authenticated users insert own messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);