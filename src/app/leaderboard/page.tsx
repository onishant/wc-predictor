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

type PredictionRow = {
  id: string;
  match_external_id: string;
  predicted_result: 'home' | 'away' | 'draw';
  pred_home_score: number;
  pred_away_score: number;
  predicted_decider: string | null;
  points_awarded: number | null;
  settled_at: string | null;
  created_at?: string | null;
};

type MatchRow = {
  external_match_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_utc: string;
  stage: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

type TeamRow = {
  id: string;
  name: string;
  crest_url: string | null;
};

type ProgressPrediction = PredictionRow & {
  match: MatchRow | null;
  homeTeam: TeamRow | null;
  awayTeam: TeamRow | null;
  runningTotal: number;
};

type Tab = 'group' | 'overall' | 'progress';

function accuracyPercent(settled: number, correct: number): string {
  if (settled === 0) return '—';
  return `${Math.round((correct / settled) * 100)}%`;
}

function getResultLabel(result: 'home' | 'away' | 'draw', homeTeam?: string, awayTeam?: string) {
  if (result === 'draw') return 'Draw';
  return result === 'home' ? homeTeam ?? 'Home win' : awayTeam ?? 'Away win';
}

function getActualResult(match: MatchRow | null): 'home' | 'away' | 'draw' | null {
  if (!match || match.home_score == null || match.away_score == null) return null;
  if (match.home_score > match.away_score) return 'home';
  if (match.away_score > match.home_score) return 'away';
  return 'draw';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Date TBD';

  const date = new Date(value);

  return `${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3 ring-1 ring-border-subtle">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-heading">{value}</dd>
    </div>
  );
}

function PointsBadge({ points, settled }: { points: number | null; settled: boolean }) {
  if (!settled) {
    return (
      <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-muted">
        Pending
      </span>
    );
  }

  const value = points ?? 0;
  const tone =
    value >= 20
      ? 'bg-emerald-500/15 text-emerald-300'
      : value >= 10
        ? 'bg-cyan-500/15 text-cyan-300'
        : value > 0
          ? 'bg-purple-500/15 text-purple-300'
          : 'bg-rose-500/15 text-rose-300';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      +{value} pts
    </span>
  );
}

export default function LeaderboardPage() {
  const [allRows, setAllRows] = useState<(LeaderboardRow & { rank: number })[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressPrediction[]>([]);
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
          .select('group_id')
          .eq('id', uid)
          .single();

        const gid = (profile as unknown as { group_id: string | null } | null)?.group_id ?? null;
        setUserGroupId(gid);

        if (gid) {
          const { data: group } = await supabase!
            .from('groups')
            .select('name')
            .eq('id', gid)
            .single();

          setUserGroupName((group as unknown as { name: string | null } | null)?.name ?? null);
        }

        if (!gid) setTab('overall');

        const { data: predictionData, error: predictionError } = await supabase!
          .from('predictions')
          .select('id, match_external_id, predicted_result, pred_home_score, pred_away_score, predicted_decider, points_awarded, settled_at, created_at')
          .eq('user_id', uid);

        if (predictionError) {
          setError(predictionError.message);
        } else {
          const predictions = (predictionData ?? []) as PredictionRow[];
          const externalMatchIds = [
            ...new Set(predictions.map((p) => p.match_external_id).filter(Boolean)),
          ];

          let matches: MatchRow[] = [];

          if (externalMatchIds.length > 0) {
            const { data: matchData, error: matchError } = await supabase!
              .from('matches')
              .select('external_match_id, home_team_id, away_team_id, kickoff_utc, stage, status, home_score, away_score')
              .in('external_match_id', externalMatchIds);

            if (matchError) {
              setError(matchError.message);
            } else {
              matches = (matchData ?? []) as MatchRow[];
            }
          }

          const matchByExternalId = new Map(
            matches.map((match) => [match.external_match_id, match]),
          );

          const teamIds = [
            ...new Set(
              matches
                .flatMap((match) => [match.home_team_id, match.away_team_id])
                .filter((id): id is string => Boolean(id)),
            ),
          ];

          let teams: TeamRow[] = [];

          if (teamIds.length > 0) {
            const { data: teamData, error: teamError } = await supabase!
              .from('teams')
              .select('id, name, crest_url')
              .in('id', teamIds);

            if (teamError) {
              setError(teamError.message);
            } else {
              teams = (teamData ?? []) as TeamRow[];
            }
          }

          const teamById = new Map(teams.map((team) => [team.id, team]));
          let runningTotal = 0;

          const progress = predictions
            .map((prediction) => {
              const match = matchByExternalId.get(prediction.match_external_id) ?? null;

              return {
                ...prediction,
                match,
                homeTeam: match?.home_team_id ? teamById.get(match.home_team_id) ?? null : null,
                awayTeam: match?.away_team_id ? teamById.get(match.away_team_id) ?? null : null,
                runningTotal: 0,
              };
            })
            .sort((a, b) => {
              const aDate = a.match?.kickoff_utc ?? a.created_at ?? '';
              const bDate = b.match?.kickoff_utc ?? b.created_at ?? '';
              return aDate.localeCompare(bDate);
            })
            .map((row) => {
              if (row.settled_at) runningTotal += row.points_awarded ?? 0;
              return { ...row, runningTotal };
            });

          setProgressRows(progress);
        }
      }

      const { data, error: fetchError } = await supabase!
        .from('leaderboard')
        .select('user_id, points, current_streak, best_streak, username, group_id, selected_avatar_id, equipped_feature, supported_team_id, team_crest_url, team_name, settled_count, correct_count')
        .order('points', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const accuracy = (row: LeaderboardRow) =>
          row.settled_count > 0 ? row.correct_count / row.settled_count : 0;

        const sorted = ((data ?? []) as LeaderboardRow[]).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (accuracy(b) !== accuracy(a)) return accuracy(b) - accuracy(a);
          if (b.best_streak !== a.best_streak) return b.best_streak - a.best_streak;
          if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
          return (a.username ?? '').localeCompare(b.username ?? '');
        });

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
            accuracy(row) === accuracy(prev) &&
            row.best_streak === prev.best_streak &&
            row.current_streak === prev.current_streak;

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

    const filtered = allRows.filter((row) => row.group_id === userGroupId);
    const accuracy = (row: LeaderboardRow) =>
      row.settled_count > 0 ? row.correct_count / row.settled_count : 0;

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
        accuracy(row) === accuracy(prev) &&
        row.best_streak === prev.best_streak &&
        row.current_streak === prev.current_streak;

      reranked.push({ ...row, rank: tied ? prev.rank : i + 1 });
    }

    return reranked;
  })();

  const userOverallRank = userId ? allRows.findIndex((row) => row.user_id === userId) + 1 : 0;
  const userGroupRank =
    userId && userGroupId
      ? allRows.filter((row) => row.group_id === userGroupId).findIndex((row) => row.user_id === userId) + 1
      : 0;

  const userRow = userId ? allRows.find((row) => row.user_id === userId) : null;
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                World Cup predictor
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Leaderboard</h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/fixtures"
                className="rounded-full border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-raised"
              >
                Fixtures
              </Link>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-300">
                Exact score: +10 each team
              </span>
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 font-semibold text-cyan-300">
                Correct result: +10
              </span>
              <span className="rounded-full bg-purple-500/15 px-3 py-1 font-semibold text-purple-300">
                Group max: 20 pts
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-300">
                Correct decider: +5
              </span>
              <span className="rounded-full bg-rose-500/15 px-3 py-1 font-semibold text-rose-300">
                Knockout max: 25 pts
              </span>
              <a href="/rules" className="rounded-full border border-border-default px-3 py-1 font-semibold text-muted hover:text-heading">
                Full rules →
              </a>
            </div>
          </div>
        </header>

        {userId && userOverallRank > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface/60 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Your overall rank
              </p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">
                #{userOverallRank}{' '}
                <span className="text-sm font-normal text-muted">of {allRows.length}</span>
              </p>
            </div>

            {userRow && userRow.settled_count > 0 && (
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Accuracy
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">
                  {accuracyPercent(userRow.settled_count, userRow.correct_count)}
                </p>
              </div>
            )}

            {userGroupId && userGroupRank > 0 && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Group rank
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">#{userGroupRank}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 rounded-xl bg-surface-raised p-1">
          {userGroupId && (
            <button
              type="button"
              onClick={() => setTab('group')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === 'group' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
              }`}
            >
              {userGroupName ?? 'My Group'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setTab('overall')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === 'overall' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
            }`}
          >
            Overall
          </button>

          {userId && (
            <button
              type="button"
              onClick={() => setTab('progress')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === 'progress' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
              }`}
            >
              My Progress
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/60 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-muted">Loading…</p>}

        {tab === 'progress' && !loading && (
          <section className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-lg">
            <div className="border-b border-border-subtle px-5 py-4">
              <h2 className="text-lg font-semibold">My Progress</h2>
              <p className="mt-1 text-sm text-muted">
                Your predictions, actual scores, points awarded, and running total.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-background/60 text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Match</th>
                    <th className="px-5 py-3 font-medium">Your prediction</th>
                    <th className="px-5 py-3 font-medium">Actual score</th>
                    <th className="px-5 py-3 font-medium text-right">Scored</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {progressRows.map((row) => {
                    const homeName = row.homeTeam?.name ?? 'TBD';
                    const awayName = row.awayTeam?.name ?? 'TBD';
                    const actualResult = getActualResult(row.match);
                    const predictedResultLabel = getResultLabel(row.predicted_result, homeName, awayName);
                    const actualResultLabel = actualResult ? getResultLabel(actualResult, homeName, awayName) : null;
                    const settled = Boolean(row.settled_at);

                    return (
                      <tr key={row.id} className="border-t border-border-subtle hover:bg-surface-raised/50">
                        <td className="px-5 py-4 align-top">
                          <div className="font-semibold text-heading">
                            {homeName} vs {awayName}
                          </div>
                          <div className="mt-1 text-xs text-muted">
                            {formatDateTime(row.match?.kickoff_utc)} · {row.match?.stage ?? 'Stage TBD'}
                          </div>
                          <div className="mt-1 text-xs capitalize text-faint">
                            {row.match?.status ?? 'match missing'}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="font-semibold tabular-nums text-heading">
                            {row.pred_home_score} – {row.pred_away_score}
                          </div>
                          <div className="mt-1 text-xs text-muted">{predictedResultLabel}</div>
                          {row.predicted_decider && row.match?.stage && !/GROUP/i.test(row.match.stage) && (
                            <div className="mt-1 text-[11px] text-faint">
                              {row.predicted_decider === 'penalties' && '🎯 Penalties'}
                              {row.predicted_decider === 'extra_time' && '⏱️ Extra Time'}
                              {row.predicted_decider === 'full_time' && '⚽ Full Time'}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          {row.match?.home_score != null && row.match?.away_score != null ? (
                            <>
                              <div className="font-semibold tabular-nums text-heading">
                                {row.match.home_score} – {row.match.away_score}
                              </div>
                              {actualResultLabel && (
                                <div className="mt-1 text-xs text-muted">{actualResultLabel}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted">Not final yet</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right align-top">
                          <PointsBadge points={row.points_awarded} settled={settled} />
                        </td>

                        <td className="px-5 py-4 text-right align-top text-lg font-bold tabular-nums text-cyan-300">
                          {row.runningTotal}
                        </td>
                      </tr>
                    );
                  })}

                  {progressRows.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-muted" colSpan={5}>
                        No predictions yet. Make your first prediction from the fixtures page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab !== 'progress' && !loading && topThree.length > 0 && (
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

        {tab !== 'progress' && !loading && (
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
                    <tr
                      key={row.user_id}
                      className={`border-t border-border-subtle hover:bg-surface-raised/50 ${
                        row.user_id === userId ? 'bg-cyan-500/5' : ''
                      }`}
                    >
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
                          <span className="font-medium text-emerald-400">
                            {accuracyPercent(row.settled_count, row.correct_count)}
                          </span>
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
        )}
      </div>
    </main>
  );
}