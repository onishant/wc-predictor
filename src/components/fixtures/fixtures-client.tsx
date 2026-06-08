'use client';

import { useCallback, useMemo, useState } from 'react';
import { VenueMap } from '@/components/fixtures/venue-map';
import { VenueCard } from '@/components/fixtures/venue-card';
import { MatchCard } from '@/components/fixtures/match-card';
import { FixturesByDate } from '@/components/fixtures/fixtures-by-date';
import { PredictionPanel } from '@/components/fixtures/prediction-panel';
import { buildVenueRouting } from '@/lib/fixture-venue-routing';
import type { WorldCupMatchSummary, TeamWorldCupStats } from '@/lib/football-data';
import type { WorldCupVenue } from '@/lib/world-cup-venues';

type Props = {
  venues: WorldCupVenue[];
  matches: WorldCupMatchSummary[];
  userId: string;
  teamStats?: TeamWorldCupStats[];
  predictions?: Record<string, {
    predicted_result: 'home' | 'away' | 'draw';
    pred_home_score: number;
    pred_away_score: number;
  }>;
};

type ViewMode = 'stadium' | 'date';

export function FixturesClient({ venues, matches, userId, teamStats = [], predictions = {} }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('stadium');
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? '');
  const [predictionMatchId, setPredictionMatchId] = useState<string | null>(null);

  const { matchesByVenue } = useMemo(() => buildVenueRouting(matches, venues), [matches, venues]);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? venues[0],
    [selectedVenueId, venues],
  );

  const selectedVenueMatches = useMemo(() => {
    if (!selectedVenue) return [];
    return (matchesByVenue.get(selectedVenue.id) ?? [])
      .slice()
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }, [matchesByVenue, selectedVenue]);

  const predictionMatch = useMemo(
    () => matches.find((m) => String(m.id) === predictionMatchId) ?? null,
    [matches, predictionMatchId],
  );

  const venueMatchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [venueId, venueMatches] of matchesByVenue) {
      counts.set(venueId, venueMatches.length);
    }
    return counts;
  }, [matchesByVenue]);

  const handleVenueSelect = useCallback((venueId: string) => {
    setSelectedVenueId(venueId);
  }, []);

  return (
    <>
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-2xl border border-slate-800 bg-slate-900/60 p-1">
          {([
            { id: 'stadium' as const, label: 'By Stadium', icon: '🏟️' },
            { id: 'date' as const, label: 'By Date', icon: '📅' },
          ]).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                viewMode === mode.id
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>

        <div className="text-sm text-slate-400">
          {matches.length} total fixtures
        </div>
      </div>

      {/* Stadium view */}
      {viewMode === 'stadium' && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: map + venue grid */}
          <div className="space-y-4">
            <VenueMap
              venues={venues}
              selectedVenueId={selectedVenueId}
              onVenueSelect={handleVenueSelect}
            />

            {/* Venue cards grid */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Host venues
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {venues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venueName={venue.venueName}
                    commonName={venue.commonName}
                    city={venue.city}
                    country={venue.country}
                    matchCount={venueMatchCounts.get(venue.id) ?? 0}
                    selected={venue.id === selectedVenueId}
                    onClick={() => handleVenueSelect(venue.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: selected venue fixtures */}
          <aside className="space-y-4">
            {selectedVenue && (
              <>
                {/* Venue header */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Selected venue</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-50">{selectedVenue.venueName}</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    {selectedVenue.commonName} · {selectedVenue.city}, {selectedVenue.country}
                  </p>
                  {selectedVenue.note && (
                    <p className="mt-3 text-xs leading-5 text-slate-400">{selectedVenue.note}</p>
                  )}
                  <div className="mt-3 flex gap-3 text-xs text-slate-400">
                    <span>{selectedVenueMatches.length} fixture{selectedVenueMatches.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Match cards */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Fixtures
                  </p>
                  {selectedVenueMatches.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
                      No fixtures routed to this venue yet.
                    </div>
                  ) : (
                    selectedVenueMatches.map((match) => {
                      const pred = predictions[String(match.id)];
                      return (
                        <MatchCard
                          key={match.id}
                          matchId={String(match.id)}
                          homeTeam={match.homeTeam}
                          awayTeam={match.awayTeam}
                          homeTeamVisual={match.homeTeamVisual}
                          awayTeamVisual={match.awayTeamVisual}
                          kickoffUtc={match.utcDate}
                          stage={match.stage}
                          group={match.group}
                          status={match.status}
                          predictedResult={pred?.predicted_result ?? null}
                          predictedHomeScore={pred?.pred_home_score ?? null}
                          predictedAwayScore={pred?.pred_away_score ?? null}
                          onClick={() => setPredictionMatchId(String(match.id))}
                        />
                      );
                    })
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Date view */}
      {viewMode === 'date' && (
        <FixturesByDate
          matches={matches}
          userId={userId}
          teamStats={teamStats}
          predictions={predictions}
        />
      )}

      {/* Prediction slide-over */}
      {predictionMatch && (
        <PredictionPanel
          matchId={String(predictionMatch.id)}
          homeTeam={predictionMatch.homeTeam}
          awayTeam={predictionMatch.awayTeam}
          homeTeamVisual={predictionMatch.homeTeamVisual}
          awayTeamVisual={predictionMatch.awayTeamVisual}
          kickoffUtc={predictionMatch.utcDate}
          userId={userId}
          group={predictionMatch.group}
          homeTeamStats={teamStats.find((s) => s.teamName === predictionMatch.homeTeam) ?? null}
          awayTeamStats={teamStats.find((s) => s.teamName === predictionMatch.awayTeam) ?? null}
          allTeamStats={teamStats}
          initialHomeScore={predictions[String(predictionMatch.id)]?.pred_home_score ?? null}
          initialAwayScore={predictions[String(predictionMatch.id)]?.pred_away_score ?? null}
          onClose={() => setPredictionMatchId(null)}
          onSaved={() => {}}
        />
      )}
    </>
  );
}
