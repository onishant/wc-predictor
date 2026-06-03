import type { WorldCupMatchSummary } from '@/lib/football-data';
import type { WorldCupVenue } from '@/lib/world-cup-venues';

export type RoutedWorldCupMatch = WorldCupMatchSummary & {
  venueId: string;
};

export function buildVenueRouting(matches: WorldCupMatchSummary[], venues: WorldCupVenue[]) {
  const upcomingMatches = matches
    .filter((match) => match.status !== 'FINISHED')
    .slice()
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  const routedMatches: RoutedWorldCupMatch[] = upcomingMatches.map((match, index) => ({
    ...match,
    venueId: venues[index % venues.length]?.id ?? '',
  }));

  const matchesByVenue = new Map<string, RoutedWorldCupMatch[]>();
  for (const match of routedMatches) {
    const bucket = matchesByVenue.get(match.venueId) ?? [];
    bucket.push(match);
    matchesByVenue.set(match.venueId, bucket);
  }

  return {
    routedMatches,
    matchesByVenue,
  };
}
