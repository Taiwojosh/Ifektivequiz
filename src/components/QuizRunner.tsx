/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Check, 
  RefreshCw,
  Award,
  User as UserIcon,
  ChevronLeft,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { getAllQuizzes } from '../quizzes';
import { Quiz, QuizResponse, QuizSession, SheetScoreRow, SheetResponseRow, CandidateResponse, PendingSubmission } from '../types';
import { saveLocalScore, saveLocalResponses, savePendingSubmission } from '../utils/localStorageDb';
import { appendScoreRow, appendResponseRows } from '../sheets';

interface QuizRunnerProps {
  onResultsSubmitted: () => void;
  token?: string | null;
  spreadsheetId?: string | null;
}

export default function QuizRunner({
  onResultsSubmitted,
  token,
  spreadsheetId,
}: QuizRunnerProps) {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isQuizRunning, setIsQuizRunning] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  
  // Name configuration states
  const [candidateName, setCandidateName] = useState<string>(() => {
    return localStorage.getItem('eduquery_candidate_name') || '';
  });
  const [nameInput, setNameInput] = useState('');
  const [isChangingName, setIsChangingName] = useState(false);
  const [quizPendingStart, setQuizPendingStart] = useState<Quiz | null>(null);
  const [directLinkQuizId, setDirectLinkQuizId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qid = params.get('quizId');
    if (qid) {
      setDirectLinkQuizId(qid);
      const quiz = getAllQuizzes().find(q => q.id === qid);
      if (quiz) {
        setNameInput(localStorage.getItem('eduquery_candidate_name') || '');
        setQuizPendingStart(quiz);
      }
    }
  }, []);

  // Results view states
  const [sessionResults, setSessionResults] = useState<QuizSession | null>(null);
  const [justSubmittedPending, setJustSubmittedPending] = useState<PendingSubmission | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsCounterRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Timer
  useEffect(() => {
    if (isQuizRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isQuizRunning && timeLeft === 0) {
      handleCompleteQuiz();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isQuizRunning, timeLeft]);

  // Sync Total Seconds taken
  useEffect(() => {
    if (isQuizRunning) {
      secondsCounterRef.current = setInterval(() => {
        setTimeTakenSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (secondsCounterRef.current) clearInterval(secondsCounterRef.current);
    }

    return () => {
      if (secondsCounterRef.current) clearInterval(secondsCounterRef.current);
    };
  }, [isQuizRunning]);

  const handleStartQuiz = (quiz: Quiz, nameOverride?: string) => {
    const activeName = nameOverride !== undefined ? nameOverride : candidateName;
    if (!activeName.trim()) {
      setQuizPendingStart(quiz);
      setNameInput('');
      return;
    }

    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeLeft(quiz.durationMinutes * 60);
    setTimeTakenSeconds(0);
    setSessionResults(null);
    setJustSubmittedPending(null);
    setSubmitSuccess(null);
    setIsQuizRunning(true);
  };

  const handleSaveNameAndStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const trimmedName = nameInput.trim();
    localStorage.setItem('eduquery_candidate_name', trimmedName);
    setCandidateName(trimmedName);

    const targetQuiz = quizPendingStart;
    setQuizPendingStart(null);
    if (targetQuiz) {
      handleStartQuiz(targetQuiz, trimmedName);
    }
  };

  const handleSelectMCQ = (questionId: string, option: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleShortAnswerChange = (questionId: string, val: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleNext = () => {
    if (!selectedQuiz) return;
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleCompleteQuiz();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleCompleteQuiz = async () => {
    if (!selectedQuiz) return;
    setIsQuizRunning(false);
    setIsSubmitting(true);
    setSubmitError(null);

    const candidateResponses: CandidateResponse[] = selectedQuiz.questions.map((question) => {
      const uAnswer = (userAnswers[question.id] || '').trim();
      return {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        category: question.category,
        userAnswer: uAnswer || '[Skipped]',
        correctAnswer: question.correctAnswer,
        isCorrect: question.type === 'mcq'
          ? uAnswer === question.correctAnswer
          : uAnswer.toLowerCase() === question.correctAnswer.toLowerCase()
      };
    });

    const emailPrefix = (candidateName || 'anonymous').toLowerCase().replace(/\s+/g, '');
    const userEmail = `${emailPrefix}@eduquery.internal`;
    const timestamp = new Date().toISOString();

    const needsManualGrading = selectedQuiz.questions.some(q => (q as any).type === 'essay');

    if (needsManualGrading) {
      const pendingSubmission: PendingSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        quizId: selectedQuiz.id,
        quizTitle: selectedQuiz.title,
        userName: candidateName || 'Anonymous Candidate',
        userEmail,
        responses: candidateResponses,
        timeTakenSeconds,
        timestamp,
        status: 'pending'
      };

      savePendingSubmission(pendingSubmission);
      setJustSubmittedPending(pendingSubmission);
      setSubmitSuccess(true);
      setIsSubmitting(false);
      onResultsSubmitted();
    } else {
      try {
        let correctCount = 0;
        candidateResponses.forEach(r => {
          if (r.isCorrect) correctCount++;
        });
        const totalQuestions = selectedQuiz.questions.length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);

        const scoreRow: SheetScoreRow = {
          timestamp,
          userName: candidateName || 'Anonymous Candidate',
          userEmail,
          score: correctCount,
          totalQuestions,
          percentage,
          timeTakenSeconds
        };

        const responseRows: SheetResponseRow[] = candidateResponses.map((resp, idx) => ({
          timestamp,
          userEmail,
          questionIndex: idx + 1,
          questionText: resp.questionText,
          type: resp.questionType,
          userAnswer: resp.userAnswer,
          correctAnswer: resp.correctAnswer,
          isCorrect: resp.isCorrect,
          category: resp.category
        }));

        if (token && spreadsheetId) {
          try {
            await appendScoreRow(token, spreadsheetId, scoreRow);
            await appendResponseRows(token, spreadsheetId, responseRows);
          } catch (err: any) {
            console.error('Failed to sync to Google Sheets:', err);
            setSubmitError(`Results saved locally, but failed to sync with Google Sheets: ${err?.message || err}.`);
          }
        }

        saveLocalScore(scoreRow);
        saveLocalResponses(responseRows);

        setSessionResults({
          quizId: selectedQuiz.id,
          userName: candidateName || 'Anonymous Candidate',
          score: correctCount,
          totalQuestions,
          timeTakenSeconds
        });
        setSubmitSuccess(true);
      } catch (err: any) {
        console.error(err);
        setSubmitError(err?.message || 'An error occurred while saving the grade.');
      } finally {
        setIsSubmitting(false);
        onResultsSubmitted();
      }
    }
  };

  // Human-readable time converter
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendering logic
  if (isSubmitting) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 flex flex-col items-center justify-center min-h-[50vh] text-white/50 space-y-6">
        <div className="h-12 w-12 rounded-full border-4 border-white/10 border-t-white animate-spin"></div>
        <p className="font-serif italic text-xl text-white">Grading & Publishing your results...</p>
        <span className="font-mono text-xs uppercase tracking-wider text-white/40">Please wait</span>
      </div>
    );
  }

  if (isQuizRunning && selectedQuiz) {
    const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === selectedQuiz.questions.length - 1;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100);

    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        
        {/* Quiz Runner Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-white/40">ACTIVELY RUNNING</span>
            <h3 className="font-serif italic text-xl text-white leading-tight">{selectedQuiz.title}</h3>
          </div>
          <div className="flex items-center space-x-2 rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 text-white font-mono text-sm font-semibold shadow-sm">
            <Clock className="h-4 w-4 shrink-0 animate-pulse text-white/70" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between font-mono text-xs text-white/40 mb-1.5">
            <span>Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Panel */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 p-4 font-mono text-[100px] font-black text-white/5 leading-none select-none pointer-events-none">
            {currentQuestionIndex + 1}
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[9px] font-bold text-white/40">
                <span>{currentQuestion.category.toUpperCase()}</span>
              </span>
              <span className="font-mono text-[10px] text-white/40">
                {currentQuestion.type === 'mcq' ? 'MULTIPLE CHOICE' : 'SHORT ANSWER'}
              </span>
            </div>

            <h4 className="font-sans text-lg font-medium text-white leading-snug">
              {currentQuestion.text}
            </h4>

            {/* Answer Inputs */}
            {currentQuestion.type === 'mcq' ? (
              <div className="space-y-3 pt-2">
                {currentQuestion.options?.map((option, idx) => {
                  const isSelected = userAnswers[currentQuestion.id] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectMCQ(currentQuestion.id, option)}
                      className={`w-full flex items-center justify-between rounded-xl border p-4 font-sans text-sm font-semibold transition-all cursor-pointer text-left ${
                        isSelected 
                          ? 'border-white bg-white text-black' 
                          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{option}</span>
                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-black bg-black' : 'border-white/30'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Type your answer here..."
                  value={userAnswers[currentQuestion.id] || ''}
                  onChange={(e) => handleShortAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Nav Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-[#111] px-5 py-2.5 font-sans text-xs font-bold text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center space-x-1.5 rounded-xl bg-white px-5 py-2.5 font-sans text-xs font-bold text-black hover:bg-white/90 shadow-sm cursor-pointer"
          >
            <span>{isLastQuestion ? 'Submit & Grade' : 'Next Question'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    );
  }

  // Score review results screen (if graded or used otherwise)
  if (justSubmittedPending && selectedQuiz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 animate-in fade-in duration-300">
        
        {/* Submitted Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
            <Clock className="h-8 w-8 animate-pulse text-amber-400" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-amber-400">SUBMISSION RECEIVED</span>
            <h2 className="font-serif italic text-3xl text-white">Pending Admin Grading</h2>
            <p className="font-sans text-xs text-white/50">
              Candidate: <span className="font-bold text-white">{justSubmittedPending.userName}</span>
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 mb-8">
          <p className="font-sans text-xs text-amber-300/90 leading-relaxed text-center">
            Your quiz has been successfully submitted to the system queue. 
            Because <strong>scores are determined by the administrator</strong>, your graded score and performance analysis will be posted to the Leaderboard once the administrator reviews and grades your short-answer and multiple-choice responses.
          </p>
        </div>

        {/* Detailed Submitted Answers Review */}
        <div className="space-y-6">
          <h4 className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Submitted Answers Review</h4>

          {justSubmittedPending.responses.map((resp, idx) => {
            return (
              <div key={resp.questionId} className="rounded-2xl border border-white/5 bg-[#141414] p-5 space-y-4 shadow-sm">
                
                {/* Header status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-white/40">QUESTION {idx + 1}</span>
                  <span className="inline-flex items-center rounded bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-white/50 uppercase">
                    {resp.questionType === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                  </span>
                </div>

                {/* Question */}
                <p className="font-sans text-sm font-medium text-white leading-snug">{resp.questionText}</p>

                {/* Answer Submitted */}
                <div className="rounded-xl p-3.5 bg-white/5 border border-white/10 text-white/90 text-xs">
                  <span className="font-mono text-[9px] uppercase font-bold text-white/40 block mb-1">Your Submitted Answer</span>
                  <span className="font-sans font-semibold break-all">{resp.userAnswer}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Return Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => {
              setJustSubmittedPending(null);
              setSelectedQuiz(null);
            }}
            className="flex items-center space-x-1.5 rounded-xl bg-white px-6 py-2.5 font-sans text-xs font-bold text-black hover:bg-white/90 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{directLinkQuizId ? 'Close Results' : 'Return to Quiz Hub'}</span>
          </button>
        </div>

      </div>
    );
  }

  // Score review results screen
  if (sessionResults && selectedQuiz) {
    const scorePercent = Math.round((sessionResults.score / sessionResults.totalQuestions) * 100);
    
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        
        {/* Session Results Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 border border-white/10 text-white mb-2">
            <Award className="h-8 w-8 text-white/95" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">GRADES GENERATED</span>
            <h2 className="font-serif italic text-3xl text-white">Quiz Results Overview</h2>
            <p className="font-sans text-xs text-white/50">
              Candidate: <span className="font-bold text-white">{sessionResults.userName}</span>
            </p>
          </div>
        </div>

        {submitError && (
          <div className="flex items-start space-x-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 font-sans text-xs text-amber-400 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Dashboard Results Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-5 flex flex-col justify-between">
            <span className="font-mono text-[9px] uppercase font-bold text-white/40">Total Score</span>
            <div className="flex items-baseline space-x-1.5 mt-3">
              <span className="font-serif italic text-3xl text-white font-black">{sessionResults.score}</span>
              <span className="font-sans text-sm text-white/40">/ {sessionResults.totalQuestions}</span>
            </div>
            <span className="font-sans text-[10px] text-white/50 mt-1">Questions correctly answered</span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#141414] p-5 flex flex-col justify-between">
            <span className="font-mono text-[9px] uppercase font-bold text-white/40">Grade Percentage</span>
            <div className="flex items-baseline space-x-1 mt-3">
              <span className="font-serif italic text-3xl text-white font-black">{scorePercent}%</span>
            </div>
            <span className={`font-sans text-[10px] mt-1 font-semibold ${
              scorePercent >= 80 ? 'text-emerald-400' : scorePercent >= 50 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {scorePercent >= 80 ? 'Distinguished Master' : scorePercent >= 50 ? 'Passing Mark Met' : 'Requires Review'}
            </span>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#141414] p-5 flex flex-col justify-between">
            <span className="font-mono text-[9px] uppercase font-bold text-white/40">Time Taken</span>
            <div className="flex items-baseline space-x-1 mt-3">
              <span className="font-serif italic text-3xl text-white font-black">{formatTime(sessionResults.timeTakenSeconds)}</span>
            </div>
            <span className="font-sans text-[10px] text-white/50 mt-1">Total countdown duration spent</span>
          </div>

        </div>

        {/* Database syncing status */}
        <div className="rounded-2xl border border-white/5 bg-[#121212] p-4 mb-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="font-sans text-xs font-bold text-white block">Saved to Local Leaderboard</span>
              <span className="font-sans text-[10px] text-white/50 leading-tight block">Your scores and analysis have been persisted successfully in this browser.</span>
            </div>
          </div>
        </div>

        {/* Detailed Explanations / Questions Review */}
        <div className="space-y-6">
          <h4 className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Detailed Questions Review</h4>

          {selectedQuiz.questions.map((q, idx) => {
            const resp = sessionResults.responses[idx];
            return (
              <div key={q.id} className="rounded-2xl border border-white/5 bg-[#141414] p-5 space-y-4 shadow-sm">
                
                {/* Header status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-white/40">QUESTION {idx + 1}</span>
                  <div className={`flex items-center space-x-1 font-sans text-xs font-semibold ${
                    resp.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {resp.isCorrect ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        <span>Incorrect</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Question */}
                <p className="font-sans text-sm font-medium text-white leading-snug">{q.text}</p>

                {/* Answers Comparison */}
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className={`rounded-xl p-3 border ${
                    resp.isCorrect ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
                  }`}>
                    <span className="font-mono text-[9px] uppercase font-bold text-white/40 block mb-1">Your Answer</span>
                    <span className="font-sans font-semibold break-all">{resp.userAnswer}</span>
                  </div>

                  <div className="rounded-xl p-3 bg-white/5 border border-white/10 text-white">
                    <span className="font-mono text-[9px] uppercase font-bold text-white/40 block mb-1">Correct Answer</span>
                    <span className="font-sans font-semibold break-all">{resp.correctAnswer}</span>
                  </div>
                </div>

                {/* Explanatory text */}
                {q.explanation && (
                  <div className="rounded-xl bg-[#181818] p-3.5 border border-white/5 font-sans text-xs text-white/60 leading-relaxed">
                    <span className="font-sans font-bold text-white block mb-1">Why this is correct:</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Retry / Return Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => {
              setSessionResults(null);
              setSelectedQuiz(null);
            }}
            className="flex items-center space-x-1.5 rounded-xl border border-white/20 bg-transparent px-6 py-2.5 font-sans text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{directLinkQuizId ? 'Close Results' : 'Select Another Quiz'}</span>
          </button>
        </div>

      </div>
    );
  }

  // Candidate Name registration gate / Lobby Name setup
  if (quizPendingStart) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-[#141414] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <UserIcon className="w-32 h-32" />
          </div>

          <div className="flex flex-col items-center text-center space-y-4 mb-6 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
              <UserIcon className="h-5 w-5 text-white/90" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif italic text-lg text-white">Identity Registration</h3>
              <p className="font-sans text-xs text-white/40">
                Please enter your full name before attempting <span className="font-bold text-white">"{quizPendingStart.title}"</span>.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveNameAndStart} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 font-mono">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-sans text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-0"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setQuizPendingStart(null)}
                className="w-1/2 flex items-center justify-center rounded-xl border border-white/10 bg-transparent py-2.5 font-sans text-xs font-semibold text-white/80 hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 flex items-center justify-center rounded-xl bg-white py-2.5 font-sans text-xs font-semibold text-black hover:bg-white/90 transition-all cursor-pointer shadow-sm"
              >
                Begin Session
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Selection list screen
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Candidate Name Indicator */}
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#121212]/50 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white">
            <UserIcon className="h-5 w-5 text-white/80" />
          </div>
          <div>
            {candidateName ? (
              <>
                <span className="font-sans text-xs text-white/40 block leading-none font-semibold">TAKING QUIZZES AS</span>
                <span className="font-sans text-sm font-bold text-white leading-tight">{candidateName}</span>
              </>
            ) : (
              <>
                <span className="font-sans text-xs text-white/40 block leading-none">CANDIDATE IDENTITY</span>
                <span className="font-sans text-xs italic text-amber-300">Identity required to save scores</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {candidateName && !isChangingName ? (
            <button
              onClick={() => {
                setNameInput(candidateName);
                setIsChangingName(true);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 font-sans text-[11px] font-semibold text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Change Name
            </button>
          ) : isChangingName ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (nameInput.trim()) {
                  localStorage.setItem('eduquery_candidate_name', nameInput.trim());
                  setCandidateName(nameInput.trim());
                  setIsChangingName(false);
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Enter name"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#1A1A1A] px-3 py-1 text-xs text-white focus:outline-none w-36"
              />
              <button
                type="submit"
                className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90 cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsChangingName(false)}
                className="text-xs text-white/40 hover:text-white/80 px-1.5 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setNameInput('');
                setIsChangingName(true);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 font-sans text-[11px] font-semibold text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Register Candidate Name
            </button>
          )}
        </div>
      </div>

      {/* Quiz Dashboard Header */}
      {!directLinkQuizId ? (
        <div className="text-center mb-10">
          <h2 className="font-serif italic text-3xl text-white">Ready for a challenge?</h2>
          <p className="mt-2 font-sans text-sm text-white/40 max-w-md mx-auto">
            Test your skills across Frontend Core and Web Engineering modules. Compete live on the interactive leaderboard.
          </p>
        </div>
      ) : (
        <div className="text-center mb-10">
          <h2 className="font-serif italic text-3xl text-white">You've been invited</h2>
          <p className="mt-2 font-sans text-sm text-white/40 max-w-md mx-auto">
            Please register your candidate identity and begin the session when ready.
          </p>
        </div>
      )}

      {/* Quizzes Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {getAllQuizzes()
          .filter((quiz) => (directLinkQuizId ? quiz.id === directLinkQuizId : true))
          .map((quiz) => {
          return (
            <div 
              key={quiz.id} 
              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#141414] p-6 shadow-sm hover:border-white/15 hover:shadow-lg transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center space-x-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[9px] font-bold text-white/40">
                    <Clock className="h-3 w-3" />
                    <span>{quiz.durationMinutes} Minutes</span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = new URL(window.location.origin + window.location.pathname);
                      url.searchParams.set('quizId', quiz.id);
                      navigator.clipboard.writeText(url.toString());
                      alert('Copied direct quiz link to clipboard!');
                    }}
                    className="flex items-center space-x-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                    title="Copy Share Link"
                  >
                    <ExternalLink className="h-3 w-3 text-indigo-400" />
                    <span>Share Link</span>
                  </button>
                </div>
                
                <h3 className="font-serif italic text-lg text-white leading-tight">{quiz.title}</h3>
                <p className="font-sans text-xs text-white/60 leading-relaxed">{quiz.description}</p>
              </div>

              <button
                onClick={() => handleStartQuiz(quiz)}
                className="flex items-center justify-center space-x-2 mt-6 w-full rounded-xl bg-white px-4 py-2.5 font-sans text-xs font-semibold text-black hover:bg-white/90 shadow-sm transition-all cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Begin Quiz Session</span>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
