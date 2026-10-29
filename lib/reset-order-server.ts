import { auth, db } from '@/lib/firebase-admin';
import {
  getResetQuote,
  normalizeResetCustomer,
  resetCustomerFieldErrors,
  resetPriceCents,
  type ResetAccountInput,
  type ResetCustomer,
  type ResetQuote,
} from '@/lib/reset-pricing';

export interface OwnedReset {
  accountId: string;
  userId: string;
  step: number | null;
  status: string;
  quote: ResetQuote;
}

type Failure = { ok: false; error: string; status: number };

export async function authenticateResetRequest(request: Request): Promise<
  { ok: true; uid: string; email: string } | Failure
> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) return { ok: false, error: 'Sign in again before paying.', status: 401 };

  try {
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email?.trim() || '';
    if (!decoded.uid || !email) {
      return { ok: false, error: 'Your account needs an email before checkout.', status: 400 };
    }
    return { ok: true, uid: decoded.uid, email };
  } catch {
    return { ok: false, error: 'Sign in again before paying.', status: 401 };
  }
}

export async function loadOwnedReset(userId: string, accountId: string): Promise<
  { ok: true; reset: OwnedReset } | Failure
> {
  const id = String(accountId || '').trim();
  if (!id || id.length > 200 || id.startsWith('PLACEHOLDER_')) {
    return { ok: false, error: 'Choose a real trading account to reset.', status: 400 };
  }

  const snapshot = await db.collection('userMetaApiAccounts').where('userId', '==', userId).get();
  const match = snapshot.docs.find((entry) => String(entry.data().accountId || '') === id);
  if (!match) {
    return { ok: false, error: 'That trading account was not found on your profile.', status: 404 };
  }

  const data = match.data() as ResetAccountInput & { accountId?: string; status?: string; step?: number };
  const quote = getResetQuote(data);
  if (!quote) {
    return {
      ok: false,
      error: 'A reset price is not available for this account size. Contact support and include the account id.',
      status: 400,
    };
  }

  const stepNumber = Number(data.step);
  return {
    ok: true,
    reset: {
      accountId: id,
      userId,
      step: Number.isFinite(stepNumber) ? stepNumber : null,
      status: String(data.status || ''),
      quote,
    },
  };
}

export function customerForReset(
  input: Partial<ResetCustomer> | null | undefined,
  email: string,
  expectedAmount: unknown,
  quote: ResetQuote
): { ok: true; customer: ResetCustomer } | Failure {
  const customer = normalizeResetCustomer(input, email);
  const fieldErrors = resetCustomerFieldErrors(customer);
  const firstError = Object.values(fieldErrors)[0];
  if (firstError) return { ok: false, error: firstError, status: 400 };

  if (expectedAmount != null && expectedAmount !== '') {
    const cents = resetPriceCents(Number(expectedAmount));
    if (!Number.isFinite(cents) || cents !== resetPriceCents(quote.price)) {
      return { ok: false, error: 'This reset price has changed. Close the window and try again.', status: 409 };
    }
  }

  return { ok: true, customer };
}
