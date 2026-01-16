-- Fix read_receipts public exposure - restrict to message participants only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read receipts" ON public.read_receipts;

-- Create a more restrictive policy: message senders can see who read their messages,
-- and users can see their own read receipts
CREATE POLICY "Users can view receipts for their messages"
ON public.read_receipts
FOR SELECT
USING (
  -- Users can see their own read receipts
  auth.uid() = user_id
  OR
  -- Message senders can see who read their messages
  EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.id = read_receipts.message_id
    AND messages.user_id = auth.uid()
  )
);