'use client';

import { useEffect, useState } from 'react';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { MLPredictionStats } from '@/components/fixtures/ml-prediction-stats';
import { supabase } from '@/lib/supabase-browser';
import type { TeamVisual } from '@/lib/team-visuals';
import type { TeamWorldCupStats } from '@/lib/football-data';

type PredictionPanelProps = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamVisual?: TeamVisual;
  awayTeamVisual?: TeamVisual;
  kickoffUtc: string;
  userId: string;
  group?: string;
  homeTeamStats?: TeamWorldCupStats | null;
  awayTeamStats?: TeamWorldCupStats | null;
  allTeamStats?: TeamWorldCupStats[];
  initialHomeScore?: number | null;
  initialAwayScore?: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function PredictionPanel({
  matchId,
  homeTeam,
  awayTeam,
  homeTeamVisual,
  awayTeamVisual,
  kickoffUtc,
  userId,
  group,
  homeTeamStats,
  awayTeamStats,
  allTeamStats,
  initialHomeScore,
  initialAwayScore,
  onClose,
  onSaved,
}: PredictionPanelProps) {
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [homeScore, setHomeScore] = useState(initialHomeScore ?? 0);
  const [awayScore, setAwayScore] = useState(initialAwayScore ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const result: 'home' | 'away' | 'draw' =
    homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

  const isLocked = new Date() >= new Date(kickoffUtc);
  const isSupabaseReady = Boolean(supabase && currentUserId);

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

    const { error } = await supabase.from('predictions').upsert(
      {
        user_id: currentUserId,
        match_external_id: matchId,
        predicted_result: result,
        pred_home_score: homeScore,
        pred_away_score: awayScore,
        is_locked: false,
      },
      { onConflict: 'user_id,match_external_id' },
    );

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

  function adjustScore(current: number, delta: number): number {
    return Math.max(0, current + delta);
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
              {isLocked ? 'Match locked' : 'Group stage'}
            </p>
          </div>

          {/* Scoreboard */}
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
                onChange={setHomeScore}
                disabled={isLocked || loading}
                onDecrease={() => setHomeScore((s) => adjustScore(s, -1))}
                onIncrease={() => setHomeScore((s) => adjustScore(s, 1))}
              />
              <span className="text-2xl font-light text-faint">:</span>
              <ScoreStepper
                value={awayScore}
                onChange={setAwayScore}
                disabled={isLocked || loading}
                onDecrease={() => setAwayScore((s) => adjustScore(s, -1))}
                onIncrease={() => setAwayScore((s) => adjustScore(s, 1))}
              />
            </div>

            {/* Away team */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <TeamBadge team={awayTeamVisual ?? { name: awayTeam }} size="md" />
              <span className="text-sm font-medium text-heading">{awayTeam}</span>
            </div>
          </div>

          {/* Result display (auto-derived from scores) */}
          <div className="mb-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Match result
            </p>
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4 text-center">
              <span className="text-lg font-semibold text-heading">
                {result === 'home' ? homeTeam : result === 'away' ? awayTeam : 'Draw'}
              </span>
              <p className="mt-1 text-xs text-muted">
                {result === 'draw' ? 'Evenly matched' : `${result === 'home' ? homeTeam : awayTeam} wins`}
              </p>
            </div>
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
            disabled={isLocked || loading || !isSupabaseReady || saved}
            className={`w-full rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              saved
                ? 'bg-emerald-500 text-slate-950'
                : isLocked || !isSupabaseReady
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
