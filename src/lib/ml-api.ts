/**
 * Client for the WC-2026-ML prediction API.
 *
 * The ML API runs on a separate process (default: http://localhost:8000).
 * Set WC26_ML_API_URL in .env.local to override.
 */

const ML_API_BASE = process.env.WC26_ML_API_URL ?? 'http://localhost:8000';

export type MatchPrediction = {
  home_team: string;
  away_team: string;
  neutral: boolean;
  expected_home_goals: number;
  expected_away_goals: number;
  home_win: number;
  draw: number;
  away_win: number;
};

export type TeamPrediction = {
  team: string;
  winner_probability: number;
  expected_position: number;
  most_likely_stage: string;
  group?: string;
  group_winner_probability?: number;
  round_of_32_probability?: number;
  round_of_16_probability?: number;
  quarter_final_probability?: number;
  semi_final_probability?: number;
  final_probability?: number;
};

export type MLDashboard = {
  generated_at: string;
  simulations: number;
  seed: number;
  model: Record<string, unknown>;
  teams: TeamPrediction[];
  fixtures: {
    group_stage: Array<Record<string, unknown>>;
    representative_tournament: Record<string, unknown>;
  };
};

type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function mlFetch<T>(path: string): Promise<T | null> {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  try {
    const response = await fetch(`${ML_API_BASE}${path}`);
    if (!response.ok) return null;
    const data = (await response.json()) as T;
    cache.set(path, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

/**
 * Get ML prediction for a specific matchup.
 * Returns expected goals and win/draw/loss probabilities.
 */
export async function getMatchPrediction(
  homeTeam: string,
  awayTeam: string,
): Promise<MatchPrediction | null> {
  return mlFetch<MatchPrediction>(
    `/matches/${encodeURIComponent(homeTeam)}/${encodeURIComponent(awayTeam)}`,
  );
}

/**
 * Get ML prediction for a specific team's tournament prospects.
 */
export async function getTeamPrediction(
  team: string,
): Promise<TeamPrediction | null> {
  return mlFetch<TeamPrediction>(
    `/predictions/teams/${encodeURIComponent(team)}`,
  );
}

/**
 * Get the full ML dashboard (all teams + fixtures).
 * Cached for 5 minutes.
 */
export async function getMLDashboard(): Promise<MLDashboard | null> {
  return mlFetch<MLDashboard>('/dashboard');
}

/**
 * Check if the ML API is reachable.
 */
export async function isMLAPIAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_API_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
