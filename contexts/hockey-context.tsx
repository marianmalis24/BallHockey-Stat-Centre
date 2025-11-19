import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import {
  Player,
  Match,
  Goal,
  Shot,
  PenaltyEvent,
  PossessionEvent,
  FaceoffEvent,
  PlayerStats,
  GoalieStats,
  PlayerMatchHistory,
  OpponentStats,
} from '@/types/hockey';

const PLAYERS_KEY = 'hockey_players';
const MATCHES_KEY = 'hockey_matches';

export const [HockeyProvider, useHockey] = createContextHook(() => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [playersData, matchesData] = await Promise.all([
        AsyncStorage.getItem(PLAYERS_KEY),
        AsyncStorage.getItem(MATCHES_KEY),
      ]);

      if (playersData) {
        const parsedPlayers = JSON.parse(playersData);
        setPlayers(parsedPlayers);
      }

      if (matchesData) {
        const parsedMatches = JSON.parse(matchesData);
        setMatches(parsedMatches);
        const active = parsedMatches.find((m: Match) => m.isActive);
        setActiveMatch(active || null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePlayers = async (updatedPlayers: Player[]) => {
    try {
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(updatedPlayers));
      setPlayers(updatedPlayers);
    } catch (error) {
      console.error('Failed to save players:', error);
    }
  };

  const saveMatches = async (updatedMatches: Match[]) => {
    try {
      await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(updatedMatches));
      setMatches(updatedMatches);
    } catch (error) {
      console.error('Failed to save matches:', error);
    }
  };

  const addPlayer = useCallback(
    (player: Omit<Player, 'id'>) => {
      const newPlayer: Player = {
        ...player,
        id: Date.now().toString(),
      };
      const updated = [...players, newPlayer];
      savePlayers(updated);
    },
    [players]
  );

  const updatePlayer = useCallback(
    (id: string, updates: Partial<Player>) => {
      const updated = players.map((p) => (p.id === id ? { ...p, ...updates } : p));
      savePlayers(updated);
    },
    [players]
  );

  const deletePlayer = useCallback(
    (id: string) => {
      const updated = players.filter((p) => p.id !== id);
      savePlayers(updated);
    },
    [players]
  );

  const startMatch = useCallback(
    (selectedPlayers: string[], opponentName: string, activeGoalieId: string, centers: string[]) => {
      if (activeMatch) {
        console.warn('A match is already active');
        return;
      }

      const newMatch: Match = {
        id: Date.now().toString(),
        date: Date.now(),
        ourScore: 0,
        opponentScore: 0,
        ourShots: 0,
        opponentShots: 0,
        roster: selectedPlayers.map((playerId) => ({
          playerId,
          isPlaying: true,
        })),
        goals: [],
        shots: [],
        penalties: [],
        possessions: [],
        faceoffs: [],
        isActive: true,
        opponentName,
        activeGoalieId,
        currentPeriod: 1,
        centers: centers || [],
      };

      const updated = [...matches, newMatch];
      saveMatches(updated);
      setActiveMatch(newMatch);
    },
    [activeMatch, matches]
  );

  const updateActiveMatch = useCallback(
    (updates: Partial<Match>) => {
      if (!activeMatch) return;

      const updatedMatch = { ...activeMatch, ...updates };
      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) {
        console.error('addGoal: No active match');
        return;
      }

      console.log('=== ADD GOAL START ===');
      console.log('Goal data:', goal);
      console.log('Current match scores:', activeMatch.ourScore, activeMatch.opponentScore);
      console.log('Current goals array length:', activeMatch.goals.length);

      const newGoal: Goal = {
        ...goal,
        id: Date.now().toString(),
        timestamp: Date.now(),
        goalieId: !goal.isOurTeam ? activeMatch.activeGoalieId : undefined,
        period: activeMatch.currentPeriod || 1,
      };

      const newOurScore = goal.isOurTeam ? activeMatch.ourScore + 1 : activeMatch.ourScore;
      const newOpponentScore = !goal.isOurTeam ? activeMatch.opponentScore + 1 : activeMatch.opponentScore;
      
      const newOurShots = goal.isOurTeam ? activeMatch.ourShots + 1 : activeMatch.ourShots;
      const newOpponentShots = !goal.isOurTeam ? activeMatch.opponentShots + 1 : activeMatch.opponentShots;

      console.log('Calculated new scores - Our:', newOurScore, 'Opponent:', newOpponentScore);
      console.log('Calculated new shots - Our:', newOurShots, 'Opponent:', newOpponentShots);

      const updatedMatch = {
        ...activeMatch,
        goals: [...activeMatch.goals, newGoal],
        ourScore: newOurScore,
        opponentScore: newOpponentScore,
        ourShots: newOurShots,
        opponentShots: newOpponentShots,
      };

      console.log('Updated match object:', {
        ourScore: updatedMatch.ourScore,
        opponentScore: updatedMatch.opponentScore,
        ourShots: updatedMatch.ourShots,
        opponentShots: updatedMatch.opponentShots,
        goalsLength: updatedMatch.goals.length,
      });

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      console.log('Saving to storage and updating state');
      console.log('Updated matches array:', updatedMatches.map(m => ({ id: m.id, ourScore: m.ourScore, opponentScore: m.opponentScore })));
      
      setActiveMatch(updatedMatch);
      setMatches(updatedMatches);
      
      AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(updatedMatches)).then(() => {
        console.log('Successfully saved to AsyncStorage');
      }).catch((error) => {
        console.error('Failed to save to AsyncStorage:', error);
      });
      
      console.log('State updated. New activeMatch scores should be:', updatedMatch.ourScore, updatedMatch.opponentScore);
      console.log('=== ADD GOAL END ===');
    },
    [activeMatch, matches]
  );

  const addShot = useCallback(
    (shot: Omit<Shot, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const newShot: Shot = {
        ...shot,
        id: Date.now().toString(),
        timestamp: Date.now(),
        goalieId: !shot.isOurTeam ? activeMatch.activeGoalieId : undefined,
        period: activeMatch.currentPeriod || 1,
      };

      const updatedMatch = {
        ...activeMatch,
        shots: [...activeMatch.shots, newShot],
        ourShots: shot.isOurTeam ? activeMatch.ourShots + 1 : activeMatch.ourShots,
        opponentShots: !shot.isOurTeam
          ? activeMatch.opponentShots + 1
          : activeMatch.opponentShots,
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const addPenalty = useCallback(
    (penalty: Omit<PenaltyEvent, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const newPenalty: PenaltyEvent = {
        ...penalty,
        id: Date.now().toString(),
        timestamp: Date.now(),
        period: activeMatch.currentPeriod || 1,
      };

      const updatedMatch = {
        ...activeMatch,
        penalties: [...activeMatch.penalties, newPenalty],
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const addPossession = useCallback(
    (possession: Omit<PossessionEvent, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const newPossession: PossessionEvent = {
        ...possession,
        id: Date.now().toString(),
        timestamp: Date.now(),
        period: activeMatch.currentPeriod || 1,
      };

      const updatedMatch = {
        ...activeMatch,
        possessions: [...activeMatch.possessions, newPossession],
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const addFaceoff = useCallback(
    (faceoff: Omit<FaceoffEvent, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const newFaceoff: FaceoffEvent = {
        ...faceoff,
        id: Date.now().toString(),
        timestamp: Date.now(),
        period: activeMatch.currentPeriod || 1,
      };

      const updatedMatch = {
        ...activeMatch,
        faceoffs: [...(activeMatch.faceoffs || []), newFaceoff],
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const nextPeriod = useCallback(() => {
    if (!activeMatch) return;

    const updatedMatch = {
      ...activeMatch,
      currentPeriod: (activeMatch.currentPeriod || 1) + 1,
    };

    const updatedMatches = matches.map((m) =>
      m.id === activeMatch.id ? updatedMatch : m
    );

    saveMatches(updatedMatches);
    setActiveMatch(updatedMatch);
  }, [activeMatch, matches]);

  const endMatch = useCallback(() => {
    if (!activeMatch) return;

    const updatedMatch = { ...activeMatch, isActive: false };
    const updatedMatches = matches.map((m) =>
      m.id === activeMatch.id ? updatedMatch : m
    );

    saveMatches(updatedMatches);
    setActiveMatch(null);
  }, [activeMatch, matches]);

  const deleteMatch = useCallback(
    (matchId: string) => {
      const updatedMatches = matches.filter((m) => m.id !== matchId);
      saveMatches(updatedMatches);
      
      if (activeMatch && activeMatch.id === matchId) {
        setActiveMatch(null);
      }
    },
    [matches, activeMatch]
  );

  const calculatePlayerStats = useCallback(
    (playerId: string): PlayerStats => {
      const playerMatches = matches.filter((m) =>
        m.roster.some((r) => r.playerId === playerId)
      );

      let goals = 0;
      let assists = 0;
      let plusMinus = 0;
      let shots = 0;
      let possessionGains = 0;
      let possessionLosses = 0;
      let penaltyMinutes = 0;
      let faceoffWins = 0;
      let faceoffLosses = 0;

      playerMatches.forEach((match) => {
        match.goals.forEach((goal) => {
          if (goal.scorerId === playerId) goals++;
          if (goal.assists.includes(playerId)) assists++;
          if (goal.isOurTeam && goal.plusPlayers.includes(playerId)) plusMinus++;
          if (!goal.isOurTeam && goal.minusPlayers.includes(playerId)) plusMinus--;
        });

        match.shots.forEach((shot) => {
          if (shot.playerId === playerId && shot.isOurTeam) shots++;
        });

        match.possessions.forEach((poss) => {
          if (poss.playerId === playerId) {
            if (poss.type === 'gain') possessionGains++;
            else possessionLosses++;
          }
        });

        match.penalties.forEach((pen) => {
          if (pen.playerId === playerId) penaltyMinutes += pen.minutes;
        });

        if (match.faceoffs) {
          match.faceoffs.forEach((faceoff) => {
            if (faceoff.winnerId === playerId) faceoffWins++;
            if (faceoff.loserId === playerId) faceoffLosses++;
          });
        }
      });

      const points = goals + assists;
      const shotPercentage = shots > 0 ? (goals / shots) * 100 : 0;
      const faceoffTotal = faceoffWins + faceoffLosses;
      const faceoffPercentage = faceoffTotal > 0 ? (faceoffWins / faceoffTotal) * 100 : 0;
      
      const rating = calculateRating(
        goals,
        assists,
        plusMinus,
        shotPercentage,
        possessionGains,
        possessionLosses,
        penaltyMinutes,
        faceoffWins,
        faceoffLosses,
        shots
      );

      return {
        playerId,
        gamesPlayed: playerMatches.length,
        goals,
        assists,
        points,
        plusMinus,
        shots,
        shotPercentage,
        possessionGains,
        possessionLosses,
        penaltyMinutes,
        faceoffWins,
        faceoffLosses,
        faceoffPercentage,
        rating,
      };
    },
    [matches]
  );

  const calculateGoalieStats = useCallback(
    (playerId: string): GoalieStats => {
      const playerMatches = matches.filter((m) =>
        m.roster.some((r) => r.playerId === playerId)
      );

      let shotsAgainst = 0;
      let saves = 0;
      let goalsAgainst = 0;

      playerMatches.forEach((match) => {
        const hasDetailedStats = match.shots.some(s => s.goalieId) || match.goals.some(g => g.goalieId);
        
        if (hasDetailedStats) {
             const matchGoalsAgainst = match.goals.filter(g => !g.isOurTeam && g.goalieId === playerId).length;
             const matchShotsSaved = match.shots.filter(s => !s.isOurTeam && s.goalieId === playerId && s.result === 'save').length;
             
             goalsAgainst += matchGoalsAgainst;
             saves += matchShotsSaved;
             shotsAgainst += matchGoalsAgainst + matchShotsSaved;
        } else {
             // Only count if this goalie was the active goalie at the end of match (imperfect fallback)
             // or if they were the ONLY goalie in roster
             const goaliesInRoster = match.roster.filter(r => 
                players.find(p => p.id === r.playerId)?.position === 'goalie'
             );
             
             if (goaliesInRoster.length === 1 && goaliesInRoster[0].playerId === playerId) {
                 const opponentShots = match.opponentShots;
                 const opponentGoals = match.opponentScore;
                 shotsAgainst += opponentShots;
                 goalsAgainst += opponentGoals;
                 saves += opponentShots - opponentGoals;
             } else if (match.activeGoalieId === playerId) {
                // Better fallback: assume active goalie at end took all stats if multiple goalies
                 const opponentShots = match.opponentShots;
                 const opponentGoals = match.opponentScore;
                 shotsAgainst += opponentShots;
                 goalsAgainst += opponentGoals;
                 saves += opponentShots - opponentGoals;
             }
        }
      });

      const savePercentage = shotsAgainst > 0 ? (saves / shotsAgainst) * 100 : 0;
      
      let rating = 6.0;
      if (shotsAgainst > 0) {
        const savesBonus = saves * 0.02;
        const goalsAgainstPenalty = goalsAgainst * 0.16;
        rating = rating + savesBonus - goalsAgainstPenalty;
      }

      return {
        playerId,
        gamesPlayed: playerMatches.length,
        shotsAgainst,
        saves,
        goalsAgainst,
        savePercentage,
        rating,
      };
    },
    [matches, players]
  );

  const calculatePlayerMatchHistory = useCallback(
    (playerId: string): PlayerMatchHistory[] => {
      const playerMatches = matches.filter(
        (m) => !m.isActive && m.roster.some((r) => r.playerId === playerId)
      );

      return playerMatches
        .map((match) => {
          let goals = 0;
          let assists = 0;
          let plusMinus = 0;
          let shots = 0;
          let penaltyMinutes = 0;

          match.goals.forEach((goal) => {
            if (goal.scorerId === playerId) goals++;
            if (goal.assists.includes(playerId)) assists++;
            if (goal.isOurTeam && goal.plusPlayers.includes(playerId)) plusMinus++;
            if (!goal.isOurTeam && goal.minusPlayers.includes(playerId)) plusMinus--;
          });

          match.shots.forEach((shot) => {
            if (shot.playerId === playerId && shot.isOurTeam) shots++;
          });

          match.penalties.forEach((pen) => {
            if (pen.playerId === playerId) penaltyMinutes += pen.minutes;
          });

          const shotPercentage = shots > 0 ? (goals / shots) * 100 : 0;

          let possessionGains = 0;
          let possessionLosses = 0;
          match.possessions.forEach((poss) => {
            if (poss.playerId === playerId) {
              if (poss.type === 'gain') possessionGains++;
              else possessionLosses++;
            }
          });

          let faceoffWins = 0;
          let faceoffLosses = 0;
          if (match.faceoffs) {
            match.faceoffs.forEach((faceoff) => {
              if (faceoff.winnerId === playerId) faceoffWins++;
              if (faceoff.loserId === playerId) faceoffLosses++;
            });
          }

          const rating = calculateRating(
            goals,
            assists,
            plusMinus,
            shotPercentage,
            possessionGains,
            possessionLosses,
            penaltyMinutes,
            faceoffWins,
            faceoffLosses,
            shots
          );

          return {
            matchId: match.id,
            date: match.date,
            opponentName: match.opponentName,
            goals,
            assists,
            plusMinus,
            penaltyMinutes,
            shots,
            rating,
            ourScore: match.ourScore,
            opponentScore: match.opponentScore,
          };
        })
        .sort((a, b) => b.date - a.date);
    },
    [matches]
  );

  const calculateOpponentStats = useCallback((): OpponentStats[] => {
    const opponentMap = new Map<string, OpponentStats>();

    matches
      .filter((m) => !m.isActive)
      .forEach((match) => {
        const name = match.opponentName;
        const existing = opponentMap.get(name) || {
          opponentName: name,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };

        existing.gamesPlayed++;
        existing.goalsFor += match.ourScore;
        existing.goalsAgainst += match.opponentScore;

        if (match.ourScore > match.opponentScore) {
          existing.wins++;
        } else if (match.ourScore < match.opponentScore) {
          existing.losses++;
        } else {
          existing.draws++;
        }

        opponentMap.set(name, existing);
      });

    return Array.from(opponentMap.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  }, [matches]);

  return {
    players,
    matches,
    activeMatch,
    isLoading,
    addPlayer,
    updatePlayer,
    deletePlayer,
    startMatch,
    updateActiveMatch,
    addGoal,
    addShot,
    addPenalty,
    addPossession,
    addFaceoff,
    nextPeriod,
    endMatch,
    deleteMatch,
    calculatePlayerStats,
    calculateGoalieStats,
    calculatePlayerMatchHistory,
    calculateOpponentStats,
  };
});

function calculateRating(
  goals: number,
  assists: number,
  plusMinus: number,
  shotPercentage: number,
  possessionGains: number,
  possessionLosses: number,
  penaltyMinutes: number,
  faceoffWins: number,
  faceoffLosses: number,
  shots: number
): number {
  let rating = 6.0;

  const points = goals + assists;
  if (points >= 4) rating += 2.5;
  else if (points >= 3) rating += 2.0;
  else if (points >= 2) rating += 1.5;
  else if (points >= 1) rating += 0.8;
  else if (points === 0) rating -= 0.3;

  if (plusMinus >= 3) rating += 1.5;
  else if (plusMinus >= 2) rating += 1.0;
  else if (plusMinus >= 1) rating += 0.5;
  else if (plusMinus === 0) rating += 0;
  else if (plusMinus === -1) rating -= 0.5;
  else if (plusMinus === -2) rating -= 1.2;
  else if (plusMinus <= -3) rating -= 2.0;

  if (shots > 0) {
    if (shotPercentage >= 30) rating += 0.8;
    else if (shotPercentage >= 20) rating += 0.5;
    else if (shotPercentage >= 10) rating += 0.2;
    else if (shotPercentage < 10 && shots >= 5) rating -= 0.3;
  }

  if (possessionGains + possessionLosses > 0) {
    const possessionRatio = possessionGains / (possessionGains + possessionLosses);
    if (possessionRatio >= 0.7) rating += 0.5;
    else if (possessionRatio >= 0.6) rating += 0.3;
    else if (possessionRatio < 0.4) rating -= 0.3;
  }

  if (penaltyMinutes >= 10) rating -= 2.5;
  else if (penaltyMinutes >= 6) rating -= 1.8;
  else if (penaltyMinutes >= 4) rating -= 1.2;
  else if (penaltyMinutes >= 2) rating -= 0.7;

  const faceoffTotal = faceoffWins + faceoffLosses;
  if (faceoffTotal >= 5) {
    const faceoffPct = (faceoffWins / faceoffTotal) * 100;
    if (faceoffPct >= 60) rating += 0.6;
    else if (faceoffPct >= 55) rating += 0.3;
    else if (faceoffPct < 40) rating -= 0.4;
  }

  return Math.min(10, Math.max(0, rating));
}
