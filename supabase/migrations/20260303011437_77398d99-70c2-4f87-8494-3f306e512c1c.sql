
-- Add avatar customization JSON column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_customization jsonb DEFAULT '{"bodyColor": "#3498db", "headShape": "round", "hatStyle": "none", "hatColor": "#e74c3c", "glassesStyle": "none", "glassesColor": "#333333", "shirtColor": "#2ecc71", "particleEffect": "none"}'::jsonb;
