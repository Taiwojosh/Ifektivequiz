/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SheetScoreRow, SheetResponseRow } from './types';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Global state listeners for loading and toasts
let activeRequestsCount = 0;
let onLoadingChangeListeners: ((isLoading: boolean) => void)[] = [];
let onToastListeners: ((message: string, type: ToastType) => void)[] = [];

export function subscribeToLoading(listener: (isLoading: boolean) => void) {
  onLoadingChangeListeners.push(listener);
  // Emit current loading state immediately to the subscriber
  listener(activeRequestsCount > 0);
  return () => {
    onLoadingChangeListeners = onLoadingChangeListeners.filter(l => l !== listener);
  };
}

export function subscribeToToast(listener: (message: string, type: ToastType) => void) {
  onToastListeners.push(listener);
  return () => {
    onToastListeners = onToastListeners.filter(l => l !== listener);
  };
}

function notifyLoading(isLoading: boolean) {
  onLoadingChangeListeners.forEach(l => l(isLoading));
}

export function triggerToast(message: string, type: ToastType = 'info') {
  onToastListeners.forEach(l => l(message, type));
}

/**
 * Unified API wrapper for Google Sheets operations.
 * Manages loading state and fires toast notifications on success or failure.
 */
export async function wrapSheetsApi<T>(
  apiName: string,
  promiseFn: () => Promise<T>,
  successMsg?: string
): Promise<T> {
  activeRequestsCount++;
  notifyLoading(true);
  try {
    const result = await promiseFn();
    if (successMsg) {
      triggerToast(successMsg, 'success');
    }
    return result;
  } catch (err: any) {
    console.error(`Google Sheets API Error [${apiName}]:`, err);
    const userMessage = err?.message || `Failed to complete operation: ${apiName}`;
    triggerToast(userMessage, 'error');
    throw err;
  } finally {
    activeRequestsCount--;
    if (activeRequestsCount <= 0) {
      activeRequestsCount = 0;
      notifyLoading(false);
    }
  }
}

// Standard API headers
const getHeaders = (token: string | null) => ({
  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  'Content-Type': 'application/json',
});

/**
 * Creates a brand new Spreadsheet in the user's Google Drive for quiz data
 */
export async function createQuizSpreadsheet(token: string, title: string = "Quiz Database & Analytics"): Promise<string> {
  return wrapSheetsApi('Create Quiz Spreadsheet', async () => {
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
  }, 'Successfully created and initialized a new quiz spreadsheet database!');
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
  return wrapSheetsApi('Validate Spreadsheet', async () => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Spreadsheet not found or access is denied.');
    }

    const data = await response.json();
    const sheetNames = data.sheets?.map((s: any) => s.properties?.title) || [];
    
    // Make sure we have Scores and Responses sheets
    return sheetNames.includes('Scores') && sheetNames.includes('Responses');
  });
}

/**
 * Appends a score record to the Scores sheet
 */
export async function appendScoreRow(
  token: string | null,
  spreadsheetId: string | null,
  row: SheetScoreRow,
  appsScriptUrl?: string | null
): Promise<void> {
  return wrapSheetsApi('Submit Score', async () => {
    if (appsScriptUrl) {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
          action: 'addScore',
          row,
          spreadsheetId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to submit score via Apps Script Web App.');
      }
      return;
    }

    if (!spreadsheetId) return;
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
  }, 'Score submitted successfully to Google Sheets!');
}

/**
 * Appends multiple detailed responses to the Responses sheet
 */
export async function appendResponseRows(
  token: string | null,
  spreadsheetId: string | null,
  rows: SheetResponseRow[],
  appsScriptUrl?: string | null
): Promise<void> {
  return wrapSheetsApi('Submit Responses', async () => {
    if (appsScriptUrl) {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
          action: 'addResponses',
          rows,
          spreadsheetId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to submit detailed responses via Apps Script.');
      }
      return;
    }

    if (!spreadsheetId) return;
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
  });
}

/**
 * Fetches all scores for the leaderboard
 */
export async function fetchScores(
  token: string | null,
  spreadsheetId: string | null,
  appsScriptUrl?: string | null
): Promise<SheetScoreRow[]> {
  return wrapSheetsApi('Fetch Scores', async () => {
    if (appsScriptUrl) {
      const response = await fetch(`${appsScriptUrl}?action=getScores&spreadsheetId=${spreadsheetId || ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch score history via Apps Script.');
      }
      return await response.json();
    }

    if (!spreadsheetId) return [];
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
  });
}

/**
 * Fetches all detailed question responses for analytics
 */
export async function fetchResponses(
  token: string | null,
  spreadsheetId: string | null,
  appsScriptUrl?: string | null
): Promise<SheetResponseRow[]> {
  return wrapSheetsApi('Fetch Responses', async () => {
    if (appsScriptUrl) {
      const response = await fetch(`${appsScriptUrl}?action=getResponses&spreadsheetId=${spreadsheetId || ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch detailed responses via Apps Script.');
      }
      return await response.json();
    }

    if (!spreadsheetId) return [];
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
  });
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
export async function saveQuizToSheets(
  token: string | null,
  spreadsheetId: string | null,
  quiz: any,
  appsScriptUrl?: string | null
): Promise<void> {
  return wrapSheetsApi('Save Quiz', async () => {
    if (appsScriptUrl) {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
          action: 'saveQuiz',
          quiz,
          spreadsheetId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save quiz via Apps Script.');
      }
      return;
    }

    if (!spreadsheetId) return;
    await ensureSheetsExist(token || '', spreadsheetId);

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
      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({
          range: `Quizzes!A${existingIndex}:E${existingIndex}`,
          majorDimension: 'ROWS',
          values: [rowValues],
        }),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to update quiz in Google Sheets.');
      }
    } else {
      // Append new row
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A:E:append?valueInputOption=USER_ENTERED`;
      const appendRes = await fetch(appendUrl, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
          range: 'Quizzes!A:E',
          majorDimension: 'ROWS',
          values: [rowValues],
        }),
      });
      if (!appendRes.ok) {
        const err = await appendRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to append new quiz to Google Sheets.');
      }
    }
  }, `Successfully saved quiz "${quiz.title}" to Google Sheets!`);
}

/**
 * Fetches all custom quizzes from the Quizzes sheet
 */
export async function fetchQuizzesFromSheets(
  token: string | null,
  spreadsheetId: string | null,
  appsScriptUrl?: string | null
): Promise<any[]> {
  return wrapSheetsApi('Fetch Quizzes', async () => {
    if (appsScriptUrl) {
      const response = await fetch(`${appsScriptUrl}?action=getQuizzes&spreadsheetId=${spreadsheetId || ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch quizzes via Apps Script Web App.');
      }
      return await response.json();
    }

    if (!spreadsheetId) return [];
    await ensureSheetsExist(token || '', spreadsheetId);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A2:E`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to fetch quizzes from Google Sheets.');
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
  });
}

/**
 * Registers an invited guest player inside the Players sheet
 */
export async function savePlayerToSheets(
  token: string | null,
  spreadsheetId: string | null,
  playerName: string,
  quizId: string,
  quizTitle: string,
  appsScriptUrl?: string | null
): Promise<void> {
  return wrapSheetsApi('Register Player', async () => {
    if (appsScriptUrl) {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
          action: 'savePlayer',
          playerName,
          quizId,
          quizTitle,
          spreadsheetId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to register player via Apps Script.');
      }
      return;
    }

    if (!spreadsheetId) return;
    await ensureSheetsExist(token || '', spreadsheetId);

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
  }, `Successfully registered guest player "${playerName}"!`);
}

/**
 * Deletes a quiz from the Quizzes sheet by filtering the rows and rewriting the list
 */
export async function deleteQuizFromSheets(
  token: string | null,
  spreadsheetId: string | null,
  quizId: string,
  appsScriptUrl?: string | null
): Promise<void> {
  return wrapSheetsApi('Delete Quiz', async () => {
    if (appsScriptUrl) {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
          action: 'deleteQuiz',
          quizId,
          spreadsheetId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete quiz via Apps Script.');
      }
      return;
    }

    if (!spreadsheetId) return;
    await ensureSheetsExist(token || '', spreadsheetId);

    // 1. Fetch current quizzes from Sheets
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A2:E`;
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!getResponse.ok) {
      const err = await getResponse.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to retrieve current quizzes prior to deletion.');
    }

    const data = await getResponse.json();
    const rows = data.values || [];
    
    // 2. Filter out the quiz to be deleted
    const remainingRows = rows.filter((row: any[]) => row && row[0] !== quizId);

    // 3. Clear existing Quizzes sheet from row 2 downwards
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A2:E:clear`;
    const clearRes = await fetch(clearUrl, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({}),
    });
    if (!clearRes.ok) {
      const err = await clearRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to clear previous quizzes from Google Sheets.');
    }

    // 4. Write back remaining rows if any exist
    if (remainingRows.length > 0) {
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Quizzes!A2:E?valueInputOption=USER_ENTERED`;
      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({
          range: 'Quizzes!A2:E',
          majorDimension: 'ROWS',
          values: remainingRows,
        }),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to write back remaining quizzes to Google Sheets.');
      }
    }
  }, 'Successfully deleted quiz from Google Sheets database!');
}

