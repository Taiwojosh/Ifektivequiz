import { SheetScoreRow, SheetResponseRow, PendingSubmission } from '../types';

const SCORES_KEY = 'eduquery_local_scores';
const RESPONSES_KEY = 'eduquery_local_responses';
const PENDING_KEY = 'eduquery_local_pending';

export function getLocalScores(): SheetScoreRow[] {
  try {
    const data = localStorage.getItem(SCORES_KEY);
    if (data) {
      return JSON.parse(data) as SheetScoreRow[];
    }
  } catch (e) {
    console.error('Failed to parse local scores:', e);
  }
  return [];
}

export function saveLocalScore(score: SheetScoreRow) {
  try {
    const current = getLocalScores();
    current.push(score);
    localStorage.setItem(SCORES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save local score:', e);
  }
}

export function getLocalResponses(): SheetResponseRow[] {
  try {
    const data = localStorage.getItem(RESPONSES_KEY);
    if (data) {
      return JSON.parse(data) as SheetResponseRow[];
    }
  } catch (e) {
    console.error('Failed to parse local responses:', e);
  }
  return [];
}

export function saveLocalResponses(responses: SheetResponseRow[]) {
  try {
    const current = getLocalResponses();
    current.push(...responses);
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save local responses:', e);
  }
}

export function getPendingSubmissions(): PendingSubmission[] {
  try {
    const data = localStorage.getItem(PENDING_KEY);
    if (data) {
      return JSON.parse(data) as PendingSubmission[];
    }
  } catch (e) {
    console.error('Failed to parse pending submissions:', e);
  }
  return [];
}

export function savePendingSubmission(submission: PendingSubmission) {
  try {
    const current = getPendingSubmissions();
    current.push(submission);
    localStorage.setItem(PENDING_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save pending submission:', e);
  }
}

export function savePendingSubmissions(submissions: PendingSubmission[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(submissions));
  } catch (e) {
    console.error('Failed to save pending submissions:', e);
  }
}

