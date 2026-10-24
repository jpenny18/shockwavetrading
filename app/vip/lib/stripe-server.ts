import { VIP_CHECKOUT, type VipCustomer } from '../config';

const STRIPE_API = 'https://api.stripe.com/v1';

export function vipSecretKey(): string {
  const key = process.env.VIPSK;
  if (!key) {
    throw new Error('VIPSK is not set. Add the VIP Stripe secret key to .env.');
  }
  return key;
}

export function vipPublishableKey(): string {
  return process.env.VIPPK || '';
}

type StripeErrorBody = {
  error?: { message?: string };
};

export async function stripeRequest<T>(path: string, params?: URLSearchParams, method = 'POST'): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${vipSecretKey()}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params?.toString(),
    cache: 'no-store',
  });

  const data = (await response.json()) as T & StripeErrorBody;
  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe request failed');
  }
  return data;
}

export type VipCheckoutSession = {
  id: string;
  client_secret?: string | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id?: string } | null;
};

export function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function createVipCheckoutSession(amountCents: number, origin: string): Promise<VipCheckoutSession> {
  const params = new URLSearchParams();
  params.set('ui_mode', 'elements');
  params.set('mode', 'payment');
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', VIP_CHECKOUT.currency);
  params.set('line_items[0][price_data][unit_amount]', String(amountCents));
  params.set('line_items[0][price_data][product_data][name]', VIP_CHECKOUT.stripeProductName);
  params.set('line_items[0][price_data][product_data][description]', 'One-time activation fee');
  params.set('return_url', `${origin}${VIP_CHECKOUT.returnPath}?session_id={CHECKOUT_SESSION_ID}`);
  params.set('billing_address_collection', 'auto');
  params.set('integration_identifier', VIP_CHECKOUT.integrationId);

  return stripeRequest<VipCheckoutSession>('/checkout/sessions', params);
}

export async function updateVipCheckoutContact(sessionId: string, customer: VipCustomer) {
  const params = new URLSearchParams();
  params.set('customer_email', customer.email.trim());
  params.set('metadata[email]', customer.email.trim());
  params.set('metadata[phone]', customer.phone.trim());
  params.set('metadata[first_name]', customer.firstName.trim());
  params.set('metadata[last_name]', customer.lastName.trim());
  params.set('metadata[country]', customer.country.trim());
  params.set('metadata[discord]', customer.discordUsername?.trim() || '');
  // Clear allocation details if an older session stored them.
  params.set('metadata[level]', '');
  params.set('metadata[tier]', '');
  params.set('metadata[platform]', '');
  params.set('metadata[source]', '');

  try {
    return await stripeRequest<VipCheckoutSession>(`/checkout/sessions/${sessionId}`, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/email/i.test(message)) throw error;
    params.delete('customer_email');
    return stripeRequest<VipCheckoutSession>(`/checkout/sessions/${sessionId}`, params);
  }
}

export async function retrieveVipCheckoutSession(sessionId: string): Promise<VipCheckoutSession> {
  return stripeRequest<VipCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`,
    undefined,
    'GET'
  );
}

export function isCheckoutSessionId(value: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(value);
}

export function paymentIntentIdOf(session: VipCheckoutSession): string {
  if (typeof session.payment_intent === 'string' && session.payment_intent) {
    return session.payment_intent;
  }
  if (session.payment_intent && typeof session.payment_intent === 'object' && session.payment_intent.id) {
    return session.payment_intent.id;
  }
  return session.id;
}
