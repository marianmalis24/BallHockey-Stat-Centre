export type PlayerPosition = 'forward' | 'defense' | 'goalie';
export type ShotRisk = 'low' | 'medium' | 'high';
export type GameState = 'even' | 'pp' | 'sh';
export type FaceoffZone = 'dzone' | 'ozone' | 'neutral';

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: PlayerPosition;
  isInjured?: boolean;
  injuryNote?: string;
  expectedReturn?: number;
}

export interface ShotLocation {
  x: number;
  y: number;
}

export interface Shot {
  id: string;
  playerId?: string;
  timestamp: number;
  location?: ShotLocation;
  isOurTeam: boolean;
  onGoal: boolean;
  result: 'goal' | 'save' | 'miss' | 'blocked';
  goalieId?: string;
  blockedById?: string;
  period: number;
  shotRisk?: ShotRisk;
  gameState?: GameState;
}

export interface Goal {
  id: string;
  scorerId: string;
  assists: string[];
  plusPlayers: string[];
  minusPlayers: string[];
  timestamp: number;
  isOurTeam: boolean;
  goalieId?: string;
  period: number;
  shotRisk?: ShotRisk;
  gameState?: GameState;
  isEmptyNet?: boolean;
}

export interface FaceoffEvent {
  id: string;
  winnerId: string;
  loserId: string;
  timestamp: number;
  period: number;
  gameState?: GameState;
  zone?: FaceoffZone;
}

export interface PenaltyEvent {
  id: string;
  playerId: string;
  minutes: number;
  timestamp: number;
  infraction: string;
  period: number;
  gameState?: GameState;
}

export interface PossessionEvent {
  id: string;
  playerId?: string;
  timestamp: number;
  type: 'gain' | 'loss';
  period: number;
  gameState?: GameState;
}

export interface MatchPlayer {
  playerId: string;
  isPlaying: boolean;
}

export interface ShootoutAttempt {
  playerId?: string;
  result: 'goal' | 'no_goal';
  isOurTeam: boolean;
  round: number;
}

export interface ShootoutData {
  attempts: ShootoutAttempt[];
  totalRounds: number;
  startingTeam: 'us' | 'them';
  ourScore: number;
  opponentScore: number;
  completed: boolean;
}

export type ActionType = 'goal' | 'shot' | 'penalty' | 'possession' | 'faceoff';

export interface Line {
  id: string;
  name: string;
  playerIds: string[];
  type: 'forward' | 'defense';
}

export interface ShiftEntry {
  lineId: string;
  startTime: number;
  endTime?: number;
  period: number;
}

export interface UndoAction {
  type: ActionType;
  description: string;
  snapshot: Omit<Match, 'undoStack'>;
}

export interface Match {
  id: string;
  date: number;
  ourScore: number;
  opponentScore: number;
  ourShots: number;
  opponentShots: number;
  roster: MatchPlayer[];
  goals: Goal[];
  shots: Shot[];
  penalties: PenaltyEvent[];
  possessions: PossessionEvent[];
  faceoffs: FaceoffEvent[];
  isActive: boolean;
  opponentName: string;
  activeGoalieId: string;
  currentPeriod: number;
  centers: string[];
  gameState?: GameState;
  isOvertime?: boolean;
  shootout?: ShootoutData;
  endedAs?: 'regulation' | 'overtime' | 'shootout' | 'draw';
  ppshStartTimestamp?: number;
  notes?: string;
  undoStack?: UndoAction[];
  lines?: Line[];
  shifts?: ShiftEntry[];
  activeLineId?: string;
  shareCode?: string;
}

export interface FaceoffZoneStats {
  wins: number;
  losses: number;
  pct: number;
}

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  shots: number;
  shotPercentage: number;
  possessionGains: number;
  possessionLosses: number;
  shotBlocks: number;
  shotsWide: number;
  penaltyMinutes: number;
  faceoffWins: number;
  faceoffLosses: number;
  faceoffPercentage: number;
  rating: number;
  faceoffByZone?: {
    dzone: FaceoffZoneStats;
    ozone: FaceoffZoneStats;
    neutral: FaceoffZoneStats;
  };
}

export interface GoalieStats {
  playerId: string;
  gamesPlayed: number;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  savePercentage: number;
  rating: number;
  saveByRisk?: {
    low: { shots: number; saves: number; pct: number };
    medium: { shots: number; saves: number; pct: number };
    high: { shots: number; saves: number; pct: number };
  };
}

export interface PlayerMatchHistory {
  matchId: string;
  date: number;
  opponentName: string;
  goals: number;
  assists: number;
  plusMinus: number;
  penaltyMinutes: number;
  shots: number;
  rating: number;
  ourScore: number;
  opponentScore: number;
}

export interface OpponentStats {
  opponentName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface SeasonStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  shootingPercentage: number;
  totalPenaltyMinutes: number;
  faceoffWins: number;
  faceoffLosses: number;
  faceoffPercentage: number;
  currentStreak: { type: 'W' | 'L' | 'D'; count: number };
  longestWinStreak: number;
  periodScoring: { period: number; goalsFor: number; goalsAgainst: number }[];
  last5: ('W' | 'L' | 'D')[];
  ppGoals: number;
  ppOpportunities: number;
  shGoalsAgainst: number;
  shOpportunities: number;
}
