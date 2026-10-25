import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const claims = await requireAdmin(request);
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await auth.getUser(claims.uid);
    const name = user.displayName || user.email?.split('@')[0] || 'Admin';
    return NextResponse.json({
      name,
      email: user.email || '',
    });
  } catch (error) {
    console.error('Error loading admin profile:', error);
    return NextResponse.json({ error: 'Failed to load admin profile' }, { status: 500 });
  }
}
