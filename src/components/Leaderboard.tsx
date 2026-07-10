/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Clock, 
  RefreshCw, 
  User as UserIcon,
  Medal,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { fetchScores } from '../sheets';
import { SheetScoreRow } from '../types';

interface LeaderboardProps {
  token: string | null;
  spreadsheetId: string | null;
  refreshTrigger: number;
}

// Highly polished educational preview leaderboard when offline
const LOCAL_LEADERBOARD_MOCKS: SheetScoreRow[] = [
  {
    timestamp: '2026-07-08T08:00:00.000Z',
    userName: 'Taiwo Joshua',
    userEmail: 'taiwojoshua423@gmail.com',
    score: 6,
    totalQuestions: 6,
    percentage: 100,
    timeTakenSeconds: 154,
  },
  {
    timestamp: '2026-07-08T07:15:00.000Z',
    userName: 'Sarah Jenkins',
    userEmail: 'sarah.j@eduquery.io',
    score: 5,
    totalQuestions: 6,
    percentage: 83,
    timeTakenSeconds: 210,
  },
  {
    timestamp: '2026-07-08T06:30:00.000Z',
    userName: 'Kaelen Miller',
    userEmail: 'kmiller@devmail.net',
    score: 5,
    totalQuestions: 6,
    percentage: 83,
    timeTakenSeconds: 305,
  },
  {
    timestamp: '2026-07-08T05:00:00.000Z',
    userName: 'Alex Rivera',
    userEmail: 'arivera@engineering.com',
    score: 4,
    totalQuestions: 6,
    percentage: 67,
    timeTakenSeconds: 180,
  }
];

export default function Leaderboard({
  token,
  spreadsheetId,
  refreshTrigger,
}: LeaderboardProps) {
  const [scores, setScores] = useState<SheetScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLeaderboardData = async () => {
    if (!token || !spreadsheetId) {
      // Offline mode - load local mocks for showcase
      setScores(LOCAL_LEADERBOARD_MOCKS);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchScores(token, spreadsheetId);
      
      // Sort: Highest percentage desc, then timeTakenSeconds asc
      const sortedData = [...data].sort((a, b) => {
        if (b.percentage !== a.percentage) {
          return b.percentage - a.percentage;
        }
        return a.timeTakenSeconds - b.timeTakenSeconds;
      });

      setScores(sortedData);
    } catch (err: any) {
      console.error(err);
      setError('Failed to refresh leaderboard. Ensure spreadsheet exists and is accessible.');
      // Fallback to mocks so UI doesn't crash
      setScores(LOCAL_LEADERBOARD_MOCKS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData();
  }, [token, spreadsheetId, refreshTrigger]);

  const filteredScores = scores.filter(item => 
    item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-amber-400 bg-amber-400/10 border-amber-400/20'; // Gold
      case 1: return 'text-slate-300 bg-white/5 border-white/10'; // Silver
      case 2: return 'text-amber-600 bg-amber-600/10 border-amber-600/20'; // Bronze
      default: return 'text-white/40 bg-white/5 border-white/5';
    }
  };

  const getRankBadge = (index: number) => {
    if (index < 3) {
      return (
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border font-sans text-xs font-bold shadow-sm ${getMedalColor(index)}`}>
          {index + 1}
        </div>
      );
    }
    return (
      <span className="font-sans text-xs font-semibold text-white/40 w-7 text-center pl-1">
        #{index + 1}
      </span>
    );
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h2 className="font-serif italic text-3xl text-white">Active Leaderboard</h2>
          <p className="mt-1 font-sans text-sm text-white/40">
            Real-time score records synchronized instantly from the database.
          </p>
        </div>

        {/* Sync / Reload Controls */}
        <div className="flex items-center space-x-2">
          {(!token || !spreadsheetId) && (
            <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 font-sans text-xs text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Educational Preview (Offline Mode)</span>
            </div>
          )}

          <button
            onClick={loadLeaderboardData}
            disabled={isLoading}
            className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 font-sans text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="flex items-start space-x-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 font-sans text-sm text-red-400 mb-6">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Stats bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name or email..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2 font-sans text-xs text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Leaderboard Podium Section (Top 3 Visualizer) */}
      {filteredScores.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-3 gap-4 items-end mb-10 max-w-2xl mx-auto px-4 pt-4">
          
          {/* Second Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="h-12 w-12 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center font-sans text-base font-bold text-slate-300 shadow-sm">
                2
              </div>
              <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-slate-400" />
            </div>
            <div className="text-center w-full max-w-[120px] mb-2">
              <span className="block font-sans text-xs font-bold text-white truncate">{filteredScores[1].userName}</span>
              <span className="font-mono text-[9px] text-white/40 uppercase">{filteredScores[1].percentage}%</span>
            </div>
            <div className="w-full bg-white/5 h-16 rounded-t-xl border-t border-x border-white/10 flex items-center justify-center font-mono text-[10px] text-white/40">
              Silver
            </div>
          </div>

          {/* First Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3 scale-110">
              <div className="h-14 w-14 rounded-full border-2 border-amber-500 bg-amber-500/10 flex items-center justify-center font-sans text-lg font-black text-amber-400 shadow-md">
                1
              </div>
              <Trophy className="absolute -bottom-1 -right-1 h-5.5 w-5.5 text-amber-500 fill-current" />
            </div>
            <div className="text-center w-full max-w-[140px] mb-2">
              <span className="block font-sans text-sm font-extrabold text-white truncate">{filteredScores[0].userName}</span>
              <span className="font-mono text-[10px] text-amber-400 font-bold uppercase">{filteredScores[0].percentage}%</span>
            </div>
            <div className="w-full bg-amber-500/10 h-24 rounded-t-xl border-t border-x border-amber-500/20 flex items-center justify-center font-sans text-xs font-bold text-amber-400">
              Champion
            </div>
          </div>

          {/* Third Place */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="h-12 w-12 rounded-full border-2 border-amber-600/20 bg-amber-600/10 flex items-center justify-center font-sans text-base font-bold text-amber-500 shadow-sm">
                3
              </div>
              <Medal className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-600" />
            </div>
            <div className="text-center w-full max-w-[120px] mb-2">
              <span className="block font-sans text-xs font-bold text-white truncate">{filteredScores[2].userName}</span>
              <span className="font-mono text-[9px] text-white/40 uppercase">{filteredScores[2].percentage}%</span>
            </div>
            <div className="w-full bg-white/5 h-12 rounded-t-xl border-t border-x border-white/5 flex items-center justify-center font-mono text-[10px] text-white/40">
              Bronze
            </div>
          </div>

        </div>
      )}

      {/* Leaderboard Table Grid */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#141414] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#181818] border-b border-white/5 font-sans text-xs font-semibold text-white/40 uppercase tracking-wider">
                <th className="px-6 py-4 w-16">Rank</th>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-center">Accuracy</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredScores.length > 0 ? (
                filteredScores.map((row, index) => {
                  return (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRankBadge(index)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-sans text-xs font-bold text-white leading-tight">{row.userName}</p>
                            <p className="font-mono text-[9px] text-white/40 mt-0.5">{row.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-sans text-xs font-bold text-white">
                        {row.score} / {row.totalQuestions}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                          row.percentage >= 80 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                            : row.percentage >= 50 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                        }`}>
                          {row.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 font-sans text-xs text-white/60">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-white/40" />
                          <span>{formatSeconds(row.timeTakenSeconds)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[10px] text-white/40">
                        {new Date(row.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    <p className="font-sans text-sm">No results match your search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
