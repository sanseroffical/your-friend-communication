-- Create storage bucket for social post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-images', 'social-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload social images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'social-images' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view images
CREATE POLICY "Social images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'social-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own social images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'social-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);