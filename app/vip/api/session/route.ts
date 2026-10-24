import { NextRequest, NextResponse } from 'next/server';
import { resolveCheckoutDraft } from '../../lib/records';
import { isCheckoutSessionId, retrieveVipCheckoutSession } from '../../lib/stripe-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id') || '';
    if (!isCheckoutSessionId(sessionId)) {
      return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 });
    }

    const session = await retrieveVipCheckoutSession(sessionId);
    const draft = await resolveCheckoutDraft(session);
    if (!draft) {
      return NextResponse.json({ error: 'Checkout record not found' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status || 'open',
      paymentStatus: session.payment_status || 'unpaid',
      amount: draft.chargedPrice,
      level: draft.level,
      tier: draft.tier,
      platform: draft.platform,
      email: draft.email || session.customer_details?.email || session.customer_email || '',
    });
  } catch (error) {
    console.error('VIP session lookup error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load checkout session' },
      { status: 500 }
    );
  }
}
