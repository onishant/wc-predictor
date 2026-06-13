'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppNav } from '@/components/app-nav';
import { MatchCard } from '@/components/fixtures/match-card';
import { TeamBadge } from '@/components/fixtures/team-badge';
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
  status: string;
  home_crest: string | null;
  away_crest: string | null;
  home_score: number | null;
  away_score: number | null;
};

type Prediction = {
  predicted_result: 'home' | 'away' | 'draw';
  pred_home_score: number;
  pred_away_score: number;
};

type NewsArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  image_url: string | null;
  summary: string | null;
  published_at: string | null;
  matched_teams: string[];
};

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [predictionMatchId, setPredictionMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [featuredMatch, setFeaturedMatch] = useState<Match | null>(null);

  const loadData = useCallback(async () => {
    if (!supabase) return;

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setUserId(uid);

    // Get upcoming matches (next 48 hours)
    const now = new Date().toISOString();
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, external_match_id, home_team_id, away_team_id, kickoff_utc, stage, status, home_score, away_score')
      .gte('kickoff_utc', now)
      .lte('kickoff_utc', in48h)
      .order('kickoff_utc', { ascending: true });

    if (matchError) {
      console.error('[Home] matches error:', matchError);
    }

    // Fetch teams separately
    const teamIds = new Set<string>();
    for (const m of matchData ?? []) {
      if (m.home_team_id) teamIds.add(m.home_team_id);
      if (m.away_team_id) teamIds.add(m.away_team_id);
    }
    const teamMap = new Map<string, { name: string; crest_url: string | null }>();
    if (teamIds.size > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, crest_url')
        .in('id', [...teamIds]);
      for (const t of teams ?? []) {
        teamMap.set(t.id, { name: t.name, crest_url: t.crest_url });
      }
    }

    if (matchData) {
      const parsed = matchData.map(m => {
        const ht = m.home_team_id ? teamMap.get(m.home_team_id) : null;
        const at = m.away_team_id ? teamMap.get(m.away_team_id) : null;
        return {
          id: m.id,
          external_match_id: m.external_match_id,
          home_team: ht?.name ?? 'TBD',
          away_team: at?.name ?? 'TBD',
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          kickoff_utc: m.kickoff_utc,
          stage: m.stage,
          status: m.status,
          home_crest: ht?.crest_url ?? null,
          away_crest: at?.crest_url ?? null,
          home_score: (m as Record<string, unknown>).home_score as number | null ?? null,
          away_score: (m as Record<string, unknown>).away_score as number | null ?? null,
        };
      });
      setMatches(parsed);
    }

    // Fetch featured match: live/in-play first, else most recently finished
    const { data: liveMatch } = await supabase
      .from('matches')
      .select('id, external_match_id, home_team_id, away_team_id, kickoff_utc, stage, status, home_score, away_score')
      .in('status', ['in_play', 'paused'])
      .order('kickoff_utc', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawFeatured = liveMatch ?? (await (async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, external_match_id, home_team_id, away_team_id, kickoff_utc, stage, status, home_score, away_score')
        .eq('status', 'finished')
        .not('home_score', 'is', null)
        .order('kickoff_utc', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    })());

    if (rawFeatured) {
      // Ensure featured match teams are in teamMap
      const extraTeamIds = [rawFeatured.home_team_id, rawFeatured.away_team_id].filter(
        (id): id is string => !!id && !teamMap.has(id),
      );
      if (extraTeamIds.length > 0) {
        const { data: extraTeams } = await supabase
          .from('teams')
          .select('id, name, crest_url')
          .in('id', extraTeamIds);
        for (const t of extraTeams ?? []) {
          teamMap.set(t.id, { name: t.name, crest_url: t.crest_url });
        }
      }

      const ht = rawFeatured.home_team_id ? teamMap.get(rawFeatured.home_team_id) : null;
      const at = rawFeatured.away_team_id ? teamMap.get(rawFeatured.away_team_id) : null;
      setFeaturedMatch({
        id: rawFeatured.id,
        external_match_id: rawFeatured.external_match_id,
        home_team: ht?.name ?? 'TBD',
        away_team: at?.name ?? 'TBD',
        home_team_id: rawFeatured.home_team_id,
        away_team_id: rawFeatured.away_team_id,
        kickoff_utc: rawFeatured.kickoff_utc,
        stage: rawFeatured.stage,
        status: rawFeatured.status,
        home_crest: ht?.crest_url ?? null,
        away_crest: at?.crest_url ?? null,
        home_score: rawFeatured.home_score ?? null,
        away_score: rawFeatured.away_score ?? null,
      });
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

    // Fetch news
    const { data: newsData } = await supabase
      .from('news')
      .select('id, title, url, source, image_url, summary, published_at, matched_teams')
      .order('published_at', { ascending: false })
      .limit(10);
    if (newsData) setNews((newsData as NewsArticle[] | null) ?? []);

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

        {/* Featured match (live or last finished) */}
        {featuredMatch && (() => {
          const pred = predictions[featuredMatch.external_match_id];
          const isLive = featuredMatch.status === 'in_play' || featuredMatch.status === 'paused';
          const kickoff = new Date(featuredMatch.kickoff_utc);
          const timeLabel = kickoff.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' +
            kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          return (
            <section className="mt-8">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-400">
                  {isLive ? 'Happening now' : 'Just finished'}
                </p>
                <h2 className="text-xl font-semibold">
                  {isLive ? '🔴 Live match' : 'Latest result'}
                </h2>
              </div>
              <div className="relative overflow-hidden rounded-[20px] border border-border-subtle bg-gradient-to-br from-surface-overlay to-background p-5">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />

                {/* Status row */}
                <div className="mb-4 flex items-center justify-between">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-red-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-400">
                      ✓ Full Time
                    </span>
                  )}
                  <span className="text-xs text-muted">{timeLabel}</span>
                </div>

                {/* Teams + score */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <TeamBadge team={{ name: featuredMatch.home_team, crestUrl: featuredMatch.home_crest } as TeamVisual} size="md" />
                  </div>
                  <div className="flex min-w-[90px] flex-col items-center gap-1">
                    {featuredMatch.home_score != null && featuredMatch.away_score != null ? (
                      <span className="text-3xl font-extrabold tabular-nums tracking-wider text-heading">
                        {featuredMatch.home_score} – {featuredMatch.away_score}
                      </span>
                    ) : (
                      <span className="text-lg font-semibold text-faint">vs</span>
                    )}
                    {pred && (
                      <span className="text-[11px] tabular-nums text-muted">
                        Your pred: {pred.pred_home_score} – {pred.pred_away_score}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <TeamBadge team={{ name: featuredMatch.away_team, crestUrl: featuredMatch.away_crest } as TeamVisual} size="md" />
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border-subtle/40 pt-3">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-muted">
                    {featuredMatch.stage ?? 'Stage TBD'}
                  </span>
                  {pred && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Predicted
                    </span>
                  )}
                </div>
              </div>
            </section>
          );
        })()}

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
                  homeScore={match.home_score}
                  awayScore={match.away_score}
                  kickoffUtc={match.kickoff_utc}
                  stage={match.stage ?? undefined}
                  group={undefined}
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

        {/* News */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Latest news</h2>
          {news.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-surface/40 p-8 text-center">
              <p className="text-sm text-muted">No news yet. Articles about teams in upcoming matches will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {news.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-border-subtle bg-surface/60 p-4 transition hover:border-cyan-500/30 hover:bg-surface-raised/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-heading group-hover:text-cyan-300 line-clamp-2">{article.title}</h3>
                    {article.image_url && (
                      <img src={article.image_url} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
                    )}
                  </div>
                  {article.summary && (
                    <p className="mt-2 text-xs text-muted line-clamp-2">{article.summary}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-faint">
                    <span className="font-medium text-cyan-400/70">{article.source}</span>
                    {article.published_at && (
                      <>
                        <span>·</span>
                        <time dateTime={article.published_at}>
                          {new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </time>
                      </>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
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
          group={undefined}
          initialHomeScore={predictions[predictionMatch.external_match_id]?.pred_home_score ?? null}
          initialAwayScore={predictions[predictionMatch.external_match_id]?.pred_away_score ?? null}
          onClose={() => setPredictionMatchId(null)}
          onSaved={loadData}
        />
      )}
    </main>
  );
}
