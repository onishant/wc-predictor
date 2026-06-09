'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { AppNav } from '@/components/app-nav';
import { MixamoCharacterStage } from '@/components/characters/mixamo-character-stage';
import { getAvatarName, isAvatarId } from '@/lib/avatar-catalog';
import type { AvatarFeatureId, AvatarId } from '@/lib/avatar-catalog';
import type { CharacterMood } from '@/lib/character-progress';

type LeaderboardRow = {
  user_id: string;
  points: number;
  xp: number;
  current_streak: number;
  best_streak: number;
  character_tier: string;
  username: string | null;
  group_id: string | null;
  selected_avatar_id?: string | null;
  equipped_gesture?: string | null;
  equipped_feature?: string | null;
};

type Tab = 'group' | 'overall';

function tierColor(tier: string) {
  switch (tier.toLowerCase()) {
    case 'legend': return 'bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-500/30';
    case 'elite': return 'bg-cyan-500/20 text-cyan-200 ring-cyan-500/30';
    case 'pro': return 'bg-amber-500/20 text-amber-200 ring-amber-500/30';
    default: return 'bg-surface-raised text-heading ring-border-strong';
  }
}

function tierMood(tier: string, rank: number): CharacterMood {
  if (rank === 1) return 'victory';
  switch (tier.toLowerCase()) {
    case 'legend':
    case 'elite': return 'excited';
    case 'pro': return 'jogging';
    default: return 'idle';
  }
}

function toCharacterMood(value?: string | null): CharacterMood | null {
  if (['idle', 'excited', 'victory', 'defeat', 'jogging', 'goalkeeperCatchMedium', 'goalkeeperCatchHigh'].includes(value ?? '')) {
    return value as CharacterMood;
  }
  return null;
}

function toAvatarId(value?: string | null): AvatarId {
  if (isAvatarId(value)) return value;
  return 'striker';
}

function toFeatureId(value?: string | null): AvatarFeatureId {
  if (value === 'football' || value === 'clubAura' || value === 'captainBand' || value === 'championGlow') return value;
  return 'none';
}

function avatarLabel(row: LeaderboardRow) {
  const avatar = toAvatarId(row.selected_avatar_id);
  const feature = toFeatureId(row.equipped_feature);
  const avatarName = getAvatarName(avatar);
  if (feature === 'none') return avatarName;
  const featureName = feature === 'football' ? 'Football control' : feature === 'clubAura' ? 'Club aura' : feature === 'captainBand' ? 'Captain band' : 'Champion glow';
  return `${avatarName} · ${featureName}`;
}

function Stat({ label, value }: { label: string; value: number }) {
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

      // Get user's group
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

      // Get leaderboard
      const { data, error: fetchError } = await supabase!
        .from('leaderboard')
        .select('user_id, points, xp, current_streak, best_streak, character_tier, username, group_id, selected_avatar_id, equipped_gesture, equipped_feature')
        .order('points', { ascending: false })
        .order('xp', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const ranked = ((data ?? []) as LeaderboardRow[]).map((row, i) => ({ ...row, rank: i + 1 }));
        setAllRows(ranked);
      }
      setLoading(false);
    }

    load();
  }, []);

  const rows = tab === 'group' && userGroupId
    ? allRows.filter(r => r.group_id === userGroupId).map((r, i) => ({ ...r, rank: i + 1 }))
    : allRows;

  // User's overall rank (always computed from full list)
  const userOverallRank = userId ? allRows.findIndex(r => r.user_id === userId) + 1 : 0;
  const userGroupRank = userId && userGroupId
    ? allRows.filter(r => r.group_id === userGroupId).findIndex(r => r.user_id === userId) + 1
    : 0;

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
              <Link href="/groups" className="rounded-full border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-950/50">Groups</Link>
              <Link href="/auth" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Login / Sign up</Link>
            </div>
          </div>
        </header>

        {/* Overall rank badge */}
        {userId && userOverallRank > 0 && (
          <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Your overall rank</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">#{userOverallRank} <span className="text-sm font-normal text-muted">of {allRows.length}</span></p>
            </div>
            {userGroupId && userGroupRank > 0 && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Group rank</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">#{userGroupRank}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
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

        {/* Top 3 */}
        {topThree.length > 0 && (
          <section className="grid gap-4 md:grid-cols-3">
            {topThree.map((row) => (
              <article key={row.user_id} className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-lg">
                <MixamoCharacterStage
                  mood={toCharacterMood(row.equipped_gesture) ?? tierMood(row.character_tier, row.rank)}
                  avatarId={toAvatarId(row.selected_avatar_id)}
                  featureId={toFeatureId(row.equipped_feature)}
                  height="sm"
                  label={`Rank #${row.rank} avatar`}
                />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Rank #{row.rank}</p>
                    <h2 className="mt-1 text-xl font-semibold">{row.username ?? 'Anonymous'}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tierColor(row.character_tier)}`}>
                    {row.character_tier}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Points" value={row.points} />
                  <Stat label="XP" value={row.xp} />
                  <Stat label="Current streak" value={row.current_streak} />
                  <Stat label="Best streak" value={row.best_streak} />
                </dl>
              </article>
            ))}
          </section>
        )}

        {/* Full table */}
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
                  <th className="px-5 py-3 font-medium">Avatar</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium text-right">Points</th>
                  <th className="px-5 py-3 font-medium text-right">XP</th>
                  <th className="px-5 py-3 font-medium text-right">Streak</th>
                  <th className="px-5 py-3 font-medium text-right">Best</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className={`border-t border-border-subtle hover:bg-surface-raised/50 ${row.user_id === userId ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-5 py-3 font-medium text-body">#{row.rank}</td>
                    <td className="px-5 py-3">
                      {row.username ?? 'Anonymous'}
                      {row.user_id === userId && <span className="ml-2 text-xs text-cyan-400">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-body">{avatarLabel(row)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tierColor(row.character_tier)}`}>
                        {row.character_tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-cyan-300">{row.points}</td>
                    <td className="px-5 py-3 text-right">{row.xp}</td>
                    <td className="px-5 py-3 text-right">{row.current_streak}</td>
                    <td className="px-5 py-3 text-right">{row.best_streak}</td>
                  </tr>
                ))}
                {rows.length === 0 && !error && (
                  <tr>
                    <td className="px-5 py-6 text-muted" colSpan={8}>
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
