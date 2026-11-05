export const META_PIXEL_IDS = ['2350128719094802', '1542635254297665'] as const;

const pixelInits = META_PIXEL_IDS.map((id) => `fbq('init', '${id}');`).join('\n');

export const META_PIXEL_BOOTSTRAP = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${pixelInits}
fbq('track', 'PageView');`;

export const META_PIXEL_NOSCRIPT = META_PIXEL_IDS
  .map((id) => `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1" alt="" />`)
  .join('');

type MetaPixelCommand = (
  command: 'track' | 'init',
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) => void;

declare global {
  interface Window {
    fbq?: MetaPixelCommand;
    _fbq?: MetaPixelCommand;
  }
}

export type CheckoutPaymentMethod = 'card' | 'crypto';

type CheckoutEventInput = {
  paymentMethod: CheckoutPaymentMethod;
  challengeType: string;
  accountSize: string;
  value: number;
  platform?: string | null;
};

const PRODUCT_NAMES: Record<string, string> = {
  Standard: 'Shockwave Challenge',
  '1-Step': 'Shockwave 1-Step',
  Instant: 'Shockwave Instant',
  Gauntlet: 'Shockwave Gauntlet',
};

const track = (
  eventName: 'PageView' | 'InitiateCheckout' | 'Purchase',
  params?: Record<string, unknown>,
  eventId?: string
) => {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    if (params && eventId) {
      window.fbq('track', eventName, params, { eventID: eventId });
      return;
    }
    if (params) {
      window.fbq('track', eventName, params);
      return;
    }
    window.fbq('track', eventName);
  } catch {
    // A blocked or unavailable pixel must not affect checkout.
  }
};

const checkoutParams = (input: CheckoutEventInput): Record<string, unknown> | null => {
  const value = Math.round(input.value * 100) / 100;
  if (!Number.isFinite(value) || value < 0) return null;

  const sizeId = input.accountSize.replace(/[^0-9]/g, '') || 'custom';
  const contentId = `${input.challengeType}-${sizeId}`.toLowerCase();
  const productName = PRODUCT_NAMES[input.challengeType] || input.challengeType;
  const params: Record<string, unknown> = {
    value,
    currency: 'USD',
    content_name: `${productName} ${input.accountSize}`.trim(),
    content_category: input.paymentMethod,
    content_ids: [contentId],
    content_type: 'product',
    num_items: 1,
    contents: [{ id: contentId, quantity: 1, item_price: value }],
    payment_method: input.paymentMethod,
  };

  if (input.platform) params.platform = input.platform;
  return params;
};

export const trackMetaPageView = () => {
  track('PageView');
};

export const trackInitiateCheckout = (input: CheckoutEventInput) => {
  const params = checkoutParams(input);
  if (!params) return;
  track('InitiateCheckout', params);
};

export const trackCryptoPurchase = (input: CheckoutEventInput & { orderId: string }) => {
  if (!input.orderId) return;
  const params = checkoutParams({ ...input, paymentMethod: 'crypto' });
  if (!params) return;
  track('Purchase', params, input.orderId);
};
