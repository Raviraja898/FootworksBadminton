export interface Player {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Match {
  id: string;
  tournamentId: string; // "current" or a tournament ID or "historical"
  team1: string[]; // Player IDs (1 or 2 players)
  team2: string[]; // Player IDs (1 or 2 players)
  score1: number;
  score2: number;
  status: "pending" | "live" | "completed";
  date: string;
  round?: number;
  court?: string;
  stage?: "round-robin" | "semifinal" | "final";
  games?: { score1: number; score2: number }[];
  gamesWon1?: number;
  gamesWon2?: number;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  winner1Id: string;
  winner2Id?: string; // For doubles
  runnerUp1Id?: string;
  runnerUp2Id?: string;
  scoreSummary?: string; // e.g., "21-18, 21-19"
  isHistorical: boolean;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  pointsScored: number;
  pointsConceded: number;
  scoreDiff: number;
  winRate: number;
}

export interface CompletedTournamentResults {
  winnerTeamName: string;
  winnerPlayers: string[];
  runnerUpTeamName: string;
  runnerUpPlayers: string[];
  thirdTeamName: string;
  thirdPlayers: string[];
  scoreSummary: string;
  date: string;
}
