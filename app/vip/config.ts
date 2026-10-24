/**
 * VIP checkout catalog and integration settings.
 *
 * Copy `app/vip` into another Next.js App Router project, then set these
 * environment variables in `.env` (server-only, do not prefix them with
 * NEXT_PUBLIC_ — the publishable key is passed from the server page):
 *
 *   VIPSK  Stripe secret key for this checkout
 *   VIPPK  Stripe publishable key for this checkout
 *
 * Card payments use Stripe Checkout Sessions with the Payment Element
 * (`ui_mode=elements`). They do not use the host app's other Stripe keys.
 * Stripe only receives contact details. Allocation, platform, and price
 * records live in this app's database.
 *
 * Host wiring lives in `lib/records.ts` (order record + receipt email) and the
 * crypto block, which uses the host `CryptoPayment` component.
 */

export const VIP_ENV = {
  secretKey: 'VIPSK',
  publishableKey: 'VIPPK',
} as const;

export const VIP_CHECKOUT = {
  integrationId: 'vip_checkout',
  currency: 'usd',
  returnPath: '/vip/return',
  pendingPath: '/vip/pending',
  challengeType: 'VIP Activation',
  /** Shown on the Stripe charge. Does not include allocation size, tier, or platform. */
  stripeProductName: 'VIP Activation',
} as const;

export const VIP_RESET_DISCOUNT_PERCENT = 20;

export function vipChargeCents(priceDollars: number, resetApplied: boolean): number {
  const fullCents = Math.round(priceDollars * 100);
  if (!resetApplied) return fullCents;
  return Math.round((fullCents * (100 - VIP_RESET_DISCOUNT_PERCENT)) / 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export interface VipOption {
  level: string;
  name: string;
  price: number;
  maxDrawdown: string;
  dailyDrawdown: string;
  features: string[];
}

export const VIP_OPTIONS: VipOption[] = [
  {
    level: '$1M',
    name: 'Professional',
    price: 5499,
    maxDrawdown: '$150,000',
    dailyDrawdown: '$80,000',
    features: [
      '$1,000,000 Simulated Capital',
      '15% Max Drawdown ($150,000)',
      '8% Daily Drawdown ($80,000)',
      'Up to 1:100 Leverage',
      '80% Starting Profit Split',
      'Dedicated Account Manager',
    ],
  },
  {
    level: '$2M',
    name: 'Executive',
    price: 9999,
    maxDrawdown: '$300,000',
    dailyDrawdown: '$160,000',
    features: [
      '$2,000,000 Simulated Capital',
      '15% Max Drawdown ($300,000)',
      '8% Daily Drawdown ($160,000)',
      'Up to 1:100 Leverage',
      '80% Starting Profit Split',
      'Dedicated Account Manager',
    ],
  },
  {
    level: '$3M',
    name: 'Institutional',
    price: 14999,
    maxDrawdown: '$450,000',
    dailyDrawdown: '$240,000',
    features: [
      '$3,000,000 Simulated Capital',
      '15% Max Drawdown ($450,000)',
      '8% Daily Drawdown ($240,000)',
      'Up to 1:100 Leverage',
      '80% Starting Profit Split',
      'Dedicated Account Manager',
    ],
  },
];

export const VIP_PLATFORMS = ['MT4', 'MT5'] as const;

export function vipOptionByLevel(level: string): VipOption | undefined {
  return VIP_OPTIONS.find((option) => option.level === level);
}

export function vipOptionByAmountCents(amountCents: number): VipOption | undefined {
  return VIP_OPTIONS.find((option) => option.price * 100 === amountCents);
}

export interface VipCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  platform: string;
  discordUsername?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateVipCustomer(input: Partial<VipCustomer>): string | null {
  if (!input.firstName?.trim()) return 'First name is required';
  if (!input.lastName?.trim()) return 'Last name is required';
  if (!input.email?.trim() || !EMAIL_PATTERN.test(input.email.trim())) return 'A valid email is required';
  if (!input.phone?.trim()) return 'Phone number is required';
  if (!input.country?.trim()) return 'Country is required';
  if (!input.platform || !VIP_PLATFORMS.includes(input.platform as (typeof VIP_PLATFORMS)[number])) {
    return 'Platform selection is required';
  }
  return null;
}
