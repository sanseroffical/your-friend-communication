CREATE TABLE public.user_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Snapshot',
  kind TEXT NOT NULL DEFAULT 'manual',
  profile_data JSONB,
  settings_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_snapshots_user_created_idx ON public.user_snapshots (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_snapshots TO authenticated;
GRANT ALL ON public.user_snapshots TO service_role;

ALTER TABLE public.user_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own snapshots" ON public.user_snapshots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own snapshots" ON public.user_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own snapshots" ON public.user_snapshots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Cap snapshots per user at 50 (auto-prune oldest)
CREATE OR REPLACE FUNCTION public.prune_user_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_snapshots
  WHERE user_id = NEW.user_id
    AND id IN (
      SELECT id FROM public.user_snapshots
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      OFFSET 50
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prune_user_snapshots
AFTER INSERT ON public.user_snapshots
FOR EACH ROW EXECUTE FUNCTION public.prune_user_snapshots();