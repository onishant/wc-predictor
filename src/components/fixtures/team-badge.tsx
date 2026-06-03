import Image from 'next/image';
import { getFlagUrlForTeamCode, getPrimaryTeamImage, type TeamVisual } from '@/lib/team-visuals';

type Props = {
  team: TeamVisual;
  size?: 'sm' | 'md';
};

export function TeamBadge({ team, size = 'md' }: Props) {
  const imageUrl = getPrimaryTeamImage(team);
  const flagUrl = team.flagUrl ?? getFlagUrlForTeamCode(team.code);
  const imageSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';
  const teamName = team.name || 'TBD';

  return (
    <span className="inline-flex min-w-0 items-center gap-2 align-middle">
      <span className={`relative shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-950 ${imageSize}`}>
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-contain p-1" sizes="32px" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-300">
            {team.code ?? teamName.slice(0, 2).toUpperCase()}
          </span>
        )}
        {flagUrl && imageUrl !== flagUrl && (
          <Image
            src={flagUrl}
            alt=""
            width={14}
            height={14}
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border border-slate-950 object-cover"
            unoptimized
          />
        )}
      </span>
      <span className={`min-w-0 truncate font-medium text-slate-50 ${textSize}`}>{teamName}</span>
    </span>
  );
}
