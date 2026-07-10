/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SheetScoreRow, SheetResponseRow } from './types';

// Standard API headers
const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/**
 * Creates a brand new Spreadsheet in the user's Google Drive for quiz data
 */
export async function createQuizSpreadsheet(token: string, title: string = "Quiz Database & Analytics"): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const payload = {
    properties: {
      title: title,
    },
    sheets: [
      {
        properties: {
          title: 'Scores',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Responses',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create Google Sheet.');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize headers for both sheets
  await initializeSheetHeaders(token, spreadsheetId);

  return spreadsheetId;
}

/**
 * Initializes header rows in the newly created spreadsheet
 */
async function initializeSheetHeaders(token: string, spreadsheetId: string): Promise<void> {
  const scoresHeaders = ["Timestamp", "User Name", "User Email", "Score", "Total Questions", "Percentage (%)", "Time Taken (Seconds)"];
  const responsesHeaders = ["Timestamp", "User Email", "Question Index", "Question Text", "Type", "User Answer", "Correct Answer", "Is Correct", "Category"];

  // Batch update values
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const payload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Scores!A1:G1',
        majorDimension: 'ROWS',
        values: [scoresHeaders],
      },
      {
        range: 'Responses!A1:I1',
        majorDimension: 'ROWS',
        values: [responsesHeaders],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to initialize database headers.');
  }
}

/**
 * Validates if the spreadsheet ID is readable and matches our structure
 */
export async function validateSpreadsheet(token: string, spreadsheetId: string): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  const sheetNames = data.sheets?.map((s: any) => s.properties?.title) || [];
  
  // Make sure we have Scores and Responses sheets
  return sheetNames.includes('Scores') && sheetNames.includes('Responses');
}

/**
 * Appends a score record to the Scores sheet
 */
export async function appendScoreRow(token: string, spreadsheetId: string, row: SheetScoreRow): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:G:append?valueInputOption=USER_ENTERED`;
  
  const payload = {
    range: 'Scores!A:G',
    majorDimension: 'ROWS',
    values: [[
      row.timestamp,
      row.userName,
      row.userEmail,
      row.score,
      row.totalQuestions,
      row.percentage,
      row.timeTakenSeconds,
    ]],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to submit score to database.');
  }
}

/**
 * Appends multiple detailed responses to the Responses sheet
 */
export async function appendResponseRows(token: string, spreadsheetId: string, rows: SheetResponseRow[]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Responses!A:I:append?valueInputOption=USER_ENTERED`;
  
  const values = rows.map(row => [
    row.timestamp,
    row.userEmail,
    row.questionIndex,
    row.questionText,
    row.type,
    row.userAnswer,
    row.correctAnswer,
    row.isCorrect ? 'TRUE' : 'FALSE',
    row.category,
  ]);

  const payload = {
    range: 'Responses!A:I',
    majorDimension: 'ROWS',
    values: values,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to submit detailed responses to database.');
  }
}

/**
 * Fetches all scores for the leaderboard
 */
export async function fetchScores(token: string, spreadsheetId: string): Promise<SheetScoreRow[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A2:G`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch score history.');
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: any[]) => ({
    timestamp: row[0] || '',
    userName: row[1] || 'Anonymous',
    userEmail: row[2] || '',
    score: Number(row[3]) || 0,
    totalQuestions: Number(row[4]) || 0,
    percentage: Number(row[5]) || 0,
    timeTakenSeconds: Number(row[6]) || 0,
  }));
}

/**
 * Fetches all detailed question responses for analytics
 */
export async function fetchResponses(token: string, spreadsheetId: string): Promise<SheetResponseRow[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Responses!A2:I`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch detailed responses for analytics.');
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: any[]) => ({
    timestamp: row[0] || '',
    userEmail: row[1] || '',
    questionIndex: Number(row[2]) || 0,
    questionText: row[3] || '',
    type: (row[4] || 'mcq') as 'mcq' | 'short',
    userAnswer: row[5] || '',
    correctAnswer: row[6] || '',
    isCorrect: row[7] === 'TRUE',
    category: row[8] || 'General',
  }));
}
