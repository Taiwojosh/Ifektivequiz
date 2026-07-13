/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'short' | 'checkbox' | 'paragraph' | 'dropdown' | 'scale' | 'essay';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  correctAnswer: string;
  category: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  questions: Question[];
}

export interface QuizResponse {
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'short' | 'checkbox' | 'paragraph' | 'dropdown' | 'scale' | 'essay';
  category: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface QuizSession {
  quizId: string;
  quizTitle: string;
  userName: string;
  userEmail: string;
  responses: QuizResponse[];
  score: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  timestamp: string;
}

export interface SheetScoreRow {
  timestamp: string;
  userName: string;
  userEmail: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
}

export interface SheetResponseRow {
  timestamp: string;
  userEmail: string;
  questionIndex: number;
  questionText: string;
  type: 'mcq' | 'short' | 'checkbox' | 'paragraph' | 'dropdown' | 'scale' | 'essay';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  category: string;
}

export interface CandidateResponse {
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'short' | 'checkbox' | 'paragraph' | 'dropdown' | 'scale' | 'essay';
  category: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect?: boolean; // determined by admin
}

export interface PendingSubmission {
  id: string; // unique ID
  quizId: string;
  quizTitle: string;
  userName: string;
  userEmail: string;
  responses: CandidateResponse[];
  timeTakenSeconds: number;
  timestamp: string;
  status: 'pending' | 'graded';
}

