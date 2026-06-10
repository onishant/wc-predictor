'use client';

import { useEffect, useMemo, useState } from 'react';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { supabase } from '@/lib/supabase-browser';
import type { TeamVisual } from '@/lib/team-visuals';

type Props = {
  matchExternalId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamVisual?: TeamVisual;
  awayTeamVisual?: TeamVisual;
  kickoffUtc: string;
  userId: string;
};

export function PredictionForm({
  matchExternalId,
  homeTeam,
  awayTeam,
  homeTeamVisual,
  awayTeamVisual,
  kickoffUtc,
  userId,
}: Props) {
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [result, setResult] = useState<'home' | 'away' | 'draw'>('draw');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLocked = useMemo(() => new Date() >= new Date(kickoffUtc), [kickoffUtc]);
  const isSupabaseReady = Boolean(supabase && currentUserId);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    if (!userId) {
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) {
          setCurrentUserId(data.user?.id ?? '');
        }
      });
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user.id ?? '');
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [userId]);

  async function submitPrediction() {
    if (!supabase) {
      setMessage('Prediction storage is unavailable until Supabase auth is configured.');
      return;
    }

    if (!currentUserId) {
      setMessage('Login required to submit predictions.');
      return;
    }

    if (isLocked) {
      setMessage('Prediction locked: kickoff passed.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from('predictions').upsert({
      user_id: currentUserId,
      match_external_id: matchExternalId,
      predicted_result: result,
      pred_home_score: homeScore,
      pred_away_score: awayScore,
      is_locked: false,
    }, { onConflict: 'user_id,match_external_id' });

    setLoading(false);
    if (error) {
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        setMessage('Prediction locked: this match has already started.');
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage('Prediction saved.');
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border-subtle p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        <TeamBadge team={homeTeamVisual ?? { name: homeTeam }} size="sm" />
        <span className="text-xs uppercase tracking-[0.16em] text-faint">vs</span>
        <TeamBadge team={awayTeamVisual ?? { name: awayTeam }} size="sm" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="rounded border border-border-default bg-background px-2 py-1" />
        <select value={result} onChange={(e) => setResult(e.target.value as 'home' | 'away' | 'draw')} className="rounded border border-border-default bg-background px-2 py-1">
          <option value="home">{homeTeam} win</option>
          <option value="draw">Draw</option>
          <option value="away">{awayTeam} win</option>
        </select>
        <input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="rounded border border-border-default bg-background px-2 py-1" />
      </div>
      <button onClick={submitPrediction} disabled={loading || isLocked || !isSupabaseReady} className="mt-3 rounded bg-cyan-500 px-3 py-1 text-sm font-semibold text-slate-950 disabled:opacity-60">
        {!supabase ? 'Unavailable' : !currentUserId ? 'Login required' : isLocked ? 'Locked' : loading ? 'Saving...' : 'Save prediction'}
      </button>
      {message && <p className="mt-2 text-xs text-body">{message}</p>}
    </div>
  );
}
