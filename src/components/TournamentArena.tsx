import React, { useState, useEffect } from "react";
import { Player, Match, CompletedTournamentResults } from "../types";
import { shuffleArray, calculateTeamStandings } from "../utils/badminton";
import { 
  Users, Shuffle, Play, CheckCircle, RefreshCw, Calendar, 
  ArrowRight, UserPlus, Trash2, Edit3, Check, X, ShieldAlert, Award, Trophy, Medal, Plus
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

interface TournamentArenaProps {
  players: Player[];
  activeMatches: Match[];
  activeTeams: Team[];
  courtCount: number;
  isAdmin: boolean;
  podiumResults: CompletedTournamentResults | null;
  onStartTournament: (format: "singles" | "doubles" | "teams", playerIds: string[], generatedTeams: Team[], courtCount: number) => void;
  onClearTournament: () => void;
  onSelectMatchToPlay: (matchId: string) => void;
  onUpdateMatchCourt?: (matchId: string, courtName: string) => void;
  onUpdateLiveScore?: (matchId: string, score1: number, score2: number, playoffData?: any) => void;
  onCompleteMatch?: (matchId: string, score1: number, score2: number, playoffData?: any) => void;
}

export default function TournamentArena({
  players,
  activeMatches,
  activeTeams,
  courtCount: parentCourtCount,
  isAdmin,
  podiumResults,
  onStartTournament,
  onClearTournament,
  onSelectMatchToPlay,
  onUpdateMatchCourt,
  onUpdateLiveScore,
  onCompleteMatch,
}: TournamentArenaProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [format, setFormat] = useState<"singles" | "doubles" | "teams">("doubles");
  const [customTeamCount, setCustomTeamCount] = useState<number>(4);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingNames, setShufflingNames] = useState<string[]>([]);
  
  // Local court selection during setup
  const [setupCourts, setSetupCourts] = useState<number>(parentCourtCount || 2);

  // Manual inline score editing states (satisfies manual update rule)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [manualScore1, setManualScore1] = useState<number>(0);
  const [manualScore2, setManualScore2] = useState<number>(0);

  // Playoff sub-game states for best-of-3
  const [game1Score1, setGame1Score1] = useState<number>(0);
  const [game1Score2, setGame1Score2] = useState<number>(0);
  const [game2Score1, setGame2Score1] = useState<number>(0);
  const [game2Score2, setGame2Score2] = useState<number>(0);
  const [game3Score1, setGame3Score1] = useState<number>(0);
  const [game3Score2, setGame3Score2] = useState<number>(0);

  // Inline court editing states
  const [changingCourtMatchId, setChangingCourtMatchId] = useState<string | null>(null);

  // Automatically select some players initially if none are selected
  useEffect(() => {
    if (selectedPlayerIds.length === 0 && players.length >= 4) {
      setSelectedPlayerIds(players.slice(0, 8).map((p) => p.id));
    }
  }, [players]);

  const togglePlayerSelection = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((pId) => pId !== id));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedPlayerIds(players.map((p) => p.id));
  };

  const selectNone = () => {
    setSelectedPlayerIds([]);
  };

  // Manual Team assignment states
  const [isManualAssignment, setIsManualAssignment] = useState(false);
  const [manualTeams, setManualTeams] = useState<Team[]>([]);

  const getDoublesTeamName = (pIds: string[]) => {
    const names = pIds.map(id => players.find(p => p.id === id)?.name.split(" ")[0] || "Player");
    return names.join(" & ");
  };

  const getTeamMemberNames = (playerIds: string[]) => {
    return playerIds
      .map(id => players.find(p => p.id === id)?.name || "Unknown")
      .join(", ");
  };

  const initializeManualTeams = () => {
    if (format === "singles") {
      setManualTeams([]);
      return;
    }

    let numTeams = 0;
    if (format === "doubles") {
      numTeams = Math.floor(selectedPlayerIds.length / 2);
    } else if (format === "teams") {
      numTeams = customTeamCount;
    }

    const initial: Team[] = Array.from({ length: numTeams }, (_, idx) => ({
      id: `t-manual-${idx}-${Date.now()}`,
      name: `Team ${idx + 1}`,
      playerIds: []
    }));

    setManualTeams(initial);
  };

  // Re-run whenever format, team count or toggled on
  useEffect(() => {
    if (isManualAssignment) {
      initializeManualTeams();
    }
  }, [isManualAssignment, format, customTeamCount]);

  // Keep manual teams in sync with selected player pool (remove deselected players)
  useEffect(() => {
    if (isManualAssignment && manualTeams.length > 0) {
      setManualTeams(prev => prev.map(t => ({
        ...t,
        playerIds: t.playerIds.filter(id => selectedPlayerIds.includes(id))
      })));
    }
  }, [selectedPlayerIds]);

  // If format changes to singles, turn off manual assignment
  useEffect(() => {
    if (format === "singles") {
      setIsManualAssignment(false);
    }
  }, [format]);

  const handleAddPlayerToTeam = (teamId: string, playerId: string) => {
    if (!playerId) return;
    setManualTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        if (format === "doubles" && t.playerIds.length >= 2) {
          alert("Doubles teams can only have up to 2 players.");
          return t;
        }
        const updatedPlayerIds = [...t.playerIds, playerId];
        let updatedName = t.name;
        if (format === "doubles" && (t.name.startsWith("Team ") || t.name === "")) {
          updatedName = getDoublesTeamName(updatedPlayerIds);
        } else if (format === "teams" && (t.name.startsWith("Team ") || t.name === "")) {
          updatedName = `Team ${prev.indexOf(t) + 1}: ` + updatedPlayerIds.map(id => players.find(p => p.id === id)?.name.split(" ")[0] || "Player").join(" & ");
        }
        return {
          ...t,
          playerIds: updatedPlayerIds,
          name: updatedName
        };
      }
      return t;
    }));
  };

  const handleRemovePlayerFromTeam = (teamId: string, playerId: string) => {
    setManualTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const updatedPlayerIds = t.playerIds.filter(id => id !== playerId);
        let updatedName = t.name;
        if (format === "doubles") {
          updatedName = updatedPlayerIds.length > 0 ? getDoublesTeamName(updatedPlayerIds) : `Team ${prev.indexOf(t) + 1}`;
        } else if (format === "teams") {
          updatedName = updatedPlayerIds.length > 0 
            ? `Team ${prev.indexOf(t) + 1}: ` + updatedPlayerIds.map(id => players.find(p => p.id === id)?.name.split(" ")[0] || "Player").join(" & ")
            : `Team ${prev.indexOf(t) + 1}`;
        }
        return {
          ...t,
          playerIds: updatedPlayerIds,
          name: updatedName
        };
      }
      return t;
    }));
  };

  const handleUpdateTeamName = (teamId: string, newName: string) => {
    setManualTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: newName } : t));
  };

  const handleAddManualTeam = () => {
    const nextIdx = manualTeams.length;
    const newTeam: Team = {
      id: `t-manual-${nextIdx}-${Date.now()}`,
      name: `Team ${nextIdx + 1}`,
      playerIds: []
    };
    setManualTeams(prev => [...prev, newTeam]);
  };

  const handleRemoveManualTeam = (teamId: string) => {
    setManualTeams(prev => prev.filter(t => t.id !== teamId));
  };

  const handleAutoAssignRemaining = () => {
    const assignedIds = manualTeams.flatMap(t => t.playerIds);
    const unassigned = selectedPlayerIds.filter(id => !assignedIds.includes(id));
    if (unassigned.length === 0) return;

    // Shuffle the unassigned players
    const shuffledUnassigned = shuffleArray(unassigned) as string[];

    // Assign them to teams that have space
    setManualTeams(prev => {
      const updated = [...prev];
      let pIdx = 0;

      // First, try to fill doubles teams (which have max capacity of 2)
      if (format === "doubles") {
        for (let i = 0; i < updated.length; i++) {
          while (updated[i].playerIds.length < 2 && pIdx < shuffledUnassigned.length) {
            const playerId = shuffledUnassigned[pIdx++];
            updated[i] = {
              ...updated[i],
              playerIds: [...updated[i].playerIds, playerId],
            };
            updated[i].name = getDoublesTeamName(updated[i].playerIds);
          }
        }
      } else {
        // Custom teams: distribute remaining players evenly
        while (pIdx < shuffledUnassigned.length) {
          for (let i = 0; i < updated.length && pIdx < shuffledUnassigned.length; i++) {
            const playerId = shuffledUnassigned[pIdx++];
            updated[i] = {
              ...updated[i],
              playerIds: [...updated[i].playerIds, playerId],
            };
            updated[i].name = `Team ${i + 1}: ` + updated[i].playerIds.map(id => players.find(p => p.id === id)?.name.split(" ")[0] || "Player").join(" & ");
          }
        }
      }

      return updated;
    });
  };

  const handleStartManualTournament = () => {
    const assignedPlayerIds = manualTeams.flatMap(t => t.playerIds);
    const unassigned = selectedPlayerIds.filter(id => !assignedPlayerIds.includes(id));
    
    if (unassigned.length > 0) {
      alert(`Please assign all selected players to a team first. Remaining unassigned players: ${unassigned.map(id => players.find(p => p.id === id)?.name).join(", ")}`);
      return;
    }

    if (format === "doubles") {
      const incompleteTeams = manualTeams.filter(t => t.playerIds.length !== 2);
      if (incompleteTeams.length > 0) {
        alert("For Doubles format, every team must have exactly 2 players. Please adjust your teams.");
        return;
      }
    }

    if (format === "teams") {
      const emptyTeams = manualTeams.filter(t => t.playerIds.length === 0);
      if (emptyTeams.length > 0) {
        alert("Every team must have at least 1 player assigned. Please assign players to all teams.");
        return;
      }
    }

    onStartTournament(format, selectedPlayerIds, manualTeams, setupCourts);
  };

  // Live Shuffling Simulation for Matchmaking
  const handleRandomMatchmaking = () => {
    if (selectedPlayerIds.length < 2) {
      alert("Please select at least 2 players.");
      return;
    }
    if (format === "doubles" && selectedPlayerIds.length % 2 !== 0) {
      alert("For Doubles, please select an even number of players (e.g. 4, 6, 8, 10) so everyone has a partner!");
      return;
    }
    if (format === "doubles" && selectedPlayerIds.length < 4) {
      alert("For Doubles, you need at least 4 players.");
      return;
    }
    if (format === "teams" && customTeamCount > selectedPlayerIds.length) {
      alert(`You have selected ${selectedPlayerIds.length} players, but requested ${customTeamCount} teams. Please select at least ${customTeamCount} players, or reduce the number of teams.`);
      return;
    }

    setIsShuffling(true);

    let count = 0;
    const interval = setInterval(() => {
      const tempShuffled = shuffleArray(selectedPlayerIds).map((id) => players.find((p) => p.id === id)?.name || "");
      setShufflingNames(tempShuffled);
      count++;
      if (count > 12) {
        clearInterval(interval);
        finalizeTeamsAndSchedule();
      }
    }, 120);
  };

  const finalizeTeamsAndSchedule = () => {
    const shuffledIds = shuffleArray(selectedPlayerIds) as string[];
    const generatedTeams: Team[] = [];

    if (format === "doubles") {
      for (let i = 0; i < shuffledIds.length; i += 2) {
        const p1Id = shuffledIds[i];
        const p2Id = shuffledIds[i + 1];
        const p1Name = players.find((p) => p.id === p1Id)?.name || "Player";
        const p2Name = players.find((p) => p.id === p2Id)?.name || "Player";

        generatedTeams.push({
          id: `t-g${i}`,
          name: `${p1Name.split(" ")[0]} & ${p2Name.split(" ")[0]}`,
          playerIds: [p1Id, p2Id],
        });
      }
    } else if (format === "singles") {
      shuffledIds.forEach((pId, idx) => {
        const pName = players.find((p) => p.id === pId)?.name || "Player";
        generatedTeams.push({
          id: `t-g${idx}`,
          name: pName,
          playerIds: [pId],
        });
      });
    } else if (format === "teams") {
      // Distribute players into customTeamCount teams
      const teamPlayers: string[][] = Array.from({ length: customTeamCount }, () => []);
      
      shuffledIds.forEach((pId, idx) => {
        const teamIdx = idx % customTeamCount;
        teamPlayers[teamIdx].push(pId);
      });

      teamPlayers.forEach((playerIds, tIdx) => {
        if (playerIds.length === 0) return;
        const teamNames = playerIds.map(id => players.find(p => p.id === id)?.name.split(" ")[0] || "Player").join(" & ");
        generatedTeams.push({
          id: `t-g${tIdx}`,
          name: `Team ${tIdx + 1}: ${teamNames}`,
          playerIds: playerIds,
        });
      });
    }

    onStartTournament(format, shuffledIds, generatedTeams, setupCourts);
    setIsShuffling(false);
  };

  // Start manual score editing
  const startManualScoreEdit = (match: Match) => {
    setEditingMatchId(match.id);
    setManualScore1(match.score1 || 0);
    setManualScore2(match.score2 || 0);

    if (match.stage === "semifinal" || match.stage === "final") {
      const g = match.games || [];
      setGame1Score1(g[0]?.score1 ?? 0);
      setGame1Score2(g[0]?.score2 ?? 0);
      setGame2Score1(g[1]?.score1 ?? 0);
      setGame2Score2(g[1]?.score2 ?? 0);
      setGame3Score1(g[2]?.score1 ?? 0);
      setGame3Score2(g[2]?.score2 ?? 0);
    }
  };

  const handleSaveManualScore = (match: Match) => {
    if (onCompleteMatch) {
      if (match.stage === "semifinal" || match.stage === "final") {
        let won1 = 0;
        let won2 = 0;
        const playoffGames = [];

        // Game 1
        playoffGames.push({ score1: game1Score1, score2: game1Score2 });
        if (game1Score1 > game1Score2) won1++;
        else if (game1Score2 > game1Score1) won2++;

        // Game 2
        playoffGames.push({ score1: game2Score1, score2: game2Score2 });
        if (game2Score1 > game2Score2) won1++;
        else if (game2Score2 > game2Score1) won2++;

        // Game 3
        playoffGames.push({ score1: game3Score1, score2: game3Score2 });
        if (game3Score1 > game3Score2) won1++;
        else if (game3Score2 > game3Score1) won2++;

        const scoreText = playoffGames.map(g => `${g.score1}-${g.score2}`).join(", ");
        const proceed = window.confirm(
          `Are you sure you want to save game scores: ${scoreText}?\nGames Won - Team A: ${won1}, Team B: ${won2}.\nThis will finalize and complete the match.`
        );

        if (proceed) {
          onCompleteMatch(match.id, won1, won2, {
            games: playoffGames,
            gamesWon1: won1,
            gamesWon2: won2
          });
          setEditingMatchId(null);
        }
      } else {
        const proceed = window.confirm(
          `Are you sure you want to register final score manually: ${manualScore1} - ${manualScore2}? This will finalize and complete the match.`
        );
        if (proceed) {
          onCompleteMatch(match.id, manualScore1, manualScore2);
          setEditingMatchId(null);
        }
      }
    }
  };

  // Change court handler
  const handleSaveCourtSelection = (matchId: string, courtName: string) => {
    if (onUpdateMatchCourt) {
      onUpdateMatchCourt(matchId, courtName);
      setChangingCourtMatchId(null);
    }
  };

  // Group active matches of round-robin stage by round
  const roundRobinMatches = activeMatches.filter((m) => !m.stage || m.stage === "round-robin");
  const semifinalMatches = activeMatches.filter((m) => m.stage === "semifinal");
  const finalMatches = activeMatches.filter((m) => m.stage === "final");

  const matchesByRound = roundRobinMatches.reduce<Record<number, Match[]>>((acc, match) => {
    const round = match.round || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  const getPlayerNames = (ids: string[]) => {
    return ids.map((id) => players.find((p) => p.id === id)?.name || "Unknown").join(" & ");
  };

  // Render a match card nicely (to avoid code repetition)
  const renderMatchCard = (match: Match) => {
    const isCompleted = match.status === "completed";
    const isLive = match.status === "live";

    return (
      <div
        key={match.id}
        className={`p-6 rounded-3xl border transition-all ${
          isCompleted
            ? "bg-slate-50/50 border-slate-200/60"
            : isLive
            ? "bg-emerald-50/40 border-emerald-400 ring-4 ring-emerald-500/10 shadow-md"
            : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
        } flex flex-col justify-between`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {match.stage === "semifinal" 
                ? "Semifinal Match" 
                : match.stage === "final" 
                ? "Championship Final" 
                : `Match #${match.id.replace("m-active-", "").split("-")[0]}`}
            </span>
            
            {/* Court Badge & Direct Editing */}
            {changingCourtMatchId === match.id ? (
              <select
                onChange={(e) => handleSaveCourtSelection(match.id, e.target.value)}
                onBlur={() => setChangingCourtMatchId(null)}
                defaultValue={match.court || "Court 1"}
                className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-md font-bold cursor-pointer"
                autoFocus
              >
                {Array.from({ length: parentCourtCount }).map((_, cIdx) => (
                  <option key={cIdx} value={`Court ${cIdx + 1}`}>
                    Court {cIdx + 1}
                  </option>
                ))}
              </select>
            ) : (
              <span 
                onClick={() => isAdmin && setChangingCourtMatchId(match.id)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border select-none ${
                  isAdmin ? "cursor-pointer hover:bg-slate-200 hover:border-slate-300" : ""
                } bg-slate-100 text-slate-600 border-slate-200`}
                title={isAdmin ? "Click to change court" : ""}
              >
                {match.court || "Court 1"} {isAdmin && "✏️"}
              </span>
            )}
          </div>

          {isCompleted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> COMPLETED
            </span>
          ) : isLive ? (
            <span className="px-2.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              LIVE MATCH
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold border border-slate-100">
              PENDING
            </span>
          )}
        </div>

        {/* Team vs Team Visualizer */}
        <div className="grid grid-cols-7 items-center gap-2 my-2 text-center">
          <div className="col-span-3">
            <p className="text-xs font-black text-slate-900 truncate">
              {getPlayerNames(match.team1)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">TEAM A</p>
          </div>
          <div className="col-span-1 flex flex-col items-center justify-center">
            {isCompleted || match.score1 > 0 || match.score2 > 0 ? (
              <div className="flex flex-col items-center gap-1">
                <div className="bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-black tracking-wider font-mono shadow-sm">
                  {match.score1}:{match.score2}
                </div>
                {isCompleted && match.games && match.games.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 text-[8px] font-mono text-slate-500 bg-slate-150 px-1.5 py-0.5 rounded-md leading-none max-w-[80px] text-center select-none shrink-0 whitespace-nowrap border border-slate-200">
                    {match.games.filter(g => g.score1 > 0 || g.score2 > 0).map((g, gi) => (
                      <span key={gi}>
                        G{gi+1}: {g.score1}-{g.score2}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs font-black text-slate-300 italic uppercase">VS</span>
            )}
          </div>
          <div className="col-span-3">
            <p className="text-xs font-black text-slate-900 truncate">
              {getPlayerNames(match.team2)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">TEAM B</p>
          </div>
        </div>

        {/* Manual Score Input Overlay (satisfied manual updates rule) */}
        {editingMatchId === match.id ? (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-inner">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                {match.stage === "semifinal" || match.stage === "final" ? "Playoff Score (Best of 3 Games)" : "Manual Score Update"}
              </p>
              {match.stage && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold uppercase px-2 py-0.5 rounded-full">
                  {match.stage}
                </span>
              )}
            </div>

            {match.stage === "semifinal" || match.stage === "final" ? (
              <div className="space-y-3">
                {/* Game 1 */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500">Game 1</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={game1Score1}
                      onChange={(e) => setGame1Score1(parseInt(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-black"
                    />
                    <span className="text-slate-300 font-bold">:</span>
                    <input
                      type="number"
                      min={0}
                      value={game1Score2}
                      onChange={(e) => setGame1Score2(parseInt(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-black"
                    />
                  </div>
                </div>

                {/* Game 2 */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500">Game 2</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={game2Score1}
                      onChange={(e) => setGame2Score1(parseInt(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-black"
                    />
                    <span className="text-slate-300 font-bold">:</span>
                    <input
                      type="number"
                      min={0}
                      value={game2Score2}
                      onChange={(e) => setGame2Score2(parseInt(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-black"
                    />
                  </div>
                </div>

                {/* Game 3 */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500">Game 3</span>
                    <span className="text-[8px] text-slate-400 font-medium">If necessary</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={game3Score1}
                      onChange={(e) => setGame3Score1(parseInt(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-black"
                    />
                    <span className="text-slate-300 font-bold">:</span>
                    <input
                      type="number"
                      min={0}
                      value={game3Score2}
                      onChange={(e) => setGame3Score2(parseInt(e.target.value) || 0)}
                      className="w-12 px-1.5 py-1 text-center border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-800 font-black"
                    />
                  </div>
                </div>

                {/* Live games won display */}
                <div className="text-[10px] bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100 font-bold text-center">
                  Calculated Best-of-3 wins:{" "}
                  <span className="font-black text-emerald-600">
                    {(() => {
                      let w1 = 0;
                      let w2 = 0;
                      if (game1Score1 > game1Score2) w1++; else if (game1Score2 > game1Score1) w2++;
                      if (game2Score1 > game2Score2) w1++; else if (game2Score2 > game2Score1) w2++;
                      if (game3Score1 > game3Score2) w1++; else if (game3Score2 > game3Score1) w2++;
                      return `Team A: ${w1} - Team B: ${w2}`;
                    })()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Team A Score</label>
                  <input
                    type="number"
                    min={0}
                    value={manualScore1}
                    onChange={(e) => setManualScore1(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-black shadow-xxs"
                  />
                </div>
                <span className="text-slate-300 font-bold mt-4">:</span>
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Team B Score</label>
                  <input
                    type="number"
                    min={0}
                    value={manualScore2}
                    onChange={(e) => setManualScore2(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-black shadow-xxs"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/40">
              <button
                type="button"
                onClick={() => setEditingMatchId(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveManualScore(match)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-xs"
              >
                Save Final
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-3 border-t border-slate-100/60 flex items-center justify-between">
            <div>
              {isCompleted && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  WINNER:{" "}
                  <span className="font-black text-emerald-600">
                    {match.score1 > match.score2 ? getPlayerNames(match.team1).split(" ")[0] : getPlayerNames(match.team2).split(" ")[0]}
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex gap-1.5">
              {isAdmin && !isCompleted && (
                <button
                  onClick={() => startManualScoreEdit(match)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-xxs"
                  title="Manually set score"
                >
                  <Edit3 className="h-3 w-3" /> Quick Edit
                </button>
              )}

              {isCompleted ? (
                <span className="text-[10px] text-slate-350 font-bold uppercase pr-2">REGISTERED</span>
              ) : (
                <button
                  onClick={() => onSelectMatchToPlay(match.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLive
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                  }`}
                >
                  <Play className="h-3 w-3 fill-current" /> {isLive ? (isAdmin ? "RESUME SCORE" : "WATCH SCORE") : (isAdmin ? "START MATCH" : "SPECTATE")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isShuffling ? (
        /* Shuffling Full-Screen-Vibe Box for Matchmaking */
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-10 text-center shadow-xl min-h-[450px] flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0,transparent_100%)] pointer-events-none" />
          <div className="animate-spin h-14 w-14 border-4 border-emerald-500 border-t-transparent rounded-full mb-6" />
          <h2 className="text-3xl font-black text-white tracking-tight animate-pulse">LIVE MATCHMAKING IN PROGRESS</h2>
          <p className="text-emerald-400 font-semibold tracking-widest text-xs uppercase mt-2">Shuffling and pairing players...</p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md w-full">
            {shufflingNames.slice(0, 6).map((name, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-bold tracking-wide transition-all scale-95 opacity-80"
              >
                {name}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-6 italic">Stay live! Generating optimal round robin schedule...</p>
        </div>
      ) : activeMatches.length > 0 ? (
        /* Active Tournament Display */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                  Active Tournament
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {format === "doubles" ? "Doubles Format" : "Singles Format"} • {activeMatches.length} Matches Scheduled • {parentCourtCount} {parentCourtCount === 1 ? "Court" : "Courts"} Rotation
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-950 mt-1.5 tracking-tight">Round Robin Arena</h2>
            </div>
            {isAdmin && (
              <button
                onClick={onClearTournament}
                className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold hover:bg-rose-100 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Reset Tournament
              </button>
            )}
          </div>

          {/* Formed Teams Showcase Bento Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-500" /> FORMED TEAMS IN ROTATION
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeTeams.map((team, idx) => (
                <div key={team.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 text-center shadow-xxs hover:bg-slate-100/50 transition-all">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2">
                    TEAM {idx + 1}
                  </span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">{getTeamMemberNames(team.playerIds)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Playoffs Stage (Semifinals & Finals) */}
          {(semifinalMatches.length > 0 || finalMatches.length > 0) && (
            <div className="space-y-6 mb-6">
              {semifinalMatches.length > 0 && (
                <div className="space-y-3 bg-indigo-50/20 p-6 rounded-3xl border border-indigo-100">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-indigo-500 animate-bounce" />
                    Semifinal Matches (Playoffs)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {semifinalMatches.map((match) => renderMatchCard(match))}
                  </div>
                </div>
              )}

              {finalMatches.length > 0 && (
                <div className="space-y-3 bg-amber-50/25 p-6 rounded-3xl border border-amber-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500 animate-pulse" />
                    Championship Final Match (The Grand Finale)
                  </h3>
                  <div className="max-w-xl mx-auto">
                    {finalMatches.map((match) => renderMatchCard(match))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Standings Table for Round Robin */}
          {roundRobinMatches.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-emerald-500" /> LIVE ROUND ROBIN STANDINGS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Team</th>
                      <th className="py-2.5 px-3 text-center">Played</th>
                      <th className="py-2.5 px-3 text-center">Won</th>
                      <th className="py-2.5 px-3 text-center font-bold text-emerald-600">Wins</th>
                      <th className="py-2.5 px-3 text-center">Pts Scored</th>
                      <th className="py-2.5 px-3 text-center">Pts Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateTeamStandings(activeTeams, activeMatches).map((teamStat, idx) => {
                      const teamData = activeTeams.find(t => t.id === teamStat.teamId);
                      
                      return (
                        <tr key={teamStat.teamId} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                              idx === 0 
                                ? "bg-amber-100 text-amber-800" 
                                : idx === 1 
                                ? "bg-slate-100 text-slate-800" 
                                : idx === 2 
                                ? "bg-orange-100 text-orange-800" 
                                : "bg-slate-50 text-slate-500"
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-black text-slate-900">{teamData ? getTeamMemberNames(teamData.playerIds) : teamStat.teamName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{teamStat.played}</td>
                          <td className="py-3 px-3 text-center font-mono">{teamStat.won}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 text-sm">{teamStat.won}</td>
                          <td className="py-3 px-3 text-center font-mono">{teamStat.pointsScored}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span className={teamStat.diff > 0 ? "text-emerald-600" : teamStat.diff < 0 ? "text-rose-600" : "text-slate-400"}>
                              {teamStat.diff > 0 ? `+${teamStat.diff}` : teamStat.diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Round Robin Stage Matches */}
          {roundRobinMatches.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Round Robin Matches (Each Team Plays Twice)
              </h3>
              {Object.keys(matchesByRound).map((roundStr) => {
                const round = parseInt(roundStr);
                return (
                  <div key={round} className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
                      ROUND {round}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matchesByRound[round].map((match) => renderMatchCard(match))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : podiumResults ? (
        /* Championship Completed Podium (decorated with trophies and gold/silver/bronze medals) */
        <div className="bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 p-1 rounded-3xl shadow-xl relative overflow-hidden animate-fade-in">
          {/* Confetti simulation background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0,transparent_100%)] pointer-events-none" />
          
          <div className="bg-slate-950 text-white rounded-[22px] p-6 md:p-10 text-center relative z-10 space-y-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full animate-pulse" />
                <Trophy className="w-20 h-20 text-amber-400 animate-bounce relative z-10 drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]" />
              </div>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-950/80 px-4 py-1.5 rounded-full border border-amber-500/30">
                CHAMPIONSHIP COMPLETED
              </span>
              <p className="text-xs text-slate-400 font-medium">{podiumResults.date} • Match Summary: {podiumResults.scoreSummary}</p>
            </div>

            {/* 1st Place (Big Font with Gold Medals & Trophies) */}
            <div className="space-y-4 bg-amber-950/25 border border-amber-500/30 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-inner ring-2 ring-amber-400/40">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl">🥇</span>
                <span className="text-xs font-black text-amber-400 tracking-widest uppercase">1st Place / Champions</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-amber-300 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {podiumResults.winnerTeamName}
              </h2>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {podiumResults.winnerPlayers.map((player, idx) => (
                  <span key={idx} className="bg-amber-400/10 text-amber-300 border border-amber-400/30 px-4 py-1.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-sm">
                    🥇 {player}
                  </span>
                ))}
              </div>
            </div>

            {/* 2nd & 3rd Place Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-4 border-t border-slate-900">
              {/* 2nd Place */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🥈</span>
                    <span className="text-[10px] font-black text-slate-350 tracking-widest uppercase">2nd Place / Runners-up</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">{podiumResults.runnerUpTeamName}</h3>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {podiumResults.runnerUpPlayers.map((player, idx) => (
                    <span key={idx} className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      🥈 {player}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3rd Place */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🥉</span>
                    <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase">3rd Place / Bronze</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">{podiumResults.thirdTeamName}</h3>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {podiumResults.thirdPlayers.map((player, idx) => (
                    <span key={idx} className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      🥉 {player}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={onClearTournament}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md transition-all flex items-center gap-2 animate-pulse"
                >
                  <RefreshCw className="w-4 h-4" /> Start New Tournament
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Setup / Player Selection Screen */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-8">
          <div>
            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Configuration</span>
            <h2 className="text-2xl font-black text-slate-950 mt-1 tracking-tight">Setup Live Tournament</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Select active players, available courts count, and matchmaking format for today's matches.</p>
          </div>

          {isAdmin ? (
            <>
              {/* Format selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Game Format</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormat("doubles")}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all cursor-pointer h-full ${
                      format === "doubles"
                        ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-xxs"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className={`p-2.5 w-10 h-10 rounded-xl flex items-center justify-center ${format === "doubles" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">Doubles Championship (2v2)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">Auto-generate double teams and set up a round-robin schedule.</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("singles")}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all cursor-pointer h-full ${
                      format === "singles"
                        ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-xxs"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className={`p-2.5 w-10 h-10 rounded-xl flex items-center justify-center ${format === "singles" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">Singles Matchup (1v1)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">Set up a round-robin singles schedule where each player faces off individually.</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("teams")}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all cursor-pointer h-full ${
                      format === "teams"
                        ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-xxs"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className={`p-2.5 w-10 h-10 rounded-xl flex items-center justify-center ${format === "teams" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">Custom Teams Play (Group)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">Divide players into a specific number of custom teams for a round-robin league.</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Teams Settings */}
              {format === "teams" && (
                <div className="space-y-3 border-t border-slate-100 pt-5 animate-fade-in">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Number of Teams to Create</label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Choose how many custom teams to split your active players into.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[2, 3, 4, 5, 6, 8].map((tCount) => (
                      <button
                        key={tCount}
                        type="button"
                        onClick={() => setCustomTeamCount(tCount)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-black tracking-widest uppercase transition-all cursor-pointer ${
                          customTeamCount === tCount
                            ? "border-emerald-500 bg-emerald-650 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {tCount} Teams
                      </button>
                    ))}
                    
                    {/* Direct input for other values */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-slate-400 font-bold">Or:</span>
                      <input
                        type="number"
                        min={2}
                        max={selectedPlayerIds.length || 16}
                        value={customTeamCount}
                        onChange={(e) => setCustomTeamCount(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-black text-slate-800 shadow-xxs focus:outline-emerald-500"
                        title="Enter any team count"
                      />
                    </div>
                  </div>

                  {/* Live Simulation of team distribution */}
                  {selectedPlayerIds.length > 0 && !isManualAssignment && (
                    <div className="bg-emerald-50/50 border border-emerald-100/60 p-4 rounded-2xl text-xs space-y-1.5">
                      <p className="font-bold text-emerald-950 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-emerald-650" /> Live Team Configuration Preview
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Splitting <span className="font-black text-emerald-700">{selectedPlayerIds.length} players</span> into <span className="font-black text-emerald-700">{customTeamCount} teams</span>:
                      </p>
                      <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-0.5 font-semibold">
                        {Array.from({ length: customTeamCount }).map((_, idx) => {
                          // Math calculation for distribution
                          const count = Math.floor(selectedPlayerIds.length / customTeamCount) + (idx < (selectedPlayerIds.length % customTeamCount) ? 1 : 0);
                          return (
                            <li key={idx}>
                              Team {idx + 1}: <span className="text-slate-700">{count} {count === 1 ? "player" : "players"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Team Assignment Method */}
              {format !== "singles" && (
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Team Assignment Mode</label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Choose how to group players into teams for this session.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsManualAssignment(false)}
                      className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        !isManualAssignment
                          ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 shadow-xxs"
                      }`}
                    >
                      <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${!isManualAssignment ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Shuffle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs">Auto-Generate (Random)</h4>
                        <p className="text-[10px] text-slate-400 leading-tight font-medium">Instantly shuffle and pair players randomly.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsManualAssignment(true)}
                      className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isManualAssignment
                          ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 shadow-xxs"
                      }`}
                    >
                      <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isManualAssignment ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs">Manually Form Teams</h4>
                        <p className="text-[10px] text-slate-400 leading-tight font-medium">Create specific player partnerships and groupings.</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Court Allocation Selection (Rule satisfaction) */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Number of Courts Available</label>
                  <p className="text-[11px] text-slate-400 mt-0.5">Games will be distributed across the available courts automatically.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSetupCourts(c)}
                      className={`px-5 py-3.5 rounded-2xl border text-xs font-black tracking-widest uppercase transition-all cursor-pointer ${
                        setupCourts === c
                          ? "border-emerald-500 bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-500/10"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {c} {c === 1 ? "Court" : "Courts"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Player Selection */}
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Select Active Players ({selectedPlayerIds.length})
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {format === "doubles"
                        ? "Choose an even number of players (at least 4) for random team matches."
                        : format === "teams"
                        ? `Choose at least ${customTeamCount} players to distribute into ${customTeamCount} teams.`
                        : "Choose at least 2 players."}
                    </p>
                  </div>
                  <div className="flex gap-2 font-black">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={selectNone}
                      className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200/60 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Players checkboxes grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 max-h-80 overflow-y-auto">
                  {players.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => togglePlayerSelection(player.id)}
                        className={`p-4 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xxs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="truncate pr-1">{player.name}</span>
                        <div className={`h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 transition-all text-[11px] font-black ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50 text-transparent"}`}>
                          ✓
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual Team Assignment Workspace */}
              {isManualAssignment && format !== "singles" && selectedPlayerIds.length > 0 && (
                <div className="space-y-4 border-t border-slate-100 pt-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Manual Team Assignment Workspace
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assign your selected active players to custom partnerships or groupings.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddManualTeam}
                        className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-600" /> Add New Team
                      </button>

                      {selectedPlayerIds.filter(id => !manualTeams.flatMap(t => t.playerIds).includes(id)).length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoAssignRemaining}
                          className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100 cursor-pointer flex items-center gap-1.5"
                        >
                          <Shuffle className="h-3.5 w-3.5" /> Auto-Assign Remaining ({selectedPlayerIds.filter(id => !manualTeams.flatMap(t => t.playerIds).includes(id)).length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unassigned Pool Preview */}
                  <div className="bg-slate-50/60 border border-slate-150 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Unassigned Players Pool ({selectedPlayerIds.filter(id => !manualTeams.flatMap(t => t.playerIds).includes(id)).length})
                      </span>
                    </div>
                    {selectedPlayerIds.filter(id => !manualTeams.flatMap(t => t.playerIds).includes(id)).length === 0 ? (
                      <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-650" /> All selected players have been successfully assigned to teams!
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPlayerIds.filter(id => !manualTeams.flatMap(t => t.playerIds).includes(id)).map(id => {
                          const p = players.find(player => player.id === id);
                          return (
                            <div
                              key={id}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-xxs"
                            >
                              {p?.name || "Player"}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Teams Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/30 p-5 rounded-2xl border border-slate-200/60 max-h-[500px] overflow-y-auto">
                    {manualTeams.map((team, idx) => {
                      const assignedIds = manualTeams.flatMap(t => t.playerIds);
                      const unassignedPlayers = players.filter(p => selectedPlayerIds.includes(p.id) && !assignedIds.includes(p.id));
                      return (
                        <div key={team.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xxs space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <input
                              type="text"
                              value={team.name}
                              onChange={(e) => handleUpdateTeamName(team.id, e.target.value)}
                              className="font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 bg-slate-50 border border-slate-200 w-full"
                              placeholder={`Team ${idx + 1}`}
                            />
                            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase shrink-0">
                              {format === "doubles" ? `${team.playerIds.length}/2` : `${team.playerIds.length} Players`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveManualTeam(team.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                              title="Delete Team"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Player List */}
                          <div className="space-y-1.5 min-h-[40px]">
                            {team.playerIds.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">No players assigned</p>
                            ) : (
                              <div className="space-y-1">
                                {team.playerIds.map(id => {
                                  const player = players.find(p => p.id === id);
                                  return (
                                    <div key={id} className="flex items-center justify-between bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-150 text-[11px] font-semibold text-slate-700">
                                      <span className="truncate">{player?.name || "Player"}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePlayerFromTeam(team.id, id)}
                                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                                        title="Remove Player"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Add Player Dropdown */}
                          {(format !== "doubles" || team.playerIds.length < 2) && unassignedPlayers.length > 0 && (
                            <div className="pt-1">
                              <select
                                value=""
                                onChange={(e) => handleAddPlayerToTeam(team.id, e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 focus:outline-emerald-500 cursor-pointer"
                              >
                                <option value="">+ Assign Player...</option>
                                {unassignedPlayers.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Trigger */}
              <div className="pt-6 border-t border-slate-150 flex justify-end">
                {isManualAssignment && format !== "singles" ? (
                  <button
                    onClick={handleStartManualTournament}
                    disabled={
                      format === "doubles"
                        ? selectedPlayerIds.length < 4
                        : format === "teams"
                        ? selectedPlayerIds.length < customTeamCount
                        : selectedPlayerIds.length < 2
                    }
                    className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-400" /> Start Manual Teams Round Robin
                  </button>
                ) : (
                  <button
                    onClick={handleRandomMatchmaking}
                    disabled={
                      format === "doubles"
                        ? selectedPlayerIds.length < 4
                        : format === "teams"
                        ? selectedPlayerIds.length < customTeamCount
                        : selectedPlayerIds.length < 2
                    }
                    className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Shuffle className="h-4 w-4 text-emerald-400" /> Form Teams & Start Round Robin
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Spectator message when no active matches exist */
            <div className="bg-slate-50/50 border border-slate-200 p-8 rounded-3xl text-center space-y-4 max-w-lg mx-auto py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">No Active Tournament Session</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                The court scheduling system is empty. The tournament administrator needs to log in, select players, and launch today's match pairing rotation.
              </p>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white p-3.5 border border-slate-200/60 rounded-xl shadow-xxs">
                Viewing in Read-Only Spectator Mode
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
