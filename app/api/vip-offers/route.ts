import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { authenticateResetRequest } from '@/lib/reset-order-server';
import {
  VIP_CUSTOM_OFFERS_COLLECTION,
  timeToDate,
  timeToMillis,
  type VipCustomOfferRecord
} from '@/lib/vip-offers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serializeOffer(id: string, data: FirebaseFirestore.DocumentData): VipCustomOfferRecord & { id: string } {
  return {
    id,
    ...(data as VipCustomOfferRecord),
    expiresAt: timeToDate(data.expiresAt)?.toISOString() || null,
    createdAt: timeToDate(data.createdAt)?.toISOString() || null,
    updatedAt: timeToDate(data.updatedAt)?.toISOString() || null,
    paymentSubmittedAt: timeToDate(data.paymentSubmittedAt)?.toISOString() || null,
    paymentCompletedAt: timeToDate(data.paymentCompletedAt)?.toISOString() || null,
    termsAcceptedAt: timeToDate(data.termsAcceptedAt)?.toISOString() || null
  };
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateResetRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const snapshot = await db.collection(VIP_CUSTOM_OFFERS_COLLECTION).where('userId', '==', authResult.uid).get();
    const offers = snapshot.docs
      .map((entry) => serializeOffer(entry.id, entry.data()))
      .filter((offer) => offer.status !== 'revoked')
      .sort((a, b) => timeToMillis(b.createdAt) - timeToMillis(a.createdAt));
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error loading VIP offers:', error);
    return NextResponse.json({ error: 'Could not load offers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateResetRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  const offerId = String(body?.offerId || '').trim();
  if (!offerId || body?.accepted !== true) {
    return NextResponse.json({ error: 'Offer terms could not be saved.' }, { status: 400 });
  }

  try {
    const ref = db.collection(VIP_CUSTOM_OFFERS_COLLECTION).doc(offerId);
    const snap = await ref.get();
    if (!snap.exists || snap.get('userId') !== authResult.uid || snap.get('status') === 'revoked') {
      return NextResponse.json({ error: 'This offer is no longer available.' }, { status: 404 });
    }
    if (!snap.get('termsAcceptedAt')) {
      await ref.update({ termsAcceptedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error accepting VIP offer terms:', error);
    return NextResponse.json({ error: 'Offer terms could not be saved.' }, { status: 500 });
  }
}
