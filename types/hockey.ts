export type PlayerPosition = 'forward' | 'defense' | 'goalie';

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: PlayerPosition;
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
  period: number;
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
}

export interface FaceoffEvent {
  id: string;
  winnerId: string;
  loserId: string;
  timestamp: number;
  period: number;
}

export interface PenaltyEvent {
  id: string;
  playerId: string;
  minutes: number;
  timestamp: number;
  infraction: string;
  period: number;
}

export interface PossessionEvent {
  id: string;
  playerId?: string;
  timestamp: number;
  type: 'gain' | 'loss';
  period: number;
}

export interface MatchPlayer {
  playerId: string;
  isPlaying: boolean;
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
  penaltyMinutes: number;
  faceoffWins: number;
  faceoffLosses: number;
  faceoffPercentage: number;
  rating: number;
}

export interface GoalieStats {
  playerId: string;
  gamesPlayed: number;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  savePercentage: number;
  rating: number;
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
