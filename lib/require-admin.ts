import { NextRequest } from 'next/server';
import { getSessionClaims } from '@/lib/firebase-admin';

export async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const claims = await getSessionClaims(sessionCookie);
    if (claims.admin !== true) return null;
    return claims;
  } catch {
    return null;
  }
}
