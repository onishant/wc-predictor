'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

type Props = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  userId: string;
};

export function PredictionForm({ matchId, homeTeam, awayTeam, kickoffUtc, userId }: Props) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [result, setResult] = useState<'home' | 'away' | 'draw'>('draw');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLocked = useMemo(() => new Date() >= new Date(kickoffUtc), [kickoffUtc]);

  async function submitPrediction() {
    if (isLocked) {
      setMessage('Prediction locked: kickoff passed.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from('predictions').upsert({
      user_id: userId,
      match_id: matchId,
      predicted_result: result,
      pred_home_score: homeScore,
      pred_away_score: awayScore,
      is_locked: false,
    }, { onConflict: 'user_id,match_id' });

    setLoading(false);
    setMessage(error ? error.message : 'Prediction saved.');
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-800 p-3">
      <p className="mb-2 text-sm text-slate-400">{homeTeam} vs {awayTeam}</p>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="rounded border border-slate-700 bg-slate-950 px-2 py-1" />
        <select value={result} onChange={(e) => setResult(e.target.value as 'home' | 'away' | 'draw')} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
          <option value="home">{homeTeam} win</option>
          <option value="draw">Draw</option>
          <option value="away">{awayTeam} win</option>
        </select>
        <input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="rounded border border-slate-700 bg-slate-950 px-2 py-1" />
      </div>
      <button onClick={submitPrediction} disabled={loading || isLocked} className="mt-3 rounded bg-cyan-500 px-3 py-1 text-sm font-semibold text-slate-950 disabled:opacity-60">
        {isLocked ? 'Locked' : loading ? 'Saving...' : 'Save prediction'}
      </button>
      {message && <p className="mt-2 text-xs text-slate-300">{message}</p>}
    </div>
  );
}
