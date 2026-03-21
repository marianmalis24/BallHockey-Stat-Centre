import { Match, Player } from '@/types/hockey';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  achieved: boolean;
  date?: number;
  playerName?: string;
}

export function calculateMilestones(matches: Match[], players: Player[]): Milestone[] {
  const completed = matches.filter(m => !m.isActive).sort((a, b) => a.date - b.date);
  const milestones: Milestone[] = [];

  const wins = completed.filter(m => m.ourScore > m.opponentScore).length;
  const totalGoals = completed.reduce((s, m) => s + m.ourScore, 0);

  const firstWin = completed.find(m => m.ourScore > m.opponentScore);
  milestones.push({
    id: 'first_win',
    title: 'First Victory',
    description: 'Win your first match',
    icon: 'trophy',
    color: '#FFD700',
    achieved: !!firstWin,
    date: firstWin?.date,
  });

  milestones.push({
    id: 'five_wins',
    title: 'High Five',
    description: 'Win 5 matches',
    icon: 'medal',
    color: '#C0C0C0',
    achieved: wins >= 5,
  });

  milestones.push({
    id: 'ten_wins',
    title: 'Double Digits',
    description: 'Win 10 matches',
    icon: 'award',
    color: '#FFD700',
    achieved: wins >= 10,
  });

  const shutout = completed.find(m => m.opponentScore === 0 && m.ourScore > 0);
  milestones.push({
    id: 'first_shutout',
    title: 'Brick Wall',
    description: 'Record a shutout',
    icon: 'shield',
    color: '#0af',
    achieved: !!shutout,
    date: shutout?.date,
  });

  let hatTrickPlayer: string | undefined;
  let hatTrickDate: number | undefined;
  for (const m of completed) {
    const scorerMap = new Map<string, number>();
    m.goals.filter(g => g.isOurTeam).forEach(g => {
      scorerMap.set(g.scorerId, (scorerMap.get(g.scorerId) || 0) + 1);
    });
    for (const [playerId, count] of scorerMap) {
      if (count >= 3) {
        const player = players.find(p => p.id === playerId);
        hatTrickPlayer = player?.name;
        hatTrickDate = m.date;
        break;
      }
    }
    if (hatTrickPlayer) break;
  }
  milestones.push({
    id: 'hat_trick',
    title: 'Hat Trick',
    description: 'A player scores 3+ goals in a game',
    icon: 'flame',
    color: '#FF3B30',
    achieved: !!hatTrickPlayer,
    date: hatTrickDate,
    playerName: hatTrickPlayer,
  });

  milestones.push({
    id: 'fifty_goals',
    title: '50 Club',
    description: 'Score 50 team goals',
    icon: 'target',
    color: '#FF9500',
    achieved: totalGoals >= 50,
  });

  milestones.push({
    id: 'hundred_goals',
    title: 'Century',
    description: 'Score 100 team goals',
    icon: 'star',
    color: '#FFD700',
    achieved: totalGoals >= 100,
  });

  let maxStreak = 0;
  let runStreak = 0;
  completed.forEach(m => {
    if (m.ourScore > m.opponentScore) {
      runStreak++;
      maxStreak = Math.max(maxStreak, runStreak);
    } else {
      runStreak = 0;
    }
  });
  milestones.push({
    id: 'three_streak',
    title: 'On Fire',
    description: 'Win 3 matches in a row',
    icon: 'zap',
    color: '#FF9500',
    achieved: maxStreak >= 3,
  });

  milestones.push({
    id: 'five_streak',
    title: 'Unstoppable',
    description: 'Win 5 matches in a row',
    icon: 'rocket',
    color: '#AF52DE',
    achieved: maxStreak >= 5,
  });

  let comebackDate: number | undefined;
  for (const m of completed) {
    if (m.ourScore <= m.opponentScore) continue;
    const sortedGoals = [...m.goals].sort((a, b) => a.timestamp - b.timestamp);
    if (sortedGoals.length > 0 && !sortedGoals[0].isOurTeam) {
      comebackDate = m.date;
      break;
    }
  }
  milestones.push({
    id: 'comeback',
    title: 'Comeback Kings',
    description: 'Win after opponent scores first',
    icon: 'rotate-ccw',
    color: '#34C759',
    achieved: !!comebackDate,
    date: comebackDate,
  });

  const goalies = players.filter(p => p.position === 'goalie');
  let hundredSavesGoalie: string | undefined;
  for (const goalie of goalies) {
    let totalSaves = 0;
    completed.forEach(m => {
      if (!m.roster.some(r => r.playerId === goalie.id)) return;
      const detailedSaves = m.shots.filter(s => !s.isOurTeam && s.goalieId === goalie.id && s.result === 'save').length;
      if (detailedSaves > 0) {
        totalSaves += detailedSaves;
      } else if (m.activeGoalieId === goalie.id) {
        const emptyNetGoals = m.goals.filter(g => !g.isOurTeam && g.isEmptyNet).length;
        totalSaves += Math.max(0, m.opponentShots - m.opponentScore + emptyNetGoals);
      }
    });
    if (totalSaves >= 100) {
      hundredSavesGoalie = goalie.name;
      break;
    }
  }
  milestones.push({
    id: 'hundred_saves',
    title: 'Iron Curtain',
    description: 'A goalie makes 100 career saves',
    icon: 'shield-check',
    color: '#5856D6',
    achieved: !!hundredSavesGoalie,
    playerName: hundredSavesGoalie,
  });

  milestones.push({
    id: 'twenty_games',
    title: 'Veteran',
    description: 'Play 20 matches',
    icon: 'calendar',
    color: '#64D2FF',
    achieved: completed.length >= 20,
  });

  return milestones;
}
