'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import type { TeamWorldCupStats } from '@/lib/football-data';

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

type Props = {
  matches: MatchRow[];
  teamMap: Record<string, TeamRow>;
  teamStats: TeamWorldCupStats[];
};

type Override = { homeScore: number; awayScore: number };

type StandingRow = {
  teamId: string;
  teamName: string;
  crestUrl: string | null;
  code: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type QualStatus = 'qualified' | 'runner-up' | 'best-third' | 'eliminated' | 'unknown';

// Official 2026 FIFA World Cup groups
const WC_2026_GROUPS: Array<{ group: string; label: string; teamAliases: Array<string | string[]> }> = [
  { group: 'GROUP_A', label: 'Group A', teamAliases: ['Mexico', 'South Africa', ['South Korea', 'Korea Republic'], ['Czechia', 'Czech Republic']] },
  { group: 'GROUP_B', label: 'Group B', teamAliases: ['Canada', ['Bosnia and Herzegovina', 'Bosnia Herzegovina', 'Bosnia'], 'Qatar', 'Switzerland'] },
  { group: 'GROUP_C', label: 'Group C', teamAliases: ['Brazil', 'Morocco', 'Haiti', 'Scotland'] },
  { group: 'GROUP_D', label: 'Group D', teamAliases: [['United States', 'USA'], 'Paraguay', 'Australia', ['Türkiye', 'Turkey']] },
  { group: 'GROUP_E', label: 'Group E', teamAliases: ['Germany', ['Curaçao', 'Curacao'], ["Côte d'Ivoire", 'Ivory Coast'], 'Ecuador'] },
  { group: 'GROUP_F', label: 'Group F', teamAliases: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
  { group: 'GROUP_G', label: 'Group G', teamAliases: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
  { group: 'GROUP_H', label: 'Group H', teamAliases: ['Spain', ['Cape Verde', 'Cape Verde Islands', 'Cabo Verde'], 'Saudi Arabia', 'Uruguay'] },
  { group: 'GROUP_I', label: 'Group I', teamAliases: ['France', 'Senegal', 'Iraq', 'Norway'] },
  { group: 'GROUP_J', label: 'Group J', teamAliases: ['Argentina', 'Algeria', ' Austria', 'Jordan'] },
  { group: 'GROUP_K', label: 'Group K', teamAliases: ['Portugal', ['DR Congo', 'Congo DR', 'Congo'], 'Uzbekistan', 'Colombia'] },
  { group: 'GROUP_L', label: 'Group L', teamAliases: ['England', 'Croatia', 'Ghana', 'Panama'] },
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function matchTeamName(teamName: string, aliases: string | string[]): boolean {
  const names = Array.isArray(aliases) ? aliases : [aliases];
  const target = normalize(teamName);
  return names.some((n) => normalize(n) === target);
}

function findTeamIdByAliases(aliases: string | string[], teamMap: Record<string, TeamRow>): string | null {
  const names = Array.isArray(aliases) ? aliases : [aliases];
  for (const [id, team] of Object.entries(teamMap)) {
    for (const name of names) {
      if (normalize(team.name) === normalize(name)) return id;
    }
  }
  return null;
}

function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName),
  );
}

function addResult(row: StandingRow, goalsFor: number, goalsAgainst: number): StandingRow {
  const won = goalsFor > goalsAgainst ? 1 : 0;
  const drawn = goalsFor === goalsAgainst ? 1 : 0;
  const lost = goalsFor < goalsAgainst ? 1 : 0;
  const pts = won * 3 + drawn;
  return {
    ...row,
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + lost,
    goalsFor: row.goalsFor + goalsFor,
    goalsAgainst: row.goalsAgainst + goalsAgainst,
    goalDifference: row.goalDifference + (goalsFor - goalsAgainst),
    points: row.points + pts,
  };
}

type ResultOption = 'home' | 'draw' | 'away';

export function ScenariosClient({ matches, teamMap, teamStats }: Props) {
  // overrides keyed by match id
  const [overrides, setOverrides] = useState<Record<string, Override>>({});

  const setOverride = useCallback((matchId: string, result: ResultOption) => {
    setOverrides((prev) => {
      const existing = prev[matchId];
      // Toggle off if same result clicked again
      if (existing) {
        const currentResult: ResultOption =
          existing.homeScore > existing.awayScore
            ? 'home'
            : existing.homeScore < existing.awayScore
            ? 'away'
            : 'draw';
        if (currentResult === result) {
          const next = { ...prev };
          delete next[matchId];
          return next;
        }
      }
      // Set new result with simple scores
      const scores: Record<ResultOption, Override> = {
        home: { homeScore: 1, awayScore: 0 },
        draw: { homeScore: 1, awayScore: 1 },
        away: { homeScore: 0, awayScore: 1 },
      };
      return { ...prev, [matchId]: scores[result] };
    });
  }, []);

  const clearAll = useCallback(() => setOverrides({}), []);

  // Build group data
  const groupData = useMemo(() => {
    return WC_2026_GROUPS.map((wcGroup) => {
      // Find team IDs for this group
      const teamIds: string[] = [];
      for (const alias of wcGroup.teamAliases) {
        const id = findTeamIdByAliases(alias, teamMap);
        if (id) teamIds.push(id);
      }

      // Get matches for this group
      const groupMatches = matches.filter((m) => {
        if (!m.home_team_id || !m.away_team_id) return false;
        if (m.stage && m.stage !== wcGroup.group) return false;
        // Must involve two teams from this group
        return teamIds.includes(m.home_team_id) && teamIds.includes(m.away_team_id);
      });

      // If stage isn't set on matches, try matching by team membership
      const stageMatches = groupMatches.length > 0
        ? groupMatches
        : matches.filter((m) => {
            if (!m.home_team_id || !m.away_team_id) return false;
            return teamIds.includes(m.home_team_id) && teamIds.includes(m.away_team_id);
          });

      // Calculate standings
      const standings = new Map<string, StandingRow>();
      for (const id of teamIds) {
        const team = teamMap[id];
        const stats = teamStats.find((s) => s.teamName === team?.name);
        standings.set(id, {
          teamId: id,
          teamName: team?.name ?? 'Unknown',
          crestUrl: team?.crest_url ?? null,
          code: team?.code ?? null,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        });
      }

      // Apply actual results first
      for (const m of stageMatches) {
        if (!m.home_team_id || !m.away_team_id) continue;
        if (m.status === 'finished' && m.home_score != null && m.away_score != null) {
          const home = standings.get(m.home_team_id);
          const away = standings.get(m.away_team_id);
          if (home && away) {
            standings.set(m.home_team_id, addResult(home, m.home_score, m.away_score));
            standings.set(m.away_team_id, addResult(away, m.away_score, m.home_score));
          }
        }
      }

      // Apply overrides for non-finished matches
      const overriddenMatches = stageMatches.map((m) => {
        const override = overrides[m.id];
        if (!override) return { ...m, isOverridden: false };

        const home = standings.get(m.home_team_id!);
        const away = standings.get(m.away_team_id!);
        if (home && away) {
          standings.set(m.home_team_id!, addResult(home, override.homeScore, override.awayScore));
          standings.set(m.away_team_id!, addResult(away, override.awayScore, override.homeScore));
        }

        return {
          ...m,
          isOverridden: true,
          overrideHomeScore: override.homeScore,
          overrideAwayScore: override.awayScore,
        };
      });

      // Separate remaining (not finished, no override) from completed
      const remaining = stageMatches.filter(
        (m) => m.status !== 'finished' && !overrides[m.id],
      );

      return {
        group: wcGroup.group,
        label: wcGroup.label,
        teamIds,
        matches: overriddenMatches,
        remaining,
        standings: sortStandings([...standings.values()]),
      };
    });
  }, [matches, teamMap, teamStats, overrides]);

  // Calculate 3rd-place rankings across all groups
  const thirdPlaceRankings = useMemo(() => {
    const thirds = groupData
      .map((g) => {
        const sorted = g.standings;
        return sorted[2] ?? null;
      })
      .filter((t): t is StandingRow => t !== null);

    // Sort 3rd-place teams by same criteria
    return [...thirds].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamName.localeCompare(b.teamName),
    );
  }, [groupData]);

  // Determine qualification status for each team
  const qualStatus = useMemo(() => {
    const statusMap = new Map<string, QualStatus>();
    const bestThirdIds = new Set(thirdPlaceRankings.slice(0, 8).map((t) => t.teamId));
    const worstThirdIds = new Set(thirdPlaceRankings.slice(8).map((t) => t.teamId));

    for (const g of groupData) {
      const sorted = g.standings;
      if (sorted.length < 4) continue;

      // 1st and 2nd qualify
      statusMap.set(sorted[0].teamId, 'qualified');
      statusMap.set(sorted[1].teamId, 'runner-up');

      // 3rd place: depends on best thirds
      const third = sorted[2];
      if (third) {
        if (third.played < 3) {
          statusMap.set(third.teamId, 'unknown');
        } else if (bestThirdIds.has(third.teamId)) {
          statusMap.set(third.teamId, 'best-third');
        } else {
          statusMap.set(third.teamId, 'eliminated');
        }
      }

      // 4th place: eliminated
      if (sorted[3]) {
        statusMap.set(sorted[3].teamId, 'eliminated');
      }
    }

    return statusMap;
  }, [groupData, thirdPlaceRankings]);

  // Count overrides
  const overrideCount = Object.keys(overrides).length;

  // Check if there are remaining matches at all
  const hasRemaining = groupData.some((g) => g.remaining.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">
            {overrideCount > 0 ? (
              <>
                <span className="font-semibold text-cyan-300">{overrideCount}</span> scenario{overrideCount !== 1 ? 's' : ''} active
              </>
            ) : (
              'Tap a remaining match to pick a result'
            )}
          </span>
          <span className="text-xs text-faint">·</span>
          <span className="text-xs text-faint">
            ✅ Qualified · 🔵 Runner-up · 🟡 Best 3rd · ❌ Eliminated
          </span>
        </div>
        {overrideCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            Clear all
          </button>
        )}
      </div>

      {!hasRemaining && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-300">Group stage complete</p>
          <p className="mt-1 text-sm text-muted">All group matches have been played. Check the knockout bracket for matchups.</p>
        </div>
      )}

      {/* Best 3rd-place table */}
      {hasRemaining && (
        <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading">Best 3rd-place teams (top 8 qualify)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-faint">
                  <th className="px-2 py-1.5 text-left">#</th>
                  <th className="px-2 py-1.5 text-left">Team</th>
                  <th className="px-2 py-1.5 text-center">Group</th>
                  <th className="px-2 py-1.5 text-center">P</th>
                  <th className="px-2 py-1.5 text-center">Pts</th>
                  <th className="px-2 py-1.5 text-center">GD</th>
                </tr>
              </thead>
              <tbody>
                {thirdPlaceRankings.map((team, idx) => {
                  const isQualified = idx < 8;
                  const group = groupData.find((g) => g.teamIds.includes(team.teamId));
                  return (
                    <tr
                      key={team.teamId}
                      className={`border-b border-border-subtle/50 ${
                        isQualified ? 'bg-emerald-500/5' : 'bg-rose-500/5'
                      }`}
                    >
                      <td className="px-2 py-1.5">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {team.crestUrl ? (
                            <Image src={team.crestUrl} alt="" width={16} height={16} className="rounded-full" unoptimized />
                          ) : (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-raised text-[8px] font-bold text-faint">
                              {team.code ?? '??'}
                            </span>
                          )}
                          <span className={isQualified ? 'font-medium text-heading' : 'text-muted'}>{team.teamName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center text-faint">{group?.label ?? '—'}</td>
                      <td className="px-2 py-1.5 text-center">{team.played}</td>
                      <td className="px-2 py-1.5 text-center font-semibold">{team.points}</td>
                      <td className="px-2 py-1.5 text-center">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Groups grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {groupData.map((g) => (
          <GroupCard
            key={g.group}
            group={g}
            qualStatus={qualStatus}
            setOverride={setOverride}
            overrides={overrides}
            teamMap={teamMap}
          />
        ))}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  qualStatus,
  setOverride,
  overrides,
  teamMap,
}: {
  group: {
    group: string;
    label: string;
    teamIds: string[];
    matches: Array<MatchRow & { isOverridden: boolean; overrideHomeScore?: number; overrideAwayScore?: number }>;
    remaining: MatchRow[];
    standings: StandingRow[];
  };
  qualStatus: Map<string, QualStatus>;
  setOverride: (matchId: string, result: ResultOption) => void;
  overrides: Record<string, Override>;
  teamMap: Record<string, TeamRow>;
}) {
  const statusEmoji: Record<QualStatus, string> = {
    qualified: '✅',
    'runner-up': '🔵',
    'best-third': '🟡',
    eliminated: '❌',
    unknown: '⚪',
  };

  const statusLabel: Record<QualStatus, string> = {
    qualified: 'Qualified (1st)',
    'runner-up': 'Qualified (2nd)',
    'best-third': 'Best 3rd (qualifies)',
    eliminated: 'Eliminated',
    unknown: 'TBD',
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface/70 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-subtle bg-surface-overlay px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{group.label}</h2>
      </div>

      {/* Standings */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs text-faint">
              <th className="w-8 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="w-10 px-2 py-2 text-center">P</th>
              <th className="w-10 px-2 py-2 text-center">W</th>
              <th className="w-10 px-2 py-2 text-center">D</th>
              <th className="w-10 px-2 py-2 text-center">L</th>
              <th className="w-10 px-2 py-2 text-center">GD</th>
              <th className="w-10 px-2 py-2 text-center font-semibold">Pts</th>
              <th className="w-8 px-2 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((team, idx) => {
              const status = qualStatus.get(team.teamId) ?? 'unknown';
              return (
                <tr key={team.teamId} className="border-b border-border-subtle/50">
                  <td className="px-3 py-2 text-center text-xs text-faint">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {team.crestUrl ? (
                        <Image src={team.crestUrl} alt="" width={20} height={20} className="rounded-full" unoptimized />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-raised text-[9px] font-bold text-faint">
                          {team.code ?? '??'}
                        </span>
                      )}
                      <span className="font-medium text-heading">{team.teamName}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">{team.played}</td>
                  <td className="px-2 py-2 text-center">{team.won}</td>
                  <td className="px-2 py-2 text-center">{team.drawn}</td>
                  <td className="px-2 py-2 text-center">{team.lost}</td>
                  <td className="px-2 py-2 text-center">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                  <td className="px-2 py-2 text-center font-semibold text-heading">{team.points}</td>
                  <td className="px-2 py-2 text-center" title={statusLabel[status]}>
                    {statusEmoji[status]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Remaining matches */}
      {group.remaining.length > 0 && (
        <div className="border-t border-border-subtle px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Remaining matches</p>
          <div className="space-y-2">
            {group.remaining.map((match) => {
              const home = teamMap[match.home_team_id!];
              const away = teamMap[match.away_team_id!];
              const override = overrides[match.id];
              const currentResult: ResultOption | null = override
                ? override.homeScore > override.awayScore
                  ? 'home'
                  : override.homeScore < override.awayScore
                  ? 'away'
                  : 'draw'
                : null;

              return (
                <div key={match.id} className="flex items-center gap-2 rounded-lg border border-border-subtle/40 bg-background/40 px-3 py-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {home?.crest_url ? (
                      <Image src={home.crest_url} alt="" width={16} height={16} className="rounded-full shrink-0" unoptimized />
                    ) : null}
                    <span className="truncate text-xs font-medium text-heading">{home?.name ?? 'TBD'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOverride(match.id, 'home')}
                      className={`rounded px-2 py-1 text-[10px] font-bold transition ${
                        currentResult === 'home'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-surface-raised text-muted hover:bg-emerald-500/20 hover:text-emerald-300'
                      }`}
                    >
                      1
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverride(match.id, 'draw')}
                      className={`rounded px-2 py-1 text-[10px] font-bold transition ${
                        currentResult === 'draw'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-surface-raised text-muted hover:bg-cyan-500/20 hover:text-cyan-300'
                      }`}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverride(match.id, 'away')}
                      className={`rounded px-2 py-1 text-[10px] font-bold transition ${
                        currentResult === 'away'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-surface-raised text-muted hover:bg-emerald-500/20 hover:text-emerald-300'
                      }`}
                    >
                      2
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                    <span className="truncate text-xs font-medium text-heading">{away?.name ?? 'TBD'}</span>
                    {away?.crest_url ? (
                      <Image src={away.crest_url} alt="" width={16} height={16} className="rounded-full shrink-0" unoptimized />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
