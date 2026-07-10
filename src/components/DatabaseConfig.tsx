/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  PlusCircle, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Lock
} from 'lucide-react';
import { createQuizSpreadsheet, validateSpreadsheet } from '../sheets';

interface DatabaseConfigProps {
  token: string | null;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string | null) => void;
  onLogin: () => void;
  isLoggingIn: boolean;
}

export default function DatabaseConfig({
  token,
  spreadsheetId,
  setSpreadsheetId,
  onLogin,
  isLoggingIn,
}: DatabaseConfigProps) {
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateNew = async () => {
    if (!token) {
      setError('Please sign in with Google first.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      const newId = await createQuizSpreadsheet(token, "EduQuery Quiz Database & Analytics");
      setSpreadsheetId(newId);
      localStorage.setItem('eduquery_spreadsheet_id', newId);
      setSuccess('Successfully created and initialized a new quiz spreadsheet database!');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create spreadsheet. Ensure you have granted the required scopes.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please sign in with Google first.');
      return;
    }
    if (!inputSpreadsheetId.trim()) return;

    setError(null);
    setSuccess(null);
    setIsLinking(true);

    // Extract ID from full URL if pasted
    let targetId = inputSpreadsheetId.trim();
    if (targetId.includes('/d/')) {
      const match = targetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) targetId = match[1];
    }

    try {
      const isValid = await validateSpreadsheet(token, targetId);
      if (isValid) {
        setSpreadsheetId(targetId);
        localStorage.setItem('eduquery_spreadsheet_id', targetId);
        setSuccess('Successfully connected to the existing quiz spreadsheet!');
        setInputSpreadsheetId('');
      } else {
        setError('Invalid spreadsheet. Ensure it contains the required "Scores" and "Responses" sheets and is accessible.');
      }
    } catch (err: any) {
      setError('Failed to validate spreadsheet. Make sure the ID is correct and you have permission.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleDisconnect = () => {
    const confirm = window.confirm('Are you sure you want to disconnect this database? High scores and response analytics will not be saved until reconnected.');
    if (!confirm) return;
    setSpreadsheetId(null);
    localStorage.removeItem('eduquery_spreadsheet_id');
    setSuccess('Database disconnected.');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white mb-4 shadow-inner">
          <Database className="h-6 w-6 text-white/90" />
        </div>
        <h2 className="font-serif text-2xl font-normal italic tracking-tight text-white sm:text-3xl">Google Sheets Database Connection</h2>
        <p className="mt-2 font-sans text-xs uppercase tracking-wider text-white/40 max-w-lg mx-auto">
          EduQuery uses your personal Google Sheets as a fully persistent database. Scores, detailed questions, and response logs are saved directly in your Google Account.
        </p>
      </div>

      {/* Connection Panel */}
      <div className="grid gap-8 md:grid-cols-3">
        
        {/* Connection Overview Status */}
        <div className="md:col-span-1 rounded-2xl border border-white/5 bg-[#141414] p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-sans text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Connection Status</h3>
            
            {spreadsheetId ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-sans text-sm font-semibold">Active & Live</span>
                </div>
                
                <div className="rounded-xl bg-[#111111] border border-white/5 p-3 space-y-2">
                  <div className="flex items-center space-x-1.5 text-white/50">
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="font-mono text-[11px] truncate">ID: {spreadsheetId}</span>
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 font-sans text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <AlertCircle className="h-5 w-5 shrink-0 animate-pulse" />
                  <span className="font-sans text-sm font-semibold">Offline / Local Mode</span>
                </div>
                <p className="font-sans text-xs text-white/40">
                  Quiz results will only be saved locally in this browser session. Authenticate to sync with Google Sheets.
                </p>
              </div>
            )}
          </div>

          {spreadsheetId && (
            <button
              onClick={handleDisconnect}
              className="mt-6 w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              Disconnect DB
            </button>
          )}
        </div>

        {/* Setup Options Panel */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Messages */}
          {error && (
            <div className="flex items-start space-x-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 font-sans text-sm text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-sans text-sm text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Prompt Login if not authed */}
          {!token ? (
            <div className="rounded-2xl border border-white/5 bg-[#141414] p-8 text-center space-y-4">
              <Lock className="h-8 w-8 text-white/30 mx-auto" />
              <div>
                <h4 className="font-sans text-base font-semibold text-white">Sign in to Connect Sheets</h4>
                <p className="mt-1 font-sans text-xs text-white/50 max-w-sm mx-auto">
                  To automatically build, update, and fetch results from Google Sheets, the application requires your secure authorization.
                </p>
              </div>
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="mx-auto flex items-center space-x-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
              <p className="font-mono text-[10px] text-amber-400/80 max-w-sm mx-auto leading-relaxed mt-2 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
                ⚠️ <strong className="text-amber-300 font-semibold uppercase">Iframe Notice:</strong> Google auth popup may fail inside this preview iframe. If so, click the <strong className="text-white">"Open in New Tab"</strong> icon at the top-right of your screen to authorize.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Option A: Create Spreadsheet */}
              <div className="rounded-2xl border border-white/5 p-6 bg-[#141414] space-y-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-sans text-sm font-bold text-white">Provision a New Quiz Spreadsheet</h4>
                    <p className="font-sans text-xs text-white/50">Creates a structured spreadsheet with "Scores" and "Responses" tabs automatically.</p>
                  </div>
                </div>

                <button
                  onClick={handleCreateNew}
                  disabled={isCreating}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-sans text-xs uppercase tracking-wider font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating database...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Provision Spreadsheet DB</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option B: Connect Existing Spreadsheet */}
              <div className="rounded-2xl border border-white/5 p-6 bg-[#141414] space-y-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/80">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-sans text-sm font-bold text-white">Connect an Existing Spreadsheet</h4>
                    <p className="font-sans text-xs text-white/50">Link an existing spreadsheet created by this app by pasting its URL or ID.</p>
                  </div>
                </div>

                <form onSubmit={handleLinkExisting} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={inputSpreadsheetId}
                    onChange={(e) => setInputSpreadsheetId(e.target.value)}
                    placeholder="Spreadsheet ID or full Google Sheets URL"
                    className="flex-1 rounded-xl border border-white/5 bg-[#111111] px-3.5 py-2 font-sans text-xs focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none text-white placeholder-white/20"
                  />
                  <button
                    type="submit"
                    disabled={isLinking || !inputSpreadsheetId.trim()}
                    className="flex items-center justify-center space-x-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-sans text-xs uppercase tracking-wider font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isLinking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Connect Sheet</span>
                    )}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
