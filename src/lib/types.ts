export type MatchRow = {
  id: string;
  stage: string | null;
  kickoff_utc: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

export type TeamRow = {
  id: string;
  name: string;
  code: string | null;
};
