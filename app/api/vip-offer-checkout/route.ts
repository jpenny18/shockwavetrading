import { NextRequest, NextResponse } from 'next/server';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { authenticateResetRequest } from '@/lib/reset-order-server';
import { loadOwnedVipCheckout, normalizeCheckoutPlatform, pricesMatch } from '@/lib/vip-offer-server';

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
    return NextResponse.json({ error: 'Offer details are missing.' }, { status: 400 });
  }

  const idempotencyKey = String(body.idempotencyKey || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Unable to start card checkout.' }, { status: 400 });
  }

  const owned = await loadOwnedVipCheckout(authResult.uid, body.kind || body.orderKind, body.offerId);
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status });
  if (!pricesMatch(body.expectedAmount, owned.checkout.price)) {
    return NextResponse.json({ error: 'This offer price has changed. Close the window and try again.' }, { status: 409 });
  }

  const platform = normalizeCheckoutPlatform(body.platform);
  if (!platform) return NextResponse.json({ error: 'Choose MT4 or MT5.' }, { status: 400 });

  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const phone = String(body.phone || '').trim();
  const country = String(body.country || '').trim();
  const discordUsername = String(body.discordUsername || '').trim();
  if (!firstName || !lastName || !phone || !country) {
    return NextResponse.json({ error: 'First name, last name, phone, and country are required.' }, { status: 400 });
  }

  const { checkout } = owned;
  const origin = appOrigin(request);
  const orderFields = {
    userId: authResult.uid,
    idempotencyKey,
    orderKind: checkout.kind,
    offerId: checkout.offerId,
    customerEmail: authResult.email,
    firstName,
    lastName,
    phone,
    country,
    discordUsername,
    challengeType: checkout.title,
    challengeAmount: checkout.amountLabel,
    tierName: checkout.tierName,
    platform,
    addOns: [],
    originalPrice: checkout.price,
    totalAmount: checkout.price,
    expectedAmountCents: Math.round(checkout.price * 100),
    currency: 'usd',
    paymentMethod: 'card',
    paymentStatus: 'pending',
    status: 'pending',
    handoffStatus: 'pending',
  };

  const existingSnap = await db.collection('card-orders').where('idempotencyKey', '==', idempotencyKey).limit(1).get();
  let orderId: string;
  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    if (existing.data().userId !== authResult.uid) {
      return NextResponse.json({ error: 'Unable to start card checkout.' }, { status: 409 });
    }
    const previousUrl = String(existing.data().checkoutUrl || '');
    if (previousUrl && portalCheckoutUrl(previousUrl, portal)) {
      return NextResponse.json({ checkoutUrl: previousUrl, orderId: existing.id });
    }
    orderId = existing.id;
    await existing.ref.update({ ...orderFields, updatedAt: Timestamp.now() });
  } else {
    const created = await db.collection('card-orders').add({
      ...orderFields,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    orderId = created.id;
  }

  const handoffBody = {
    idempotencyKey,
    localOrderId: orderId,
    orderKind: checkout.kind,
    offerId: checkout.offerId,
    userId: authResult.uid,
    firstName,
    lastName,
    email: authResult.email,
    phone,
    country,
    discordUsername,
    challengeType: checkout.title,
    challengeAmount: checkout.amountLabel,
    tierName: checkout.tierName,
    platform,
    addOns: [],
    originalPrice: checkout.price,
    expectedAmount: checkout.price,
    expectedAmountCents: Math.round(checkout.price * 100),
    currency: 'usd',
    returnUrl: `${origin}/dashboard/vip?offer=card`,
    cancelUrl: `${origin}/dashboard/vip`,
  };

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
      console.error('VIP offer payment portal handoff failed', response.status);
      await db.collection('card-orders').doc(orderId).update({
        handoffStatus: 'failed',
        updatedAt: Timestamp.now(),
      });
      return NextResponse.json(
        { error: 'Card checkout is unavailable right now. You can pay with crypto, or try the card payment again in a moment.' },
        { status: 502 }
      );
    }
    await db.collection('card-orders').doc(orderId).update({
      handoffStatus: 'sent',
      checkoutUrl,
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ checkoutUrl, orderId });
  } catch (error) {
    console.error('VIP offer payment portal handoff failed', error instanceof Error ? error.message : error);
    await db.collection('card-orders').doc(orderId).update({
      handoffStatus: 'failed',
      updatedAt: Timestamp.now(),
    }).catch(() => undefined);
    return NextResponse.json(
      { error: 'Card checkout is unavailable right now. You can pay with crypto, or try the card payment again in a moment.' },
      { status: 502 }
    );
  }
}
