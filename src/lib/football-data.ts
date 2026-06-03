import { getFlagUrlForTeamCode, type TeamVisual } from '@/lib/team-visuals';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

const apiKey = process.env.FOOTBALL_DATA_API_KEY;

if (!apiKey) {
  // Keep this as a module-level warning so missing config is obvious during dev.
  console.warn('FOOTBALL_DATA_API_KEY is not set. football-data requests will fail.');
}

type TeamRef = { id?: number | null; name?: string | null; shortName?: string | null; tla?: string | null; crest?: string | null };

type Match = {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string;
  matchday?: number;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: {
    fullTime?: { home?: number | null; away?: number | null };
    halfTime?: { home?: number | null; away?: number | null };
    winner?: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
};

type MatchesResponse = {
  competition: { id: number; code: string; name: string };
  matches: Match[];
};

export type WorldCupMatchSummary = {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamVisual: TeamVisual;
  awayTeamVisual: TeamVisual;
  homeScore: number | null;
  awayScore: number | null;
};

export type TeamWorldCupStats = {
  teamId: number;
  teamName: string;
  teamVisual: TeamVisual;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type WorldCupData = {
  competition: { id: number; code: string; name: string };
  schedule: WorldCupMatchSummary[];
  teamStats: TeamWorldCupStats[];
};

async function footballDataFetch<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  if (!apiKey) {
    throw new Error('Missing FOOTBALL_DATA_API_KEY in environment variables.');
  }

  const url = new URL(`${FOOTBALL_DATA_BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      // Per docs: API token must be sent using X-Auth-Token header.
      'X-Auth-Token': apiKey,
    },
    // Avoid stale schedule data in server components.
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`football-data API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

function toTeamVisual(team: TeamRef | null | undefined, fallbackName = 'TBD'): TeamVisual {
  return {
    name: team?.name ?? fallbackName,
    code: team?.tla ?? null,
    crestUrl: team?.crest ?? null,
    logoUrl: team?.crest ?? null,
    flagUrl: getFlagUrlForTeamCode(team?.tla),
  };
}

/**
 * Pulls FIFA World Cup schedule + computes team summary stats from finished WC matches.
 * Uses competition code WC per football-data lookup tables.
 */
export async function getWorldCupScheduleAndStats(options?: { season?: number }): Promise<WorldCupData> {
  const data = await footballDataFetch<MatchesResponse>('/competitions/WC/matches', {
    season: options?.season,
    // include all statuses by default; API returns schedule+results.
  });

  const schedule: WorldCupMatchSummary[] = data.matches.map((m) => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    stage: m.stage,
    group: m.group,
    homeTeam: m.homeTeam?.name ?? 'TBD',
    awayTeam: m.awayTeam?.name ?? 'TBD',
    homeTeamVisual: toTeamVisual(m.homeTeam),
    awayTeamVisual: toTeamVisual(m.awayTeam),
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  }));

  const statsByTeam = new Map<number, TeamWorldCupStats>();

  const getOrCreate = (team: TeamRef) => {
    if (!team.id || !team.name) {
      return null;
    }

    if (!statsByTeam.has(team.id)) {
      statsByTeam.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        teamVisual: toTeamVisual(team),
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }
    return statsByTeam.get(team.id)!;
  };

  for (const match of data.matches) {
    if (match.status !== 'FINISHED') continue;

    const homeGoals = match.score?.fullTime?.home;
    const awayGoals = match.score?.fullTime?.away;
    if (homeGoals == null || awayGoals == null) continue;

    const home = getOrCreate(match.homeTeam);
    const away = getOrCreate(match.awayTeam);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (awayGoals > homeGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const teamStats = [...statsByTeam.values()]
    .map((s) => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName));

  return {
    competition: data.competition,
    schedule,
    teamStats,
  };
}
