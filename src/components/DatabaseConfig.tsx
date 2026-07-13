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

const APPS_SCRIPT_CODE = `function doGet(e) {
  var action = e.parameter.action;
  var spreadsheetId = e.parameter.spreadsheetId;
  var ss = SpreadsheetApp.openById(spreadsheetId);
  
  if (action === "getScores") {
    var sheet = ss.getSheetByName("Scores");
    if (!sheet) return createJsonResponse([]);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJsonResponse([]);
    var results = [];
    for (var i = 1; i < data.length; i++) {
      results.push({
        timestamp: data[i][0] || "",
        userName: data[i][1] || "Anonymous",
        userEmail: data[i][2] || "",
        score: Number(data[i][3]) || 0,
        totalQuestions: Number(data[i][4]) || 0,
        percentage: Number(data[i][5]) || 0,
        timeTakenSeconds: Number(data[i][6]) || 0
      });
    }
    return createJsonResponse(results);
  }
  
  if (action === "getResponses") {
    var sheet = ss.getSheetByName("Responses");
    if (!sheet) return createJsonResponse([]);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJsonResponse([]);
    var results = [];
    for (var i = 1; i < data.length; i++) {
      results.push({
        timestamp: data[i][0] || "",
        userEmail: data[i][1] || "",
        questionIndex: Number(data[i][2]) || 0,
        questionText: data[i][3] || "",
        type: data[i][4] || "mcq",
        userAnswer: data[i][5] || "",
        correctAnswer: data[i][6] || "",
        isCorrect: data[i][7] === "TRUE" || data[i][7] === true,
        category: data[i][8] || "General"
      });
    }
    return createJsonResponse(results);
  }
  
  if (action === "getQuizzes") {
    var sheet = ss.getSheetByName("Quizzes");
    if (!sheet) return createJsonResponse([]);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJsonResponse([]);
    var results = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][4]) {
        try {
          results.push(JSON.parse(data[i][4]));
        } catch(err) {}
      }
    }
    return createJsonResponse(results);
  }
  
  return createJsonResponse({ status: "error", message: "Unknown action" });
}

function doPost(e) {
  var params = JSON.parse(e.postData.contents);
  var action = params.action;
  var spreadsheetId = params.spreadsheetId;
  var ss = SpreadsheetApp.openById(spreadsheetId);
  
  ensureSheets(ss);
  
  if (action === "addScore") {
    var sheet = ss.getSheetByName("Scores");
    var row = params.row;
    sheet.appendRow([
      row.timestamp,
      row.userName,
      row.userEmail,
      row.score,
      row.totalQuestions,
      row.percentage,
      row.timeTakenSeconds
    ]);
    return createJsonResponse({ status: "success" });
  }
  
  if (action === "addResponses") {
    var sheet = ss.getSheetByName("Responses");
    var rows = params.rows;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      sheet.appendRow([
        r.timestamp,
        r.userEmail,
        r.questionIndex,
        r.questionText,
        r.type,
        r.userAnswer,
        r.correctAnswer,
        r.isCorrect ? "TRUE" : "FALSE",
        r.category
      ]);
    }
    return createJsonResponse({ status: "success" });
  }
  
  if (action === "savePlayer") {
    var sheet = ss.getSheetByName("Players");
    var timestamp = new Date().toISOString();
    var emailPrefix = params.playerName.toLowerCase().replace(/\\s+/g, '');
    var playerEmail = emailPrefix + "@eduquery.internal";
    sheet.appendRow([
      timestamp,
      params.playerName,
      playerEmail,
      params.quizId,
      params.quizTitle
    ]);
    return createJsonResponse({ status: "success" });
  }
  
  if (action === "saveQuiz") {
    var sheet = ss.getSheetByName("Quizzes");
    var quiz = params.quiz;
    var data = sheet.getDataRange().getValues();
    var existingIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === quiz.id) {
        existingIndex = i + 1;
        break;
      }
    }
    var quizJson = JSON.stringify(quiz);
    var rowValues = [quiz.id, quiz.title, quiz.description, quiz.durationMinutes, quizJson];
    if (existingIndex !== -1) {
      sheet.getRange(existingIndex, 1, 1, 5).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    return createJsonResponse({ status: "success" });
  }
  
  if (action === "deleteQuiz") {
    var sheet = ss.getSheetByName("Quizzes");
    var quizId = params.quizId;
    var data = sheet.getDataRange().getValues();
    var keepRows = [["Quiz ID", "Title", "Description", "Duration (Minutes)", "Quiz Data JSON"]];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== quizId) {
        keepRows.push(data[i]);
      }
    }
    sheet.clearContents();
    sheet.getRange(1, 1, keepRows.length, 5).setValues(keepRows);
    return createJsonResponse({ status: "success" });
  }
  
  return createJsonResponse({ status: "error", message: "Unknown action" });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheets(ss) {
  var sheets = ["Scores", "Responses", "Players", "Quizzes"];
  var headers = [
    ["Timestamp", "Player Name", "Player Email", "Score", "Total Questions", "Percentage", "Time Taken (Seconds)"],
    ["Timestamp", "Player Email", "Question Index", "Question Text", "Type", "User Answer", "Correct Answer", "Is Correct", "Category"],
    ["Timestamp", "Player Name", "Player Email", "Invited Quiz ID", "Invited Quiz Title"],
    ["Quiz ID", "Title", "Description", "Duration (Minutes)", "Quiz Data JSON"]
  ];
  for (var i = 0; i < sheets.length; i++) {
    var sheet = ss.getSheetByName(sheets[i]);
    if (!sheet) {
      sheet = ss.insertSheet(sheets[i]);
      sheet.appendRow(headers[i]);
    }
  }
}`;

interface DatabaseConfigProps {
  token: string | null;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string | null) => void;
  appsScriptUrl: string | null;
  setAppsScriptUrl: (url: string | null) => void;
  onLogin: () => void;
  isLoggingIn: boolean;
}

export default function DatabaseConfig({
  token,
  spreadsheetId,
  setSpreadsheetId,
  appsScriptUrl,
  setAppsScriptUrl,
  onLogin,
  isLoggingIn,
}: DatabaseConfigProps) {
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState('');
  const [inputAppsScriptUrl, setInputAppsScriptUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

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

  const handleLinkAppsScript = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!inputAppsScriptUrl.trim()) return;
    
    const url = inputAppsScriptUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Please enter a valid HTTP or HTTPS Web App URL.');
      return;
    }
    
    setAppsScriptUrl(url);
    localStorage.setItem('eduquery_apps_script_url', url);
    setSuccess('Successfully configured the Apps Script Web App! Students can now submit scores and fetch quizzes directly without Google log-in.');
    setInputAppsScriptUrl('');
  };

  const handleDisconnectAppsScript = () => {
    const confirm = window.confirm('Are you sure you want to disconnect the Apps Script Web App? Students will not be able to submit scores or fetch quizzes without authenticating.');
    if (!confirm) return;
    setAppsScriptUrl(null);
    localStorage.removeItem('eduquery_apps_script_url');
    setSuccess('Apps Script Web App disconnected.');
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
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-6 space-y-4">
            <h3 className="font-sans text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Direct Sheets API</h3>
            
            {spreadsheetId ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-sans text-sm font-semibold">Connected (Auth)</span>
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

                <button
                  onClick={handleDisconnect}
                  className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 font-sans text-[10px] uppercase tracking-wider font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  Disconnect Direct Sheets
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-amber-400/80">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="font-sans text-sm font-semibold">Not Connected</span>
                </div>
                <p className="font-sans text-[11px] text-white/40 leading-relaxed">
                  Required if you want to create or connect sheets using direct OAuth authentication.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#141414] p-6 space-y-4">
            <h3 className="font-sans text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Apps Script Bypass</h3>
            
            {appsScriptUrl ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-sans text-sm font-semibold">Active (No-Login)</span>
                </div>
                
                <div className="rounded-xl bg-[#111111] border border-white/5 p-3 space-y-1">
                  <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block font-bold">Web App URL</span>
                  <p className="font-mono text-[10px] text-indigo-300 truncate">{appsScriptUrl}</p>
                </div>

                <button
                  onClick={handleDisconnectAppsScript}
                  className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 font-sans text-[10px] uppercase tracking-wider font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  Disconnect Apps Script
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-amber-400/80">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="font-sans text-sm font-semibold">Not Configured</span>
                </div>
                <p className="font-sans text-[11px] text-white/40 leading-relaxed">
                  Highly recommended! Enables students to attempt and submit quizzes with just their name (no logins).
                </p>
              </div>
            )}
          </div>
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

          {/* Section 1: Google Apps Script Web App (RECOMMENDED / CLIENT BYPASS) */}
          <div className="rounded-2xl border border-indigo-500/20 bg-[#121218] p-6 space-y-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-sans text-sm font-bold text-white">Google Apps Script Connection</h4>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">No-Login Client Bypass</span>
                  </div>
                  <p className="font-sans text-xs text-white/50">Allow students to take quizzes and submit scores without requiring Google Sign-in.</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#0d0d11] border border-white/5 p-4 space-y-3 font-sans text-xs text-white/70">
              <p className="font-semibold text-white/90">How to set up:</p>
              <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                <li>Create a Google Sheet and copy its Spreadsheet ID from the URL.</li>
                <li>In your Google Sheet, click <strong className="text-white">Extensions &gt; Apps Script</strong>.</li>
                <li>Replace all existing code with the script snippet below and click <strong className="text-white">Save</strong>.</li>
                <li>Click <strong className="text-white">Deploy &gt; New Deployment</strong>. Select <strong className="text-white">Web App</strong> as type.</li>
                <li>Set "Execute as" to <strong className="text-white">Me (your-email)</strong> and "Who has access" to <strong className="text-white">Anyone</strong> (so students can submit scores).</li>
                <li>Deploy, copy the Web App URL, and paste it below.</li>
              </ol>
            </div>

            {/* Form to paste Web App URL */}
            <form onSubmit={handleLinkAppsScript} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={inputAppsScriptUrl}
                  onChange={(e) => setInputAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 rounded-xl border border-white/5 bg-[#111111] px-3.5 py-2.5 font-sans text-xs focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none text-white placeholder-white/20 font-mono"
                />
                <button
                  type="submit"
                  disabled={!inputAppsScriptUrl.trim()}
                  className="flex items-center justify-center space-x-2 rounded-xl border border-white/15 bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 font-sans text-xs uppercase tracking-wider font-semibold text-white transition-all cursor-pointer"
                >
                  <span>Connect Web App</span>
                </button>
              </div>
            </form>

            {/* Collapsible Copy Code block */}
            <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0a0a0c]">
              <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/5">
                <span className="font-mono text-xs text-white/70">Google Apps Script Code (Code.gs)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                  {copiedScript ? 'Copied!' : 'Copy Script Code'}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-[10px] font-mono text-white/60 max-h-48 leading-relaxed">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>

          {/* Section 2: Direct Google Sheets API (Fallback / Admin) */}
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-6 space-y-4">
            <h4 className="font-sans text-sm font-bold text-white flex items-center space-x-2">
              <span>Direct Google Sheets API (OAuth)</span>
            </h4>
            <p className="font-sans text-xs text-white/50">
              Authenticate via OAuth to directly create spreadsheets and test connections from your current teacher session.
            </p>

            {!token ? (
              <div className="border border-white/5 rounded-xl p-5 text-center space-y-3 bg-[#111111]">
                <p className="font-sans text-xs text-white/50">Sign in with Google to use direct API operations.</p>
                <button
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="mx-auto flex items-center space-x-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50 cursor-pointer"
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
              <div className="space-y-4">
                {/* Option A: Create Spreadsheet */}
                <div className="rounded-xl border border-white/5 p-4 bg-[#111111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-sans text-xs font-bold text-white">Provision a New Sheet</h5>
                    <p className="font-sans text-[11px] text-white/40">Creates "Scores" and "Responses" tabs automatically.</p>
                  </div>
                  <button
                    onClick={handleCreateNew}
                    disabled={isCreating}
                    className="flex items-center justify-center space-x-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isCreating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span>Create New Sheet</span>
                    )}
                  </button>
                </div>

                {/* Option B: Link Spreadsheet */}
                <div className="rounded-xl border border-white/5 p-4 bg-[#111111] space-y-3">
                  <div>
                    <h5 className="font-sans text-xs font-bold text-white">Link an Existing Spreadsheet ID</h5>
                    <p className="font-sans text-[11px] text-white/40">Paste an existing spreadsheet ID or URL to link it.</p>
                  </div>
                  <form onSubmit={handleLinkExisting} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      value={inputSpreadsheetId}
                      onChange={(e) => setInputSpreadsheetId(e.target.value)}
                      placeholder="Spreadsheet ID or URL"
                      className="flex-1 rounded-xl border border-white/5 bg-[#0a0a0a] px-3.5 py-1.5 font-sans text-xs focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none text-white placeholder-white/20"
                    />
                    <button
                      type="submit"
                      disabled={isLinking || !inputSpreadsheetId.trim()}
                      className="flex items-center justify-center space-x-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isLinking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span>Connect</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
