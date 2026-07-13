import React, { useState, useEffect } from 'react';
import { Quiz, PendingSubmission, SheetScoreRow, SheetResponseRow } from '../types';
import { addCustomQuiz, getCustomQuizzes, deleteCustomQuiz, DEFAULT_QUIZZES, setCustomQuizzesInMemory } from '../quizzes';
import { 
  FileJson, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  ClipboardCheck, 
  BookOpen, 
  Check, 
  X, 
  ChevronLeft,
  Award,
  AlertTriangle,
  Clock,
  User,
  ExternalLink,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { 
  getPendingSubmissions, 
  savePendingSubmissions, 
  saveLocalScore, 
  saveLocalResponses 
} from '../utils/localStorageDb';
import { appendScoreRow, appendResponseRows, saveQuizToSheets, deleteQuizFromSheets, fetchQuizzesFromSheets } from '../sheets';

interface QuizManagerProps {
  token?: string | null;
  spreadsheetId?: string | null;
  appsScriptUrl?: string | null;
}

export default function QuizManager({
  token,
  spreadsheetId,
  appsScriptUrl,
}: QuizManagerProps) {
  // Navigation subtabs
  const [subTab, setSubTab] = useState<'grading' | 'quizzes'>('grading');
  
  // Custom Quiz States
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customQuizzes, setCustomQuizzes] = useState<Quiz[]>(getCustomQuizzes());
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncingQuizzes, setIsSyncingQuizzes] = useState(false);

  // Sync quizzes from Google Sheets if connected
  useEffect(() => {
    async function syncQuizzesFromSheets() {
      if ((token && spreadsheetId) || appsScriptUrl) {
        setIsSyncingQuizzes(true);
        try {
          const sheetQuizzes = await fetchQuizzesFromSheets(token || null, spreadsheetId || null, appsScriptUrl);
          if (sheetQuizzes && sheetQuizzes.length > 0) {
            const localCustom = getCustomQuizzes();
            const updatedLocal = [...localCustom];
            sheetQuizzes.forEach(sq => {
              const existsIdx = updatedLocal.findIndex(q => q.id === sq.id);
              if (existsIdx !== -1) {
                updatedLocal[existsIdx] = sq;
              } else {
                updatedLocal.push(sq);
              }
            });
            setCustomQuizzesInMemory(updatedLocal);
            setCustomQuizzes(updatedLocal);
          }
        } catch (err) {
          console.error("Failed to sync quizzes from sheets:", err);
        } finally {
          setIsSyncingQuizzes(false);
        }
      }
    }
    syncQuizzesFromSheets();
  }, [token, spreadsheetId, appsScriptUrl]);

  // Grading Portal States
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);
  const [gradingResponses, setGradingResponses] = useState<Record<string, boolean>>({});
  const [isPublishing, setIsPublishing] = useState(false);

  // Sync pending submissions from local storage
  const loadPending = () => {
    setPendingSubmissions(getPendingSubmissions());
  };

  useEffect(() => {
    loadPending();
  }, [subTab]);

  // Drag and drop for JSON custom quizzes
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setSuccess(null);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Only .json files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (content) {
          setJsonInput(content);
          setSuccess(`Loaded JSON file "${file.name}"! Click 'Import Quiz' below to save.`);
        }
      } catch (err) {
        setError("Error reading file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    try {
      if (!jsonInput.trim()) {
        throw new Error("Please enter JSON data.");
      }
      
      const parsed = JSON.parse(jsonInput);
      
      const validateQuiz = (q: any): q is Quiz => {
        if (!q.id || !q.title || !q.questions || !Array.isArray(q.questions)) {
          return false;
        }
        return true;
      };

      let quizzesToAdd: Quiz[] = [];

      if (Array.isArray(parsed)) {
        if (!parsed.every(validateQuiz)) {
          throw new Error("Invalid quiz format in array.");
        }
        quizzesToAdd = parsed;
      } else {
        if (!validateQuiz(parsed)) {
          throw new Error("Invalid quiz format.");
        }
        quizzesToAdd = [parsed];
      }

      quizzesToAdd.forEach(q => addCustomQuiz(q));

      // Save custom quizzes to Google Sheets as well if connected
      if ((token && spreadsheetId) || appsScriptUrl) {
        for (const quiz of quizzesToAdd) {
          try {
            await saveQuizToSheets(token || null, spreadsheetId || null, quiz, appsScriptUrl);
          } catch (sheetsErr: any) {
            console.error('Failed to sync quiz to Google Sheets:', sheetsErr);
          }
        }
      }

      setCustomQuizzes(getCustomQuizzes());
      setJsonInput('');
      setSuccess(`Successfully added ${quizzesToAdd.length} quiz(zes)${token && spreadsheetId ? ' and synchronized with Google Sheets' : ''}.`);
    } catch (e: any) {
      setError(e.message || "Invalid JSON format.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (content) {
          setJsonInput(content);
        }
      } catch (err: any) {
        setError("Error reading file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      deleteCustomQuiz(id);
      setCustomQuizzes(getCustomQuizzes());

      if ((token && spreadsheetId) || appsScriptUrl) {
        await deleteQuizFromSheets(token || null, spreadsheetId || null, id, appsScriptUrl);
        setSuccess("Quiz deleted successfully from local cache and Google Sheets.");
      } else {
        setSuccess("Quiz deleted successfully.");
      }
    } catch (err: any) {
      console.error("Failed to delete quiz from sheets:", err);
      setError("Quiz deleted locally, but failed to remove from Google Sheets.");
    }
  };

  // Grading Queue Helpers
  const handleSelectSubmission = (sub: PendingSubmission) => {
    setSelectedSubmission(sub);
    const initialGrading: Record<string, boolean> = {};
    sub.responses.forEach(resp => {
      // Default to auto-calculated check, but admin can toggle
      initialGrading[resp.questionId] = resp.isCorrect ?? false;
    });
    setGradingResponses(initialGrading);
  };

  const toggleQuestionGrading = (qId: string, value: boolean) => {
    setGradingResponses(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handlePublishGrade = async (sub: PendingSubmission) => {
    setIsPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      let correctCount = 0;
      const finalResponses = sub.responses.map(resp => {
        const isCorrect = gradingResponses[resp.questionId] ?? false;
        if (isCorrect) correctCount++;
        return {
          ...resp,
          isCorrect
        };
      });

      const totalQuestions = sub.responses.length;
      const percentage = Math.round((correctCount / totalQuestions) * 100);

      const scoreRow: SheetScoreRow = {
        timestamp: sub.timestamp,
        userName: sub.userName,
        userEmail: sub.userEmail,
        score: correctCount,
        totalQuestions,
        percentage,
        timeTakenSeconds: sub.timeTakenSeconds
      };

      const responseRows: SheetResponseRow[] = finalResponses.map((resp, idx) => ({
        timestamp: sub.timestamp,
        userEmail: sub.userEmail,
        questionIndex: idx + 1,
        questionText: resp.questionText,
        type: resp.questionType,
        userAnswer: resp.userAnswer,
        correctAnswer: resp.correctAnswer,
        isCorrect: resp.isCorrect,
        category: resp.category
      }));

      // Write to Google Sheets cloud first if connected
      if ((token && spreadsheetId) || appsScriptUrl) {
        try {
          await appendScoreRow(token || null, spreadsheetId || null, scoreRow, appsScriptUrl);
          await appendResponseRows(token || null, spreadsheetId || null, responseRows, appsScriptUrl);
        } catch (err: any) {
          console.error('Failed to sync to Google Sheets:', err);
          throw new Error(`Grade submission failed to sync with Google Sheets: ${err?.message || err}. Local save cancelled to preserve database integrity.`);
        }
      }

      // Save finalized grade to local storage leaderboard and analytics
      saveLocalScore(scoreRow);
      saveLocalResponses(responseRows);

      // Remove from pending submissions list
      const allPending = getPendingSubmissions();
      const updatedPending = allPending.filter(p => p.id !== sub.id);
      savePendingSubmissions(updatedPending);
      setPendingSubmissions(updatedPending);

      // Reset states
      setSelectedSubmission(null);
      setSuccess(`Successfully graded ${sub.userName}'s quiz! Published ${correctCount}/${totalQuestions} score to the Leaderboard${spreadsheetId ? ' (Synchronized with Google Sheets)' : ''}.`);
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An error occurred while publishing the grade.');
    } finally {
      setIsPublishing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal italic tracking-tight text-white sm:text-3xl">Administrator Command Portal</h2>
          <p className="mt-1 font-sans text-xs uppercase tracking-wider text-white/50">
            Determine and authorize student grades, manage quiz banks, and import custom curriculum questions.
          </p>
        </div>
      </div>

      {/* Primary Subtabs Navigation */}
      <div className="flex border-b border-white/10 mb-2 space-x-6">
        <button 
          onClick={() => {
            setSubTab('grading');
            setSelectedSubmission(null);
          }} 
          className={`pb-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            subTab === 'grading' 
              ? 'border-white text-white' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Grading Queue ({pendingSubmissions.filter(s => s.status === 'pending').length})</span>
        </button>
        <button 
          onClick={() => {
            setSubTab('quizzes');
            setSelectedSubmission(null);
          }} 
          className={`pb-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            subTab === 'quizzes' 
              ? 'border-white text-white' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Quiz Library & Import</span>
        </button>
      </div>

      {/* Success Notifications Banner */}
      {success && (
        <div className="text-emerald-400 text-sm font-medium bg-emerald-400/10 p-4 rounded-xl border border-emerald-400/20 flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SUBTAB 1: GRADING PORTAL */}
      {subTab === 'grading' && (
        <div className="space-y-6">
          
          {selectedSubmission ? (
            /* ACTIVE GRADING WORKSPACE PANEL */
            <div className="rounded-3xl border border-white/10 bg-[#121212] p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
              
              {/* Grading Workspace Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6 gap-4">
                <div className="flex items-center space-x-3.5">
                  <button 
                    onClick={() => setSelectedSubmission(null)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                    title="Return to Queue"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      Manual Grading Session
                    </span>
                    <h3 className="font-serif italic text-xl text-white mt-1">
                      Grading: {selectedSubmission.userName}
                    </h3>
                    <p className="font-sans text-xs text-white/40 mt-0.5">
                      Candidate Email: {selectedSubmission.userEmail}  |  Quiz: <strong>{selectedSubmission.quizTitle}</strong>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 flex items-center space-x-6">
                  <div>
                    <span className="block font-mono text-[9px] text-white/40 uppercase">Time Spent</span>
                    <span className="font-sans font-bold text-white text-sm">{formatTime(selectedSubmission.timeTakenSeconds)}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/10" />
                  <div>
                    <span className="block font-mono text-[9px] text-white/40 uppercase font-bold">Dynamic Score</span>
                    <span className="font-serif text-lg italic font-bold text-white leading-none">
                      {Object.values(gradingResponses).filter(Boolean).length} / {selectedSubmission.responses.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Question Answers Grading Grid */}
              <div className="space-y-6">
                <h4 className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Assess Student Answers & Overrides
                </h4>

                {selectedSubmission.responses.map((resp, idx) => {
                  const isMarkedCorrect = gradingResponses[resp.questionId] ?? false;
                  
                  return (
                    <div key={resp.questionId} className="rounded-2xl border border-white/5 bg-[#171717] p-5 space-y-4 shadow-sm relative overflow-hidden">
                      
                      {/* Top metadata */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-white/40 font-bold">
                          QUESTION {idx + 1} • <span className="uppercase">{resp.category}</span>
                        </span>
                        <span className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-white/50 uppercase">
                          {resp.questionType.toUpperCase()}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p className="font-sans text-sm font-semibold text-white leading-snug">{resp.questionText}</p>

                      {/* Comparison blocks */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-xl p-3 bg-white/5 border border-white/10 text-white text-xs space-y-1">
                          <span className="font-mono text-[9px] uppercase font-bold text-white/30 block">Candidate's Answer</span>
                          <span className="font-sans font-semibold text-white/90 break-all">
                            {(() => {
                              try {
                                const parsed = JSON.parse(resp.userAnswer);
                                if (Array.isArray(parsed)) return parsed.join(', ');
                                return resp.userAnswer;
                              } catch {
                                return resp.userAnswer || '[Skipped]';
                              }
                            })()}
                          </span>
                        </div>

                        <div className="rounded-xl p-3 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs space-y-1">
                          <span className="font-mono text-[9px] uppercase font-bold text-white/30 block">Answer Key / Rubric</span>
                          <span className="font-sans font-semibold text-emerald-300 break-all">
                            {(() => {
                              try {
                                const parsed = JSON.parse(resp.correctAnswer);
                                if (Array.isArray(parsed)) return parsed.join(', ');
                                return resp.correctAnswer;
                              } catch {
                                return resp.correctAnswer;
                              }
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Manual Grading Toggle Toggles */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-sans text-xs text-white/40">Suggested grade:</span>
                          <span className={`font-mono text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                            resp.isCorrect
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {resp.isCorrect ? 'Auto-Correct' : 'Auto-Incorrect'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleQuestionGrading(resp.questionId, false)}
                            className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-xl border font-sans text-xs font-semibold cursor-pointer transition-all ${
                              !isMarkedCorrect
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold shadow-sm'
                                : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Incorrect</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => toggleQuestionGrading(resp.questionId, true)}
                            className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-xl border font-sans text-xs font-semibold cursor-pointer transition-all ${
                              isMarkedCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold shadow-sm'
                                : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Correct</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-start space-x-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 font-sans text-xs text-rose-400 mb-6">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Grade Submission Action Bar */}
              <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-sans text-xs font-bold text-white/70">Final Verification Checklist</h4>
                  <p className="font-sans text-[11px] text-white/40 leading-relaxed">
                    By submitting this grade, the results will immediately be compiled, saved, and published to the public student Leaderboard and the struggle metrics on Analytics.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    disabled={isPublishing}
                    className="rounded-xl border border-white/15 px-5 py-2.5 font-sans text-xs font-bold text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePublishGrade(selectedSubmission)}
                    disabled={isPublishing}
                    className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-6 py-2.5 font-sans text-xs font-bold text-black hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Publishing to Database...</span>
                      </>
                    ) : (
                      <>
                        <Award className="h-4 w-4" />
                        <span>Publish Score & Post Leaderboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* PENDING GRADING QUEUE LIST */
            <div className="space-y-4">
              
              {pendingSubmissions.length === 0 ? (
                /* EMPTY QUEUE STATE */
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#121212]/30 p-12 text-center space-y-6 max-w-md mx-auto my-12">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-sans text-sm font-bold text-white">All Caught Up!</h4>
                    <p className="font-sans text-xs text-white/40 leading-relaxed">
                      There are currently no student quiz submissions waiting to be graded. Any attempts taken by candidates will flow here in real-time.
                    </p>
                  </div>
                </div>
              ) : (
                /* LIST OF ACTIVE PENDING SUBMISSIONS */
                <div className="space-y-3">
                  <h3 className="font-sans text-xs font-bold text-white/50 uppercase tracking-widest">
                    Awaiting Manual Grade Verification
                  </h3>
                  
                  {pendingSubmissions.map(sub => {
                    return (
                      <div 
                        key={sub.id} 
                        className="rounded-2xl border border-white/15 bg-[#141414] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-white/20 transition-all shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-serif italic text-base text-white font-medium">{sub.userName}</span>
                            <span className="font-mono text-[9px] text-white/40">({sub.userEmail})</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-white/50">
                            <span className="font-semibold text-white/70">Quiz: {sub.quizTitle}</span>
                            <span className="hidden sm:inline text-white/20">•</span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-white/40" />
                              <span>{formatTime(sub.timeTakenSeconds)} seconds</span>
                            </span>
                            <span className="hidden sm:inline text-white/20">•</span>
                            <span>{new Date(sub.timestamp).toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectSubmission(sub)}
                          className="sm:self-center self-start flex items-center space-x-1 rounded-xl bg-white px-4 py-2 font-sans text-xs font-semibold text-black hover:bg-white/90 shadow-sm cursor-pointer transition-all"
                        >
                          <span>Grade Submission</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* SUBTAB 2: QUIZ MANAGEMENT */}
      {subTab === 'quizzes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            
            {/* Importer Panel */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all duration-200 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                  : 'border-white/10 bg-[#141414]'
              }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FileJson className="w-32 h-32 text-white" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-4 relative z-10 flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <span>Import Custom Quiz</span>
              </h3>
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end">
                  <label className="block text-xs font-medium text-white/70">
                    {isDragging ? 'Drop your JSON file here!' : 'Raw Quiz JSON Data'}
                  </label>
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <span>Upload File Instead</span>
                    <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='Paste quiz JSON representation here...'
                  className="w-full h-48 rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs text-white/90 placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-0"
                />
                
                {error && (
                  <div className="text-red-400 text-xs font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={!jsonInput.trim()}
                  className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer text-xs"
                >
                  Import Quiz
                </button>
              </div>
            </div>

            {/* Format Reference Card */}
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileJson className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs uppercase font-bold tracking-wider text-white/80">JSON Example & Template</span>
                </div>
                <button
                  onClick={() => {
                    const sample = {
                      id: "custom-form-demo",
                      title: "General Feedback Form",
                      description: "A customized form utilizing the new Google Forms style field types.",
                      durationMinutes: 15,
                      questions: [
                        {
                          id: "q1",
                          text: "What is your primary role?",
                          type: "dropdown",
                          options: ["Developer", "Designer", "Manager", "Other"],
                          correctAnswer: "Developer",
                          category: "Demographics"
                        },
                        {
                          id: "q2",
                          text: "Which frameworks do you use?",
                          type: "checkbox",
                          options: ["React", "Vue", "Angular", "Svelte"],
                          correctAnswer: '["React"]',
                          category: "Tech"
                        },
                        {
                          id: "q3",
                          text: "How satisfied are you with our service?",
                          type: "scale",
                          scaleMin: 1,
                          scaleMax: 5,
                          scaleMinLabel: "Not Satisfied",
                          scaleMaxLabel: "Very Satisfied",
                          correctAnswer: "5",
                          category: "Feedback"
                        },
                        {
                          id: "q4",
                          text: "Please provide any additional detailed feedback:",
                          type: "paragraph",
                          correctAnswer: "Feedback received.",
                          category: "Feedback",
                          explanation: "Paragraph questions are bypassed by the auto-grading engine and flow directly to your manual Grading Queue subtab."
                        }
                      ]
                    };
                    navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                    alert("Sample Quiz JSON copied to clipboard!");
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-indigo-400 hover:bg-indigo-400/10 hover:border-indigo-400/20 transition-all cursor-pointer"
                >
                  Copy Template
                </button>
              </div>

              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Below is the standard JSON layout required by the system. Use <code className="text-indigo-400 font-mono">"type": "essay"</code> to route a question to your manual Grading Queue.
              </p>

              <div className="relative">
                <pre className="max-h-64 overflow-y-auto rounded-xl bg-black/60 p-3 font-mono text-[10px] text-white/80 leading-relaxed border border-white/5 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-white/10">
{`{
  "id": "custom-form-demo",
  "title": "General Feedback Form",
  "description": "A customized form utilizing the new Google Forms style field types.",
  "durationMinutes": 15,
  "questions": [
    {
      "id": "q1",
      "text": "What is your primary role?",
      "type": "dropdown",
      "options": ["Developer", "Designer", "Manager", "Other"],
      "correctAnswer": "Developer",
      "category": "Demographics"
    },
    {
      "id": "q2",
      "text": "Which frameworks do you use?",
      "type": "checkbox",
      "options": ["React", "Vue", "Angular", "Svelte"],
      "correctAnswer": "[\\"React\\"]",
      "category": "Tech"
    },
    {
      "id": "q3",
      "text": "How satisfied are you with our service?",
      "type": "scale",
      "scaleMin": 1,
      "scaleMax": 5,
      "scaleMinLabel": "Not Satisfied",
      "scaleMaxLabel": "Very Satisfied",
      "correctAnswer": "5",
      "category": "Feedback"
    },
    {
      "id": "q4",
      "text": "Please provide any additional detailed feedback:",
      "type": "paragraph",
      "correctAnswer": "Feedback received.",
      "category": "Feedback"
    }
  ]
}`}
                </pre>
              </div>
            </div>

          </div>

          <div className="space-y-4">
            
            {/* Custom Quizzes */}
            <h3 className="text-lg font-semibold text-white">Your Custom Quizzes</h3>
            {customQuizzes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#121212]/30 p-12 text-center space-y-4 max-w-md mx-auto my-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-sans text-sm font-bold text-white">No Custom Quizzes</h4>
                  <p className="font-sans text-xs text-white/40 leading-relaxed">
                    You haven't imported any custom quizzes yet. Import a valid Quiz JSON file to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {customQuizzes.map(quiz => (
                  <div key={quiz.id} className="rounded-xl border border-white/10 bg-black/40 p-4 flex items-center justify-between group hover:border-white/20 transition-colors">
                    <div>
                      <h4 className="text-white font-medium">{quiz.title}</h4>
                      <p className="text-white/50 text-xs mt-1">{quiz.questions.length} questions • {quiz.durationMinutes} mins</p>
                    </div>
                    <div className="flex space-x-1 opacity-100 transition-opacity">
                      <button 
                        onClick={async () => {
                          if (token && spreadsheetId) {
                            try {
                              await saveQuizToSheets(token, spreadsheetId, quiz);
                            } catch (err) {
                              console.error('Failed to auto-sync quiz to sheets:', err);
                            }
                          }
                          const url = new URL(window.location.origin + window.location.pathname);
                          url.searchParams.set('quizId', quiz.id);
                          if (spreadsheetId) {
                            url.searchParams.set('spreadsheetId', spreadsheetId);
                          }
                          navigator.clipboard.writeText(url.toString());
                          alert('Synced with Google Sheets and copied direct link to clipboard!');
                        }}
                        className="p-2 text-white/50 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors cursor-pointer"
                        title="Copy Direct Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete the custom quiz "${quiz.title}"? This will delete it from local storage and sync this deletion to your Google Sheets.`)) {
                            handleDelete(quiz.id);
                          }
                        }}
                        className="p-2 text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Read Only Built-ins */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-white/70 mb-3">Built-in Quizzes (Read-only)</h3>
              <div className="space-y-2">
                {DEFAULT_QUIZZES.map(quiz => (
                  <div key={quiz.id} className="rounded-lg border border-white/5 bg-[#141414] p-3 flex items-center justify-between opacity-70 hover:opacity-100 group transition-opacity">
                    <div>
                      <h4 className="text-white/80 text-sm font-medium">{quiz.title}</h4>
                    </div>
                    <button 
                      onClick={async () => {
                        if (token && spreadsheetId) {
                          try {
                            await saveQuizToSheets(token, spreadsheetId, quiz);
                          } catch (err) {
                            console.error('Failed to auto-sync quiz to sheets:', err);
                          }
                        }
                        const url = new URL(window.location.origin + window.location.pathname);
                        url.searchParams.set('quizId', quiz.id);
                        if (spreadsheetId) {
                          url.searchParams.set('spreadsheetId', spreadsheetId);
                        }
                        navigator.clipboard.writeText(url.toString());
                        alert('Copied direct link to clipboard!');
                      }}
                      className="p-1.5 text-white/50 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors cursor-pointer opacity-100"
                      title="Copy Direct Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
