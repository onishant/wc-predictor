import Image from 'next/image';
import { getAvatarAccent, getAvatarName, type AvatarId } from '@/lib/avatar-catalog';

type Props = {
  avatarId: AvatarId;
  teamCrestUrl?: string | null;
  teamName?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: { container: 'h-10 w-10', badge: 'h-4 w-4', text: 'text-xs', offset: '-bottom-0.5 -right-0.5' },
  md: { container: 'h-14 w-14', badge: 'h-5 w-5', text: 'text-sm', offset: '-bottom-1 -right-1' },
  lg: { container: 'h-20 w-20', badge: 'h-7 w-7', text: 'text-lg', offset: '-bottom-1 -right-1' },
};

export function AvatarBadge({ avatarId, teamCrestUrl, teamName, size = 'md' }: Props) {
  const accent = getAvatarAccent(avatarId);
  const name = getAvatarName(avatarId);
  const s = sizeMap[size];

  return (
    <div className="relative inline-block">
      {/* Main avatar circle */}
      <div
        className={`relative flex items-center justify-center rounded-full ${s.container}`}
        style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)`, border: `2px solid ${accent}66` }}
      >
        <span className={`font-bold ${s.text}`} style={{ color: accent }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Team crest badge */}
      {teamCrestUrl && (
        <div
          className={`absolute ${s.offset} rounded-full border border-border-default bg-background p-0.5`}
          title={teamName ?? 'Supported team'}
        >
          <Image
            src={teamCrestUrl}
            alt={teamName ?? ''}
            width={size === 'lg' ? 24 : size === 'md' ? 18 : 14}
            height={size === 'lg' ? 24 : size === 'md' ? 18 : 14}
            className="rounded-full object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
