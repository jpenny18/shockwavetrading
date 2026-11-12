import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/require-admin';
import { buildTestMetricNumbers } from '@/lib/test-accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { accountId: string } };

function accountRef(accountId: string) {
  return db.collection('userMetaApiAccounts').doc(accountId);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = decodeURIComponent(params.accountId || '').trim();
  if (!accountId.startsWith('TEST_')) {
    return NextResponse.json({ error: 'That is not a test account.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.failed !== 'boolean') {
      return NextResponse.json({ error: 'Choose whether the account is failed.' }, { status: 400 });
    }

    const ref = accountRef(accountId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.testAccount !== true) {
      return NextResponse.json({ error: 'Test account not found.' }, { status: 404 });
    }

    const data = snap.data() || {};
    const activeStatus = data.testActiveStatus === 'funded' ? 'funded' : 'active';
    const status = body.failed ? 'failed' : activeStatus;
    const platform = data.platform === 'mt4' ? 'mt4' : 'mt5';
    const accountSize = Number(data.accountSize) || 0;
    const now = Timestamp.now();

    await ref.update({
      status,
      updatedAt: now,
    });
    await db.collection('cachedMetrics').doc(accountId).set({
      accountId,
      ...buildTestMetricNumbers(accountSize, body.failed, platform),
      lastUpdated: now,
    }, { merge: true });

    return NextResponse.json({ accountId, status, failed: body.failed });
  } catch (error) {
    console.error('Error updating test account:', error);
    return NextResponse.json({ error: 'Failed to update the test account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = decodeURIComponent(params.accountId || '').trim();
  if (!accountId.startsWith('TEST_')) {
    return NextResponse.json({ error: 'That is not a test account.' }, { status: 400 });
  }

  try {
    const ref = accountRef(accountId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.testAccount !== true) {
      return NextResponse.json({ error: 'Test account not found.' }, { status: 404 });
    }

    await ref.delete();
    await db.collection('cachedMetrics').doc(accountId).delete();
    return NextResponse.json({ accountId, deleted: true });
  } catch (error) {
    console.error('Error deleting test account:', error);
    return NextResponse.json({ error: 'Failed to delete the test account' }, { status: 500 });
  }
}
