'use client';

import { useMemo, useState } from 'react';
import type { MLDashboard } from '@/lib/ml-api';

type Props = {
  dashboard: MLDashboard;
};

type SortKey = 'winner' | 'position' | 'name';

const stageColors: Record<string, string> = {
  group_exit: 'text-faint',
  round_of_32: 'text-muted',
  round_of_16: 'text-cyan-300',
  quarter_final: 'text-blue-300',
  semi_final: 'text-purple-300',
  final: 'text-amber-300',
  winner: 'text-emerald-300',
};

const stageLabels: Record<string, string> = {
  group_exit: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final: 'Semi-Final',
  final: 'Final',
  winner: 'Winner',
};

export function TournamentPredictionsClient({ dashboard }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('winner');
  const [search, setSearch] = useState('');

  const sortedTeams = useMemo(() => {
    let teams = [...dashboard.teams];

    if (search) {
      teams = teams.filter((t) => t.team.toLowerCase().includes(search.toLowerCase()));
    }

    switch (sortBy) {
      case 'winner':
        teams.sort((a, b) => b.winner_probability - a.winner_probability);
        break;
      case 'position':
        teams.sort((a, b) => a.expected_position - b.expected_position);
        break;
      case 'name':
        teams.sort((a, b) => a.team.localeCompare(b.team));
        break;
    }

    return teams;
  }, [dashboard.teams, sortBy, search]);

  const top10 = sortedTeams.slice(0, 10);

  const generatedAt = dashboard.generated_at
    ? new Date(dashboard.generated_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div className="space-y-6">
      {/* Model info */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Simulations" value={dashboard.simulations.toLocaleString()} />
        <StatCard label="Seed" value={String(dashboard.seed)} />
        <StatCard label="Teams" value={String(dashboard.teams.length)} />
        <StatCard label="Generated" value={generatedAt} />
      </div>

      {/* Winner probabilities chart */}
      <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-purple-400">
          🏆 Tournament Winner Probabilities
        </p>
        <div className="space-y-2">
          {top10.map((team, index) => (
            <WinnerBar key={team.team} team={team.team} probability={team.winner_probability} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-border-subtle bg-surface/60 p-1">
          {([
            { key: 'winner' as SortKey, label: 'By Winner %' },
            { key: 'position' as SortKey, label: 'By Expected Position' },
            { key: 'name' as SortKey, label: 'A–Z' },
          ]).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortBy(option.key)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                sortBy === option.key
                  ? 'bg-purple-500 text-slate-950'
                  : 'text-muted hover:text-heading'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-border-subtle bg-surface/60 px-4 py-2 text-sm text-heading placeholder-faint outline-none transition focus:border-purple-400"
        />
      </div>

      {/* Full table */}
      <div className="overflow-hidden rounded-2xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead className="bg-surface text-body">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Team</th>
              <th className="px-4 py-3 text-right text-xs font-medium">Winner %</th>
              <th className="px-4 py-3 text-right text-xs font-medium">Expected Pos</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Most Likely Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium">Probability</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => (
              <tr
                key={team.team}
                className={`border-t border-border-subtle/50 transition hover:bg-surface/40 ${
                  index < 3 ? 'bg-purple-500/5' : ''
                }`}
              >
                <td className="px-4 py-2.5 text-faint">{index + 1}</td>
                <td className="px-4 py-2.5 font-medium text-heading">{team.team}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={team.winner_probability > 0.05 ? 'font-bold text-purple-300' : 'text-body'}>
                    {(team.winner_probability * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-body">
                  {team.expected_position.toFixed(1)}
                </td>
                <td className={`px-4 py-2.5 ${stageColors[team.most_likely_stage] ?? 'text-muted'}`}>
                  {stageLabels[team.most_likely_stage] ?? team.most_likely_stage}
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-purple-400 transition-all"
                      style={{ width: `${Math.min(100, team.winner_probability * 100 * 5)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model details */}
      <div className="rounded-2xl border border-border-subtle bg-surface/60 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Model Details</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-background/50 p-3">
            <p className="text-xs text-faint">Type</p>
            <p className="mt-1 text-sm text-heading">{dashboard.model.type as string}</p>
          </div>
          {(dashboard.model.parameters && typeof dashboard.model.parameters === 'object' ?
            Object.entries(dashboard.model.parameters as Record<string, unknown>).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-background/50 p-3">
                <p className="text-xs text-faint">{key.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-sm font-medium text-heading">{String(value)}</p>
              </div>
            )) : null
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className="mt-1 text-lg font-semibold text-heading">{value}</p>
    </div>
  );
}

function WinnerBar({ team, probability, rank }: { team: string; probability: number; rank: number }) {
  const pct = Math.round(probability * 100);
  const barWidth = Math.min(100, pct * 2); // scale so top teams fill the bar

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-right text-xs text-faint">{rank}</span>
      <span className="w-28 truncate text-sm font-medium text-heading">{team}</span>
      <div className="flex-1">
        <div className="h-5 overflow-hidden rounded-lg bg-surface-raised">
          <div
            className="flex h-full items-center rounded-lg bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          >
            {pct > 3 && (
              <span className="pl-2 text-[11px] font-bold text-slate-950">{pct}%</span>
            )}
          </div>
        </div>
      </div>
      {pct <= 3 && (
        <span className="w-10 text-right text-xs text-muted">{pct}%</span>
      )}
    </div>
  );
}
