'use client';

import { useMemo } from 'react';
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

const qualColor: Record<string, string> = {
  top2: 'text-emerald-300',
  third: 'text-amber-300',
  out: 'text-rose-300',
};

export function QualificationImpact({ homeTeam, awayTeam, homeScore, awayScore, group, allTeamStats }: Props) {
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

    return { homeProjected, awayProjected };
  }, [homeTeam, awayTeam, homeScore, awayScore, allTeamStats]);

  if (!analysis) return null;

  const { homeProjected, awayProjected } = analysis;

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

        <p className="mt-2 text-center text-[10px] text-faint">
          {group.replace('_', ' ')} · 7+ pts likely through · 4 or fewer likely out
        </p>
      </div>
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
