import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { MixamoCharacterStage } from '@/components/characters/mixamo-character-stage';
import { getAvatarName, isAvatarId } from '@/lib/avatar-catalog';
import type { AvatarFeatureId, AvatarId } from '@/lib/avatar-catalog';
import type { CharacterMood } from '@/lib/character-progress';
import { supabase } from '@/lib/supabase';

type LeaderboardRow = {
  user_id: string;
  points: number;
  xp: number;
  current_streak: number;
  best_streak: number;
  character_tier: string;
  username: string | null;
  selected_avatar_id?: string | null;
  equipped_gesture?: string | null;
  equipped_feature?: string | null;
};

function tierColor(tier: string) {
  switch (tier.toLowerCase()) {
    case 'legend':
      return 'bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-500/30';
    case 'elite':
      return 'bg-cyan-500/20 text-cyan-200 ring-cyan-500/30';
    case 'pro':
      return 'bg-amber-500/20 text-amber-200 ring-amber-500/30';
    default:
      return 'bg-slate-700 text-slate-200 ring-slate-600';
  }
}

function tierMood(tier: string, rank: number): CharacterMood {
  if (rank === 1) return 'victory';

  switch (tier.toLowerCase()) {
    case 'legend':
    case 'elite':
      return 'excited';
    case 'pro':
      return 'jogging';
    default:
      return 'idle';
  }
}

export default async function LeaderboardPage() {
  const { data, error } = supabase
    ? await supabase
        .from('leaderboard')
        .select('user_id, points, xp, current_streak, best_streak, character_tier, username, selected_avatar_id, equipped_gesture, equipped_feature')
        .order('points', { ascending: false })
        .order('xp', { ascending: false })
    : { data: [], error: null };

  const rows = ((data ?? []) as LeaderboardRow[]).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  const topThree = rows.slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <AppNav />
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">World Cup predictor</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Leaderboard</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Rank players by points, XP, and streaks. This view reads directly from the Supabase
                <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 text-[0.8em]">leaderboard</code>
                view.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/fixtures" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800">
                Fixtures
              </Link>
              <Link href="/auth" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
                Login / Sign up
              </Link>
              <Link href="/avatar" className="rounded-full border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-950/50">
                Configure avatar
              </Link>
            </div>
          </div>
        </header>

        {!supabase && (
          <div className="rounded-2xl border border-amber-900/60 bg-amber-950/50 p-4 text-sm text-amber-200">
            Supabase env vars are missing, so this leaderboard is showing an empty state until the config is restored.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/60 p-4 text-sm text-rose-200">
            Failed to load leaderboard: {error.message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          {topThree.map((row) => (
            <article key={row.user_id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <MixamoCharacterStage
                mood={toCharacterMood(row.equipped_gesture) ?? tierMood(row.character_tier, row.rank)}
                avatarId={toAvatarId(row.selected_avatar_id)}
                featureId={toFeatureId(row.equipped_feature)}
                height="sm"
                label={`Rank #${row.rank} avatar`}
              />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rank #{row.rank}</p>
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

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-lg font-semibold">Full ranking</h2>
            <p className="mt-1 text-sm text-slate-400">{rows.length} players on the board</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
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
                  <tr key={row.user_id} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-300">#{row.rank}</td>
                    <td className="px-5 py-3">{row.username ?? 'Anonymous'}</td>
                    <td className="px-5 py-3 text-slate-300">{avatarLabel(row)}</td>
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
                    <td className="px-5 py-6 text-slate-400" colSpan={8}>
                      No leaderboard data yet. Run predictions and update <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.8em]">user_progress</code> to populate this table.
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

function toCharacterMood(value?: string | null): CharacterMood | null {
  if (
    value === 'idle' ||
    value === 'excited' ||
    value === 'victory' ||
    value === 'defeat' ||
    value === 'jogging' ||
    value === 'goalkeeperCatchMedium' ||
    value === 'goalkeeperCatchHigh'
  ) {
    return value;
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

  const featureName =
    feature === 'football'
      ? 'Football control'
      : feature === 'clubAura'
        ? 'Club aura'
        : feature === 'captainBand'
          ? 'Captain band'
          : 'Champion glow';

  return `${avatarName} · ${featureName}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
      <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-50">{value}</dd>
    </div>
  );
}
