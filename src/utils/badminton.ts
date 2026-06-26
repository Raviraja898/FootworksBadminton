import { Player, Match, PlayerStats } from "../types";

/**
 * Calculates badminton statistics for all players based on the match history.
 */
export function calculateStatistics(players: Player[], matches: Match[]): PlayerStats[] {
  const completedMatches = matches.filter((m) => m.status === "completed");

  const statsMap: Record<string, PlayerStats> = {};

  // Initialize stats for all players
  players.forEach((player) => {
    statsMap[player.id] = {
      playerId: player.id,
      playerName: player.name,
      gamesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      pointsScored: 0,
      pointsConceded: 0,
      scoreDiff: 0,
      winRate: 0,
    };
  });

  // Aggregate stats from completed matches
  completedMatches.forEach((match) => {
    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;

    const team1Won = score1 > score2;
    const team2Won = score2 > score1;

    // Process Team 1
    match.team1.forEach((pId) => {
      const stats = statsMap[pId];
      if (stats) {
        stats.gamesPlayed += 1;
        stats.pointsScored += score1;
        stats.pointsConceded += score2;
        if (team1Won) {
          stats.matchesWon += 1;
        } else if (team2Won) {
          stats.matchesLost += 1;
        }
      }
    });

    // Process Team 2
    match.team2.forEach((pId) => {
      const stats = statsMap[pId];
      if (stats) {
        stats.gamesPlayed += 1;
        stats.pointsScored += score2;
        stats.pointsConceded += score1;
        if (team2Won) {
          stats.matchesWon += 1;
        } else if (team1Won) {
          stats.matchesLost += 1;
        }
      }
    });
  });

  // Calculate final ratios
  return Object.values(statsMap).map((stats) => {
    const scoreDiff = stats.pointsScored - stats.pointsConceded;
    const winRate =
      stats.gamesPlayed > 0
        ? Math.round((stats.matchesWon / stats.gamesPlayed) * 100)
        : 0;

    return {
      ...stats,
      scoreDiff,
      winRate,
    };
  });
}

/**
 * Shuffles an array randomly.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Struct representing a team
 */
export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

/**
 * Generates round robin pairings using the circle rotation method.
 * Handles both odd and even number of items correctly.
 */
export function generateRoundRobinPairings<T>(items: T[]): [T, T][] {
  const list = [...items];
  const pairings: [T, T][] = [];

  if (list.length < 2) return pairings;

  // If odd, add a dummy element for BYE matches
  const hasBye = list.length % 2 !== 0;
  if (hasBye) {
    list.push(null as any);
  }

  const numElements = list.length;
  const rounds = numElements - 1;
  const half = numElements / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[numElements - 1 - i];

      // Exclude BYE pairings
      if (home !== null && away !== null) {
        pairings.push([home, away]);
      }
    }

    // Rotate elements, keeping the first element fixed
    const last = list.pop()!;
    list.splice(1, 0, last);
  }

  return pairings;
}

/**
 * Generates double round robin pairings (each team plays twice with every other team).
 */
export function generateDoubleRoundRobinPairings<T>(items: T[]): [T, T][] {
  const single = generateRoundRobinPairings(items);
  const doublePairings: [T, T][] = [];
  
  // Leg 1
  doublePairings.push(...single);
  
  // Leg 2 (swap home/away)
  single.forEach(([home, away]) => {
    doublePairings.push([away, home]);
  });
  
  return doublePairings;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  playerIds: string[];
  played: number;
  won: number;
  lost: number;
  pointsScored: number;
  pointsConceded: number;
  diff: number;
}

/**
 * Calculates round-robin standings for teams.
 * Teams are ranked by:
 * 1. Matches Won
 * 2. Points Difference (pointsScored - pointsConceded)
 * 3. Total Points Scored
 */
export function calculateTeamStandings(teams: Team[], matches: Match[]): TeamStats[] {
  const completedMatches = matches.filter((m) => m.status === "completed" && m.stage === "round-robin");
  const statsMap: Record<string, TeamStats> = {};

  teams.forEach((t) => {
    statsMap[t.id] = {
      teamId: t.id,
      teamName: t.name,
      playerIds: t.playerIds,
      played: 0,
      won: 0,
      lost: 0,
      pointsScored: 0,
      pointsConceded: 0,
      diff: 0,
    };
  });

  completedMatches.forEach((match) => {
    // Find matching teams based on matching player IDs
    const team1 = teams.find((t) =>
      t.playerIds.length === match.team1.length &&
      t.playerIds.every((id) => match.team1.includes(id))
    );
    const team2 = teams.find((t) =>
      t.playerIds.length === match.team2.length &&
      t.playerIds.every((id) => match.team2.includes(id))
    );

    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;

    if (team1) {
      const stats = statsMap[team1.id];
      if (stats) {
        stats.played += 1;
        stats.pointsScored += score1;
        stats.pointsConceded += score2;
        if (score1 > score2) stats.won += 1;
        else if (score2 > score1) stats.lost += 1;
      }
    }

    if (team2) {
      const stats = statsMap[team2.id];
      if (stats) {
        stats.played += 1;
        stats.pointsScored += score2;
        stats.pointsConceded += score1;
        if (score2 > score1) stats.won += 1;
        else if (score1 > score2) stats.lost += 1;
      }
    }
  });

  return Object.values(statsMap)
    .map((stats) => ({
      ...stats,
      diff: stats.pointsScored - stats.pointsConceded,
    }))
    .sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return b.pointsScored - a.pointsScored;
    });
}
