
CREATE TABLE public.benchmark_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('device', 'game_fps')),
  game_id TEXT,
  score INTEGER NOT NULL,
  cpu_score INTEGER,
  render_score INTEGER,
  memory_score INTEGER,
  avg_fps NUMERIC(6,2),
  min_fps NUMERIC(6,2),
  max_fps NUMERIC(6,2),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.benchmark_results TO authenticated;
GRANT SELECT ON public.benchmark_results TO anon;
GRANT ALL ON public.benchmark_results TO service_role;

ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view benchmark results"
  ON public.benchmark_results FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own benchmark results"
  ON public.benchmark_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND score >= 0 AND score <= 1000000);

CREATE INDEX idx_benchmark_results_type_score ON public.benchmark_results (benchmark_type, score DESC);
CREATE INDEX idx_benchmark_results_game ON public.benchmark_results (game_id, avg_fps DESC) WHERE game_id IS NOT NULL;
CREATE INDEX idx_benchmark_results_user ON public.benchmark_results (user_id, created_at DESC);
