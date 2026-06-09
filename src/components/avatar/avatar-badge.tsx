'use client';

import Image from 'next/image';
import ReactNiceAvatar, { genConfig } from 'react-nice-avatar';

type Props = {
  seed: string;
  teamCrestUrl?: string | null;
  teamName?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: { px: 40, badge: 14, offset: '-bottom-0.5 -right-0.5' },
  md: { px: 56, badge: 20, offset: '-bottom-1 -right-1' },
  lg: { px: 80, badge: 28, offset: '-bottom-1 -right-1' },
};

export function AvatarBadge({ seed, teamCrestUrl, teamName, size = 'md' }: Props) {
  const s = sizeMap[size];
  const config = genConfig(seed);

  return (
    <div className="relative inline-block" style={{ width: s.px, height: s.px }}>
      <ReactNiceAvatar
        id={`avatar-${seed}`}
        style={{ width: s.px, height: s.px }}
        shape="circle"
        {...config}
      />

      {teamCrestUrl && (
        <div
          className={`absolute ${s.offset} rounded-full border border-border-default bg-background p-0.5`}
          title={teamName ?? 'Supported team'}
        >
          <Image
            src={teamCrestUrl}
            alt={teamName ?? ''}
            width={s.badge}
            height={s.badge}
            className="rounded-full object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
