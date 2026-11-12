import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';
import {
  buildTestMetricNumbers,
  isTestChallengeType,
  resolveTestAccountShape,
} from '@/lib/test-accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function timeToIso(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function publicAccount(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    accountId: String(data.accountId || id),
    userId: String(data.userId || ''),
    email: String(data.customerEmail || ''),
    name: String(data.customerName || ''),
    accountType: String(data.accountType || ''),
    accountSize: Number(data.accountSize) || 0,
    platform: String(data.platform || 'mt5'),
    status: String(data.status || 'active'),
    step: Number(data.step) || 1,
    failed: String(data.status || '') === 'failed',
    createdAt: timeToIso(data.createdAt),
  };
}

async function customerLabel(userId: string) {
  const authUser = await auth.getUser(userId);
  const profileSnap = await db.collection('users').doc(userId).get();
  const profile = profileSnap.exists ? profileSnap.data() || {} : {};
  const email = authUser.email || (typeof profile.email === 'string' ? profile.email : '');
  const fromName = typeof profile.displayName === 'string' ? profile.displayName.trim() : '';
  const combined = `${typeof profile.firstName === 'string' ? profile.firstName : ''} ${typeof profile.lastName === 'string' ? profile.lastName : ''}`.trim();
  return {
    email,
    name: fromName || combined || authUser.displayName || email || userId,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await db.collection('userMetaApiAccounts').where('testAccount', '==', true).get();
    const accounts = snapshot.docs
      .map((entry) => publicAccount(entry.id, entry.data()))
      .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''));
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error listing test accounts:', error);
    return NextResponse.json({ error: 'Failed to load test accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Test account details are missing.' }, { status: 400 });
    }

    const userId = String(body.userId || '').trim();
    const accountType = String(body.accountType || '').trim();
    const accountSize = Number(body.accountSize);
    const platform = body.platform === 'mt4' ? 'mt4' : body.platform === 'mt5' ? 'mt5' : '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
      return NextResponse.json({ error: 'Choose a customer.' }, { status: 400 });
    }
    if (!isTestChallengeType(accountType)) {
      return NextResponse.json({ error: 'Choose a challenge type.' }, { status: 400 });
    }
    if (!platform) {
      return NextResponse.json({ error: 'Choose MT4 or MT5.' }, { status: 400 });
    }

    const shape = resolveTestAccountShape({
      accountType,
      accountSize,
      funded: body.funded === true,
      failed: body.failed === true,
    });
    if (!shape.ok) return NextResponse.json({ error: shape.error }, { status: 400 });

    const customer = await customerLabel(userId);
    const accountId = `TEST_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const now = Timestamp.now();
    const metrics = buildTestMetricNumbers(accountSize, body.failed === true, platform);
    const account = {
      userId,
      accountId,
      accountToken: 'test-account',
      accountType,
      accountSize,
      platform,
      status: shape.status,
      step: shape.step,
      startDate: now,
      createdAt: now,
      updatedAt: now,
      testAccount: true,
      testActiveStatus: shape.testActiveStatus,
      customerEmail: customer.email,
      customerName: customer.name,
      ...(accountType === 'vip' ? { profitSplit: 80 } : {}),
    };

    await db.collection('userMetaApiAccounts').doc(accountId).set(account);
    await db.collection('cachedMetrics').doc(accountId).set({
      accountId,
      ...metrics,
      lastUpdated: now,
    });

    return NextResponse.json({ account: publicAccount(accountId, account) });
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }
    console.error('Error creating test account:', error);
    return NextResponse.json({ error: 'Failed to create the test account' }, { status: 500 });
  }
}
