UPDATE storage.buckets
SET public = false
WHERE id IN ('chat-attachments', 'social-images');

DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Social images are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
);

DROP POLICY IF EXISTS "Authenticated users can view social images" ON storage.objects;
CREATE POLICY "Authenticated users can view social images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-images'
);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to app realtime channels" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to app realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IN (
    'leaderboard_changes',
    'user_level_changes',
    'read-receipts-changes',
    'stories-changes',
    'plaza-presence'
  )
  OR realtime.topic() ~ '^(room|games|reactions|room-theme)-[A-Za-z0-9]{1,20}$'
  OR realtime.topic() ~ '^house-[0-9a-fA-F-]{36}$'
  OR realtime.topic() = ('dm-updates-' || auth.uid()::text)
  OR realtime.topic() ~ ('^whispers-[A-Za-z0-9]{1,20}-' || auth.uid()::text || '$')
);