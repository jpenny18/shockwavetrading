import { NextRequest, NextResponse } from 'next/server';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { authenticateResetRequest } from '@/lib/reset-order-server';
import { VIP_PURCHASE_TYPE } from '@/lib/vip-purchase';
import { resolveVipPurchase } from '@/lib/vip-purchase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PORTAL_URL = 'https://www.scxdashboards.com';
const DEFAULT_APP_ORIGIN = 'https://shockwave-capital.com';

function readServerEnv(name: string): string {
  const current = process.env[name]?.trim();
  if (current) return current;
  const root = process.cwd();
  const local = loadEnv({ path: path.join(root, '.env.local') }).parsed;
  const shared = loadEnv({ path: path.join(root, '.env') }).parsed;
  return (local?.[name] || shared?.[name] || '').trim();
}

function appOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')?.trim() || '';
  if (/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) return origin.replace(/\/$/, '');
  return DEFAULT_APP_ORIGIN;
}

function portalCheckoutUrl(url: string, portal: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = new URL(portal);
    return parsed.protocol === allowed.protocol && parsed.host === allowed.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const secret = readServerEnv('CHECKOUT_HANDOFF_SECRET');
  const portal = (readServerEnv('PAYMENT_PORTAL_URL') || DEFAULT_PORTAL_URL).replace(/\/$/, '');
  if (!secret || secret.length < 16 || !portal) {
    return NextResponse.json({ error: 'Payment portal is not configured' }, { status: 503 });
  }

  const authResult = await authenticateResetRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'VIP details are missing.' }, { status: 400 });
  }

  const idempotencyKey = String(body.idempotencyKey || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Unable to start card checkout.' }, { status: 400 });
  }

  const priced = await resolveVipPurchase({
    level: body.level || body.challengeAmount,
    platform: body.platform,
    discountCode: body.discountCode,
    expectedAmount: body.expectedAmount,
  });
  if (!priced.ok) return NextResponse.json({ error: priced.error }, { status: priced.status });

  const origin = appOrigin(request);
  const handoffBody = {
    idempotencyKey,
    orderKind: 'vip-allocation',
    userId: authResult.uid,
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    email: authResult.email,
    phone: String(body.phone || '').trim(),
    country: String(body.country || '').trim(),
    discordUsername: String(body.discordUsername || '').trim(),
    challengeType: VIP_PURCHASE_TYPE,
    challengeAmount: priced.option.level,
    tierName: priced.option.name,
    platform: priced.platform,
    addOns: [],
    discountCode: priced.discount?.code || '',
    discountId: priced.discount?.id || '',
    discountType: priced.discount?.type || '',
    discountValue: priced.discount?.value ?? null,
    originalPrice: priced.originalPrice,
    expectedAmount: priced.price,
    expectedAmountCents: Math.round(priced.price * 100),
    currency: 'usd',
    returnUrl: `${origin}/dashboard/vip?vip=paid`,
    cancelUrl: `${origin}/dashboard/vip`,
  };

  if (!handoffBody.firstName || !handoffBody.lastName || !handoffBody.phone || !handoffBody.country) {
    return NextResponse.json({ error: 'First name, last name, phone, and country are required.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${portal}/vip/api/handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(handoffBody),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    const checkoutUrl = typeof data.checkoutUrl === 'string' ? data.checkoutUrl : '';
    if (!response.ok || !portalCheckoutUrl(checkoutUrl, portal)) {
      console.error('VIP payment portal handoff failed', response.status);
      return NextResponse.json(
        { error: 'Card checkout is unavailable right now. You can pay with crypto, or try the card payment again in a moment.' },
        { status: 502 }
      );
    }
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error('VIP payment portal handoff failed', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Card checkout is unavailable right now. You can pay with crypto, or try the card payment again in a moment.' },
      { status: 502 }
    );
  }
}
