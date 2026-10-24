import { db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { sendAdminNotificationEmail, sendCustomerReceiptEmail } from '@/lib/email';
import {
  VIP_CHECKOUT,
  VIP_RESET_DISCOUNT_PERCENT,
  centsToDollars,
  type VipCustomer,
  type VipOption,
} from '../config';
import { paymentIntentIdOf, type VipCheckoutSession } from './stripe-server';

const SESSIONS = 'vipCheckoutSessions';
const RESET_CODES = 'vipResetCodes';
const ORDERS = 'orders';

export type VipCheckoutDraft = {
  sessionId: string;
  level: string;
  tier: string;
  platform: string;
  amountCents: number;
  originalPrice: number;
  chargedPrice: number;
  resetCode: string | null;
  resetCodeId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  discordUsername: string;
  status: 'open' | 'completed';
  orderId?: string;
};

type ResetCodeRecord = {
  id: string;
  code: string;
  active: boolean;
  expiresAt?: { toDate: () => Date } | null;
  usageLimit: number | null;
  usageCount: number;
};

function draftFromData(sessionId: string, data: DocumentData): VipCheckoutDraft {
  return {
    sessionId,
    level: String(data.level || ''),
    tier: String(data.tier || ''),
    platform: String(data.platform || ''),
    amountCents: Number(data.amountCents || 0),
    originalPrice: Number(data.originalPrice || 0),
    chargedPrice: Number(data.chargedPrice || 0),
    resetCode: data.resetCode ? String(data.resetCode) : null,
    resetCodeId: data.resetCodeId ? String(data.resetCodeId) : null,
    firstName: String(data.firstName || ''),
    lastName: String(data.lastName || ''),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    country: String(data.country || ''),
    discordUsername: String(data.discordUsername || ''),
    status: data.status === 'completed' ? 'completed' : 'open',
    orderId: data.orderId ? String(data.orderId) : undefined,
  };
}

export async function saveCheckoutDraft(draft: VipCheckoutDraft) {
  await db.collection(SESSIONS).doc(draft.sessionId).set({
    ...draft,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function getCheckoutDraft(sessionId: string): Promise<VipCheckoutDraft | null> {
  const snap = await db.collection(SESSIONS).doc(sessionId).get();
  if (!snap.exists) return null;
  return draftFromData(sessionId, snap.data() || {});
}

export async function saveCheckoutCustomer(sessionId: string, customer: VipCustomer) {
  await db.collection(SESSIONS).doc(sessionId).set(
    {
      platform: customer.platform,
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      email: customer.email.trim(),
      phone: customer.phone.trim(),
      country: customer.country.trim(),
      discordUsername: customer.discordUsername?.trim() || '',
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function validateResetCode(rawCode: string): Promise<
  | { ok: true; id: string; code: string; percent: number }
  | { ok: false; error: string }
> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return { ok: false, error: 'Invalid reset code' };
  }

  const snap = await db.collection(RESET_CODES).where('code', '==', code).limit(1).get();
  if (snap.empty) return { ok: false, error: 'Invalid reset code' };

  const record = { id: snap.docs[0].id, ...snap.docs[0].data() } as ResetCodeRecord;
  if (!record.active) return { ok: false, error: 'This reset code is inactive' };
  if (record.expiresAt && record.expiresAt.toDate() < new Date()) {
    return { ok: false, error: 'This reset code has expired' };
  }
  if (record.usageLimit !== null && record.usageLimit !== undefined && record.usageCount >= record.usageLimit) {
    return { ok: false, error: 'This reset code has reached its usage limit' };
  }

  return { ok: true, id: record.id, code, percent: VIP_RESET_DISCOUNT_PERCENT };
}

async function findOrderIdByPaymentIntent(paymentIntentId: string): Promise<string | null> {
  const snap = await db.collection(ORDERS).where('paymentIntentId', '==', paymentIntentId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function resolveCheckoutDraft(session: VipCheckoutSession): Promise<VipCheckoutDraft | null> {
  const stored = await getCheckoutDraft(session.id);
  if (stored) return stored;
  const { vipOptionByAmountCents } = await import('../config');
  if (typeof session.amount_total !== 'number') return null;
  const option = vipOptionByAmountCents(session.amount_total);
  if (!option) return null;
  const meta = session.metadata || {};
  return {
    sessionId: session.id,
    level: option.level,
    tier: option.name,
    platform: String(meta.platform || ''),
    amountCents: session.amount_total,
    originalPrice: option.price,
    chargedPrice: centsToDollars(session.amount_total),
    resetCode: null,
    resetCodeId: null,
    firstName: String(meta.first_name || ''),
    lastName: String(meta.last_name || ''),
    email: session.customer_details?.email || session.customer_email || String(meta.email || ''),
    phone: String(meta.phone || ''),
    country: String(meta.country || ''),
    discordUsername: String(meta.discord || ''),
    status: 'open',
  };
}

export async function recordPaidVipOrder(session: VipCheckoutSession, draft: VipCheckoutDraft, option: VipOption) {
  if (session.amount_total !== draft.amountCents) {
    throw new Error('Paid amount does not match this VIP checkout');
  }

  const paymentIntentId = paymentIntentIdOf(session);
  const existingId = draft.orderId || (await findOrderIdByPaymentIntent(paymentIntentId));
  if (existingId) {
    return { orderId: existingId, alreadyRecorded: true };
  }

  const email = draft.email || session.customer_details?.email || session.customer_email || '';
  const now = Timestamp.now();
  const order = {
    userId: null,
    customerEmail: email,
    firstName: draft.firstName,
    lastName: draft.lastName,
    phone: draft.phone,
    country: draft.country,
    discordUsername: draft.discordUsername,
    challengeType: VIP_CHECKOUT.challengeType,
    challengeAmount: option.level,
    platform: draft.platform,
    addOns: draft.resetCode ? ['reset-account'] : [],
    resetCode: draft.resetCode,
    originalAmount: draft.originalPrice,
    totalAmount: draft.chargedPrice,
    paymentMethod: 'card' as const,
    paymentStatus: 'completed' as const,
    paymentIntentId,
    transactionId: session.id,
    createdAt: now,
    updatedAt: now,
  };

  const orderRef = await db.collection(ORDERS).add(order);

  if (draft.resetCodeId) {
    await db.collection(RESET_CODES).doc(draft.resetCodeId).update({
      usageCount: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    });
  }

  await db.collection(SESSIONS).doc(session.id).set(
    { status: 'completed', orderId: orderRef.id, updatedAt: Timestamp.now() },
    { merge: true }
  );

  const stamped = {
    ...order,
    id: orderRef.id,
    createdAt: { toDate: () => now.toDate() },
    updatedAt: { toDate: () => now.toDate() },
  };

  try {
    const emailOrder = stamped as unknown as Parameters<typeof sendAdminNotificationEmail>[0];
    await Promise.all([sendAdminNotificationEmail(emailOrder), sendCustomerReceiptEmail(emailOrder)]);
  } catch (error) {
    console.error('VIP order email failed:', error instanceof Error ? error.message : error);
  }

  return { orderId: orderRef.id, alreadyRecorded: false };
}
