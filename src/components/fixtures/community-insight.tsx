'use client';

import { useEffect, useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';

type CommunityInsightData = {
  match_id: string;
  weighted_home: number;
  weighted_away: number;
  home_win_pct: number;
  draw_pct: number;
  away_win_pct: number;
  sample_size: number;
  agreement: 'strong' | 'moderate' | 'split';
  last_computed_at: string;
};

type Props = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
};

const agreementStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  strong: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Strong' },
  moderate: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400', label: 'Moderate' },
  split: { bg: 'bg-red-500/15', text: 'text-red-300', dot: 'bg-red-400', label: 'Split' },
};

const communityTooltip = (
  <span>
    <span className="mb-1 block font-semibold text-heading">Community Insight</span>
    Predictions from all players, weighted by their leaderboard points.
    Higher-ranked players&apos; predictions carry more influence.
    Recalculated every 6 hours.
  </span>
);

export function CommunityInsight({ matchId, homeTeam, awayTeam }: Props) {
  const [data, setData] = useState<CommunityInsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchInsight() {
      try {
        const res = await fetch(`/api/community-insights/${encodeURIComponent(matchId)}`);
        if (!res.ok) {
          if (mounted) setData(null);
          return;
        }
        const json = await res.json();
        if (mounted) setData(json);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInsight();
    return () => { mounted = false; };
  }, [matchId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          <span className="text-xs text-muted">Loading community insight...</span>
        </div>
      </div>
    );
  }

  if (!data || data.sample_size === 0) return null;

  const agreement = agreementStyles[data.agreement] ?? agreementStyles.moderate;
  const updatedAgo = getTimeAgo(data.last_computed_at);

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Tooltip content={communityTooltip}>
          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-purple-500/30 text-[10px] font-bold text-purple-300 cursor-help">
            ?
          </span>
        </Tooltip>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-400">
          Community Insight
        </p>
      </div>

      {/* Top players predict */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted">Top players predict</span>
        <span className="text-base font-bold tabular-nums text-heading">
          {Math.round(data.weighted_home)} — {Math.round(data.weighted_away)}
        </span>
      </div>

      {/* Win probability bar */}
      <div className="mb-1.5 flex h-3 overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full bg-cyan-400 transition-all"
          style={{ width: `${data.home_win_pct}%` }}
          title={`${homeTeam} ${data.home_win_pct}%`}
        />
        <div
          className="h-full bg-faint transition-all"
          style={{ width: `${data.draw_pct}%` }}
          title={`Draw ${data.draw_pct}%`}
        />
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${data.away_win_pct}%` }}
          title={`${awayTeam} ${data.away_win_pct}%`}
        />
      </div>
      <div className="mb-3 flex justify-between text-[11px] text-muted">
        <span>{homeTeam} {data.home_win_pct}%</span>
        <span>Draw {data.draw_pct}%</span>
        <span>{awayTeam} {data.away_win_pct}%</span>
      </div>

      {/* Agreement + Sample size row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Agreement</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${agreement.bg} ${agreement.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${agreement.dot}`} />
            {agreement.label}
          </span>
        </div>
        <span className="text-[11px] text-faint">{data.sample_size} players</span>
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-border-subtle/40 pt-2.5 text-[11px] text-faint">
        <span>⏱</span>
        <span>Updated {updatedAgo} · Skill-weighted</span>
      </div>
    </div>
  );
}

function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
