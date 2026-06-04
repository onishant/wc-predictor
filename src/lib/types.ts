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
  external_team_id: string | null;
  name: string;
  code: string | null;
  crest_url: string | null;
  logo_url: string | null;
  flag_url: string | null;
  coach_name: string | null;
  founded: number | null;
  website: string | null;
  club_colors: string | null;
  venue: string | null;
};

export type PlayerRow = {
  id: string;
  external_player_id: string;
  team_id: string;
  name: string;
  position: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  shirt_number: number | null;
};
