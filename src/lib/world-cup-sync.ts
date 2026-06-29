import 'server-only';
import { getCharacterTier } from '@/lib/character-progress';
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
  minute?: number | null;
  injuryTime?: number | null;
  stage?: string | null;
  group?: string | null;
  homeTeam?: ProviderTeam | null;
  awayTeam?: ProviderTeam | null;
  score?: {
    duration?: string | null;
    fullTime?: { home?: number | null; away?: number | null };
    regularTime?: { home?: number | null; away?: number | null };
    extraTime?: { home?: number | null; away?: number | null };
    penalties?: { home?: number | null; away?: number | null };
  };
};

type FinishedMatchRow = {
  external_match_id: string | null;
  kickoff_utc: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  home_score_pen: number | null;
  away_score_pen: number | null;
  stage: string | null;
};

type PredictionSettlementRow = {
  id: string;
  user_id: string;
  match_external_id: string;
  predicted_result: 'home' | 'away' | 'draw';
  pred_home_score: number;
  pred_away_score: number;
  predicted_decider: string | null;
  points_awarded: number;
};

/**
 * Compute the correct main score for a match, excluding penalty shootout goals.
 * football-data.org's `fullTime` includes penalties for penalty matches.
 * We want the score at the end of regular/extra time instead.
 */
function getMatchScore(match: ProviderMatch): { home: number | null; away: number | null } {
  const ft = match.score?.fullTime;
  if (!ft) return { home: null, away: null };

  // If this went to penalties, fullTime includes penalty goals — compute the real score
  if (match.score?.duration === 'PENALTY_SHOOTOUT') {
    const reg = match.score?.regularTime;
    const et = match.score?.extraTime;
    if (reg && et) {
      // regularTime = 90-min score, extraTime = goals scored in extra time only
      return {
        home: (reg.home ?? 0) + (et.home ?? 0),
        away: (reg.away ?? 0) + (et.away ?? 0),
      };
    }
    if (reg) return { home: reg.home ?? null, away: reg.away ?? null };
    // Fallback: can't determine — still use fullTime
  }

  return { home: ft.home ?? null, away: ft.away ?? null };
}

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

  const matchRows = matches.map((match) => {
    const homeTeamId = match.homeTeam?.id ? teamIdByExternalId.get(String(match.homeTeam.id)) ?? null : null;
    const awayTeamId = match.awayTeam?.id ? teamIdByExternalId.get(String(match.awayTeam.id)) ?? null : null;

    return {
      external_match_id: String(match.id),
      stage: match.stage ?? match.group ?? null,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      kickoff_utc: match.utcDate,
      status: normalizeStatus(match.status),
      home_score: getMatchScore(match).home,
      away_score: getMatchScore(match).away,
      home_score_et: match.score?.extraTime?.home ?? null,
      away_score_et: match.score?.extraTime?.away ?? null,
      home_score_pen: match.score?.penalties?.home ?? null,
      away_score_pen: match.score?.penalties?.away ?? null,
      minute: match.minute ?? null,
      injury_time: match.injuryTime ?? null,
      settled_at: match.status === 'FINISHED' && match.score?.fullTime?.home != null && match.score?.fullTime?.away != null ? syncedAt : null,
      source_updated_at: syncedAt,
    };
  });

  const { error: matchesError } = await supabaseAdmin
    .from('matches')
    .upsert(matchRows, { onConflict: 'external_match_id' });
  if (matchesError) throw matchesError;

  const settledPredictions = await settleFinishedMatchPredictions(syncedAt);

  return { teams: teamRows.length, players: playerRows.length, matches: matchRows.length, settledPredictions, syncedAt };
}

async function settleFinishedMatchPredictions(settledAt: string) {
  const { data: finishedMatches, error: matchesError } = await supabaseAdmin
    .from('matches')
    .select('external_match_id, kickoff_utc, status, home_score, away_score, home_score_et, away_score_et, home_score_pen, away_score_pen, stage')
    .eq('status', 'finished')
    .not('external_match_id', 'is', null)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .returns<FinishedMatchRow[]>();
  if (matchesError) throw matchesError;

  const matchesByExternalId = new Map((finishedMatches ?? []).map((match) => [match.external_match_id as string, match]));
  const finishedExternalIds = [...matchesByExternalId.keys()];
  if (finishedExternalIds.length === 0) return 0;

  const { data: unsettledPredictions, error: predictionsError } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, match_external_id, predicted_result, pred_home_score, pred_away_score, predicted_decider, points_awarded')
    .is('settled_at', null)
    .in('match_external_id', finishedExternalIds)
    .returns<PredictionSettlementRow[]>();
  if (predictionsError) throw predictionsError;

  for (const prediction of unsettledPredictions ?? []) {
    const match = matchesByExternalId.get(prediction.match_external_id);
    if (!match || match.home_score == null || match.away_score == null) continue;

    const pointsAwarded = scorePrediction(prediction, match);
    const { error } = await supabaseAdmin
      .from('predictions')
      .update({ points_awarded: pointsAwarded, settled_at: settledAt, is_locked: true })
      .eq('id', prediction.id);
    if (error) throw error;
  }

  await rebuildUserProgress(matchesByExternalId);

  return unsettledPredictions?.length ?? 0;
}

async function rebuildUserProgress(matchesByExternalId: Map<string, FinishedMatchRow>) {
  const { data: settledPredictions, error } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, match_external_id, predicted_result, pred_home_score, pred_away_score, predicted_decider, points_awarded')
    .not('settled_at', 'is', null)
    .returns<PredictionSettlementRow[]>();
  if (error) throw error;

  const predictionsByUser = new Map<string, PredictionSettlementRow[]>();
  for (const prediction of settledPredictions ?? []) {
    const userPredictions = predictionsByUser.get(prediction.user_id) ?? [];
    userPredictions.push(prediction);
    predictionsByUser.set(prediction.user_id, userPredictions);
  }

  const progressRows = [...predictionsByUser.entries()].map(([userId, predictions]) => {
    const sortedPredictions = predictions.sort((a, b) => {
      const aMatch = matchesByExternalId.get(a.match_external_id);
      const bMatch = matchesByExternalId.get(b.match_external_id);
      return (aMatch?.kickoff_utc ?? '').localeCompare(bMatch?.kickoff_utc ?? '');
    });

    let points = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    for (const prediction of sortedPredictions) {
      points += prediction.points_awarded;
      if (prediction.points_awarded >= 10) {
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      user_id: userId,
      points,
      xp: points * 10,
      current_streak: currentStreak,
      best_streak: bestStreak,
      character_tier: getCharacterTier(points),
      updated_at: new Date().toISOString(),
    };
  });

  if (progressRows.length === 0) return;

  const { error: upsertError } = await supabaseAdmin
    .from('user_progress')
    .upsert(progressRows, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;
}

function getActualDecider(match: FinishedMatchRow): 'full_time' | 'extra_time' | 'penalties' {
  if (match.home_score_pen != null && match.away_score_pen != null) return 'penalties';
  if (match.home_score_et != null && match.away_score_et != null) return 'extra_time';
  return 'full_time';
}

function scorePrediction(prediction: PredictionSettlementRow, match: FinishedMatchRow) {
  const isKnockout = match.stage && !/GROUP/i.test(match.stage);
  const decider = prediction.predicted_decider;

  // Backward compat: no decider set or group stage → old logic
  if (!isKnockout || !decider) {
    if (match.home_score == null || match.away_score == null) return 0;
    const actualResult = getResult(match.home_score, match.away_score);
    let points = 0;
    if (prediction.predicted_result === actualResult) points += 10;
    if (prediction.pred_home_score === match.home_score) points += 5;
    if (prediction.pred_away_score === match.away_score) points += 5;
    return points;
  }

  // Knockout with decider
  let scoreHome: number | null = null;
  let scoreAway: number | null = null;
  let actualResult: 'home' | 'away' | 'draw';

  if (decider === 'full_time') {
    scoreHome = match.home_score;
    scoreAway = match.away_score;
    if (scoreHome == null || scoreAway == null) return 0;
    actualResult = getResult(scoreHome, scoreAway);
  } else if (decider === 'extra_time') {
    // Use 120-min score if available, else fall back to fullTime
    scoreHome = match.home_score_et ?? match.home_score;
    scoreAway = match.away_score_et ?? match.away_score;
    if (scoreHome == null || scoreAway == null) return 0;
    actualResult = getResult(scoreHome, scoreAway);
  } else {
    // penalties: score is 120-min result, winner is shootout
    scoreHome = match.home_score_et ?? match.home_score;
    scoreAway = match.away_score_et ?? match.away_score;
    if (scoreHome == null || scoreAway == null) return 0;
    // At penalties, 120-min score is always a draw
    actualResult = 'draw';
    // But predicted result should be the shootout winner
    if (match.home_score_pen != null && match.away_score_pen != null) {
      actualResult = match.home_score_pen > match.away_score_pen ? 'home' : 'away';
    }
  }

  let points = 0;

  // Correct result
  if (prediction.predicted_result === actualResult) points += 10;

  // Correct scores (on the relevant score)
  if (prediction.pred_home_score === scoreHome) points += 5;
  if (prediction.pred_away_score === scoreAway) points += 5;

  // Correct decider bonus
  const actualDecider = getActualDecider(match);
  if (decider === actualDecider) points += 5;

  return points;
}

function getResult(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

async function footballDataFetch<T>(path: string, season?: string) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('Missing FOOTBALL_DATA_API_KEY.');

  const url = new URL(`${FOOTBALL_DATA_BASE_URL}${path}`);
  if (season) url.searchParams.set('season', season);

  const response = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey, 'X-Api-Version': 'v4.1' },
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

/**
 * Lightweight live-scores sync: fetches only in-progress and recently finished
 * matches, updates scores in Supabase, and settles predictions for newly
 * finished matches. Skips teams/players sync.
 */
export async function syncLiveScores() {
  if (!hasSupabaseServiceRole) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('Missing FOOTBALL_DATA_API_KEY.');

  const url = new URL(`${FOOTBALL_DATA_BASE_URL}/competitions/WC/matches`);
  url.searchParams.set('status', 'LIVE,IN_PLAY,PAUSED,FINISHED');

  const response = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey, 'X-Api-Version': 'v4.1' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`football-data API error (${response.status}): ${await response.text()}`);

  const payload = await response.json() as { matches?: ProviderMatch[] };
  const liveMatches = payload.matches ?? [];

  if (liveMatches.length === 0) {
    return { changed: 0, finished: 0, settled: 0 };
  }

  // Fetch existing match rows for these external IDs to compare scores
  const externalIds = liveMatches.map((m) => String(m.id));
  const { data: existingMatches, error: existingError } = await supabaseAdmin
    .from('matches')
    .select('external_match_id, home_score, away_score, home_score_et, away_score_et, home_score_pen, away_score_pen, status, minute, injury_time')
    .in('external_match_id', externalIds);
  if (existingError) throw existingError;

  const existingMap = new Map(
    (existingMatches ?? []).map((m) => [m.external_match_id as string, m])
  );

  // Also need team IDs — look them up from existing matches
  const { data: allMatches, error: allMatchesError } = await supabaseAdmin
    .from('matches')
    .select('external_match_id, home_team_id, away_team_id')
    .in('external_match_id', externalIds);
  if (allMatchesError) throw allMatchesError;

  const matchTeamMap = new Map(
    (allMatches ?? []).map((m) => [m.external_match_id as string, m])
  );

  // Build team ID lookup from provider external IDs to DB IDs
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select('id, external_team_id')
    .not('external_team_id', 'is', null);
  if (teamsError) throw teamsError;

  const teamIdByExternal = new Map(
    (teams ?? []).map((t) => [String(t.external_team_id), t.id as string])
  );

  const syncedAt = new Date().toISOString();
  let changed = 0;
  let finished = 0;

  for (const match of liveMatches) {
    const extId = String(match.id);
    const existing = existingMap.get(extId);
    const existingTeamRow = matchTeamMap.get(extId);

    // Resolve team IDs: prefer provider data, fall back to existing DB row
    const homeTeamId = match.homeTeam?.id
      ? teamIdByExternal.get(String(match.homeTeam.id)) ?? existingTeamRow?.home_team_id ?? null
      : existingTeamRow?.home_team_id ?? null;
    const awayTeamId = match.awayTeam?.id
      ? teamIdByExternal.get(String(match.awayTeam.id)) ?? existingTeamRow?.away_team_id ?? null
      : existingTeamRow?.away_team_id ?? null;

    const score = getMatchScore(match);
    const apiHome = score.home;
    const apiAway = score.away;
    const newStatus = normalizeStatus(match.status);

    // Skip if nothing changed and match already exists
    const scoreUnchanged =
      existing &&
      existing.home_score === apiHome &&
      existing.away_score === apiAway &&
      existing.status === newStatus &&
      existing.minute === (match.minute ?? null) &&
      existing.injury_time === (match.injuryTime ?? null);
    if (scoreUnchanged) continue;

    const isFinished =
      match.status === 'FINISHED' && apiHome != null && apiAway != null;
    if (isFinished) finished++;

    const { error: upsertError } = await supabaseAdmin
      .from('matches')
      .upsert(
        {
          external_match_id: extId,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          kickoff_utc: match.utcDate,
          status: newStatus,
          home_score: apiHome,
          away_score: apiAway,
          home_score_et: match.score?.extraTime?.home ?? null,
          away_score_et: match.score?.extraTime?.away ?? null,
          home_score_pen: match.score?.penalties?.home ?? null,
          away_score_pen: match.score?.penalties?.away ?? null,
          minute: match.minute ?? null,
          injury_time: match.injuryTime ?? null,
          settled_at: isFinished ? syncedAt : null,
          source_updated_at: syncedAt,
        },
        { onConflict: 'external_match_id' }
      );
    if (upsertError) throw upsertError;

    changed++;
  }

  // Settle predictions if any match just finished
  let settled = 0;
  if (finished > 0) {
    settled = await settleFinishedMatchPredictions(syncedAt);
  }

  return { changed, finished, settled };
}
