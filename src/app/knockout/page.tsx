import { AppNav } from '@/components/app-nav';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import type { MatchRow, TeamRow } from '@/lib/types';
import { KnockoutBracket } from '@/components/knockout/knockout-bracket';

export const revalidate = 300;

type MatchWithTeams = MatchRow & {
  homeTeam: TeamRow | null;
  awayTeam: TeamRow | null;
};

function isKnockoutStage(stage: string | null) {
  if (!stage) return false;
  const value = stage.toLowerCase();
  return (
    value.includes('round') ||
    value.includes('last') ||
    value.includes('quarter') ||
    value.includes('semi') ||
    value.includes('final') ||
    value.includes('third')
  );
}

async function getKnockoutMatches(): Promise<MatchWithTeams[]> {
  const { data: matches, error } = await supabaseAdmin
    .from('matches')
    .select('id, external_match_id, stage, kickoff_utc, status, home_score, away_score, home_team_id, away_team_id, minute, injury_time')
    .order('kickoff_utc', { ascending: true });

  if (error) throw error;

  const knockoutMatches = (matches ?? []).filter((m) => isKnockoutStage(m.stage));
  if (knockoutMatches.length === 0) return [];

  // Collect unique team IDs
  const teamIds = new Set<string>();
  for (const m of knockoutMatches) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }

  // Fetch teams
  let teamMap = new Map<string, TeamRow>();
  if (teamIds.size > 0) {
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id, external_team_id, name, code, crest_url, logo_url, flag_url, coach_name, founded, website, club_colors, venue')
      .in('id', [...teamIds]);

    teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  }

  return knockoutMatches.map((m) => ({
    ...m,
    homeTeam: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
    awayTeam: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
  }));
}

export default async function KnockoutPage() {
  let matches: MatchWithTeams[] = [];
  let error: string | null = null;

  try {
    matches = await getKnockoutMatches();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load knockout matches';
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-body sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />

        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">World Cup knockout</p>
              <h1 className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Knockout bracket</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Follow the road to the final. Matches update automatically as teams are confirmed and results come in.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/fixtures" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised">
                Fixtures
              </Link>
              <Link href="/leaderboard" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised">
                Leaderboard
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/60 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {!error && matches.length === 0 && (
          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-8 text-center">
            <p className="text-lg font-semibold text-heading">No knockout matches yet</p>
            <p className="mt-2 text-sm text-muted">Knockout fixtures will appear here once the tournament progresses.</p>
          </div>
        )}

        {matches.length > 0 && <KnockoutBracket matches={matches} />}
      </div>
    </main>
  );
}
