import { NextRequest, NextResponse } from 'next/server';
import { centsToDollars, vipChargeCents, vipOptionByLevel } from '../../config';
import { saveCheckoutDraft, validateResetCode } from '../../lib/records';
import { createVipCheckoutSession, requestOrigin } from '../../lib/stripe-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const option = vipOptionByLevel(String(body?.level || ''));
    if (!option) {
      return NextResponse.json({ error: 'Choose a VIP allocation' }, { status: 400 });
    }

    const resetCode = String(body?.resetCode || '').trim();
    let appliedCode: { id: string; code: string } | null = null;
    if (resetCode) {
      const result = await validateResetCode(resetCode);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      appliedCode = { id: result.id, code: result.code };
    }

    const amountCents = vipChargeCents(option.price, Boolean(appliedCode));
    const session = await createVipCheckoutSession(amountCents, requestOrigin(request));
    if (!session.client_secret || !session.id) {
      return NextResponse.json({ error: 'Stripe did not return a checkout session' }, { status: 502 });
    }

    await saveCheckoutDraft({
      sessionId: session.id,
      level: option.level,
      tier: option.name,
      platform: '',
      amountCents,
      originalPrice: option.price,
      chargedPrice: centsToDollars(amountCents),
      resetCode: appliedCode?.code || null,
      resetCodeId: appliedCode?.id || null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      discordUsername: '',
      status: 'open',
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      amountCents,
    });
  } catch (error) {
    console.error('VIP checkout session error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start checkout' },
      { status: 500 }
    );
  }
}
