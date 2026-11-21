import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { auth as adminAuth, db, getSessionClaims } from '@/lib/firebase-admin';
import {
  VIP_CUSTOM_OFFERS_COLLECTION,
  offerExpiryDate,
  parseVipOfferDraft,
  timeToDate,
  timeToMillis,
  type VipCustomOfferRecord,
  type VipOfferDraft
} from '@/lib/vip-offers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) return null;
  try {
    const claims = await getSessionClaims(sessionCookie);
    return claims.admin === true ? claims : null;
  } catch {
    return null;
  }
}

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

async function listOffers() {
  const snapshot = await db.collection(VIP_CUSTOM_OFFERS_COLLECTION).get();
  return snapshot.docs
    .map((entry) => serializeOffer(entry.id, entry.data()))
    .sort((a, b) => timeToMillis(b.createdAt) - timeToMillis(a.createdAt));
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ offers: await listOffers() });
  } catch (error) {
    console.error('Error listing VIP offers:', error);
    return NextResponse.json({ error: 'Could not load offers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Offer details are missing.' }, { status: 400 });
  }

  const action = String(body.action || '');
  const offerId = String(body.offerId || '').trim();

  try {
    if (action === 'revoke' || action === 'paid') {
      if (!offerId) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
      const ref = db.collection(VIP_CUSTOM_OFFERS_COLLECTION).doc(offerId);
      const existing = await ref.get();
      if (!existing.exists) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
      if (action === 'revoke') {
        await ref.update({ status: 'revoked', updatedAt: Timestamp.now() });
      } else {
        await ref.update({
          paymentStatus: 'completed',
          paymentCompletedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      return NextResponse.json({ offers: await listOffers() });
    }

    if (action !== 'create' && action !== 'update') {
      return NextResponse.json({ error: 'Offer details are missing.' }, { status: 400 });
    }

    const draft = body.draft;
    if (!draft || typeof draft !== 'object' || !Array.isArray((draft as VipOfferDraft).accounts)) {
      return NextResponse.json({ error: 'Offer details are missing.' }, { status: 400 });
    }
    const parsed = parseVipOfferDraft(draft as VipOfferDraft);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const userId = String(body.userId || '').trim();
    if (!userId) return NextResponse.json({ error: 'Search for the client before sending the offer.' }, { status: 400 });
    const userRecord = await adminAuth.getUser(userId);
    const userEmail = userRecord.email || '';
    if (!userEmail) return NextResponse.json({ error: 'That account does not have an email.' }, { status: 400 });

    const profileSnap = await db.collection('users').doc(userId).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    const recipientName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || userRecord.displayName || userEmail;

    let existing: FirebaseFirestore.DocumentData | null = null;
    let existingCreated: Date | null = null;
    if (action === 'update') {
      if (!offerId) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
      const snap = await db.collection(VIP_CUSTOM_OFFERS_COLLECTION).doc(offerId).get();
      if (!snap.exists) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
      existing = snap.data() || {};
      existingCreated = timeToDate(existing.createdAt);
      if (existing.paymentStatus && existing.paymentStatus !== 'unpaid') {
        parsed.value.price = Number(existing.price);
        parsed.value.refreshedAllocation = Number(existing.refreshedAllocation);
        if (Array.isArray(existing.accounts)) parsed.value.accounts = existing.accounts;
      }
    }

    const createdAt = existingCreated || new Date();
    const expiresAt = new Date(createdAt.getTime() + parsed.value.validHours * 60 * 60 * 1000);
    const record = {
      ...parsed.value,
      userId,
      userEmail,
      recipientName,
      expiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: Timestamp.now()
    };

    if (action === 'create') {
      await db.collection(VIP_CUSTOM_OFFERS_COLLECTION).add({
        ...record,
        status: 'proposed',
        paymentStatus: 'unpaid',
        createdBy: 'admin',
        createdAt: Timestamp.now()
      });
    } else {
      await db.collection(VIP_CUSTOM_OFFERS_COLLECTION).doc(offerId).update(record);
    }

    return NextResponse.json({ offers: await listOffers(), expiresAt: offerExpiryDate({ expiresAt, validHours: parsed.value.validHours })?.toISOString() || null });
  } catch (error) {
    console.error('Error saving VIP offer:', error);
    const missing = typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'auth/user-not-found';
    return NextResponse.json({ error: missing ? 'That user account was not found.' : 'Could not save the offer.' }, { status: missing ? 404 : 500 });
  }
}
