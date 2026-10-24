import { NextRequest, NextResponse } from 'next/server';
import { config as loadEnv } from 'dotenv';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PORTAL_URL = 'https://www.scxdashboards.com';

function readServerEnv(name: string): string {
  // Computed access stays a runtime lookup. Next can inline process.env.NAME
  // as empty when the variable is missing at build time.
  const current = process.env[name]?.trim();
  if (current) return current;

  const root = process.cwd();
  const local = loadEnv({ path: path.join(root, '.env.local') }).parsed;
  const shared = loadEnv({ path: path.join(root, '.env') }).parsed;
  return (local?.[name] || shared?.[name] || '').trim();
}

export async function POST(request: NextRequest) {
  const secret = readServerEnv('CHECKOUT_HANDOFF_SECRET');
  const portal = (readServerEnv('PAYMENT_PORTAL_URL') || DEFAULT_PORTAL_URL).replace(/\/$/, '');
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
