'use client';

import { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import Map from 'react-map-gl/maplibre';
import { PredictionForm } from '@/components/fixtures/prediction-form';
import { buildVenueRouting } from '@/lib/fixture-venue-routing';
import type { WorldCupMatchSummary } from '@/lib/football-data';
import type { WorldCupVenue } from '@/lib/world-cup-venues';

type Props = {
  venues: WorldCupVenue[];
  matches: WorldCupMatchSummary[];
  userId: string;
};

type Viewport = {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
};

const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function venueColor(country: string) {
  switch (country) {
    case 'Canada':
      return [251, 146, 60, 230] as const;
    case 'Mexico':
      return [74, 222, 128, 230] as const;
    default:
      return [34, 211, 238, 230] as const;
  }
}

export function VenueMap({ venues, matches, userId }: Props) {
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? '');
  const [viewState, setViewState] = useState<Viewport>({
    latitude: 39.5,
    longitude: -98.35,
    zoom: 2.75,
    pitch: 28,
    bearing: 0,
  });

  const { matchesByVenue } = useMemo(() => buildVenueRouting(matches, venues), [matches, venues]);

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? venues[0],
    [selectedVenueId, venues]
  );

  const selectedVenueMatches = useMemo(() => {
    if (!selectedVenue) {
      return [];
    }

    return (matchesByVenue.get(selectedVenue.id) ?? []).slice().sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }, [matchesByVenue, selectedVenue]);

  const venuePoints = useMemo(
    () =>
      venues.map((venue) => ({
        ...venue,
        matchCount: matchesByVenue.get(venue.id)?.length ?? 0,
      })),
    [matchesByVenue, venues]
  );

  const markerLayer = new ScatterplotLayer({
    id: 'venue-markers',
    data: venuePoints,
    pickable: true,
    stroked: true,
    filled: true,
    radiusUnits: 'pixels',
    lineWidthUnits: 'pixels',
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => (d.id === selectedVenueId ? 16 : 11) + Math.min(d.matchCount * 0.7, 10),
    getFillColor: (d) => venueColor(d.country),
    getLineColor: [255, 255, 255, 220],
    getLineWidth: (d) => (d.id === selectedVenueId ? 3 : 1.5),
    onClick: ({ object }) => {
      if (!object) return;
      setSelectedVenueId(object.id);
      setViewState((current) => ({
        ...current,
        latitude: object.latitude,
        longitude: object.longitude,
        zoom: object.id === 'vancouver' || object.id === 'seattle' ? 3.2 : 3.7,
        transitionDuration: 500,
      }));
    },
  });

  const labelLayer = new TextLayer({
    id: 'venue-labels',
    data: venuePoints,
    pickable: false,
    getPosition: (d) => [d.longitude, d.latitude],
    getText: (d) => d.city,
    getSize: 11,
    sizeUnits: 'pixels',
    getColor: (d) => (d.id === selectedVenueId ? [255, 255, 255, 255] : [203, 213, 225, 220]),
    getAlignmentBaseline: 'top',
    getPixelOffset: [0, 16],
  });

  const layers = [markerLayer, labelLayer];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-[28px] border border-slate-800 bg-slate-950 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.32)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Venue map</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-50">North America host cities</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Click a marker to jump to that venue and load the fixtures the app has routed there. Predictions stay attached to each match card.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {venues.length} venues · {selectedVenueMatches.length} fixtures at the selected venue
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900">
          <div className="relative h-[66vh] min-h-[520px]">
            <DeckGL
              viewState={viewState}
              controller={{ doubleClickZoom: true, touchRotate: false }}
              onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as Viewport)}
              layers={layers}
              getTooltip={({ object }) =>
                object
                  ? {
                      text: `${object.venueName}\n${object.commonName}\n${object.city}, ${object.country}`,
                    }
                  : null
              }
            >
              <Map
                reuseMaps
                mapStyle={CARTO_DARK_STYLE}
                attributionControl={false}
                dragRotate={false}
                cooperativeGestures
                style={{ width: '100%', height: '100%' }}
              />
            </DeckGL>

            <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 backdrop-blur">
                North America
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 backdrop-blur">
                CARTO basemap
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 backdrop-blur">
                deck.gl markers
              </span>
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-[28px] border border-slate-800 bg-slate-900 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.2)]">
        {selectedVenue && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected venue</p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-50">{selectedVenue.venueName}</h3>
              <p className="mt-2 text-sm text-slate-300">
                {selectedVenue.commonName} · {selectedVenue.city}, {selectedVenue.country}
              </p>
              {selectedVenue.municipality && (
                <p className="mt-1 text-xs text-slate-400">Stadium location: {selectedVenue.municipality}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Latitude" value={selectedVenue.latitude.toFixed(4)} />
              <Stat label="Longitude" value={selectedVenue.longitude.toFixed(4)} />
              <Stat label="Upcoming fixtures" value={String(selectedVenueMatches.length)} />
              <Stat label="Country" value={selectedVenue.country} />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Venue note</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selectedVenue.note}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Upcoming fixtures</p>
                <p className="mt-1 text-sm text-slate-400">Sorted by kickoff and ready for predictions.</p>
              </div>

              {selectedVenueMatches.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                  No upcoming fixtures are routed to this venue yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedVenueMatches.map((match, index) => (
                    <div key={match.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        {index + 1}. {new Date(match.utcDate).toLocaleString()}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-slate-50">
                        {match.homeTeam} vs {match.awayTeam}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {match.stage ?? 'Stage TBD'} {match.group ? `· ${match.group}` : ''} · {match.status}
                      </p>
                      <PredictionForm
                        matchExternalId={String(match.id)}
                        homeTeam={match.homeTeam}
                        awayTeam={match.awayTeam}
                        kickoffUtc={match.utcDate}
                        userId={userId}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">All venues</p>
          <div className="grid gap-2">
            {venues.map((venue) => {
              const count = matchesByVenue.get(venue.id)?.length ?? 0;
              const active = venue.id === selectedVenue?.id;

              return (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => {
                    setSelectedVenueId(venue.id);
                    setViewState((current) => ({
                      ...current,
                      latitude: venue.latitude,
                      longitude: venue.longitude,
                      zoom: venue.country === 'Canada' ? 3.1 : 3.7,
                      transitionDuration: 450,
                    }));
                  }}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                    active ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-50">{venue.venueName}</span>
                    <span className="block text-xs text-slate-400">{venue.commonName} · {venue.city}</span>
                  </span>
                  <span className="text-xs text-slate-400">{count} fixtures</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-50">{value}</p>
    </div>
  );
}
