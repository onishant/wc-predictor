export type CharacterMood =
  | 'idle'
  | 'excited'
  | 'victory'
  | 'defeat'
  | 'jogging'
  | 'goalkeeperCatchMedium'
  | 'goalkeeperCatchHigh';

export type CharacterTier = 'Rookie' | 'Pro' | 'Elite' | 'Legend';

export type CharacterProgress = {
  points: number;
  xp: number;
  currentStreak: number;
  bestStreak: number;
  characterTier: string;
};

export function getCharacterTier(points: number): CharacterTier {
  if (points >= 100) return 'Legend';
  if (points >= 50) return 'Elite';
  if (points >= 20) return 'Pro';
  return 'Rookie';
}

export function getMoodForProgress(progress: Pick<CharacterProgress, 'currentStreak' | 'characterTier'>): CharacterMood {
  if (progress.currentStreak >= 3) return 'victory';

  switch (progress.characterTier.toLowerCase()) {
    case 'legend':
    case 'elite':
      return 'excited';
    case 'pro':
      return 'jogging';
    default:
      return progress.currentStreak > 0 ? 'excited' : 'idle';
  }
}

export function getMoodForPredictionPoints(pointsAwarded: number): CharacterMood {
  if (pointsAwarded >= 5) return 'victory';
  if (pointsAwarded >= 3) return 'excited';
  return 'defeat';
}
