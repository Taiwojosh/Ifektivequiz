import { SheetScoreRow, SheetResponseRow, PendingSubmission } from '../types';

let memoryScores: SheetScoreRow[] = [];
let memoryResponses: SheetResponseRow[] = [];
let memoryPending: PendingSubmission[] = [];

export function getLocalScores(): SheetScoreRow[] {
  return memoryScores;
}

export function saveLocalScore(score: SheetScoreRow) {
  memoryScores.push(score);
}

export function getLocalResponses(): SheetResponseRow[] {
  return memoryResponses;
}

export function saveLocalResponses(responses: SheetResponseRow[]) {
  memoryResponses.push(...responses);
}

export function getPendingSubmissions(): PendingSubmission[] {
  return memoryPending;
}

export function savePendingSubmission(submission: PendingSubmission) {
  memoryPending.push(submission);
}

export function savePendingSubmissions(submissions: PendingSubmission[]) {
  memoryPending = submissions;
}

