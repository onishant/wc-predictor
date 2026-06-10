'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppNav } from '@/components/app-nav';
import { MatchCard } from '@/components/fixtures/match-card';
import { PredictionPanel } from '@/components/fixtures/prediction-panel';
import { supabase } from '@/lib/supabase-browser';
import type { TeamVisual } from '@/lib/team-visuals';

type Match = {
  id: string;
  external_match_id: string;
  home_team: string;
  away_team: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_utc: string;
  stage: string | null;
  group_name: string | null;
  status: string;
  home_crest: string | null;
  away_crest: string | null;
};

type Prediction = {
  predicted_result: 'home' | 'away' | 'draw';
  pred_home_score: number;
  pred_away_score: number;
};

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [predictionMatchId, setPredictionMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!supabase) return;

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setUserId(uid);

    // Get upcoming matches (next 5)
    const now = new Date().toISOString();
    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        id,
        external_match_id,
        home_team:teams!matches_home_team_id_fkey(name, crest_url),
        away_team:teams!matches_away_team_id_fkey(name, crest_url),
        home_team_id,
        away_team_id,
        kickoff_utc,
        stage,
        group_name,
        status
      `)
      .gte('kickoff_utc', now)
      .order('kickoff_utc', { ascending: true })
      .limit(5);

    if (matchData) {
      const parsed = (matchData as unknown as Array<{
        id: string;
        external_match_id: string;
        home_team: { name: string; crest_url: string | null } | { name: string; crest_url: string | null }[];
        away_team: { name: string; crest_url: string | null } | { name: string; crest_url: string | null }[];
        home_team_id: string;
        away_team_id: string;
        kickoff_utc: string;
        stage: string | null;
        group_name: string | null;
        status: string;
      }>).map(m => {
        const ht = Array.isArray(m.home_team) ? m.home_team[0] : m.home_team;
        const at = Array.isArray(m.away_team) ? m.away_team[0] : m.away_team;
        return {
          id: m.id,
          external_match_id: m.external_match_id,
          home_team: ht?.name ?? 'TBD',
          away_team: at?.name ?? 'TBD',
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          kickoff_utc: m.kickoff_utc,
          stage: m.stage,
          group_name: m.group_name,
          status: m.status,
          home_crest: ht?.crest_url ?? null,
          away_crest: at?.crest_url ?? null,
        };
      });
      setMatches(parsed);
    }

    // Get user predictions
    if (uid) {
      const { data: predData } = await supabase
        .from('predictions')
        .select('match_external_id, predicted_result, pred_home_score, pred_away_score')
        .eq('user_id', uid);

      if (predData) {
        const map: Record<string, Prediction> = {};
        for (const row of predData) {
          map[row.match_external_id] = {
            predicted_result: row.predicted_result,
            pred_home_score: row.pred_home_score,
            pred_away_score: row.pred_away_score,
          };
        }
        setPredictions(map);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    (async () => { await loadData(); })();
  }, [loadData]);

  const predictionMatch = predictionMatchId
    ? matches.find(m => m.id === predictionMatchId) ?? null
    : null;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppNav />

        {/* Hero */}
        <header className="relative mt-6 overflow-hidden rounded-3xl border border-border-subtle shadow-2xl shadow-accent/10">
          {/* Hero image background */}
          <div className="absolute inset-0">
            <Image
              src="/images/wc-heroes.png"
              alt=""
              fill
              className="object-cover opacity-20"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-overlay via-surface-overlay/90 to-surface-overlay/70" />
          </div>
          <div className="relative p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">FIFA World Cup 2026</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Predict. Score. Climb.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-body">
              Make your predictions for upcoming matches. Get points for correct results. Climb the leaderboard.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/fixtures" className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
                All fixtures
              </Link>
              <Link href="/leaderboard" className="rounded-full border border-border-default px-5 py-2 text-sm font-medium text-body hover:bg-surface-raised">
                Leaderboard
              </Link>
            </div>
          </div>
        </header>

        {/* Upcoming matches */}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Upcoming matches</h2>
              <p className="mt-1 text-sm text-muted">Tap to predict</p>
            </div>
            <Link href="/fixtures" className="text-sm text-cyan-400 hover:text-cyan-300">
              View all →
            </Link>
          </div>

          {loading && <p className="text-sm text-muted">Loading…</p>}

          {!loading && matches.length === 0 && (
            <div className="rounded-2xl border border-border-subtle bg-surface/40 p-8 text-center">
              <p className="text-sm text-muted">No upcoming matches scheduled.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {matches.map((match) => {
              const pred = predictions[match.external_match_id];
              return (
                <MatchCard
                  key={match.id}
                  matchId={match.external_match_id}
                  homeTeam={match.home_team}
                  awayTeam={match.away_team}
                  homeTeamVisual={{ name: match.home_team, crestUrl: match.home_crest } as TeamVisual}
                  awayTeamVisual={{ name: match.away_team, crestUrl: match.away_crest } as TeamVisual}
                  kickoffUtc={match.kickoff_utc}
                  stage={match.stage ?? undefined}
                  group={match.group_name ?? undefined}
                  status={match.status}
                  predictedResult={pred?.predicted_result ?? null}
                  predictedHomeScore={pred?.pred_home_score ?? null}
                  predictedAwayScore={pred?.pred_away_score ?? null}
                  onClick={() => setPredictionMatchId(match.id)}
                />
              );
            })}
          </div>
        </section>

        {/* News placeholder */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Latest news</h2>
          <div className="rounded-2xl border border-border-subtle bg-surface/40 p-8 text-center">
            <p className="text-sm text-muted">News feed coming soon.</p>
          </div>
        </section>
      </div>

      {/* Prediction panel */}
      {predictionMatch && (
        <PredictionPanel
          matchId={predictionMatch.external_match_id}
          homeTeam={predictionMatch.home_team}
          awayTeam={predictionMatch.away_team}
          homeTeamVisual={{ name: predictionMatch.home_team, crestUrl: predictionMatch.home_crest } as TeamVisual}
          awayTeamVisual={{ name: predictionMatch.away_team, crestUrl: predictionMatch.away_crest } as TeamVisual}
          kickoffUtc={predictionMatch.kickoff_utc}
          userId={userId ?? ''}
          group={predictionMatch.group_name ?? undefined}
          initialHomeScore={predictions[predictionMatch.external_match_id]?.pred_home_score ?? null}
          initialAwayScore={predictions[predictionMatch.external_match_id]?.pred_away_score ?? null}
          onClose={() => setPredictionMatchId(null)}
          onSaved={loadData}
        />
      )}
    </main>
  );
}
