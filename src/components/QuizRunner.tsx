/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  AlertTriangle, 
  Check, 
  RefreshCw,
  Award,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_QUIZZES, getAllQuizzes } from '../quizzes';
import { Quiz, Question, QuizResponse, QuizSession, SheetScoreRow, SheetResponseRow } from '../types';
import { appendScoreRow, appendResponseRows } from '../sheets';

interface QuizRunnerProps {
  user: User | null;
  token: string | null;
  spreadsheetId: string | null;
  onLogin: () => void;
  onResultsSubmitted: () => void;
}

export default function QuizRunner({
  user,
  token,
  spreadsheetId,
  onLogin,
  onResultsSubmitted,
}: QuizRunnerProps) {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isQuizRunning, setIsQuizRunning] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  
  // Results view states
  const [sessionResults, setSessionResults] = useState<QuizSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);
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

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeLeft(quiz.durationMinutes * 60);
    setTimeTakenSeconds(0);
    setSessionResults(null);
    setSubmitSuccess(null);
    setSubmitError(null);
    setIsQuizRunning(true);
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

    // Calculate details and scores
    let totalCorrect = 0;
    const responses: QuizResponse[] = selectedQuiz.questions.map((question) => {
      const uAnswer = (userAnswers[question.id] || '').trim();
      const isCorrect = question.type === 'mcq'
        ? uAnswer === question.correctAnswer
        : uAnswer.toLowerCase() === question.correctAnswer.toLowerCase();

      if (isCorrect) totalCorrect++;

      return {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        category: question.category,
        userAnswer: uAnswer || '[Skipped]',
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeSpentSeconds: Math.floor(timeTakenSeconds / selectedQuiz.questions.length), // approximate
      };
    });

    const finalSession: QuizSession = {
      quizId: selectedQuiz.id,
      quizTitle: selectedQuiz.title,
      userName: user?.displayName || 'Anonymous Candidate',
      userEmail: user?.email || 'anonymous@eduquery.internal',
      responses,
      score: totalCorrect,
      totalQuestions: selectedQuiz.questions.length,
      timeTakenSeconds,
      timestamp: new Date().toISOString(),
    };

    setSessionResults(finalSession);
    await uploadResultsToSheets(finalSession);
  };

  const uploadResultsToSheets = async (session: QuizSession) => {
    if (!token || !spreadsheetId) {
      setSubmitSuccess(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const percentage = Math.round((session.score / session.totalQuestions) * 100);
      
      const scoreRow: SheetScoreRow = {
        timestamp: session.timestamp,
        userName: session.userName,
        userEmail: session.userEmail,
        score: session.score,
        totalQuestions: session.totalQuestions,
        percentage,
        timeTakenSeconds: session.timeTakenSeconds,
      };

      const responseRows: SheetResponseRow[] = session.responses.map((resp, idx) => ({
        timestamp: session.timestamp,
        userEmail: session.userEmail,
        questionIndex: idx + 1,
        questionText: resp.questionText,
        type: resp.questionType,
        userAnswer: resp.userAnswer,
        correctAnswer: resp.correctAnswer,
        isCorrect: resp.isCorrect,
        category: resp.category,
      }));

      // Mutates remote Sheets (Google Sheet database)
      await appendScoreRow(token, spreadsheetId, scoreRow);
      await appendResponseRows(token, spreadsheetId, responseRows);

      setSubmitSuccess(true);
      onResultsSubmitted(); // trigger reload on leaderboard/analytics in parent state
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message || 'Failed to submit results. Please double-check Sheets connection.');
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Human-readable time converter
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendering logic
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
            ></div>
          </div>
        </div>

        {/* Question Panel */}
        <div className="rounded-2xl border border-white/5 bg-[#141414] p-6 sm:p-8 shadow-sm">
          <span className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[9px] font-bold text-white/50 uppercase tracking-wide mb-3">
            {currentQuestion.category} • {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
          </span>
          <h4 className="font-sans text-base sm:text-lg font-medium text-white mb-6 leading-snug">
            {currentQuestion.text}
          </h4>

          {/* Answer Form */}
          {currentQuestion.type === 'mcq' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, idx) => {
                const isSelected = userAnswers[currentQuestion.id] === option;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectMCQ(currentQuestion.id, option)}
                    className={`flex items-center justify-between w-full rounded-xl border p-4 text-left transition-all hover:bg-white/5 cursor-pointer ${
                      isSelected 
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-sm' 
                        : 'border-white/5 bg-[#181818] text-white/80'
                    }`}
                  >
                    <span className="font-sans text-sm">{option}</span>
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? 'border-emerald-500 bg-emerald-500 text-[#0A0A0A]' : 'border-white/20'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase font-semibold text-white/40">Your Answer</label>
              <input
                type="text"
                autoComplete="off"
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => handleShortAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your exact response here..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 font-sans text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-0"
              />
            </div>
          )}
        </div>

        {/* Question Controls */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-sans text-xs font-medium text-white/60 hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            className="flex items-center space-x-1.5 rounded-xl bg-white px-6 py-2.5 font-sans text-xs font-semibold text-black hover:bg-white/90 shadow-sm transition-all cursor-pointer"
          >
            <span>{isLastQuestion ? 'Finish Quiz' : 'Next Question'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    );
  }

  // Results & Detailed Explanations
  if (sessionResults) {
    const percentage = Math.round((sessionResults.score / sessionResults.totalQuestions) * 100);
    const scoreMessage = percentage >= 80 
      ? "Superb! You demonstrated advanced frontend mastery." 
      : percentage >= 50 
        ? "Good job! You have a solid grasp but have room to grow." 
        : "Keep studying! Review the concepts and explanations below.";

    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        
        {/* Score Hero Card */}
        <div className="rounded-3xl border border-white/5 bg-[#141414] p-8 text-center shadow-sm space-y-6 mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white">
            <Award className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-serif italic text-2xl text-white">Quiz Completed!</h3>
            <p className="mt-1 font-sans text-sm text-white/60">{scoreMessage}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-4 border-t border-white/10">
            <div className="text-center">
              <span className="block font-sans text-2xl font-light text-white">{percentage}%</span>
              <span className="font-mono text-[9px] uppercase font-bold text-white/40">Score</span>
            </div>
            <div className="text-center border-x border-white/10">
              <span className="block font-sans text-2xl font-light text-white">{sessionResults.score}/{sessionResults.totalQuestions}</span>
              <span className="font-mono text-[9px] uppercase font-bold text-white/40">Correct</span>
            </div>
            <div className="text-center">
              <span className="block font-sans text-2xl font-light text-white">{formatTime(sessionResults.timeTakenSeconds)}</span>
              <span className="font-mono text-[9px] uppercase font-bold text-white/40">Time taken</span>
            </div>
          </div>

          {/* Sheet Upload Alert */}
          <div className="pt-2">
            {isSubmitting ? (
              <div className="inline-flex items-center space-x-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 font-sans text-xs text-white/60">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white/40" />
                <span>Syncing score to Google Sheets...</span>
              </div>
            ) : submitSuccess ? (
              <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 font-sans text-xs text-emerald-400">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Synced to Google Sheet Database!</span>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 font-sans text-xs text-amber-300 max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center space-x-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-amber-200">Google Sheets Connection Status</span>
                </div>
                <p className="text-amber-300/80 leading-relaxed">
                  {submitError || "Connect sheets database in the 'DB Config' tab to record and share scores with other developers and access advanced leaderboards."}
                </p>
                {!token && (
                  <button
                    onClick={onLogin}
                    className="mt-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold px-3 py-1 font-sans text-[11px] transition-all"
                  >
                    Sign In with Google
                  </button>
                )}
              </div>
            )}
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
            onClick={() => setSelectedQuiz(null)}
            className="flex items-center space-x-1.5 rounded-xl border border-white/20 bg-transparent px-6 py-2.5 font-sans text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Select Another Quiz</span>
          </button>
        </div>

      </div>
    );
  }

  // Selection list screen
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Quiz Dashboard Header */}
      <div className="text-center mb-10">
        <h2 className="font-serif italic text-3xl text-white">Ready for a challenge?</h2>
        <p className="mt-2 font-sans text-sm text-white/40 max-w-md mx-auto">
          Test your skills across Frontend Core and Web Engineering modules. Compete live on the interactive leaderboard.
        </p>
      </div>

      {/* Quizzes Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {getAllQuizzes().map((quiz) => {
          return (
            <div 
              key={quiz.id} 
              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#141414] p-6 shadow-sm hover:border-white/15 hover:shadow-lg transition-all duration-300"
            >
              <div className="space-y-3">
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[9px] font-bold text-white/40">
                  <Clock className="h-3 w-3" />
                  <span>{quiz.durationMinutes} Minutes</span>
                </span>
                
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
