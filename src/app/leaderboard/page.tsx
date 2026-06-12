'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { AppNav } from '@/components/app-nav';
import { AvatarBadge } from '@/components/avatar/avatar-badge';

type LeaderboardRow = {
  user_id: string;
  points: number;
  current_streak: number;
  best_streak: number;
  username: string | null;
  group_id: string | null;
  selected_avatar_id?: string | null;
  equipped_feature?: string | null;
  supported_team_id?: string | null;
  team_crest_url?: string | null;
  team_name?: string | null;
  settled_count: number;
  correct_count: number;
};

type Tab = 'group' | 'overall';

function accuracyPercent(settled: number, correct: number): string {
  if (settled === 0) return '—';
  return `${Math.round((correct / settled) * 100)}%`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3 ring-1 ring-border-subtle">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-heading">{value}</dd>
    </div>
  );
}

export default function LeaderboardPage() {
  const [allRows, setAllRows] = useState<(LeaderboardRow & { rank: number })[]>([]);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [userGroupName, setUserGroupName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('group');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    async function load() {
      const { data: { user } } = await supabase!.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: profile } = await supabase!
          .from('users_profile')
          .select('group_id, groups(name)')
          .eq('id', uid)
          .single();
        const gid = (profile as unknown as { group_id: string | null })?.group_id ?? null;
        setUserGroupId(gid);
        const rawGroups = (profile as unknown as { groups: { name: string }[] | null })?.groups;
        const groupName = Array.isArray(rawGroups) ? rawGroups[0]?.name : null;
        setUserGroupName(groupName ?? null);
        if (!gid) setTab('overall');
      }

      const { data, error: fetchError } = await supabase!
        .from('leaderboard')
        .select('user_id, points, current_streak, best_streak, username, group_id, selected_avatar_id, equipped_feature, supported_team_id, team_crest_url, team_name, settled_count, correct_count')
        .order('points', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const sorted = ((data ?? []) as LeaderboardRow[]).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
          if (b.best_streak !== a.best_streak) return b.best_streak - a.best_streak;
          return (a.username ?? '').localeCompare(b.username ?? '');
        });

        // Standard competition ranking: ties share the same rank
        const ranked: (LeaderboardRow & { rank: number })[] = [];
        for (let i = 0; i < sorted.length; i++) {
          const row = sorted[i];
          if (i === 0) {
            ranked.push({ ...row, rank: 1 });
            continue;
          }
          const prev = ranked[i - 1];
          const tied =
            row.points === prev.points &&
            row.current_streak === prev.current_streak &&
            row.best_streak === prev.best_streak;
          ranked.push({ ...row, rank: tied ? prev.rank : i + 1 });
        }

        setAllRows(ranked);
      }
      setLoading(false);
    }

    load();
  }, []);

  const rows = (() => {
    if (tab !== 'group' || !userGroupId) return allRows;
    const filtered = allRows.filter(r => r.group_id === userGroupId);
    // Re-rank within group using same standard competition ranking
    const reranked: (LeaderboardRow & { rank: number })[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const row = filtered[i];
      if (i === 0) {
        reranked.push({ ...row, rank: 1 });
        continue;
      }
      const prev = reranked[i - 1];
      const tied =
        row.points === prev.points &&
        row.current_streak === prev.current_streak &&
        row.best_streak === prev.best_streak;
      reranked.push({ ...row, rank: tied ? prev.rank : i + 1 });
    }
    return reranked;
  })();

  const userOverallRank = userId ? allRows.findIndex(r => r.user_id === userId) + 1 : 0;
  const userGroupRank = userId && userGroupId
    ? allRows.filter(r => r.group_id === userGroupId).findIndex(r => r.user_id === userId) + 1
    : 0;

  const userRow = userId ? allRows.find(r => r.user_id === userId) : null;

  const topThree = rows.slice(0, 3);

  if (!supabase) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <AppNav />
          <div className="rounded-2xl border border-amber-900/60 bg-amber-950/50 p-4 text-sm text-amber-200">
            Supabase env vars are missing.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <AppNav />

        <header className="rounded-3xl border border-border-subtle bg-surface-overlay p-6 shadow-2xl shadow-accent/10 backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">World Cup predictor</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Leaderboard</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/fixtures" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised">Fixtures</Link>
            </div>
          </div>
          {/* Scoring criteria */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-300">Exact score: 20 pts</span>
            <span className="rounded-full bg-cyan-500/15 px-3 py-1 font-semibold text-cyan-300">Correct result: 10 pts</span>
            <span className="rounded-full bg-purple-500/15 px-3 py-1 font-semibold text-purple-300">Team goals correct: 5 pts each</span>
          </div>
        </header>

        {userId && userOverallRank > 0 && (
          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Your overall rank</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">#{userOverallRank} <span className="text-sm font-normal text-muted">of {allRows.length}</span></p>
            </div>
            {userRow && userRow.settled_count > 0 && (
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Accuracy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{accuracyPercent(userRow.settled_count, userRow.correct_count)}</p>
              </div>
            )}
            {userGroupId && userGroupRank > 0 && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Group rank</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">#{userGroupRank}</p>
              </div>
            )}
          </div>
        )}

        {userGroupId && (
          <div className="flex gap-2 rounded-xl bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => setTab('group')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === 'group' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
              }`}
            >
              {userGroupName ?? 'My Group'}
            </button>
            <button
              type="button"
              onClick={() => setTab('overall')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === 'overall' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
              }`}
            >
              Overall
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/60 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-muted">Loading…</p>}

        {topThree.length > 0 && (
          <section className="grid gap-4 md:grid-cols-3">
            {topThree.map((row) => (
              <article key={row.user_id} className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-lg">
                <div className="flex justify-center">
                  <AvatarBadge
                    seed={row.user_id}
                    teamCrestUrl={row.team_crest_url}
                    teamName={row.team_name}
                    size="lg"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Rank #{row.rank}</p>
                  <h2 className="mt-1 text-xl font-semibold">{row.username ?? 'Anonymous'}</h2>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Points" value={row.points} />
                  <Stat label="Streak" value={row.current_streak} />
                  <Stat label="Accuracy" value={accuracyPercent(row.settled_count, row.correct_count)} />
                </dl>
              </article>
            ))}
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-lg">
          <div className="border-b border-border-subtle px-5 py-4">
            <h2 className="text-lg font-semibold">
              {tab === 'group' ? `${userGroupName ?? 'Group'} ranking` : 'Overall ranking'}
            </h2>
            <p className="mt-1 text-sm text-muted">{rows.length} players on the board</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-background/60 text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Rank</th>
                  <th className="px-5 py-3 font-medium">Player</th>
                  <th className="px-5 py-3 font-medium text-right">Points</th>
                  <th className="px-5 py-3 font-medium text-right">Accuracy</th>
                  <th className="px-5 py-3 font-medium text-right">Streak</th>
                  <th className="px-5 py-3 font-medium text-right">Best</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className={`border-t border-border-subtle hover:bg-surface-raised/50 ${row.user_id === userId ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-5 py-3 font-medium text-body">#{row.rank}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarBadge
                          seed={row.user_id}
                          teamCrestUrl={row.team_crest_url}
                          teamName={row.team_name}
                          size="sm"
                        />
                        <div>
                          {row.username ?? 'Anonymous'}
                          {row.user_id === userId && <span className="ml-2 text-xs text-cyan-400">(you)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-cyan-300">{row.points}</td>
                    <td className="px-5 py-3 text-right">
                      {row.settled_count > 0 ? (
                        <span className="font-medium text-emerald-400">{accuracyPercent(row.settled_count, row.correct_count)}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">{row.current_streak}</td>
                    <td className="px-5 py-3 text-right">{row.best_streak}</td>
                  </tr>
                ))}
                {rows.length === 0 && !error && (
                  <tr>
                    <td className="px-5 py-6 text-muted" colSpan={6}>
                      {tab === 'group' ? 'No one in this group yet.' : 'No leaderboard data yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
