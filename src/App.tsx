import { useState, useEffect } from "react";
import { Player, Match, Tournament, CompletedTournamentResults } from "./types";
import {
  DEFAULT_PLAYERS,
  DEFAULT_HISTORICAL_TOURNAMENTS,
  DEFAULT_HISTORICAL_MATCHES,
} from "./data/defaultPlayers";
import { generateRoundRobinPairings, generateDoubleRoundRobinPairings, calculateTeamStandings } from "./utils/badminton";
import Leaderboard from "./components/Leaderboard";
import TournamentArena from "./components/TournamentArena";
import LiveScoreboard from "./components/LiveScoreboard";
import HistoryHall from "./components/HistoryHall";
import AdminPanel from "./components/AdminPanel";
import { Trophy, Users, Tv, Calendar, Shield, Activity, ArrowRight } from "lucide-react";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./lib/firebase";

interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export default function App() {
  // State variables synchronized with Firebase/localStorage
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [courtCount, setCourtCount] = useState<number>(2);
  const [podiumResults, setPodiumResults] = useState<CompletedTournamentResults | null>(null);

  const [activeTab, setActiveTab] = useState<string>("leaderboard");
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem("fw_is_admin") === "true";
  });

  // Track Admin Login locally & globally
  useEffect(() => {
    localStorage.setItem("fw_is_admin", isAdmin ? "true" : "false");
  }, [isAdmin]);

  // Real-time Firestore Subscriptions with robust local-storage fallbacks
  useEffect(() => {
    if (!db) {
      const savedPlayers = localStorage.getItem("fw_players");
      setPlayers(savedPlayers ? JSON.parse(savedPlayers) : DEFAULT_PLAYERS);
      return;
    }

    const unsub = onSnapshot(collection(db, "players"), (snapshot) => {
      const list: Player[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Player));
      setPlayers(list);
    }, (error) => {
      console.error("Players subscription error:", error);
      // Fallback gracefully to localStorage
      const savedPlayers = localStorage.getItem("fw_players");
      setPlayers(savedPlayers ? JSON.parse(savedPlayers) : DEFAULT_PLAYERS);
      handleFirestoreError(error, OperationType.LIST, "players");
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!db) {
      const savedTournaments = localStorage.getItem("fw_tournaments");
      setTournaments(savedTournaments ? JSON.parse(savedTournaments) : DEFAULT_HISTORICAL_TOURNAMENTS);
      return;
    }

    const unsub = onSnapshot(collection(db, "tournaments"), (snapshot) => {
      const list: Tournament[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Tournament));
      // Sort descending by date
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTournaments(list);
    }, (error) => {
      console.error("Tournaments subscription error:", error);
      const savedTournaments = localStorage.getItem("fw_tournaments");
      setTournaments(savedTournaments ? JSON.parse(savedTournaments) : DEFAULT_HISTORICAL_TOURNAMENTS);
      handleFirestoreError(error, OperationType.LIST, "tournaments");
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!db) {
      const savedMatches = localStorage.getItem("fw_matches");
      setMatches(savedMatches ? JSON.parse(savedMatches) : DEFAULT_HISTORICAL_MATCHES);
      return;
    }

    const unsub = onSnapshot(collection(db, "matches"), (snapshot) => {
      const list: Match[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Match));
      setMatches(list);
    }, (error) => {
      console.error("Matches subscription error:", error);
      const savedMatches = localStorage.getItem("fw_matches");
      setMatches(savedMatches ? JSON.parse(savedMatches) : DEFAULT_HISTORICAL_MATCHES);
      handleFirestoreError(error, OperationType.LIST, "matches");
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!db) {
      const savedMatches = localStorage.getItem("fw_active_matches");
      setActiveMatches(savedMatches ? JSON.parse(savedMatches) : []);
      const savedTeams = localStorage.getItem("fw_active_teams");
      setActiveTeams(savedTeams ? JSON.parse(savedTeams) : []);
      const savedMatchId = localStorage.getItem("fw_active_match_id");
      setActiveMatchId(savedMatchId || null);
      const savedCourts = localStorage.getItem("fw_court_count");
      setCourtCount(savedCourts ? parseInt(savedCourts) : 2);
      const savedPodium = localStorage.getItem("fw_active_podium");
      setPodiumResults(savedPodium ? JSON.parse(savedPodium) : null);
      return;
    }

    const unsub = onSnapshot(doc(db, "state", "active"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveMatches(data.activeMatches || []);
        setActiveTeams(data.activeTeams || []);
        setActiveMatchId(data.activeMatchId || null);
        setCourtCount(data.courtCount || 2);
        setPodiumResults(data.podiumResults || null);
      } else {
        // Initialize active state
        setDoc(doc(db, "state", "active"), {
          activeMatches: [],
          activeTeams: [],
          activeMatchId: null,
          courtCount: 2,
          podiumResults: null
        });
      }
    }, (error) => {
      console.error("Active state subscription error:", error);
      const savedMatches = localStorage.getItem("fw_active_matches");
      setActiveMatches(savedMatches ? JSON.parse(savedMatches) : []);
      const savedTeams = localStorage.getItem("fw_active_teams");
      setActiveTeams(savedTeams ? JSON.parse(savedTeams) : []);
      const savedMatchId = localStorage.getItem("fw_active_match_id");
      setActiveMatchId(savedMatchId || null);
      const savedCourts = localStorage.getItem("fw_court_count");
      setCourtCount(savedCourts ? parseInt(savedCourts) : 2);
      const savedPodium = localStorage.getItem("fw_active_podium");
      setPodiumResults(savedPodium ? JSON.parse(savedPodium) : null);
      handleFirestoreError(error, OperationType.GET, "state/active");
    });

    return unsub;
  }, []);

  // Sync state helpers
  const updateActiveStateInFirestore = async (
    newMatches: Match[],
    newTeams: Team[],
    newMatchId: string | null,
    newCourts: number,
    newPodiumResults: CompletedTournamentResults | null = null
  ) => {
    localStorage.setItem("fw_active_matches", JSON.stringify(newMatches));
    localStorage.setItem("fw_active_teams", JSON.stringify(newTeams));
    if (newMatchId) {
      localStorage.setItem("fw_active_match_id", newMatchId);
    } else {
      localStorage.removeItem("fw_active_match_id");
    }
    localStorage.setItem("fw_court_count", String(newCourts));
    if (newPodiumResults) {
      localStorage.setItem("fw_active_podium", JSON.stringify(newPodiumResults));
    } else {
      localStorage.removeItem("fw_active_podium");
    }

    if (db) {
      try {
        await setDoc(doc(db, "state", "active"), {
          activeMatches: newMatches,
          activeTeams: newTeams,
          activeMatchId: newMatchId,
          courtCount: newCourts,
          podiumResults: newPodiumResults
        });
      } catch (err) {
        console.error("Firestore active state save error:", err);
      }
    } else {
      setActiveMatches(newMatches);
      setActiveTeams(newTeams);
      setActiveMatchId(newMatchId);
      setCourtCount(newCourts);
      setPodiumResults(newPodiumResults);
    }
  };

  // Handler: Manage Player Roster
  const handleAddPlayer = async (name: string) => {
    const newPlayer: Player = {
      id: `p-user-${Date.now()}`,
      name,
      joinedAt: new Date().toISOString().split("T")[0],
    };
    if (db) {
      await setDoc(doc(db, "players", newPlayer.id), newPlayer);
    } else {
      const updated = [...players, newPlayer];
      setPlayers(updated);
      localStorage.setItem("fw_players", JSON.stringify(updated));
    }
  };

  const handleEditPlayerName = async (id: string, newName: string) => {
    if (db) {
      await updateDoc(doc(db, "players", id), { name: newName });
    } else {
      const updated = players.map((p) => (p.id === id ? { ...p, name: newName } : p));
      setPlayers(updated);
      localStorage.setItem("fw_players", JSON.stringify(updated));
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (db) {
      await deleteDoc(doc(db, "players", id));
    } else {
      const updated = players.filter((p) => p.id !== id);
      setPlayers(updated);
      localStorage.setItem("fw_players", JSON.stringify(updated));
    }
  };

  // Handler: Add past historical entries
  const handleAddPastTournament = async (tourney: Tournament) => {
    if (db) {
      await setDoc(doc(db, "tournaments", tourney.id), tourney);
    } else {
      const updated = [tourney, ...tournaments];
      setTournaments(updated);
      localStorage.setItem("fw_tournaments", JSON.stringify(updated));
    }
  };

  const handleAddPastMatch = async (match: Match) => {
    if (db) {
      await setDoc(doc(db, "matches", match.id), match);
    } else {
      const updated = [...matches, match];
      setMatches(updated);
      localStorage.setItem("fw_matches", JSON.stringify(updated));
    }
  };

  // Handler: Bulk Data import
  const handleBulkUpload = async (
    uploadedPlayers: Player[],
    uploadedTournaments: Tournament[],
    uploadedMatches: Match[]
  ) => {
    if (db) {
      for (const p of uploadedPlayers) {
        await setDoc(doc(db, "players", p.id), p);
      }
      for (const t of uploadedTournaments) {
        await setDoc(doc(db, "tournaments", t.id), t);
      }
      for (const m of uploadedMatches) {
        await setDoc(doc(db, "matches", m.id), m);
      }
    } else {
      if (uploadedPlayers.length > 0) {
        setPlayers(uploadedPlayers);
        localStorage.setItem("fw_players", JSON.stringify(uploadedPlayers));
      }
      if (uploadedTournaments.length > 0) {
        setTournaments(uploadedTournaments);
        localStorage.setItem("fw_tournaments", JSON.stringify(uploadedTournaments));
      }
      if (uploadedMatches.length > 0) {
        setMatches(uploadedMatches);
        localStorage.setItem("fw_matches", JSON.stringify(uploadedMatches));
      }
    }
  };

  // Handler: State resets
  const handleResetToDefaults = async () => {
    if (db) {
      // Delete existing
      for (const p of players) {
        await deleteDoc(doc(db, "players", p.id));
      }
      for (const t of tournaments) {
        await deleteDoc(doc(db, "tournaments", t.id));
      }
      for (const m of matches) {
        await deleteDoc(doc(db, "matches", m.id));
      }

      // Seed
      for (const p of DEFAULT_PLAYERS) {
        await setDoc(doc(db, "players", p.id), p);
      }
      for (const t of DEFAULT_HISTORICAL_TOURNAMENTS) {
        await setDoc(doc(db, "tournaments", t.id), t);
      }
      for (const m of DEFAULT_HISTORICAL_MATCHES) {
        await setDoc(doc(db, "matches", m.id), m);
      }

      await updateActiveStateInFirestore([], [], null, 2);
    } else {
      setPlayers(DEFAULT_PLAYERS);
      setTournaments(DEFAULT_HISTORICAL_TOURNAMENTS);
      setMatches(DEFAULT_HISTORICAL_MATCHES);
      setActiveMatches([]);
      setActiveTeams([]);
      setActiveMatchId(null);
      setCourtCount(2);

      localStorage.setItem("fw_players", JSON.stringify(DEFAULT_PLAYERS));
      localStorage.setItem("fw_tournaments", JSON.stringify(DEFAULT_HISTORICAL_TOURNAMENTS));
      localStorage.setItem("fw_matches", JSON.stringify(DEFAULT_HISTORICAL_MATCHES));
      localStorage.setItem("fw_active_matches", "[]");
      localStorage.setItem("fw_active_teams", "[]");
      localStorage.removeItem("fw_active_match_id");
      localStorage.setItem("fw_court_count", "2");
    }
  };

  const handleClearScores = async () => {
    if (db) {
      // Delete all tournaments
      for (const t of tournaments) {
        try {
          await deleteDoc(doc(db, "tournaments", t.id));
        } catch (err) {
          console.error("Failed to delete tournament:", err);
        }
      }
      // Delete all matches
      for (const m of matches) {
        try {
          await deleteDoc(doc(db, "matches", m.id));
        } catch (err) {
          console.error("Failed to delete match:", err);
        }
      }
      await updateActiveStateInFirestore([], [], null, courtCount);
    } else {
      setTournaments([]);
      setMatches([]);
      setActiveMatches([]);
      setActiveTeams([]);
      setActiveMatchId(null);

      localStorage.setItem("fw_tournaments", "[]");
      localStorage.setItem("fw_matches", "[]");
      localStorage.setItem("fw_active_matches", "[]");
      localStorage.setItem("fw_active_teams", "[]");
      localStorage.removeItem("fw_active_match_id");
    }
  };

  const handleClearAllData = async () => {
    if (db) {
      // Delete all players
      for (const p of players) {
        try {
          await deleteDoc(doc(db, "players", p.id));
        } catch (err) {
          console.error("Failed to delete player:", err);
        }
      }
      // Delete all tournaments
      for (const t of tournaments) {
        try {
          await deleteDoc(doc(db, "tournaments", t.id));
        } catch (err) {
          console.error("Failed to delete tournament:", err);
        }
      }
      // Delete all matches
      for (const m of matches) {
        try {
          await deleteDoc(doc(db, "matches", m.id));
        } catch (err) {
          console.error("Failed to delete match:", err);
        }
      }
      await updateActiveStateInFirestore([], [], null, 2);
    } else {
      setPlayers([]);
      setTournaments([]);
      setMatches([]);
      setActiveMatches([]);
      setActiveTeams([]);
      setActiveMatchId(null);
      setCourtCount(2);

      localStorage.setItem("fw_players", "[]");
      localStorage.setItem("fw_tournaments", "[]");
      localStorage.setItem("fw_matches", "[]");
      localStorage.setItem("fw_active_matches", "[]");
      localStorage.setItem("fw_active_teams", "[]");
      localStorage.removeItem("fw_active_match_id");
      localStorage.setItem("fw_court_count", "2");
    }
  };

  const currentBackupObj = {
    version: 1,
    backupDate: new Date().toISOString(),
    players,
    tournaments,
    matches,
    activeState: {
      activeMatches,
      activeTeams,
      activeMatchId,
      courtCount,
      podiumResults
    }
  };

  const handleRestoreBackup = async (backup: any) => {
    if (!backup || typeof backup !== "object") {
      throw new Error("Invalid backup format.");
    }

    const restoredPlayers = backup.players || [];
    const restoredTournaments = backup.tournaments || [];
    const restoredMatches = backup.matches || [];
    const activeState = backup.activeState || {};
    const restoredActiveMatches = activeState.activeMatches || [];
    const restoredActiveTeams = activeState.activeTeams || [];
    const restoredActiveMatchId = activeState.activeMatchId || null;
    const restoredCourtCount = typeof activeState.courtCount === "number" ? activeState.courtCount : 2;
    const restoredPodiumResults = activeState.podiumResults || null;

    if (db) {
      // 1. Delete all current data in Firestore
      for (const p of players) {
        try { await deleteDoc(doc(db, "players", p.id)); } catch (err) { console.error("Restore delete player err:", err); }
      }
      for (const t of tournaments) {
        try { await deleteDoc(doc(db, "tournaments", t.id)); } catch (err) { console.error("Restore delete tournament err:", err); }
      }
      for (const m of matches) {
        try { await deleteDoc(doc(db, "matches", m.id)); } catch (err) { console.error("Restore delete match err:", err); }
      }

      // 2. Set restored data in Firestore
      for (const p of restoredPlayers) {
        await setDoc(doc(db, "players", p.id), p);
      }
      for (const t of restoredTournaments) {
        await setDoc(doc(db, "tournaments", t.id), t);
      }
      for (const m of restoredMatches) {
        await setDoc(doc(db, "matches", m.id), m);
      }

      // 3. Sync active state
      await updateActiveStateInFirestore(
        restoredActiveMatches,
        restoredActiveTeams,
        restoredActiveMatchId,
        restoredCourtCount,
        restoredPodiumResults
      );
    } else {
      // Offline fallback
      setPlayers(restoredPlayers);
      setTournaments(restoredTournaments);
      setMatches(restoredMatches);
      setActiveMatches(restoredActiveMatches);
      setActiveTeams(restoredActiveTeams);
      setActiveMatchId(restoredActiveMatchId);
      setCourtCount(restoredCourtCount);
      setPodiumResults(restoredPodiumResults);

      localStorage.setItem("fw_players", JSON.stringify(restoredPlayers));
      localStorage.setItem("fw_tournaments", JSON.stringify(restoredTournaments));
      localStorage.setItem("fw_matches", JSON.stringify(restoredMatches));
      localStorage.setItem("fw_active_matches", JSON.stringify(restoredActiveMatches));
      localStorage.setItem("fw_active_teams", JSON.stringify(restoredActiveTeams));
      if (restoredActiveMatchId) {
        localStorage.setItem("fw_active_match_id", restoredActiveMatchId);
      } else {
        localStorage.removeItem("fw_active_match_id");
      }
      localStorage.setItem("fw_court_count", String(restoredCourtCount));
      if (restoredPodiumResults) {
        localStorage.setItem("fw_active_podium", JSON.stringify(restoredPodiumResults));
      } else {
        localStorage.removeItem("fw_active_podium");
      }
    }
  };

  // Automatic daily snapshots
  useEffect(() => {
    if (players.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const lastBackupDate = localStorage.getItem("fw_last_auto_backup_date");

    if (lastBackupDate !== todayStr) {
      const backupObj = {
        version: 1,
        backupDate: new Date().toISOString(),
        players,
        tournaments,
        matches,
        activeState: {
          activeMatches,
          activeTeams,
          activeMatchId,
          courtCount,
          podiumResults
        }
      };

      let autoBackupsList: any[] = [];
      try {
        const saved = localStorage.getItem("fw_auto_backups_list");
        autoBackupsList = saved ? JSON.parse(saved) : [];
      } catch (e) {
        autoBackupsList = [];
      }

      const alreadyHasToday = autoBackupsList.some((bk) => bk.date === todayStr);
      if (!alreadyHasToday) {
        const newBackupItem = {
          id: `backup-${todayStr}-${Date.now()}`,
          date: todayStr,
          timestamp: new Date().toISOString(),
          data: backupObj
        };
        const updatedList = [newBackupItem, ...autoBackupsList].slice(0, 14); // Keep last 14 days
        localStorage.setItem("fw_auto_backups_list", JSON.stringify(updatedList));
        localStorage.setItem("fw_last_auto_backup_date", todayStr);
        console.log(`[Automatic Backup] Snapshot created for date: ${todayStr}`);
      }
    }
  }, [players, tournaments, matches, activeMatches, activeTeams, activeMatchId, courtCount, podiumResults]);

  // Tournament Actions
  const handleStartTournament = async (
    format: "singles" | "doubles" | "teams",
    selectedPlayerIds: string[],
    generatedTeams: Team[],
    selectedCourtCount: number
  ) => {
    // Generate Double Round Robin pairings (play twice with every team)
    const pairings = generateDoubleRoundRobinPairings(generatedTeams);
    const numTeams = generatedTeams.length;
    const matchesPerRound = Math.ceil(numTeams / 2);

    const generatedMatches: Match[] = pairings.map((pairing, idx) => {
      const round = Math.floor(idx / matchesPerRound) + 1;
      const courtNumber = (idx % selectedCourtCount) + 1;
      return {
        id: `m-active-${idx}-${Date.now()}`,
        tournamentId: "current",
        team1: pairing[0].playerIds,
        team2: pairing[1].playerIds,
        score1: 0,
        score2: 0,
        status: "pending",
        date: new Date().toLocaleDateString(),
        round: round,
        court: `Court ${courtNumber}`,
        stage: "round-robin",
      };
    });

    await updateActiveStateInFirestore(generatedMatches, generatedTeams, null, selectedCourtCount);
  };

  const handleClearTournament = async () => {
    await updateActiveStateInFirestore([], [], null, courtCount, null);
  };

  const handleSelectMatchToPlay = async (matchId: string) => {
    const updated = activeMatches.map((m) =>
      m.id === matchId ? { ...m, status: "live" as const } : m
    );
    await updateActiveStateInFirestore(updated, activeTeams, matchId, courtCount);
    setActiveTab("scoreboard");
  };

  // Let admin update any active match's court manually
  const handleUpdateMatchCourt = async (matchId: string, courtName: string) => {
    const updated = activeMatches.map((m) =>
      m.id === matchId ? { ...m, court: courtName } : m
    );
    await updateActiveStateInFirestore(updated, activeTeams, activeMatchId, courtCount);
  };

  // Real-time incremental score update callback from LiveScoreboard
  const handleUpdateLiveScore = async (
    matchId: string, 
    score1: number, 
    score2: number,
    playoffData?: {
      games: { score1: number; score2: number }[];
      gamesWon1: number;
      gamesWon2: number;
    }
  ) => {
    const updated = activeMatches.map((m) =>
      m.id === matchId 
        ? { 
            ...m, 
            score1, 
            score2,
            ...(playoffData || {})
          } 
        : m
    );
    await updateActiveStateInFirestore(updated, activeTeams, activeMatchId, courtCount, podiumResults);
  };

  const handleCompleteMatch = async (
    matchId: string,
    score1: number,
    score2: number,
    playoffData?: {
      games: { score1: number; score2: number }[];
      gamesWon1: number;
      gamesWon2: number;
    }
  ) => {
    const updatedActiveMatches = activeMatches.map((m) =>
      m.id === matchId 
        ? { 
            ...m, 
            score1, 
            score2, 
            status: "completed" as const,
            ...(playoffData || {})
          } 
        : m
    );

    const completedMatch = updatedActiveMatches.find((m) => m.id === matchId);
    if (completedMatch) {
      if (db) {
        await setDoc(doc(db, "matches", completedMatch.id), completedMatch);
      } else {
        const updatedMatches = [...matches, completedMatch];
        setMatches(updatedMatches);
        localStorage.setItem("fw_matches", JSON.stringify(updatedMatches));
      }
    }

    const roundRobinMatches = updatedActiveMatches.filter(m => !m.stage || m.stage === "round-robin");
    const semifinalMatches = updatedActiveMatches.filter(m => m.stage === "semifinal");
    const finalMatches = updatedActiveMatches.filter(m => m.stage === "final");

    const isRoundRobinJustFinished = roundRobinMatches.length > 0 && 
                                     roundRobinMatches.every(m => m.status === "completed") && 
                                     semifinalMatches.length === 0 && 
                                     finalMatches.length === 0;

    const isSemifinalsJustFinished = semifinalMatches.length > 0 && 
                                     semifinalMatches.every(m => m.status === "completed") && 
                                     finalMatches.length === 0;

    const isFinalsJustFinished = finalMatches.length > 0 && 
                                 finalMatches.every(m => m.status === "completed");

    if (isRoundRobinJustFinished) {
      // Calculate standings
      const standings = calculateTeamStandings(activeTeams, roundRobinMatches);
      
      if (activeTeams.length >= 4) {
        // Generate Semifinals
        // Semifinal 1: Rank 1 vs Rank 4
        // Semifinal 2: Rank 2 vs Rank 3
        const sf1Team = activeTeams.find(t => t.id === standings[0].teamId);
        const sf4Team = activeTeams.find(t => t.id === standings[3].teamId);
        const sf2Team = activeTeams.find(t => t.id === standings[1].teamId);
        const sf3Team = activeTeams.find(t => t.id === standings[2].teamId);

        if (sf1Team && sf4Team && sf2Team && sf3Team) {
          const sfMatches: Match[] = [
            {
              id: `m-sf1-${Date.now()}`,
              tournamentId: "current",
              team1: sf1Team.playerIds,
              team2: sf4Team.playerIds,
              score1: 0,
              score2: 0,
              status: "pending",
              date: new Date().toLocaleDateString(),
              round: 1,
              court: "Court 1",
              stage: "semifinal",
            },
            {
              id: `m-sf2-${Date.now()}`,
              tournamentId: "current",
              team1: sf2Team.playerIds,
              team2: sf3Team.playerIds,
              score1: 0,
              score2: 0,
              status: "pending",
              date: new Date().toLocaleDateString(),
              round: 1,
              court: courtCount > 1 ? "Court 2" : "Court 1",
              stage: "semifinal",
            }
          ];

          alert(`📣 Round Robin Stage Complete!\n\nTop 4 teams selected for Semifinals based on Match Wins & Points Diff:\n1st: ${standings[0].teamName} (${standings[0].won} Wins, Diff: ${standings[0].diff})\n2nd: ${standings[1].teamName} (${standings[1].won} Wins, Diff: ${standings[1].diff})\n3rd: ${standings[2].teamName} (${standings[2].won} Wins, Diff: ${standings[2].diff})\n4th: ${standings[3].teamName} (${standings[3].won} Wins, Diff: ${standings[3].diff})\n\nSemifinal matches are now scheduled! Please select them from the Arena to play.`);
          
          await updateActiveStateInFirestore([...updatedActiveMatches, ...sfMatches], activeTeams, null, courtCount, null);
          setActiveTab("arena");
          return;
        }
      }

      // Less than 4 teams, go straight to Finals (Rank 1 vs Rank 2)
      if (activeTeams.length >= 2) {
        const f1Team = activeTeams.find(t => t.id === standings[0].teamId);
        const f2Team = activeTeams.find(t => t.id === standings[1].teamId);

        if (f1Team && f2Team) {
          const finalMatch: Match = {
            id: `m-final-${Date.now()}`,
            tournamentId: "current",
            team1: f1Team.playerIds,
            team2: f2Team.playerIds,
            score1: 0,
            score2: 0,
            status: "pending",
            date: new Date().toLocaleDateString(),
            round: 1,
            court: "Court 1",
            stage: "final",
          };

          alert(`📣 Round Robin Stage Complete!\n\nTop 2 teams selected for Finals based on Match Wins & Points Diff:\n1st: ${standings[0].teamName} (${standings[0].won} Wins, Diff: ${standings[0].diff})\n2nd: ${standings[1].teamName} (${standings[1].won} Wins, Diff: ${standings[1].diff})\n\nFinal match is now scheduled! Please select it to play.`);

          await updateActiveStateInFirestore([...updatedActiveMatches, finalMatch], activeTeams, null, courtCount, null);
          setActiveTab("arena");
          return;
        }
      }

      // If only 1 team or empty, finalize immediately
      await updateActiveStateInFirestore([], [], null, courtCount, null);
      setActiveTab("arena");
      return;

    } else if (isSemifinalsJustFinished) {
      const sf1 = semifinalMatches[0];
      const sf2 = semifinalMatches[1];

      const sf1WinnerIds = sf1.score1 > sf1.score2 ? sf1.team1 : sf1.team2;
      const sf2WinnerIds = sf2.score1 > sf2.score2 ? sf2.team1 : sf2.team2;

      const sf1WinnerTeam = activeTeams.find(t => 
        t.playerIds.length === sf1WinnerIds.length && 
        t.playerIds.every(id => sf1WinnerIds.includes(id))
      );
      const sf2WinnerTeam = activeTeams.find(t => 
        t.playerIds.length === sf2WinnerIds.length && 
        t.playerIds.every(id => sf2WinnerIds.includes(id))
      );

      const finalMatch: Match = {
        id: `m-final-${Date.now()}`,
        tournamentId: "current",
        team1: sf1WinnerIds,
        team2: sf2WinnerIds,
        score1: 0,
        score2: 0,
        status: "pending",
        date: new Date().toLocaleDateString(),
        round: 1,
        court: "Court 1",
        stage: "final",
      };

      const winner1Name = sf1WinnerTeam ? sf1WinnerTeam.name : "Semifinal 1 Winner";
      const winner2Name = sf2WinnerTeam ? sf2WinnerTeam.name : "Semifinal 2 Winner";

      alert(`📣 Semifinals Complete!\n\nFinalists:\n🏆 ${winner1Name}\n🏆 ${winner2Name}\n\nFinal match is now scheduled! Please select it from the Arena to play.`);

      await updateActiveStateInFirestore([...updatedActiveMatches, finalMatch], activeTeams, null, courtCount, null);
      setActiveTab("arena");
      return;

    } else if (isFinalsJustFinished) {
      const finalMatch = finalMatches[0];
      const team1Won = finalMatch.score1 > finalMatch.score2;
      const winnerIds = team1Won ? finalMatch.team1 : finalMatch.team2;
      const runnerUpIds = team1Won ? finalMatch.team2 : finalMatch.team1;

      const winnerPlayer1 = winnerIds[0] || "Unknown Player";
      const winnerPlayer2 = winnerIds[1] || "";
      const runnerUpPlayer1 = runnerUpIds[0] || "Unknown Player";
      const runnerUpPlayer2 = runnerUpIds[1] || "";

      // Determine 3rd place!
      let thirdPlaceNames: string[] = [];
      let thirdPlaceTeamName = "TBD";

      const standings = calculateTeamStandings(activeTeams, roundRobinMatches);

      if (semifinalMatches.length >= 2) {
        const sf1 = semifinalMatches[0];
        const sf2 = semifinalMatches[1];
        const sf1LoserIds = sf1.score1 < sf1.score2 ? sf1.team1 : sf1.team2;
        const sf2LoserIds = sf2.score1 < sf2.score2 ? sf2.team1 : sf2.team2;

        const sf1LoserRankIdx = standings.findIndex(s => 
          s.playerIds.length === sf1LoserIds.length && 
          s.playerIds.every(id => sf1LoserIds.includes(id))
        );
        const sf2LoserRankIdx = standings.findIndex(s => 
          s.playerIds.length === sf2LoserIds.length && 
          s.playerIds.every(id => sf2LoserIds.includes(id))
        );

        if (sf1LoserRankIdx !== -1 && sf2LoserRankIdx !== -1) {
          if (sf1LoserRankIdx < sf2LoserRankIdx) {
            thirdPlaceNames = sf1LoserIds.map(id => players.find(p => p.id === id)?.name || "Unknown");
            thirdPlaceTeamName = standings[sf1LoserRankIdx].teamName;
          } else {
            thirdPlaceNames = sf2LoserIds.map(id => players.find(p => p.id === id)?.name || "Unknown");
            thirdPlaceTeamName = standings[sf2LoserRankIdx].teamName;
          }
        } else {
          const loserIds = sf1LoserRankIdx !== -1 ? sf1LoserIds : sf2LoserIds;
          thirdPlaceNames = loserIds.map(id => players.find(p => p.id === id)?.name || "Unknown");
        }
      } else if (standings.length >= 3) {
        thirdPlaceNames = standings[2].playerIds.map(id => players.find(p => p.id === id)?.name || "Unknown");
        thirdPlaceTeamName = standings[2].teamName;
      }

      const winnerNamesList = winnerIds.map(id => players.find(p => p.id === id)?.name || "Unknown");
      const runnerUpNamesList = runnerUpIds.map(id => players.find(p => p.id === id)?.name || "Unknown");

      const winnerTeamObj = activeTeams.find(t => t.playerIds.length === winnerIds.length && t.playerIds.every(id => winnerIds.includes(id)));
      const runnerUpTeamObj = activeTeams.find(t => t.playerIds.length === runnerUpIds.length && t.playerIds.every(id => runnerUpIds.includes(id)));

      const finalPodium: CompletedTournamentResults = {
        winnerTeamName: winnerTeamObj ? winnerTeamObj.name : winnerNamesList.join(" & "),
        winnerPlayers: winnerNamesList,
        runnerUpTeamName: runnerUpTeamObj ? runnerUpTeamObj.name : runnerUpNamesList.join(" & "),
        runnerUpPlayers: runnerUpNamesList,
        thirdTeamName: thirdPlaceTeamName,
        thirdPlayers: thirdPlaceNames,
        scoreSummary: finalMatch.games 
          ? finalMatch.games.map(g => `${g.score1}-${g.score2}`).join(", ")
          : `${finalMatch.score1}-${finalMatch.score2}`,
        date: new Date().toLocaleDateString(),
      };

      const currentTourneyId = `t-auto-${Date.now()}`;
      const autoTourneyName = `Footworks Championship (${new Date().toLocaleDateString()})`;

      const newTourneyRecord: Tournament = {
        id: currentTourneyId,
        name: autoTourneyName,
        date: new Date().toISOString().split("T")[0],
        winner1Id: winnerPlayer1,
        winner2Id: winnerPlayer2 || undefined,
        runnerUp1Id: runnerUpPlayer1,
        runnerUp2Id: runnerUpPlayer2 || undefined,
        isHistorical: false,
        scoreSummary: finalPodium.scoreSummary,
      };

      if (db) {
        await setDoc(doc(db, "tournaments", newTourneyRecord.id), newTourneyRecord);
      } else {
        const updatedTourneys = [newTourneyRecord, ...tournaments];
        setTournaments(updatedTourneys);
        localStorage.setItem("fw_tournaments", JSON.stringify(updatedTourneys));
      }

      const winnerNames = winnerIds
        .map((id) => players.find((p) => p.id === id)?.name || "Unknown")
        .join(" & ");

      alert(`🏆 Tournament Completed!\nChampionship Winner: ${winnerNames}\nRecord saved to historical list.`);

      await updateActiveStateInFirestore([], [], null, courtCount, finalPodium);
      setActiveTab("arena");
      return;
    }

    await updateActiveStateInFirestore(updatedActiveMatches, activeTeams, null, courtCount, podiumResults);
    setActiveTab("arena");
  };

  const getLoadedActiveMatch = () => {
    if (!activeMatchId) return null;
    return activeMatches.find((m) => m.id === activeMatchId) || null;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col p-4 md:p-8">
      {/* Top Bento Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-xs flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5 uppercase">
              FOOTWORKS <span className="text-emerald-600 font-semibold font-sans">BADMINTON</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Live Arena & Tournament Management</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="bg-white px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold flex items-center gap-2 shadow-xxs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-700 tracking-wider font-bold">
              {activeMatchId ? "LIVE GAME PLAYING" : "LIVE ARENA SESSION"}
            </span>
          </div>

          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>{tournaments.length} Tourneys Done</span>
          </div>
        </div>
      </header>

      {/* Read-Only Spectator Notice Banner */}
      {!isAdmin && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-extrabold uppercase bg-amber-200 px-3 py-1 rounded-xl text-[10px] tracking-wider shrink-0 select-none">
              SPECTATOR VIEW
            </span>
            <span>You are viewing live matches and scoreboard statistics. Only the tournament <strong>Admin</strong> has write access.</span>
          </div>
          <button
            onClick={() => setActiveTab("admin")}
            className="text-amber-950 font-black hover:underline cursor-pointer flex items-center gap-1.5 uppercase tracking-widest text-[10px] shrink-0 self-end sm:self-auto"
          >
            Authenticate <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bento Navigation Grid / Tabs */}
      <div className="bg-white p-1.5 rounded-3xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 min-w-[130px] py-3.5 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "leaderboard"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Trophy className="h-4 w-4" /> Standings
        </button>

        <button
          onClick={() => setActiveTab("arena")}
          className={`flex-1 min-w-[130px] py-3.5 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "arena"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Users className="h-4 w-4" /> Tournament Arena
        </button>

        <button
          onClick={() => setActiveTab("scoreboard")}
          className={`flex-1 min-w-[130px] py-3.5 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-2xl transition-all relative cursor-pointer ${
            activeTab === "scoreboard"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Tv className="h-4 w-4" /> Scoreboard
          {activeMatchId && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 min-w-[130px] py-3.5 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Calendar className="h-4 w-4" /> Hall of Fame
        </button>

        <button
          onClick={() => setActiveTab("admin")}
          className={`flex-1 min-w-[130px] py-3.5 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "admin"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Shield className="h-4 w-4" /> Admin
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto">
        {activeTab === "leaderboard" && (
          <Leaderboard
            players={players}
            matches={matches}
            tournaments={tournaments}
            podiumResults={podiumResults}
          />
        )}

        {activeTab === "arena" && (
          <TournamentArena
            players={players}
            activeMatches={activeMatches}
            activeTeams={activeTeams}
            courtCount={courtCount}
            isAdmin={isAdmin}
            podiumResults={podiumResults}
            onStartTournament={handleStartTournament}
            onClearTournament={handleClearTournament}
            onSelectMatchToPlay={handleSelectMatchToPlay}
            onUpdateMatchCourt={handleUpdateMatchCourt}
            onUpdateLiveScore={handleUpdateLiveScore}
            onCompleteMatch={handleCompleteMatch}
          />
        )}

        {activeTab === "scoreboard" && (
          <LiveScoreboard
            activeMatch={getLoadedActiveMatch()}
            players={players}
            isAdmin={isAdmin}
            onCompleteMatch={handleCompleteMatch}
            onUpdateLiveScore={handleUpdateLiveScore}
            onBackToArena={() => setActiveTab("arena")}
          />
        )}

        {activeTab === "history" && (
          <HistoryHall
            players={players}
            tournaments={tournaments}
            matches={matches}
          />
        )}

        {activeTab === "admin" && (
          <AdminPanel
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            players={players}
            tournaments={tournaments}
            matches={matches}
            onAddPlayer={handleAddPlayer}
            onEditPlayerName={handleEditPlayerName}
            onDeletePlayer={handleDeletePlayer}
            onAddPastTournament={handleAddPastTournament}
            onAddPastMatch={handleAddPastMatch}
            onBulkUpload={handleBulkUpload}
            onResetToDefaults={handleResetToDefaults}
            onClearScores={handleClearScores}
            onClearAllData={handleClearAllData}
            currentBackupObj={currentBackupObj}
            onRestoreBackup={handleRestoreBackup}
          />
        )}
      </main>

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-12 rounded-t-3xl">
        <p>© 2026 Footworks Badminton Tournaments. All rights reserved.</p>
        <p className="mt-1 font-medium text-slate-300">
          Crafted with absolute sports precision • Persistent cloud database enabled
        </p>
      </footer>
    </div>
  );
}
