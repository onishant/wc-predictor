import type { ProjectedLineup } from '@/lib/team-lineup';

type Props = {
  lineup: ProjectedLineup;
};

export function ProjectedLineupView({ lineup }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-800 bg-emerald-950">
      <div className="relative min-h-[520px] bg-[linear-gradient(180deg,rgba(6,78,59,0.96),rgba(5,46,22,0.98))] p-5">
        <div className="pointer-events-none absolute inset-5 rounded-xl border border-emerald-400/30" />
        <div className="pointer-events-none absolute left-1/2 top-5 h-20 w-40 -translate-x-1/2 border border-t-0 border-emerald-400/30" />
        <div className="pointer-events-none absolute bottom-5 left-1/2 h-20 w-40 -translate-x-1/2 border border-b-0 border-emerald-400/30" />
        <div className="pointer-events-none absolute left-5 right-5 top-1/2 border-t border-emerald-400/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/30" />

        <div className="relative flex min-h-[480px] flex-col justify-between py-3">
          <PlayerRow players={lineup.offence} />
          <PlayerRow players={lineup.midfield} />
          <PlayerRow players={lineup.defence} />
          <PlayerRow players={lineup.goalkeeper} />
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ players }: { players: ProjectedLineup['goalkeeper'] }) {
  return (
    <div className="flex min-h-16 items-center justify-around gap-2">
      {players.map((player) => (
        <div key={player.id} className="max-w-36 rounded-xl border border-white/15 bg-slate-950/85 px-3 py-2 text-center shadow-lg">
          <span className="block text-xs font-semibold text-white">{player.name}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-wider text-emerald-300">{player.position}</span>
        </div>
      ))}
    </div>
  );
}
