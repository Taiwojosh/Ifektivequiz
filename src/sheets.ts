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

/**
 * Ensures that the required sheets ('Players' and 'Quizzes') exist inside the spreadsheet,
 * creating them and initializing their headers dynamically if they are missing.
 */
export async function ensureSheetsExist(token: string, spreadsheetId: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });
  if (!response.ok) return;

  const data = await response.json();
  const existingTitles = data.sheets?.map((s: any) => s.properties?.title) || [];

  const requests: any[] = [];
  const sheetsToCreate: string[] = [];

  if (!existingTitles.includes('Players')) {
    sheetsToCreate.push('Players');
    requests.push({
      addSheet: {
        properties: {
          title: 'Players',
        }
      }
    });
  }

  if (!existingTitles.includes('Quizzes')) {
    sheetsToCreate.push('Quizzes');
    requests.push({
      addSheet: {
        properties: {
          title: 'Quizzes',
        }
      }
    });
  }

  if (requests.length > 0) {
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ requests }),
    });

    if (updateResponse.ok) {
      // Initialize headers for newly created sheets
      const dataUpdate: any[] = [];
      if (sheetsToCreate.includes('Players')) {
        dataUpdate.push({
          range: 'Players!A1:E1',
          majorDimension: 'ROWS',
          values: [["Timestamp", "Player Name", "Player Email", "Invited Quiz ID", "Invited Quiz Title"]],
        });
      }
      if (sheetsToCreate.includes('Quizzes')) {
        dataUpdate.push({
          range: 'Quizzes!A1:E1',
          majorDimension: 'ROWS',
          values: [["Quiz ID", "Title", "Description", "Duration (Minutes)", "Quiz Data JSON"]],
        });
      }

      if (dataUpdate.length > 0) {
        const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
        await fetch(batchUpdateUrl, {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: dataUpdate,
          }),
        });
      }
    }
  }
}

/**
 * Saves or updates a custom quiz inside the Quizzes sheet
 */
export async function saveQuizToSheets(token: string, spreadsheetId: string, quiz: any): Promise<void> {
  await ensureSheetsExist(token, spreadsheetId);

  // 1. Fetch current quizzes from Sheets to see if this quiz already exists
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A:A`;
  const response = await fetch(getUrl, {
    method: 'GET',
    headers: getHeaders(token),
  });

  let existingIndex = -1;
  if (response.ok) {
    const data = await response.json();
    const rows = data.values || [];
    // rows[0] is the header, rows[i] is row i+1
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === quiz.id) {
        existingIndex = i + 1; // 1-indexed row number
        break;
      }
    }
  }

  const quizJson = JSON.stringify(quiz);
  const rowValues = [quiz.id, quiz.title, quiz.description, quiz.durationMinutes, quizJson];

  if (existingIndex !== -1) {
    // Update existing row
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A${existingIndex}:E${existingIndex}?valueInputOption=USER_ENTERED`;
    await fetch(updateUrl, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({
        range: `Quizzes!A${existingIndex}:E${existingIndex}`,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    });
  } else {
    // Append new row
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A:E:append?valueInputOption=USER_ENTERED`;
    await fetch(appendUrl, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        range: 'Quizzes!A:E',
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    });
  }
}

/**
 * Fetches all custom quizzes from the Quizzes sheet
 */
export async function fetchQuizzesFromSheets(token: string, spreadsheetId: string): Promise<any[]> {
  await ensureSheetsExist(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A2:E`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  if (!data.values) return [];

  const quizzes: any[] = [];
  for (const row of data.values) {
    if (row && row[4]) {
      try {
        const quizObj = JSON.parse(row[4]);
        quizzes.push(quizObj);
      } catch (err) {
        console.error('Failed to parse quiz JSON from sheet row', row, err);
      }
    }
  }
  return quizzes;
}

/**
 * Registers an invited guest player inside the Players sheet
 */
export async function savePlayerToSheets(
  token: string,
  spreadsheetId: string,
  playerName: string,
  quizId: string,
  quizTitle: string
): Promise<void> {
  await ensureSheetsExist(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Players!A:E:append?valueInputOption=USER_ENTERED`;
  const timestamp = new Date().toISOString();
  const emailPrefix = playerName.toLowerCase().replace(/\s+/g, '');
  const playerEmail = `${emailPrefix}@eduquery.internal`;

  const payload = {
    range: 'Players!A:E',
    majorDimension: 'ROWS',
    values: [[
      timestamp,
      playerName,
      playerEmail,
      quizId,
      quizTitle
    ]],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to register player in Google Sheets.');
  }
}
