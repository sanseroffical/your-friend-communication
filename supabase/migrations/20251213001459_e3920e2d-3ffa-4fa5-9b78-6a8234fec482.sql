-- Fix read_receipts RLS - add UPDATE policy
CREATE POLICY "Users can update own read receipts"
ON public.read_receipts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create themes table for room-wide themes
CREATE TABLE public.room_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  theme text NOT NULL DEFAULT 'default',
  set_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room themes"
ON public.room_themes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can set room themes"
ON public.room_themes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Theme setter can update"
ON public.room_themes FOR UPDATE
USING (auth.uid() = set_by);

-- Create user settings table for accessibility and themes
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'default',
  font_size text DEFAULT 'medium',
  font_family text DEFAULT 'default',
  reduce_motion boolean DEFAULT false,
  high_contrast boolean DEFAULT false,
  screen_reader_mode boolean DEFAULT false,
  bonzi_enabled boolean DEFAULT false,
  bonzi_chaos_level integer DEFAULT 1 CHECK (bonzi_chaos_level >= 1 AND bonzi_chaos_level <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create update log table
CREATE TABLE public.update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  description text,
  changes jsonb DEFAULT '[]'::jsonb,
  released_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view update log"
ON public.update_log FOR SELECT
USING (true);

CREATE POLICY "Admins can insert updates"
ON public.update_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update updates"
ON public.update_log FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create rules/guidelines table
CREATE TABLE public.community_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_number integer NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rules"
ON public.community_rules FOR SELECT
USING (true);

CREATE POLICY "Admins can manage rules"
ON public.community_rules FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add DELETE policy for profiles (admin only)
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add admin delete policy for messages
CREATE POLICY "Admins can delete any message"
ON public.messages FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Add more emoji reactions support - expand the emoji column if needed
-- The existing message_reactions table already supports any emoji

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_themes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;

-- Insert initial rules
INSERT INTO public.community_rules (rule_number, title, description) VALUES
(1, 'Be Respectful', 'Treat all users with respect. No harassment, bullying, or hate speech.'),
(2, 'No Spam', 'Avoid sending repetitive messages, excessive caps, or promotional content.'),
(3, 'Keep It Safe', 'Do not share personal information like addresses, phone numbers, or passwords.'),
(4, 'No Illegal Content', 'Do not share illegal content, pirated material, or anything that violates laws.'),
(5, 'Report Issues', 'If you see rule violations, report them to moderators or admins.'),
(6, 'Have Fun', 'This is a place to connect and chat. Enjoy yourself and help others do the same!');

-- Insert initial update log
INSERT INTO public.update_log (version, title, description, changes) VALUES
('1.0.0', 'Initial Release', 'Welcome to FriendChat!', '["Real-time messaging", "Room codes for easy connections", "File attachments", "Video calling"]'::jsonb),
('1.1.0', 'Security & Features Update', 'Major feature additions', '["User roles (Admin/Moderator)", "Read receipts", "User presence indicators", "Profanity filter", "Profile editing", "Message editing and deletion"]'::jsonb),
('1.2.0', 'Mega Update', 'Themes, accessibility, and more!', '["Theme system with room-wide support", "Accessibility settings", "iOS accessibility detection", "Bonzi Buddy mode", "Extended emoji reactions", "Font customization", "Admin tools", "Video uploads up to 100MB", "Community rules", "Update log"]'::jsonb);