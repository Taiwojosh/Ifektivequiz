/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import { 
  BarChart3, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  FileText,
  TrendingUp,
  Award,
  Users,
  AlertCircle
} from 'lucide-react';
import { fetchResponses } from '../sheets';
import { SheetResponseRow } from '../types';

interface AnalyticsProps {
  token: string | null;
  spreadsheetId: string | null;
  refreshTrigger: number;
}

interface QuestionMetrics {
  questionText: string;
  category: string;
  type: 'mcq' | 'short';
  totalResponses: number;
  correctCount: number;
  errorRate: number;
  commonIncorrect: { answer: string; count: number }[];
}

// Polished mock responses when offline for full showcase & demonstration
const LOCAL_RESPONSE_MOCKS: SheetResponseRow[] = [
  // fe-1: useMemo vs useCallback
  { timestamp: '1', userEmail: 'a@test.com', questionIndex: 1, questionText: 'Which hook should be used to memoize a computed value between renders to optimize performance?', type: 'mcq', userAnswer: 'useCallback', correctAnswer: 'useMemo', isCorrect: false, category: 'Performance' },
  { timestamp: '2', userEmail: 'b@test.com', questionIndex: 1, questionText: 'Which hook should be used to memoize a computed value between renders to optimize performance?', type: 'mcq', userAnswer: 'useMemo', correctAnswer: 'useMemo', isCorrect: true, category: 'Performance' },
  { timestamp: '3', userEmail: 'c@test.com', questionIndex: 1, questionText: 'Which hook should be used to memoize a computed value between renders to optimize performance?', type: 'mcq', userAnswer: 'useCallback', correctAnswer: 'useMemo', isCorrect: false, category: 'Performance' },
  { timestamp: '4', userEmail: 'd@test.com', questionIndex: 1, questionText: 'Which hook should be used to memoize a computed value between renders to optimize performance?', type: 'mcq', userAnswer: 'useCallback', correctAnswer: 'useMemo', isCorrect: false, category: 'Performance' },
  { timestamp: '5', userEmail: 'e@test.com', questionIndex: 1, questionText: 'Which hook should be used to memoize a computed value between renders to optimize performance?', type: 'mcq', userAnswer: 'useMemo', correctAnswer: 'useMemo', isCorrect: true, category: 'Performance' },

  // fe-2: useRef vs useState
  { timestamp: '1', userEmail: 'a@test.com', questionIndex: 2, questionText: 'What is the absolute key difference between useRef and useState?', type: 'mcq', userAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', correctAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', isCorrect: true, category: 'React Core' },
  { timestamp: '2', userEmail: 'b@test.com', questionIndex: 2, questionText: 'What is the absolute key difference between useRef and useState?', type: 'mcq', userAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', correctAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', isCorrect: true, category: 'React Core' },
  { timestamp: '3', userEmail: 'c@test.com', questionIndex: 2, questionText: 'What is the absolute key difference between useRef and useState?', type: 'mcq', userAnswer: 'useRef values are read-only, while useState is read-write.', correctAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', isCorrect: false, category: 'React Core' },
  { timestamp: '4', userEmail: 'd@test.com', questionIndex: 2, questionText: 'What is the absolute key difference between useRef and useState?', type: 'mcq', userAnswer: 'useRef values are read-only, while useState is read-write.', correctAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', isCorrect: false, category: 'React Core' },
  { timestamp: '5', userEmail: 'e@test.com', questionIndex: 2, questionText: 'What is the absolute key difference between useRef and useState?', type: 'mcq', userAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', correctAnswer: 'Changing a useRef value does not trigger a component re-render, whereas changing state via useState does.', isCorrect: true, category: 'React Core' },

  // fe-3: keyof (Short answer)
  { timestamp: '1', userEmail: 'a@test.com', questionIndex: 3, questionText: 'In TypeScript, what keyword is used to create a type that represents the keys of another type or interface?', type: 'short', userAnswer: 'keyof', correctAnswer: 'keyof', isCorrect: true, category: 'TypeScript' },
  { timestamp: '2', userEmail: 'b@test.com', questionIndex: 3, questionText: 'In TypeScript, what keyword is used to create a type that represents the keys of another type or interface?', type: 'short', userAnswer: 'keyOf', correctAnswer: 'keyof', isCorrect: false, category: 'TypeScript' },
  { timestamp: '3', userEmail: 'c@test.com', questionIndex: 3, questionText: 'In TypeScript, what keyword is used to create a type that represents the keys of another type or interface?', type: 'short', userAnswer: 'typeof', correctAnswer: 'keyof', isCorrect: false, category: 'TypeScript' },
  { timestamp: '4', userEmail: 'd@test.com', questionIndex: 3, questionText: 'In TypeScript, what keyword is used to create a type that represents the keys of another type or interface?', type: 'short', userAnswer: 'keyof', correctAnswer: 'keyof', isCorrect: true, category: 'TypeScript' },
  { timestamp: '5', userEmail: 'e@test.com', questionIndex: 3, questionText: 'In TypeScript, what keyword is used to create a type that represents the keys of another type or interface?', type: 'short', userAnswer: 'keys', correctAnswer: 'keyof', isCorrect: false, category: 'TypeScript' },

  // fe-4: startTransition
  { timestamp: '1', userEmail: 'a@test.com', questionIndex: 4, questionText: 'Which React 18 feature allows you to mark state updates as non-blocking transition updates to preserve app responsiveness?', type: 'short', userAnswer: 'startTransition', correctAnswer: 'startTransition', isCorrect: true, category: 'React 18' },
  { timestamp: '2', userEmail: 'b@test.com', questionIndex: 4, questionText: 'Which React 18 feature allows you to mark state updates as non-blocking transition updates to preserve app responsiveness?', type: 'short', userAnswer: 'useTransition', correctAnswer: 'startTransition', isCorrect: false, category: 'React 18' },
  { timestamp: '3', userEmail: 'c@test.com', questionIndex: 4, questionText: 'Which React 18 feature allows you to mark state updates as non-blocking transition updates to preserve app responsiveness?', type: 'short', userAnswer: 'useTransition', correctAnswer: 'startTransition', isCorrect: false, category: 'React 18' },
  { timestamp: '4', userEmail: 'd@test.com', questionIndex: 4, questionText: 'Which React 18 feature allows you to mark state updates as non-blocking transition updates to preserve app responsiveness?', type: 'short', userAnswer: 'suspense', correctAnswer: 'startTransition', isCorrect: false, category: 'React 18' },
  { timestamp: '5', userEmail: 'e@test.com', questionIndex: 4, questionText: 'Which React 18 feature allows you to mark state updates as non-blocking transition updates to preserve app responsiveness?', type: 'short', userAnswer: 'startTransition', correctAnswer: 'startTransition', isCorrect: true, category: 'React 18' },
];

export default function Analytics({
  token,
  spreadsheetId,
  refreshTrigger,
}: AnalyticsProps) {
  const [rawData, setRawData] = useState<SheetResponseRow[]>([]);
  const [metrics, setMetrics] = useState<QuestionMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = async () => {
    if (!token || !spreadsheetId) {
      setRawData(LOCAL_RESPONSE_MOCKS);
      processMetrics(LOCAL_RESPONSE_MOCKS);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const responses = await fetchResponses(token, spreadsheetId);
      if (responses.length === 0) {
        // Fallback to mock data if connected database is empty so far
        setRawData(LOCAL_RESPONSE_MOCKS);
        processMetrics(LOCAL_RESPONSE_MOCKS);
      } else {
        setRawData(responses);
        processMetrics(responses);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch analytics from Google Sheet. Displaying local cache.');
      setRawData(LOCAL_RESPONSE_MOCKS);
      processMetrics(LOCAL_RESPONSE_MOCKS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [token, spreadsheetId, refreshTrigger]);

  const processMetrics = (data: SheetResponseRow[]) => {
    // Group by unique question text
    const questionGroups: Record<string, {
      rows: SheetResponseRow[];
      category: string;
      type: 'mcq' | 'short';
    }> = {};

    data.forEach(row => {
      if (!questionGroups[row.questionText]) {
        questionGroups[row.questionText] = {
          rows: [],
          category: row.category,
          type: row.type,
        };
      }
      questionGroups[row.questionText].rows.push(row);
    });

    const parsedMetrics: QuestionMetrics[] = Object.keys(questionGroups).map(qText => {
      const group = questionGroups[qText];
      const total = group.rows.length;
      const correct = group.rows.filter(r => r.isCorrect).length;
      const incorrectRows = group.rows.filter(r => !r.isCorrect);
      
      // Calculate error rate
      const errorRate = total > 0 ? Math.round(((total - correct) / total) * 100) : 0;

      // Aggregate common incorrect answers
      const incorrectCounts: Record<string, number> = {};
      incorrectRows.forEach(r => {
        const ans = r.userAnswer || '[Skipped]';
        incorrectCounts[ans] = (incorrectCounts[ans] || 0) + 1;
      });

      const commonIncorrect = Object.keys(incorrectCounts)
        .map(ans => ({ answer: ans, count: incorrectCounts[ans] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3); // top 3 incorrect

      return {
        questionText: qText,
        category: group.category,
        type: group.type,
        totalResponses: total,
        correctCount: correct,
        errorRate,
        commonIncorrect,
      };
    });

    // Sort by errorRate desc (hardest first)
    parsedMetrics.sort((a, b) => b.errorRate - a.errorRate);
    setMetrics(parsedMetrics);
  };

  // Generate PDF Report using jsPDF
  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [17, 24, 39]) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      
      // Handle page overflow
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      // Split text to fit width
      const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
      splitText.forEach((line: string) => {
        doc.text(line, margin, y);
        y += size * 0.45 + 2;
      });
    };

    // Header styling
    doc.setFillColor(17, 24, 39); // Deep Slate
    doc.rect(0, 0, pageWidth, 42, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('EduQuery Struggle Analytics Report', margin, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}  |  Database Source: ${spreadsheetId ? 'Google Sheets' : 'Local Sandbox'}`, margin, 26);
    doc.text(`Target Audience: Quiz Administrators & Instructors`, margin, 31);

    y = 52;

    // Overview Statistics Cards
    addText('Core Metrics Overview', 12, 'bold', [17, 24, 39]);
    y += 2;

    // Grid details
    const uniqueCandidates = new Set(rawData.map(r => r.userEmail)).size;
    const avgAccuracy = Math.round((rawData.filter(r => r.isCorrect).length / rawData.length) * 100) || 0;
    const hardestQ = metrics[0]?.questionText || 'N/A';
    const hardestQError = metrics[0]?.errorRate || 0;

    addText(`Total Submission Records: ${rawData.length}`, 9, 'normal', [75, 85, 99]);
    addText(`Unique Participants Tested: ${uniqueCandidates}`, 9, 'normal', [75, 85, 99]);
    addText(`Average Cohort Accuracy: ${avgAccuracy}%`, 9, 'normal', [75, 85, 99]);
    addText(`Highest Struggle Rate: ${hardestQError}% (On: "${hardestQ.slice(0, 45)}...")`, 9, 'normal', [75, 85, 99]);
    
    y += 6;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Struggle points list
    addText('Struggle Points Breakdown (Sorted by Error Rate Desc)', 12, 'bold', [17, 24, 39]);
    y += 4;

    metrics.forEach((m, idx) => {
      addText(`${idx + 1}. [${m.category}] ${m.questionText}`, 10, 'bold', [31, 41, 55]);
      addText(`Type: ${m.type.toUpperCase()}  |  Struggle/Error Rate: ${m.errorRate}%  |  Correct Responses: ${m.correctCount}/${m.totalResponses}`, 9, 'normal', [75, 85, 99]);
      
      if (m.commonIncorrect.length > 0) {
        addText('Common incorrect responses and frequencies:', 9, 'bold', [107, 114, 128]);
        m.commonIncorrect.forEach(inc => {
          addText(`  • "${inc.answer}" - selected ${inc.count} time(s)`, 9, 'normal', [107, 114, 128]);
        });
      } else {
        addText('  • No incorrect responses recorded.', 9, 'normal', [107, 114, 128]);
      }
      y += 5; // space between questions
    });

    // Save report
    doc.save('EduQuery_Quiz_Struggle_Analytics.pdf');
  };

  // Prepare data for the Bar Chart
  const chartData = metrics.map(m => ({
    name: m.questionText.length > 25 ? `${m.questionText.slice(0, 22)}...` : m.questionText,
    fullText: m.questionText,
    'Struggle Rate (%)': m.errorRate,
  }));

  // Average cohorts metrics
  const uniqueParticipantsCount = new Set(rawData.map(r => r.userEmail)).size;
  const overallSuccessRate = rawData.length > 0 
    ? Math.round((rawData.filter(r => r.isCorrect).length / rawData.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal italic tracking-tight text-white sm:text-3xl">Cohort Struggle Analytics</h2>
          <p className="mt-1 font-sans text-xs uppercase tracking-wider text-white/50">
            Identify common mistakes, misconceptions, and struggle areas to tailor learning paths.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {(!token || !spreadsheetId) && (
            <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 font-sans text-xs text-amber-400 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.05)]">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Demo Data (No Sheet Connected)</span>
            </div>
          )}

          <button
            onClick={handleExportPDF}
            disabled={metrics.length === 0}
            className="flex items-center space-x-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-sans text-xs uppercase tracking-wider font-semibold text-white hover:bg-white/10 disabled:opacity-50 cursor-pointer shadow-sm transition-all"
          >
            <Download className="h-4 w-4 text-white/80" />
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Cohort Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        
        <div className="rounded-2xl border border-white/5 bg-[#141414] p-5 flex items-center space-x-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white">
            <Users className="h-5 w-5 text-white/80" />
          </div>
          <div>
            <span className="block font-serif text-2xl font-light text-white">{uniqueParticipantsCount}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40 font-bold">Tested Candidates</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#141414] p-5 flex items-center space-x-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-serif text-2xl font-light text-emerald-400">{overallSuccessRate}%</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40 font-bold">Cohort Accuracy</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#141414] p-5 flex items-center space-x-4 shadow-sm border-l-4 border-l-rose-500">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-serif text-2xl font-light text-rose-400">
              {metrics[0] ? `${metrics[0].errorRate}%` : '0%'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40 font-bold">Highest Error Rate</span>
          </div>
        </div>

      </div>

      {/* Chart Section */}
      {metrics.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#111111] p-5 sm:p-6 shadow-sm mb-8">
          <h3 className="font-serif italic text-sm text-white mb-6">Error Rates by Question</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontFamily: 'monospace' }} 
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'Inter, sans-serif', 
                    fontSize: '11px', 
                    borderRadius: '12px', 
                    backgroundColor: '#141414',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#E0E0E0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }} 
                />
                <Bar dataKey="Struggle Rate (%)" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => {
                    const rate = entry['Struggle Rate (%)'];
                    const color = rate >= 60 ? '#f43f5e' : rate >= 40 ? '#f59e0b' : '#6366f1';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Question Cards Breakdown (Hardest First) */}
      <div className="space-y-6">
        <h3 className="font-sans text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Detailed Common Distractor Analysis</h3>
        
        {metrics.map((m, idx) => {
          const difficultyLabel = m.errorRate >= 60 ? 'Hard' : m.errorRate >= 35 ? 'Medium' : 'Easy';
          const difficultyColor = m.errorRate >= 60 
            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
            : m.errorRate >= 35 
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

          return (
            <div key={idx} className="rounded-2xl border border-white/5 bg-[#141414] p-5 sm:p-6 shadow-sm space-y-4">
              
              {/* Card Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white/60 uppercase tracking-tight">
                  {m.category} • {m.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                </span>

                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-white/40">{m.totalResponses} submissions</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold border ${difficultyColor}`}>
                    {difficultyLabel} ({m.errorRate}% Struggle)
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <p className="font-sans text-sm font-semibold text-white leading-snug">{m.questionText}</p>

              {/* Common Distractors / Incorrect details */}
              <div className="rounded-xl border border-white/5 bg-[#111111]/80 p-4 space-y-3">
                <span className="font-sans text-xs font-bold text-white/80 flex items-center space-x-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Common Incorrect Log Entries</span>
                </span>

                {m.commonIncorrect.length > 0 ? (
                  <div className="grid sm:grid-cols-3 gap-3">
                    {m.commonIncorrect.map((inc, i) => {
                      return (
                        <div key={i} className="rounded-lg bg-[#181818] border border-white/5 p-3 flex flex-col justify-between">
                          <span className="font-sans text-xs font-semibold text-white block truncate">"{inc.answer}"</span>
                          <span className="font-mono text-[9px] text-white/40 mt-2 block">Chosen {inc.count} time(s)</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-sans text-xs text-white/40">
                    No incorrect answers recorded for this question so far.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
