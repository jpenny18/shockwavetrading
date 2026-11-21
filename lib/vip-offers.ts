export const VIP_CUSTOM_OFFERS_COLLECTION = 'vipCustomOffers';
export const VIP_PORTAL_OFFER_KIND = 'vip-portal-offer';
export const VIP_CUSTOM_OFFER_KIND = 'vip-custom-offer';

export const OFFER_NOTIONAL_DISCLAIMER =
  'This represents notional trading-account balances, not cash profit or a withdrawable credit.';
export const OFFER_TERMS_DISCLAIMER =
  'Illustrative program terms; the actual agreement controls eligibility and account conditions.';

export type VipCheckoutKind = typeof VIP_PORTAL_OFFER_KIND | typeof VIP_CUSTOM_OFFER_KIND;

export type VipOfferAccountLine = {
  name: string;
  detail: string;
  currentBalance: number;
  afterBalance: number;
  afterLabel: string;
};

export type VipOfferDraftAccount = {
  key: string;
  name: string;
  detail: string;
  currentBalance: string;
  afterBalance: string;
  afterLabel: string;
};

export type VipOfferDraft = {
  title: string;
  eyebrow: string;
  headline: string;
  subtitle: string;
  packageName: string;
  packageSummary: string;
  price: string;
  refreshedAllocation: string;
  refreshedAllocationLabel: string;
  accounts: VipOfferDraftAccount[];
  profitSplit: string;
  firstWithdrawalDays: string;
  firstPayoutCap: string;
  noPayoutCapFromDay: string;
  maxDrawdown: string;
  dailyDrawdown: string;
  leverage: string;
  validHours: string;
  targetActivation: string;
};

export type ParsedVipOffer = {
  title: string;
  eyebrow: string;
  headline: string;
  subtitle: string;
  packageName: string;
  packageSummary: string;
  price: number;
  refreshedAllocation: number;
  refreshedAllocationLabel: string;
  accounts: VipOfferAccountLine[];
  profitSplit: number;
  firstWithdrawalDays: number;
  firstPayoutCap: number;
  noPayoutCapFromDay: number;
  maxDrawdown: number;
  dailyDrawdown: number;
  leverage: string;
  validHours: number;
  targetActivation: string;
};

export type VipCustomOfferRecord = ParsedVipOffer & {
  userId: string;
  userEmail: string;
  recipientName: string;
  status: 'proposed' | 'revoked';
  paymentStatus: 'unpaid' | 'pending' | 'completed';
  cryptoOrderId?: string;
  createdBy: string;
  expiresAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  paymentSubmittedAt?: unknown;
  paymentCompletedAt?: unknown;
  termsAcceptedAt?: unknown;
};

export function newOfferKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function privateRefreshDraft(): VipOfferDraft {
  return {
    title: 'Private VIP Proposal',
    eyebrow: 'Private offer',
    headline: '$2M REFRESH',
    subtitle: 'Dominion reset + free reactivation',
    packageName: '$2M Refresh Package',
    packageSummary: 'Dominion VIP reset + complimentary funded reactivation',
    price: '2499',
    refreshedAllocation: '2000000',
    refreshedAllocationLabel: 'VIP reset + funded reactivation',
    accounts: [
      {
        key: 'dominion',
        name: 'Dominion VIP',
        detail: 'MT5: 1359152',
        currentBalance: '1357870.27',
        afterBalance: '1500000',
        afterLabel: 'Reset'
      },
      {
        key: 'funded',
        name: '$500K Funded',
        detail: 'Reactivation',
        currentBalance: '0',
        afterBalance: '500000',
        afterLabel: 'Reactivated'
      },
      {
        key: 'fusion',
        name: 'Fusion VIP',
        detail: 'MT5: 468894',
        currentBalance: '1479367.18',
        afterBalance: '1479367.18',
        afterLabel: 'Unchanged'
      }
    ],
    profitSplit: '90',
    firstWithdrawalDays: '7',
    firstPayoutCap: '25000',
    noPayoutCapFromDay: '14',
    maxDrawdown: '15',
    dailyDrawdown: '8',
    leverage: '1:200',
    validHours: '72',
    targetActivation: 'Sunday evening, November 22'
  };
}

export function draftFromOffer(offer: ParsedVipOffer): VipOfferDraft {
  return {
    title: offer.title,
    eyebrow: offer.eyebrow,
    headline: offer.headline,
    subtitle: offer.subtitle,
    packageName: offer.packageName,
    packageSummary: offer.packageSummary,
    price: String(offer.price),
    refreshedAllocation: String(offer.refreshedAllocation),
    refreshedAllocationLabel: offer.refreshedAllocationLabel,
    accounts: offer.accounts.map((account) => ({
      key: newOfferKey(),
      name: account.name,
      detail: account.detail,
      currentBalance: String(account.currentBalance),
      afterBalance: String(account.afterBalance),
      afterLabel: account.afterLabel
    })),
    profitSplit: String(offer.profitSplit),
    firstWithdrawalDays: String(offer.firstWithdrawalDays),
    firstPayoutCap: String(offer.firstPayoutCap),
    noPayoutCapFromDay: String(offer.noPayoutCapFromDay),
    maxDrawdown: String(offer.maxDrawdown),
    dailyDrawdown: String(offer.dailyDrawdown),
    leverage: offer.leverage,
    validHours: String(offer.validHours),
    targetActivation: offer.targetActivation
  };
}

export function blankAccountLine(): VipOfferDraftAccount {
  return {
    key: newOfferKey(),
    name: '',
    detail: '',
    currentBalance: '0',
    afterBalance: '0',
    afterLabel: ''
  };
}

export function formatUsd(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '$0';
  const hasCents = Math.round(Math.abs(value) * 100) % 100 !== 0;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  });
}

export function formatUsdExact(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '$0.00';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatSignedUsd(amount: number): string {
  const formatted = formatUsdExact(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

export function formatCompactUsd(amount: number): string {
  const negative = amount < 0;
  const value = Math.abs(Number(amount));
  if (!Number.isFinite(value)) return '$0';
  const sign = negative ? '-' : '';
  if (value >= 1_000_000) {
    const millions = Math.round((value / 1_000_000) * 100) / 100;
    return `${sign}$${Number.isInteger(millions) ? millions : millions}M`;
  }
  if (value >= 1_000 && Math.abs(value - Math.round(value)) < 0.001 && Math.round(value) % 1000 === 0) {
    return `${sign}$${Math.round(value / 1000)}K`;
  }
  return formatUsd(negative ? -value : value);
}

export function offerTotals(accounts: Array<{ currentBalance: number; afterBalance: number }> | null | undefined) {
  const rows = accounts || [];
  const current = rows.reduce((sum, account) => sum + (Number(account.currentBalance) || 0), 0);
  const after = rows.reduce((sum, account) => sum + (Number(account.afterBalance) || 0), 0);
  return {
    current: Math.round(current * 100) / 100,
    after: Math.round(after * 100) / 100,
    additional: Math.round((after - current) * 100) / 100
  };
}

export function draftTotals(draft: VipOfferDraft) {
  return offerTotals(draft.accounts.map((account) => ({
    currentBalance: parseLooseNumber(account.currentBalance) || 0,
    afterBalance: parseLooseNumber(account.afterBalance) || 0
  })));
}

function parseLooseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function inferAfterLabel(current: number, after: number, label: string): string {
  const trimmed = label.trim();
  if (trimmed) return trimmed.slice(0, 40);
  if (after === current) return 'Unchanged';
  if (current <= 0 && after > 0) return 'Reactivated';
  if (after > current) return 'Reset';
  return 'Adjusted';
}

function parseWhole(value: string, label: string, min: number, max: number): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = parseLooseNumber(value);
  if (parsed == null || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { ok: false, error: `${label} must be a whole number from ${min} to ${max}.` };
  }
  return { ok: true, value: parsed };
}

export function parseVipOfferDraft(draft: VipOfferDraft): { ok: true; value: ParsedVipOffer } | { ok: false; error: string } {
  const title = draft.title.trim();
  const eyebrow = draft.eyebrow.trim();
  const headline = draft.headline.trim();
  const subtitle = draft.subtitle.trim();
  const packageName = draft.packageName.trim();
  const packageSummary = draft.packageSummary.trim();
  const refreshedAllocationLabel = draft.refreshedAllocationLabel.trim();
  const leverage = draft.leverage.trim();
  const targetActivation = draft.targetActivation.trim();

  if (!headline || !packageName) return { ok: false, error: 'Add an offer headline and package name.' };
  if (headline.length > 80 || packageName.length > 80 || title.length > 120) {
    return { ok: false, error: 'Shorten the offer name so it fits the portal card.' };
  }

  const price = parseLooseNumber(draft.price);
  if (price == null || price <= 0 || price > 1_000_000) {
    return { ok: false, error: 'Enter an offer price greater than 0.' };
  }

  const refreshedAllocation = parseLooseNumber(draft.refreshedAllocation);
  if (refreshedAllocation == null || refreshedAllocation < 0 || refreshedAllocation > 100_000_000) {
    return { ok: false, error: 'Enter the refreshed allocation amount.' };
  }

  const accounts: VipOfferAccountLine[] = [];
  for (const row of draft.accounts) {
    const name = row.name.trim();
    const detail = row.detail.trim();
    const currentRaw = row.currentBalance.trim();
    const afterRaw = row.afterBalance.trim();
    const empty = !name && !detail && !currentRaw && !afterRaw && !row.afterLabel.trim();
    if (empty) continue;
    if (!name) return { ok: false, error: 'Each account row needs a name.' };
    const current = currentRaw ? parseLooseNumber(currentRaw) : 0;
    const after = afterRaw ? parseLooseNumber(afterRaw) : 0;
    if (current == null || after == null || Math.abs(current) > 100_000_000 || Math.abs(after) > 100_000_000) {
      return { ok: false, error: `Check the balances for ${name}.` };
    }
    accounts.push({
      name: name.slice(0, 80),
      detail: detail.slice(0, 80),
      currentBalance: current,
      afterBalance: after,
      afterLabel: inferAfterLabel(current, after, row.afterLabel)
    });
  }
  if (accounts.length === 0) return { ok: false, error: 'Add at least one account to the offer.' };

  const profitSplit = parseWhole(draft.profitSplit, 'Profit split', 1, 100);
  if (!profitSplit.ok) return profitSplit;
  const firstWithdrawalDays = parseWhole(draft.firstWithdrawalDays, 'First withdrawal days', 0, 365);
  if (!firstWithdrawalDays.ok) return firstWithdrawalDays;
  const noPayoutCapFromDay = parseWhole(draft.noPayoutCapFromDay, 'No payout cap from day', 0, 365);
  if (!noPayoutCapFromDay.ok) return noPayoutCapFromDay;
  const validHours = parseWhole(draft.validHours, 'Offer hours', 1, 24 * 90);
  if (!validHours.ok) return validHours;

  const firstPayoutCap = parseLooseNumber(draft.firstPayoutCap);
  if (firstPayoutCap == null || firstPayoutCap < 0 || firstPayoutCap > 10_000_000) {
    return { ok: false, error: 'Enter a first payout cap, or 0 for no cap.' };
  }
  const maxDrawdown = parseLooseNumber(draft.maxDrawdown);
  const dailyDrawdown = parseLooseNumber(draft.dailyDrawdown);
  if (maxDrawdown == null || maxDrawdown <= 0 || maxDrawdown > 100 || dailyDrawdown == null || dailyDrawdown <= 0 || dailyDrawdown > 100) {
    return { ok: false, error: 'Drawdown percentages need to be between 0 and 100.' };
  }
  if (!leverage || leverage.length > 20) return { ok: false, error: 'Enter the leverage, for example 1:200.' };
  if (!refreshedAllocationLabel) return { ok: false, error: 'Add a short label for the refreshed allocation.' };

  return {
    ok: true,
    value: {
      title: title || 'Private VIP Proposal',
      eyebrow: eyebrow || 'Private offer',
      headline,
      subtitle: subtitle.slice(0, 140),
      packageName,
      packageSummary: packageSummary.slice(0, 180),
      price,
      refreshedAllocation,
      refreshedAllocationLabel: refreshedAllocationLabel.slice(0, 120),
      accounts,
      profitSplit: profitSplit.value,
      firstWithdrawalDays: firstWithdrawalDays.value,
      firstPayoutCap,
      noPayoutCapFromDay: noPayoutCapFromDay.value,
      maxDrawdown,
      dailyDrawdown,
      leverage,
      validHours: validHours.value,
      targetActivation: targetActivation.slice(0, 160)
    }
  };
}

export function offerBenefits(offer: Pick<ParsedVipOffer, 'accounts' | 'firstWithdrawalDays'>): string[] {
  const restores: string[] = [];
  const reactivated: string[] = [];
  const unchanged: string[] = [];

  for (const account of offer.accounts || []) {
    const label = account.afterLabel.toLowerCase();
    const name = account.name.trim();
    if (!name) continue;
    if (label.includes('unchanged')) {
      unchanged.push(`Existing ${name} allocation unchanged`);
      continue;
    }
    if (label.includes('reactiv') || (account.currentBalance <= 0 && account.afterBalance > 0 && /fund/i.test(name))) {
      reactivated.push(`Complimentary ${formatCompactUsd(account.afterBalance)} funded reactivation`);
      continue;
    }
    if (label.includes('reset') || account.afterBalance > account.currentBalance) {
      const amount = formatCompactUsd(account.afterBalance);
      restores.push(/dominion/i.test(name) ? `Restore Dominion ${amount} VIP account` : `Restore ${name} ${amount} account`);
      continue;
    }
    if (account.afterBalance === account.currentBalance) {
      unchanged.push(`Existing ${name} allocation unchanged`);
    }
  }

  const lines = [...restores, ...reactivated];
  if (offer.firstWithdrawalDays > 0) {
    lines.push(`${offer.firstWithdrawalDays}-day initial VIP payout eligibility`);
  }
  return [...lines, ...unchanged];
}

export function offerRuleRows(offer: Pick<ParsedVipOffer, 'maxDrawdown' | 'dailyDrawdown' | 'leverage' | 'profitSplit' | 'firstWithdrawalDays' | 'firstPayoutCap' | 'noPayoutCapFromDay'>): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['Maximum drawdown', `${offer.maxDrawdown}%`],
    ['Daily drawdown', `${offer.dailyDrawdown}%`],
    ['Leverage', offer.leverage],
    ['VIP profit split', `${offer.profitSplit}%`],
    ['First VIP payout eligibility', offer.firstWithdrawalDays > 0 ? `${offer.firstWithdrawalDays} calendar days` : 'Immediate']
  ];
  rows.push(['First VIP payout cap', offer.firstPayoutCap > 0 ? formatUsd(offer.firstPayoutCap) : 'No cap']);
  if (offer.noPayoutCapFromDay > 0) {
    rows.push([`Payout cap from day ${offer.noPayoutCapFromDay}`, 'No cap']);
  }
  return rows;
}

export function buildProposalText(offer: ParsedVipOffer, recipientName?: string): string {
  const totals = offerTotals(offer.accounts);
  const lines = [
    'Shockwave Capital | Private VIP',
    'Proposed',
    recipientName ? `Prepared for ${recipientName}` : '',
    '',
    `One-time activation: ${formatUsdExact(offer.price)} USD`,
    `Refreshed allocation: ${formatUsdExact(offer.refreshedAllocation)}`,
    offer.refreshedAllocationLabel,
    '',
    offer.packageName,
    offer.packageSummary,
    '',
    'Account restoration',
    ...offer.accounts.map((account) =>
      `${account.name}${account.detail ? ` (${account.detail})` : ''}: ${formatUsdExact(account.currentBalance)} -> ${formatUsdExact(account.afterBalance)} (${account.afterLabel})`
    ),
    '',
    `Combined current balances: ${formatUsdExact(totals.current)}`,
    `Combined after offer: ${formatUsdExact(totals.after)}`,
    `Additional notional trading-account balance: ${formatSignedUsd(totals.additional)}`,
    OFFER_NOTIONAL_DISCLAIMER,
    '',
    'Offer terms',
    ...offerBenefits(offer).map((line) => `- ${line}`),
    ...offerRuleRows(offer).map(([label, value]) => `${label}: ${value}`),
    `Offer valid: ${offer.validHours} hours`,
    offer.targetActivation ? `Target activation: ${offer.targetActivation}` : '',
    '',
    `Private VIP checkout: ${formatUsdExact(offer.price)} USD`,
    'https://shockwave-capital.com/dashboard/vip'
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function timeToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const record = value as { toDate?: () => Date; seconds?: number };
    if (typeof record.toDate === 'function') {
      const date = record.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
    if (typeof record.seconds === 'number') return new Date(record.seconds * 1000);
  }
  return null;
}

export function timeToMillis(value: unknown): number {
  return timeToDate(value)?.getTime() || 0;
}

export function offerExpiryDate(offer: { expiresAt?: unknown; createdAt?: unknown; validHours?: number }): Date | null {
  const explicit = timeToDate(offer.expiresAt);
  if (explicit) return explicit;
  const created = timeToDate(offer.createdAt);
  const hours = Number(offer.validHours);
  if (!created || !Number.isFinite(hours) || hours <= 0) return null;
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

export function offerIsExpired(offer: { paymentStatus?: string; expiresAt?: unknown; createdAt?: unknown; validHours?: number }): boolean {
  if (offer.paymentStatus && offer.paymentStatus !== 'unpaid') return false;
  const expiry = offerExpiryDate(offer);
  if (!expiry) return false;
  return Date.now() > expiry.getTime();
}

export function inferOfferPlatform(accounts: Array<{ detail?: string }> | null | undefined): 'MT4' | 'MT5' | '' {
  const details = (accounts || []).map((account) => (account.detail || '').toUpperCase());
  const mt5 = details.some((detail) => detail.includes('MT5'));
  const mt4 = details.some((detail) => detail.includes('MT4'));
  if (mt5 && !mt4) return 'MT5';
  if (mt4 && !mt5) return 'MT4';
  return '';
}
