import { db } from '@/lib/firebase-admin';
import {
  sanitizeResetPriceConfig,
  type ResetPriceConfig,
} from '@/lib/reset-price-config';

const COLLECTION = 'settings';
const DOC_ID = 'reset-prices';

export class ResetPriceUpdateError extends Error {
  status = 400;
}

export async function readResetPriceConfig(): Promise<ResetPriceConfig> {
  const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
  if (!snap.exists) return sanitizeResetPriceConfig(null);
  return sanitizeResetPriceConfig(snap.data());
}

/** Checkout falls back to built-in prices if the override document cannot be read. */
export async function loadResetPriceConfig(): Promise<ResetPriceConfig> {
  try {
    return await readResetPriceConfig();
  } catch (error) {
    console.error('Failed to load reset prices:', error);
    return sanitizeResetPriceConfig(null);
  }
}

export async function updateResetPriceConfig(
  updatedBy: string,
  mutate: (current: ResetPriceConfig) => { ok: true; config: ResetPriceConfig } | { ok: false; error: string }
): Promise<ResetPriceConfig> {
  const ref = db.collection(COLLECTION).doc(DOC_ID);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = sanitizeResetPriceConfig(snap.exists ? snap.data() : null);
    const result = mutate(current);
    if (!result.ok) throw new ResetPriceUpdateError(result.error);

    const updatedAt = new Date().toISOString();
    transaction.set(ref, {
      global: result.config.global,
      users: result.config.users,
      updatedAt,
      updatedBy,
    });
    return { ...result.config, updatedAt, updatedBy };
  });
}
