'use client';

type VenueCardProps = {
  venueName: string;
  commonName: string;
  city: string;
  country: string;
  matchCount: number;
  selected?: boolean;
  onClick?: () => void;
};

const countryFlag: Record<string, string> = {
  'United States': '🇺🇸',
  'Mexico': '🇲🇽',
  'Canada': '🇨🇦',
};

export function VenueCard({
  venueName,
  commonName,
  city,
  country,
  matchCount,
  selected = false,
  onClick,
}: VenueCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
        selected
          ? 'border-cyan-400/60 bg-cyan-500/8 shadow-lg shadow-cyan-500/10'
          : 'border-slate-800/60 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-950 text-lg">
        {countryFlag[country] ?? '🏟️'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-100">{venueName}</span>
        <span className="block truncate text-xs text-slate-400">
          {commonName} · {city}
        </span>
      </span>
      {matchCount > 0 && (
        <span
          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
            selected
              ? 'bg-cyan-400 text-slate-950'
              : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
          }`}
        >
          {matchCount}
        </span>
      )}
    </button>
  );
}
