/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import QuizRunner from './components/QuizRunner';
import Leaderboard from './components/Leaderboard';
import Analytics from './components/Analytics';
import QuizManager from './components/QuizManager';
import DatabaseConfig from './components/DatabaseConfig';
import { AlertCircle, HelpCircle, Lock, ShieldAlert, X, CheckCircle, Info, Loader2 } from 'lucide-react';
import { initAuth, googleSignIn } from './firebase';
import { subscribeToLoading, subscribeToToast, ToastMessage, ToastType } from './sheets';

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('eduquery_admin_logged_in') === 'true';
  });
  const [activeTab, setActiveTab] = useState<'quiz' | 'leaderboard' | 'analytics' | 'manage' | 'database'>('quiz');
  
  const [isDirectLink, setIsDirectLink] = useState(false);

  // Google Sheets token and database configuration state
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('eduquery_spreadsheet_id');
  });
  const [appsScriptUrl, setAppsScriptUrl] = useState<string | null>(() => {
    return localStorage.getItem('eduquery_apps_script_url');
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Centralized Sheets API tracking states
  const [globalLoading, setGlobalLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribeLoading = subscribeToLoading((isLoading) => {
      setGlobalLoading(isLoading);
    });

    const unsubscribeToast = subscribeToToast((message, type) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    });

    return () => {
      unsubscribeLoading();
      unsubscribeToast();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('quizId')) {
      setIsDirectLink(true);
    }
    const urlSpreadsheetId = params.get('spreadsheetId');
    if (urlSpreadsheetId) {
      localStorage.setItem('eduquery_spreadsheet_id', urlSpreadsheetId);
      setSpreadsheetId(urlSpreadsheetId);
    }
    const urlAppsScriptUrl = params.get('appsScriptUrl');
    if (urlAppsScriptUrl) {
      localStorage.setItem('eduquery_apps_script_url', urlAppsScriptUrl);
      setAppsScriptUrl(urlAppsScriptUrl);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (_user, retrievedToken) => {
        setToken(retrievedToken);
      },
      () => {
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      await googleSignIn();
    } catch (err) {
      console.error(err);
      alert('Sign-in failed. Please ensure popup blocks are disabled or try launching in a new tab.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // Incremented whenever a quiz ends, prompting leaderboard & analytics components to reload
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (passwordInput === 'admin') {
      setIsAdmin(true);
      localStorage.setItem('eduquery_admin_logged_in', 'true');
      setIsLoginModalOpen(false);
      setPasswordInput('');
    } else {
      setLoginError('Invalid administrator password. Try "admin"!');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('eduquery_admin_logged_in');
    if (activeTab === 'analytics' || activeTab === 'manage' || activeTab === 'database') {
      setActiveTab('quiz');
    }
  };

  const handleResultsSubmitted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'quiz':
        return (
          <QuizRunner
            onResultsSubmitted={handleResultsSubmitted}
            token={token}
            spreadsheetId={spreadsheetId}
            appsScriptUrl={appsScriptUrl}
            onGoogleSignIn={handleGoogleSignIn}
            isLoggingIn={isLoggingIn}
          />
        );
      case 'leaderboard':
        return (
          <Leaderboard
            refreshTrigger={refreshTrigger}
            token={token}
            spreadsheetId={spreadsheetId}
            appsScriptUrl={appsScriptUrl}
          />
        );
      case 'analytics':
        return isAdmin ? (
          <Analytics
            refreshTrigger={refreshTrigger}
            token={token}
            spreadsheetId={spreadsheetId}
            appsScriptUrl={appsScriptUrl}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50 space-y-4">
            <ShieldAlert className="h-10 w-10 text-rose-500 animate-bounce" />
            <p className="font-sans text-sm">You need administrator privileges to view analytics.</p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="rounded-xl bg-white px-4 py-2 font-sans text-xs font-semibold text-black hover:bg-white/90 shadow-sm cursor-pointer"
            >
              Unlock Admin Portal
            </button>
          </div>
        );
      case 'manage':
        return isAdmin ? (
          <QuizManager
            token={token}
            spreadsheetId={spreadsheetId}
            appsScriptUrl={appsScriptUrl}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50 space-y-4">
            <ShieldAlert className="h-10 w-10 text-rose-500 animate-bounce" />
            <p className="font-sans text-sm">You need administrator privileges to manage quizzes.</p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="rounded-xl bg-white px-4 py-2 font-sans text-xs font-semibold text-black hover:bg-white/90 shadow-sm cursor-pointer"
            >
              Unlock Admin Portal
            </button>
          </div>
        );
      case 'database':
        return isAdmin ? (
          <DatabaseConfig
            token={token}
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            appsScriptUrl={appsScriptUrl}
            setAppsScriptUrl={setAppsScriptUrl}
            onLogin={handleGoogleSignIn}
            isLoggingIn={isLoggingIn}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50 space-y-4">
            <ShieldAlert className="h-10 w-10 text-rose-500 animate-bounce" />
            <p className="font-sans text-sm">You need administrator privileges to configure Google Sheets integration.</p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="rounded-xl bg-white px-4 py-2 font-sans text-xs font-semibold text-black hover:bg-white/90 shadow-sm cursor-pointer"
            >
              Unlock Admin Portal
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col justify-between font-sans">
      
      {/* Top Progress Loading Line */}
      {globalLoading && (
        <div className="fixed top-0 left-0 right-0 z-[120] h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />
      )}

      {/* Centralized syncing badge */}
      {globalLoading && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center space-x-2 rounded-full bg-indigo-950/90 border border-indigo-500/30 text-indigo-200 px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Syncing with Google Sheets Database...</span>
        </div>
      )}

      {/* Toasts overlay stack */}
      <div className="fixed top-6 right-6 z-[110] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right ${
              toast.type === 'success'
                ? 'bg-[#0a1610]/95 border-emerald-500/30 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-[#180a0d]/95 border-rose-500/30 text-rose-300'
                : 'bg-[#0f111a]/95 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-indigo-400" />}
            </div>
            <div className="flex-1">
              <p className="font-sans text-xs font-semibold leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="shrink-0 text-white/30 hover:text-white/70 transition-colors p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Top Banner and Navigation */}
      <div className="flex-1 flex flex-col">
        {!isDirectLink && (
          <Navbar
            isAdmin={isAdmin}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLogoutClick={handleAdminLogout}
            spreadsheetId={spreadsheetId}
          />
        )}

        {/* Beautiful Admin Password Login Modal */}
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <button
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setLoginError(null);
                  setPasswordInput('');
                }}
                className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
                  <Lock className="h-5 w-5 text-white/90" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif italic text-lg text-white">Administrator Portal</h3>
                  <p className="font-sans text-xs text-white/40">
                    Enter the access passcode to unlock grading tools, analytics, and quiz managers.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 font-mono">
                    Passcode
                  </label>
                  <input
                    type="password"
                    placeholder="Enter 'admin' to test"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-sans text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-0"
                    autoFocus
                  />
                </div>

                {loginError && (
                  <p className="font-sans text-xs text-rose-400 font-semibold leading-relaxed">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center rounded-xl bg-white py-2.5 font-sans text-xs font-semibold text-black hover:bg-white/90 transition-all cursor-pointer shadow-sm"
                >
                  Verify Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Dynamic Inner Main Workspace */}
        <main className="flex-1 transition-all duration-300">
          {renderActiveTab()}
        </main>
      </div>

      {/* Styled minimalistic footer */}
      {!isDirectLink && (
        <footer id="app-footer" className="border-t border-white/10 bg-[#0F0F0F] py-6 mt-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-sans text-xs text-white/40">
              &copy; 2026 EduQuery Analytics. Offline-first grading engine.
            </p>
            <div className="flex items-center space-x-4 font-mono text-[10px] text-white/40">
              <span>DATABASE: {spreadsheetId ? 'GOOGLE SHEETS DB' : 'LOCAL STORAGE DB'}</span>
              <span>SECURE CRYPTO VERIFIER</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
