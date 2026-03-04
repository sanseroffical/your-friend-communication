
-- Create plaza_houses table for per-user house assignments
CREATE TABLE public.plaza_houses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  house_name TEXT NOT NULL DEFAULT 'My House',
  house_color TEXT NOT NULL DEFAULT '#e8d5b7',
  house_style TEXT NOT NULL DEFAULT 'cabin',
  position_x FLOAT NOT NULL DEFAULT 0,
  position_z FLOAT NOT NULL DEFAULT 0,
  placed_objects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plaza_houses ENABLE ROW LEVEL SECURITY;

-- Everyone can see houses (needed for rendering in plaza)
CREATE POLICY "Anyone authenticated can view houses"
ON public.plaza_houses FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can create their own house
CREATE POLICY "Users can create own house"
ON public.plaza_houses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own house
CREATE POLICY "Users can update own house"
ON public.plaza_houses FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own house
CREATE POLICY "Users can delete own house"
ON public.plaza_houses FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_plaza_houses_updated_at
BEFORE UPDATE ON public.plaza_houses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for plaza_houses
ALTER PUBLICATION supabase_realtime ADD TABLE public.plaza_houses;
