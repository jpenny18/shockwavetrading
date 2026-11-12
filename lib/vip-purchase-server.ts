import { db } from '@/lib/firebase-admin';
import { vipPurchaseFromInput, type VipDiscount } from '@/lib/vip-purchase';

export async function loadVipDiscount(code: string): Promise<
  { ok: true; discount: VipDiscount | null } | { ok: false; error: string; status: number }
> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: true, discount: null };
  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    return { ok: false, error: 'Invalid discount code', status: 400 };
  }

  const snapshot = await db.collection('discounts').where('code', '==', normalized).where('active', '==', true).limit(1).get();
  if (snapshot.empty) return { ok: false, error: 'Invalid discount code', status: 400 };

  const data = snapshot.docs[0].data();
  const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;
  if (expiresAt && new Date() > expiresAt) {
    return { ok: false, error: 'This code has expired', status: 400 };
  }
  if (data.usageLimit != null && Number(data.usageCount || 0) >= Number(data.usageLimit)) {
    return { ok: false, error: 'This code has reached its usage limit', status: 400 };
  }

  const type = data.type === 'fixed' ? 'fixed' : data.type === 'percentage' ? 'percentage' : '';
  const value = Number(data.value);
  if (!type || !Number.isFinite(value) || value < 0) {
    return { ok: false, error: 'Invalid discount code', status: 400 };
  }

  return {
    ok: true,
    discount: { id: snapshot.docs[0].id, code: normalized, type, value },
  };
}

export async function resolveVipPurchase(input: {
  level: unknown;
  platform: unknown;
  discountCode?: unknown;
  expectedAmount?: unknown;
}) {
  const discountResult = await loadVipDiscount(String(input.discountCode || ''));
  if (!discountResult.ok) return discountResult;
  return vipPurchaseFromInput({
    level: input.level,
    platform: input.platform,
    discount: discountResult.discount,
    expectedAmount: input.expectedAmount,
  });
}
