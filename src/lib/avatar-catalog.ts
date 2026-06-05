import type { CharacterMood } from '@/lib/character-progress';

export type AvatarId =
  | 'striker'
  | 'keeper'
  | 'captain'
  | 'footballer'
  | 'playmaker'
  | 'winger'
  | 'defender'
  | 'sweeper'
  | 'finisher'
  | 'maestro';
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

const CURRENT_MIXAMO_MODEL = '/assets/characters/mixamo/Pumpkinhulk_L_Shaw_TPose.glb';
const CH19_MIXAMO_MODEL = '/assets/characters/mixamo/Character_Ch19_TPose.glb';

export const AVATAR_ARCHETYPES: Array<{
  id: AvatarId;
  name: string;
  description: string;
  accent: string;
  defaultGesture: CharacterMood;
  modelPath: string;
  builtInFootball?: boolean;
}> = [
  {
    id: 'striker',
    name: 'Striker',
    description: 'Fast, loud, built for big-score weeks.',
    accent: '#22d3ee',
    defaultGesture: 'idle',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'keeper',
    name: 'Keeper',
    description: 'Calm under pressure, rewards clean streaks.',
    accent: '#38bdf8',
    defaultGesture: 'goalkeeperCatchMedium',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'captain',
    name: 'Captain',
    description: 'A leaderboard-first avatar for consistent predictors.',
    accent: '#f59e0b',
    defaultGesture: 'excited',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'footballer',
    name: 'Footballer',
    description: 'Starter avatar with the ball visible from day one.',
    accent: '#16a34a',
    defaultGesture: 'jogging',
    modelPath: CH19_MIXAMO_MODEL,
    builtInFootball: true,
  },
  {
    id: 'playmaker',
    name: 'Playmaker',
    description: 'Controlled, creative, built for smart calls.',
    accent: '#a3e635',
    defaultGesture: 'excited',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'winger',
    name: 'Winger',
    description: 'Quick movement and high-risk prediction energy.',
    accent: '#fb7185',
    defaultGesture: 'jogging',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'defender',
    name: 'Defender',
    description: 'Steady picks, clean streaks, no panic.',
    accent: '#60a5fa',
    defaultGesture: 'idle',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'sweeper',
    name: 'Sweeper',
    description: 'Reads the board early and covers every angle.',
    accent: '#2dd4bf',
    defaultGesture: 'goalkeeperCatchHigh',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'finisher',
    name: 'Finisher',
    description: 'For exact-score hunters and late winners.',
    accent: '#f97316',
    defaultGesture: 'victory',
    modelPath: CURRENT_MIXAMO_MODEL,
  },
  {
    id: 'maestro',
    name: 'Maestro',
    description: 'Premium feel for long streaks and composed picks.',
    accent: '#c084fc',
    defaultGesture: 'excited',
    modelPath: CURRENT_MIXAMO_MODEL,
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

export function getAvatarModel(avatarId: AvatarId) {
  return AVATAR_ARCHETYPES.find((avatar) => avatar.id === avatarId)?.modelPath ?? CURRENT_MIXAMO_MODEL;
}

export function getAvatarName(avatarId: AvatarId) {
  return AVATAR_ARCHETYPES.find((avatar) => avatar.id === avatarId)?.name ?? AVATAR_ARCHETYPES[0].name;
}

export function avatarHasBuiltInFootball(avatarId: AvatarId) {
  return AVATAR_ARCHETYPES.find((avatar) => avatar.id === avatarId)?.builtInFootball ?? false;
}

export function isAvatarId(value?: string | null): value is AvatarId {
  return AVATAR_ARCHETYPES.some((avatar) => avatar.id === value);
}

export function normalizeAvatarProfile(profile?: Partial<AvatarProfile> | null): AvatarProfile {
  return {
    selectedAvatarId: isAvatarId(profile?.selectedAvatarId) ? profile.selectedAvatarId : DEFAULT_AVATAR_PROFILE.selectedAvatarId,
    equippedGesture: profile?.equippedGesture ?? DEFAULT_AVATAR_PROFILE.equippedGesture,
    equippedFeature: profile?.equippedFeature ?? DEFAULT_AVATAR_PROFILE.equippedFeature,
    unlockedGestures: profile?.unlockedGestures?.length ? profile.unlockedGestures : DEFAULT_AVATAR_PROFILE.unlockedGestures,
    unlockedFeatures: profile?.unlockedFeatures ?? DEFAULT_AVATAR_PROFILE.unlockedFeatures,
    xpSpent: profile?.xpSpent ?? DEFAULT_AVATAR_PROFILE.xpSpent,
  };
}
