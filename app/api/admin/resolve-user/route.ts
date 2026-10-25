import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db, getSessionClaims } from '@/lib/firebase-admin';

/**
 * Resolve a user's authoritative Firebase Auth UID by email (admin only).
 *
 * The `users` collection can contain stale/duplicate docs for the same email
 * (e.g. re-registered accounts), so client-side email queries may return the
 * wrong UID. Firebase Auth is the source of truth for the UID a user actually
 * logs in with.
 */
export async function POST(req: NextRequest) {
  // API routes are skipped by the admin middleware, so verify the session here
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const claims = await getSessionClaims(sessionCookie);
    if (claims.admin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Authoritative UID from Firebase Auth
    const userRecord = await adminAuth.getUserByEmail(email.toLowerCase().trim());

    // Enrich with the profile doc keyed by that UID (may not exist)
    const profileSnap = await db.collection('users').doc(userRecord.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    return NextResponse.json({
      uid: userRecord.uid,
      email: userRecord.email || email.toLowerCase().trim(),
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
      country: profile?.country || ''
    });
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.error('Error resolving user by email:', error);
    return NextResponse.json({ error: 'Failed to resolve user' }, { status: 500 });
  }
}
