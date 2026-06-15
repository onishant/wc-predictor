import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Agreement: standard deviation of predicted margins among weighted players
function computeAgreement(
  predictions: { pred_home_score: number; pred_away_score: number; weight: number }[],
): 'strong' | 'moderate' | 'split' {
  if (predictions.length < 3) return 'moderate';

  const totalWeight = predictions.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return 'moderate';

  const margins = predictions.map((p) => p.pred_home_score - p.pred_away_score);
  const weightedMean =
    margins.reduce((s, m, i) => s + m * predictions[i].weight, 0) / totalWeight;
  const weightedVariance =
    margins.reduce((s, m, i) => s + predictions[i].weight * (m - weightedMean) ** 2, 0) /
    totalWeight;
  const stdDev = Math.sqrt(weightedVariance);

  if (stdDev < 0.8) return 'strong';
  if (stdDev < 1.5) return 'moderate';
  return 'split';
}

export async function GET() {
  // 1. Fetch all predictions with user points
  const { data: predictions, error: predError } = await supabaseAdmin
    .from('predictions')
    .select('match_external_id, user_id, pred_home_score, pred_away_score');

  if (predError) {
    return NextResponse.json({ error: predError.message }, { status: 500 });
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ message: 'No predictions found', updated: 0 });
  }

  // 2. Fetch leaderboard for weighting
  const { data: leaderboard } = await supabaseAdmin
    .from('leaderboard')
    .select('user_id, points');

  const pointsMap = new Map<string, number>();
  for (const row of leaderboard ?? []) {
    pointsMap.set(row.user_id, row.points ?? 0);
  }

  // 3. Group predictions by match
  const matchMap = new Map<
    string,
    { pred_home_score: number; pred_away_score: number; weight: number }[]
  >();

  for (const pred of predictions) {
    const matchId = pred.match_external_id;
    if (!matchId) continue;

    // Minimum weight of 1 so even new users contribute
    const userPoints = pointsMap.get(pred.user_id) ?? 0;
    const weight = Math.max(1, Math.log2(userPoints + 1));

    if (!matchMap.has(matchId)) matchMap.set(matchId, []);
    matchMap.get(matchId)!.push({
      pred_home_score: pred.pred_home_score,
      pred_away_score: pred.pred_away_score,
      weight,
    });
  }

  // 4. Compute weighted averages per match
  const now = new Date().toISOString();
  const rows: {
    match_id: string;
    weighted_home: number;
    weighted_away: number;
    home_win_pct: number;
    draw_pct: number;
    away_win_pct: number;
    sample_size: number;
    agreement: string;
    last_computed_at: string;
  }[] = [];

  for (const [matchId, preds] of matchMap) {
    const totalWeight = preds.reduce((s, p) => s + p.weight, 0);
    if (totalWeight === 0) continue;

    const weightedHome = preds.reduce((s, p) => s + p.pred_home_score * p.weight, 0) / totalWeight;
    const weightedAway = preds.reduce((s, p) => s + p.pred_away_score * p.weight, 0) / totalWeight;

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    for (const p of preds) {
      if (p.pred_home_score > p.pred_away_score) homeWins += p.weight;
      else if (p.pred_home_score === p.pred_away_score) draws += p.weight;
      else awayWins += p.weight;
    }

    const total = homeWins + draws + awayWins;
    const homeWinPct = Math.round((homeWins / total) * 100);
    const drawPct = Math.round((draws / total) * 100);
    const awayWinPct = 100 - homeWinPct - drawPct;

    rows.push({
      match_id: matchId,
      weighted_home: Math.round(weightedHome * 100) / 100,
      weighted_away: Math.round(weightedAway * 100) / 100,
      home_win_pct: homeWinPct,
      draw_pct: drawPct,
      away_win_pct: awayWinPct,
      sample_size: preds.length,
      agreement: computeAgreement(preds),
      last_computed_at: now,
    });
  }

  // 5. Upsert all rows
  if (rows.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from('community_insights')
      .upsert(rows, { onConflict: 'match_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Community insights updated', updated: rows.length });
}
