import { rebuildUserProgress, type FinishedMatchRow } from '@/lib/world-cup-sync';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || request.headers.get('authorization') !== `Bearer ${adminSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: finishedMatches, error } = await supabaseAdmin
      .from('matches')
      .select('external_match_id, kickoff_utc, status, home_score, away_score, home_score_et, away_score_et, home_score_pen, away_score_pen, stage')
      .eq('status', 'finished')
      .not('external_match_id', 'is', null)
      .returns<FinishedMatchRow[]>();

    if (error) throw error;

    const matchesByExternalId = new Map<string, FinishedMatchRow>(
      (finishedMatches ?? []).map((m) => [m.external_match_id as string, m])
    );

    await rebuildUserProgress(matchesByExternalId);

    return Response.json({ ok: true, matches: finishedMatches?.length ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
