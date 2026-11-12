/**
 * Built-in reset fees live in lib/reset-pricing.ts.
 * This module turns those fees into a catalog and applies saved overrides.
 *
 * Resolution order for a trading account:
 * 1. A price saved on that specific account
 * 2. A price saved for that customer, challenge type, and account size
 * 3. A global price for that challenge type and account size
 * 4. The built-in fee
 */

import {
  formatResetUsd,
  getResetQuote,
  priceAfterPercentOff,
  type ResetAccountInput,
  type ResetAccountType,
  type ResetCatalogType,
  type ResetCategory,
  type ResetQuote,
} from '@/lib/reset-pricing';

export const MIN_RESET_PRICE = 0.5;
export const MAX_RESET_PRICE = 100_000;

export type ResetPriceMode = 'discount' | 'fixed';
export type ResetPriceSource = 'account' | 'user' | 'global' | 'default';

export interface ResetPriceRule {
  mode: ResetPriceMode;
  discountPercent?: number;
  price?: number;
}

export interface ResetPriceUserRecord {
  userId: string;
  email: string;
  displayName: string;
  catalog: Record<string, ResetPriceRule>;
  accounts: Record<string, ResetPriceRule>;
}

export interface ResetPriceConfig {
  global: Record<string, ResetPriceRule>;
  users: Record<string, ResetPriceUserRecord>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ResetPriceSnapshot {
  global?: Record<string, ResetPriceRule>;
  users?: Record<string, {
    catalog?: Record<string, ResetPriceRule>;
    accounts?: Record<string, ResetPriceRule>;
  }>;
}

export interface ResetCatalogEntry {
  key: string;
  category: ResetCategory;
  categoryLabel: ResetQuote['categoryLabel'];
  typeLabel: string;
  amountLabel: string;
  productLabel: string;
  accountType: ResetAccountType;
  accountSize: number;
  tierName: string | null;
  originalPrice: number;
  defaultPrice: number;
  defaultDiscountPercent: number;
  defaultFeeNote: string;
}

export interface LayeredResetPrice extends ResetCatalogEntry {
  rule: ResetPriceRule | null;
  inheritedPrice: number;
  inheritedNote: string;
  price: number;
  discountPercent: number;
  feeNote: string;
}

export interface AccountResetPriceRow {
  accountId: string;
  status: string;
  platform: string;
  step: number | null;
  accountSize: number;
  catalogKey: string;
  category: ResetCategory;
  categoryLabel: ResetQuote['categoryLabel'];
  typeLabel: string;
  amountLabel: string;
  productLabel: string;
  originalPrice: number;
  rule: ResetPriceRule | null;
  inheritedPrice: number;
  inheritedNote: string;
  price: number;
  discountPercent: number;
  feeNote: string;
  source: ResetPriceSource;
}

export interface ResetPriceExplanation {
  quote: ResetQuote;
  key: string;
  source: ResetPriceSource;
  accountRule: ResetPriceRule | null;
  userRule: ResetPriceRule | null;
  globalRule: ResetPriceRule | null;
}

export interface CustomResetUser {
  userId: string;
  email: string;
  displayName: string;
  catalogCount: number;
  accountCount: number;
}

const OPEN_RESET_STATUSES = new Set(['active', 'inactive', 'funded', 'passed']);

let cachedCatalog: ResetCatalogEntry[] | null = null;
let cachedCatalogMap: Map<string, ResetCatalogEntry> | null = null;

export function emptyResetPriceConfig(): ResetPriceConfig {
  return { global: {}, users: {}, updatedAt: null, updatedBy: null };
}

export function isSafeResetUserId(userId: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(userId);
}

export function isSafeResetAccountId(accountId: string): boolean {
  const id = accountId.trim();
  if (!id || id.length > 200 || id.startsWith('PLACEHOLDER_')) return false;
  return !/[/\n\r]/.test(id);
}

export function isOpenResetAccount(account: { accountId?: string | null; status?: string | null }): boolean {
  const id = String(account.accountId || '').trim();
  if (!isSafeResetAccountId(id)) return false;
  const status = String(account.status || 'active').trim().toLowerCase();
  return OPEN_RESET_STATUSES.has(status);
}

export function catalogKeyForQuote(quote: Pick<ResetQuote, 'category' | 'accountType' | 'accountSize'>): string {
  if (quote.category === 'funded') return `funded:*:${quote.accountSize}`;
  if (quote.category === 'vip') return `vip:vip:${quote.accountSize}`;
  return `challenge:${quote.accountType}:${quote.accountSize}`;
}

export function listResetCatalog(): ResetCatalogEntry[] {
  if (!cachedCatalog) {
    cachedCatalog = buildResetCatalog();
    cachedCatalogMap = new Map(cachedCatalog.map((row) => [row.key, row]));
  }
  return cachedCatalog;
}

export function isResetCatalogKey(key: string): boolean {
  listResetCatalog();
  return cachedCatalogMap?.has(key) || false;
}

export function formatResetPriceInput(amount: number): string {
  return amount.toFixed(2);
}

export function resetPriceRulesEqual(left?: ResetPriceRule | null, right?: ResetPriceRule | null): boolean {
  if (!left && !right) return true;
  if (!left || !right || left.mode !== right.mode) return false;
  if (left.mode === 'discount' && right.mode === 'discount') return left.discountPercent === right.discountPercent;
  return left.mode === 'fixed' && right.mode === 'fixed' && left.price === right.price;
}

export function parseResetPriceRule(input: unknown): { ok: true; rule: ResetPriceRule } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Choose a discount or a set price.' };
  }
  const mode = (input as { mode?: unknown }).mode;
  if (mode === 'discount') {
    const percent = Number((input as { discountPercent?: unknown }).discountPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return { ok: false, error: 'Discount must be between 0 and 100.' };
    }
    return { ok: true, rule: { mode: 'discount', discountPercent: Math.round(percent * 100) / 100 } };
  }
  if (mode === 'fixed') {
    const price = Number((input as { price?: unknown }).price);
    if (!Number.isFinite(price) || price < MIN_RESET_PRICE || price > MAX_RESET_PRICE) {
      return { ok: false, error: `Set a price from ${formatResetUsd(MIN_RESET_PRICE)} to ${formatResetUsd(MAX_RESET_PRICE)}.` };
    }
    return { ok: true, rule: { mode: 'fixed', price: Math.round(price * 100) / 100 } };
  }
  return { ok: false, error: 'Choose a discount or a set price.' };
}

export function parseResetPriceRuleMap(
  input: unknown
): { ok: true; rules: Record<string, ResetPriceRule | null> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Invalid price list.' };
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > 80) return { ok: false, error: 'Too many price changes at once.' };
  const rules: Record<string, ResetPriceRule | null> = {};
  for (const [key, value] of entries) {
    if (value == null) {
      rules[key] = null;
      continue;
    }
    const parsed = parseResetPriceRule(value);
    if (!parsed.ok) return parsed;
    rules[key] = parsed.rule;
  }
  return { ok: true, rules };
}

export function resetPriceForRule(originalPrice: number, rule: ResetPriceRule): number {
  if (rule.mode === 'discount') return priceAfterPercentOff(originalPrice, rule.discountPercent ?? 0);
  return rule.price ?? originalPrice;
}

export function resetPriceRuleError(originalPrice: number, rule: ResetPriceRule): string | null {
  const price = resetPriceForRule(originalPrice, rule);
  if (!Number.isFinite(price) || price < MIN_RESET_PRICE) {
    return `That discount drops this reset below ${formatResetUsd(MIN_RESET_PRICE)}. Use a smaller discount or set a price of at least ${formatResetUsd(MIN_RESET_PRICE)}.`;
  }
  return null;
}

export function projectResetPrice(
  category: ResetCategory,
  originalPrice: number,
  fallbackPrice: number,
  fallbackNote: string,
  rule: ResetPriceRule | null
): { price: number; discountPercent: number; note: string; error: string | null } {
  if (!rule) {
    const discountPercent = fallbackPrice < originalPrice - 0.001
      ? Math.max(1, Math.round((1 - fallbackPrice / originalPrice) * 100))
      : 0;
    return { price: fallbackPrice, discountPercent, note: fallbackNote, error: null };
  }
  const error = resetPriceRuleError(originalPrice, rule);
  if (error) {
    return { price: fallbackPrice, discountPercent: 0, note: fallbackNote, error };
  }
  const price = resetPriceForRule(originalPrice, rule);
  const discountPercent = rule.mode === 'discount'
    ? rule.discountPercent ?? 0
    : price < originalPrice - 0.001
      ? Math.max(1, Math.round((1 - price / originalPrice) * 100))
      : 0;
  return {
    price,
    discountPercent,
    note: resetFeeNote(category, discountPercent, rule.mode === 'fixed'),
    error: null,
  };
}

export function applyResetPriceRule(quote: ResetQuote, rule: ResetPriceRule): ResetQuote {
  const projected = projectResetPrice(quote.category, quote.originalPrice, quote.price, quote.feeNote, rule);
  if (projected.error) return quote;
  return {
    ...quote,
    price: projected.price,
    discountPercent: projected.discountPercent,
    feeNote: projected.note,
  };
}

export function explainResetPrice(
  account: ResetAccountInput & { accountId?: string | null },
  config: ResetPriceSnapshot | ResetPriceConfig | null | undefined,
  userId?: string | null,
  options?: { ignoreAccountRule?: boolean }
): ResetPriceExplanation | null {
  const base = getResetQuote(account);
  if (!base) return null;

  const key = catalogKeyForQuote(base);
  const storedUser = userId ? config?.users?.[userId] : undefined;
  const accountId = String(account.accountId || '').trim();
  const accountRule = !options?.ignoreAccountRule && accountId
    ? storedUser?.accounts?.[accountId] || null
    : null;
  const userRule = storedUser?.catalog?.[key] || null;
  const globalRule = config?.global?.[key] || null;
  const layers: Array<{ source: Exclude<ResetPriceSource, 'default'>; rule: ResetPriceRule | null }> = [
    { source: 'account', rule: accountRule },
    { source: 'user', rule: userRule },
    { source: 'global', rule: globalRule },
  ];

  let quote = base;
  let source: ResetPriceSource = 'default';
  for (const layer of layers) {
    if (!layer.rule || resetPriceRuleError(base.originalPrice, layer.rule)) continue;
    quote = applyResetPriceRule(base, layer.rule);
    source = layer.source;
    break;
  }

  return {
    quote,
    key,
    source,
    accountRule: storedUser?.accounts?.[accountId] || null,
    userRule,
    globalRule,
  };
}

export function resolveResetQuote(
  account: ResetAccountInput & { accountId?: string | null },
  config: ResetPriceSnapshot | ResetPriceConfig | null | undefined,
  userId?: string | null
): ResetQuote | null {
  return explainResetPrice(account, config, userId)?.quote ?? null;
}

export function buildGlobalCatalog(config: ResetPriceConfig): LayeredResetPrice[] {
  return listResetCatalog().map((entry) => priceCatalogEntry(entry, config, null));
}

export function buildUserCatalog(config: ResetPriceConfig, userId: string): LayeredResetPrice[] {
  return listResetCatalog().map((entry) => priceCatalogEntry(entry, config, userId));
}

export function buildAccountResetPrices(
  config: ResetPriceConfig,
  userId: string,
  accounts: Array<ResetAccountInput & { accountId: string; status?: string | null; platform?: string | null; step?: number | string | null }>
): { accounts: AccountResetPriceRow[]; unpricedCount: number } {
  const rows: AccountResetPriceRow[] = [];
  let unpricedCount = 0;

  for (const account of accounts) {
    const explained = explainResetPrice(account, config, userId);
    if (!explained) {
      unpricedCount += 1;
      continue;
    }
    const inherited = explainResetPrice(account, config, userId, { ignoreAccountRule: true });
    const step = Number(account.step);
    rows.push({
      accountId: account.accountId,
      status: String(account.status || 'active'),
      platform: String(account.platform || 'mt5').toUpperCase(),
      step: Number.isFinite(step) ? step : null,
      accountSize: explained.quote.accountSize,
      catalogKey: explained.key,
      category: explained.quote.category,
      categoryLabel: explained.quote.categoryLabel,
      typeLabel: explained.quote.category === 'funded'
        ? 'All types'
        : explained.quote.category === 'vip'
          ? (explained.quote.tierName || 'VIP')
          : explained.quote.catalogType,
      amountLabel: explained.quote.amountLabel,
      productLabel: explained.quote.productLabel,
      originalPrice: explained.quote.originalPrice,
      rule: explained.accountRule,
      inheritedPrice: inherited?.quote.price ?? explained.quote.price,
      inheritedNote: inherited?.quote.feeNote ?? explained.quote.feeNote,
      price: explained.quote.price,
      discountPercent: explained.quote.discountPercent,
      feeNote: explained.quote.feeNote,
      source: explained.source,
    });
  }

  rows.sort((left, right) => {
    const categoryOrder = { challenge: 0, funded: 1, vip: 2 };
    const categoryDelta = categoryOrder[left.category] - categoryOrder[right.category];
    if (categoryDelta) return categoryDelta;
    if (left.accountSize !== right.accountSize) return left.accountSize - right.accountSize;
    return left.accountId.localeCompare(right.accountId);
  });
  return { accounts: rows, unpricedCount };
}

export function listCustomResetUsers(config: ResetPriceConfig): CustomResetUser[] {
  return Object.values(config.users)
    .map((user) => ({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      catalogCount: Object.keys(user.catalog).length,
      accountCount: Object.keys(user.accounts).length,
    }))
    .filter((user) => user.catalogCount + user.accountCount > 0)
    .sort((a, b) => a.email.localeCompare(b.email) || a.userId.localeCompare(b.userId));
}

export function sanitizeResetPriceConfig(data: unknown): ResetPriceConfig {
  const empty = emptyResetPriceConfig();
  if (!data || typeof data !== 'object') return empty;
  const raw = data as Record<string, unknown>;
  const global: Record<string, ResetPriceRule> = {};

  if (raw.global && typeof raw.global === 'object' && !Array.isArray(raw.global)) {
    for (const [key, value] of Object.entries(raw.global as Record<string, unknown>)) {
      const rule = usableCatalogRule(key, value);
      if (rule) global[key] = rule;
    }
  }

  const users: Record<string, ResetPriceUserRecord> = {};
  if (raw.users && typeof raw.users === 'object' && !Array.isArray(raw.users)) {
    for (const [userId, value] of Object.entries(raw.users as Record<string, unknown>)) {
      if (!isSafeResetUserId(userId) || !value || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      const catalog: Record<string, ResetPriceRule> = {};
      const accounts: Record<string, ResetPriceRule> = {};
      if (record.catalog && typeof record.catalog === 'object' && !Array.isArray(record.catalog)) {
        for (const [key, ruleValue] of Object.entries(record.catalog as Record<string, unknown>)) {
          const rule = usableCatalogRule(key, ruleValue);
          if (rule) catalog[key] = rule;
        }
      }
      if (record.accounts && typeof record.accounts === 'object' && !Array.isArray(record.accounts)) {
        for (const [accountId, ruleValue] of Object.entries(record.accounts as Record<string, unknown>)) {
          if (!isSafeResetAccountId(accountId)) continue;
          const parsed = parseResetPriceRule(ruleValue);
          if (parsed.ok) accounts[accountId] = parsed.rule;
        }
      }
      if (Object.keys(catalog).length === 0 && Object.keys(accounts).length === 0) continue;
      users[userId] = {
        userId,
        email: clipText(record.email, 200),
        displayName: clipText(record.displayName, 200),
        catalog,
        accounts,
      };
    }
  }

  return {
    global,
    users,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
  };
}

export function applyGlobalPriceUpdate(
  config: ResetPriceConfig,
  update: {
    rules?: Record<string, ResetPriceRule | null>;
    applyAll?: ResetPriceRule | null;
    clearAll?: boolean;
  }
): { ok: true; config: ResetPriceConfig } | { ok: false; error: string } {
  let global = { ...config.global };
  if (update.clearAll) global = {};

  if (update.applyAll) {
    const failure = catalogRuleFailure(update.applyAll);
    if (failure) return { ok: false, error: failure };
    global = {};
    for (const entry of listResetCatalog()) global[entry.key] = update.applyAll;
  }

  if (update.rules) {
    for (const [key, rule] of Object.entries(update.rules)) {
      if (!isResetCatalogKey(key)) return { ok: false, error: 'Unknown reset price.' };
      if (!rule) {
        delete global[key];
        continue;
      }
      const entry = catalogEntry(key);
      const error = entry ? resetPriceRuleError(entry.originalPrice, rule) : 'Unknown reset price.';
      if (error) return { ok: false, error: entry ? `${entry.typeLabel} ${entry.amountLabel}: ${error}` : error };
      global[key] = rule;
    }
  }

  return { ok: true, config: { ...config, global } };
}

export function applyUserPriceUpdate(
  config: ResetPriceConfig,
  update: {
    userId: string;
    email: string;
    displayName: string;
    catalog?: Record<string, ResetPriceRule | null>;
    accounts?: Record<string, ResetPriceRule | null>;
    applyAllCatalog?: ResetPriceRule | null;
    applyAllAccounts?: ResetPriceRule | null;
    clearCatalog?: boolean;
    clearAccounts?: boolean;
    pricedAccounts: Array<{ accountId: string; originalPrice: number; label: string }>;
  }
): { ok: true; config: ResetPriceConfig } | { ok: false; error: string } {
  if (!isSafeResetUserId(update.userId)) return { ok: false, error: 'Unknown customer.' };

  const existing = config.users[update.userId];
  let catalog = { ...(existing?.catalog || {}) };
  let accounts = { ...(existing?.accounts || {}) };
  const allowed = new Map(update.pricedAccounts.map((account) => [account.accountId, account]));

  if (update.clearCatalog) catalog = {};
  if (update.applyAllCatalog) {
    const failure = catalogRuleFailure(update.applyAllCatalog);
    if (failure) return { ok: false, error: failure };
    catalog = {};
    for (const entry of listResetCatalog()) catalog[entry.key] = update.applyAllCatalog;
  }
  if (update.catalog) {
    for (const [key, rule] of Object.entries(update.catalog)) {
      if (!isResetCatalogKey(key)) return { ok: false, error: 'Unknown reset price.' };
      if (!rule) {
        delete catalog[key];
        continue;
      }
      const entry = catalogEntry(key);
      const error = entry ? resetPriceRuleError(entry.originalPrice, rule) : 'Unknown reset price.';
      if (error) return { ok: false, error: entry ? `${entry.typeLabel} ${entry.amountLabel}: ${error}` : error };
      catalog[key] = rule;
    }
  }

  if (update.clearAccounts) accounts = {};
  if (update.applyAllAccounts) {
    if (update.pricedAccounts.length === 0) {
      return { ok: false, error: 'This customer has no open accounts to update.' };
    }
    for (const account of update.pricedAccounts) {
      const error = resetPriceRuleError(account.originalPrice, update.applyAllAccounts);
      if (error) return { ok: false, error: `${account.label}: ${error}` };
    }
    for (const account of update.pricedAccounts) accounts[account.accountId] = update.applyAllAccounts;
  }
  if (update.accounts) {
    for (const [accountId, rule] of Object.entries(update.accounts)) {
      const account = allowed.get(accountId);
      if (!account) return { ok: false, error: 'That account is not an open account for this customer.' };
      if (!rule) {
        delete accounts[accountId];
        continue;
      }
      const error = resetPriceRuleError(account.originalPrice, rule);
      if (error) return { ok: false, error: `${account.label}: ${error}` };
      accounts[accountId] = rule;
    }
  }

  const users = { ...config.users };
  if (Object.keys(catalog).length === 0 && Object.keys(accounts).length === 0) {
    delete users[update.userId];
  } else {
    users[update.userId] = {
      userId: update.userId,
      email: clipText(update.email, 200),
      displayName: clipText(update.displayName, 200),
      catalog,
      accounts,
    };
  }

  return { ok: true, config: { ...config, users } };
}

function buildResetCatalog(): ResetCatalogEntry[] {
  const rows: ResetCatalogEntry[] = [];
  const challengeTypes: Array<Exclude<ResetAccountType, 'vip'>> = ['standard', '1-step', 'instant', 'gauntlet'];
  const challengeSizes = [5000, 10000, 25000, 50000, 100000, 200000, 500000];
  const fundedSizes = [10000, 25000, 50000, 100000, 200000, 500000];
  const vipSizes = [1_000_000, 1_500_000, 2_000_000, 3_000_000];

  const add = (account: ResetAccountInput) => {
    const quote = getResetQuote(account);
    if (!quote) return;
    const key = catalogKeyForQuote(quote);
    if (rows.some((row) => row.key === key)) return;
    rows.push({
      key,
      category: quote.category,
      categoryLabel: quote.categoryLabel,
      typeLabel: quote.category === 'funded'
        ? 'All types'
        : quote.category === 'vip'
          ? (quote.tierName || 'VIP')
          : quote.catalogType,
      amountLabel: quote.amountLabel,
      productLabel: quote.productLabel,
      accountType: quote.accountType,
      accountSize: quote.accountSize,
      tierName: quote.tierName,
      originalPrice: quote.originalPrice,
      defaultPrice: quote.price,
      defaultDiscountPercent: quote.discountPercent,
      defaultFeeNote: quote.feeNote,
    });
  };

  for (const accountType of challengeTypes) {
    for (const accountSize of challengeSizes) {
      add({ accountType, accountSize, status: 'active', step: 1, platform: 'mt5' });
    }
  }
  for (const accountSize of fundedSizes) {
    add({ accountType: 'standard', accountSize, status: 'funded', step: 3, platform: 'mt5' });
  }
  for (const accountSize of vipSizes) {
    add({ accountType: 'vip', accountSize, status: 'active', platform: 'mt5' });
  }

  return rows;
}

function priceCatalogEntry(entry: ResetCatalogEntry, config: ResetPriceConfig, userId: string | null): LayeredResetPrice {
  const base = baseQuoteFromEntry(entry);
  const userRule = userId ? config.users[userId]?.catalog?.[entry.key] || null : null;
  const globalRule = config.global[entry.key] || null;
  const inheritedRule = userId ? globalRule : null;
  const inherited = inheritedRule && !resetPriceRuleError(entry.originalPrice, inheritedRule)
    ? applyResetPriceRule(base, inheritedRule)
    : base;
  const activeRule = userId ? userRule : globalRule;
  const effective = activeRule && !resetPriceRuleError(entry.originalPrice, activeRule)
    ? applyResetPriceRule(base, activeRule)
    : inherited;

  return {
    ...entry,
    rule: activeRule,
    inheritedPrice: inherited.price,
    inheritedNote: inherited.feeNote,
    price: effective.price,
    discountPercent: effective.discountPercent,
    feeNote: effective.feeNote,
  };
}

function baseQuoteFromEntry(entry: ResetCatalogEntry): ResetQuote {
  const catalogType: ResetCatalogType = entry.category === 'funded'
    ? 'Funded'
    : entry.category === 'vip'
      ? 'VIP'
      : (entry.typeLabel as ResetCatalogType);
  return {
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    productLabel: entry.productLabel,
    challengeType: entry.category === 'funded'
      ? 'Funded Reset'
      : entry.category === 'vip'
        ? 'VIP Reset'
        : `${entry.typeLabel} Reset`,
    catalogType,
    accountType: entry.accountType,
    amountLabel: entry.amountLabel,
    accountSize: entry.accountSize,
    platform: 'MT5',
    tierName: entry.tierName,
    originalPrice: entry.originalPrice,
    price: entry.defaultPrice,
    discountPercent: entry.defaultDiscountPercent,
    feeNote: entry.defaultFeeNote,
  };
}

function usableCatalogRule(key: string, value: unknown): ResetPriceRule | null {
  if (!isResetCatalogKey(key)) return null;
  const parsed = parseResetPriceRule(value);
  if (!parsed.ok) return null;
  const entry = catalogEntry(key);
  if (!entry || resetPriceRuleError(entry.originalPrice, parsed.rule)) return null;
  return parsed.rule;
}

function catalogRuleFailure(rule: ResetPriceRule): string | null {
  for (const entry of listResetCatalog()) {
    const error = resetPriceRuleError(entry.originalPrice, rule);
    if (error) return `${entry.categoryLabel} ${entry.typeLabel} ${entry.amountLabel}: ${error}`;
  }
  return null;
}

function catalogEntry(key: string): ResetCatalogEntry | undefined {
  listResetCatalog();
  return cachedCatalogMap?.get(key);
}

function resetFeeNote(category: ResetCategory, discountPercent: number, custom: boolean): string {
  const percent = Number.isInteger(discountPercent)
    ? String(discountPercent)
    : String(Math.round(discountPercent * 100) / 100);
  if (custom) {
    return discountPercent > 0 ? `Custom reset price, ${percent}% off the list price` : 'Custom reset price';
  }
  if (discountPercent <= 0) {
    if (category === 'funded') return 'Funded activation fee';
    if (category === 'vip') return 'VIP allocation fee';
    return 'Challenge fee';
  }
  if (category === 'funded') return `${percent}% off the funded activation fee`;
  if (category === 'vip') return `${percent}% off the VIP allocation fee`;
  return `${percent}% off the challenge fee`;
}

function clipText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
