-- Community Insights: skill-weighted prediction aggregates per match
-- Recalculated every 6 hours by cron job

CREATE TABLE IF NOT EXISTS community_insights (
  match_id        TEXT PRIMARY KEY,
  weighted_home   NUMERIC NOT NULL DEFAULT 0,
  weighted_away   NUMERIC NOT NULL DEFAULT 0,
  home_win_pct    INTEGER NOT NULL DEFAULT 0,
  draw_pct        INTEGER NOT NULL DEFAULT 0,
  away_win_pct    INTEGER NOT NULL DEFAULT 0,
  sample_size     INTEGER NOT NULL DEFAULT 0,
  agreement       TEXT NOT NULL DEFAULT 'moderate'
                  CHECK (agreement IN ('strong', 'moderate', 'split')),
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow public read (anon), service role write
ALTER TABLE community_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community insights are readable by everyone"
  ON community_insights FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage community insights"
  ON community_insights FOR ALL
  USING (auth.role() = 'service_role');
