import 'server-only';
import type {
  TeamWorldCupStats,
  WorldCupData,
  WorldCupMatchSummary,
  WorldCupPlayer,
  WorldCupTeamProfile,
} from '@/lib/football-data';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { MatchRow, PlayerRow, TeamRow } from '@/lib/types';

type MatchDataRow = MatchRow & {
  external_match_id: string | null;
};

export async function getWorldCupData(): Promise<WorldCupData> {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const schedule = matches
    .filter((match) => match.external_match_id)
    .map((match) => toMatchSummary(match, teamById))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  return {
    competition: { id: 2000, code: 'WC', name: 'FIFA World Cup' },
    schedule,
    teamStats: calculateTeamStats(teams, matches),
  };
}

export async function getWorldCupTeamProfiles(): Promise<WorldCupTeamProfile[]> {
  const [teams, players] = await Promise.all([getTeams(), getAllPlayers()]);
  const playersByTeam = new Map<string, WorldCupPlayer[]>();

  for (const player of players) {
    const squad = playersByTeam.get(player.team_id) ?? [];
    squad.push(toPlayer(player));
    playersByTeam.set(player.team_id, squad);
  }

  return teams
    .map((team) => ({
      id: Number(team.external_team_id),
      name: team.name,
      shortName: team.name,
      code: team.code,
      crestUrl: team.crest_url,
      coachName: team.coach_name,
      founded: team.founded,
      website: team.website,
      clubColors: team.club_colors,
      venue: team.venue,
      squad: (playersByTeam.get(team.id) ?? []).sort(sortPlayers),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getWorldCupTeamProfile(externalTeamId: string): Promise<WorldCupTeamProfile | null> {
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id, external_team_id, name, code, crest_url, logo_url, flag_url, coach_name, founded, website, club_colors, venue')
    .eq('external_team_id', externalTeamId)
    .maybeSingle<TeamRow>();

  if (teamError) throw teamError;
  if (!team) return null;

  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, external_player_id, team_id, name, position, date_of_birth, nationality, shirt_number')
    .eq('team_id', team.id)
    .returns<PlayerRow[]>();

  if (playersError) throw playersError;

  return {
    id: Number(team.external_team_id),
    name: team.name,
    shortName: team.name,
    code: team.code,
    crestUrl: team.crest_url,
    coachName: team.coach_name,
    founded: team.founded,
    website: team.website,
    clubColors: team.club_colors,
    venue: team.venue,
    squad: (players ?? []).map(toPlayer).sort(sortPlayers),
  };
}

async function getTeams() {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, external_team_id, name, code, crest_url, logo_url, flag_url, coach_name, founded, website, club_colors, venue')
    .not('external_team_id', 'is', null)
    .returns<TeamRow[]>();

  if (error) throw error;
  return data ?? [];
}

async function getMatches() {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('id, external_match_id, stage, kickoff_utc, status, home_score, away_score, home_team_id, away_team_id')
    .returns<MatchDataRow[]>();

  if (error) throw error;
  return data ?? [];
}

async function getAllPlayers() {
  const pageSize = 1000;
  const players: PlayerRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id, external_player_id, team_id, name, position, date_of_birth, nationality, shirt_number')
      .range(from, from + pageSize - 1)
      .returns<PlayerRow[]>();

    if (error) throw error;
    players.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return players;
}

function toMatchSummary(match: MatchDataRow, teamById: Map<string, TeamRow>): WorldCupMatchSummary {
  const home = match.home_team_id ? teamById.get(match.home_team_id) : undefined;
  const away = match.away_team_id ? teamById.get(match.away_team_id) : undefined;

  return {
    id: Number(match.external_match_id),
    utcDate: match.kickoff_utc,
    status: toProviderStatus(match.status),
    stage: match.stage ?? undefined,
    homeTeam: home?.name ?? 'TBD',
    awayTeam: away?.name ?? 'TBD',
    homeTeamVisual: toTeamVisual(home),
    awayTeamVisual: toTeamVisual(away),
    homeScore: match.home_score,
    awayScore: match.away_score,
  };
}

function calculateTeamStats(teams: TeamRow[], matches: MatchDataRow[]): TeamWorldCupStats[] {
  const statsById = new Map<string, TeamWorldCupStats>();

  for (const team of teams) {
    statsById.set(team.id, {
      teamId: Number(team.external_team_id),
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
      recentForm: [],
    });
  }

  for (const match of matches.slice().sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc))) {
    if (match.status !== 'finished' || match.home_score == null || match.away_score == null) continue;

    const home = match.home_team_id ? statsById.get(match.home_team_id) : undefined;
    const away = match.away_team_id ? statsById.get(match.away_team_id) : undefined;
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
      home.recentForm.push('W');
      away.recentForm.push('L');
    } else if (match.away_score > match.home_score) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
      away.recentForm.push('W');
      home.recentForm.push('L');
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.recentForm.push('D');
      away.recentForm.push('D');
    }
  }

  return [...statsById.values()]
    .map((stats) => ({
      ...stats,
      goalDifference: stats.goalsFor - stats.goalsAgainst,
      recentForm: stats.recentForm.slice(-5),
    }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName));
}

function toPlayer(player: PlayerRow): WorldCupPlayer {
  return {
    id: Number(player.external_player_id),
    name: player.name,
    position: player.position,
    dateOfBirth: player.date_of_birth,
    nationality: player.nationality,
    shirtNumber: player.shirt_number,
  };
}

function toTeamVisual(team?: TeamRow) {
  return {
    name: team?.name ?? 'TBD',
    code: team?.code ?? null,
    crestUrl: team?.crest_url ?? null,
    logoUrl: team?.logo_url ?? null,
    flagUrl: team?.flag_url ?? null,
  };
}

function toProviderStatus(status: string) {
  if (status === 'finished') return 'FINISHED';
  if (status === 'in_play') return 'IN_PLAY';
  if (status === 'postponed') return 'POSTPONED';
  return 'TIMED';
}

function sortPlayers(a: WorldCupPlayer, b: WorldCupPlayer) {
  const order: Record<string, number> = { Goalkeeper: 0, Defence: 1, Midfield: 2, Offence: 3 };
  return (order[a.position ?? ''] ?? 4) - (order[b.position ?? ''] ?? 4) || a.name.localeCompare(b.name);
}
