import { NextRequest, NextResponse } from 'next/server';
import { vipOptionByLevel } from '../../config';
import { recordPaidVipOrder, resolveCheckoutDraft } from '../../lib/records';
import { isCheckoutSessionId, retrieveVipCheckoutSession } from '../../lib/stripe-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || '');
    if (!isCheckoutSessionId(sessionId)) {
      return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 });
    }

    const session = await retrieveVipCheckoutSession(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        {
          paid: false,
          status: session.status || 'open',
          paymentStatus: session.payment_status || 'unpaid',
        },
        { status: 409 }
      );
    }

    const draft = await resolveCheckoutDraft(session);
    const option = draft ? vipOptionByLevel(draft.level) : undefined;
    if (!draft || !option) {
      return NextResponse.json({ error: 'Checkout record not found' }, { status: 404 });
    }

    try {
      const recorded = await recordPaidVipOrder(session, draft, option);
      return NextResponse.json({ paid: true, orderId: recorded.orderId, alreadyRecorded: recorded.alreadyRecorded });
    } catch (error) {
      console.error('VIP order record failed:', error instanceof Error ? error.message : error);
      return NextResponse.json({
        paid: true,
        orderId: null,
        warning: 'Payment received. Order notification is still processing.',
      });
    }
  } catch (error) {
    console.error('VIP complete error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to confirm payment' },
      { status: 500 }
    );
  }
}
