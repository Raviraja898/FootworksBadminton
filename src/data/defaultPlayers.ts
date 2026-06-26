import { Player, Tournament, Match } from "../types";

export const DEFAULT_PLAYERS: Player[] = [
  { id: "p1", name: "Sarfaraz", joinedAt: "2026-01-10" },
  { id: "p2", name: "Ravi", joinedAt: "2026-01-12" },
  { id: "p3", name: "Krishna", joinedAt: "2026-01-15" },
  { id: "p4", name: "Sajja", joinedAt: "2026-02-01" },
  { id: "p5", name: "Bhaskar", joinedAt: "2026-02-10" },
  { id: "p6", name: "Dileep", joinedAt: "2026-02-20" },
  { id: "p7", name: "Jeevan", joinedAt: "2026-03-05" },
  { id: "p8", name: "Parthiban", joinedAt: "2026-03-12" },
  { id: "p9", name: "Pulin", joinedAt: "2026-03-20" },
  { id: "p10", name: "Iyaz", joinedAt: "2026-04-02" },
  { id: "p11", name: "Dhruvang", joinedAt: "2026-04-10" },
  { id: "p12", name: "Chiranjeevi", joinedAt: "2026-04-15" },
  { id: "p13", name: "Girban", joinedAt: "2026-04-20" },
  { id: "p14", name: "Niyaz", joinedAt: "2026-04-22" },
  { id: "p15", name: "Sidhrath", joinedAt: "2026-04-25" },
  { id: "p16", name: "Sid Biswal", joinedAt: "2026-05-01" },
  { id: "p17", name: "Hameed", joinedAt: "2026-05-02" },
  { id: "p18", name: "GowriShankar", joinedAt: "2026-05-05" },
  { id: "p19", name: "Saleem", joinedAt: "2026-05-10" },
  { id: "p20", name: "SaiMadhu", joinedAt: "2026-05-12" },
  { id: "p21", name: "Seetharaman", joinedAt: "2026-05-15" },
  { id: "p22", name: "Ravindran", joinedAt: "2026-05-18" },
  { id: "p23", name: "Bijoy", joinedAt: "2026-05-20" },
  { id: "p24", name: "Mohan", joinedAt: "2026-05-22" },
  { id: "p25", name: "Shekar", joinedAt: "2026-05-25" },
  { id: "p26", name: "Sathwik", joinedAt: "2026-05-28" },
  { id: "p27", name: "Vinith", joinedAt: "2026-06-01" }
];

export const DEFAULT_HISTORICAL_TOURNAMENTS: Tournament[] = [
  {
    id: "t1",
    name: "Footworks Summer Open 2025",
    date: "2025-07-20",
    winner1Id: "p1", // Ravi Kumar
    winner2Id: "p3", // Anil Sharma
    runnerUp1Id: "p2", // Sanjay Sen
    runnerUp2Id: "p4", // Vikram Malhotra
    scoreSummary: "21-18, 19-21, 21-15",
    isHistorical: true
  },
  {
    id: "t2",
    name: "Footworks Winter Doubles Cup 2025",
    date: "2025-12-15",
    winner1Id: "p5", // Rahul Nair
    winner2Id: "p1", // Ravi Kumar (partner)
    runnerUp1Id: "p6", // Karan Johar
    runnerUp2Id: "p7", // Arjun Reddy
    scoreSummary: "21-14, 21-19",
    isHistorical: true
  },
  {
    id: "t3",
    name: "Footworks Spring Classic 2026",
    date: "2026-04-10",
    winner1Id: "p8", // Aditya Verma
    winner2Id: "p9", // Rohit Sharma
    runnerUp1Id: "p3", // Anil Sharma
    runnerUp2Id: "p10", // Deepak Chawla
    scoreSummary: "22-20, 21-17",
    isHistorical: true
  }
];

export const DEFAULT_HISTORICAL_MATCHES: Match[] = [
  // Summer Open 2025 Finals
  {
    id: "m-h1",
    tournamentId: "t1",
    team1: ["p1", "p3"],
    team2: ["p2", "p4"],
    score1: 21,
    score2: 18,
    status: "completed",
    date: "2025-07-20"
  },
  {
    id: "m-h2",
    tournamentId: "t1",
    team1: ["p2", "p4"],
    team2: ["p1", "p3"],
    score1: 21,
    score2: 19,
    status: "completed",
    date: "2025-07-20"
  },
  {
    id: "m-h3",
    tournamentId: "t1",
    team1: ["p1", "p3"],
    team2: ["p2", "p4"],
    score1: 21,
    score2: 15,
    status: "completed",
    date: "2025-07-20"
  },
  // Winter Doubles Cup 2025 Finals
  {
    id: "m-h4",
    tournamentId: "t2",
    team1: ["p5", "p1"],
    team2: ["p6", "p7"],
    score1: 21,
    score2: 14,
    status: "completed",
    date: "2025-12-15"
  },
  {
    id: "m-h5",
    tournamentId: "t2",
    team1: ["p5", "p1"],
    team2: ["p6", "p7"],
    score1: 21,
    score2: 19,
    status: "completed",
    date: "2025-12-15"
  },
  // Spring Classic 2026 Finals
  {
    id: "m-h6",
    tournamentId: "t3",
    team1: ["p8", "p9"],
    team2: ["p3", "p10"],
    score1: 22,
    score2: 20,
    status: "completed",
    date: "2026-04-10"
  },
  {
    id: "m-h7",
    tournamentId: "t3",
    team1: ["p8", "p9"],
    team2: ["p3", "p10"],
    score1: 21,
    score2: 17,
    status: "completed",
    date: "2026-04-10"
  }
];
