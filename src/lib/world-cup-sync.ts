import 'server-only';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';
import { getFlagUrlForTeamCode } from '@/lib/team-visuals';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

type ProviderPlayer = {
  id: number;
  name: string;
  position?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  shirtNumber?: number | null;
};

type ProviderTeam = {
  id: number;
  name: string;
  tla?: string | null;
  crest?: string | null;
  coach?: { name?: string | null } | null;
  founded?: number | null;
  website?: string | null;
  clubColors?: string | null;
  venue?: string | null;
  squad?: ProviderPlayer[];
};

type ProviderMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage?: string | null;
  group?: string | null;
  homeTeam?: ProviderTeam | null;
  awayTeam?: ProviderTeam | null;
  score?: { fullTime?: { home?: number | null; away?: number | null } };
};

type TeamSyncRow = {
  extId: string;
  name: string;
  code: string | null;
  crestUrl: string | null;
  coachName: string | null;
  founded: number | null;
  website: string | null;
  clubColors: string | null;
  venue: string | null;
  squad: ProviderPlayer[];
};

export async function syncWorldCup() {
  if (!hasSupabaseServiceRole) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const season = process.env.WC_SEASON;
  const [matchesPayload, teamsPayload] = await Promise.all([
    footballDataFetch<{ matches?: ProviderMatch[] }>('/competitions/WC/matches', season),
    footballDataFetch<{ teams?: ProviderTeam[] }>('/competitions/WC/teams', season),
  ]);

  const matches = matchesPayload.matches ?? [];
  const teamsByExternalId = new Map<string, TeamSyncRow>();

  for (const team of teamsPayload.teams ?? []) {
    teamsByExternalId.set(String(team.id), toTeamSyncRow(team));
  }

  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!team?.id) continue;
      const externalId = String(team.id);
      const existing = teamsByExternalId.get(externalId);
      teamsByExternalId.set(externalId, { ...toTeamSyncRow(team), ...existing });
    }
  }

  const teamRows = [...teamsByExternalId.values()];
  const { data: existingTeams, error: existingTeamsError } = await supabaseAdmin
    .from('teams')
    .select('id, external_team_id, name, code');
  if (existingTeamsError) throw existingTeamsError;

  const teamIdByExternalId = new Map<string, string>();

  for (const team of teamRows) {
    const existing = existingTeams.find((row) =>
      row.external_team_id === team.extId || row.name === team.name || (team.code && row.code === team.code)
    );
    const values = {
      external_team_id: team.extId,
      name: team.name,
      code: team.code,
      crest_url: team.crestUrl,
      logo_url: team.crestUrl,
      flag_url: getFlagUrlForTeamCode(team.code),
      coach_name: team.coachName,
      founded: team.founded,
      website: team.website,
      club_colors: team.clubColors,
      venue: team.venue,
    };

    if (existing) {
      const { error } = await supabaseAdmin.from('teams').update(values).eq('id', existing.id);
      if (error) throw error;
      teamIdByExternalId.set(team.extId, existing.id);
      continue;
    }

    const { data: inserted, error } = await supabaseAdmin.from('teams').insert(values).select('id').single();
    if (error) throw error;
    teamIdByExternalId.set(team.extId, inserted.id);
  }

  const syncedAt = new Date().toISOString();
  const playerRows = teamRows.flatMap((team) => {
    const teamId = teamIdByExternalId.get(team.extId);
    if (!teamId) return [];

    return team.squad.map((player) => ({
      external_player_id: String(player.id),
      team_id: teamId,
      name: player.name,
      position: player.position ?? null,
      date_of_birth: player.dateOfBirth ?? null,
      nationality: player.nationality ?? null,
      shirt_number: player.shirtNumber ?? null,
      last_synced_at: syncedAt,
    }));
  });

  const syncedTeamIds = [...teamIdByExternalId.values()];
  if (syncedTeamIds.length > 0) {
    const { error } = await supabaseAdmin.from('players').delete().in('team_id', syncedTeamIds);
    if (error) throw error;
  }
  if (playerRows.length > 0) {
    const { error } = await supabaseAdmin.from('players').upsert(playerRows, { onConflict: 'external_player_id' });
    if (error) throw error;
  }

  const matchRows = matches.flatMap((match) => {
    const homeTeamId = match.homeTeam?.id ? teamIdByExternalId.get(String(match.homeTeam.id)) : undefined;
    const awayTeamId = match.awayTeam?.id ? teamIdByExternalId.get(String(match.awayTeam.id)) : undefined;
    if (!homeTeamId || !awayTeamId) return [];

    return [{
      external_match_id: String(match.id),
      stage: match.stage ?? match.group ?? null,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      kickoff_utc: match.utcDate,
      status: normalizeStatus(match.status),
      home_score: match.score?.fullTime?.home ?? null,
      away_score: match.score?.fullTime?.away ?? null,
      settled_at: match.status === 'FINISHED' ? syncedAt : null,
      source_updated_at: syncedAt,
    }];
  });

  const { error: matchesError } = await supabaseAdmin
    .from('matches')
    .upsert(matchRows, { onConflict: 'external_match_id' });
  if (matchesError) throw matchesError;

  return { teams: teamRows.length, players: playerRows.length, matches: matchRows.length, syncedAt };
}

async function footballDataFetch<T>(path: string, season?: string) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('Missing FOOTBALL_DATA_API_KEY.');

  const url = new URL(`${FOOTBALL_DATA_BASE_URL}${path}`);
  if (season) url.searchParams.set('season', season);

  const response = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`football-data API error (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

function toTeamSyncRow(team: ProviderTeam): TeamSyncRow {
  return {
    extId: String(team.id),
    name: team.name,
    code: team.tla ?? null,
    crestUrl: team.crest ?? null,
    coachName: team.coach?.name ?? null,
    founded: team.founded ?? null,
    website: team.website ?? null,
    clubColors: team.clubColors ?? null,
    venue: team.venue ?? null,
    squad: team.squad ?? [],
  };
}

function normalizeStatus(status: string) {
  if (status === 'FINISHED') return 'finished';
  if (['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(status)) return 'in_play';
  if (['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status)) return 'postponed';
  return 'scheduled';
}
