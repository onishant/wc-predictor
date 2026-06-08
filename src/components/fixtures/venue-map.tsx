'use client';

import { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import MapGL from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import type { WorldCupVenue } from '@/lib/world-cup-venues';

type Props = {
  venues: WorldCupVenue[];
  selectedVenueId?: string;
  onVenueSelect?: (venueId: string) => void;
};

type VenuePoint = WorldCupVenue & { matchCount: number };

type Viewport = {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
};

export type MapMode = 'map' | 'satellite';

const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const ESRI_SATELLITE_STYLE = {
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri',
    },
  },
  layers: [
    {
      id: 'esri-world-imagery',
      type: 'raster',
      source: 'esri-world-imagery',
    },
  ],
} satisfies StyleSpecification;

function venueColor(country: string) {
  switch (country) {
    case 'Canada':
      return [251, 146, 60, 245] as const;
    case 'Mexico':
      return [74, 222, 128, 245] as const;
    default:
      return [34, 211, 238, 245] as const;
  }
}

function venueRingColor(country: string) {
  switch (country) {
    case 'Canada':
      return [251, 146, 60, 190] as const;
    case 'Mexico':
      return [74, 222, 128, 190] as const;
    default:
      return [34, 211, 238, 190] as const;
  }
}

function venueOverviewZoom(venue: WorldCupVenue) {
  return venue.country === 'Canada' ? 3.1 : 3.7;
}

function venueFocusZoom(mapMode: MapMode, venue: WorldCupVenue) {
  if (mapMode === 'satellite') {
    return 14.6;
  }

  if (venue.id === 'vancouver' || venue.id === 'seattle') {
    return 3.2;
  }

  return venueOverviewZoom(venue);
}

export function VenueMap({ venues, selectedVenueId, onVenueSelect }: Props) {
  const [internalSelectedId, setInternalSelectedId] = useState(venues[0]?.id ?? '');
  const [mapMode, setMapMode] = useState<MapMode>('map');
  const [viewState, setViewState] = useState<Viewport>({
    latitude: 39.5,
    longitude: -98.35,
    zoom: 2.75,
    pitch: 28,
    bearing: 0,
  });

  const activeVenueId = selectedVenueId ?? internalSelectedId;

  const matchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    return counts;
  }, []);

  const venuePoints = useMemo(
    () =>
      venues.map((venue) => ({
        ...venue,
        matchCount: matchCounts.get(venue.id) ?? 0,
      })),
    [venues, matchCounts],
  );

  const selectedVenuePoint = useMemo(
    () => venuePoints.find((v) => v.id === activeVenueId),
    [activeVenueId, venuePoints],
  );

  function handleVenueClick(venueId: string) {
    setInternalSelectedId(venueId);
    onVenueSelect?.(venueId);

    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;

    setViewState((current) => ({
      ...current,
      latitude: venue.latitude,
      longitude: venue.longitude,
      zoom: venueFocusZoom(mapMode, venue),
      pitch: mapMode === 'satellite' ? 0 : current.pitch,
      transitionDuration: 500,
    }));
  }

  const selectedHaloLayer = new ScatterplotLayer({
    id: 'selected-venue-halo',
    data: selectedVenuePoint ? [selectedVenuePoint] : [],
    pickable: false,
    stroked: true,
    filled: true,
    radiusUnits: 'pixels',
    lineWidthUnits: 'pixels',
    getPosition: (d: VenuePoint) => [d.longitude, d.latitude],
    getRadius: () => 31,
    getFillColor: [34, 211, 238, 36],
    getLineColor: [255, 255, 255, 220],
    getLineWidth: 2,
  });

  const ringLayer = new ScatterplotLayer({
    id: 'venue-match-rings',
    data: venuePoints,
    pickable: false,
    stroked: true,
    filled: true,
    radiusUnits: 'pixels',
    lineWidthUnits: 'pixels',
    getPosition: (d: VenuePoint) => [d.longitude, d.latitude],
    getRadius: () => 20,
    getFillColor: [15, 23, 42, 170],
    getLineColor: (d: VenuePoint) => (d.id === activeVenueId ? [255, 255, 255, 235] : venueRingColor(d.country)),
    getLineWidth: (d: VenuePoint) => (d.id === activeVenueId ? 3 : 2),
  });

  const markerLayer = new ScatterplotLayer({
    id: 'venue-markers',
    data: venuePoints,
    pickable: true,
    stroked: true,
    filled: true,
    radiusUnits: 'pixels',
    lineWidthUnits: 'pixels',
    getPosition: (d: VenuePoint) => [d.longitude, d.latitude],
    getRadius: (d: VenuePoint) => (d.id === activeVenueId ? 13 : 10),
    getFillColor: (d: VenuePoint) => venueColor(d.country),
    getLineColor: [255, 255, 255, 235],
    getLineWidth: (d: VenuePoint) => (d.id === activeVenueId ? 2.5 : 1),
    onClick: (info: { object?: VenuePoint | null }) => {
      if (!info.object) return;
      handleVenueClick(info.object.id);
    },
  });

  const countLayer = new TextLayer({
    id: 'venue-match-counts',
    data: venuePoints,
    pickable: false,
    getPosition: (d: VenuePoint) => [d.longitude, d.latitude],
    getText: (d: VenuePoint) => String(d.matchCount),
    getSize: (d: VenuePoint) => (d.id === activeVenueId ? 13 : 11),
    sizeUnits: 'pixels',
    getColor: [2, 6, 23, 255],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
  });

  const labelLayer = new TextLayer({
    id: 'venue-labels',
    data: venuePoints,
    pickable: false,
    getPosition: (d: VenuePoint) => [d.longitude, d.latitude],
    getText: (d: VenuePoint) => d.city,
    getSize: (d: VenuePoint) => (d.id === activeVenueId ? 12 : 10),
    sizeUnits: 'pixels',
    getColor: (d: VenuePoint) => (d.id === activeVenueId ? [255, 255, 255, 255] : [203, 213, 225, 220]),
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'top',
    getPixelOffset: [0, 24],
  });

  const layers = [selectedHaloLayer, ringLayer, markerLayer, countLayer, labelLayer];

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900">
      <div className="relative h-[50vh] min-h-[400px]">
        <DeckGL
          viewState={viewState}
          controller={{ doubleClickZoom: true, touchRotate: false }}
          onViewStateChange={({ viewState: next }) => setViewState(next as Viewport)}
          layers={layers}
          getTooltip={(info: { object?: VenuePoint | null }) =>
            info.object
              ? {
                  text: `${info.object.venueName}\n${info.object.commonName}\n${info.object.city}, ${info.object.country}`,
                }
              : null
          }
        >
          <MapGL
            reuseMaps
            mapStyle={mapMode === 'satellite' ? ESRI_SATELLITE_STYLE : CARTO_DARK_STYLE}
            attributionControl={false}
            dragRotate={false}
            cooperativeGestures
            style={{ width: '100%', height: '100%' }}
          />
        </DeckGL>

        {/* Map mode toggle */}
        <div className="absolute right-4 top-4 flex rounded-full border border-slate-700 bg-slate-950/85 p-1 text-xs text-slate-300 shadow-lg backdrop-blur">
          {(['map', 'satellite'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={mapMode === mode}
              onClick={() => {
                setMapMode(mode);
                const venue = venues.find((v) => v.id === activeVenueId);
                if (!venue) return;
                setViewState((current) => ({
                  ...current,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                  zoom: venueFocusZoom(mode, venue),
                  pitch: mode === 'satellite' ? 0 : 28,
                  bearing: 0,
                  transitionDuration: 500,
                }));
              }}
              className={`rounded-full px-3 py-1.5 font-medium capitalize transition ${
                mapMode === mode ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Legend chips */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1 text-[11px] text-slate-400 backdrop-blur">
            🇺🇸 United States
          </span>
          <span className="rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1 text-[11px] text-slate-400 backdrop-blur">
            🇲🇽 Mexico
          </span>
          <span className="rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1 text-[11px] text-slate-400 backdrop-blur">
            🇨🇦 Canada
          </span>
        </div>
      </div>
    </div>
  );
}
