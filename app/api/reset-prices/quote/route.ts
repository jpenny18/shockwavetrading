import { NextRequest, NextResponse } from 'next/server';
import { authenticateResetRequest, loadOwnedReset } from '@/lib/reset-order-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await authenticateResetRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const accountId = request.nextUrl.searchParams.get('accountId') || '';
  const owned = await loadOwnedReset(authResult.uid, accountId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  return NextResponse.json({ quote: owned.reset.quote });
}
