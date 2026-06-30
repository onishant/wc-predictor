'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

type TeamInfo = { id: string; name: string; code: string; flag_url: string | null; crest_url: string | null };

type BracketMatch = {
  id: string;
  stage: string;
  status: string;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  home_score_pen: number | null;
  away_score_pen: number | null;
  home_team: TeamInfo | null;
  away_team: TeamInfo | null;
};

type GroupMatch = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  stage: string;
};

function normalizeRound(stage: string | null): string {
  if (!stage) return 'Knockout';
  const v = stage.toLowerCase();
  if (v.includes('32')) return 'R32';
  if (v.includes('16')) return 'R16';
  if (v.includes('quarter')) return 'QF';
  if (v.includes('semi')) return 'SF';
  if (v.includes('third')) return '3P';
  if (v.includes('final') && !v.includes('semi') && !v.includes('quarter')) return 'F';
  return stage;
}

function isKnockout(stage: string | null): boolean {
  if (!stage) return false;
  const v = stage.toLowerCase();
  return ['round', 'last', 'quarter', 'semi', 'final', 'third'].some((k) => v.includes(k));
}

function isGroupStage(stage: string | null): boolean {
  if (!stage) return false;
  return stage.toLowerCase().includes('group');
}

/** Compute the set of eliminated team IDs from group stage + R32 results */
function computeEliminated(
  allMatches: { home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null; home_score_pen: number | null; away_score_pen: number | null; stage: string | null; status: string }[],
  groupTeams: Map<string, string[]>, // group name -> team IDs
): Set<string> {
  const eliminated = new Set<string>();

  // 1. Group stage eliminations: 4th place + worst 4 third-place teams
  const groupStandings = new Map<string, { teamId: string; pts: number; gd: number; gf: number }[]>();

  for (const [groupName, teamIds] of groupTeams) {
    const stats = new Map<string, { pts: number; gf: number; ga: number }>();
    for (const tid of teamIds) stats.set(tid, { pts: 0, gf: 0, ga: 0 });

    for (const m of allMatches) {
      if (!isGroupStage(m.stage) || m.status !== 'finished') continue;
      if (m.home_score == null || m.away_score == null) continue;
      const h = stats.get(m.home_team_id ?? '');
      const a = stats.get(m.away_team_id ?? '');
      if (!h || !a) continue;
      h.gf += m.home_score; h.ga += m.away_score;
      a.gf += m.away_score; a.ga += m.home_score;
      if (m.home_score > m.away_score) { h.pts += 3; }
      else if (m.away_score > m.home_score) { a.pts += 3; }
      else { h.pts += 1; a.pts += 1; }
    }

    const sorted = [...stats.entries()]
      .map(([teamId, s]) => ({ teamId, pts: s.pts, gd: s.gf - s.ga, gf: s.gf }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    groupStandings.set(groupName, sorted);

    // 4th place is eliminated
    if (sorted.length >= 4) eliminated.add(sorted[3].teamId);
  }

  // Collect all 3rd-place teams, rank them, eliminate worst 4
  const thirdPlaceTeams: { teamId: string; pts: number; gd: number; gf: number }[] = [];
  for (const sorted of groupStandings.values()) {
    if (sorted.length >= 3) thirdPlaceTeams.push(sorted[2]);
  }
  thirdPlaceTeams.sort((a, b) => a.pts - b.pts || a.gd - b.gd || a.gf - b.gf);
  for (let i = 0; i < Math.min(4, thirdPlaceTeams.length); i++) {
    eliminated.add(thirdPlaceTeams[i].teamId);
  }

  // 2. R32 losers are eliminated
  for (const m of allMatches) {
    if (!isKnockout(m.stage) || normalizeRound(m.stage) !== 'R32' || m.status !== 'finished') continue;
    if (m.home_score == null || m.away_score == null) continue;

    let loserId: string | null = null;
    if (m.home_score === m.away_score && m.home_score_pen != null && m.away_score_pen != null) {
      loserId = m.home_score_pen > m.away_score_pen ? m.away_team_id : m.home_team_id;
    } else if (m.home_score > m.away_score) {
      loserId = m.away_team_id;
    } else {
      loserId = m.home_team_id;
    }
    if (loserId) eliminated.add(loserId);
  }

  return eliminated;
}

type SlotInfo = {
  team: TeamInfo | null;
  sourceMatchId: string | null;
  sourceSide: 'home' | 'away' | null;
};

function resolveSlot(
  innerMatch: BracketMatch,
  side: 'home' | 'away',
  feederMatches: BracketMatch[],
  slotIndex: number,
): SlotInfo {
  const team = side === 'home' ? innerMatch.home_team : innerMatch.away_team;
  if (team) return { team, sourceMatchId: null, sourceSide: null };

  const feeder = feederMatches[slotIndex];
  if (!feeder || feeder.status !== 'finished') return { team: null, sourceMatchId: null, sourceSide: null };

  if (feeder.home_score != null && feeder.away_score != null) {
    const homeWin = feeder.home_score > feeder.away_score;
    const winner = homeWin ? feeder.home_team : feeder.away_team;
    return { team: winner, sourceMatchId: feeder.id, sourceSide: homeWin ? 'home' : 'away' };
  }

  return { team: null, sourceMatchId: null, sourceSide: null };
}

/** Flag image clipped to a circle */
function FlagImg({ cx, cy, r, url, code }: { cx: number; cy: number; r: number; url: string | null; code: string }) {
  if (!url) {
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize="7" fontWeight="700" fill="var(--text-faint, #64748b)">
        {code}
      </text>
    );
  }
  const id = `f-${cx.toFixed(0)}-${cy.toFixed(0)}-${r}`;
  return (
    <>
      <defs><clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      <image href={url} x={cx - r} y={cy - r} width={r * 2} height={r * 2}
        clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />
    </>
  );
}

/** Single team flag at a position */
function FlagDot({ cx, cy, r, team, winner, eliminated }: {
  cx: number; cy: number; r: number; team: TeamInfo | null; winner?: boolean; eliminated?: boolean;
}) {
  if (!team) {
    return (
      <>
        <circle cx={cx} cy={cy} r={r} className="br-tbd-bg" />
        <circle cx={cx} cy={cy} r={r} className="br-tbd-ring" />
      </>
    );
  }
  return (
    <g opacity={eliminated ? 0.35 : 1}>
      <circle cx={cx} cy={cy} r={r} className="br-flag-bg" />
      <FlagImg cx={cx} cy={cy} r={r - 1} url={team.flag_url} code={team.code ?? '?'} />
      <circle cx={cx} cy={cy} r={r} className={winner ? 'br-flag-ring-winner' : eliminated ? 'br-flag-ring-eliminated' : 'br-flag-ring'} />
      {eliminated && (
        <>
          <line x1={cx - r * 0.5} y1={cy - r * 0.5} x2={cx + r * 0.5} y2={cy + r * 0.5}
            stroke="var(--danger, #ef4444)" strokeWidth="2" strokeLinecap="round" />
          <line x1={cx + r * 0.5} y1={cy - r * 0.5} x2={cx - r * 0.5} y2={cy + r * 0.5}
            stroke="var(--danger, #ef4444)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

/** Two-team matchup at a position */
function MatchupDot({ cx, cy, home, away, homeWin, awayWin, homeElim, awayElim }: {
  cx: number; cy: number;
  home: TeamInfo | null; away: TeamInfo | null;
  homeWin?: boolean; awayWin?: boolean;
  homeElim?: boolean; awayElim?: boolean;
}) {
  const r = 10;
  const gap = 12;
  return (
    <>
      <FlagDot cx={cx - gap} cy={cy} r={r} team={home} winner={homeWin} eliminated={homeElim} />
      <FlagDot cx={cx + gap} cy={cy} r={r} team={away} winner={awayWin} eliminated={awayElim} />
    </>
  );
}

export function CircularBracket() {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    async function load() {
      // Fetch ALL matches (group + knockout) for elimination computation
      const { data: allMatchData } = await supabase!
        .from('matches')
        .select('id, external_match_id, stage, status, kickoff_utc, home_score, away_score, home_score_pen, away_score_pen, home_team_id, away_team_id')
        .order('kickoff_utc', { ascending: true });

      if (!mounted || !allMatchData) { setLoading(false); return; }

      // Build team map
      const allTeamIds = new Set<string>();
      for (const m of allMatchData) {
        if (m.home_team_id) allTeamIds.add(m.home_team_id);
        if (m.away_team_id) allTeamIds.add(m.away_team_id);
      }

      const teamMap = new Map<string, TeamInfo>();
      if (allTeamIds.size > 0) {
        const { data: teams } = await supabase!
          .from('teams')
          .select('id, name, code, crest_url, flag_url')
          .in('id', [...allTeamIds]);
        for (const t of teams ?? []) {
          teamMap.set(t.id, { id: t.id, name: t.name, code: t.code, flag_url: t.flag_url, crest_url: t.crest_url });
        }
      }

      // Build group teams map from group stage matches
      const groupTeams = new Map<string, Set<string>>();
      for (const m of allMatchData) {
        if (!isGroupStage(m.stage)) continue;
        const grp = m.stage ?? 'Unknown';
        if (!groupTeams.has(grp)) groupTeams.set(grp, new Set());
        if (m.home_team_id) groupTeams.get(grp)!.add(m.home_team_id);
        if (m.away_team_id) groupTeams.get(grp)!.add(m.away_team_id);
      }
      // Convert to string arrays
      const groupTeamsArr = new Map<string, string[]>();
      for (const [k, v] of groupTeams) groupTeamsArr.set(k, [...v]);

      // Compute eliminations
      const elim = computeEliminated(allMatchData, groupTeamsArr);
      if (mounted) setEliminated(elim);

      // Filter knockout matches for bracket display
      const koMatches = allMatchData.filter((m) => isKnockout(m.stage));

      const parsed: BracketMatch[] = koMatches.map((m) => ({
        id: m.external_match_id ?? m.id,
        stage: normalizeRound(m.stage),
        status: m.status,
        kickoff_utc: m.kickoff_utc,
        home_score: m.home_score,
        away_score: m.away_score,
        home_score_pen: m.home_score_pen,
        away_score_pen: m.away_score_pen,
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

  const r32Pos = r32.map((_, i) => pos(R_R32, i, N_R32));
  const r16Pos = Array.from({ length: 8 }, (_, i) => pos(R_R16, i * 2 + 0.5, N_R32));
  const qfPos = Array.from({ length: 4 }, (_, i) => pos(R_QF, i * 4 + 1, N_R32));
  const sfPos = Array.from({ length: 2 }, (_, i) => pos(R_SF, i * 8 + 2, N_R32));

  const r16Slots = Array.from({ length: 8 }, (_, i) => {
    const existing = r16[i];
    if (existing) {
      return {
        home: resolveSlot(existing, 'home', r32, i * 2),
        away: resolveSlot(existing, 'away', r32, i * 2 + 1),
        status: existing.status,
      };
    }
    const h = r32[i * 2];
    const a = r32[i * 2 + 1];
    const homeWin = h?.status === 'finished' && h.home_score != null && h.away_score != null && h.home_score > h.away_score;
    const awayWin = a?.status === 'finished' && a.home_score != null && a.away_score != null && a.home_score > a.away_score;
    return {
      home: { team: homeWin ? h!.home_team : h?.away_team ?? null, sourceMatchId: null, sourceSide: null },
      away: { team: awayWin ? a!.home_team : a?.away_team ?? null, sourceMatchId: null, sourceSide: null },
      status: 'pending',
    };
  });

  const qfSlots = Array.from({ length: 4 }, (_, j) => {
    const existing = qf[j];
    const feedA = r16Slots[j * 2];
    const feedB = r16Slots[j * 2 + 1];
    if (existing) {
      return {
        home: resolveSlot(existing, 'home', r16, j * 2),
        away: resolveSlot(existing, 'away', r16, j * 2 + 1),
        status: existing.status,
      };
    }
    return {
      home: feedA?.home?.team && feedA?.away?.team ? { team: null, sourceMatchId: null, sourceSide: null } : { team: feedA?.home?.team ?? feedA?.away?.team ?? null, sourceMatchId: null, sourceSide: null },
      away: feedB?.home?.team && feedB?.away?.team ? { team: null, sourceMatchId: null, sourceSide: null } : { team: feedB?.home?.team ?? feedB?.away?.team ?? null, sourceMatchId: null, sourceSide: null },
      status: 'pending',
    };
  });

  const sfSlots = Array.from({ length: 2 }, (_, k) => {
    const existing = sf[k];
    if (existing) {
      return {
        home: resolveSlot(existing, 'home', qf, k * 2),
        away: resolveSlot(existing, 'away', qf, k * 2 + 1),
        status: existing.status,
      };
    }
    const feedA = qfSlots[k * 2];
    const feedB = qfSlots[k * 2 + 1];
    return {
      home: { team: feedA?.home?.team ?? feedA?.away?.team ?? null, sourceMatchId: null, sourceSide: null },
      away: { team: feedB?.home?.team ?? feedB?.away?.team ?? null, sourceMatchId: null, sourceSide: null },
      status: 'pending',
    };
  });

  const finalSlot = (() => {
    const existing = final_[0];
    if (existing) {
      return {
        home: resolveSlot(existing, 'home', sf, 0),
        away: resolveSlot(existing, 'away', sf, 1),
        status: existing.status,
      };
    }
    return {
      home: sfSlots[0]?.home?.team ?? sfSlots[0]?.away?.team ?? null,
      away: sfSlots[1]?.home?.team ?? sfSlots[1]?.away?.team ?? null,
      status: 'pending',
    };
  })();

  function dotClass(s: string) {
    if (s === 'finished') return 'br-dot-finished';
    if (s === 'in_play' || s === 'paused') return 'br-dot-live';
    return 'br-dot-tbd';
  }
  function connClass(s: string) {
    return s === 'finished' ? 'br-conn-active' : 'br-conn';
  }

  return (
    <div className="relative w-full max-w-[800px] mx-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <style>{`
          .br-guide { fill: none; stroke: var(--border-subtle, #1e293b); stroke-width: 0.5; opacity: 0.5; }
          .br-flag-ring { fill: none; stroke: var(--border-default, #334155); stroke-width: 1.5; }
          .br-flag-ring-winner { fill: none; stroke: var(--success, #34d399); stroke-width: 2; stroke-opacity: 0.8; }
          .br-flag-ring-eliminated { fill: none; stroke: var(--danger, #ef4444); stroke-width: 1.5; stroke-opacity: 0.5; }
          .br-flag-bg { fill: var(--bg-surface-raised, #1e293b); }
          .br-tbd-bg { fill: var(--bg-surface-raised, #1e293b); opacity: 0.5; }
          .br-tbd-ring { fill: none; stroke: var(--border-subtle, #1e293b); stroke-width: 1; stroke-dasharray: 2 2; }
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

        {[R_R32, R_R16, R_QF, R_SF].map((r) => (
          <circle key={r} cx={CX} cy={CY} r={r} className="br-guide" />
        ))}

        <text x={CX} y={CY - 10} textAnchor="middle" dominantBaseline="central" fontSize="36">🏆</text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--warning, #fbbf24)" letterSpacing="0.14em">FINAL</text>
        {final_[0] && (
          <text x={CX} y={CY + 36} textAnchor="middle" fontSize="8" className="br-label">
            {new Date(final_[0].kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        )}

        <text x={CX} y={14} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">ROUND OF 32</text>
        <text x={CX} y={CY - R_R16 - 8} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">ROUND OF 16</text>
        <text x={CX} y={CY - R_QF - 8} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">QUARTER-FINALS</text>
        <text x={CX} y={CY - R_SF - 8} textAnchor="middle" fontSize="8" fontWeight="600" className="br-label" letterSpacing="0.14em">SEMI-FINALS</text>

        {/* ═══ R32: outer ring flags ═══ */}
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

          const homeElim = !!(m.home_team && eliminated.has(m.home_team.id));
          const awayElim = !!(m.away_team && eliminated.has(m.away_team.id));

          return (
            <g key={m.id}>
              <FlagDot cx={hx} cy={hy} r={16} team={m.home_team} winner={homeWin} eliminated={homeElim} />
              <text x={hx} y={hy + 22} textAnchor="middle" fontSize="7" fontWeight="700" className="br-code" opacity={homeElim ? 0.35 : 1}>{m.home_team?.code ?? 'TBD'}</text>
              <FlagDot cx={ax} cy={ay} r={16} team={m.away_team} winner={awayWin} eliminated={awayElim} />
              <text x={ax} y={ay + 22} textAnchor="middle" fontSize="7" fontWeight="700" className="br-code" opacity={awayElim ? 0.35 : 1}>{m.away_team?.code ?? 'TBD'}</text>
              <circle cx={p.x} cy={p.y} r="5" className={`br-dot ${dotClass(m.status)}`}>
                <title>{m.home_team?.name ?? 'TBD'} vs {m.away_team?.name ?? 'TBD'} ({score})</title>
              </circle>
              <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className={connClass(m.status)} />
            </g>
          );
        })}

        {/* ═══ R16 ═══ */}
        {r16Slots.map((slot, i) => {
          const p = r16Pos[i];
          if (!p) return null;
          const qfIdx = Math.floor(i / 2);
          const target = qfPos[qfIdx];
          if (!target) return null;

          const hasHome = !!slot.home?.team;
          const hasAway = !!slot.away?.team;
          const homeElim = !!(slot.home?.team && eliminated.has(slot.home.team.id));
          const awayElim = !!(slot.away?.team && eliminated.has(slot.away.team.id));

          return (
            <g key={`r16-${i}`}>
              {hasHome && hasAway ? (
                <MatchupDot cx={p.x} cy={p.y} home={slot.home!.team} away={slot.away!.team} homeElim={homeElim} awayElim={awayElim} />
              ) : hasHome ? (
                <FlagDot cx={p.x} cy={p.y} r={10} team={slot.home!.team} eliminated={homeElim} />
              ) : hasAway ? (
                <FlagDot cx={p.x} cy={p.y} r={10} team={slot.away!.team} eliminated={awayElim} />
              ) : (
                <circle cx={p.x} cy={p.y} r="4.5" className="br-dot br-dot-tbd" />
              )}
              <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className={
                slot.status === 'finished' ? 'br-conn-active' :
                (hasHome && hasAway) ? 'br-conn-active' : 'br-conn'
              } />
            </g>
          );
        })}

        {/* ═══ QF ═══ */}
        {qfSlots.map((slot, j) => {
          const p = qfPos[j];
          if (!p) return null;
          const sfIdx = Math.floor(j / 2);
          const target = sfPos[sfIdx];
          if (!target) return null;

          const hasHome = !!slot.home?.team;
          const hasAway = !!slot.away?.team;
          const homeElim = !!(slot.home?.team && eliminated.has(slot.home.team.id));
          const awayElim = !!(slot.away?.team && eliminated.has(slot.away.team.id));

          return (
            <g key={`qf-${j}`}>
              {hasHome && hasAway ? (
                <MatchupDot cx={p.x} cy={p.y} home={slot.home!.team} away={slot.away!.team} homeElim={homeElim} awayElim={awayElim} />
              ) : hasHome ? (
                <FlagDot cx={p.x} cy={p.y} r={10} team={slot.home!.team} eliminated={homeElim} />
              ) : hasAway ? (
                <FlagDot cx={p.x} cy={p.y} r={10} team={slot.away!.team} eliminated={awayElim} />
              ) : (
                <circle cx={p.x} cy={p.y} r="4.5" className="br-dot br-dot-tbd" />
              )}
              <line x1={p.x} y1={p.y} x2={target.x} y2={target.y} className={
                slot.status === 'finished' ? 'br-conn-active' :
                (hasHome && hasAway) ? 'br-conn-active' : 'br-conn'
              } />
            </g>
          );
        })}

        {/* ═══ SF ═══ */}
        {sfSlots.map((slot, k) => {
          const p = sfPos[k];
          if (!p) return null;

          const hasHome = !!slot.home?.team;
          const hasAway = !!slot.away?.team;
          const homeElim = !!(slot.home?.team && eliminated.has(slot.home.team.id));
          const awayElim = !!(slot.away?.team && eliminated.has(slot.away.team.id));

          return (
            <g key={`sf-${k}`}>
              {hasHome && hasAway ? (
                <MatchupDot cx={p.x} cy={p.y} home={slot.home!.team} away={slot.away!.team} homeElim={homeElim} awayElim={awayElim} />
              ) : hasHome ? (
                <FlagDot cx={p.x} cy={p.y} r={10} team={slot.home!.team} eliminated={homeElim} />
              ) : hasAway ? (
                <FlagDot cx={p.x} cy={p.y} r={10} team={slot.away!.team} eliminated={awayElim} />
              ) : (
                <circle cx={p.x} cy={p.y} r="4.5" className="br-dot br-dot-tbd" />
              )}
              <line x1={p.x} y1={p.y} x2={CX} y2={CY} className={
                slot.status === 'finished' ? 'br-conn-active' :
                (hasHome && hasAway) ? 'br-conn-active' : 'br-conn'
              } />
            </g>
          );
        })}

        {/* ═══ Final ═══ */}
        {(() => {
          const hasHome = !!(finalSlot.home && 'team' in finalSlot.home ? finalSlot.home.team : finalSlot.home);
          const hasAway = !!(finalSlot.away && 'team' in finalSlot.away ? finalSlot.away.team : finalSlot.away);
          const homeTeam = finalSlot.home && 'team' in finalSlot.home ? finalSlot.home.team : finalSlot.home as TeamInfo | null;
          const awayTeam = finalSlot.away && 'team' in finalSlot.away ? finalSlot.away.team : finalSlot.away as TeamInfo | null;

          if (!hasHome && !hasAway) return null;

          const fx = CX;
          const fy = CY + 58;
          return (
            <g>
              {hasHome && hasAway ? (
                <MatchupDot cx={fx} cy={fy} home={homeTeam} away={awayTeam} />
              ) : hasHome ? (
                <FlagDot cx={fx} cy={fy} r={10} team={homeTeam} />
              ) : (
                <FlagDot cx={fx} cy={fy} r={10} team={awayTeam} />
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
