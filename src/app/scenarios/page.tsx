import { AppNav } from '@/components/app-nav';
import { ScenariosClient } from '@/components/scenarios/scenarios-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getWorldCupData } from '@/lib/world-cup-data';
import Link from 'next/link';

export const revalidate = 300;

type MatchRow = {
  id: string;
  external_match_id: string | null;
  stage: string | null;
  kickoff_utc: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  code: string | null;
  crest_url: string | null;
  flag_url: string | null;
};

async function getData() {
  const [worldCup, matchesResult] = await Promise.all([
    getWorldCupData(),
    supabaseAdmin
      .from('matches')
      .select('id, external_match_id, stage, kickoff_utc, status, home_score, away_score, home_team_id, away_team_id')
      .order('kickoff_utc', { ascending: true }),
  ]);

  const matches: MatchRow[] = matchesResult.data ?? [];

  // Get all team IDs
  const teamIds = new Set<string>();
  for (const m of matches) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }

  // Fetch teams
  let teamMap = new Map<string, TeamRow>();
  if (teamIds.size > 0) {
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id, name, code, crest_url, flag_url')
      .in('id', [...teamIds]);
    teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  }

  return {
    matches,
    teamMap: Object.fromEntries(teamMap),
    teamStats: worldCup.teamStats,
  };
}

export default async function ScenariosPage() {
  let data: Awaited<ReturnType<typeof getData>> | null = null;
  let error: string | null = null;

  try {
    data = await getData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load data';
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-body sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />

        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">World Cup scenarios</p>
              <h1 className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl">What if?</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Pick results for remaining matches and see how they affect group standings, qualification, and knockout matchups.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/fixtures" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised">Fixtures</Link>
              <Link href="/knockout" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised">Knockout</Link>
              <Link href="/leaderboard" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised">Leaderboard</Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/60 p-4 text-sm text-rose-200">{error}</div>
        )}

        {data && (
          <ScenariosClient
            matches={data.matches}
            teamMap={data.teamMap}
            teamStats={data.teamStats}
          />
        )}
      </div>
    </main>
  );
}
