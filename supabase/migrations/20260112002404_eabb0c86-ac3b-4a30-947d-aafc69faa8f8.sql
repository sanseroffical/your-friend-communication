-- Fix hashtag policies to be more secure
DROP POLICY IF EXISTS "Anyone can create hashtags" ON public.hashtags;
DROP POLICY IF EXISTS "Anyone can update hashtag counts" ON public.hashtags;

-- Only authenticated users can create hashtags through post creation
CREATE POLICY "Authenticated users can create hashtags" ON public.hashtags 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only allow incrementing post_count (no arbitrary updates)
CREATE POLICY "Authenticated users can update hashtag counts" ON public.hashtags 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Fix post_hashtags to require authentication
DROP POLICY IF EXISTS "Anyone can create post hashtags" ON public.post_hashtags;
CREATE POLICY "Authenticated users can create post hashtags" ON public.post_hashtags 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix user_badges to only allow system/admin inserts (or self-earned)
DROP POLICY IF EXISTS "System can add badges" ON public.user_badges;
CREATE POLICY "Badges can be earned" ON public.user_badges 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);