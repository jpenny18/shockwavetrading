export type ActivationMode = 'activate' | 'reset';
export type ActivationProductId = 'gauntlet-activation' | 'activate-funded';

export interface ActivationOption {
  level: string;
  price: number;
  whopCheckoutUrl?: string;
  features: string[];
}

export interface ActivationCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  platform: string;
  discordUsername: string;
}

export interface ActivationDraft extends ActivationCustomer {
  productId: ActivationProductId;
  level: string;
  mode: ActivationMode;
}

export const ACTIVATION_DRAFT_KEY = 'activationCheckoutDraft';

const RESET_DISCOUNT = 0.12;
const BLACK_FRIDAY_DISCOUNT = 0.5;

const SHARED_FEATURES = [
  '15% Max Drawdown',
  '8% Daily Drawdown',
  '1:200 Leverage',
  'No Trading Restrictions',
  'Weekend Holding Allowed',
];

function option(level: string, capital: string, price: number, whopCheckoutUrl?: string): ActivationOption {
  return {
    level,
    price,
    whopCheckoutUrl,
    features: [`${capital} Simulated Capital`, ...SHARED_FEATURES],
  };
}

export const GAUNTLET_ACTIVATION_OPTIONS: ActivationOption[] = [
  option('$10k', '$10,000', 199, 'https://whop.com/checkout/plan_gYWVAVyu65Zwa'),
  option('$25k', '$25,000', 349, 'https://whop.com/checkout/plan_4JiIRmkyRqjq8'),
  option('$50k', '$50,000', 599, 'https://whop.com/checkout/plan_9t46Mcti2Gl1G'),
  option('$100k', '$100,000', 999, 'https://whop.com/checkout/plan_mYd9abFhGM9Mg'),
  option('$200k', '$200,000', 1899, 'https://whop.com/checkout/plan_ArcXmNChT9aLe'),
  option('$500k', '$500,000', 4499),
];

export const ACTIVATE_FUNDED_OPTIONS: ActivationOption[] = [
  option('$10k', '$10,000', 349, 'https://whop.com/checkout/plan_gYWVAVyu65Zwa'),
  option('$25k', '$25,000', 699, 'https://whop.com/checkout/plan_4JiIRmkyRqjq8'),
  option('$50k', '$50,000', 1299, 'https://whop.com/checkout/plan_9t46Mcti2Gl1G'),
  option('$100k', '$100,000', 2499, 'https://whop.com/checkout/plan_mYd9abFhGM9Mg'),
  option('$200k', '$200,000', 4999, 'https://whop.com/checkout/plan_ArcXmNChT9aLe'),
  option('$500k', '$500,000', 11999),
];

export interface ActivationProduct {
  id: ActivationProductId;
  homePath: string;
  informationPath: string;
  paymentPath: string;
  pendingPath: string;
  challengeType: string;
  applyBlackFriday: boolean;
  options: ActivationOption[];
}

export const ACTIVATION_PRODUCTS: Record<ActivationProductId, ActivationProduct> = {
  'gauntlet-activation': {
    id: 'gauntlet-activation',
    homePath: '/gauntlet-activation',
    informationPath: '/gauntlet-activation/information',
    paymentPath: '/gauntlet-activation/payment',
    pendingPath: '/gauntlet-activation/pending',
    challengeType: 'gauntlet-activation',
    applyBlackFriday: false,
    options: GAUNTLET_ACTIVATION_OPTIONS,
  },
  'activate-funded': {
    id: 'activate-funded',
    homePath: '/funded-activation',
    informationPath: '/funded-activation/information',
    paymentPath: '/funded-activation/payment',
    pendingPath: '/funded-activation/pending',
    challengeType: 'activate-funded',
    applyBlackFriday: true,
    options: ACTIVATE_FUNDED_OPTIONS,
  },
};

export function formatActivationUsd(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function activationPrice(product: ActivationProduct, option: ActivationOption, mode: ActivationMode): number {
  if (mode === 'reset') return Math.round(option.price * (1 - RESET_DISCOUNT) * 100) / 100;
  if (product.applyBlackFriday) return Math.round(option.price * (1 - BLACK_FRIDAY_DISCOUNT) * 100) / 100;
  return option.price;
}

export function findActivationOption(product: ActivationProduct, level: string | null): ActivationOption | null {
  if (!level) return null;
  const normalized = level.toLowerCase().replace('$', '');
  return product.options.find((option) => option.level.toLowerCase().replace('$', '') === normalized) || null;
}

export function readActivationDraft(): ActivationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivationDraft;
    if (!parsed?.productId || !parsed.level || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeActivationDraft(draft: ActivationDraft) {
  sessionStorage.setItem(ACTIVATION_DRAFT_KEY, JSON.stringify(draft));
}
