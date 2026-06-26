import { useState, useMemo, useEffect } from "react";
import { Player, Match, Tournament, PlayerStats, CompletedTournamentResults } from "../types";
import { calculateStatistics } from "../utils/badminton";
import { Search, Trophy, Medal, Award, Activity, TrendingUp, Calendar, Hash, SlidersHorizontal, Sparkles } from "lucide-react";

interface LeaderboardProps {
  players: Player[];
  matches: Match[];
  tournaments: Tournament[];
  podiumResults: CompletedTournamentResults | null;
}

export default function Leaderboard({ players, matches, tournaments, podiumResults }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [selectedTourneyFilter, setSelectedTourneyFilter] = useState<string>(() => {
    return podiumResults ? "active" : (tournaments[0]?.id || "active");
  });

  // Synchronize filter when a new podium result arrives
  useEffect(() => {
    if (podiumResults) {
      setSelectedTourneyFilter("active");
    } else if (tournaments.length > 0) {
      setSelectedTourneyFilter(tournaments[0].id);
    }
  }, [podiumResults, tournaments]);

  // Construct list for scrolling marquee
  const tickerItems = useMemo(() => {
    const list: { name: string; winner: string; score: string }[] = [];

    // 1. Add current completed podium results if exists
    if (podiumResults) {
      list.push({
        name: "Current Tourney",
        winner: podiumResults.winnerTeamName,
        score: podiumResults.scoreSummary,
      });
    }

    // 2. Add past tournaments from list
    tournaments.forEach((t) => {
      const w1Name = players.find((p) => p.id === t.winner1Id)?.name || "Unknown";
      const w2Name = t.winner2Id ? (players.find((p) => p.id === t.winner2Id)?.name || "") : "";
      const winnerStr = w2Name ? `${w1Name} & ${w2Name}` : w1Name;
      list.push({
        name: t.name,
        winner: winnerStr,
        score: t.scoreSummary || "Winner",
      });
    });

    // If empty list, put a placeholder
    if (list.length === 0) {
      list.push({
        name: "Footworks Arena",
        winner: "Train Hard & Win Championship",
        score: "Active Now",
      });
    }

    // Duplicate ticker items if they are too short to scroll beautifully
    let finalTicker = [...list];
    while (finalTicker.length < 8) {
      finalTicker = [...finalTicker, ...list];
    }

    return finalTicker;
  }, [podiumResults, tournaments, players]);

  // Resolve team data for the selected tournament filter
  const activePodiumData = useMemo(() => {
    if (selectedTourneyFilter === "active" && podiumResults) {
      return {
        title: "Current Tournament Results",
        date: podiumResults.date,
        score: podiumResults.scoreSummary,
        winnerTeam: podiumResults.winnerTeamName,
        winnerPlayers: podiumResults.winnerPlayers,
        runnerUpTeam: podiumResults.runnerUpTeamName,
        runnerUpPlayers: podiumResults.runnerUpPlayers,
        thirdTeam: podiumResults.thirdTeamName,
        thirdPlayers: podiumResults.thirdPlayers,
      };
    }

    // Find in past tournaments list
    const selectedTourneyId = selectedTourneyFilter === "active" ? (tournaments[0]?.id || "") : selectedTourneyFilter;
    const tourney = tournaments.find((t) => t.id === selectedTourneyId);
    if (!tourney) return null;

    // Resolve winner names
    const w1Name = players.find((p) => p.id === tourney.winner1Id)?.name || "Unknown Player";
    const w2Name = tourney.winner2Id ? (players.find((p) => p.id === tourney.winner2Id)?.name || "") : "";
    const winnerPlayers = [w1Name, w2Name].filter(Boolean);
    const winnerTeamName = tourney.winner2Id ? `${w1Name} & ${w2Name}` : w1Name;

    // Resolve runner up names
    const r1Name = tourney.runnerUp1Id ? (players.find((p) => p.id === tourney.runnerUp1Id)?.name || "Unknown Player") : "";
    const r2Name = tourney.runnerUp2Id ? (players.find((p) => p.id === tourney.runnerUp2Id)?.name || "") : "";
    const runnerUpPlayers = [r1Name, r2Name].filter(Boolean);
    const runnerUpTeamName = r2Name ? `${r1Name} & ${r2Name}` : r1Name || "TBD";

    // Hardcoded 3rd places for default past tournaments to provide highly realistic data
    const thirdPlaceMap: Record<string, { teamName: string; players: string[] }> = {
      t1: {
        teamName: "Rahul & Karan",
        players: ["Rahul Nair", "Karan Johar"],
      },
      t2: {
        teamName: "Aditya & Vinay",
        players: ["Aditya Verma", "Vinay Kumar"],
      },
      t3: {
        teamName: "Anil & Vikram",
        players: ["Anil Sharma", "Vikram Malhotra"],
      },
    };

    const thirdInfo = thirdPlaceMap[tourney.id] || {
      teamName: "TBD Team",
      players: ["TBD Player 1", "TBD Player 2"],
    };

    return {
      title: tourney.name,
      date: tourney.date,
      score: tourney.scoreSummary || "N/A",
      winnerTeam: winnerTeamName,
      winnerPlayers,
      runnerUpTeam: runnerUpTeamName,
      runnerUpPlayers,
      thirdTeam: thirdInfo.teamName,
      thirdPlayers: thirdInfo.players,
    };
  }, [selectedTourneyFilter, podiumResults, tournaments, players]);

  // Compute stats
  const statsList = useMemo(() => {
    return calculateStatistics(players, matches);
  }, [players, matches]);

  // Sort by Win Rate desc, then Score Diff desc, then Won desc
  const sortedStats = useMemo(() => {
    return [...statsList].sort((a, b) => {
      if (b.matchesWon !== a.matchesWon) {
        return b.matchesWon - a.matchesWon; // Primary: Total Matches Won
      }
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate; // Secondary: Win Rate
      }
      return b.scoreDiff - a.scoreDiff; // Tertiary: Score Difference
    });
  }, [statsList]);

  // Filter based on search
  const filteredStats = useMemo(() => {
    return sortedStats.filter((stat) =>
      stat.playerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedStats, searchTerm]);

  // Find player stats for modal
  const playerDetailStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return statsList.find((s) => s.playerId === selectedPlayer.id);
  }, [selectedPlayer, statsList]);

  // Find player achievements (won tournaments)
  const playerAchievements = useMemo(() => {
    if (!selectedPlayer) return [];
    return tournaments.filter(
      (t) => t.winner1Id === selectedPlayer.id || t.winner2Id === selectedPlayer.id
    );
  }, [selectedPlayer, tournaments]);

  // Find player matches
  const playerMatches = useMemo(() => {
    if (!selectedPlayer) return [];
    return matches
      .filter(
        (m) =>
          m.status === "completed" &&
          (m.team1.includes(selectedPlayer.id) || m.team2.includes(selectedPlayer.id))
      )
      .reverse(); // Newest first
  }, [selectedPlayer, matches]);

  return (
    <div className="space-y-6">
      {/* Scrolling Champions Ticker */}
      <div className="bg-slate-900 border border-slate-850 text-white py-3.5 rounded-2xl overflow-hidden relative select-none shadow-md">
        <div className="flex w-max whitespace-nowrap animate-marquee gap-12">
          {/* First copy of ticker content */}
          {tickerItems.map((item, idx) => (
            <span key={`t1-${idx}`} className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-emerald-450 uppercase">{item.name}:</span>
              <span className="text-white font-extrabold">{item.winner}</span>
              <span className="text-slate-400 text-[10px] bg-slate-800 px-2 py-0.5 rounded">({item.score})</span>
              <span className="text-slate-500 font-sans ml-2">|</span>
            </span>
          ))}
          {/* Second copy of ticker content for seamless loop */}
          {tickerItems.map((item, idx) => (
            <span key={`t2-${idx}`} className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-emerald-450 uppercase">{item.name}:</span>
              <span className="text-white font-extrabold">{item.winner}</span>
              <span className="text-slate-400 text-[10px] bg-slate-800 px-2 py-0.5 rounded">({item.score})</span>
              <span className="text-slate-500 font-sans ml-2">|</span>
            </span>
          ))}
        </div>
      </div>

      {/* Filter Tournament Results Selector */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2.5 rounded-xl text-amber-800 shadow-xxs flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tournament Results & Trophies</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Select any tournament to view the top 3 team winners.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">Select Event:</span>
          <select
            value={selectedTourneyFilter}
            onChange={(e) => setSelectedTourneyFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 bg-slate-50 hover:bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xxs"
          >
            {podiumResults && (
              <option value="active">🏆 Current Completed Tournament</option>
            )}
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                📅 {t.name} ({t.date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Championship Team Podium Block */}
      {activePodiumData && (
        <div className="bg-slate-950 text-white rounded-3xl border border-slate-900 p-6 md:p-8 shadow-xl relative overflow-hidden space-y-6 animate-fade-in">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-900 pb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/30">
                CHAMPIONSHIP PODIUM
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 font-black tracking-widest uppercase">
              🏆 {activePodiumData.title} • {activePodiumData.date}
            </p>
          </div>

          {/* 1st Place (Big Font with Gold Medals & Trophies, showcased in its own line) */}
          <div className="bg-gradient-to-r from-amber-500/10 via-yellow-400/20 to-amber-600/10 border-2 border-amber-400/50 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg hover:border-amber-400 transition-all z-10">
            <div className="absolute top-4 right-6 text-amber-400/20 pointer-events-none">
              <Trophy className="w-20 h-20 animate-pulse" />
            </div>
            
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-3xl animate-bounce">🥇</span>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                1st Place / Tournament Champions
              </span>
            </div>

            {/* Team Card Title (the team name, decorated with absolute visual craft) */}
            <h4 className="text-3xl md:text-5xl font-black tracking-tight text-yellow-300 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {activePodiumData.winnerTeam}
            </h4>

            <div className="flex flex-wrap gap-2.5 mt-6 items-center">
              {activePodiumData.winnerPlayers.map((player, idx) => (
                <span
                  key={idx}
                  className="bg-amber-400/10 text-amber-300 border border-amber-400/30 px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm"
                >
                  🥇 {player}
                </span>
              ))}
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 md:ml-auto">
                Score: {activePodiumData.score}
              </span>
            </div>
          </div>

          {/* 2nd line: 2nd Place & 3rd Place side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* 2nd Place Team Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥈</span>
                  <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">
                    2nd Place / Runners-up
                  </span>
                </div>
                {/* Team Card Name */}
                <h5 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                  {activePodiumData.runnerUpTeam}
                </h5>
              </div>
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
                {activePodiumData.runnerUpPlayers.map((player, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-850 text-slate-300 border border-slate-750 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    🥈 {player}
                  </span>
                ))}
              </div>
            </div>

            {/* 3rd Place Team Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥉</span>
                  <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase">
                    3rd Place / Bronze
                  </span>
                </div>
                {/* Team Card Name */}
                <h5 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                  {activePodiumData.thirdTeam}
                </h5>
              </div>
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
                {activePodiumData.thirdPlayers.map((player, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-850 text-slate-300 border border-slate-750 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    🥉 {player}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Top Performers Bento Block */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Current Standings</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Live Leaderboard</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Real-time player performance based on completed games.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full md:w-64 border border-slate-200 rounded-2xl bg-slate-50 text-xs text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xxs"
          />
        </div>
      </div>

      {/* Top 3 Podium Cards - Bento Grid style */}
      {filteredStats.length >= 3 && searchTerm === "" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* 2nd Place Bento */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden order-2 md:order-1 flex flex-col justify-between min-h-[180px]">
            <div className="absolute top-4 right-4 text-slate-200">
              <Medal className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">2nd Place • Runner-Up</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{sortedStats[1].playerName}</h3>
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="text-3xl font-black text-slate-900 tabular-nums">{sortedStats[1].matchesWon}</span>
                <span className="text-xs font-bold text-slate-400 ml-1.5">WINS</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{sortedStats[1].winRate}% WR</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5">DIFF: {sortedStats[1].scoreDiff > 0 ? `+${sortedStats[1].scoreDiff}` : sortedStats[1].scoreDiff}</p>
              </div>
            </div>
          </div>

          {/* 1st Place Bento - Dark Contrast */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md relative overflow-hidden order-1 md:order-2 flex flex-col justify-between scale-102 min-h-[190px]">
            <div className="absolute top-4 right-4 text-emerald-500 opacity-80">
              <Trophy className="h-12 w-12" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">1st Place • Club Leader</span>
              <h3 className="text-2xl font-black text-white mt-1">{sortedStats[0].playerName}</h3>
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-4">
              <div>
                <span className="text-4xl font-black text-white tabular-nums">{sortedStats[0].matchesWon}</span>
                <span className="text-xs font-bold text-slate-400 ml-1.5">WINS</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-900 bg-emerald-400 px-3 py-1 rounded-full">{sortedStats[0].winRate}% WR</span>
                <p className="text-[10px] text-slate-400 font-bold mt-2">DIFF: {sortedStats[0].scoreDiff > 0 ? `+${sortedStats[0].scoreDiff}` : sortedStats[0].scoreDiff}</p>
              </div>
            </div>
          </div>

          {/* 3rd Place Bento */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden order-3 flex flex-col justify-between min-h-[180px]">
            <div className="absolute top-4 right-4 text-amber-500 opacity-20">
              <Award className="h-10 w-10" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">3rd Place • Podium</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{sortedStats[2].playerName}</h3>
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="text-3xl font-black text-slate-900 tabular-nums">{sortedStats[2].matchesWon}</span>
                <span className="text-xs font-bold text-slate-400 ml-1.5">WINS</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{sortedStats[2].winRate}% WR</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5">DIFF: {sortedStats[2].scoreDiff > 0 ? `+${sortedStats[2].scoreDiff}` : sortedStats[2].scoreDiff}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standings Table Bento Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200/60">
                <th className="py-4 px-6 text-center w-16">Rank</th>
                <th className="py-4 px-6">Player Name</th>
                <th className="py-4 px-4 text-center">Played</th>
                <th className="py-4 px-4 text-center">Won</th>
                <th className="py-4 px-4 text-center">Lost</th>
                <th className="py-4 px-4 text-center">Win %</th>
                <th className="py-4 px-4 text-center">Scored</th>
                <th className="py-4 px-4 text-center">Conceded</th>
                <th className="py-4 px-4 text-center">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStats.map((stat, index) => {
                const rankIndex = sortedStats.findIndex((s) => s.playerId === stat.playerId) + 1;
                return (
                  <tr
                    key={stat.playerId}
                    onClick={() => {
                      const foundPlayer = players.find((p) => p.id === stat.playerId);
                      if (foundPlayer) setSelectedPlayer(foundPlayer);
                    }}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-6 text-center font-bold text-slate-500">
                      {rankIndex === 1 ? (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-[11px] shadow-xxs">
                          1
                        </div>
                      ) : rankIndex === 2 ? (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-slate-150 text-slate-700 font-extrabold text-[11px] shadow-xxs">
                          2
                        </div>
                      ) : rankIndex === 3 ? (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-amber-50 text-amber-800 font-extrabold text-[11px] shadow-xxs">
                          3
                        </div>
                      ) : (
                        rankIndex
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {stat.playerName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600 tabular-nums">{stat.gamesPlayed}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-emerald-600 bg-emerald-50/30 tabular-nums">{stat.matchesWon}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-rose-500 tabular-nums">{stat.matchesLost}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 tabular-nums">
                        {stat.winRate}%
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 tabular-nums">{stat.pointsScored}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500 tabular-nums">{stat.pointsConceded}</td>
                    <td className={`py-3.5 px-4 text-center font-black tabular-nums ${stat.scoreDiff > 0 ? "text-emerald-600" : stat.scoreDiff < 0 ? "text-rose-500" : "text-slate-400"}`}>
                      {stat.scoreDiff > 0 ? `+${stat.scoreDiff}` : stat.scoreDiff}
                    </td>
                  </tr>
                );
              })}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No players found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200/60 text-center">
          <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Auto-Calculating Global Stats</p>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && playerDetailStats && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-semibold text-emerald-400 tracking-widest">Player Profile</span>
                <h3 className="text-2xl font-extrabold tracking-tight mt-1">{selectedPlayer.name}</h3>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stat Boxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs text-slate-500 font-medium">Win Rate</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{playerDetailStats.winRate}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs text-slate-500 font-medium">Record (W-L)</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {playerDetailStats.matchesWon} <span className="text-slate-400 font-normal">-</span> {playerDetailStats.matchesLost}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs text-slate-500 font-medium">Points diff</span>
                  <p className={`text-2xl font-bold mt-1 ${playerDetailStats.scoreDiff >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {playerDetailStats.scoreDiff > 0 ? `+${playerDetailStats.scoreDiff}` : playerDetailStats.scoreDiff}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs text-slate-500 font-medium">Total Played</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{playerDetailStats.gamesPlayed}</p>
                </div>
              </div>

              {/* Achievements (Hall of Fame Partner details) */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Championship History
                </h4>
                {playerAchievements.length > 0 ? (
                  <div className="space-y-2">
                    {playerAchievements.map((tourney) => {
                      const partnerId = tourney.winner1Id === selectedPlayer.id ? tourney.winner2Id : tourney.winner1Id;
                      const partner = partnerId ? players.find((p) => p.id === partnerId) : null;
                      return (
                        <div key={tourney.id} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center justify-between text-sm">
                          <div>
                            <p className="font-semibold text-slate-800">{tourney.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" /> {tourney.date}
                            </p>
                          </div>
                          {partner ? (
                            <p className="text-xs font-medium text-slate-700 bg-amber-100 px-2.5 py-1 rounded-full">
                              Partner: <span className="font-semibold">{partner.name}</span>
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-slate-700 bg-amber-100 px-2.5 py-1 rounded-full">
                              Singles Champion
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No championship trophies yet. Train harder!</p>
                )}
              </div>

              {/* Recent Matches */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Recent Matches
                </h4>
                {playerMatches.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {playerMatches.map((m) => {
                      const isTeam1 = m.team1.includes(selectedPlayer.id);
                      const myTeam = isTeam1 ? m.team1 : m.team2;
                      const oppTeam = isTeam1 ? m.team2 : m.team1;

                      const myScore = isTeam1 ? m.score1 : m.score2;
                      const oppScore = isTeam1 ? m.score2 : m.score1;
                      const isWin = myScore > oppScore;

                      const myPartner = myTeam.filter((id) => id !== selectedPlayer.id).map((id) => players.find((p) => p.id === id)?.name).join("");
                      const opponents = oppTeam.map((id) => players.find((p) => p.id === id)?.name).join(" & ");

                      return (
                        <div key={m.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded-sm font-bold ${isWin ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                {isWin ? "WIN" : "LOSS"}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {myPartner ? `With ${myPartner}` : "Singles"} vs {opponents}
                              </span>
                            </div>
                            <p className="text-slate-400 mt-1">{m.date}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-800">
                              {myScore} - {oppScore}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No games played in current history.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-5 py-2 bg-slate-800 text-white font-semibold rounded-xl text-xs hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
