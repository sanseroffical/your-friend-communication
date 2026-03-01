
-- Feature requests table
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  ai_analysis TEXT,
  ai_priority TEXT,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feature requests" ON public.feature_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create feature requests" ON public.feature_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own requests" ON public.feature_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own requests" ON public.feature_requests FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any request" ON public.feature_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Feature request votes
CREATE TABLE public.feature_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(feature_id, user_id)
);

ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view votes" ON public.feature_votes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can vote" ON public.feature_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.feature_votes FOR DELETE USING (auth.uid() = user_id);

-- User activity tracking for smart suggestions
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can log own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI feature suggestions
CREATE TABLE public.ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  dismissed BOOLEAN DEFAULT false,
  acted_on BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions" ON public.ai_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own suggestions" ON public.ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suggestions" ON public.ai_suggestions FOR UPDATE USING (auth.uid() = user_id);

-- User feedback for the analyzer
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  rating INTEGER,
  ai_summary TEXT,
  ai_sentiment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feedback" ON public.user_feedback FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can submit feedback" ON public.user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON public.user_feedback FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update feedback" ON public.user_feedback FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for feature requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_votes;

-- Trigger for updated_at
CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
