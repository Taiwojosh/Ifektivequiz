import React, { useState } from 'react';
import { Quiz } from '../types';
import { addCustomQuiz, getCustomQuizzes, deleteCustomQuiz, DEFAULT_QUIZZES } from '../quizzes';
import { FileJson, PlusCircle, Trash2, Copy, CheckCircle2 } from 'lucide-react';

export default function QuizManager() {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customQuizzes, setCustomQuizzes] = useState<Quiz[]>(getCustomQuizzes());
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const exampleQuiz: Quiz = {
    id: "example-quiz-id",
    title: "Example Custom Quiz",
    description: "This is an example quiz.",
    durationMinutes: 5,
    questions: [
      {
        id: "q1",
        text: "What is 2 + 2?",
        type: "mcq",
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
        category: "Math",
        explanation: "Simple arithmetic."
      },
      {
        id: "q2",
        text: "What is the capital of France?",
        type: "short",
        correctAnswer: "Paris",
        category: "Geography",
        explanation: "Paris is the capital of France."
      }
    ]
  };

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(exampleQuiz, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    setError(null);
    setSuccess(null);
    try {
      if (!jsonInput.trim()) {
        throw new Error("Please enter JSON data.");
      }
      
      const parsed = JSON.parse(jsonInput);
      
      // Basic validation
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
      setCustomQuizzes(getCustomQuizzes());
      setJsonInput('');
      setSuccess(`Successfully added ${quizzesToAdd.length} quiz(zes).`);
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
    e.target.value = ''; // Reset input
  };

  const handleDelete = (id: string) => {
    deleteCustomQuiz(id);
    setCustomQuizzes(getCustomQuizzes());
    setSuccess("Quiz deleted successfully.");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Manage Quizzes</h2>
        <p className="text-white/60 mt-1">Import custom quizzes via JSON to test your team or class.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all duration-200 ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                : 'border-white/10 bg-[#1A1A1A]'
            }`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FileJson className="w-32 h-32" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-4 relative z-10 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <span>Import via JSON</span>
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-white/70">
                  {isDragging ? 'Drop your JSON file here!' : 'Raw JSON'}
                </label>
                <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <span>Upload File Instead</span>
                  <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste quiz JSON here..."
                className="w-full h-48 rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              
              {error && (
                <div className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-emerald-400 text-sm font-medium bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{success}</span>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!jsonInput.trim()}
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition-all hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
              >
                Import Quiz
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-white">JSON Format Example</h3>
              <button 
                onClick={handleCopyExample}
                className="text-xs flex items-center space-x-1 text-white/50 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded border border-white/10"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-white/60 bg-black/50 p-4 rounded-xl border border-white/5 overflow-auto max-h-60">
              {JSON.stringify(exampleQuiz, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Your Custom Quizzes</h3>
          {customQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center bg-white/5">
              <p className="text-white/40 font-medium">No custom quizzes found.</p>
              <p className="text-white/30 text-sm mt-1">Import one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customQuizzes.map(quiz => (
                <div key={quiz.id} className="rounded-xl border border-white/10 bg-black/40 p-4 flex items-center justify-between group hover:border-white/20 transition-colors">
                  <div>
                    <h4 className="text-white font-medium">{quiz.title}</h4>
                    <p className="text-white/50 text-xs mt-1">{quiz.questions.length} questions • {quiz.durationMinutes} mins</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(quiz.id)}
                    className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Built-in Quizzes (Read-only)</h3>
            <div className="space-y-2">
              {DEFAULT_QUIZZES.map(quiz => (
                <div key={quiz.id} className="rounded-lg border border-white/5 bg-white/5 p-3 flex items-center justify-between opacity-70">
                  <div>
                    <h4 className="text-white/80 text-sm font-medium">{quiz.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
