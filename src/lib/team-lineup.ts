import type { WorldCupPlayer } from '@/lib/football-data';

export type ProjectedLineup = {
  goalkeeper: WorldCupPlayer[];
  defence: WorldCupPlayer[];
  midfield: WorldCupPlayer[];
  offence: WorldCupPlayer[];
  substitutes: WorldCupPlayer[];
};

const FORMATION = {
  Goalkeeper: 1,
  Defence: 4,
  Midfield: 3,
  Offence: 3,
} as const;

export function projectStartingEleven(squad: WorldCupPlayer[]): ProjectedLineup {
  const starters = new Set<number>();

  const select = (position: keyof typeof FORMATION) => {
    const players = squad
      .filter((player) => player.position === position)
      .sort((a, b) => experienceScore(b, position) - experienceScore(a, position) || a.name.localeCompare(b.name))
      .slice(0, FORMATION[position]);

    players.forEach((player) => starters.add(player.id));
    return players;
  };

  return {
    goalkeeper: select('Goalkeeper'),
    defence: select('Defence'),
    midfield: select('Midfield'),
    offence: select('Offence'),
    substitutes: squad.filter((player) => !starters.has(player.id)),
  };
}

function experienceScore(player: WorldCupPlayer, position: keyof typeof FORMATION) {
  if (!player.dateOfBirth) return 0;

  const age = getAge(player.dateOfBirth);
  const idealAge = position === 'Goalkeeper' ? 30 : 27;
  return 100 - Math.abs(age - idealAge);
}

function getAge(dateOfBirth: string) {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}
