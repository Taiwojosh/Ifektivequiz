/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import Navbar from './components/Navbar';
import QuizRunner from './components/QuizRunner';
import Leaderboard from './components/Leaderboard';
import Analytics from './components/Analytics';
import DatabaseConfig from './components/DatabaseConfig';
import QuizManager from './components/QuizManager';
import { initAuth, googleSignIn, logout } from './firebase';
import { validateSpreadsheet } from './sheets';
import { AlertCircle, HelpCircle, FileSpreadsheet, ExternalLink } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quiz' | 'leaderboard' | 'analytics' | 'settings' | 'manage'>('quiz');
  
  // Incremented whenever a quiz ends, prompting leaderboard & analytics components to reload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    // Retrieve saved spreadsheet ID from localStorage
    const savedId = localStorage.getItem('eduquery_spreadsheet_id');
    if (savedId) {
      setSpreadsheetId(savedId);
    }

    return () => unsubscribe();
  }, []);

  // Validate spreadsheet when token is obtained
  useEffect(() => {
    const checkSpreadsheet = async () => {
      if (token && spreadsheetId) {
        const isValid = await validateSpreadsheet(token, spreadsheetId);
        if (!isValid) {
          console.warn("Retrieved spreadsheet ID could not be validated.");
          // Don't disconnect immediately in case of temporary network glitch, 
          // but logging is helpful.
        }
      }
    };
    checkSpreadsheet();
  }, [token, spreadsheetId]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const errMsg = err?.message || err?.toString() || '';
      const errCode = err?.code || '';
      
      if (
        errCode === 'auth/popup-closed-by-user' || 
        errMsg.includes('popup-closed-by-user') || 
        errMsg.includes('closed-by-user')
      ) {
        setLoginError(
          "The Google sign-in window was closed or blocked. Because this application is running inside a preview iframe, browsers block popups or third-party cookies by default. Please click the 'Open in New Tab' button below or at the top-right of this preview to sign in successfully!"
        );
      } else {
        setLoginError(errMsg || "An unexpected error occurred during Google Sign-in.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleResultsSubmitted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const isAdmin = user?.email === 'taiwojoshua423@gmail.com';

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'quiz':
        return (
          <QuizRunner
            user={user}
            token={token}
            spreadsheetId={spreadsheetId}
            onLogin={handleLogin}
            onResultsSubmitted={handleResultsSubmitted}
          />
        );
      case 'leaderboard':
        return (
          <Leaderboard
            token={token}
            spreadsheetId={spreadsheetId}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'analytics':
        return isAdmin ? (
          <Analytics
            token={token}
            spreadsheetId={spreadsheetId}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50">
            <p>You need administrator privileges to view analytics.</p>
          </div>
        );
      case 'settings':
        return isAdmin ? (
          <DatabaseConfig
            token={token}
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            onLogin={handleLogin}
            isLoggingIn={isLoggingIn}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50">
            <p>You need administrator privileges to configure the database.</p>
          </div>
        );
      case 'manage':
        return isAdmin ? (
          <QuizManager />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50">
            <p>You need administrator privileges to manage quizzes.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col justify-between font-sans">
      
      {/* Top Banner and Navigation */}
      <div className="flex-1 flex flex-col">
        <Navbar
          user={user}
          needsAuth={needsAuth}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          spreadsheetId={spreadsheetId}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isLoggingIn={isLoggingIn}
        />

        {/* Warning banner for iframe sign-in popups */}
        {loginError && (
          <div className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 font-sans text-xs text-amber-300 relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.08)]">
              <div className="flex items-start space-x-3 pr-8">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1.5">
                  <span className="font-bold text-amber-200 block text-sm">Iframe Preview Sign-in Notice</span>
                  <p className="text-amber-300/80 leading-relaxed font-sans text-xs">
                    {loginError}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 px-3.5 py-2 transition-all font-semibold uppercase tracking-wider text-[10px] cursor-pointer"
                    >
                      <span>Open in New Tab</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => setLoginError(null)}
                      className="text-amber-400/60 hover:text-amber-200 transition-colors underline underline-offset-4 text-[11px]"
                    >
                      Dismiss Error
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setLoginError(null)}
                className="absolute top-3.5 right-4 text-amber-400/40 hover:text-amber-200 transition-colors text-lg"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Inner Main Workspace */}
        <main className="flex-1 transition-all duration-300">
          {renderActiveTab()}
        </main>
      </div>

      {/* Styled minimalistic footer */}
      <footer id="app-footer" className="border-t border-white/10 bg-[#0F0F0F] py-6 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans text-xs text-white/40">
            &copy; 2026 EduQuery Analytics. Built for educators, engineers, and learning teams.
          </p>
          <div className="flex items-center space-x-4 font-mono text-[10px] text-white/40">
            <span>DATABASE: GOOGLE SHEETS API V4</span>
            <span>OAUTH 2.0 PROTOCOL</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
