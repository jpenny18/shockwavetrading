import { NextRequest, NextResponse } from 'next/server';
import { validateVipCustomer, type VipCustomer } from '../../../config';
import { getCheckoutDraft, saveCheckoutCustomer } from '../../../lib/records';
import { isCheckoutSessionId, retrieveVipCheckoutSession, updateVipCheckoutContact } from '../../../lib/stripe-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || '');
    if (!isCheckoutSessionId(sessionId)) {
      return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 });
    }

    const customer: VipCustomer = {
      firstName: String(body?.firstName || ''),
      lastName: String(body?.lastName || ''),
      email: String(body?.email || ''),
      phone: String(body?.phone || ''),
      country: String(body?.country || ''),
      platform: String(body?.platform || ''),
      discordUsername: String(body?.discordUsername || ''),
    };
    const invalid = validateVipCustomer(customer);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const draft = await getCheckoutDraft(sessionId);
    if (!draft || draft.status === 'completed') {
      return NextResponse.json({ error: 'This checkout session can no longer be updated' }, { status: 409 });
    }
    if (String(body?.level || '') !== draft.level) {
      return NextResponse.json({ error: 'This checkout session is for a different allocation' }, { status: 409 });
    }

    const existing = await retrieveVipCheckoutSession(sessionId);
    if (existing.status === 'complete' || existing.amount_total !== draft.amountCents) {
      return NextResponse.json({ error: 'This checkout session can no longer be updated' }, { status: 409 });
    }

    await saveCheckoutCustomer(sessionId, customer);
    await updateVipCheckoutContact(sessionId, customer);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('VIP checkout details error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save checkout details' },
      { status: 500 }
    );
  }
}
