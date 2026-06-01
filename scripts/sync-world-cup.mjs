import { createClient } from '@supabase/supabase-js';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

const {
  FOOTBALL_DATA_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WC_SEASON,
} = process.env;

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
  const payload = await fetchWorldCupMatches(WC_SEASON);
  const matches = payload.matches ?? [];

  const teamsByExternalId = new Map();
  for (const m of matches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (!t?.id) continue;
      teamsByExternalId.set(String(t.id), {
        ext_id: String(t.id),
        name: t.name,
        code: t.tla ?? null,
      });
    }
  }

  const teamRows = [...teamsByExternalId.values()];

  const { data: existingTeams, error: existingTeamsErr } = await supabase
    .from('teams')
    .select('id, name, code, crest_url');
  if (existingTeamsErr) throw existingTeamsErr;

  const teamIdByExt = new Map();

  for (const team of teamRows) {
    const existing = existingTeams.find((t) => t.name === team.name || (team.code && t.code === team.code));

    if (existing) {
      teamIdByExt.set(team.ext_id, existing.id);
      continue;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('teams')
      .insert({
        name: team.name,
        code: team.code,
        crest_url: null,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    teamIdByExt.set(team.ext_id, inserted.id);
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

  console.log(`Synced ${teamRows.length} teams and ${matchRows.length} matches into Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
