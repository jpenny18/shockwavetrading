import { onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { auth } from './firebase';

const REFRESH_WINDOW_MS = 10 * 60 * 1000;

let restoreInFlight: Promise<User | null> | null = null;
let sessionSignIn: Promise<User | null> | null = null;
let restoresPaused = false;
let activeRequest = new AbortController();

export function pauseAdminClientRestore() {
  restoresPaused = true;
  activeRequest.abort();
  activeRequest = new AbortController();
}

export function resumeAdminClientRestore() {
  restoresPaused = false;
}

function waitForCurrentUser(): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

export function signInAdminFromSession(): Promise<User | null> {
  if (restoresPaused) return Promise.resolve(null);
  if (!sessionSignIn) {
    const request = activeRequest;
    sessionSignIn = (async () => {
      try {
        const response = await fetch('/api/auth/admin-client-token', {
          method: 'POST',
          signal: request.signal,
        });
        if (!response.ok || restoresPaused) return null;

        const payload = await response.json().catch(() => null);
        const customToken = payload?.customToken;
        if (!customToken || typeof customToken !== 'string' || restoresPaused) return null;

        const credential = await signInWithCustomToken(auth, customToken);
        if (restoresPaused) {
          await signOut(auth).catch(() => undefined);
          return null;
        }
        await credential.user.getIdToken(true);
        if (restoresPaused) {
          await signOut(auth).catch(() => undefined);
          return null;
        }
        return credential.user;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return null;
        console.error('Failed to restore admin client session:', error);
        return null;
      }
    })().finally(() => {
      sessionSignIn = null;
    });
  }

  return sessionSignIn;
}

async function restoreAdminClientAuth(): Promise<User | null> {
  if (restoresPaused) return null;
  try {
    const user = await waitForCurrentUser();
    if (user) {
      const result = await user.getIdTokenResult();
      const expiresAt = Date.parse(result.expirationTime);
      const expiringSoon = !Number.isFinite(expiresAt) || expiresAt - Date.now() < REFRESH_WINDOW_MS;
      if (result.claims.admin === true && !expiringSoon) return user;

      const refreshed = await user.getIdTokenResult(true);
      if (refreshed.claims.admin === true) return user;
    }
  } catch (error) {
    console.error('Admin client token check failed:', error);
  }

  return signInAdminFromSession();
}

export function ensureAdminClientAuth(): Promise<User | null> {
  if (!restoreInFlight) {
    restoreInFlight = restoreAdminClientAuth().finally(() => {
      restoreInFlight = null;
    });
  }

  return restoreInFlight;
}

export function isAdminAuthError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === 'permission-denied' || code === 'admin-auth-expired';
}
