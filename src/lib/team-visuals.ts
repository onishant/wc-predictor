const FIFA_TLA_TO_FLAG_CODE: Record<string, string> = {
  ALG: 'dz',
  ARG: 'ar',
  AUS: 'au',
  AUT: 'at',
  BEL: 'be',
  BIH: 'ba',
  BRA: 'br',
  CAN: 'ca',
  CIV: 'ci',
  COD: 'cd',
  COL: 'co',
  CPV: 'cv',
  CRO: 'hr',
  CUW: 'cw',
  CZE: 'cz',
  ECU: 'ec',
  EGY: 'eg',
  ENG: 'gb-eng',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  GHA: 'gh',
  HAI: 'ht',
  IRN: 'ir',
  IRQ: 'iq',
  JOR: 'jo',
  JPN: 'jp',
  KOR: 'kr',
  KSA: 'sa',
  MAR: 'ma',
  MEX: 'mx',
  NED: 'nl',
  NOR: 'no',
  NZL: 'nz',
  PAN: 'pa',
  PAR: 'py',
  POR: 'pt',
  QAT: 'qa',
  RSA: 'za',
  SCO: 'gb-sct',
  SEN: 'sn',
  SUI: 'ch',
  SWE: 'se',
  TUN: 'tn',
  TUR: 'tr',
  URY: 'uy',
  USA: 'us',
  UZB: 'uz',
};

export type TeamVisual = {
  name: string;
  code?: string | null;
  crestUrl?: string | null;
  logoUrl?: string | null;
  flagUrl?: string | null;
};

export function getFlagUrlForTeamCode(code?: string | null) {
  if (!code) {
    return null;
  }

  const flagCode = FIFA_TLA_TO_FLAG_CODE[code.toUpperCase()];
  return flagCode ? `https://flagcdn.com/${flagCode}.svg` : null;
}

export function getPrimaryTeamImage(team: TeamVisual) {
  return team.logoUrl ?? team.crestUrl ?? team.flagUrl ?? getFlagUrlForTeamCode(team.code);
}
