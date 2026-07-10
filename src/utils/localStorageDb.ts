import { SheetScoreRow, SheetResponseRow } from '../types';

const SCORES_KEY = 'eduquery_local_scores';
const RESPONSES_KEY = 'eduquery_local_responses';

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
