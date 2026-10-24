import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.CHECKOUT_HANDOFF_SECRET;
  const portal = process.env.PAYMENT_PORTAL_URL?.replace(/\/$/, '');
  if (!secret || secret.length < 16 || !portal) {
    return NextResponse.json({ error: 'Payment portal is not configured' }, { status: 503 });
  }

  const body = await request.json();
  const response = await fetch(`${portal}/checkout/api/handoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) console.error('Payment portal handoff failed', response.status, data);
  return NextResponse.json(data, { status: response.status });
}
