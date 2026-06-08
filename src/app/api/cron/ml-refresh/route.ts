import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ML_API_BASE = process.env.WC26_ML_API_URL ?? 'http://localhost:8000';

export const revalidate = 0;

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // Fetch all finished matches with team names
  const { data: matches, error } = await supabase
    .from('world_cup_matches')
    .select(`
      external_match_id,
      home_score,
      away_score,
      home_team:teams!world_cup_matches_home_team_id_fkey(name),
      away_team:teams!world_cup_matches_away_team_id_fkey(name)
    `)
    .eq('status', 'FINISHED');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ status: 'no_finished_matches', finished: 0 });
  }

  // Transform to the format the ML API expects
  const finished = matches
    .map((m) => {
      const home = m.home_team as unknown as { name: string } | null;
      const away = m.away_team as unknown as { name: string } | null;
      if (!home?.name || !away?.name || m.home_score == null || m.away_score == null) return null;
      return {
        home_team: home.name,
        away_team: away.name,
        home_score: m.home_score,
        away_score: m.away_score,
      };
    })
    .filter(Boolean);

  if (finished.length === 0) {
    return NextResponse.json({ status: 'no_valid_matches', finished: 0 });
  }

  // Call the ML API refresh endpoint
  try {
    const response = await fetch(`${ML_API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finished }),
      signal: AbortSignal.timeout(120_000), // 2 min timeout for simulation
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json(
        { error: `ML API error (${response.status}): ${body}` },
        { status: 502 },
      );
    }

    const result = await response.json();
    return NextResponse.json({
      status: 'refreshed',
      finished: finished.length,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `ML API unreachable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}
