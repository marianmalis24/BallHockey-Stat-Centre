import { Match, Player } from '@/types/hockey';

export interface PersonalBest {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  stat: string;
  statLabel: string;
  value: number;
  matchId: string;
  opponentName: string;
  date: number;
  isNew?: boolean;
}

export function calculatePersonalBests(matches: Match[], players: Player[]): PersonalBest[] {
  const completed = matches.filter(m => !m.isActive);
  const bests: PersonalBest[] = [];
  const skaters = players.filter(p => p.position !== 'goalie');

  skaters.forEach(player => {
    let bestGoals = 0;
    let bestAssists = 0;
    let bestPoints = 0;
    let bestShots = 0;

    let bestGoalsMatch: Match | null = null;
    let bestAssistsMatch: Match | null = null;
    let bestPointsMatch: Match | null = null;
    let bestShotsMatch: Match | null = null;

    completed.forEach(match => {
      if (!match.roster.some(r => r.playerId === player.id)) return;

      let goals = 0, assists = 0, shots = 0;

      match.goals.forEach(g => {
        if (g.scorerId === player.id) goals++;
        if (g.assists.includes(player.id)) assists++;

      });

      match.shots.forEach(s => {
        if (s.playerId === player.id && s.isOurTeam && s.result !== 'miss') shots++;
      });

      const points = goals + assists;

      if (goals > bestGoals) { bestGoals = goals; bestGoalsMatch = match; }
      if (assists > bestAssists) { bestAssists = assists; bestAssistsMatch = match; }
      if (points > bestPoints) { bestPoints = points; bestPointsMatch = match; }
      if (shots > bestShots) { bestShots = shots; bestShotsMatch = match; }
    });

    const pushBest = (m: Match | null, stat: string, statLabel: string, value: number, minVal: number) => {
      if (value >= minVal && m) {
        bests.push({
          playerId: player.id,
          playerName: player.name,
          jerseyNumber: player.jerseyNumber,
          stat,
          statLabel,
          value,
          matchId: m.id,
          opponentName: m.opponentName,
          date: m.date,
        });
      }
    };

    pushBest(bestGoalsMatch, 'goals', 'Goals', bestGoals, 1);
    pushBest(bestAssistsMatch, 'assists', 'Assists', bestAssists, 1);
    pushBest(bestPointsMatch, 'points', 'Points', bestPoints, 2);
    pushBest(bestShotsMatch, 'shots', 'Shots', bestShots, 3);
  });

  const goalies = players.filter(p => p.position === 'goalie');
  goalies.forEach(goalie => {
    let bestSaves = 0;
    let bestSavesMatch: Match | null = null;

    completed.forEach(match => {
      if (!match.roster.some(r => r.playerId === goalie.id)) return;
      if (match.activeGoalieId !== goalie.id) return;

      const detailedSaves = match.shots.filter(s => !s.isOurTeam && s.goalieId === goalie.id && s.result === 'save').length;
      let saves = detailedSaves;
      if (saves === 0) {
        const emptyNetGoals = match.goals.filter(g => !g.isOurTeam && g.isEmptyNet).length;
        saves = Math.max(0, match.opponentShots - match.opponentScore + emptyNetGoals);
      }

      if (saves > bestSaves) { bestSaves = saves; bestSavesMatch = match; }
    });

    if (bestSaves > 0 && bestSavesMatch) {
      const m = bestSavesMatch as Match;
      bests.push({
        playerId: goalie.id,
        playerName: goalie.name,
        jerseyNumber: goalie.jerseyNumber,
        stat: 'saves',
        statLabel: 'Saves',
        value: bestSaves,
        matchId: m.id,
        opponentName: m.opponentName,
        date: m.date,
      });
    }
  });

  return bests.sort((a, b) => b.value - a.value);
}

export function checkNewPersonalBests(
  matches: Match[],
  players: Player[],
  lastMatchId: string
): PersonalBest[] {
  const allBests = calculatePersonalBests(matches, players);
  return allBests
    .filter(b => b.matchId === lastMatchId)
    .map(b => ({ ...b, isNew: true }));
}
