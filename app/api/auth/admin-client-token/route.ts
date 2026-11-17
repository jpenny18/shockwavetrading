import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const claims = await requireAdmin(request);
  if (!claims?.uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await auth.getUser(claims.uid);
    if (user.disabled || user.customClaims?.admin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customToken = await auth.createCustomToken(user.uid);
    return NextResponse.json({ customToken });
  } catch (error) {
    console.error('Error creating admin client token:', error);
    return NextResponse.json({ error: 'Failed to restore admin session' }, { status: 500 });
  }
}
