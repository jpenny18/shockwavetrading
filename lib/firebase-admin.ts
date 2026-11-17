import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Your service account details
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Check if Firebase Admin has already been initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();

/**
 * Create a session cookie from an ID token
 * @param idToken Firebase ID token
 * @param expiresIn Session duration in milliseconds
 * @returns Session cookie string
 */
export async function createSessionCookie(idToken: string, expiresIn = 60 * 60 * 24 * 5 * 1000) {
  return auth.createSessionCookie(idToken, { expiresIn });
}

/**
 * Verify a session cookie
 * @param sessionCookie Session cookie string
 * @returns Decoded token claims
 */
export async function verifySessionCookie(sessionCookie: string) {
  // The cookie's own expiration is the 5-day limit. A revocation lookup on every
  // request was treating still-valid sessions as logged out.
  return auth.verifySessionCookie(sessionCookie, false);
}

/**
 * Get user claims from a session cookie
 * @param sessionCookie Session cookie string
 * @returns User custom claims
 */
export async function getSessionClaims(sessionCookie: string) {
  try {
    const decodedClaims = await verifySessionCookie(sessionCookie);
    return decodedClaims;
  } catch (error: any) {
    console.error('Error verifying session cookie:', error.message);
    throw error;
  }
}

/**
 * Set admin role for a user
 * @param uid User ID
 * @returns Promise<void>
 */
export async function setAdminRole(uid: string) {
  try {
    await auth.setCustomUserClaims(uid, { admin: true });
  } catch (error: any) {
    console.error('Error setting admin role:', error.message);
    throw error;
  }
}

/**
 * Remove admin role from a user
 * @param uid User ID
 * @returns Promise<void>
 */
export async function removeAdminRole(uid: string) {
  try {
    await auth.setCustomUserClaims(uid, { admin: false });
  } catch (error: any) {
    console.error('Error removing admin role:', error.message);
    throw error;
  }
}

/**
 * Check if a user has admin role
 * @param uid User ID
 * @returns Promise<boolean>
 */
export async function isAdmin(uid: string) {
  try {
    const user = await auth.getUser(uid);
    return user.customClaims?.admin === true;
  } catch (error: any) {
    console.error('Error checking admin role:', error.message);
    throw error;
  }
}

export default admin; 