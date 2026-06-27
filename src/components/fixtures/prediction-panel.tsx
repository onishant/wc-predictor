'use client';

import { useEffect, useState } from 'react';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { MLPredictionStats } from '@/components/fixtures/ml-prediction-stats';
import { CommunityInsight } from '@/components/fixtures/community-insight';
import { QualificationImpact } from '@/components/fixtures/qualification-impact';
import { supabase } from '@/lib/supabase-browser';
import type { TeamVisual } from '@/lib/team-visuals';
import type { TeamWorldCupStats } from '@/lib/football-data';

type Decider = 'full_time' | 'extra_time' | 'penalties';

type PredictionPanelProps = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamVisual?: TeamVisual;
  awayTeamVisual?: TeamVisual;
  kickoffUtc: string;
  userId: string;
  group?: string;
  stage?: string;
  homeTeamStats?: TeamWorldCupStats | null;
  awayTeamStats?: TeamWorldCupStats | null;
  allTeamStats?: TeamWorldCupStats[];
  initialHomeScore?: number | null;
  initialAwayScore?: number | null;
  initialPredictedDecider?: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

const DECIDER_OPTIONS: { value: Decider; label: string; icon: string }[] = [
  { value: 'full_time', label: 'Full Time', icon: '⚽' },
  { value: 'extra_time', label: 'Extra Time', icon: '⏱️' },
  { value: 'penalties', label: 'Penalties', icon: '🎯' },
];

export function PredictionPanel({
  matchId,
  homeTeam,
  awayTeam,
  homeTeamVisual,
  awayTeamVisual,
  kickoffUtc,
  userId,
  group,
  stage,
  homeTeamStats,
  awayTeamStats,
  allTeamStats,
  initialHomeScore,
  initialAwayScore,
  initialPredictedDecider,
  onClose,
  onSaved,
}: PredictionPanelProps) {
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [homeScore, setHomeScore] = useState(initialHomeScore ?? 0);
  const [awayScore, setAwayScore] = useState(initialAwayScore ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Knockout-specific state
  const isKnockout = Boolean(stage && !/GROUP/i.test(stage));
  const [decider, setDecider] = useState<Decider | null>(
    (initialPredictedDecider as Decider) ?? null
  );
  const [winner, setWinner] = useState<'home' | 'away' | null>(null);

  // Derive result: for knockouts use winner, for group stage use scores
  const result: 'home' | 'away' | 'draw' = isKnockout
    ? winner ?? 'home'
    : homeScore > awayScore
      ? 'home'
      : awayScore > homeScore
        ? 'away'
        : 'draw';

  const isLocked = new Date() >= new Date(kickoffUtc);
  const isSupabaseReady = Boolean(supabase && currentUserId);

  // Score constraints for knockout matches
  const isDrawScore = homeScore === awayScore;
  const isWinScore = homeScore !== awayScore;

  // For penalties: only draw scores allowed
  // For full_time/extra_time: only win scores allowed (no draws)
  const scoreValid = isKnockout
    ? decider === 'penalties'
      ? isDrawScore
      : isWinScore
    : true;

  // Can save?
  const canSave = isKnockout
    ? decider !== null && winner !== null && scoreValid
    : true;

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    if (!userId) {
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) setCurrentUserId(data.user?.id ?? '');
      });
    }
    const { data: subscription } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user.id ?? '');
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [userId]);

  // Lock body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Adjust scores when decider changes
  function handleDeciderChange(newDecider: Decider) {
    setDecider(newDecider);
    if (!isKnockout) return;
    if (newDecider === 'penalties') {
      // Force draw score
      if (homeScore !== awayScore) {
        setHomeScore(0);
        setAwayScore(0);
      }
    } else {
      // Force win score — if currently a draw, bump home
      if (homeScore === awayScore) {
        setHomeScore(homeScore + 1);
      }
    }
  }

  async function handleSave() {
    if (!supabase || !currentUserId) {
      setMessage('Login required to save predictions.');
      return;
    }
    if (isLocked) {
      setMessage('Prediction locked: kickoff passed.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const payload: Record<string, unknown> = {
      user_id: currentUserId,
      match_external_id: matchId,
      predicted_result: result,
      pred_home_score: homeScore,
      pred_away_score: awayScore,
      is_locked: false,
    };

    // Only include predicted_decider if set (avoids errors if column doesn't exist yet)
    if (isKnockout && decider) {
      payload.predicted_decider = decider;
    }

    const { error } = await supabase.from('predictions').upsert(payload, {
      onConflict: 'user_id,match_external_id',
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setSaved(true);
      setMessage('Saved!');
      onSaved?.();
      setTimeout(() => onClose(), 800);
    }
  }

  // Sync winner with score changes
  function syncWinnerFromScore(newHome: number, newAway: number) {
    if (!isKnockout) return;
    if (newHome > newAway) setWinner('home');
    else if (newAway > newHome) setWinner('away');
    // if draw and penalties, that's fine; if draw and not penalties, adjustScore handles it
  }

  // Adjust scores and keep winner in sync
  function adjustScore(current: number, delta: number, isHome: boolean): number {
    const next = Math.max(0, current + delta);
    if (!isKnockout || !decider) return next;

    if (decider === 'penalties') {
      // Keep draw: adjust both scores together
      setHomeScore(next);
      setAwayScore(next);
      return next;
    }

    // For FT/ET, update the score and sync winner
    if (isHome) {
      syncWinnerFromScore(next, awayScore);
    } else {
      syncWinnerFromScore(homeScore, next);
    }
    return next;
  }

  function handleScoreChange(isHome: boolean, value: number) {
    const v = Math.max(0, value);
    if (isHome) {
      setHomeScore(v);
      if (isKnockout && decider === 'penalties' && v !== awayScore) {
        setAwayScore(v);
      }
      syncWinnerFromScore(v, awayScore);
    } else {
      setAwayScore(v);
      if (isKnockout && decider === 'penalties' && v !== homeScore) {
        setHomeScore(v);
      }
      syncWinnerFromScore(homeScore, v);
    }
  }

  const kickoff = new Date(kickoffUtc);
  const kickoffDisplay = kickoff.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeDisplay = kickoff.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const stageLabel = isLocked
    ? 'Match locked'
    : isKnockout
      ? (stage ?? 'Knockout stage')
      : 'Group stage';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-subtle bg-background shadow-2xl shadow-slate-950/80">
        {/* Close button */}
        <div className="flex items-center justify-between border-b border-border-subtle/60 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Make prediction</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-muted transition hover:bg-surface-raised hover:text-heading"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {/* Match info */}
          <div className="mb-6 text-center">
            <p className="text-xs text-muted">
              {kickoffDisplay} · {timeDisplay}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-faint">
              {stageLabel}
            </p>
          </div>

          {/* ─── KNOCKOUT: Decider + Winner + Score flow ─── */}
          {isKnockout && !isLocked && (
            <>
              {/* Step 1: How will it be decided? */}
              <div className="mb-6">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  How will it be decided?
                </p>
                <div className="flex gap-2">
                  {DECIDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleDeciderChange(opt.value)}
                      className={`flex-1 rounded-xl border py-3 text-center text-sm font-medium transition-all ${
                        decider === opt.value
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                          : 'border-border-default text-muted hover:border-border-subtle hover:text-heading'
                      }`}
                    >
                      <span className="block text-lg">{opt.icon}</span>
                      <span className="block mt-0.5">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Who wins? (shown after decider selected) */}
              {decider && (
                <div className="mb-6">
                  <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Who wins?
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setWinner('home')}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-medium transition-all ${
                        winner === 'home'
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                          : 'border-border-default text-muted hover:border-border-subtle hover:text-heading'
                      }`}
                    >
                      <TeamBadge team={homeTeamVisual ?? { name: homeTeam }} size="sm" />
                      <span>{homeTeam}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWinner('away')}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-medium transition-all ${
                        winner === 'away'
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                          : 'border-border-default text-muted hover:border-border-subtle hover:text-heading'
                      }`}
                    >
                      <TeamBadge team={awayTeamVisual ?? { name: awayTeam }} size="sm" />
                      <span>{awayTeam}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scoring explainer hint */}
              {decider && (
                <div className="mb-6 rounded-xl border border-border-subtle/60 bg-surface/40 px-4 py-3 text-center text-[11px] text-muted">
                  {decider === 'penalties'
                    ? '🔒 Score must be a draw (e.g. 0-0, 1-1) — match goes to a shootout.'
                    : '🔒 Score must have a winner — no draws allowed.'}
                  <br />
                  <span className="text-faint">Correct decider = +5 bonus · </span>
                  <a href="/rules" target="_blank" className="text-cyan-400 hover:underline">Scoring rules →</a>
                </div>
              )}
            </>
          )}

          {/* ─── Scoreboard ─── */}
          {/* For knockouts: show after winner selected. For group: always show. */}
          {(!isKnockout || winner) && (
            <>
              <div className="mb-8 flex items-center justify-center gap-4">
                {/* Home team */}
                <div className="flex flex-1 flex-col items-center gap-2">
                  <TeamBadge team={homeTeamVisual ?? { name: homeTeam }} size="md" />
                  <span className="text-sm font-medium text-heading">{homeTeam}</span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2">
                  <ScoreStepper
                    value={homeScore}
                    onChange={(v) => handleScoreChange(true, v)}
                    disabled={isLocked || loading}
                    onDecrease={() => setHomeScore((s) => adjustScore(s, -1, true))}
                    onIncrease={() => setHomeScore((s) => adjustScore(s, 1, true))}
                  />
                  <span className="text-2xl font-light text-faint">:</span>
                  <ScoreStepper
                    value={awayScore}
                    onChange={(v) => handleScoreChange(false, v)}
                    disabled={isLocked || loading}
                    onDecrease={() => setAwayScore((s) => adjustScore(s, -1, false))}
                    onIncrease={() => setAwayScore((s) => adjustScore(s, 1, false))}
                  />
                </div>

                {/* Away team */}
                <div className="flex flex-1 flex-col items-center gap-2">
                  <TeamBadge team={awayTeamVisual ?? { name: awayTeam }} size="md" />
                  <span className="text-sm font-medium text-heading">{awayTeam}</span>
                </div>
              </div>

              {/* Result display */}
              <div className="mb-6">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Match result
                </p>
                <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4 text-center">
                  <span className="text-lg font-semibold text-heading">
                    {result === 'home' ? homeTeam : result === 'away' ? awayTeam : 'Draw'}
                  </span>
                  <p className="mt-1 text-xs text-muted">
                    {isKnockout && decider
                      ? decider === 'penalties'
                        ? `Via penalties · ${result === 'home' ? homeTeam : awayTeam} wins shootout`
                        : decider === 'extra_time'
                          ? `In extra time · ${result === 'home' ? homeTeam : awayTeam} wins`
                          : `At full time · ${result === 'home' ? homeTeam : awayTeam} wins`
                      : result === 'draw'
                        ? 'Evenly matched'
                        : `${result === 'home' ? homeTeam : awayTeam} wins`}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Qualification Impact — group stage only */}
          {group && /GROUP/i.test(group) && allTeamStats && allTeamStats.length > 0 && (
            <QualificationImpact
              matchId={matchId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeScore={homeScore}
              awayScore={awayScore}
              group={group}
              allTeamStats={allTeamStats}
            />
          )}

          {/* Community Insight */}
          <div className="mb-3">
            <CommunityInsight
              matchId={matchId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          </div>

          {/* ML predictions + current WC stats */}
          <MLPredictionStats
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            group={group}
            homeTeamStats={homeTeamStats}
            awayTeamStats={awayTeamStats}
            allTeamStats={allTeamStats}
          />

          {/* Message */}
          {message && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-center text-sm ${
                saved
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Supabase not ready */}
          {!isSupabaseReady && (
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-amber-300">
              {!supabase
                ? 'Supabase is not configured. Predictions are disabled.'
                : 'Login required to save predictions.'}
            </div>
          )}
        </div>

        {/* Sticky save button */}
        <div className="border-t border-border-subtle/60 px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLocked || loading || !isSupabaseReady || saved || (isKnockout && !canSave)}
            className={`w-full rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              saved
                ? 'bg-emerald-500 text-slate-950'
                : isLocked || !isSupabaseReady || (isKnockout && !canSave)
                  ? 'cursor-not-allowed bg-surface-raised text-faint'
                  : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 active:bg-cyan-500'
            }`}
          >
            {saved
              ? 'Saved ✓'
              : loading
                ? 'Saving...'
                : isLocked
                  ? 'Match locked'
                  : !isSupabaseReady
                    ? 'Login required'
                    : isKnockout && !canSave
                      ? 'Complete all steps above'
                      : 'Save prediction'}
          </button>
        </div>
      </div>
    </>
  );
}

function ScoreStepper({
  value,
  onChange,
  disabled,
  onDecrease,
  onIncrease,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className="flex h-7 w-10 items-center justify-center rounded-lg border border-border-default text-muted transition hover:bg-surface-raised hover:text-heading disabled:opacity-40"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        disabled={disabled}
        className="h-14 w-16 rounded-xl border border-border-default bg-surface text-center text-3xl font-bold tabular-nums text-heading outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        className="flex h-7 w-10 items-center justify-center rounded-lg border border-border-default text-muted transition hover:bg-surface-raised hover:text-heading disabled:opacity-40"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
