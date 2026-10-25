export type ChallengeAccountType = 'standard' | 'instant' | '1-step' | 'gauntlet';
export type MetaApiAccountType = ChallengeAccountType | 'vip';

export const VIP_RULES = {
  minTradingDays: 0,
  maxDrawdown: 15,
  maxDailyDrawdown: 8,
  leverage: '1:100',
  profitSplit: 80
} as const;

export const VIP_PROFIT_SPLIT_MIN = 80;
export const VIP_PROFIT_SPLIT_MAX = 100;
export const VIP_PROFIT_SPLIT_DEFAULT = 80;
export const VIP_PROFIT_SPLIT_OPTIONS = Array.from(
  { length: VIP_PROFIT_SPLIT_MAX - VIP_PROFIT_SPLIT_MIN + 1 },
  (_, index) => VIP_PROFIT_SPLIT_MIN + index
);

export const VIP_ACCOUNT_SIZES = [1_000_000, 2_000_000, 3_000_000] as const;
export const MAX_CHALLENGE_ACCOUNT_SIZE = 500_000;

export const VIP_SIZE_PRESETS = [
  { size: 1_000_000, label: '$1M', tierName: 'Professional' },
  { size: 2_000_000, label: '$2M', tierName: 'Executive' },
  { size: 3_000_000, label: '$3M', tierName: 'Institutional' }
] as const;

export function normalizeMetaApiAccountType(type?: string | null): string {
  return String(type || '').trim().toLowerCase();
}

export function isVipAccountType(type?: string | null): type is 'vip' {
  return normalizeMetaApiAccountType(type) === 'vip';
}

export function isChallengeAccountType(type?: string | null): type is ChallengeAccountType {
  const normalized = normalizeMetaApiAccountType(type);
  return normalized === 'standard' || normalized === 'instant' || normalized === '1-step' || normalized === 'gauntlet';
}

export function getVipTierName(accountSize: number): string {
  const size = normalizeVipAccountSize(accountSize);
  const preset = VIP_SIZE_PRESETS.find((item) => item.size === size);
  return preset?.tierName || 'VIP';
}

export function formatVipAllocation(accountSize: number): string {
  const size = normalizeVipAccountSize(accountSize);
  const preset = VIP_SIZE_PRESETS.find((item) => item.size === size);
  if (preset) return preset.label;
  if (size >= 1_000_000) {
    const millions = size / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? String(millions)
      : String(parseFloat(millions.toFixed(2)));
    return `$${formatted}M`;
  }
  return `$${size.toLocaleString()}`;
}

export function formatVipDollars(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export function getVipObjectiveAmounts(accountSize: number) {
  const size = normalizeVipAccountSize(accountSize);
  return {
    accountSize: size,
    maxDrawdownAmount: size * (VIP_RULES.maxDrawdown / 100),
    dailyDrawdownAmount: size * (VIP_RULES.maxDailyDrawdown / 100)
  };
}

export function normalizeVipProfitSplit(value?: number | string | null): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return VIP_PROFIT_SPLIT_DEFAULT;
  return Math.min(VIP_PROFIT_SPLIT_MAX, Math.max(VIP_PROFIT_SPLIT_MIN, Math.round(parsed)));
}

export function getVipProfitTracker(profit: number, split?: number | string | null) {
  const profitAmount = Number.isFinite(profit) ? profit : 0;
  const profitSplit = normalizeVipProfitSplit(split);
  const traderShare = profitAmount > 0 ? profitAmount * (profitSplit / 100) : 0;
  const firmShare = profitAmount > 0 ? profitAmount - traderShare : 0;
  return {
    profit: profitAmount,
    profitSplit,
    traderShare,
    firmShare
  };
}

function normalizeBareVipNumber(value: number, raw?: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 10_000) return Math.round(value);
  // Bare values like 1.5 or 3 mean millions for VIP custom sizes.
  const looksLikeMillions = value < 10 || (raw != null && raw.includes('.'));
  if (looksLikeMillions) return Math.round(value * 1_000_000);
  return Math.round(value);
}

export function parseAllocationToNumber(size: string | number): number {
  if (typeof size === 'number' && Number.isFinite(size)) {
    return normalizeBareVipNumber(size);
  }
  const cleaned = String(size).replace(/[$,\s]/g, '').toUpperCase();
  if (!cleaned) return 0;
  const withSuffix = cleaned.replace(/MILLION$/, 'M').replace(/MM$/, 'M');
  if (withSuffix.endsWith('M')) {
    const n = parseFloat(withSuffix.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : 0;
  }
  if (withSuffix.endsWith('K')) {
    const n = parseFloat(withSuffix.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000) : 0;
  }
  const parsed = parseFloat(withSuffix);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return normalizeBareVipNumber(parsed, withSuffix);
}

export function parseVipCustomSize(size: string | number): number {
  return parseAllocationToNumber(size);
}

export function normalizeVipAccountSize(size: string | number | null | undefined): number {
  if (size == null || size === '') return 0;
  return parseAllocationToNumber(size);
}

export function isVipMetaApiAccount(account?: {
  accountType?: string | null;
  accountSize?: number | string | null;
  profitSplit?: number | string | null;
} | null): boolean {
  if (!account) return false;
  if (isVipAccountType(account.accountType)) return true;

  // profitSplit is only written by VIP account setup.
  const split = typeof account.profitSplit === 'number'
    ? account.profitSplit
    : parseFloat(String(account.profitSplit ?? ''));
  if (Number.isFinite(split) && split >= VIP_PROFIT_SPLIT_MIN && split <= VIP_PROFIT_SPLIT_MAX) {
    return true;
  }

  const size = normalizeVipAccountSize(account.accountSize);
  // Known challenge products include $500k Standard/1-Step. Never pull those into VIP.
  if (isChallengeAccountType(account.accountType) && size <= MAX_CHALLENGE_ACCOUNT_SIZE) {
    return false;
  }

  // VIP allocations are $1M / $1.5M / $2M / $3M. A $1.5M doc tagged Instant belongs on VIP pages.
  return size > MAX_CHALLENGE_ACCOUNT_SIZE;
}

export function formatMetaApiAccountName(accountType?: string | null): string {
  switch (normalizeMetaApiAccountType(accountType)) {
    case 'vip':
      return 'Shockwave VIP';
    case '1-step':
      return 'Shockwave 1-Step';
    case 'gauntlet':
      return 'Shockwave Gauntlet';
    case 'instant':
      return 'Shockwave Instant';
    case 'standard':
    default:
      return 'Shockwave Standard';
  }
}
