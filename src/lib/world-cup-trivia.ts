export type WorldCupTrivia = {
  headline: string;
  facts: string[];
};

const TRIVIA_BY_CODE: Record<string, WorldCupTrivia> = {
  ALG: { headline: 'Knockout breakthrough', facts: ['Reached the round of 16 for the first time in 2014.', 'Took eventual champions Germany to extra time in that 2014 knockout match.'] },
  ARG: { headline: 'Three-time champions', facts: ['Won the World Cup in 1978, 1986, and 2022.', 'Lionel Messi won the Golden Ball in both 2014 and 2022.'] },
  AUS: { headline: 'Back-to-back knockout runs', facts: ['Reached the round of 16 in 2006 and 2022.', 'Joined the Asian Football Confederation before the 2010 qualifying cycle.'] },
  AUT: { headline: 'Third place in 1954', facts: ['Recorded their best finish with third place in 1954.', 'Reached the semi-finals of the 1934 tournament.'] },
  BEL: { headline: 'Golden generation peak', facts: ['Finished third in 2018, their best World Cup result.', 'Went unbeaten in regulation time during the 2018 tournament.'] },
  BIH: { headline: '2014 debut', facts: ['Made their first World Cup appearance in Brazil in 2014.', 'Earned their first tournament win against Iran.'] },
  BRA: { headline: 'Record five-time champions', facts: ['Won a record five World Cups: 1958, 1962, 1970, 1994, and 2002.', 'The only nation to have appeared at every men’s World Cup.'] },
  CAN: { headline: 'First goal in 2022', facts: ['Alphonso Davies scored Canada’s first men’s World Cup goal in 2022.', 'The 2026 tournament will be Canada’s first as a co-host.'] },
  CIV: { headline: 'Three straight appearances', facts: ['Qualified for three consecutive World Cups from 2006 to 2014.', 'Earned their first World Cup win against Serbia and Montenegro in 2006.'] },
  COD: { headline: 'The Zaire chapter', facts: ['Competed as Zaire at the 1974 World Cup.', 'The 1974 appearance was the nation’s first at the tournament.'] },
  COL: { headline: 'Quarter-final peak', facts: ['Reached their first quarter-final in 2014.', 'James Rodríguez won the 2014 Golden Boot with six goals.'] },
  CPV: { headline: 'World Cup debutants', facts: ['The 2026 tournament is Cape Verde’s first World Cup.', 'They are one of the smallest nations by population ever to qualify.'] },
  CRO: { headline: 'Three medals since 1998', facts: ['Finished as runners-up in 2018.', 'Also claimed third place in 1998 and 2022.'] },
  CUW: { headline: 'World Cup debutants', facts: ['The 2026 tournament is Curaçao’s first World Cup.', 'They are the smallest nation by population to qualify for the men’s tournament.'] },
  CZE: { headline: 'Historic runner-up legacy', facts: ['Czechoslovakia finished as runners-up in 1934 and 1962.', 'The Czech Republic reached the group stage in 2006.'] },
  ECU: { headline: '2006 knockout run', facts: ['Reached the round of 16 in 2006, their best result.', 'Won two group matches during that 2006 run.'] },
  EGY: { headline: 'African pioneers', facts: ['Became the first African nation to play at a World Cup in 1934.', 'Returned to the tournament in 1990 and 2018.'] },
  ENG: { headline: 'Champions on home soil', facts: ['Won their only World Cup title at Wembley in 1966.', 'Reached the semi-finals again in 1990 and 2018.'] },
  ESP: { headline: '2010 champions', facts: ['Won their first World Cup in 2010.', 'Conceded only two goals throughout the 2010 tournament.'] },
  FRA: { headline: 'Two-time champions', facts: ['Won the World Cup in 1998 and 2018.', 'Reached four finals between 1998 and 2022.'] },
  GER: { headline: 'Four-time champions', facts: ['Won four titles, including three as West Germany.', 'Reached a record eight World Cup finals.'] },
  GHA: { headline: 'A kick from the semi-finals', facts: ['Reached the quarter-finals in 2010.', 'Came within a penalty kick of becoming Africa’s first semi-finalist.'] },
  HAI: { headline: 'Memorable 1974 debut', facts: ['Made their only previous appearance in 1974.', 'Emmanuel Sanon famously ended Dino Zoff’s long international clean-sheet streak.'] },
  IRN: { headline: 'Historic 1998 win', facts: ['Earned their first World Cup victory against the United States in 1998.', 'Recorded a second tournament win against Morocco in 2018.'] },
  IRQ: { headline: 'Mexico 1986', facts: ['Made their only previous World Cup appearance in 1986.', 'Ahmed Radhi scored Iraq’s first World Cup goal.'] },
  JOR: { headline: 'World Cup debutants', facts: ['The 2026 tournament is Jordan’s first World Cup.', 'Their qualification marks a new high point for Jordanian football.'] },
  JPN: { headline: 'Regular knockout contenders', facts: ['Reached the round of 16 four times: 2002, 2010, 2018, and 2022.', 'Beat both Germany and Spain during the 2022 group stage.'] },
  KOR: { headline: 'Asia’s first semi-finalist', facts: ['Finished fourth as co-hosts in 2002.', 'Became the first Asian team to reach a World Cup semi-final.'] },
  KSA: { headline: 'Famous debut and upset', facts: ['Reached the round of 16 on their 1994 debut.', 'Defeated eventual champions Argentina in the 2022 group stage.'] },
  MAR: { headline: 'Africa’s first semi-finalist', facts: ['Became the first African and Arab nation to reach a semi-final in 2022.', 'Finished fourth at the 2022 tournament.'] },
  MEX: { headline: 'Quarter-finals at home', facts: ['Reached the quarter-finals when hosting in 1970 and 1986.', 'The 2026 tournament makes Mexico the first three-time men’s World Cup host.'] },
  NED: { headline: 'Three-time runners-up', facts: ['Reached the final in 1974, 1978, and 2010.', 'Finished third in 2014 after an unbeaten campaign in regulation time.'] },
  NOR: { headline: 'Two knockout appearances', facts: ['Reached the round of 16 in 1938 and 1998.', 'Beat defending champions Brazil during the 1998 group stage.'] },
  NZL: { headline: 'Unbeaten in 2010', facts: ['Finished the 2010 tournament unbeaten with three draws.', 'Were the only unbeaten team at the 2010 World Cup.'] },
  PAN: { headline: 'First appeared in 2018', facts: ['Made their World Cup debut in 2018.', 'Felipe Baloy scored Panama’s first World Cup goal.'] },
  PAR: { headline: 'Quarter-final breakthrough', facts: ['Reached their first quarter-final in 2010.', 'Conceded only two goals across five matches in that tournament.'] },
  POR: { headline: 'Eusébio’s 1966 run', facts: ['Finished third in 1966, their best result.', 'Eusébio won the 1966 Golden Boot with nine goals.'] },
  QAT: { headline: 'Hosts and debutants in 2022', facts: ['Made their World Cup debut as hosts in 2022.', 'Became the first Arab nation to host the men’s tournament.'] },
  RSA: { headline: 'Africa’s first hosts', facts: ['Hosted the first World Cup staged in Africa in 2010.', 'Siphiwe Tshabalala scored the opening goal of the 2010 tournament.'] },
  SCO: { headline: 'Chasing the knockouts', facts: ['Have appeared at eight World Cups.', 'Have never progressed beyond the group stage.'] },
  SEN: { headline: 'Quarter-final debut', facts: ['Reached the quarter-finals on their 2002 debut.', 'Defeated defending champions France in the opening match of 2002.'] },
  SUI: { headline: 'Three quarter-finals', facts: ['Reached the quarter-finals in 1934, 1938, and 1954.', 'Hosted the 1954 tournament.'] },
  SWE: { headline: '1958 runners-up', facts: ['Finished as runners-up when hosting in 1958.', 'Also claimed third place in 1950 and 1994.'] },
  TUN: { headline: 'African first in 1978', facts: ['Became the first African team to win a World Cup match in 1978.', 'Beat Mexico 3-1 in that historic victory.'] },
  TUR: { headline: 'Third place in 2002', facts: ['Finished third in 2002, their best result.', 'Hakan Şükür scored after 11 seconds in the 2002 third-place match.'] },
  URY: { headline: 'The first champions', facts: ['Won the inaugural World Cup in 1930.', 'Claimed a second title by defeating Brazil at the Maracanã in 1950.'] },
  USA: { headline: 'Semi-finalists in 1930', facts: ['Reached the semi-finals at the inaugural 1930 World Cup.', 'Hosted the tournament in 1994 and will co-host again in 2026.'] },
  UZB: { headline: 'World Cup debutants', facts: ['The 2026 tournament is Uzbekistan’s first World Cup.', 'They are the first Central Asian nation to qualify.'] },
};

export function getWorldCupTrivia(code: string | null): WorldCupTrivia {
  if (code && TRIVIA_BY_CODE[code]) return TRIVIA_BY_CODE[code];

  return {
    headline: 'World Cup history',
    facts: ['This team is preparing to add a new chapter to its World Cup story in 2026.'],
  };
}
