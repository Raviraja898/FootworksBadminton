import React, { useState, useEffect } from "react";
import { Player, Match } from "../types";
import { ArrowLeft, RefreshCw, Undo2, CheckCircle, Volume2, ShieldAlert } from "lucide-react";

interface LiveScoreboardProps {
  activeMatch: Match | null;
  players: Player[];
  isAdmin: boolean;
  onCompleteMatch: (matchId: string, score1: number, score2: number) => void;
  onUpdateLiveScore?: (matchId: string, score1: number, score2: number) => void;
  onBackToArena: () => void;
}

export default function LiveScoreboard({
  activeMatch,
  players,
  isAdmin,
  onCompleteMatch,
  onUpdateLiveScore,
  onBackToArena,
}: LiveScoreboardProps) {
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [servingTeam, setServingTeam] = useState<1 | 2>(1); // 1 = Team 1, 2 = Team 2
  const [scoreHistory, setScoreHistory] = useState<{ s1: number; s2: number; serv: 1 | 2 }[]>([]);

  // Synchronize when the active match changes
  useEffect(() => {
    if (activeMatch) {
      setScore1(activeMatch.score1 || 0);
      setScore2(activeMatch.score2 || 0);
      setServingTeam(1);
      setScoreHistory([]);
    }
  }, [activeMatch]);

  if (!activeMatch) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4 max-w-lg mx-auto">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <Volume2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Active Match Loaded</h3>
        <p className="text-sm text-slate-500">
          To start recording live scores, please head over to the **Tournament Arena** tab, select active players, generate a schedule, and click **"Start Live Match"** on any pairing!
        </p>
        <button
          onClick={onBackToArena}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Go to Tournament Arena
        </button>
      </div>
    );
  }

  const getPlayerNames = (ids: string[]) => {
    return ids.map((id) => players.find((p) => p.id === id)?.name || "Unknown").join(" & ");
  };

  const getSingleName = (ids: string[], idx: number) => {
    const player = players.find((p) => p.id === ids[idx]);
    return player ? player.name.split(" ")[0] : "Player";
  };

  // Score adjustments
  const incrementScore = (team: 1 | 2) => {
    if (!isAdmin) return; // Only admin can edit

    // Record history for Undo
    setScoreHistory((prev) => [...prev, { s1: score1, s2: score2, serv: servingTeam }]);

    if (team === 1) {
      const newScore = score1 + 1;
      setScore1(newScore);
      setServingTeam(1); // Point winner serves next
      onUpdateLiveScore?.(activeMatch.id, newScore, score2);
    } else {
      const newScore = score2 + 1;
      setScore2(newScore);
      setServingTeam(2);
      onUpdateLiveScore?.(activeMatch.id, score1, newScore);
    }
  };

  const decrementScore = (team: 1 | 2, e: React.MouseEvent) => {
    if (!isAdmin) return; // Only admin can edit
    e.stopPropagation(); // Prevent trigger increment on parent click

    if (team === 1 && score1 > 0) {
      setScoreHistory((prev) => [...prev, { s1: score1, s2: score2, serv: servingTeam }]);
      const newScore = score1 - 1;
      setScore1(newScore);
      onUpdateLiveScore?.(activeMatch.id, newScore, score2);
    } else if (team === 2 && score2 > 0) {
      setScoreHistory((prev) => [...prev, { s1: score1, s2: score2, serv: servingTeam }]);
      const newScore = score2 - 1;
      setScore2(newScore);
      onUpdateLiveScore?.(activeMatch.id, score1, newScore);
    }
  };

  const undoLastPoint = () => {
    if (!isAdmin) return; // Only admin can edit
    if (scoreHistory.length === 0) return;
    const previous = scoreHistory[scoreHistory.length - 1];
    setScore1(previous.s1);
    setScore2(previous.s2);
    setServingTeam(previous.serv);
    setScoreHistory((prev) => prev.slice(0, -1));
    onUpdateLiveScore?.(activeMatch.id, previous.s1, previous.s2);
  };

  const resetScores = () => {
    if (!isAdmin) return; // Only admin can edit
    if (window.confirm("Are you sure you want to reset current scores back to 0-0?")) {
      setScoreHistory((prev) => [...prev, { s1: score1, s2: score2, serv: servingTeam }]);
      setScore1(0);
      setScore2(0);
      setServingTeam(1);
      onUpdateLiveScore?.(activeMatch.id, 0, 0);
    }
  };

  const handleFinishGame = () => {
    if (!isAdmin) return; // Only admin can edit
    if (score1 === 0 && score2 === 0) {
      alert("Please record some scores before completing the match.");
      return;
    }
    const maxScore = Math.max(score1, score2);
    const scoreDiff = Math.abs(score1 - score2);

    // Warn if standard badminton win criteria are not met (at least 21 points, must win by 2 points, max 30)
    let isStandardWin = maxScore >= 21 && scoreDiff >= 2;
    if (maxScore === 30) isStandardWin = true; // Deciding point at 29-29

    if (!isStandardWin) {
      const proceed = window.confirm(
        `Note: Standard badminton games are played to 21 points with a margin of 2. Current score is ${score1}-${score2}. Do you still want to record this score and finish the match?`
      );
      if (!proceed) return;
    } else {
      const proceed = window.confirm(`Confirm finished match score: ${getPlayerNames(activeMatch.team1)} (${score1}) vs ${getPlayerNames(activeMatch.team2)} (${score2})?`);
      if (!proceed) return;
    }

    onCompleteMatch(activeMatch.id, score1, score2);
  };

  // Determine current court positioning for doubles serving visualizer
  const isServerOnRight = (servingTeam === 1 ? score1 : score2) % 2 === 0;

  return (
    <div className="space-y-6">
      {/* Header Info Bento Block */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <button
          onClick={onBackToArena}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 flex items-center gap-2 transition-all cursor-pointer shadow-xxs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Schedule
        </button>
        <div className="text-center">
          {isAdmin ? (
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-1 rounded-full uppercase tracking-widest">
              LIVE MATCH RECORDING (ADMIN)
            </span>
          ) : (
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-3.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              SPECTATOR SCREEN (READ-ONLY)
            </span>
          )}
        </div>
        <div className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
          {activeMatch.court || "Court 1"}
        </div>
      </div>

      {/* Main Stadium Scoreboard - Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Score Card (Team 1) */}
        <div className="lg:col-span-5 flex flex-col">
          <div
            onClick={() => incrementScore(1)}
            className={`flex-1 p-8 rounded-3xl border text-center transition-all shadow-sm select-none relative group min-h-[300px] flex flex-col justify-between ${
              isAdmin ? "cursor-pointer" : "cursor-default"
            } ${
              servingTeam === 1
                ? "bg-slate-900 text-white border-emerald-500 ring-4 ring-emerald-500/10"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="absolute top-5 left-5 flex items-center gap-1.5">
              {servingTeam === 1 && (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-widest ${servingTeam === 1 ? "text-emerald-400" : "text-slate-400"}`}>
                {servingTeam === 1 ? "SERVERS • READY" : "RECEIVERS"}
              </span>
            </div>

            <div className="pt-6">
              <h3 className="text-xl font-black tracking-tight truncate px-4">
                {getPlayerNames(activeMatch.team1)}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">TEAM A</p>
            </div>

            {/* Giant Score Display */}
            <div className="my-6">
              <span className={`text-8xl md:text-9xl font-black font-sans tracking-tighter leading-none tabular-nums ${servingTeam === 1 ? "text-emerald-400" : "text-slate-800"}`}>
                {score1}
              </span>
            </div>

            <div>
              {isAdmin ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-500 transition-colors">
                    TAP TO SCORE +1
                  </span>

                  {/* Decrement typo button */}
                  <div className="mt-4 pt-3 border-t border-slate-100/10 flex justify-center">
                    <button
                      onClick={(e) => decrementScore(1, e)}
                      disabled={score1 === 0}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                      TYPO? SCORE -1
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  TEAM A SCORE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle Stats / Game Controls (Lg Column 2) */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center gap-3 bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">STADIUM CONSOLE</span>

          {isAdmin ? (
            <>
              {/* Undo */}
              <button
                onClick={undoLastPoint}
                disabled={scoreHistory.length === 0}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black uppercase tracking-wider border border-slate-200/80 rounded-2xl text-[10px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <Undo2 className="h-4 w-4" /> Undo Point
              </button>

              {/* Reset Score */}
              <button
                onClick={resetScores}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black uppercase tracking-wider border border-rose-200/60 rounded-2xl text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Reset Score
              </button>

              {/* Manual Toggle Server */}
              <button
                onClick={() => setServingTeam(servingTeam === 1 ? 2 : 1)}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black uppercase tracking-wider border border-slate-200/80 rounded-2xl text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                Manual Service
              </button>

              <div className="w-full border-t border-slate-100 my-2" />

              {/* Finish Button */}
              <button
                onClick={handleFinishGame}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" /> RECORD & EXIT
              </button>
            </>
          ) : (
            <div className="text-center py-4 space-y-2">
              <ShieldAlert className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-normal">
                Spectator View Only
              </p>
              <p className="text-[9px] text-slate-400 px-1 leading-normal font-medium">
                Console locks during active public view.
              </p>
            </div>
          )}
        </div>

        {/* Right Score Card (Team 2) */}
        <div className="lg:col-span-5 flex flex-col">
          <div
            onClick={() => incrementScore(2)}
            className={`flex-1 p-8 rounded-3xl border text-center transition-all shadow-sm select-none relative group min-h-[300px] flex flex-col justify-between ${
              isAdmin ? "cursor-pointer" : "cursor-default"
            } ${
              servingTeam === 2
                ? "bg-slate-900 text-white border-emerald-500 ring-4 ring-emerald-500/10"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="absolute top-5 left-5 flex items-center gap-1.5">
              {servingTeam === 2 && (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-widest ${servingTeam === 2 ? "text-emerald-400" : "text-slate-400"}`}>
                {servingTeam === 2 ? "SERVERS • READY" : "RECEIVERS"}
              </span>
            </div>

            <div className="pt-6">
              <h3 className="text-xl font-black tracking-tight truncate px-4">
                {getPlayerNames(activeMatch.team2)}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">TEAM B</p>
            </div>

            {/* Giant Score Display */}
            <div className="my-6">
              <span className={`text-8xl md:text-9xl font-black font-sans tracking-tighter leading-none tabular-nums ${servingTeam === 2 ? "text-emerald-400" : "text-slate-800"}`}>
                {score2}
              </span>
            </div>

            <div>
              {isAdmin ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-500 transition-colors">
                    TAP TO SCORE +1
                  </span>

                  {/* Decrement typo button */}
                  <div className="mt-4 pt-3 border-t border-slate-100/10 flex justify-center">
                    <button
                      onClick={(e) => decrementScore(2, e)}
                      disabled={score2 === 0}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                      TYPO? SCORE -1
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  TEAM B SCORE
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Court Serving Positioning Guide (Doubles / Singles visualizer) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            Badminton Serving & Positioning Guide
          </h4>
          <p className="text-xxs text-slate-400 mt-0.5">
            Who serves from where depends on the server's score. Even scores serve from the right court; odd scores serve from the left.
          </p>
        </div>

        {/* Badminton Court Schema Visualizer */}
        <div className="relative bg-emerald-700 border-4 border-white p-6 rounded-2xl flex flex-col items-center justify-between min-h-[160px] max-w-xl mx-auto overflow-hidden shadow-inner">
          {/* Net Line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/60 flex justify-between items-center text-white/50 text-[10px] px-4 font-bold select-none pointer-events-none">
            <span>NET LINE</span>
            <span>NET LINE</span>
          </div>

          {/* Half court dividers */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-white/40 pointer-events-none" />

          {/* Service Lines (top and bottom short service lines) */}
          <div className="absolute inset-x-0 top-1/3 border-t border-white/40 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-1/3 border-b border-white/40 pointer-events-none" />

          {/* Sidecourt labels and server dot positions */}
          <div className="grid grid-cols-2 w-full text-center text-white text-xxs font-extrabold tracking-widest opacity-90 select-none z-10">
            {/* Team 1 Side (Top Half) */}
            <div className={`p-2 border-r border-white/10 ${servingTeam === 1 && !isServerOnRight ? "bg-white/10 ring-1 ring-emerald-400/50 rounded-lg" : ""}`}>
              <p className="text-emerald-200">LEFT COURT (ODD)</p>
              <div className="mt-2 flex justify-center">
                {servingTeam === 1 && !isServerOnRight && (
                  <div className="h-5 px-2 bg-emerald-400 text-slate-900 rounded-md font-black text-[9px] flex items-center gap-1 animate-bounce">
                    S: {getSingleName(activeMatch.team1, activeMatch.team1.length > 1 ? 1 : 0)}
                  </div>
                )}
              </div>
            </div>
            <div className={`p-2 ${servingTeam === 1 && isServerOnRight ? "bg-white/10 ring-1 ring-emerald-400/50 rounded-lg" : ""}`}>
              <p className="text-emerald-200">RIGHT COURT (EVEN)</p>
              <div className="mt-2 flex justify-center">
                {servingTeam === 1 && isServerOnRight && (
                  <div className="h-5 px-2 bg-emerald-400 text-slate-900 rounded-md font-black text-[9px] flex items-center gap-1 animate-bounce">
                    S: {getSingleName(activeMatch.team1, 0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider space */}
          <div className="h-8" />

          <div className="grid grid-cols-2 w-full text-center text-white text-xxs font-extrabold tracking-widest opacity-90 select-none z-10">
            {/* Team 2 Side (Bottom Half) */}
            <div className={`p-2 border-r border-white/10 ${servingTeam === 2 && !isServerOnRight ? "bg-white/10 ring-1 ring-emerald-400/50 rounded-lg" : ""}`}>
              <p className="text-emerald-200">LEFT COURT (ODD)</p>
              <div className="mt-2 flex justify-center">
                {servingTeam === 2 && !isServerOnRight && (
                  <div className="h-5 px-2 bg-emerald-400 text-slate-900 rounded-md font-black text-[9px] flex items-center gap-1 animate-bounce">
                    S: {getSingleName(activeMatch.team2, activeMatch.team2.length > 1 ? 1 : 0)}
                  </div>
                )}
              </div>
            </div>
            <div className={`p-2 ${servingTeam === 2 && isServerOnRight ? "bg-white/10 ring-1 ring-emerald-400/50 rounded-lg" : ""}`}>
              <p className="text-emerald-200">RIGHT COURT (EVEN)</p>
              <div className="mt-2 flex justify-center">
                {servingTeam === 2 && isServerOnRight && (
                  <div className="h-5 px-2 bg-emerald-400 text-slate-900 rounded-md font-black text-[9px] flex items-center gap-1 animate-bounce">
                    S: {getSingleName(activeMatch.team2, 0)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
