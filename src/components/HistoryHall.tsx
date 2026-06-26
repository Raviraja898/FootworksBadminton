import { useState, useMemo } from "react";
import { Player, Tournament, Match } from "../types";
import { Award, Calendar, Search, Trophy, Users, Hash, FileText } from "lucide-react";

interface HistoryHallProps {
  players: Player[];
  tournaments: Tournament[];
  matches: Match[];
}

export default function HistoryHall({ players, tournaments, matches }: HistoryHallProps) {
  const [playerQuery, setPlayerQuery] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("all");

  const getPlayerName = (id: string) => {
    return players.find((p) => p.id === id)?.name || "Unknown Player";
  };

  const getPlayerNames = (ids: string[]) => {
    return ids.map((id) => getPlayerName(id)).join(" & ");
  };

  // Filter completed and historical matches
  const completedMatches = useMemo(() => {
    return matches.filter((m) => m.status === "completed");
  }, [matches]);

  // Filtered matches list
  const filteredMatches = useMemo(() => {
    return completedMatches.filter((m) => {
      // Filter by Tournament ID
      if (selectedTournamentId !== "all" && m.tournamentId !== selectedTournamentId) {
        return false;
      }
      // Filter by Player Name Search Query
      if (playerQuery !== "") {
        const query = playerQuery.toLowerCase();
        const playersInMatch = [...m.team1, ...m.team2].map((id) => getPlayerName(id).toLowerCase());
        return playersInMatch.some((name) => name.includes(query));
      }
      return true;
    }).reverse(); // Newest completed matches first
  }, [completedMatches, selectedTournamentId, playerQuery, players]);

  return (
    <div className="space-y-8">
      {/* Hall of Fame / Previous Tournaments Champions */}
      <div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
          <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Archive</span>
          <h2 className="text-2xl font-black text-slate-950 mt-1 tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500 fill-amber-100" />
            Hall of Fame
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Historical list of tournament winners and their gold partners.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tourney) => {
            const winner1 = getPlayerName(tourney.winner1Id);
            const winner2 = tourney.winner2Id ? getPlayerName(tourney.winner2Id) : null;
            const runnerUp1 = tourney.runnerUp1Id ? getPlayerName(tourney.runnerUp1Id) : null;
            const runnerUp2 = tourney.runnerUp2Id ? getPlayerName(tourney.runnerUp2Id) : null;

            return (
              <div
                key={tourney.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all relative overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                {/* Gold Backdrop Accent */}
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                <div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    <span>{tourney.date}</span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 leading-snug truncate">
                    {tourney.name}
                  </h3>

                  {/* Winner display */}
                  <div className="mt-4 p-4 bg-amber-50/40 border border-amber-100/40 rounded-2xl">
                    <span className="text-[9px] font-black tracking-widest text-amber-800 uppercase block mb-1">
                      CHAMPIONS 🏆
                    </span>
                    <p className="text-sm font-black text-slate-950">
                      {winner1}
                    </p>
                    {winner2 && (
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        with <span className="text-slate-800 font-black">{winner2}</span>
                      </p>
                    )}
                  </div>

                  {/* Runners-up display */}
                  {(runnerUp1 || runnerUp2) && (
                    <div className="mt-4 px-2 text-slate-500">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">
                        RUNNERS-UP
                      </span>
                      <p className="text-xs font-bold mt-1 text-slate-600">
                        {runnerUp1} {runnerUp2 ? `& ${runnerUp2}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                {tourney.scoreSummary && (
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Finals Score</span>
                    <span className="bg-slate-900 text-white font-mono px-3 py-1 rounded-xl shadow-xs">
                      {tourney.scoreSummary}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {tournaments.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-3xl text-slate-400 font-bold uppercase tracking-widest text-xs">
              No historical tournaments recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Match Ledger & Past Scores */}
      <div className="pt-6 border-t border-slate-200">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Records</span>
            <h2 className="text-2xl font-black text-slate-950 mt-1 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Completed Match Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Full archive of past and present tournament games played.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter by Tournament */}
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-2xl bg-slate-50 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-xxs"
            >
              <option value="all">All Tournaments</option>
              <option value="current">Current Active Tournament</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Search Player */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by player..."
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full sm:w-48 border border-slate-200 rounded-2xl bg-slate-50 text-xs text-slate-700 placeholder-slate-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table Bento Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200/60">
                  <th className="py-4 px-6">Tournament</th>
                  <th className="py-4 px-6 text-center">Date</th>
                  <th className="py-4 px-6 text-right">Team 1</th>
                  <th className="py-4 px-6 text-center w-28">Score</th>
                  <th className="py-4 px-6 text-left">Team 2</th>
                  <th className="py-4 px-6 text-center">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredMatches.map((match) => {
                  const isTeam1Winner = match.score1 > match.score2;
                  const winnerNames = isTeam1Winner ? getPlayerNames(match.team1) : getPlayerNames(match.team2);
                  const tournamentName =
                    match.tournamentId === "current"
                      ? "Active Tournament"
                      : tournaments.find((t) => t.id === match.tournamentId)?.name || "Historical Match";

                  return (
                    <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-800">{tournamentName}</td>
                      <td className="py-3.5 px-6 text-center text-slate-400 font-medium tabular-nums">{match.date}</td>
                      <td className={`py-3.5 px-6 text-right font-black ${isTeam1Winner ? "text-slate-900" : "text-slate-400 font-medium"}`}>
                        {getPlayerNames(match.team1)}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="inline-block bg-slate-900 text-emerald-400 font-black font-mono px-3 py-1 rounded-xl tracking-wider text-[11px] shadow-xxs">
                          {match.score1} - {match.score2}
                        </span>
                      </td>
                      <td className={`py-3.5 px-6 text-left font-black ${!isTeam1Winner ? "text-slate-900" : "text-slate-400 font-medium"}`}>
                        {getPlayerNames(match.team2)}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-black uppercase text-[9px] border border-emerald-100">
                          {winnerNames}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredMatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                      No matching historical match scores found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200/60 text-center">
            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Verified Score Archive</p>
          </div>
        </div>
      </div>
    </div>
  );
}
