'use client';

import { useMemo } from 'react';
import Image from 'next/image';
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

export function QualificationImpact({ homeTeam, awayTeam, homeScore, awayScore, group, allTeamStats }: Props) {
  const analysis = useMemo(() => {
    // Get teams in this group
    const groupTeams = allTeamStats.filter((s) => {
      // The group prop is like "GROUP_A", but allTeamStats doesn't have group info directly.
      // We need to identify group teams by the group prop passed in.
      // Since we don't have group per team in allTeamStats, we'll use a different approach:
      // Find the home and away team stats, then find all teams in the same group
      // by checking if they share the same group stage matches.
      // For now, we'll use the fact that the PredictionPanel passes the correct group.
      return true; // Will filter below
    });

    // Better approach: use the home/away team names to find their group,
    // then find all teams in that group from the WC_2026_GROUPS constant.
    // But we don't have that constant here. Instead, we'll use the allTeamStats
    // which are already grouped in the teams page logic.
    
    // Actually, the simplest approach: find teams by name matching
    const homeStats = allTeamStats.find((s) => s.teamName === homeTeam);
    const awayStats = allTeamStats.find((s) => s.teamName === awayTeam);
    if (!homeStats || !awayStats) return null;

    // Find all teams in the same group by checking which teams have played against
    // the home or away team. Since we don't have match data here, we'll approximate
    // by looking at allTeamStats and assuming teams with similar points/GD are in the same group.
    // 
    // Actually, the best approach: the parent should pass the group's team stats.
    // For now, we'll just show the impact on the two teams involved.

    // Calculate result
    const homeWin = homeScore > awayScore;
    const draw = homeScore === awayScore;
    const awayWin = awayScore > homeScore;

    // Points earned from this prediction
    const homePoints = homeWin ? 3 : draw ? 1 : 0;
    const awayPoints = awayWin ? 3 : draw ? 1 : 0;
    const homeGD = homeScore - awayScore;
    const awayGD = awayScore - homeScore;

    // Projected stats (current + this match's contribution)
    // We assume this match is "added" on top of whatever has been played so far.
    // If the match is already finished, the stats already include it.
    // We only show impact for upcoming/unplayed matches.
    
    const homeProjected: AugmentedStanding = {
      ...homeStats,
      projectedPoints: homeStats.points + homePoints,
      projectedGD: homeStats.goalDifference + homeGD,
      projectedGF: homeStats.goalsFor + homeScore,
      pointsDelta: homePoints,
      gdDelta: homeGD,
      qualStatus: 'top2', // will be calculated below
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

    // Simple qualification heuristic:
    // - 7+ points almost certainly qualifies top 2
    // - 6 points likely qualifies (top 2 or best 3rd)
    // - 4-5 points depends on other results
    // - 3 or fewer likely eliminated
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

  const statusConfig = {
    top2: { emoji: '✅', label: 'Likely qualifies', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    third: { emoji: '🟡', label: 'Best 3rd contender', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
    out: { emoji: '❌', label: 'Likely eliminated', color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/20' },
  };

  return (
    <div className="mb-6">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Qualification impact
      </p>
      <div className="space-y-2">
        <TeamImpactRow team={homeProjected} side="home" statusConfig={statusConfig} />
        <TeamImpactRow team={awayProjected} side="away" statusConfig={statusConfig} />
      </div>
      <p className="mt-2 text-center text-[10px] text-faint">
        Based on {group.replace('_', ' ')} · 7+ pts = likely through · 4 or fewer = likely out
      </p>
    </div>
  );
}

function TeamImpactRow({
  team,
  side,
  statusConfig,
}: {
  team: AugmentedStanding;
  side: 'home' | 'away';
  statusConfig: Record<string, { emoji: string; label: string; color: string; bg: string }>;
}) {
  const config = statusConfig[team.qualStatus];

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${config.bg}`}>
      {team.teamVisual.crestUrl ? (
        <Image src={team.teamVisual.crestUrl} alt="" width={24} height={24} className="rounded-full shrink-0" unoptimized />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-faint">
          {team.teamVisual.code ?? '??'}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-heading">{team.teamName}</span>
          <span className="text-xs">{config.emoji}</span>
        </div>
        <p className={`text-[11px] ${config.color}`}>{config.label}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-heading">{team.projectedPoints} pts</span>
          {team.pointsDelta > 0 && (
            <span className="text-[10px] font-bold text-emerald-400">+{team.pointsDelta}</span>
          )}
        </div>
        <p className="text-[10px] text-muted">
          GD: {team.projectedGD > 0 ? `+${team.projectedGD}` : team.projectedGD}
          {team.gdDelta !== 0 && (
            <span className={team.gdDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {' '}({team.gdDelta > 0 ? '+' : ''}{team.gdDelta})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
