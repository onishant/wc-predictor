'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Tooltip } from '@/components/ui/tooltip';
import type { TeamWorldCupStats } from '@/lib/football-data';

type Props = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  group: string;
  allTeamStats: TeamWorldCupStats[];
};

type AugmentedStanding = TeamWorldCupStats & {
  projectedPoints: number;
  projectedGD: number;
  projectedGF: number;
  qualStatus: 'top2' | 'third' | 'out';
  pointsDelta: number;
  gdDelta: number;
};

type GroupTeamStanding = {
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
  isHome: boolean;
  isAway: boolean;
};

const qualColor: Record<string, string> = {
  top2: 'text-emerald-300',
  third: 'text-amber-300',
  out: 'text-rose-300',
};

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
  { group: 'GROUP_J', label: 'Group J', teamAliases: ['Argentina', 'Algeria', 'Austria', 'Jordan'] },
  { group: 'GROUP_K', label: 'Group K', teamAliases: ['Portugal', ['DR Congo', 'Congo DR', 'Congo'], 'Uzbekistan', 'Colombia'] },
  { group: 'GROUP_L', label: 'Group L', teamAliases: ['England', 'Croatia', 'Ghana', 'Panama'] },
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function matchesAlias(teamName: string, aliases: string | string[]): boolean {
  const names = Array.isArray(aliases) ? aliases : [aliases];
  const target = normalize(teamName);
  return names.some((n) => normalize(n) === target);
}

function getGroupTeams(group: string, allTeamStats: TeamWorldCupStats[]): TeamWorldCupStats[] {
  const wcGroup = WC_2026_GROUPS.find((g) => g.group === group);
  if (!wcGroup) return [];

  const result: TeamWorldCupStats[] = [];
  for (const alias of wcGroup.teamAliases) {
    const team = allTeamStats.find((s) => matchesAlias(s.teamName, alias));
    if (team) result.push(team);
  }
  return result;
}

function sortStandings(rows: GroupTeamStanding[]): GroupTeamStanding[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName),
  );
}

export function QualificationImpact({ homeTeam, awayTeam, homeScore, awayScore, group, allTeamStats }: Props) {
  const [groupExpanded, setGroupExpanded] = useState(false);
  const [thirdsExpanded, setThirdsExpanded] = useState(false);

  const analysis = useMemo(() => {
    const homeStats = allTeamStats.find((s) => s.teamName === homeTeam);
    const awayStats = allTeamStats.find((s) => s.teamName === awayTeam);
    if (!homeStats || !awayStats) return null;

    const homeWin = homeScore > awayScore;
    const draw = homeScore === awayScore;
    const awayWin = awayScore > homeScore;

    const homePoints = homeWin ? 3 : draw ? 1 : 0;
    const awayPoints = awayWin ? 3 : draw ? 1 : 0;
    const homeGD = homeScore - awayScore;
    const awayGD = awayScore - homeScore;

    const homeProjected: AugmentedStanding = {
      ...homeStats,
      projectedPoints: homeStats.points + homePoints,
      projectedGD: homeStats.goalDifference + homeGD,
      projectedGF: homeStats.goalsFor + homeScore,
      pointsDelta: homePoints,
      gdDelta: homeGD,
      qualStatus: 'top2',
    };

    const awayProjected: AugmentedStanding = {
      ...awayStats,
      projectedPoints: awayStats.points + awayPoints,
      projectedGD: awayStats.goalDifference + awayGD,
      projectedGF: awayStats.goalsFor + awayScore,
      pointsDelta: awayPoints,
      gdDelta: awayGD,
      qualStatus: 'top2',
    };

    function getQualHint(points: number, gd: number): 'top2' | 'third' | 'out' {
      if (points >= 7) return 'top2';
      if (points === 6 && gd >= 0) return 'top2';
      if (points === 6) return 'third';
      if (points === 5 && gd > 0) return 'third';
      if (points === 5) return 'third';
      if (points === 4 && gd > 2) return 'third';
      if (points >= 4) return 'out';
      return 'out';
    }

    homeProjected.qualStatus = getQualHint(homeProjected.projectedPoints, homeProjected.projectedGD);
    awayProjected.qualStatus = getQualHint(awayProjected.projectedPoints, awayProjected.projectedGD);

    // Build group standings with prediction applied
    const groupTeams = getGroupTeams(group, allTeamStats);
    const groupStandings: GroupTeamStanding[] = groupTeams.map((t) => {
      const isHome = t.teamName === homeTeam;
      const isAway = t.teamName === awayTeam;
      const pts = isHome ? homeProjected.projectedPoints : isAway ? awayProjected.projectedPoints : t.points;
      const gd = isHome ? homeProjected.projectedGD : isAway ? awayProjected.projectedGD : t.goalDifference;
      const gf = isHome ? homeProjected.projectedGF : isAway ? awayProjected.projectedGF : t.goalsFor;
      const played = t.played + (isHome || isAway ? 1 : 0);
      const won = t.won + (isHome && homeWin ? 1 : isAway && awayWin ? 1 : 0);
      const drawn = t.drawn + (draw && (isHome || isAway) ? 1 : 0);
      const lost = t.lost + (isHome && awayWin ? 1 : isAway && homeWin ? 1 : 0);
      return {
        teamName: t.teamName,
        crestUrl: t.teamVisual.crestUrl ?? null,
        code: t.teamVisual.code ?? null,
        played,
        won,
        drawn,
        lost,
        goalsFor: gf,
        goalsAgainst: t.goalsAgainst + (isHome ? awayScore : isAway ? homeScore : 0),
        goalDifference: gd,
        points: pts,
        isHome,
        isAway,
      };
    });

    // Build best 3rd-place table across all groups
    const allGroups = WC_2026_GROUPS.map((g) => {
      const teams = getGroupTeams(g.group, allTeamStats);
      const standings = teams.map((t) => {
        const isHome = t.teamName === homeTeam && g.group === group;
        const isAway = t.teamName === awayTeam && g.group === group;
        const pts = isHome ? homeProjected.projectedPoints : isAway ? awayProjected.projectedPoints : t.points;
        const gd = isHome ? homeProjected.projectedGD : isAway ? awayProjected.projectedGD : t.goalDifference;
        const gf = isHome ? homeProjected.projectedGF : isAway ? awayProjected.projectedGF : t.goalsFor;
        return { ...t, points: pts, goalDifference: gd, goalsFor: gf };
      }).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

      return { group: g.group, label: g.label, third: standings[2] ?? null };
    });

    const thirds = allGroups
      .filter((g) => g.third !== null)
      .map((g) => ({
        ...g.third!,
        groupLabel: g.label,
      }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

    return { homeProjected, awayProjected, groupStandings: sortStandings(groupStandings), thirds };
  }, [homeTeam, awayTeam, homeScore, awayScore, group, allTeamStats]);

  if (!analysis) return null;

  const { homeProjected, awayProjected, groupStandings, thirds } = analysis;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Tooltip
          content={
            <span>
              <span className="mb-1 block font-semibold text-heading">Qualification Impact</span>
              Shows how your predicted score would affect each team&apos;s group standing and knockout qualification chances.
              Based on points and goal difference from finished matches.
            </span>
          }
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-cyan-500/30 text-[10px] font-bold text-cyan-300 cursor-help">?</span>
        </Tooltip>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
          Qualification impact
        </p>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
        {/* Projected outcome */}
        <p className="mb-2 text-xs text-muted">Projected group outcome</p>

        <div className="mb-3 flex items-center justify-center gap-6">
          <TeamProjection team={homeProjected} />
          <span className="text-lg text-faint">vs</span>
          <TeamProjection team={awayProjected} />
        </div>

        {/* Status bar */}
        <div className="mb-1.5 flex h-3 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: homeProjected.qualStatus === 'top2' ? '50%' : homeProjected.qualStatus === 'third' ? '25%' : '0%' }}
          />
          <div className="h-full" style={{ width: '50%' }} />
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: awayProjected.qualStatus === 'top2' ? '50%' : awayProjected.qualStatus === 'third' ? '25%' : '0%' }}
          />
        </div>

        <div className="flex justify-between text-[11px]">
          <span className={qualColor[homeProjected.qualStatus]}>{qualLabel(homeProjected)}</span>
          <span className={qualColor[awayProjected.qualStatus]}>{qualLabel(awayProjected)}</span>
        </div>
      </div>

      {/* Expandable: Group standings */}
      {groupStandings.length > 0 && (
        <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setGroupExpanded(!groupExpanded)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-cyan-500/10"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-400">
              {group.replace('_', ' ')} projected standings
            </span>
            <svg
              className={`h-3.5 w-3.5 text-cyan-400 transition-transform ${groupExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {groupExpanded && (
            <div className="border-t border-cyan-500/10 px-3 py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-faint">
                    <th className="pb-1.5 text-left font-medium">#</th>
                    <th className="pb-1.5 text-left font-medium">Team</th>
                    <th className="pb-1.5 text-right font-medium">P</th>
                    <th className="pb-1.5 text-right font-medium">W</th>
                    <th className="pb-1.5 text-right font-medium">D</th>
                    <th className="pb-1.5 text-right font-medium">L</th>
                    <th className="pb-1.5 text-right font-medium">GD</th>
                    <th className="pb-1.5 text-right font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStandings.map((team, idx) => {
                    const isMatch = team.isHome || team.isAway;
                    const qual = idx < 2 ? 'top2' : idx === 2 ? 'third' : 'out';
                    return (
                      <tr
                        key={team.teamName}
                        className={`border-t border-cyan-500/10 ${isMatch ? 'bg-cyan-500/10' : ''}`}
                      >
                        <td className="py-1.5 text-left text-faint">{idx + 1}</td>
                        <td className="py-1.5 text-left">
                          <div className="flex items-center gap-1.5">
                            {team.crestUrl ? (
                              <Image src={team.crestUrl} alt="" width={14} height={14} className="rounded-full" unoptimized />
                            ) : (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-raised text-[8px] font-bold text-faint">
                                {team.code ?? '??'}
                              </span>
                            )}
                            <span className={`font-medium ${isMatch ? 'text-cyan-300' : 'text-heading'}`}>{team.teamName}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{team.played}</td>
                        <td className="py-1.5 text-right tabular-nums">{team.won}</td>
                        <td className="py-1.5 text-right tabular-nums">{team.drawn}</td>
                        <td className="py-1.5 text-right tabular-nums">{team.lost}</td>
                        <td className={`py-1.5 text-right tabular-nums ${team.goalDifference > 0 ? 'text-emerald-300' : team.goalDifference < 0 ? 'text-rose-300' : ''}`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </td>
                        <td className={`py-1.5 text-right font-semibold tabular-nums ${qualColor[qual]}`}>{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expandable: Best 3rd-place table */}
      {thirds.length > 0 && (
        <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setThirdsExpanded(!thirdsExpanded)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-cyan-500/10"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-400">
              Best 3rd-place race (top 8 qualify)
            </span>
            <svg
              className={`h-3.5 w-3.5 text-cyan-400 transition-transform ${thirdsExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {thirdsExpanded && (
            <div className="border-t border-cyan-500/10 px-3 py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-faint">
                    <th className="pb-1.5 text-left font-medium">#</th>
                    <th className="pb-1.5 text-left font-medium">Team</th>
                    <th className="pb-1.5 text-center font-medium">Group</th>
                    <th className="pb-1.5 text-right font-medium">P</th>
                    <th className="pb-1.5 text-right font-medium">GD</th>
                    <th className="pb-1.5 text-right font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {thirds.map((team, idx) => {
                    const isQualifying = idx < 8;
                    const isMatchTeam = team.teamName === homeTeam || team.teamName === awayTeam;
                    return (
                      <tr
                        key={team.teamId}
                        className={`border-t border-cyan-500/10 ${
                          isMatchTeam ? 'bg-cyan-500/10' : ''
                        }`}
                      >
                        <td className="py-1.5 text-left">
                          <span className={isQualifying ? 'text-emerald-300' : 'text-rose-300'}>{idx + 1}</span>
                        </td>
                        <td className="py-1.5 text-left">
                          <div className="flex items-center gap-1.5">
                            {team.teamVisual.crestUrl ? (
                              <Image src={team.teamVisual.crestUrl} alt="" width={14} height={14} className="rounded-full" unoptimized />
                            ) : null}
                            <span className={`font-medium ${isMatchTeam ? 'text-cyan-300' : 'text-heading'}`}>{team.teamName}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-center text-faint">{team.groupLabel}</td>
                        <td className="py-1.5 text-right tabular-nums">{team.played}</td>
                        <td className={`py-1.5 text-right tabular-nums ${team.goalDifference > 0 ? 'text-emerald-300' : team.goalDifference < 0 ? 'text-rose-300' : ''}`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </td>
                        <td className={`py-1.5 text-right font-semibold tabular-nums ${isQualifying ? 'text-emerald-300' : 'text-rose-300'}`}>{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-center text-[10px] text-faint">
        Tap to expand · Based on your prediction + finished matches
      </p>
    </div>
  );
}

function qualLabel(team: AugmentedStanding): string {
  if (team.qualStatus === 'top2') return '✅ Likely qualifies';
  if (team.qualStatus === 'third') return '🟡 Best 3rd contender';
  return '❌ Likely eliminated';
}

function TeamProjection({ team }: { team: AugmentedStanding }) {
  return (
    <div className="text-center">
      {team.teamVisual.crestUrl ? (
        <Image src={team.teamVisual.crestUrl} alt="" width={32} height={32} className="mx-auto rounded-full mb-1" unoptimized />
      ) : (
        <span className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-faint">
          {team.teamVisual.code ?? '??'}
        </span>
      )}
      <span className="text-2xl font-bold text-heading">{team.projectedPoints}</span>
      <p className="text-[11px] text-muted">pts</p>
      <p className="text-[10px] text-muted">
        GD {team.projectedGD > 0 ? '+' : ''}{team.projectedGD}
        {team.gdDelta !== 0 && (
          <span className={team.gdDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {' '}({team.gdDelta > 0 ? '+' : ''}{team.gdDelta})
          </span>
        )}
      </p>
    </div>
  );
}
