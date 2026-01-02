-- Fix settings persistence: upsert(onConflict: 'user_id') requires a unique constraint
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);

-- Fix room theme persistence: upsert(onConflict: 'room_code') requires a unique constraint
ALTER TABLE public.room_themes
  ADD CONSTRAINT room_themes_room_code_unique UNIQUE (room_code);

-- Allow any authenticated user to change the room theme (public testing)
DROP POLICY IF EXISTS "Theme setter can update" ON public.room_themes;
CREATE POLICY "Authenticated users can update room themes"
ON public.room_themes
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
