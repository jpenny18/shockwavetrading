export type VipStripeSession = {
  canConfirm?: boolean;
  total?: { total?: { amount?: string } };
};

export type VipStripeActions = {
  getSession: () => VipStripeSession;
  confirm: (options?: {
    redirect?: 'if_required' | 'always';
    email?: string;
    name?: string;
  }) => Promise<{ type: 'error'; error?: { message?: string } } | { type: 'success' }>;
};

type VipPaymentElement = {
  mount: (target: Element | string) => void;
  unmount: () => void;
};

export type VipStripeCheckout = {
  loadActions: () => Promise<
    | { type: 'success'; actions: VipStripeActions }
    | { type: 'error'; error?: { message?: string } }
  >;
  createPaymentElement: (options?: { layout?: 'tabs' | 'accordion' | 'auto' }) => VipPaymentElement;
  on: (event: 'change', handler: (session: VipStripeSession) => void) => void;
};

type VipStripeFactory = {
  initCheckoutElementsSdk: (options: {
    clientSecret: string;
    elementsOptions?: { appearance?: Record<string, unknown> };
  }) => VipStripeCheckout;
};

type StripeJsLoader = (publishableKey: string) => VipStripeFactory;

function readStripeLoader(): StripeJsLoader | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Stripe?: StripeJsLoader }).Stripe;
}

// Checkout Sessions + Payment Element require a named Stripe.js release.
// The plain v3 build throws unless it is Basil or newer. Endive matches the
// current embedded Elements guide and stays off the host app's Stripe.js script.
const STRIPE_JS_URL = 'https://js.stripe.com/endive/stripe.js';

let stripePromise: Promise<VipStripeFactory> | null = null;

export function loadVipStripe(publishableKey: string): Promise<VipStripeFactory> {
  if (!publishableKey) {
    return Promise.reject(new Error('VIPPK is not set. Add the VIP Stripe publishable key to .env.'));
  }
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      const finish = () => {
        const Stripe = readStripeLoader();
        if (!Stripe) {
          stripePromise = null;
          reject(new Error('Stripe.js failed to load'));
          return;
        }
        const stripe = Stripe(publishableKey);
        if (typeof stripe.initCheckoutElementsSdk !== 'function') {
          stripePromise = null;
          reject(new Error('This Stripe.js build does not support the embedded Payment Element.'));
          return;
        }
        resolve(stripe);
      };

      const existing = document.querySelector<HTMLScriptElement>('script[data-vip-stripe="endive"]');
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          finish();
          return;
        }
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', () => reject(new Error('Stripe.js failed to load')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = STRIPE_JS_URL;
      script.async = true;
      script.dataset.vipStripe = 'endive';
      script.onload = () => {
        script.dataset.loaded = 'true';
        finish();
      };
      script.onerror = () => {
        stripePromise = null;
        reject(new Error('Stripe.js failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return stripePromise;
}
