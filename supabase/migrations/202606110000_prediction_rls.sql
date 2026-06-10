-- Server-side prediction locking via RLS
-- All timestamps compared in UTC (NOW() returns timestamptz in Postgres, kickoff_utc is timestamptz)

-- Enable RLS on predictions
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated role
GRANT SELECT, INSERT, UPDATE ON predictions TO authenticated;

-- Function: check if a match is still open for predictions
-- Uses security_definer to bypass RLS when reading matches table
CREATE OR REPLACE FUNCTION is_match_open(p_match_external_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE external_match_id = p_match_external_id
    AND kickoff_utc > NOW()  -- NOW() is always UTC in Postgres
  );
$$;

-- Users can read their own predictions
CREATE POLICY "Users can read own predictions"
ON predictions FOR SELECT
USING (auth.uid() = user_id);

-- Users can read all predictions AFTER their match has started (for live results view)
CREATE POLICY "Users can read predictions for started matches"
ON predictions FOR SELECT
USING (
  NOT is_match_open(match_external_id)
);

-- Users can insert predictions only before kickoff
CREATE POLICY "Users can insert predictions before kickoff"
ON predictions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_match_open(match_external_id)
);

-- Users can update their own predictions only before kickoff
CREATE POLICY "Users can update own predictions before kickoff"
ON predictions FOR UPDATE
USING (
  auth.uid() = user_id
  AND is_match_open(match_external_id)
)
WITH CHECK (
  auth.uid() = user_id
  AND is_match_open(match_external_id)
);

-- No DELETE policy — predictions are never deleted
