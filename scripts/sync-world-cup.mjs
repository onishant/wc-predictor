import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const FIFA_TLA_TO_FLAG_CODE = {
  ALG: 'dz',
  ARG: 'ar',
  AUS: 'au',
  AUT: 'at',
  BEL: 'be',
  BIH: 'ba',
  BRA: 'br',
  CAN: 'ca',
  CIV: 'ci',
  COD: 'cd',
  COL: 'co',
  CPV: 'cv',
  CRO: 'hr',
  CUW: 'cw',
  CZE: 'cz',
  ECU: 'ec',
  EGY: 'eg',
  ENG: 'gb-eng',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  GHA: 'gh',
  HAI: 'ht',
  IRN: 'ir',
  IRQ: 'iq',
  JOR: 'jo',
  JPN: 'jp',
  KOR: 'kr',
  KSA: 'sa',
  MAR: 'ma',
  MEX: 'mx',
  NED: 'nl',
  NOR: 'no',
  NZL: 'nz',
  PAN: 'pa',
  PAR: 'py',
  POR: 'pt',
  QAT: 'qa',
  RSA: 'za',
  SCO: 'gb-sct',
  SEN: 'sn',
  SUI: 'ch',
  SWE: 'se',
  TUN: 'tn',
  TUR: 'tr',
  URY: 'uy',
  USA: 'us',
  UZB: 'uz',
};

function getFlagUrlForTeamCode(code) {
  const flagCode = code ? FIFA_TLA_TO_FLAG_CODE[String(code).toUpperCase()] : null;
  return flagCode ? `https://flagcdn.com/${flagCode}.svg` : null;
}

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

const {
  FOOTBALL_DATA_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WC_SEASON,
} = process.env;

console.log('[sync-world-cup] cwd:', process.cwd());
console.log('[sync-world-cup] env present:', {
  FOOTBALL_DATA_API_KEY: Boolean(FOOTBALL_DATA_API_KEY),
  NEXT_PUBLIC_SUPABASE_URL: Boolean(NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
  WC_SEASON: Boolean(WC_SEASON),
});

if (!FOOTBALL_DATA_API_KEY) {
  throw new Error('Missing FOOTBALL_DATA_API_KEY');
}

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchWorldCupMatches(season) {
  const url = new URL(`${FOOTBALL_DATA_BASE_URL}/competitions/WC/matches`);
  if (season) url.searchParams.set('season', String(season));

  const res = await fetch(url.toString(), {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`football-data error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function fetchWorldCupTeams(season) {
  const url = new URL(`${FOOTBALL_DATA_BASE_URL}/competitions/WC/teams`);
  if (season) url.searchParams.set('season', String(season));

  const res = await fetch(url.toString(), {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`football-data error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

function normalizeStatus(status) {
  switch (status) {
    case 'FINISHED':
      return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
    case 'EXTRA_TIME':
    case 'PENALTY_SHOOTOUT':
      return 'in_play';
    case 'POSTPONED':
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'postponed';
    default:
      return 'scheduled';
  }
}

async function main() {
  const [payload, teamsPayload] = await Promise.all([
    fetchWorldCupMatches(WC_SEASON),
    fetchWorldCupTeams(WC_SEASON),
  ]);
  const matches = payload.matches ?? [];

  const teamsByExternalId = new Map();
  for (const t of teamsPayload.teams ?? []) {
    teamsByExternalId.set(String(t.id), {
      ext_id: String(t.id),
      name: t.name,
      code: t.tla ?? null,
      crest_url: t.crest ?? null,
      logo_url: t.crest ?? null,
      flag_url: getFlagUrlForTeamCode(t.tla),
      coach_name: t.coach?.name ?? null,
      founded: t.founded ?? null,
      website: t.website ?? null,
      club_colors: t.clubColors ?? null,
      venue: t.venue ?? null,
      squad: t.squad ?? [],
    });
  }

  for (const m of matches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (!t?.id) continue;
      const externalId = String(t.id);
      const existing = teamsByExternalId.get(externalId);
      teamsByExternalId.set(externalId, {
        ...existing,
        ext_id: String(t.id),
        name: t.name,
        code: t.tla ?? null,
        crest_url: t.crest ?? null,
        logo_url: t.crest ?? null,
        flag_url: getFlagUrlForTeamCode(t.tla),
      });
    }
  }

  const teamRows = [...teamsByExternalId.values()];

  const { data: existingTeams, error: existingTeamsErr } = await supabase
    .from('teams')
    .select('id, external_team_id, name, code, crest_url, logo_url, flag_url');
  if (existingTeamsErr) throw existingTeamsErr;

  const teamIdByExt = new Map();

  for (const team of teamRows) {
    const existing = existingTeams.find((t) =>
      t.external_team_id === team.ext_id || t.name === team.name || (team.code && t.code === team.code)
    );

    if (existing) {
      const { error: updateErr } = await supabase
        .from('teams')
        .update({
          external_team_id: team.ext_id,
          name: team.name,
          code: team.code,
          crest_url: team.crest_url,
          logo_url: team.logo_url,
          flag_url: team.flag_url,
          coach_name: team.coach_name ?? null,
          founded: team.founded ?? null,
          website: team.website ?? null,
          club_colors: team.club_colors ?? null,
          venue: team.venue ?? null,
        })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
      teamIdByExt.set(team.ext_id, existing.id);
      continue;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('teams')
      .insert({
        external_team_id: team.ext_id,
        name: team.name,
        code: team.code,
        crest_url: team.crest_url,
        logo_url: team.logo_url,
        flag_url: team.flag_url,
        coach_name: team.coach_name ?? null,
        founded: team.founded ?? null,
        website: team.website ?? null,
        club_colors: team.club_colors ?? null,
        venue: team.venue ?? null,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    teamIdByExt.set(team.ext_id, inserted.id);
  }

  const syncedAt = new Date().toISOString();
  const playerRows = teamRows.flatMap((team) => {
    const teamId = teamIdByExt.get(team.ext_id);
    if (!teamId) return [];

    return (team.squad ?? []).map((player) => ({
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

  const syncedTeamIds = [...teamIdByExt.values()];
  if (syncedTeamIds.length > 0) {
    const { error: deletePlayersErr } = await supabase
      .from('players')
      .delete()
      .in('team_id', syncedTeamIds);
    if (deletePlayersErr) throw deletePlayersErr;
  }

  if (playerRows.length > 0) {
    const { error: playersErr } = await supabase
      .from('players')
      .upsert(playerRows, { onConflict: 'external_player_id' });
    if (playersErr) throw playersErr;
  }

  const matchRows = matches
    .map((m) => {
      const homeId = teamIdByExt.get(String(m.homeTeam?.id));
      const awayId = teamIdByExt.get(String(m.awayTeam?.id));
      if (!homeId || !awayId) return null;

      return {
        external_match_id: String(m.id),
        stage: m.stage ?? m.group ?? null,
        home_team_id: homeId,
        away_team_id: awayId,
        kickoff_utc: m.utcDate,
        status: normalizeStatus(m.status),
        home_score: m.score?.fullTime?.home ?? null,
        away_score: m.score?.fullTime?.away ?? null,
        settled_at: m.status === 'FINISHED' ? new Date().toISOString() : null,
        source_updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  const { error: upsertErr } = await supabase
    .from('matches')
    .upsert(matchRows, { onConflict: 'external_match_id' });

  if (upsertErr) throw upsertErr;

  console.log(`Synced ${teamRows.length} teams, ${playerRows.length} players, and ${matchRows.length} matches into Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
