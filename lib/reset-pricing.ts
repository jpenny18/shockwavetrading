/**
 * Reset fees for an existing trading account.
 *
 * Challenge (not yet funded): 20% off the one-time fee from PricingTable / the challenge checkout.
 * Funded: the gauntlet activation price itself, with no extra discount.
 * VIP: 20% off the VIP allocation fee. A $1.5M allocation is half of the $3M fee, then 20% off.
 *
 * Keep these tables aligned with:
 * - app/components/PricingTable.tsx
 * - app/challenge/page.tsx calculatePrice
 * - app/gauntlet-activation/page.tsx ACTIVATION_OPTIONS
 * - app/vip/config.ts VIP_OPTIONS + VIP_RESET_DISCOUNT_PERCENT
 */

import { centsToDollars, VIP_OPTIONS, VIP_RESET_DISCOUNT_PERCENT, vipChargeCents } from '@/app/vip/config';
import {
  MAX_CHALLENGE_ACCOUNT_SIZE,
  normalizeVipAccountSize,
  VIP_SIZE_PRESETS,
} from '@/lib/vip-accounts';

export type ResetCategory = 'challenge' | 'funded' | 'vip';
export type ResetCatalogType = 'Standard' | '1-Step' | 'Instant' | 'Gauntlet' | 'Funded' | 'VIP';
export type ResetAccountType = 'standard' | '1-step' | 'instant' | 'gauntlet' | 'vip';

export const CHALLENGE_RESET_DISCOUNT_PERCENT = 20;
const VIP_1_5M_SIZE = 1_500_000;

const CHALLENGE_PRICES: Record<Exclude<ResetAccountType, 'vip'>, Record<number, number>> = {
  standard: {
    5000: 88.5,
    10000: 163.5,
    25000: 283.5,
    50000: 433.5,
    100000: 748.5,
    200000: 1423.5,
    500000: 2848.5,
  },
  '1-step': {
    5000: 97.5,
    10000: 178.5,
    25000: 298.5,
    50000: 433.5,
    100000: 853.5,
    200000: 1483.5,
    500000: 2998.5,
  },
  instant: {
    5000: 448.5,
    10000: 823.5,
    25000: 1123.5,
    50000: 1348.5,
    100000: 2698.5,
    200000: 5248.5,
    500000: 10498.5,
  },
  gauntlet: {
    10000: 19.99,
    25000: 19.99,
    50000: 19.99,
    100000: 19.99,
    200000: 19.99,
    500000: 19.99,
  },
};

const FUNDED_ACTIVATION_PRICES: Record<number, number> = {
  10000: 199,
  25000: 299,
  50000: 499,
  100000: 799,
  200000: 1499,
  500000: 2999,
};

const CATALOG_LABEL: Record<Exclude<ResetAccountType, 'vip'>, ResetCatalogType> = {
  standard: 'Standard',
  '1-step': '1-Step',
  instant: 'Instant',
  gauntlet: 'Gauntlet',
};

export interface ResetAccountInput {
  accountType?: string | null;
  accountSize?: number | string | null;
  platform?: string | null;
  status?: string | null;
  step?: number | string | null;
  profitSplit?: number | string | null;
}

export interface ResetQuote {
  category: ResetCategory;
  categoryLabel: 'Challenge' | 'Funded' | 'VIP';
  productLabel: string;
  challengeType: string;
  catalogType: ResetCatalogType;
  accountType: ResetAccountType;
  amountLabel: string;
  accountSize: number;
  platform: 'MT4' | 'MT5';
  tierName: string | null;
  originalPrice: number;
  price: number;
  discountPercent: number;
  feeNote: string;
}

export interface ResetCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  discordUsername: string;
}

export function resetPriceCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function formatResetUsd(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function priceAfterPercentOff(priceDollars: number, percentOff: number): number {
  const fullCents = Math.round(priceDollars * 100);
  if (!percentOff) return fullCents / 100;
  return Math.round((fullCents * (100 - percentOff)) / 100) / 100;
}

function normalizeChallengeType(type?: string | null): Exclude<ResetAccountType, 'vip'> | null {
  const value = String(type || '').trim().toLowerCase().replace(/[\s_]/g, '-');
  if (value === 'standard') return 'standard';
  if (value === 'instant') return 'instant';
  if (value === 'gauntlet') return 'gauntlet';
  if (value === '1-step' || value === '1step' || value === 'onestep' || value === 'one-step') return '1-step';
  return null;
}

function challengeSize(account: ResetAccountInput): number {
  if (typeof account.accountSize === 'number' && Number.isFinite(account.accountSize)) {
    return Math.round(account.accountSize);
  }
  const parsed = Number(String(account.accountSize ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function formatChallengeAmount(size: number): string {
  return `$${size.toLocaleString('en-US')}`;
}

export function formatResetPlatform(platform?: string | null): 'MT4' | 'MT5' {
  const value = String(platform || '').trim().toLowerCase();
  if (value.includes('mt4') || value === '4') return 'MT4';
  return 'MT5';
}

function productLabel(accountType: Exclude<ResetAccountType, 'vip'>): string {
  if (accountType === '1-step') return 'Shockwave 1-Step';
  if (accountType === 'gauntlet') return 'Shockwave Gauntlet';
  if (accountType === 'instant') return 'Shockwave Instant';
  return 'Shockwave Standard';
}

export function getResetQuote(account: ResetAccountInput): ResetQuote | null {
  const platform = formatResetPlatform(account.platform);
  const explicitVip = String(account.accountType || '').trim().toLowerCase() === 'vip';
  const vipSize = normalizeVipAccountSize(account.accountSize);
  const vip = explicitVip || vipSize > MAX_CHALLENGE_ACCOUNT_SIZE;

  if (vip) {
    const preset = VIP_SIZE_PRESETS.find((item) => item.size === vipSize);
    const option = preset ? VIP_OPTIONS.find((item) => item.level === preset.label) : undefined;
    const institutional = VIP_OPTIONS.find((item) => item.level === '$3M');
    const vipPrice = option
      ? { originalPrice: option.price, amountLabel: option.level, tierName: option.name, accountSize: preset!.size }
      : vipSize === VIP_1_5M_SIZE && institutional
        ? { originalPrice: institutional.price / 2, amountLabel: '$1.5M', tierName: 'VIP', accountSize: VIP_1_5M_SIZE }
        : null;
    if (!vipPrice) return null;
    const price = centsToDollars(vipChargeCents(vipPrice.originalPrice, true));
    return {
      category: 'vip',
      categoryLabel: 'VIP',
      productLabel: vipPrice.tierName,
      challengeType: 'VIP Reset',
      catalogType: 'VIP',
      accountType: 'vip',
      amountLabel: vipPrice.amountLabel,
      accountSize: vipPrice.accountSize,
      platform,
      tierName: vipPrice.tierName,
      originalPrice: vipPrice.originalPrice,
      price,
      discountPercent: VIP_RESET_DISCOUNT_PERCENT,
      feeNote: `${VIP_RESET_DISCOUNT_PERCENT}% off the VIP allocation fee`,
    };
  }

  const accountType = normalizeChallengeType(account.accountType);
  const accountSize = challengeSize(account);
  if (!accountType || accountSize <= 0) return null;

  const step = Number(account.step);
  const status = String(account.status || '').trim().toLowerCase();
  const funded = step === 3 || status === 'funded';

  if (funded) {
    const activationPrice = FUNDED_ACTIVATION_PRICES[accountSize];
    if (!activationPrice) return null;
    return {
      category: 'funded',
      categoryLabel: 'Funded',
      productLabel: productLabel(accountType),
      challengeType: 'Funded Reset',
      catalogType: 'Funded',
      accountType,
      amountLabel: formatChallengeAmount(accountSize),
      accountSize,
      platform,
      tierName: null,
      originalPrice: activationPrice,
      price: activationPrice,
      discountPercent: 0,
      feeNote: 'Funded activation fee',
    };
  }

  const originalPrice = CHALLENGE_PRICES[accountType][accountSize];
  if (!originalPrice) return null;
  const catalogType = CATALOG_LABEL[accountType];
  return {
    category: 'challenge',
    categoryLabel: 'Challenge',
    productLabel: productLabel(accountType),
    challengeType: `${catalogType} Reset`,
    catalogType,
    accountType,
    amountLabel: formatChallengeAmount(accountSize),
    accountSize,
    platform,
    tierName: null,
    originalPrice,
    price: priceAfterPercentOff(originalPrice, CHALLENGE_RESET_DISCOUNT_PERCENT),
    discountPercent: CHALLENGE_RESET_DISCOUNT_PERCENT,
    feeNote: `${CHALLENGE_RESET_DISCOUNT_PERCENT}% off the challenge fee`,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeResetCustomer(
  input: Partial<ResetCustomer> | null | undefined,
  email: string
): ResetCustomer {
  return {
    firstName: String(input?.firstName || '').trim(),
    lastName: String(input?.lastName || '').trim(),
    email: email.trim(),
    phone: String(input?.phone || '').trim(),
    country: String(input?.country || '').trim(),
    discordUsername: String(input?.discordUsername || '').trim(),
  };
}

export function resetCustomerFieldErrors(
  customer: ResetCustomer
): Partial<Record<keyof ResetCustomer, string>> {
  const errors: Partial<Record<keyof ResetCustomer, string>> = {};
  if (!customer.firstName) errors.firstName = 'First name is required';
  if (!customer.lastName) errors.lastName = 'Last name is required';
  if (!customer.email || !EMAIL_PATTERN.test(customer.email)) errors.email = 'A valid email is required';
  const digits = customer.phone.replace(/\D/g, '');
  if (!customer.phone) errors.phone = 'Phone number is required';
  else if (digits.length < 7 || digits.length > 15) errors.phone = 'Enter a valid phone number';
  if (customer.country.trim().length < 2) errors.country = 'Country is required';
  if (customer.discordUsername.length > 64) errors.discordUsername = 'Discord username is too long';
  return errors;
}
