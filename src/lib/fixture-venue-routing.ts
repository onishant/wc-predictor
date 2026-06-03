import type { WorldCupMatchSummary } from '@/lib/football-data';
import type { WorldCupVenue } from '@/lib/world-cup-venues';

export type RoutedWorldCupMatch = WorldCupMatchSummary & {
  venueId: string;
};

// Football-data.org match IDs mapped to FIFA World Cup 2026 group-stage venues.
// Source schedule was cross-checked against FIFA's official schedule page/PDF.
export const OFFICIAL_MATCH_VENUE_BY_EXTERNAL_ID: Record<string, string> = {
  '537327': 'mexico-city', // Mexico v South Africa - Estadio Azteca, Mexico City
  '537328': 'guadalajara', // South Korea v Czechia - Estadio Akron, Guadalajara
  '537333': 'toronto', // Canada v Bosnia-Herzegovina - BMO Field, Toronto
  '537345': 'los-angeles', // United States v Paraguay - SoFi Stadium, Los Angeles
  '537334': 'sf-bay-area', // Qatar v Switzerland - Levi's Stadium, San Francisco Bay Area
  '537339': 'new-york-new-jersey', // Brazil v Morocco - MetLife Stadium, New York/New Jersey
  '537340': 'boston', // Haiti v Scotland - Gillette Stadium, Boston
  '537346': 'vancouver', // Australia v Turkey - BC Place, Vancouver
  '537351': 'houston', // Germany v Curacao - NRG Stadium, Houston
  '537357': 'dallas', // Netherlands v Japan - AT&T Stadium, Dallas
  '537352': 'philadelphia', // Ivory Coast v Ecuador - Lincoln Financial Field, Philadelphia
  '537358': 'monterrey', // Sweden v Tunisia - Estadio BBVA, Monterrey
  '537369': 'atlanta', // Spain v Cape Verde Islands - Mercedes-Benz Stadium, Atlanta
  '537363': 'seattle', // Belgium v Egypt - Lumen Field, Seattle
  '537370': 'miami', // Saudi Arabia v Uruguay - Hard Rock Stadium, Miami
  '537364': 'los-angeles', // Iran v New Zealand - SoFi Stadium, Los Angeles
  '537391': 'new-york-new-jersey', // France v Senegal - MetLife Stadium, New York/New Jersey
  '537392': 'boston', // Iraq v Norway - Gillette Stadium, Boston
  '537397': 'kansas-city', // Argentina v Algeria - GEHA Field at Arrowhead Stadium, Kansas City
  '537398': 'sf-bay-area', // Austria v Jordan - Levi's Stadium, San Francisco Bay Area
  '537403': 'houston', // Portugal v Congo DR - NRG Stadium, Houston
  '537409': 'dallas', // England v Croatia - AT&T Stadium, Dallas
  '537410': 'toronto', // Ghana v Panama - BMO Field, Toronto
  '537404': 'mexico-city', // Uzbekistan v Colombia - Estadio Azteca, Mexico City
  '537329': 'atlanta', // Czechia v South Africa - Mercedes-Benz Stadium, Atlanta
  '537335': 'los-angeles', // Switzerland v Bosnia-Herzegovina - SoFi Stadium, Los Angeles
  '537336': 'vancouver', // Canada v Qatar - BC Place, Vancouver
  '537330': 'guadalajara', // Mexico v South Korea - Estadio Akron, Guadalajara
  '537348': 'seattle', // United States v Australia - Lumen Field, Seattle
  '537342': 'boston', // Scotland v Morocco - Gillette Stadium, Boston
  '537341': 'philadelphia', // Brazil v Haiti - Lincoln Financial Field, Philadelphia
  '537347': 'sf-bay-area', // Turkey v Paraguay - Levi's Stadium, San Francisco Bay Area
  '537359': 'houston', // Netherlands v Sweden - NRG Stadium, Houston
  '537353': 'toronto', // Germany v Ivory Coast - BMO Field, Toronto
  '537354': 'kansas-city', // Ecuador v Curacao - GEHA Field at Arrowhead Stadium, Kansas City
  '537360': 'monterrey', // Tunisia v Japan - Estadio BBVA, Monterrey
  '537371': 'atlanta', // Spain v Saudi Arabia - Mercedes-Benz Stadium, Atlanta
  '537365': 'los-angeles', // Belgium v Iran - SoFi Stadium, Los Angeles
  '537372': 'miami', // Uruguay v Cape Verde Islands - Hard Rock Stadium, Miami
  '537366': 'vancouver', // New Zealand v Egypt - BC Place, Vancouver
  '537399': 'dallas', // Argentina v Austria - AT&T Stadium, Dallas
  '537393': 'philadelphia', // France v Iraq - Lincoln Financial Field, Philadelphia
  '537394': 'new-york-new-jersey', // Norway v Senegal - MetLife Stadium, New York/New Jersey
  '537400': 'sf-bay-area', // Jordan v Algeria - Levi's Stadium, San Francisco Bay Area
  '537405': 'houston', // Portugal v Uzbekistan - NRG Stadium, Houston
  '537411': 'boston', // England v Ghana - Gillette Stadium, Boston
  '537412': 'toronto', // Panama v Croatia - BMO Field, Toronto
  '537406': 'guadalajara', // Colombia v Congo DR - Estadio Akron, Guadalajara
  '537337': 'vancouver', // Switzerland v Canada - BC Place, Vancouver
  '537338': 'seattle', // Bosnia-Herzegovina v Qatar - Lumen Field, Seattle
  '537344': 'atlanta', // Morocco v Haiti - Mercedes-Benz Stadium, Atlanta
  '537343': 'miami', // Scotland v Brazil - Hard Rock Stadium, Miami
  '537331': 'mexico-city', // Czechia v Mexico - Estadio Azteca, Mexico City
  '537332': 'monterrey', // South Africa v South Korea - Estadio BBVA, Monterrey
  '537355': 'new-york-new-jersey', // Ecuador v Germany - MetLife Stadium, New York/New Jersey
  '537356': 'philadelphia', // Curacao v Ivory Coast - Lincoln Financial Field, Philadelphia
  '537361': 'kansas-city', // Tunisia v Netherlands - GEHA Field at Arrowhead Stadium, Kansas City
  '537362': 'dallas', // Japan v Sweden - AT&T Stadium, Dallas
  '537349': 'los-angeles', // Turkey v United States - SoFi Stadium, Los Angeles
  '537350': 'sf-bay-area', // Paraguay v Australia - Levi's Stadium, San Francisco Bay Area
  '537395': 'boston', // Norway v France - Gillette Stadium, Boston
  '537396': 'toronto', // Senegal v Iraq - BMO Field, Toronto
  '537373': 'guadalajara', // Uruguay v Spain - Estadio Akron, Guadalajara
  '537374': 'houston', // Cape Verde Islands v Saudi Arabia - NRG Stadium, Houston
  '537367': 'vancouver', // New Zealand v Belgium - BC Place, Vancouver
  '537368': 'seattle', // Egypt v Iran - Lumen Field, Seattle
  '537413': 'new-york-new-jersey', // Panama v England - MetLife Stadium, New York/New Jersey
  '537414': 'philadelphia', // Croatia v Ghana - Lincoln Financial Field, Philadelphia
  '537407': 'miami', // Colombia v Portugal - Hard Rock Stadium, Miami
  '537408': 'atlanta', // Congo DR v Uzbekistan - Mercedes-Benz Stadium, Atlanta
  '537401': 'dallas', // Jordan v Argentina - AT&T Stadium, Dallas
  '537402': 'kansas-city', // Algeria v Austria - GEHA Field at Arrowhead Stadium, Kansas City
};

export function buildVenueRouting(matches: WorldCupMatchSummary[], venues: WorldCupVenue[]) {
  const venueIds = new Set(venues.map((venue) => venue.id));
  const upcomingMatches = matches
    .filter((match) => match.status !== 'FINISHED')
    .slice()
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  const routedMatches: RoutedWorldCupMatch[] = upcomingMatches.map((match, index) => {
    const officialVenueId = OFFICIAL_MATCH_VENUE_BY_EXTERNAL_ID[String(match.id)];
    const fallbackVenueId = venues[index % venues.length]?.id ?? '';

    return {
      ...match,
      venueId: officialVenueId && venueIds.has(officialVenueId) ? officialVenueId : fallbackVenueId,
    };
  });

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
