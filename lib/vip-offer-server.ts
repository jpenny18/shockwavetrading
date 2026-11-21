import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import {
  VIP_CUSTOM_OFFER_KIND,
  VIP_CUSTOM_OFFERS_COLLECTION,
  VIP_PORTAL_OFFER_KIND,
  offerIsExpired,
  type VipCheckoutKind
} from '@/lib/vip-offers';

export type OwnedVipCheckout = {
  kind: VipCheckoutKind;
  offerId: string;
  userId: string;
  price: number;
  amountLabel: string;
  title: string;
  tierName: string;
};

type Failure = { ok: false; error: string; status: number };

function positiveMoney(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100) / 100;
}

export function normalizeCheckoutPlatform(value: unknown): 'MT4' | 'MT5' | null {
  const platform = String(value || '').trim().toUpperCase();
  if (platform === 'MT4' || platform === 'MT5') return platform;
  return null;
}

export async function loadOwnedVipCheckout(
  uid: string,
  kind: unknown,
  offerId: unknown
): Promise<{ ok: true; checkout: OwnedVipCheckout } | Failure> {
  if (kind === VIP_PORTAL_OFFER_KIND) {
    const snap = await db.collection('vipActivations').doc(uid).get();
    if (!snap.exists) return { ok: false, error: 'This allocation offer is no longer available.', status: 404 };
    const data = snap.data() || {};
    if (data.userId && data.userId !== uid) return { ok: false, error: 'This allocation offer is no longer available.', status: 404 };
    if (data.paymentStatus === 'completed') return { ok: false, error: 'This allocation is already paid.', status: 409 };
    if (data.paymentStatus === 'pending') return { ok: false, error: 'A payment for this allocation is already in review.', status: 409 };
    const price = positiveMoney(data.price);
    if (price == null) return { ok: false, error: 'This allocation does not have a payable price.', status: 400 };
    const amountLabel = String(data.accountSize || 'VIP').trim() || 'VIP';
    const tierName = String(data.tierName || 'VIP').trim() || 'VIP';
    return {
      ok: true,
      checkout: {
        kind: VIP_PORTAL_OFFER_KIND,
        offerId: uid,
        userId: uid,
        price,
        amountLabel,
        title: `${amountLabel} ${tierName} allocation`,
        tierName
      }
    };
  }

  if (kind !== VIP_CUSTOM_OFFER_KIND) {
    return { ok: false, error: 'This offer could not be opened.', status: 400 };
  }

  const id = String(offerId || '').trim();
  if (!id || id.length > 200) return { ok: false, error: 'This offer could not be opened.', status: 400 };
  const snap = await db.collection(VIP_CUSTOM_OFFERS_COLLECTION).doc(id).get();
  if (!snap.exists) return { ok: false, error: 'This offer is no longer available.', status: 404 };
  const data = snap.data() || {};
  if (data.userId !== uid || data.status === 'revoked') {
    return { ok: false, error: 'This offer is no longer available.', status: 404 };
  }
  if (data.paymentStatus === 'completed') return { ok: false, error: 'This offer is already paid.', status: 409 };
  if (data.paymentStatus === 'pending') return { ok: false, error: 'A payment for this offer is already in review.', status: 409 };
  if (offerIsExpired(data)) return { ok: false, error: 'This offer has expired.', status: 410 };
  const price = positiveMoney(data.price);
  if (price == null) return { ok: false, error: 'This offer does not have a payable price.', status: 400 };

  return {
    ok: true,
    checkout: {
      kind: VIP_CUSTOM_OFFER_KIND,
      offerId: id,
      userId: uid,
      price,
      amountLabel: String(data.headline || data.packageName || 'Private VIP').trim(),
      title: String(data.packageName || data.headline || 'Private VIP offer').trim(),
      tierName: String(data.eyebrow || 'Private offer').trim()
    }
  };
}

export function pricesMatch(expectedAmount: unknown, price: number): boolean {
  if (expectedAmount == null || expectedAmount === '') return true;
  const expectedCents = Math.round(Number(expectedAmount) * 100);
  return Number.isFinite(expectedCents) && expectedCents === Math.round(price * 100);
}

export async function markVipCheckoutPending(checkout: OwnedVipCheckout, cryptoOrderId: string): Promise<void> {
  const ref = checkout.kind === VIP_PORTAL_OFFER_KIND
    ? db.collection('vipActivations').doc(checkout.userId)
    : db.collection(VIP_CUSTOM_OFFERS_COLLECTION).doc(checkout.offerId);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    if (snap.get('paymentStatus') === 'completed') return;
    transaction.update(ref, {
      paymentStatus: 'pending',
      cryptoOrderId,
      paymentSubmittedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  });
}
