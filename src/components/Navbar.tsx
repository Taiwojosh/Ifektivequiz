/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Brain, 
  Trophy, 
  BarChart3, 
  LogOut, 
  CheckCircle,
  FileJson,
  Lock,
  User as UserIcon,
  Database
} from 'lucide-react';

interface NavbarProps {
  isAdmin: boolean;
  activeTab: 'quiz' | 'leaderboard' | 'analytics' | 'manage' | 'database';
  setActiveTab: (tab: 'quiz' | 'leaderboard' | 'analytics' | 'manage' | 'database') => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  spreadsheetId?: string | null;
}

export default function Navbar({
  isAdmin,
  activeTab,
  setActiveTab,
  onLoginClick,
  onLogoutClick,
  spreadsheetId,
}: NavbarProps) {
  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white">
            <Brain className="h-5 w-5 text-white/90" />
          </div>
          <div>
            <h1 className="font-serif italic text-lg text-white tracking-tight leading-tight">EduQuery</h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/50">Analytics Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex space-x-1.5">
          <button
            id="tab-quiz"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold transition-all border ${
              activeTab === 'quiz'
                ? 'bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>Quiz Zone</span>
          </button>

          <button
            id="tab-leaderboard"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold transition-all border ${
              activeTab === 'leaderboard'
                ? 'bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Leaderboard</span>
          </button>

          {isAdmin && (
            <>
              <button
                id="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold transition-all border ${
                  activeTab === 'analytics'
                    ? 'bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                    : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Struggle Analytics</span>
              </button>

              <button
                id="tab-manage"
                onClick={() => setActiveTab('manage')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold transition-all border ${
                  activeTab === 'manage'
                    ? 'bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                    : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <FileJson className="h-3.5 w-3.5" />
                <span>Manage Quizzes</span>
              </button>

              <button
                id="tab-database"
                onClick={() => setActiveTab('database')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold transition-all border ${
                  activeTab === 'database'
                    ? 'bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                    : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Sheets DB</span>
              </button>
            </>
          )}
        </nav>

        {/* User Auth Info & Integration Indicators */}
        <div className="flex items-center space-x-4">
          
          {/* Database Integration status */}
          <div className={`hidden lg:flex items-center space-x-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
            spreadsheetId 
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' 
              : 'border-white/10 bg-white/5 text-white/60'
          }`}>
            <CheckCircle className={`h-3.5 w-3.5 ${spreadsheetId ? 'text-emerald-400' : 'text-amber-500'}`} />
            <span className={`${spreadsheetId ? 'text-emerald-400' : 'text-white/60'} font-semibold`}>
              ENGINE: {spreadsheetId ? 'GOOGLE SHEETS' : 'OFFLINE LOCAL'}
            </span>
          </div>

          {isAdmin ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end text-right">
                <span className="font-sans text-xs font-semibold text-white leading-tight">
                  Administrator
                </span>
                <span className="font-mono text-[9px] text-white/40">
                  {spreadsheetId ? 'Sheets Active' : 'Local Mode'}
                </span>
              </div>
              
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 font-sans text-xs font-bold text-emerald-400 ring-2 ring-emerald-500/20">
                <Lock className="h-3.5 w-3.5" />
              </div>

              <button
                id="btn-logout"
                onClick={onLogoutClick}
                title="Log Out Admin"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/45 hover:bg-white/5 hover:text-white/80 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={onLoginClick}
              className="flex items-center space-x-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-white/50" />
              <span>Admin Login</span>
            </button>
          )}

        </div>
      </div>
      
      {/* Mobile Navigation indicator */}
      <div className="flex md:hidden justify-around border-t border-white/10 bg-[#0F0F0F] py-2">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex flex-col items-center space-y-0.5 font-sans text-[10px] font-medium transition-all ${
            activeTab === 'quiz' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Brain className="h-4.5 w-4.5" />
          <span>Quiz</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center space-y-0.5 font-sans text-[10px] font-medium transition-all ${
            activeTab === 'leaderboard' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Trophy className="h-4.5 w-4.5" />
          <span>Scores</span>
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex flex-col items-center space-y-0.5 font-sans text-[10px] font-medium transition-all ${
                activeTab === 'analytics' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex flex-col items-center space-y-0.5 font-sans text-[10px] font-medium transition-all ${
                activeTab === 'manage' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <FileJson className="h-4.5 w-4.5" />
              <span>Manage</span>
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex flex-col items-center space-y-0.5 font-sans text-[10px] font-medium transition-all ${
                activeTab === 'database' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Database className="h-4.5 w-4.5" />
              <span>Database</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
