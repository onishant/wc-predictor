import type { CharacterMood } from '@/lib/character-progress';

export type AvatarId = 'striker' | 'keeper' | 'captain';
export type AvatarFeatureId = 'none' | 'football' | 'clubAura' | 'captainBand' | 'championGlow';
export type AvatarUnlockId = CharacterMood | Exclude<AvatarFeatureId, 'none'>;

export type AvatarProfile = {
  selectedAvatarId: AvatarId;
  equippedGesture: CharacterMood;
  equippedFeature: AvatarFeatureId;
  unlockedGestures: CharacterMood[];
  unlockedFeatures: Exclude<AvatarFeatureId, 'none'>[];
  xpSpent: number;
};

export const DEFAULT_AVATAR_PROFILE: AvatarProfile = {
  selectedAvatarId: 'striker',
  equippedGesture: 'idle',
  equippedFeature: 'none',
  unlockedGestures: ['idle'],
  unlockedFeatures: [],
  xpSpent: 0,
};

export const AVATAR_ARCHETYPES: Array<{
  id: AvatarId;
  name: string;
  description: string;
  accent: string;
  defaultGesture: CharacterMood;
}> = [
  {
    id: 'striker',
    name: 'Striker',
    description: 'Fast, loud, built for big-score weeks.',
    accent: '#22d3ee',
    defaultGesture: 'idle',
  },
  {
    id: 'keeper',
    name: 'Keeper',
    description: 'Calm under pressure, rewards clean streaks.',
    accent: '#38bdf8',
    defaultGesture: 'goalkeeperCatchMedium',
  },
  {
    id: 'captain',
    name: 'Captain',
    description: 'A leaderboard-first avatar for consistent predictors.',
    accent: '#f59e0b',
    defaultGesture: 'excited',
  },
];

export const GESTURE_UNLOCKS: Array<{
  id: CharacterMood;
  name: string;
  cost: number;
  description: string;
}> = [
  { id: 'idle', name: 'Matchday stance', cost: 0, description: 'Default pose.' },
  { id: 'excited', name: 'Hype reaction', cost: 25, description: 'Use after correct result calls.' },
  { id: 'jogging', name: 'Warm-up jog', cost: 35, description: 'Movement for steady XP gain.' },
  { id: 'victory', name: 'Victory flex', cost: 60, description: 'Best for winning streaks.' },
  { id: 'goalkeeperCatchMedium', name: 'Keeper catch', cost: 75, description: 'A goalkeeper-style save gesture.' },
  { id: 'goalkeeperCatchHigh', name: 'High save', cost: 100, description: 'Premium goalkeeper save animation.' },
];

export const FEATURE_UNLOCKS: Array<{
  id: Exclude<AvatarFeatureId, 'none'>;
  name: string;
  cost: number;
  description: string;
}> = [
  { id: 'football', name: 'Football control', cost: 20, description: 'Adds a ball that reacts to equipped gestures.' },
  { id: 'clubAura', name: 'Club aura', cost: 30, description: 'Adds a subtle energy ring.' },
  { id: 'captainBand', name: 'Captain band', cost: 55, description: 'Adds a captain identity marker.' },
  { id: 'championGlow', name: 'Champion glow', cost: 90, description: 'Adds a stronger winner effect.' },
];

export function getAvatarAccent(avatarId: AvatarId) {
  return AVATAR_ARCHETYPES.find((avatar) => avatar.id === avatarId)?.accent ?? AVATAR_ARCHETYPES[0].accent;
}

export function normalizeAvatarProfile(profile?: Partial<AvatarProfile> | null): AvatarProfile {
  return {
    selectedAvatarId: profile?.selectedAvatarId ?? DEFAULT_AVATAR_PROFILE.selectedAvatarId,
    equippedGesture: profile?.equippedGesture ?? DEFAULT_AVATAR_PROFILE.equippedGesture,
    equippedFeature: profile?.equippedFeature ?? DEFAULT_AVATAR_PROFILE.equippedFeature,
    unlockedGestures: profile?.unlockedGestures?.length ? profile.unlockedGestures : DEFAULT_AVATAR_PROFILE.unlockedGestures,
    unlockedFeatures: profile?.unlockedFeatures ?? DEFAULT_AVATAR_PROFILE.unlockedFeatures,
    xpSpent: profile?.xpSpent ?? DEFAULT_AVATAR_PROFILE.xpSpent,
  };
}
