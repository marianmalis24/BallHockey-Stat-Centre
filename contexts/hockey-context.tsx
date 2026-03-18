import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Player,
  Match,
  Goal,
  Shot,
  ShotLocation,
  PenaltyEvent,
  PossessionEvent,
  FaceoffEvent,
  PlayerStats,
  GoalieStats,
  PlayerMatchHistory,
  OpponentStats,
  GameState,
  ShootoutData,
  SeasonStats,
  UndoAction,
  Line,
  ShiftEntry,
  ShotRisk,
} from '@/types/hockey';

const PLAYERS_KEY = 'hockey_players';
const MATCHES_KEY = 'hockey_matches';

export const [HockeyProvider, useHockey] = createContextHook(() => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadData();
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
      void savePlayers(updated);
    },
    [players]
  );

  const updatePlayer = useCallback(
    (id: string, updates: Partial<Player>) => {
      const updated = players.map((p) => (p.id === id ? { ...p, ...updates } : p));
      void savePlayers(updated);
    },
    [players]
  );

  const deletePlayer = useCallback(
    (id: string) => {
      const updated = players.filter((p) => p.id !== id);
      void savePlayers(updated);
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
        gameState: 'even',
      };

      const updated = [...matches, newMatch];
      void saveMatches(updated);
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

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const setGameState = useCallback(
    (newState: GameState) => {
      if (!activeMatch) return;

      const updates: Partial<Match> = {
        gameState: newState,
      };

      if (newState === 'pp' || newState === 'sh') {
        updates.ppshStartTimestamp = Date.now();
      } else {
        updates.ppshStartTimestamp = undefined;
      }

      const updatedMatch = { ...activeMatch, ...updates };
      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const getPPSHSummary = useCallback(() => {
    if (!activeMatch || !activeMatch.ppshStartTimestamp) return null;

    const startTs = activeMatch.ppshStartTimestamp;
    const gs = activeMatch.gameState;

    const shots = activeMatch.shots.filter(
      (s) => s.timestamp >= startTs && s.gameState === gs
    );
    const goals = activeMatch.goals.filter(
      (g) => g.timestamp >= startTs && g.gameState === gs
    );
    const faceoffs = activeMatch.faceoffs.filter(
      (f) => f.timestamp >= startTs && f.gameState === gs
    );

    const ourShots = shots.filter((s) => s.isOurTeam).length;
    const oppShots = shots.filter((s) => !s.isOurTeam).length;
    const ourGoals = goals.filter((g) => g.isOurTeam).length;
    const oppGoals = goals.filter((g) => !g.isOurTeam).length;

    let foWins = 0;
    let foLosses = 0;
    faceoffs.forEach((f) => {
      const winnerIsUs = activeMatch.roster.some((r) => r.playerId === f.winnerId);
      if (winnerIsUs) foWins++;
      else foLosses++;
    });

    return {
      type: gs,
      ourShots,
      oppShots,
      ourGoals,
      oppGoals,
      foWins,
      foLosses,
    };
  }, [activeMatch]);

  const createSnapshot = useCallback((match: Match): Omit<Match, 'undoStack'> => {
    const { undoStack: _undoStack, ...rest } = match;
    return JSON.parse(JSON.stringify(rest));
  }, []);

  const pushUndo = useCallback((match: Match, type: UndoAction['type'], description: string): Match => {
    const snapshot = createSnapshot(match);
    const stack = match.undoStack || [];
    const newStack = [...stack.slice(-19), { type, description, snapshot }];
    return { ...match, undoStack: newStack };
  }, [createSnapshot]);

  const undoLastAction = useCallback(() => {
    if (!activeMatch) return null;
    const stack = activeMatch.undoStack || [];
    if (stack.length === 0) return null;

    const lastAction = stack[stack.length - 1];
    const restored: Match = {
      ...lastAction.snapshot,
      undoStack: stack.slice(0, -1),
    };

    const updatedMatches = matches.map((m) =>
      m.id === activeMatch.id ? restored : m
    );

    void saveMatches(updatedMatches);
    setActiveMatch(restored);
    console.log('Undid action:', lastAction.description);
    return lastAction;
  }, [activeMatch, matches]);

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) {
        console.error('addGoal: No active match');
        return;
      }

      console.log('=== ADD GOAL START ===');
      console.log('Goal data:', goal);

      const now = Date.now();
      const currentGameState = activeMatch.gameState || 'even';

      const newGoal: Goal = {
        ...goal,
        id: now.toString(),
        timestamp: now,
        goalieId: !goal.isOurTeam ? activeMatch.activeGoalieId : undefined,
        period: activeMatch.currentPeriod || 1,
        gameState: currentGameState,
      };

      const newOurScore = goal.isOurTeam ? activeMatch.ourScore + 1 : activeMatch.ourScore;
      const newOpponentScore = !goal.isOurTeam ? activeMatch.opponentScore + 1 : activeMatch.opponentScore;

      const goalShotId = (now + 1).toString();
      const goalShot: Shot = {
        id: goalShotId,
        timestamp: now + 1,
        playerId: goal.scorerId,
        location: undefined,
        isOurTeam: goal.isOurTeam,
        onGoal: true,
        result: 'goal',
        goalieId: !goal.isOurTeam ? activeMatch.activeGoalieId : undefined,
        period: activeMatch.currentPeriod || 1,
        shotRisk: goal.shotRisk,
        gameState: currentGameState,
      };

      const matchWithUndo = pushUndo(activeMatch, 'goal', goal.isOurTeam ? 'Our Goal' : 'Goal Against');

      const now2 = Date.now();
      const currentShifts = matchWithUndo.shifts || [];
      const endedShifts = currentShifts.map((s) =>
        !s.endTime ? { ...s, endTime: now2 } : s
      );

      const updatedMatch = {
        ...matchWithUndo,
        goals: [...activeMatch.goals, newGoal],
        shots: [...activeMatch.shots, goalShot],
        ourScore: newOurScore,
        opponentScore: newOpponentScore,
        ourShots: goal.isOurTeam ? activeMatch.ourShots + 1 : activeMatch.ourShots,
        opponentShots: !goal.isOurTeam ? activeMatch.opponentShots + 1 : activeMatch.opponentShots,
        shifts: endedShifts,
        activeLineId: undefined,
      };

      console.log('New scores - Our:', newOurScore, 'Opponent:', newOpponentScore);
      console.log('Auto-stopped shift on goal');

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);

      console.log('=== ADD GOAL END ===');

      return goalShotId;
    },
    [activeMatch, matches, pushUndo]
  );

  const addShot = useCallback(
    (shot: Omit<Shot, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const currentGameState = activeMatch.gameState || 'even';

      const newShot: Shot = {
        ...shot,
        id: Date.now().toString(),
        timestamp: Date.now(),
        goalieId: !shot.isOurTeam ? activeMatch.activeGoalieId : undefined,
        period: activeMatch.currentPeriod || 1,
        gameState: currentGameState,
      };

      const isBlockedOrWide = shot.result === 'blocked' || shot.result === 'miss';

      let undoDesc = shot.isOurTeam ? 'Our Shot' : 'Shot Against';
      if (shot.result === 'blocked') undoDesc = 'Shot Blocked';
      if (shot.result === 'miss') undoDesc = 'Shot Wide';

      const matchWithUndo = pushUndo(activeMatch, 'shot', undoDesc);

      const updatedMatch = {
        ...matchWithUndo,
        shots: [...activeMatch.shots, newShot],
        ourShots: (shot.isOurTeam && !isBlockedOrWide) ? activeMatch.ourShots + 1 : activeMatch.ourShots,
        opponentShots: (!shot.isOurTeam && !isBlockedOrWide)
          ? activeMatch.opponentShots + 1
          : activeMatch.opponentShots,
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches, pushUndo]
  );

  const updateGoalShotLocation = useCallback(
    (goalShotId: string, location: ShotLocation | undefined) => {
      if (!activeMatch) return;

      let goalShot = activeMatch.shots.find((s) => s.id === goalShotId);

      if (!goalShot) {
        goalShot = [...activeMatch.shots].reverse().find(
          (s) => s.result === 'goal' && !s.location
        );
      }

      if (!goalShot) {
        console.warn('updateGoalShotLocation: No matching goal shot found');
        return;
      }

      const updatedShots = activeMatch.shots.map((s) =>
        s.id === goalShot!.id ? { ...s, location } : s
      );

      const updatedMatch = {
        ...activeMatch,
        shots: updatedShots,
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
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
        gameState: activeMatch.gameState || 'even',
      };

      const matchWithUndo = pushUndo(activeMatch, 'penalty', 'Penalty');

      const updatedMatch = {
        ...matchWithUndo,
        penalties: [...activeMatch.penalties, newPenalty],
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches, pushUndo]
  );

  const addPossession = useCallback(
    (possession: Omit<PossessionEvent, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const newPossession: PossessionEvent = {
        ...possession,
        id: Date.now().toString(),
        timestamp: Date.now(),
        period: activeMatch.currentPeriod || 1,
        gameState: activeMatch.gameState || 'even',
      };

      const matchWithUndo = pushUndo(activeMatch, 'possession', possession.type === 'gain' ? 'Possession Gain' : 'Possession Loss');

      const updatedMatch = {
        ...matchWithUndo,
        possessions: [...activeMatch.possessions, newPossession],
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches, pushUndo]
  );

  const addFaceoff = useCallback(
    (faceoff: Omit<FaceoffEvent, 'id' | 'timestamp' | 'period'>) => {
      if (!activeMatch) return;

      const newFaceoff: FaceoffEvent = {
        ...faceoff,
        id: Date.now().toString(),
        timestamp: Date.now(),
        period: activeMatch.currentPeriod || 1,
        gameState: activeMatch.gameState || 'even',
      };

      const matchWithUndo = pushUndo(activeMatch, 'faceoff', 'Faceoff');

      const updatedMatch = {
        ...matchWithUndo,
        faceoffs: [...(activeMatch.faceoffs || []), newFaceoff],
      };

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches, pushUndo]
  );

  const nextPeriod = useCallback((isOvertime?: boolean) => {
    if (!activeMatch) return;

    const updatedMatch = {
      ...activeMatch,
      currentPeriod: (activeMatch.currentPeriod || 1) + 1,
      isOvertime: isOvertime || false,
      gameState: 'even' as GameState,
      ppshStartTimestamp: undefined,
    };

    const updatedMatches = matches.map((m) =>
      m.id === activeMatch.id ? updatedMatch : m
    );

    void saveMatches(updatedMatches);
    setActiveMatch(updatedMatch);
  }, [activeMatch, matches]);

  const endMatch = useCallback((endedAs?: 'regulation' | 'overtime' | 'shootout' | 'draw') => {
    if (!activeMatch) return;

    const updatedMatch = {
      ...activeMatch,
      isActive: false,
      endedAs: endedAs || 'regulation',
      gameState: 'even' as GameState,
    };
    const updatedMatches = matches.map((m) =>
      m.id === activeMatch.id ? updatedMatch : m
    );

    void saveMatches(updatedMatches);
    setActiveMatch(null);
  }, [activeMatch, matches]);

  const updateShootout = useCallback(
    (shootout: ShootoutData) => {
      if (!activeMatch) return;

      const updatedMatch = {
        ...activeMatch,
        shootout,
      };

      if (shootout.completed) {
        if (shootout.ourScore > shootout.opponentScore) {
          updatedMatch.ourScore = activeMatch.ourScore + 1;
        } else {
          updatedMatch.opponentScore = activeMatch.opponentScore + 1;
        }
      }

      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const deleteMatch = useCallback(
    (matchId: string) => {
      const updatedMatches = matches.filter((m) => m.id !== matchId);
      void saveMatches(updatedMatches);

      if (activeMatch && activeMatch.id === matchId) {
        setActiveMatch(null);
      }
    },
    [matches, activeMatch]
  );

  const calculatePlayerStats = useCallback(
    (playerId: string): PlayerStats => {
      const player = players.find((p) => p.id === playerId);
      const playerMatches = matches.filter((m) =>
        m.roster.some((r) => r.playerId === playerId)
      );

      let goals = 0;
      let assists = 0;
      let plusMinus = 0;
      let shots = 0;
      let shotBlocks = 0;
      let shotsWide = 0;
      let possessionGains = 0;
      let possessionLosses = 0;
      let penaltyMinutes = 0;
      let faceoffWins = 0;
      let faceoffLosses = 0;
      let totalRating = 0;

      playerMatches.forEach((match) => {
        let matchGoals = 0;
        let matchAssists = 0;
        let _matchPlusMinus = 0;
        let matchWeightedPlusMinus = 0;
        let matchShots = 0;
        let matchPenaltyMinutes = 0;
        let matchPossessionGains = 0;
        let matchPossessionLosses = 0;
        let matchFaceoffWins = 0;
        let matchFaceoffLosses = 0;
        let matchHighRiskShots = 0;
        let matchShotBlocks = 0;

        match.goals.forEach((goal) => {
          if (goal.scorerId === playerId) {
            goals++;
            matchGoals++;
          }
          if (goal.assists.includes(playerId)) {
            assists++;
            matchAssists++;
          }

          let plusWeight = 1;
          let minusWeight = 1;
          if (goal.gameState === 'pp') {
            plusWeight = 0.7;
            minusWeight = 1.5;
          } else if (goal.gameState === 'sh') {
            plusWeight = 1.5;
            minusWeight = 0.5;
          }

          if (goal.isOurTeam && goal.plusPlayers.includes(playerId)) {
            plusMinus++;
            _matchPlusMinus++;
            matchWeightedPlusMinus += plusWeight;
          }
          if (!goal.isOurTeam && goal.minusPlayers.includes(playerId)) {
            plusMinus--;
            _matchPlusMinus--;
            matchWeightedPlusMinus -= minusWeight;
          }
        });

        match.shots.forEach((shot) => {
          if (shot.playerId === playerId && shot.isOurTeam && shot.result !== 'miss') {
            shots++;
            matchShots++;
            if (shot.shotRisk === 'high') matchHighRiskShots++;
          }
          if (shot.playerId === playerId && shot.isOurTeam && shot.result === 'miss') {
            shotsWide++;
          }
          if (shot.blockedById === playerId) {
            shotBlocks++;
            matchShotBlocks++;
          }
        });

        match.possessions.forEach((poss) => {
          if (poss.playerId === playerId) {
            if (poss.type === 'gain') {
              possessionGains++;
              matchPossessionGains++;
            } else {
              possessionLosses++;
              matchPossessionLosses++;
            }
          }
        });

        match.penalties.forEach((pen) => {
          if (pen.playerId === playerId) {
            penaltyMinutes += pen.minutes;
            matchPenaltyMinutes += pen.minutes;
          }
        });

        if (match.faceoffs) {
          match.faceoffs.forEach((faceoff) => {
            if (faceoff.winnerId === playerId) {
              faceoffWins++;
              matchFaceoffWins++;
            }
            if (faceoff.loserId === playerId) {
              faceoffLosses++;
              matchFaceoffLosses++;
            }
          });
        }

        const matchShotPercentage = matchShots > 0 ? (matchGoals / matchShots) * 100 : 0;
        const { shotsFor: onIceSF, shotsAgainst: onIceSA } = getOnIceShots(match, playerId);
        const matchRating = calculateRating(
          matchGoals,
          matchAssists,
          matchWeightedPlusMinus,
          matchShotPercentage,
          matchPossessionGains,
          matchPossessionLosses,
          matchPenaltyMinutes,
          matchFaceoffWins,
          matchFaceoffLosses,
          matchShots,
          player?.position,
          matchHighRiskShots,
          matchShotBlocks,
          onIceSF,
          onIceSA
        );
        totalRating += matchRating;
      });

      const points = goals + assists;
      const shotPercentage = shots > 0 ? (goals / shots) * 100 : 0;
      const faceoffTotal = faceoffWins + faceoffLosses;
      const faceoffPercentage = faceoffTotal > 0 ? (faceoffWins / faceoffTotal) * 100 : 0;
      const averageRating = playerMatches.length > 0 ? totalRating / playerMatches.length : 0;

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
        shotBlocks,
        shotsWide,
        penaltyMinutes,
        faceoffWins,
        faceoffLosses,
        faceoffPercentage,
        rating: averageRating,
      };
    },
    [matches, players]
  );

  const calculateGoalieStats = useCallback(
    (playerId: string): GoalieStats => {
      const playerMatches = matches.filter((m) =>
        m.roster.some((r) => r.playerId === playerId)
      );

      let shotsAgainst = 0;
      let saves = 0;
      let goalsAgainst = 0;
      let weightedGoalsAgainst = 0;

      const riskStats: Record<ShotRisk, { shots: number; saves: number }> = {
        low: { shots: 0, saves: 0 },
        medium: { shots: 0, saves: 0 },
        high: { shots: 0, saves: 0 },
      };

      playerMatches.forEach((match) => {
        const hasDetailedStats = match.shots.some(s => s.goalieId) || match.goals.some(g => g.goalieId);

        if (hasDetailedStats) {
          const matchGoals = match.goals.filter(g => !g.isOurTeam && g.goalieId === playerId);
          const matchGoalsAgainst = matchGoals.length;
          const matchShotsSaved = match.shots.filter(s => !s.isOurTeam && s.goalieId === playerId && s.result === 'save').length;

          goalsAgainst += matchGoalsAgainst;
          saves += matchShotsSaved;
          shotsAgainst += matchGoalsAgainst + matchShotsSaved;

          match.shots.filter(s => !s.isOurTeam && s.goalieId === playerId && s.result === 'save').forEach((s) => {
            const risk = s.shotRisk || 'medium';
            riskStats[risk].shots++;
            riskStats[risk].saves++;
          });

          matchGoals.forEach((g) => {
            const risk = g.shotRisk || 'medium';
            riskStats[risk].shots++;

            let weight = 1;
            if (g.gameState === 'sh') weight = 0.5;
            else if (g.gameState === 'pp') weight = 1.3;

            if (g.shotRisk === 'high') weight *= 0.8;
            else if (g.shotRisk === 'low') weight *= 1.3;

            weightedGoalsAgainst += weight;
          });
        } else {
          const goaliesInRoster = match.roster.filter(r =>
            players.find(p => p.id === r.playerId)?.position === 'goalie'
          );

          if (goaliesInRoster.length === 1 && goaliesInRoster[0].playerId === playerId) {
            const opponentShots = match.opponentShots;
            const opponentGoals = match.opponentScore;
            shotsAgainst += opponentShots;
            goalsAgainst += opponentGoals;
            saves += opponentShots - opponentGoals;
            weightedGoalsAgainst += opponentGoals;
          } else if (match.activeGoalieId === playerId) {
            const opponentShots = match.opponentShots;
            const opponentGoals = match.opponentScore;
            shotsAgainst += opponentShots;
            goalsAgainst += opponentGoals;
            saves += opponentShots - opponentGoals;
            weightedGoalsAgainst += opponentGoals;
          }
        }
      });

      const savePercentage = shotsAgainst > 0 ? (saves / shotsAgainst) * 100 : 0;

      let rating = 6.0;
      if (shotsAgainst > 0) {
        const savesBonus = saves * 0.02;
        const goalsAgainstPenalty = weightedGoalsAgainst * 0.16;
        rating = rating + savesBonus - goalsAgainstPenalty;
      }

      const saveByRisk = {
        low: { shots: riskStats.low.shots, saves: riskStats.low.saves, pct: riskStats.low.shots > 0 ? (riskStats.low.saves / riskStats.low.shots) * 100 : 0 },
        medium: { shots: riskStats.medium.shots, saves: riskStats.medium.saves, pct: riskStats.medium.shots > 0 ? (riskStats.medium.saves / riskStats.medium.shots) * 100 : 0 },
        high: { shots: riskStats.high.shots, saves: riskStats.high.saves, pct: riskStats.high.shots > 0 ? (riskStats.high.saves / riskStats.high.shots) * 100 : 0 },
      };

      return {
        playerId,
        gamesPlayed: playerMatches.length,
        shotsAgainst,
        saves,
        goalsAgainst,
        savePercentage,
        rating: Math.min(10, Math.max(0, rating)),
        saveByRisk,
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
          let mGoals = 0;
          let mAssists = 0;
          let mPlusMinus = 0;
          let mWeightedPM = 0;
          let mShots = 0;
          let mPenaltyMinutes = 0;
          let mHighRisk = 0;

          match.goals.forEach((goal) => {
            if (goal.scorerId === playerId) mGoals++;
            if (goal.assists.includes(playerId)) mAssists++;

            let pw = 1;
            let mw = 1;
            if (goal.gameState === 'pp') { pw = 0.7; mw = 1.5; }
            else if (goal.gameState === 'sh') { pw = 1.5; mw = 0.5; }

            if (goal.isOurTeam && goal.plusPlayers.includes(playerId)) { mPlusMinus++; mWeightedPM += pw; }
            if (!goal.isOurTeam && goal.minusPlayers.includes(playerId)) { mPlusMinus--; mWeightedPM -= mw; }
          });

          let mShotBlocks = 0;
          match.shots.forEach((shot) => {
            if (shot.playerId === playerId && shot.isOurTeam && shot.result !== 'miss') {
              mShots++;
              if (shot.shotRisk === 'high') mHighRisk++;
            }
            if (shot.blockedById === playerId) mShotBlocks++;
          });

          match.penalties.forEach((pen) => {
            if (pen.playerId === playerId) mPenaltyMinutes += pen.minutes;
          });

          const shotPercentage = mShots > 0 ? (mGoals / mShots) * 100 : 0;

          let possGain = 0;
          let possLoss = 0;
          match.possessions.forEach((poss) => {
            if (poss.playerId === playerId) {
              if (poss.type === 'gain') possGain++;
              else possLoss++;
            }
          });

          let foW = 0;
          let foL = 0;
          if (match.faceoffs) {
            match.faceoffs.forEach((faceoff) => {
              if (faceoff.winnerId === playerId) foW++;
              if (faceoff.loserId === playerId) foL++;
            });
          }

          const player = players.find(p => p.id === playerId);
          const { shotsFor: onIceSF, shotsAgainst: onIceSA } = getOnIceShots(match, playerId);
          const rating = calculateRating(
            mGoals,
            mAssists,
            mWeightedPM,
            shotPercentage,
            possGain,
            possLoss,
            mPenaltyMinutes,
            foW,
            foL,
            mShots,
            player?.position,
            mHighRisk,
            mShotBlocks,
            onIceSF,
            onIceSA
          );

          return {
            matchId: match.id,
            date: match.date,
            opponentName: match.opponentName,
            goals: mGoals,
            assists: mAssists,
            plusMinus: mPlusMinus,
            penaltyMinutes: mPenaltyMinutes,
            shots: mShots,
            rating,
            ourScore: match.ourScore,
            opponentScore: match.opponentScore,
          };
        })
        .sort((a, b) => b.date - a.date);
    },
    [matches, players]
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

  const updateMatchNotes = useCallback(
    (matchId: string, notes: string) => {
      const updatedMatches = matches.map((m) =>
        m.id === matchId ? { ...m, notes } : m
      );
      void saveMatches(updatedMatches);
      if (activeMatch && activeMatch.id === matchId) {
        setActiveMatch({ ...activeMatch, notes });
      }
    },
    [matches, activeMatch]
  );

  const updateMatchGoal = useCallback(
    (matchId: string, goalId: string, updates: { scorerId?: string; assists?: string[] }) => {
      const matchIndex = matches.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) {
        console.error('updateMatchGoal: Match not found', matchId);
        return;
      }

      const match = matches[matchIndex];
      const goalIndex = match.goals.findIndex((g) => g.id === goalId);
      if (goalIndex === -1) {
        console.error('updateMatchGoal: Goal not found', goalId);
        return;
      }

      const oldGoal = match.goals[goalIndex];
      const updatedGoal = { ...oldGoal };

      if (updates.scorerId !== undefined) {
        updatedGoal.scorerId = updates.scorerId;
      }
      if (updates.assists !== undefined) {
        updatedGoal.assists = updates.assists;
      }

      const updatedGoals = [...match.goals];
      updatedGoals[goalIndex] = updatedGoal;

      let updatedShots = [...match.shots];
      if (updates.scorerId !== undefined && updates.scorerId !== oldGoal.scorerId) {
        const goalTimestamp = oldGoal.timestamp;
        const goalShotIndex = updatedShots.findIndex(
          (s) =>
            s.result === 'goal' &&
            s.isOurTeam === oldGoal.isOurTeam &&
            s.playerId === oldGoal.scorerId &&
            Math.abs(s.timestamp - goalTimestamp) < 5000
        );
        if (goalShotIndex !== -1) {
          updatedShots[goalShotIndex] = {
            ...updatedShots[goalShotIndex],
            playerId: updates.scorerId,
          };
          console.log('Updated shot taker for goal:', goalId, 'new shooter:', updates.scorerId);
        } else {
          const fallbackIndex = updatedShots.findIndex(
            (s) =>
              s.result === 'goal' &&
              s.isOurTeam === oldGoal.isOurTeam &&
              s.period === oldGoal.period &&
              s.playerId === oldGoal.scorerId
          );
          if (fallbackIndex !== -1) {
            updatedShots[fallbackIndex] = {
              ...updatedShots[fallbackIndex],
              playerId: updates.scorerId,
            };
            console.log('Updated shot taker (fallback) for goal:', goalId);
          }
        }
      }

      const updatedMatch = {
        ...match,
        goals: updatedGoals,
        shots: updatedShots,
      };

      const updatedMatches = matches.map((m) =>
        m.id === matchId ? updatedMatch : m
      );

      void saveMatches(updatedMatches);
      if (activeMatch && activeMatch.id === matchId) {
        setActiveMatch(updatedMatch);
      }

      console.log('Goal updated:', goalId, 'changes:', updates);
    },
    [matches, activeMatch]
  );

  const calculateSeasonStats = useCallback((): SeasonStats => {
    const completed = matches.filter((m) => !m.isActive).sort((a, b) => a.date - b.date);
    const gp = completed.length;

    let wins = 0, losses = 0, draws = 0;
    let goalsFor = 0, goalsAgainst = 0;
    let shotsFor = 0, shotsAgainst = 0;
    let totalPIM = 0;
    let foWins = 0, foLosses = 0;
    let ppGoals = 0, ppOpportunities = 0;
    let shGoalsAgainst = 0, shOpportunities = 0;
    const periodMap = new Map<number, { gf: number; ga: number }>();
    let currentStreak: { type: 'W' | 'L' | 'D'; count: number } = { type: 'W', count: 0 };
    let longestWin = 0;
    let runningWin = 0;

    completed.forEach((m) => {
      const w = m.ourScore > m.opponentScore;
      const l = m.ourScore < m.opponentScore;
      if (w) { wins++; runningWin++; longestWin = Math.max(longestWin, runningWin); }
      else { runningWin = 0; }
      if (l) losses++;
      if (!w && !l) draws++;

      goalsFor += m.ourScore;
      goalsAgainst += m.opponentScore;
      shotsFor += m.ourShots;
      shotsAgainst += m.opponentShots;
      totalPIM += m.penalties.reduce((s, p) => s + p.minutes, 0);

      (m.faceoffs || []).forEach((f) => {
        if (m.roster.some((r) => r.playerId === f.winnerId)) foWins++;
        else foLosses++;
      });

      m.goals.forEach((g) => {
        const p = g.period || 1;
        const existing = periodMap.get(p) || { gf: 0, ga: 0 };
        if (g.isOurTeam) existing.gf++;
        else existing.ga++;
        periodMap.set(p, existing);

        if (g.gameState === 'pp' && g.isOurTeam) ppGoals++;
        if (g.gameState === 'sh' && !g.isOurTeam) shGoalsAgainst++;
      });

      const matchPPEvents = m.goals.filter(g => g.gameState === 'pp' || g.gameState === 'sh');
      const uniquePPTimestamps = new Set(m.shots.filter(s => s.gameState === 'pp' && s.isOurTeam).map(s => s.gameState));
      if (uniquePPTimestamps.size > 0 || matchPPEvents.some(g => g.gameState === 'pp')) ppOpportunities++;
      const uniqueSHTimestamps = new Set(m.shots.filter(s => s.gameState === 'sh' && !s.isOurTeam).map(s => s.gameState));
      if (uniqueSHTimestamps.size > 0 || matchPPEvents.some(g => g.gameState === 'sh')) shOpportunities++;
    });

    if (completed.length > 0) {
      const last = completed[completed.length - 1];
      const lastResult = last.ourScore > last.opponentScore ? 'W' as const : last.ourScore < last.opponentScore ? 'L' as const : 'D' as const;
      currentStreak = { type: lastResult, count: 1 };
      for (let i = completed.length - 2; i >= 0; i--) {
        const r = completed[i].ourScore > completed[i].opponentScore ? 'W' as const : completed[i].ourScore < completed[i].opponentScore ? 'L' as const : 'D' as const;
        if (r === lastResult) currentStreak.count++;
        else break;
      }
    }

    const last5Results = completed.slice(-5).map((m): 'W' | 'L' | 'D' =>
      m.ourScore > m.opponentScore ? 'W' : m.ourScore < m.opponentScore ? 'L' : 'D'
    );

    const periodScoring = Array.from(periodMap.entries())
      .filter(([p]) => p <= 3)
      .sort(([a], [b]) => a - b)
      .map(([period, data]) => ({ period, goalsFor: data.gf, goalsAgainst: data.ga }));

    for (let p = 1; p <= 3; p++) {
      if (!periodScoring.find(ps => ps.period === p)) {
        periodScoring.push({ period: p, goalsFor: 0, goalsAgainst: 0 });
      }
    }
    periodScoring.sort((a, b) => a.period - b.period);

    const foTotal = foWins + foLosses;

    return {
      gamesPlayed: gp,
      wins,
      losses,
      draws,
      winPercentage: gp > 0 ? (wins / gp) * 100 : 0,
      goalsFor,
      goalsAgainst,
      goalDifferential: goalsFor - goalsAgainst,
      avgGoalsFor: gp > 0 ? goalsFor / gp : 0,
      avgGoalsAgainst: gp > 0 ? goalsAgainst / gp : 0,
      shotsFor,
      shotsAgainst,
      shootingPercentage: shotsFor > 0 ? (goalsFor / shotsFor) * 100 : 0,
      totalPenaltyMinutes: totalPIM,
      faceoffWins: foWins,
      faceoffLosses: foLosses,
      faceoffPercentage: foTotal > 0 ? (foWins / foTotal) * 100 : 0,
      currentStreak,
      longestWinStreak: longestWin,
      periodScoring,
      last5: last5Results,
      ppGoals,
      ppOpportunities,
      shGoalsAgainst,
      shOpportunities,
    };
  }, [matches]);

  const setMatchLines = useCallback(
    (lines: Line[]) => {
      if (!activeMatch) return;
      const updatedMatch = { ...activeMatch, lines };
      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );
      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const startShift = useCallback(
    (lineId: string) => {
      if (!activeMatch) return;
      const now = Date.now();
      const currentShifts = activeMatch.shifts || [];
      const endedShifts = currentShifts.map((s) =>
        !s.endTime ? { ...s, endTime: now } : s
      );
      const newShift: ShiftEntry = {
        lineId,
        startTime: now,
        period: activeMatch.currentPeriod || 1,
      };
      const updatedMatch = {
        ...activeMatch,
        shifts: [...endedShifts, newShift],
        activeLineId: lineId,
      };
      const updatedMatches = matches.map((m) =>
        m.id === activeMatch.id ? updatedMatch : m
      );
      void saveMatches(updatedMatches);
      setActiveMatch(updatedMatch);
    },
    [activeMatch, matches]
  );

  const endShift = useCallback(() => {
    if (!activeMatch) return;
    const now = Date.now();
    const currentShifts = activeMatch.shifts || [];
    const endedShifts = currentShifts.map((s) =>
      !s.endTime ? { ...s, endTime: now } : s
    );
    const updatedMatch = {
      ...activeMatch,
      shifts: endedShifts,
      activeLineId: undefined,
    };
    const updatedMatches = matches.map((m) =>
      m.id === activeMatch.id ? updatedMatch : m
    );
    void saveMatches(updatedMatches);
    setActiveMatch(updatedMatch);
  }, [activeMatch, matches]);

  const getLineTOI = useCallback(
    (lineId: string): number => {
      if (!activeMatch) return 0;
      const shifts = activeMatch.shifts || [];
      const now = Date.now();
      return shifts
        .filter((s) => s.lineId === lineId)
        .reduce((total, s) => total + ((s.endTime || now) - s.startTime), 0);
    },
    [activeMatch]
  );

  const calculatePPPKStats = useCallback(() => {
    const completed = matches.filter((m) => !m.isActive);
    const ppData: { matchId: string; date: number; opponent: string; goals: number; opportunities: number; shots: number; faceoffWins: number; faceoffTotal: number }[] = [];
    const pkData: { matchId: string; date: number; opponent: string; goalsAgainst: number; opportunities: number; shots: number; faceoffWins: number; faceoffTotal: number }[] = [];

    completed.forEach((m) => {
      const ppGoals = m.goals.filter(g => g.gameState === 'pp' && g.isOurTeam).length;
      const ppShots = m.shots.filter(s => s.gameState === 'pp' && s.isOurTeam).length;
      const hasPP = ppGoals > 0 || ppShots > 0 || m.shots.some(s => s.gameState === 'pp');

      const shGA = m.goals.filter(g => g.gameState === 'sh' && !g.isOurTeam).length;
      const shShots = m.shots.filter(s => s.gameState === 'sh' && !s.isOurTeam).length;
      const hasSH = shGA > 0 || shShots > 0 || m.shots.some(s => s.gameState === 'sh');

      const ppFO = (m.faceoffs || []).filter(f => f.gameState === 'pp');
      const ppFOWins = ppFO.filter(f => m.roster.some(r => r.playerId === f.winnerId)).length;

      const shFO = (m.faceoffs || []).filter(f => f.gameState === 'sh');
      const shFOWins = shFO.filter(f => m.roster.some(r => r.playerId === f.winnerId)).length;

      if (hasPP) {
        ppData.push({
          matchId: m.id,
          date: m.date,
          opponent: m.opponentName,
          goals: ppGoals,
          opportunities: 1,
          shots: ppShots,
          faceoffWins: ppFOWins,
          faceoffTotal: ppFO.length,
        });
      }
      if (hasSH) {
        pkData.push({
          matchId: m.id,
          date: m.date,
          opponent: m.opponentName,
          goalsAgainst: shGA,
          opportunities: 1,
          shots: shShots,
          faceoffWins: shFOWins,
          faceoffTotal: shFO.length,
        });
      }
    });

    const totalPPGoals = ppData.reduce((s, d) => s + d.goals, 0);
    const totalPPOpp = ppData.length;
    const totalPKGA = pkData.reduce((s, d) => s + d.goalsAgainst, 0);
    const totalPKOpp = pkData.length;

    return {
      pp: {
        games: ppData,
        totalGoals: totalPPGoals,
        totalOpportunities: totalPPOpp,
        percentage: totalPPOpp > 0 ? (totalPPGoals / totalPPOpp) * 100 : 0,
      },
      pk: {
        games: pkData,
        totalGoalsAgainst: totalPKGA,
        totalOpportunities: totalPKOpp,
        percentage: totalPKOpp > 0 ? ((totalPKOpp - totalPKGA) / totalPKOpp) * 100 : 0,
      },
    };
  }, [matches]);

  const exportSeasonCSV = useCallback((): string => {
    const completed = matches.filter((m) => !m.isActive);
    const skaters = players.filter(p => p.position !== 'goalie');
    const goalies = players.filter(p => p.position === 'goalie');

    let csv = 'SEASON STATS EXPORT\n\n';

    csv += 'MATCH RESULTS\n';
    csv += 'Date,Opponent,Our Score,Opp Score,Result,Our Shots,Opp Shots,Ended As\n';
    completed.forEach((m) => {
      const d = new Date(m.date).toLocaleDateString();
      const result = m.ourScore > m.opponentScore ? 'W' : m.ourScore < m.opponentScore ? 'L' : 'D';
      csv += `${d},${m.opponentName},${m.ourScore},${m.opponentScore},${result},${m.ourShots},${m.opponentShots},${m.endedAs || 'regulation'}\n`;
    });

    csv += '\nPLAYER STATS\n';
    csv += 'Name,#,Pos,GP,G,A,P,+/-,S,S%,BLK,Wide,PIM,FO%,Rating\n';
    skaters.forEach((p) => {
      const s = calculatePlayerStats(p.id);
      csv += `${p.name},${p.jerseyNumber},${p.position},${s.gamesPlayed},${s.goals},${s.assists},${s.points},${s.plusMinus},${s.shots},${s.shotPercentage.toFixed(1)},${s.shotBlocks},${s.shotsWide},${s.penaltyMinutes},${s.faceoffPercentage.toFixed(1)},${s.rating.toFixed(1)}\n`;
    });

    csv += '\nGOALIE STATS\n';
    csv += 'Name,#,GP,SA,SV,GA,SV%,Rating,Low SV%,Med SV%,High SV%\n';
    goalies.forEach((p) => {
      const s = calculateGoalieStats(p.id);
      const lr = s.saveByRisk?.low;
      const mr = s.saveByRisk?.medium;
      const hr = s.saveByRisk?.high;
      csv += `${p.name},${p.jerseyNumber},${s.gamesPlayed},${s.shotsAgainst},${s.saves},${s.goalsAgainst},${s.savePercentage.toFixed(1)},${s.rating.toFixed(1)},${lr ? lr.pct.toFixed(1) : 'N/A'},${mr ? mr.pct.toFixed(1) : 'N/A'},${hr ? hr.pct.toFixed(1) : 'N/A'}\n`;
    });

    return csv;
  }, [matches, players, calculatePlayerStats, calculateGoalieStats]);

  return useMemo(() => ({
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
    updateGoalShotLocation,
    addPenalty,
    addPossession,
    addFaceoff,
    nextPeriod,
    endMatch,
    deleteMatch,
    setGameState,
    getPPSHSummary,
    updateShootout,
    undoLastAction,
    updateMatchNotes,
    updateMatchGoal,
    calculatePlayerStats,
    calculateGoalieStats,
    calculatePlayerMatchHistory,
    calculateOpponentStats,
    calculateSeasonStats,
    setMatchLines,
    startShift,
    endShift,
    getLineTOI,
    calculatePPPKStats,
    exportSeasonCSV,
  }), [
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
    updateGoalShotLocation,
    addPenalty,
    addPossession,
    addFaceoff,
    nextPeriod,
    endMatch,
    deleteMatch,
    setGameState,
    getPPSHSummary,
    updateShootout,
    undoLastAction,
    updateMatchNotes,
    updateMatchGoal,
    calculatePlayerStats,
    calculateGoalieStats,
    calculatePlayerMatchHistory,
    calculateOpponentStats,
    calculateSeasonStats,
    setMatchLines,
    startShift,
    endShift,
    getLineTOI,
    calculatePPPKStats,
    exportSeasonCSV,
  ]);
});

function getOnIceShots(match: Match, playerId: string): { shotsFor: number; shotsAgainst: number } {
  let shotsFor = 0;
  let shotsAgainst = 0;

  if (!match.lines || !match.shifts || match.shifts.length === 0) {
    return { shotsFor, shotsAgainst };
  }

  const playerLineIds = match.lines
    .filter(l => l.playerIds.includes(playerId))
    .map(l => l.id);

  if (playerLineIds.length === 0) return { shotsFor, shotsAgainst };

  const playerShifts = match.shifts.filter(s => playerLineIds.includes(s.lineId));
  if (playerShifts.length === 0) return { shotsFor, shotsAgainst };

  match.shots.forEach(shot => {
    const duringShift = playerShifts.some(s => {
      const end = s.endTime ?? Date.now();
      return shot.timestamp >= s.startTime && shot.timestamp <= end;
    });
    if (duringShift) {
      if (shot.isOurTeam) shotsFor++;
      else shotsAgainst++;
    }
  });

  return { shotsFor, shotsAgainst };
}

function calculateRating(
  goals: number,
  assists: number,
  weightedPlusMinus: number,
  shotPercentage: number,
  possessionGains: number,
  possessionLosses: number,
  penaltyMinutes: number,
  faceoffWins: number,
  faceoffLosses: number,
  shots: number,
  position?: string,
  highRiskShots?: number,
  shotBlocks?: number,
  onIceShotsFor?: number,
  onIceShotsAgainst?: number
): number {
  if (position === 'goalie') {
    return 6.0;
  }
  let rating = 6.0;

  const points = goals + assists;
  if (points >= 4) rating += 2.5;
  else if (points >= 3) rating += 2.0;
  else if (points >= 2) rating += 1.5;
  else if (points >= 1) rating += 0.8;
  else if (points === 0) rating -= 0.3;

  if (weightedPlusMinus >= 3) rating += 1.5;
  else if (weightedPlusMinus >= 2) rating += 1.0;
  else if (weightedPlusMinus >= 1) rating += 0.5;
  else if (weightedPlusMinus >= 0) rating += 0;
  else if (weightedPlusMinus >= -1) rating -= 0.5;
  else if (weightedPlusMinus >= -2) rating -= 1.2;
  else rating -= 2.0;

  if (shots > 0) {
    if (shotPercentage >= 30) rating += 0.8;
    else if (shotPercentage >= 20) rating += 0.5;
    else if (shotPercentage >= 10) rating += 0.2;
    else if (shotPercentage < 10 && shots >= 5) rating -= 0.3;
  }

  if (highRiskShots && highRiskShots > 0) {
    const highRiskRatio = highRiskShots / shots;
    if (highRiskRatio >= 0.5) rating += 0.4;
    else if (highRiskRatio >= 0.3) rating += 0.2;
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

  if (shotBlocks && shotBlocks > 0) {
    if (shotBlocks >= 4) rating += 0.6;
    else if (shotBlocks >= 2) rating += 0.3;
    else rating += 0.15;
  }

  const sf = onIceShotsFor ?? 0;
  const sa = onIceShotsAgainst ?? 0;
  const totalOnIce = sf + sa;
  if (totalOnIce >= 4) {
    const corsiPct = sf / totalOnIce;
    if (corsiPct >= 0.65) rating += 0.6;
    else if (corsiPct >= 0.55) rating += 0.3;
    else if (corsiPct >= 0.45) rating += 0.0;
    else if (corsiPct >= 0.35) rating -= 0.3;
    else rating -= 0.5;
  }

  return Math.min(10, Math.max(0, rating));
}
