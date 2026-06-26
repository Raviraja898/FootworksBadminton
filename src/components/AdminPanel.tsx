import React, { useState } from "react";
import { Player, Tournament, Match } from "../types";
import { Lock, Unlock, Shield, UserPlus, FilePlus2, Upload, Trash2, Key, RefreshCw, AlertTriangle, Plus, Check } from "lucide-react";

interface AdminPanelProps {
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  players: Player[];
  tournaments: Tournament[];
  matches: Match[];
  onAddPlayer: (name: string) => void;
  onEditPlayerName: (id: string, newName: string) => void;
  onDeletePlayer: (id: string) => void;
  onAddPastTournament: (tournament: Tournament) => void;
  onAddPastMatch: (match: Match) => void;
  onBulkUpload: (players: Player[], tournaments: Tournament[], matches: Match[]) => void;
  onResetToDefaults: () => void;
  onClearScores: () => void;
  onClearAllData: () => void;
}

export default function AdminPanel({
  isAdmin,
  setIsAdmin,
  players,
  tournaments,
  matches,
  onAddPlayer,
  onEditPlayerName,
  onDeletePlayer,
  onAddPastTournament,
  onAddPastMatch,
  onBulkUpload,
  onResetToDefaults,
  onClearScores,
  onClearAllData,
}: AdminPanelProps) {
  // Password auth
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Forms states
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");

  // Tournament form state
  const [tourneyName, setTourneyName] = useState("");
  const [tourneyDate, setTourneyDate] = useState("");
  const [tourneyWinner1, setTourneyWinner1] = useState("");
  const [tourneyWinner2, setTourneyWinner2] = useState("");
  const [tourneyRunnerUp1, setTourneyRunnerUp1] = useState("");
  const [tourneyRunnerUp2, setTourneyRunnerUp2] = useState("");
  const [tourneyScore, setTourneyScore] = useState("");

  // Match form state
  const [matchTourneyId, setMatchTourneyId] = useState("historical");
  const [matchDate, setMatchDate] = useState("");
  const [matchTeam1P1, setMatchTeam1P1] = useState("");
  const [matchTeam1P2, setMatchTeam1P2] = useState("");
  const [matchTeam2P1, setMatchTeam2P1] = useState("");
  const [matchTeam2P2, setMatchTeam2P2] = useState("");
  const [matchScore1, setMatchScore1] = useState(0);
  const [matchScore2, setMatchScore2] = useState(0);

  // Bulk paste JSON
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");
  const [bulkErrorMsg, setBulkErrorMsg] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "footworks2026") {
      setIsAdmin(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect admin password. Please try again!");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setPassword("");
  };

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    onAddPlayer(newPlayerName.trim());
    setNewPlayerName("");
  };

  const startEditingPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  };

  const saveEditedPlayerName = (id: string) => {
    if (!editingPlayerName.trim()) return;
    onEditPlayerName(id, editingPlayerName.trim());
    setEditingPlayerId(null);
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourneyName || !tourneyDate || !tourneyWinner1) {
      alert("Please fill in the Tournament Name, Date, and at least one Champion.");
      return;
    }

    const newTourney: Tournament = {
      id: `t-custom-${Date.now()}`,
      name: tourneyName,
      date: tourneyDate,
      winner1Id: tourneyWinner1,
      winner2Id: tourneyWinner2 || undefined,
      runnerUp1Id: tourneyRunnerUp1 || undefined,
      runnerUp2Id: tourneyRunnerUp2 || undefined,
      scoreSummary: tourneyScore || undefined,
      isHistorical: true,
    };

    onAddPastTournament(newTourney);

    // Reset Form
    setTourneyName("");
    setTourneyDate("");
    setTourneyWinner1("");
    setTourneyWinner2("");
    setTourneyRunnerUp1("");
    setTourneyRunnerUp2("");
    setTourneyScore("");

    alert("Past Tournament registered successfully!");
  };

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchDate || !matchTeam1P1 || !matchTeam2P1) {
      alert("Please select the match date and at least one player for each team.");
      return;
    }

    const team1 = [matchTeam1P1];
    if (matchTeam1P2) team1.push(matchTeam1P2);

    const team2 = [matchTeam2P1];
    if (matchTeam2P2) team2.push(matchTeam2P2);

    // Ensure players are unique across teams
    const allPlayerIds = [...team1, ...team2];
    const uniqueIds = new Set(allPlayerIds);
    if (uniqueIds.size !== allPlayerIds.length) {
      alert("Error: The same player cannot be assigned to multiple slots in the same match!");
      return;
    }

    const newMatch: Match = {
      id: `m-custom-${Date.now()}`,
      tournamentId: matchTourneyId,
      team1,
      team2,
      score1: Number(matchScore1),
      score2: Number(matchScore2),
      status: "completed",
      date: matchDate,
    };

    onAddPastMatch(newMatch);

    // Reset Form
    setMatchTeam1P1("");
    setMatchTeam1P2("");
    setMatchTeam2P1("");
    setMatchTeam2P2("");
    setMatchScore1(0);
    setMatchScore2(0);

    alert("Match score added successfully! Standings are automatically updated.");
  };

  const handleBulkUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSuccessMsg("");
    setBulkErrorMsg("");

    try {
      const parsed = JSON.parse(bulkJsonText);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Pasted text is not a valid JSON object.");
      }

      const uploadedPlayers = parsed.players || [];
      const uploadedTournaments = parsed.tournaments || [];
      const uploadedMatches = parsed.matches || [];

      if (!Array.isArray(uploadedPlayers) || !Array.isArray(uploadedTournaments) || !Array.isArray(uploadedMatches)) {
        throw new Error("JSON must contain 'players', 'tournaments', and 'matches' as arrays.");
      }

      // Basic validation check
      if (uploadedPlayers.length > 0) {
        const hasIdAndName = uploadedPlayers.every((p: any) => p.id && p.name);
        if (!hasIdAndName) throw new Error("All players must contain 'id' and 'name' fields.");
      }

      onBulkUpload(uploadedPlayers, uploadedTournaments, uploadedMatches);
      setBulkSuccessMsg(`Successfully uploaded: ${uploadedPlayers.length} players, ${uploadedTournaments.length} tournaments, ${uploadedMatches.length} matches!`);
      setBulkJsonText("");
    } catch (err) {
      setBulkErrorMsg(err instanceof Error ? err.message : "Failed to parse JSON bulk structure.");
    }
  };

  const sampleJsonTemplate = JSON.stringify(
    {
      players: [
        { id: "p101", name: "Custom Player A", joinedAt: "2026-06-25" },
        { id: "p102", name: "Custom Player B", joinedAt: "2026-06-25" },
      ],
      tournaments: [
        {
          id: "t101",
          name: "Sprint Cup 2026",
          date: "2026-06-20",
          winner1Id: "p101",
          winner2Id: "p102",
          scoreSummary: "21-15, 21-12",
          isHistorical: true,
        },
      ],
      matches: [
        {
          id: "m101",
          tournamentId: "t101",
          team1: ["p101", "p102"],
          team2: ["p1", "p2"],
          score1: 21,
          score2: 15,
          status: "completed",
          date: "2026-06-20",
        },
      ],
    },
    null,
    2
  );

  if (!isAdmin) {
    return (
      /* Password Protection Challenge Screen - Bento Style */
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 my-12">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 shadow-sm">
            <Lock className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-black tracking-widest text-emerald-600 uppercase">Authentication</span>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Footworks Admin</h2>
          <p className="text-xs text-slate-400 font-medium">Please verify system credential to unlock roster & stats controls.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-850 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
              />
            </div>
          </div>

          {authError && <p className="text-[11px] text-rose-500 font-black uppercase tracking-wider">{authError}</p>}

          <button
            type="submit"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Unlock className="h-4 w-4 text-emerald-400" /> UNLOCK SYSTEM
          </button>
        </form>

        <div className="bg-slate-50/50 p-4 rounded-2xl text-[10px] text-slate-400 leading-relaxed border border-slate-200/60 text-center">
          <p className="font-bold">
            DEFAULT SYSTEM PASSWORD: <span className="font-black text-slate-800 font-sans tracking-wide">footworks2026</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Panel Header Bento */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase block">SYSTEM MODE: AUTHORIZED</span>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5">Footworks Admin Console</h2>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/25 text-white border border-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          LOG OUT ADMIN
        </button>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Player Roster & Resets */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Player Roster Manager Bento */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Roster Control</span>
              <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                Manage Players
              </h3>
            </div>

            {/* Add Player Form */}
            <form onSubmit={handleCreatePlayer} className="flex gap-2">
              <input
                type="text"
                placeholder="New player name..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
              />
              <button
                type="submit"
                className="px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-4.5 w-4.5" /> ADD
              </button>
            </form>

            {/* Players list with edit/delete */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {players.map((player) => (
                <div key={player.id} className="p-3 bg-slate-50/55 border border-slate-200/50 rounded-2xl flex items-center justify-between text-xs font-bold hover:bg-slate-50 transition-colors">
                  {editingPlayerId === player.id ? (
                    <div className="flex gap-1.5 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingPlayerName}
                        onChange={(e) => setEditingPlayerName(e.target.value)}
                        className="flex-1 px-3 py-1 border border-slate-250 rounded-xl bg-white text-xs font-bold"
                      />
                      <button
                        onClick={() => saveEditedPlayerName(player.id)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="truncate text-slate-800 pl-1">{player.name}</span>
                  )}

                  <div className="flex gap-1 shrink-0">
                    {editingPlayerId !== player.id && (
                      <button
                        onClick={() => startEditingPlayer(player)}
                        className="px-2 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                      >
                        RENAME
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${player.name}? This will affect stats where this player participated.`)) {
                          onDeletePlayer(player.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. System Reset / Recovery Bento */}
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 space-y-4 shadow-xxs">
            <div>
              <span className="text-[9px] font-black text-rose-800 uppercase tracking-widest block">Danger Zone</span>
              <h3 className="text-sm font-black text-rose-900 mt-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5" />
                Emergency Recovery
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Manage database cleanup, reset mock data, or wipe lists for a fresh start.
            </p>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("WARNING: Are you sure you want to clear all historical matches and tournament scores? This will reset the scoreboard/standings but keep your player list intact.")) {
                    onClearScores();
                    alert("All historical scores and matches have been cleared!");
                  }
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-2xl text-[10px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" /> Clear All Scores & Matches
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("CRITICAL WARNING: Are you sure you want to wipe the ENTIRE database, including all players, matches, and tournaments? This cannot be undone!")) {
                    onClearAllData();
                    alert("The entire database has been wiped clean!");
                  }
                }}
                className="w-full py-2.5 bg-rose-650 hover:bg-rose-700 text-white font-black uppercase tracking-wider rounded-2xl text-[10px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" /> Clear Entire Database
              </button>

              <div className="border-t border-rose-200/50 my-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("WARNING: Are you sure you want to reset everything back to the original preloaded default data? This action is irreversible!")) {
                      onResetToDefaults();
                      alert("Restored defaults successfully!");
                    }
                  }}
                  className="w-full py-2.5 border border-rose-300 text-rose-750 hover:bg-rose-100/50 font-black uppercase tracking-wider rounded-2xl text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Restore Default Database
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forms to log history */}
        <div className="lg:col-span-8 space-y-4">
          {/* A. Register Previous Tournament Championship Form Bento */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Logs Creation</span>
              <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <FilePlus2 className="h-4.5 w-4.5 text-emerald-600" />
                Register Past Tournament Champion
              </h3>
            </div>

            <form onSubmit={handleCreateTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tournament Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Footworks Summer Open 2025"
                  value={tourneyName}
                  onChange={(e) => setTourneyName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date</label>
                <input
                  type="date"
                  required
                  value={tourneyDate}
                  onChange={(e) => setTourneyDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-black text-emerald-700">Winner / Champion 1</label>
                <select
                  required
                  value={tourneyWinner1}
                  onChange={(e) => setTourneyWinner1(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs cursor-pointer"
                >
                  <option value="">-- Choose Champion 1 --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-emerald-700">Champion 2 (Doubles Partner)</label>
                <select
                  value={tourneyWinner2}
                  onChange={(e) => setTourneyWinner2(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs cursor-pointer"
                >
                  <option value="">-- None (Singles Match) --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Runner-Up 1</label>
                <select
                  value={tourneyRunnerUp1}
                  onChange={(e) => setTourneyRunnerUp1(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs cursor-pointer"
                >
                  <option value="">-- Choose Runner-Up 1 --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Runner-Up 2</label>
                <select
                  value={tourneyRunnerUp2}
                  onChange={(e) => setTourneyRunnerUp2(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs cursor-pointer"
                >
                  <option value="">-- None --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-full space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Final Score Summary</label>
                <input
                  type="text"
                  placeholder="e.g. 21-18, 19-21, 21-15"
                  value={tourneyScore}
                  onChange={(e) => setTourneyScore(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
                />
              </div>

              <div className="col-span-full pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-2xl text-xs transition-colors cursor-pointer shadow-sm"
                >
                  REGISTER CHAMPIONSHIP
                </button>
              </div>
            </form>
          </div>

          {/* B. Log Past Match Scores Form Bento */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Matches Ledger Creation</span>
              <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <FilePlus2 className="h-4.5 w-4.5 text-emerald-600" />
                Upload Past Match Score (Direct Stats Integration)
              </h3>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tournament Category</label>
                  <select
                    value={matchTourneyId}
                    onChange={(e) => setMatchTourneyId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs cursor-pointer"
                  >
                    <option value="historical">General Historical</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Match Date</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
                  />
                </div>
              </div>

              {/* Teams Matchups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50/50 rounded-2xl border border-slate-200/60">
                {/* Team 1 Section */}
                <div className="space-y-4">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block border-b border-slate-200/50 pb-1">TEAM A</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      required
                      value={matchTeam1P1}
                      onChange={(e) => setMatchTeam1P1(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="">-- Player 1 --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matchTeam1P2}
                      onChange={(e) => setMatchTeam1P2(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="">-- Player 2 (Partner) --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Points Scored</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={matchScore1}
                      onChange={(e) => setMatchScore1(Number(e.target.value))}
                      className="w-28 px-4 py-2 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-black shadow-xxs"
                    />
                  </div>
                </div>

                {/* Team 2 Section */}
                <div className="space-y-4">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block border-b border-slate-200/50 pb-1">TEAM B</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      required
                      value={matchTeam2P1}
                      onChange={(e) => setMatchTeam2P1(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="">-- Player 1 --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matchTeam2P2}
                      onChange={(e) => setMatchTeam2P2(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="">-- Player 2 (Partner) --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Points Scored</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={matchScore2}
                      onChange={(e) => setMatchScore2(Number(e.target.value))}
                      className="w-28 px-4 py-2 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-black shadow-xxs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-2xl text-xs transition-colors cursor-pointer shadow-sm"
                >
                  REGISTER COMPLETED GAME
                </button>
              </div>
            </form>
          </div>

          {/* C. Bulk Paste JSON Data Bento */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Developer Control</span>
              <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <Upload className="h-4.5 w-4.5 text-emerald-600" />
                Bulk Import (JSON Ledger)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Import historical stats or players catalog by pasting a structured JSON configuration. Warning: This merges data with existing records.
            </p>

            <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
              <textarea
                rows={8}
                placeholder={`Paste JSON here...\nExample template:\n${sampleJsonTemplate}`}
                value={bulkJsonText}
                onChange={(e) => setBulkJsonText(e.target.value)}
                className="w-full p-4 border border-slate-200 rounded-2xl text-[10px] font-mono bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
              />

              {bulkSuccessMsg && <p className="text-xs text-emerald-600 font-black uppercase tracking-wider">{bulkSuccessMsg}</p>}
              {bulkErrorMsg && <p className="text-xs text-rose-600 font-black uppercase tracking-wider">Error: {bulkErrorMsg}</p>}

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkJsonText(sampleJsonTemplate)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Load Sample Template
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  SUBMIT BULK DATA
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
