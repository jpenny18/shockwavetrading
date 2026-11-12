'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CircleDollarSign, Loader2, Search, X } from 'lucide-react';
import { getAllUsers, type UserData } from '@/lib/firebase';
import { formatResetUsd, type ResetCategory } from '@/lib/reset-pricing';
import {
  parseResetPriceRule,
  projectResetPrice,
  resetPriceRuleError,
  resetPriceRulesEqual,
  type AccountResetPriceRow,
  type CustomResetUser,
  type LayeredResetPrice,
  type ResetPriceRule,
} from '@/lib/reset-price-config';

type DraftMode = 'default' | 'discount' | 'fixed';
type CatalogFilter = 'all' | 'standard' | '1-step' | 'instant' | 'gauntlet' | 'funded' | 'vip';
type UserGroupFilter = CatalogFilter | 'accounts';

interface Draft {
  mode: DraftMode;
  value: string;
}

interface CustomerProfile {
  uid: string;
  email: string;
  displayName: string;
}

const CATALOG_FILTERS: Array<{ id: CatalogFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'standard', label: 'Standard' },
  { id: '1-step', label: '1-Step' },
  { id: 'instant', label: 'Instant' },
  { id: 'gauntlet', label: 'Gauntlet' },
  { id: 'funded', label: 'Funded' },
  { id: 'vip', label: 'VIP' },
];

const USER_FILTERS: Array<{ id: UserGroupFilter; label: string }> = [
  ...CATALOG_FILTERS,
  { id: 'accounts', label: 'Open accounts' },
];

function rowMatchesFilter(row: { category: string; accountType: string }, filter: CatalogFilter) {
  if (filter === 'all') return true;
  if (filter === 'funded' || filter === 'vip') return row.category === filter;
  return row.category === 'challenge' && row.accountType === filter;
}

const GROUP_COPY: Record<ResetCategory, string> = {
  challenge: 'Challenge resets are priced by challenge type and account size.',
  funded: 'Funded resets use one price per account size for every challenge type.',
  vip: 'VIP resets are priced by allocation.',
};

function ruleToDraft(rule: ResetPriceRule | null | undefined): Draft {
  if (!rule) return { mode: 'default', value: '' };
  if (rule.mode === 'discount') return { mode: 'discount', value: String(rule.discountPercent ?? '') };
  return { mode: 'fixed', value: rule.price == null ? '' : String(rule.price) };
}

function draftToRule(draft: Draft): { rule: ResetPriceRule | null; error: string | null } {
  if (draft.mode === 'default') return { rule: null, error: null };
  const parsed = parseResetPriceRule(
    draft.mode === 'discount'
      ? { mode: 'discount', discountPercent: draft.value.trim() === '' ? Number.NaN : Number(draft.value) }
      : { mode: 'fixed', price: draft.value.trim() === '' ? Number.NaN : Number(draft.value) }
  );
  if (!parsed.ok) return { rule: null, error: parsed.error };
  return { rule: parsed.rule, error: null };
}

function draftsFor(rows: Array<{ id: string; rule: ResetPriceRule | null }>): Record<string, Draft> {
  const drafts: Record<string, Draft> = {};
  for (const row of rows) drafts[row.id] = ruleToDraft(row.rule);
  return drafts;
}

function isDirty(rule: ResetPriceRule | null, draft: Draft | undefined): boolean {
  const parsed = draftToRule(draft || ruleToDraft(rule));
  if (parsed.error) return true;
  return !resetPriceRulesEqual(rule, parsed.rule);
}

async function sendJson(url: string, method: 'GET' | 'PUT', body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('Sign in again to change reset prices.');
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  return data;
}

function collectChanges(
  rows: Array<{ id: string; label: string; originalPrice: number; rule: ResetPriceRule | null }>,
  drafts: Record<string, Draft>
): { ok: true; rules: Record<string, ResetPriceRule | null> } | { ok: false; error: string } {
  const rules: Record<string, ResetPriceRule | null> = {};
  for (const row of rows) {
    const parsed = draftToRule(drafts[row.id] || ruleToDraft(row.rule));
    if (parsed.error) return { ok: false, error: `${row.label}: ${parsed.error}` };
    if (parsed.rule) {
      const priceError = resetPriceRuleError(row.originalPrice, parsed.rule);
      if (priceError) return { ok: false, error: `${row.label}: ${priceError}` };
    }
    if (!resetPriceRulesEqual(row.rule, parsed.rule)) rules[row.id] = parsed.rule;
  }
  return { ok: true, rules };
}

function ResetPriceEditor({
  title,
  subtitle,
  detail,
  category,
  originalPrice,
  inheritedPrice,
  inheritedNote,
  draft,
  inheritedLabel,
  onChange,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  category: ResetCategory;
  originalPrice: number;
  inheritedPrice: number;
  inheritedNote: string;
  draft: Draft;
  inheritedLabel: string;
  onChange: (draft: Draft) => void;
}) {
  const parsed = draftToRule(draft);
  const projected = projectResetPrice(
    category,
    originalPrice,
    inheritedPrice,
    inheritedNote,
    parsed.error ? null : parsed.rule
  );
  const error = parsed.error || (parsed.rule ? projected.error : null);

  return (
    <div className="rounded-xl border border-white/10 bg-black p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:w-56">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          {detail && <p className="mt-1 truncate text-[11px] text-gray-500">{detail}</p>}
        </div>
        <div className="lg:w-36">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">List price</p>
          <p className="text-sm text-gray-300">{formatResetUsd(originalPrice)}</p>
        </div>
        <div className="lg:w-40">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Reset price</p>
          {originalPrice > projected.price + 0.001 && (
            <p className="text-xs text-gray-500 line-through">{formatResetUsd(originalPrice)}</p>
          )}
          <p className="text-sm font-semibold text-[#0FF1CE]">{formatResetUsd(projected.price)}</p>
          <p className="text-[11px] text-gray-500">{projected.note}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <select
            aria-label={`${title} ${subtitle} adjustment`}
            value={draft.mode}
            onChange={(event) => onChange({ mode: event.target.value as DraftMode, value: '' })}
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none sm:w-44"
          >
            <option value="default">{inheritedLabel}</option>
            <option value="discount">Discount %</option>
            <option value="fixed">Set price</option>
          </select>
          {draft.mode !== 'default' && (
            <input
              aria-label={draft.mode === 'discount' ? `${title} discount percent` : `${title} reset price`}
              type="number"
              min={draft.mode === 'discount' ? 0 : 0.5}
              max={draft.mode === 'discount' ? 100 : 100000}
              step={draft.mode === 'discount' ? 1 : 0.01}
              value={draft.value}
              onChange={(event) => onChange({ ...draft, value: event.target.value })}
              placeholder={draft.mode === 'discount' ? '20' : '199.00'}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
            />
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function ResetPricesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<LayeredResetPrice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [customUsers, setCustomUsers] = useState<CustomResetUser[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [group, setGroup] = useState<CatalogFilter>('all');
  const [priceTab, setPriceTab] = useState<'global' | 'customer'>('global');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [applyMode, setApplyMode] = useState<'discount' | 'fixed'>('discount');
  const [applyValue, setApplyValue] = useState('20');

  const [directory, setDirectory] = useState<UserData[] | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CustomerProfile | null>(null);
  const [userCatalog, setUserCatalog] = useState<LayeredResetPrice[]>([]);
  const [userAccounts, setUserAccounts] = useState<AccountResetPriceRow[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, Draft>>({});
  const [accountDrafts, setAccountDrafts] = useState<Record<string, Draft>>({});
  const [unpricedCount, setUnpricedCount] = useState(0);
  const [userGroup, setUserGroup] = useState<UserGroupFilter>('all');
  const [userApplyMode, setUserApplyMode] = useState<'discount' | 'fixed'>('discount');
  const [userApplyValue, setUserApplyValue] = useState('20');

  const applyGlobalPayload = (data: { catalog?: LayeredResetPrice[]; customUsers?: CustomResetUser[]; updatedAt?: string | null }) => {
    const rows = data.catalog || [];
    setCatalog(rows);
    setCustomUsers(data.customUsers || []);
    setUpdatedAt(data.updatedAt || null);
    setDrafts(draftsFor(rows.map((row) => ({ id: row.key, rule: row.rule }))));
  };

  const applyUserPayload = (data: {
    user: CustomerProfile;
    catalog?: LayeredResetPrice[];
    accounts?: AccountResetPriceRow[];
    unpricedCount?: number;
  }) => {
    const rows = data.catalog || [];
    const accounts = data.accounts || [];
    setSelectedUser(data.user);
    setUserCatalog(rows);
    setUserAccounts(accounts);
    setUnpricedCount(data.unpricedCount || 0);
    setUserDrafts(draftsFor(rows.map((row) => ({ id: row.key, rule: row.rule }))));
    setAccountDrafts(draftsFor(accounts.map((account) => ({ id: account.accountId, rule: account.rule }))));
  };

  const loadGlobal = async () => {
    setLoading(true);
    setError(null);
    try {
      applyGlobalPayload(await sendJson('/api/admin/reset-prices', 'GET'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load reset prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobal();
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  };

  const loadDirectory = async () => {
    if (directory || directoryLoading) return;
    setDirectoryLoading(true);
    try {
      const users = await getAllUsers();
      setDirectory(users.filter((user) => user.uid && user.email));
    } catch (loadError) {
      console.error(loadError);
      setError('Could not load customers.');
      setDirectory([]);
    } finally {
      setDirectoryLoading(false);
    }
  };

  const loadUser = async (userId: string) => {
    setUserLoading(true);
    setError(null);
    try {
      const data = await sendJson(`/api/admin/reset-prices/users/${encodeURIComponent(userId)}`, 'GET');
      applyUserPayload(data);
      setSearchOpen(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load this customer.');
    } finally {
      setUserLoading(false);
    }
  };

  const globalDirty = catalog.some((row) => isDirty(row.rule, drafts[row.key]));
  const userDirty = userCatalog.some((row) => isDirty(row.rule, userDrafts[row.key]))
    || userAccounts.some((account) => isDirty(account.rule, accountDrafts[account.accountId]));

  const refreshCustomerList = async () => {
    try {
      const fresh = await sendJson('/api/admin/reset-prices', 'GET');
      setCustomUsers(fresh.customUsers || []);
      setUpdatedAt(fresh.updatedAt || null);
      if (!globalDirty) applyGlobalPayload(fresh);
    } catch (refreshError) {
      console.error(refreshError);
    }
  };

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return catalog.filter((row) => {
      if (!rowMatchesFilter(row, group)) return false;
      if (!query) return true;
      return `${row.categoryLabel} ${row.typeLabel} ${row.amountLabel} ${row.productLabel}`.toLowerCase().includes(query);
    });
  }, [catalog, catalogQuery, group]);

  const filteredUserCatalog = useMemo(() => {
    if (userGroup === 'accounts') return [];
    return userCatalog.filter((row) => rowMatchesFilter(row, userGroup));
  }, [userCatalog, userGroup]);

  const userMatches = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!directory || query.length < 2) return [];
    return directory
      .filter((user) => {
        const name = `${user.displayName || ''} ${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        return user.email.toLowerCase().includes(query) || name.includes(query);
      })
      .slice(0, 8);
  }, [directory, userQuery]);

  const saveGlobalRows = async () => {
    const changes = collectChanges(
      catalog.map((row) => ({
        id: row.key,
        label: `${row.typeLabel} ${row.amountLabel}`,
        originalPrice: row.originalPrice,
        rule: row.rule,
      })),
      drafts
    );
    if (!changes.ok) {
      setError(changes.error);
      return;
    }
    if (Object.keys(changes.rules).length === 0) {
      flash('Those prices are already saved.');
      return;
    }
    if (userDirty && !window.confirm('Saving global prices reloads the selected customer.')) return;
    setSaving(true);
    setError(null);
    try {
      applyGlobalPayload(await sendJson('/api/admin/reset-prices', 'PUT', { rules: changes.rules }));
      if (selectedUser) await loadUser(selectedUser.uid);
      flash('Saved. Dashboards and checkout use these prices now.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save reset prices');
    } finally {
      setSaving(false);
    }
  };

  const applyGlobalAll = async () => {
    const parsed = parseResetPriceRule(
      applyMode === 'discount'
        ? { mode: 'discount', discountPercent: Number(applyValue) }
        : { mode: 'fixed', price: Number(applyValue) }
    );
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (!window.confirm(globalDirty
      ? 'This replaces unsaved edits and sets every global reset price.'
      : 'Set this price on every challenge type and account size?')) return;
    setSaving(true);
    setError(null);
    try {
      applyGlobalPayload(await sendJson('/api/admin/reset-prices', 'PUT', { applyAll: parsed.rule }));
      if (selectedUser) await loadUser(selectedUser.uid);
      flash('Applied to every challenge type and account size.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to apply reset prices');
    } finally {
      setSaving(false);
    }
  };

  const restoreGlobal = async () => {
    if (!window.confirm('Restore every global reset price to the built-in fee?')) return;
    setSaving(true);
    setError(null);
    try {
      applyGlobalPayload(await sendJson('/api/admin/reset-prices', 'PUT', { clearAll: true }));
      if (selectedUser) await loadUser(selectedUser.uid);
      flash('Global reset prices are back to the built-in fees.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to restore reset prices');
    } finally {
      setSaving(false);
    }
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    const catalogChanges = collectChanges(
      userCatalog.map((row) => ({
        id: row.key,
        label: `${row.typeLabel} ${row.amountLabel}`,
        originalPrice: row.originalPrice,
        rule: row.rule,
      })),
      userDrafts
    );
    if (!catalogChanges.ok) {
      setError(catalogChanges.error);
      return;
    }
    const accountChanges = collectChanges(
      userAccounts.map((account) => ({
        id: account.accountId,
        label: `${account.productLabel} ${account.amountLabel}`,
        originalPrice: account.originalPrice,
        rule: account.rule,
      })),
      accountDrafts
    );
    if (!accountChanges.ok) {
      setError(accountChanges.error);
      return;
    }
    if (Object.keys(catalogChanges.rules).length === 0 && Object.keys(accountChanges.rules).length === 0) {
      flash('Those prices are already saved.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await sendJson(`/api/admin/reset-prices/users/${encodeURIComponent(selectedUser.uid)}`, 'PUT', {
        catalog: catalogChanges.rules,
        accounts: accountChanges.rules,
      });
      applyUserPayload(data);
      await refreshCustomerList();
      flash('Saved for this customer. Their dashboard uses these prices now.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save this customer.');
    } finally {
      setSaving(false);
    }
  };

  const applyToUser = async (target: 'catalog' | 'accounts') => {
    if (!selectedUser) return;
    const parsed = parseResetPriceRule(
      userApplyMode === 'discount'
        ? { mode: 'discount', discountPercent: Number(userApplyValue) }
        : { mode: 'fixed', price: Number(userApplyValue) }
    );
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const message = target === 'catalog'
      ? 'Set this price on every challenge type and account size for this customer?'
      : 'Set this price on every open account for this customer?';
    if (!window.confirm(userDirty ? `This replaces unsaved edits. ${message}` : message)) return;
    setSaving(true);
    setError(null);
    try {
      const data = await sendJson(`/api/admin/reset-prices/users/${encodeURIComponent(selectedUser.uid)}`, 'PUT', (
        target === 'catalog' ? { applyAllCatalog: parsed.rule } : { applyAllAccounts: parsed.rule }
      ));
      applyUserPayload(data);
      await refreshCustomerList();
      flash(target === 'catalog'
        ? 'Applied to every challenge type and account size for this customer.'
        : 'Applied to every open account for this customer.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to apply this price.');
    } finally {
      setSaving(false);
    }
  };

  const clearUser = async () => {
    if (!selectedUser) return;
    if (!window.confirm('Remove this customer’s custom reset prices?')) return;
    setSaving(true);
    setError(null);
    try {
      const data = await sendJson(`/api/admin/reset-prices/users/${encodeURIComponent(selectedUser.uid)}`, 'PUT', {
        clearCatalog: true,
        clearAccounts: true,
      });
      applyUserPayload(data);
      await refreshCustomerList();
      flash('This customer now uses the global reset prices.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to clear this customer.');
    } finally {
      setSaving(false);
    }
  };

  const renderCatalog = (
    rows: LayeredResetPrice[],
    rowDrafts: Record<string, Draft>,
    setRowDrafts: React.Dispatch<React.SetStateAction<Record<string, Draft>>>,
    inheritedLabel: string
  ) => {
    const visibleGroups = (['challenge', 'funded', 'vip'] as ResetCategory[]).filter((category) =>
      rows.some((row) => row.category === category)
    );
    if (rows.length === 0) {
      return <p className="text-sm text-gray-400">No matching prices.</p>;
    }
    return visibleGroups.map((category) => (
      <div key={category} className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">{category}</h3>
          <p className="text-xs text-gray-500">{GROUP_COPY[category]}</p>
        </div>
        {rows.filter((row) => row.category === category).map((row) => (
          <ResetPriceEditor
            key={row.key}
            title={row.typeLabel}
            subtitle={`${row.amountLabel} · ${row.categoryLabel}`}
            category={row.category}
            originalPrice={row.originalPrice}
            inheritedPrice={row.inheritedPrice}
            inheritedNote={row.inheritedNote}
            draft={rowDrafts[row.key] || ruleToDraft(row.rule)}
            inheritedLabel={inheritedLabel}
            onChange={(next) => setRowDrafts((current) => ({ ...current, [row.key]: next }))}
          />
        ))}
      </div>
    ));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Reset Prices</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Set the fee customers pay to reset an account. A discount comes off the list price. A set price replaces the fee.
            Saved prices show on the dashboard and are charged at checkout.
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs text-gray-500">Last saved {new Date(updatedAt).toLocaleString()}</p>
          )}
        </div>
        <button
          type="button"
          onClick={loadGlobal}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-[#0FF1CE]/50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-[#0FF1CE]/30 bg-[#0FF1CE]/10 p-4 text-sm text-[#0FF1CE]">
          <Check size={16} />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex gap-2 border-b border-white/10">
        <button
          type="button"
          onClick={() => setPriceTab('global')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
            priceTab === 'global' ? 'border-[#0FF1CE] text-[#0FF1CE]' : 'border-transparent text-gray-400'
          }`}
        >
          All customers
        </button>
        <button
          type="button"
          onClick={() => setPriceTab('customer')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
            priceTab === 'customer' ? 'border-[#0FF1CE] text-[#0FF1CE]' : 'border-transparent text-gray-400'
          }`}
        >
          One customer
        </button>
      </div>

      {priceTab === 'global' && (
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">All customers</h2>
            <p className="text-sm text-gray-400">
              {catalog.filter((row) => row.rule).length === 0
                ? 'Built-in fees are in use.'
                : `${catalog.filter((row) => row.rule).length} custom prices are saved.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveGlobalRows}
              disabled={saving || loading || !globalDirty}
              className="rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={restoreGlobal}
              disabled={saving || loading}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-[#0FF1CE]/50 disabled:opacity-50"
            >
              Restore built-in prices
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black p-4">
          <p className="text-sm font-medium text-white">Apply one price to every challenge type and account size</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block">
              <span className="mb-1 block text-xs text-gray-400">Adjustment</span>
              <select
                value={applyMode}
                onChange={(event) => setApplyMode(event.target.value as 'discount' | 'fixed')}
                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
              >
                <option value="discount">Discount %</option>
                <option value="fixed">Set price</option>
              </select>
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-xs text-gray-400">
                {applyMode === 'discount' ? 'Percent off the list price' : 'Reset price in USD'}
              </span>
              <input
                type="number"
                min={applyMode === 'discount' ? 0 : 0.5}
                max={applyMode === 'discount' ? 100 : 100000}
                step={applyMode === 'discount' ? 1 : 0.01}
                value={applyValue}
                onChange={(event) => setApplyValue(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={applyGlobalAll}
              disabled={saving || loading}
              className="rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Apply to all
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {CATALOG_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGroup(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  group === item.id ? 'bg-[#0FF1CE] text-black' : 'border border-white/10 text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Filter by type or size"
              className="w-full rounded-lg border border-white/10 bg-black py-2 pl-9 pr-3 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin text-[#0FF1CE]" />
            Loading reset prices...
          </div>
        ) : (
          <div className="space-y-6">
            {renderCatalog(filteredCatalog, drafts, setDrafts, 'Built-in price')}
          </div>
        )}
      </section>
      )}

      {priceTab === 'customer' && (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">One customer</h2>
          <p className="text-sm text-gray-400">
            Search a customer, then set a price for each challenge type and size, or for one of their open accounts.
            An account price applies to that account. A type and size price applies to that customer's accounts of that kind. The global price applies when those are left on their default.
          </p>
        </div>

        {customUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customUsers.map((user) => (
              <button
                key={user.userId}
                type="button"
                onClick={() => loadUser(user.userId)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  selectedUser?.uid === user.userId
                    ? 'border-[#0FF1CE] text-[#0FF1CE]'
                    : 'border-white/10 text-gray-300 hover:border-[#0FF1CE]/40'
                }`}
              >
                {user.displayName || user.email} · {user.catalogCount + user.accountCount}
              </button>
            ))}
          </div>
        )}

        <div className="relative max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={userQuery}
            onChange={(event) => {
              setUserQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
              loadDirectory();
            }}
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-white/10 bg-black py-2.5 pl-10 pr-3 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
          />
          {searchOpen && userQuery.trim().length >= 2 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-black">
              {directoryLoading ? (
                <p className="px-4 py-3 text-sm text-gray-400">Loading customers...</p>
              ) : userMatches.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No matching customers</p>
              ) : (
                userMatches.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                      setUserQuery(user.email);
                      loadUser(user.uid);
                    }}
                    className="block w-full px-4 py-3 text-left hover:bg-white/5"
                  >
                    <span className="block text-sm text-white">{user.displayName || user.email}</span>
                    <span className="block text-xs text-gray-400">{user.email}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {userLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin text-[#0FF1CE]" />
            Loading accounts...
          </div>
        )}

        {selectedUser && !userLoading && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">{selectedUser.displayName || selectedUser.email}</p>
                <p className="text-xs text-gray-400">{selectedUser.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveUser}
                  disabled={saving || !userDirty}
                  className="rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  Save customer
                </button>
                <button
                  type="button"
                  onClick={clearUser}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Use global prices
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserCatalog([]);
                    setUserAccounts([]);
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:text-white"
                  aria-label="Close customer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black p-4">
              <p className="text-sm font-medium text-white">Apply one price for this customer</p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
                <select
                  value={userApplyMode}
                  onChange={(event) => setUserApplyMode(event.target.value as 'discount' | 'fixed')}
                  className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
                >
                  <option value="discount">Discount %</option>
                  <option value="fixed">Set price</option>
                </select>
                <input
                  type="number"
                  min={userApplyMode === 'discount' ? 0 : 0.5}
                  max={userApplyMode === 'discount' ? 100 : 100000}
                  step={userApplyMode === 'discount' ? 1 : 0.01}
                  value={userApplyValue}
                  onChange={(event) => setUserApplyValue(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none lg:max-w-xs"
                />
                <button
                  type="button"
                  onClick={() => applyToUser('catalog')}
                  disabled={saving}
                  className="rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  Apply to all types and sizes
                </button>
                <button
                  type="button"
                  onClick={() => applyToUser('accounts')}
                  disabled={saving || userAccounts.length === 0}
                  className="rounded-lg border border-[#0FF1CE]/40 px-4 py-2 text-sm font-semibold text-[#0FF1CE] disabled:opacity-50"
                >
                  Apply to open accounts
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {USER_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setUserGroup(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    userGroup === item.id ? 'bg-[#0FF1CE] text-black' : 'border border-white/10 text-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {userGroup !== 'accounts' && (
              <div className="space-y-6">
                {renderCatalog(filteredUserCatalog, userDrafts, setUserDrafts, 'Follow global')}
              </div>
            )}

            {(userGroup === 'all' || userGroup === 'accounts') && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Open accounts</h3>
                <p className="text-xs text-gray-500">
                  Active, inactive, funded, and passed accounts. A price here applies only to that account.
                </p>
              </div>
              {unpricedCount > 0 && (
                <p className="text-xs text-amber-200">
                  {unpricedCount} open {unpricedCount === 1 ? 'account has' : 'accounts have'} no reset price for that size.
                </p>
              )}
              {userAccounts.length === 0 ? (
                <p className="text-sm text-gray-400">This customer has no open accounts with a reset price. Type and size prices still apply when they open one.</p>
              ) : (
                userAccounts.map((account) => (
                  <ResetPriceEditor
                    key={account.accountId}
                    title={account.productLabel}
                    subtitle={`${account.amountLabel} · ${account.categoryLabel} · ${account.status}`}
                    detail={`${account.platform} · ${account.accountId}`}
                    category={account.category}
                    originalPrice={account.originalPrice}
                    inheritedPrice={account.inheritedPrice}
                    inheritedNote={account.inheritedNote}
                    draft={accountDrafts[account.accountId] || ruleToDraft(account.rule)}
                    inheritedLabel="Follow type price"
                    onChange={(next) => setAccountDrafts((current) => ({ ...current, [account.accountId]: next }))}
                  />
                ))
              )}
            </div>
            )}
          </div>
        )}
      </section>
      )}
    </div>
  );
}
