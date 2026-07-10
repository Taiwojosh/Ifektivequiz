/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Request spreadsheets scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Force approval prompt to ensure fresh refresh/access tokens if needed,
// but usually default is fine. Let's stick to standard to make it smooth.
provider.setCustomParameters({
  prompt: 'consent'
});

const TOKEN_KEY = 'eduquery_oauth_token';

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem(TOKEN_KEY);

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else {
        // If we have a user but no stored token, clear state and prompt sign-in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem(TOKEN_KEY, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem(TOKEN_KEY);
};

export const logout = async () => {
  await signOut(auth);
  localStorage.removeItem(TOKEN_KEY);
  cachedAccessToken = null;
};
