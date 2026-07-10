/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'firebase/auth';
import { 
  Brain, 
  Trophy, 
  BarChart3, 
  Database, 
  LogOut, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  FileJson
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  needsAuth: boolean;
  activeTab: 'quiz' | 'leaderboard' | 'analytics' | 'settings' | 'manage';
  setActiveTab: (tab: 'quiz' | 'leaderboard' | 'analytics' | 'settings' | 'manage') => void;
  spreadsheetId: string | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
}

export default function Navbar({
  user,
  needsAuth,
  activeTab,
  setActiveTab,
  spreadsheetId,
  onLogin,
  onLogout,
  isLoggingIn
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

        {/* Navigation Tabs (Available only when authenticated for Sheets interaction) */}
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

          {user?.email === 'taiwojoshua423@gmail.com' && (
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
                id="tab-settings"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold transition-all border ${
                  activeTab === 'settings'
                    ? 'bg-white/10 text-white border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                    : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>DB Config</span>
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
            </>
          )}
        </nav>

        {/* User Auth Info & Integration Indicators */}
        <div className="flex items-center space-x-4">
          
          {/* Database Integration status */}
          {user && (
            <div className="hidden lg:flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60">
              {spreadsheetId ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">DB: Synced</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span className="text-amber-500 font-semibold">DB: Offline</span>
                </>
              )}
            </div>
          )}

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end text-right">
                <span className="font-sans text-xs font-semibold text-white leading-tight">
                  {user.displayName || 'Anonymous'}
                </span>
                <span className="font-mono text-[9px] text-white/40">
                  {user.email}
                </span>
              </div>
              
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full ring-2 ring-white/10 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-sans text-xs font-bold text-white ring-2 ring-white/10">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}

              <button
                id="btn-logout"
                onClick={onLogout}
                title="Log Out"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="flex items-center space-x-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Sign In</span>
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
        {user?.email === 'taiwojoshua423@gmail.com' && (
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
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center space-y-0.5 font-sans text-[10px] font-medium transition-all ${
                activeTab === 'settings' ? 'text-white font-bold' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Database className="h-4.5 w-4.5" />
              <span>DB Config</span>
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
          </>
        )}
      </div>
    </header>
  );
}
