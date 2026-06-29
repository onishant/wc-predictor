'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

type BracketMatch = {
  id: string;
  stage: string;
  status: string;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string; code: string; flag_url: string | null; crest_url: string | null } | null;
  away_team: { name: string; code: string; flag_url: string | null; crest_url: string | null } | null;
};

type TeamInfo = { name: string; code: string; flag_url: string | null; crest_url: string | null };

function normalizeRound(stage: string | null): string {
  if (!stage) return 'Knockout';
  const v = stage.toLowerCase();
  if (v.includes('32')) return 'R32';
  if (v.includes('16')) return 'R16';
  if (v.includes('quarter')) return 'QF';
  if (v.includes('semi')) return 'SF';
  if (v.includes('third')) return '3P';
  if (v.includes('final')) return 'F';
  return stage;
}

function isKnockout(stage: string | null): boolean {
  if (!stage) return false;
  const v = stage.toLowerCase();
  return ['round', 'last', 'quarter', 'semi', 'final', 'third'].some((k) => v.includes(k));
}

/** Clip a circle image (flag) at the given center + radius. */
function FlagImage({
  cx, cy, r, url, code,
}: {
  cx: number; cy: number; r: number; url: string | null; code: string;
}) {
  if (!url) {
    // Fallback: code text
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize="8" fontWeight="700" fill="var(--text-faint, #64748b)">
        {code}
      </text>
    );
  }
  const clipId = `clip-${cx.toFixed(1)}-${cy.toFixed(1)}-${r}`;
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <image
        href={url}
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
    </>
  );
}

export function CircularBracket() {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    async function load() {
      const { data: matchData } = await supabase!
        .from('matches')
        .select('id, external_match_id, stage, status, kickoff_utc, home_score, away_score, home_team_id, away_team_id, minute, injury_time')
        .order('kickoff_utc', { ascending: true });

      if (!mounted || !matchData) { setLoading(false); return; }

      const koMatches = matchData.filter((m) => isKnockout(m.stage));
      if (koMatches.length === 0) { setMatches([]); setLoading(false); return; }

      const teamIds = new Set<string>();
      for (const m of koMatches) {
        if (m.home_team_id) teamIds.add(m.home_team_id);
        if (m.away_team_id) teamIds.add(m.away_team_id);
      }

      const teamMap = new Map<string, TeamInfo>();
      if (teamIds.size > 0) {
        const { data: teams } = await supabase!
          .from('teams')
          .select('id, name, code, crest_url, flag_url')
          .in('id', [...teamIds]);
        for (const t of teams ?? []) {
          teamMap.set(t.id, { name: t.name, code: t.code, flag_url: t.flag_url, crest_url: t.crest_url });
        }
      }

      const parsed: BracketMatch[] = koMatches.map((m) => ({
        id: m.external_match_id ?? m.id,
        stage: normalizeRound(m.stage),
        status: m.status,
        kickoff_utc: m.kickoff_utc,
        home_score: m.home_score,
        away_score: m.away_score,
        home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
        away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
      }));

      if (mounted) { setMatches(parsed); setLoading(false); }
    }

    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <span className="ml-3 text-sm text-muted">Loading bracket...</span>
      </div>
    );
  }

  if (matches.length === 0) return null;

  const r32 = matches.filter((m) => m.stage === 'R32');
  const r16 = matches.filter((m) => m.stage === 'R16');
  const qf = matches.filter((m) => m.stage === 'QF');
  const sf = matches.filter((m) => m.stage === 'SF');
  const final_ = matches.filter((m) => m.stage === 'F');

  const W = 900, H = 900, CX = 450, CY = 450;
  const R_R32 = 410, R_R16 = 320, R_QF = 230, R_SF = 140;
  const N_R32 = 16;

  function pos(radius: number, index: number, total: number) {
    const angle = (2 * Math.PI * index / total) - Math.PI / 2;
    return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle), angle };
  }

  // Build positions
  const r32Pos = r32.map((_, i) => pos(R_R32, i, N_R32));
  const r16Pos = Array.from({ length: 8 }, (_, i) => pos(R_R16, i * 2 + 0.5, N_R32));
  const qfPos = Array.from({ length: 4 }, (_, i) => pos(R_QF, i * 4 + 1, N_R32));
  const sfPos = Array.from({ length: 2 }, (_, i) => pos(R_SF, i * 8 + 2, N_R32));

  return (
    <div className="relative w-full max-w-[800px] mx-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        {/* CSS variables for theming */}
        <style>{`
          .br-guide-ring { fill: none; stroke: var(--border-subtle, #1e293b); stroke-width: 0.5; opacity: 0.5; }
          .br-flag-ring { fill: none; stroke: var(--border-default, #334155); stroke-width: 1.5; }
          .br-flag-ring-winner { fill: none; stroke: var(--success, #34d399); stroke-width: 2; stroke-opacity: 0.8; }
          .br-flag-bg { fill: var(--bg-surface-raised, #1e293b); }
          .br-dot { cursor: pointer; transition: fill 0.15s; }
          .br-dot:hover { fill: var(--accent, #22d3ee); }
          .br-dot-finished { fill: var(--success, #10b981); }
          .br-dot-tbd { fill: var(--bg-surface-raised, #1e293b); stroke: var(--border-default, #334155); stroke-width: 1; }
          .br-dot-live { fill: var(--danger, #ef4444); animation: br-pulse 2s infinite; }
          @keyframes br-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
          .br-conn { stroke: var(--border-default, #334155); stroke-width: 0.8; fill: none; }
          .br-conn-active { stroke: var(--accent, #22d3ee); stroke-opacity: 0.25; stroke-width: 1; }
          .br-label { fill: var(--text-faint, #64748b); }
          .br-code { fill: var(--text-muted, #94a3b8); }
        `}</style>

        {/* Guide rings */}
        {[R_R32, R_R16, R_QF, R_SF].map((r) => (
          <circle key={r} cx={CX} cy={CY} r={r} className="br-guide-ring" />
        ))}

        {/* Trophy */}
        <text x={CX} y={CY - 10} textAnchor="middle" dominantBaseline="central" fontSize="36">🏆</text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--warning, #fbbf24)" letterSpacing="0.14em">FINAL</text>
        {final_[0] && (
          <text x={CX} y={CY + 36} textAnchor="middle" fontSize="8" className="br-label">
            {new Date(final_[0].kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        )}

        {/* Round labels */}
        <text x={CX} y={14} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">ROUND OF 32</text>
        <text x={CX} y={CY - R_R16 - 8} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">ROUND OF 16</text>
        <text x={CX} y={CY - R_QF - 8} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">QUARTER-FINALS</text>
        <text x={CX} y={CY - R_SF - 8} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">SEMI-FINALS</text>

        {/* R32 flags + connectors */}
        {r32.map((m, i) => {
          const p = r32Pos[i];
          if (!p) return null;
          const perp = p.angle + Math.PI / 2;
          const spread = 28;
          const hx = p.x + spread * Math.cos(perp);
          const hy = p.y + spread * Math.sin(perp);
          const ax = p.x - spread * Math.cos(perp);
          const ay = p.y - spread * Math.sin(perp);

          const homeWin = m.status === 'finished' && m.home_score != null && m.away_score != null && m.home_score > m.away_score;
          const awayWin = m.status === 'finished' && m.home_score != null && m.away_score != null && m.away_score > m.home_score;
          const score = m.home_score != null && m.away_score != null ? `${m.home_score}–${m.away_score}` : '–';

          const r16Idx = Math.floor(i / 2);
          const target = r16Pos[r16Idx];
          if (!target) return null;

          return (
            <g key={m.id}>
              {/* Home flag */}
              <circle cx={hx} cy={hy} r="16" className="br-flag-bg" />
              <FlagImage cx={hx} cy={hy} r={15} url={m.home_team?.flag_url ?? null} code={m.home_team?.code ?? '?'} />
              <circle cx={hx} cy={hy} r="16" className={homeWin ? 'br-flag-ring-winner' : 'br-flag-ring'} />
              <text x={hx} y={hy + 22} textAnchor="middle" fontSize="7" fontWeight="700" className="br-code">{m.home_team?.code ?? 'TBD'}</text>

              {/* Away flag */}
              <circle cx={ax} cy={ay} r="16" className="br-flag-bg" />
              <FlagImage cx={ax} cy={ay} r={15} url={m.away_team?.flag_url ?? null} code={m.away_team?.code ?? '?'} />
              <circle cx={ax} cy={ay} r="16" className={awayWin ? 'br-flag-ring-winner' : 'br-flag-ring'} />
              <text x={ax} y={ay + 22} textAnchor="middle" fontSize="7" fontWeight="700" className="br-code">{m.away_team?.code ?? 'TBD'}</text>

              {/* Match dot */}
              <circle cx={p.x} cy={p.y} r="5" className={`br-dot ${m.status === 'finished' ? 'br-dot-finished' : m.status === 'in_play' || m.status === 'paused' ? 'br-dot-live' : 'br-dot-tbd'}`}>
                <title>{m.home_team?.name ?? 'TBD'} vs {m.away_team?.name ?? 'TBD'} ({score})</title>
              </circle>

              {/* Connector to R16 */}
              <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className={m.status === 'finished' ? 'br-conn-active' : 'br-conn'} />
            </g>
          );
        })}

        {/* R16 dots + connectors to QF */}
        {r16.map((m, i) => {
          const p = r16Pos[i];
          if (!p) return null;
          const qfIdx = Math.floor(i / 2);
          const target = qfPos[qfIdx];
          if (!target) return null;
          return (
            <g key={m.id}>
              <circle cx={p.x} cy={p.y} r="4.5" className={`br-dot ${m.status === 'finished' ? 'br-dot-finished' : 'br-dot-tbd'}`}>
                <title>{m.home_team?.name ?? 'TBD'} vs {m.away_team?.name ?? 'TBD'}</title>
              </circle>
              <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className={m.status === 'finished' ? 'br-conn-active' : 'br-conn'} />
            </g>
          );
        })}

        {/* Empty R16 placeholders */}
        {Array.from({ length: Math.max(0, 8 - r16.length) }, (_, i) => {
          const idx = r16.length + i;
          const p = r16Pos[idx];
          if (!p) return null;
          const qfIdx = Math.floor(idx / 2);
          const target = qfPos[qfIdx];
          return (
            <g key={`r16-empty-${idx}`}>
              <circle cx={p.x} cy={p.y} r="4.5" className="br-dot br-dot-tbd" />
              {target && <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className="br-conn" />}
            </g>
          );
        })}

        {/* QF dots + connectors to SF */}
        {qf.map((m, i) => {
          const p = qfPos[i];
          if (!p) return null;
          const sfIdx = Math.floor(i / 2);
          const target = sfPos[sfIdx];
          if (!target) return null;
          return (
            <g key={m.id}>
              <circle cx={p.x} cy={p.y} r="4.5" className={`br-dot ${m.status === 'finished' ? 'br-dot-finished' : 'br-dot-tbd'}`}>
                <title>{m.home_team?.name ?? 'TBD'} vs {m.away_team?.name ?? 'TBD'}</title>
              </circle>
              <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className={m.status === 'finished' ? 'br-conn-active' : 'br-conn'} />
            </g>
          );
        })}
        {Array.from({ length: Math.max(0, 4 - qf.length) }, (_, i) => {
          const idx = qf.length + i;
          const p = qfPos[idx];
          if (!p) return null;
          const sfIdx = Math.floor(idx / 2);
          const target = sfPos[sfIdx];
          return (
            <g key={`qf-empty-${idx}`}>
              <circle cx={p.x} cy={p.y} r="4.5" className="br-dot br-dot-tbd" />
              {target && <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className="br-conn" />}
            </g>
          );
        })}

        {/* SF dots + connectors to Final */}
        {sf.map((m, i) => {
          const p = sfPos[i];
          if (!p) return null;
          return (
            <g key={m.id}>
              <circle cx={p.x} cy={p.y} r="4.5" className={`br-dot ${m.status === 'finished' ? 'br-dot-finished' : 'br-dot-tbd'}`}>
                <title>{m.home_team?.name ?? 'TBD'} vs {m.away_team?.name ?? 'TBD'}</title>
              </circle>
              <line x1={p.x} y1={p.y} x2={CX} y2={CY} className={m.status === 'finished' ? 'br-conn-active' : 'br-conn'} />
            </g>
          );
        })}
        {Array.from({ length: Math.max(0, 2 - sf.length) }, (_, i) => {
          const idx = sf.length + i;
          const p = sfPos[idx];
          if (!p) return null;
          return (
            <g key={`sf-empty-${idx}`}>
              <circle cx={p.x} cy={p.y} r="4.5" className="br-dot br-dot-tbd" />
              <line x1={p.x} y1={p.y} x2={CX} y2={CY} className="br-conn" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
