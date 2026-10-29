import { NextRequest, NextResponse } from 'next/server';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { authenticateResetRequest, customerForReset, loadOwnedReset } from '@/lib/reset-order-server';
import { resetPriceCents, type ResetCustomer } from '@/lib/reset-pricing';

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
    return NextResponse.json({ error: 'Reset details are missing.' }, { status: 400 });
  }

  if (body.termsAccepted !== true || body.freshStartAccepted !== true) {
    return NextResponse.json({ error: 'Accept the fresh start and the terms before paying.' }, { status: 400 });
  }

  const idempotencyKey = String(body.idempotencyKey || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Unable to start card checkout.' }, { status: 400 });
  }

  const owned = await loadOwnedReset(authResult.uid, String(body.accountId || ''));
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const customerInput: Partial<ResetCustomer> = {
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    country: body.country,
    discordUsername: body.discordUsername,
  };
  const customerResult = customerForReset(customerInput, authResult.email, body.expectedAmount, owned.reset.quote);
  if (!customerResult.ok) {
    return NextResponse.json({ error: customerResult.error }, { status: customerResult.status });
  }

  const { quote } = owned.reset;
  const { customer } = customerResult;
  const origin = appOrigin(request);
  const orderFields = {
    userId: authResult.uid,
    idempotencyKey,
    orderKind: 'account-reset',
    resetCategory: quote.category,
    accountId: owned.reset.accountId,
    sourceAccountType: quote.accountType,
    accountSize: quote.accountSize,
    accountStep: owned.reset.step,
    accountStatus: owned.reset.status,
    catalogType: quote.catalogType,
    tierName: quote.tierName,
    customerEmail: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    country: customer.country,
    discordUsername: customer.discordUsername,
    challengeType: quote.challengeType,
    challengeAmount: quote.amountLabel,
    platform: quote.platform,
    addOns: [],
    originalPrice: quote.originalPrice,
    discountPercent: quote.discountPercent,
    totalAmount: quote.price,
    expectedAmountCents: resetPriceCents(quote.price),
    currency: 'usd',
    paymentMethod: 'card',
    paymentStatus: 'pending',
    status: 'pending',
    termsAccepted: true,
    freshStartAccepted: true,
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
    orderKind: 'account-reset',
    userId: authResult.uid,
    accountId: owned.reset.accountId,
    resetCategory: quote.category,
    accountType: quote.accountType,
    accountSize: quote.accountSize,
    accountStep: owned.reset.step,
    accountStatus: owned.reset.status,
    catalogType: quote.catalogType,
    challengeType: quote.challengeType,
    challengeAmount: quote.amountLabel,
    tierName: quote.tierName,
    platform: quote.platform,
    addOns: [],
    originalPrice: quote.originalPrice,
    discountPercent: quote.discountPercent,
    expectedAmount: quote.price,
    expectedAmountCents: resetPriceCents(quote.price),
    currency: 'usd',
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    country: customer.country,
    discordUsername: customer.discordUsername,
    termsAccepted: true,
    freshStartAccepted: true,
    returnUrl: `${origin}/dashboard/accounts?reset=paid`,
    cancelUrl: `${origin}/dashboard/accounts`,
  };

  try {
    const response = await fetch(`${portal}/reset/api/handoff`, {
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
      console.error('Reset payment portal handoff failed', response.status);
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
    console.error('Reset payment portal handoff failed', error instanceof Error ? error.message : error);
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
