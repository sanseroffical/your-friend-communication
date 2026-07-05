
DROP POLICY IF EXISTS "Authenticated users can view social images" ON storage.objects;
CREATE POLICY "Authenticated users can view social images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'social-images');
