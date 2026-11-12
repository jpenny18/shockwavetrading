'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Beaker, Check, Loader2, Search, Trash2 } from 'lucide-react';
import { getAllUsers, type UserData } from '@/lib/firebase';
import { isTestChallengeType, testSizeChoices, type TestChallengeType } from '@/lib/test-accounts';

interface TestAccountRow {
  id: string;
  accountId: string;
  userId: string;
  email: string;
  name: string;
  accountType: string;
  accountSize: number;
  platform: string;
  status: string;
  step: number;
  failed: boolean;
  createdAt: string | null;
}

interface CustomerProfile {
  uid: string;
  email: string;
  name: string;
}

const TYPE_LABELS: Record<TestChallengeType, string> = {
  standard: 'Standard',
  '1-step': '1-Step',
  instant: 'Instant',
  gauntlet: 'Gauntlet',
  vip: 'VIP',
};

async function sendJson(url: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('Sign in again to manage test accounts.');
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  return data;
}

function money(size: number) {
  return `$${size.toLocaleString('en-US')}`;
}

export default function TestAccountsPage() {
  const [accounts, setAccounts] = useState<TestAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [directory, setDirectory] = useState<UserData[] | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [accountType, setAccountType] = useState<TestChallengeType>('standard');
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [platform, setPlatform] = useState<'mt4' | 'mt5'>('mt5');
  const [funded, setFunded] = useState(false);
  const [failed, setFailed] = useState(false);

  const sizes = useMemo(
    () => testSizeChoices(accountType, accountType === 'vip' ? false : funded),
    [accountType, funded]
  );

  useEffect(() => {
    if (!sizes.some((row) => row.accountSize === accountSize) && sizes[0]) {
      setAccountSize(sizes[0].accountSize);
    }
  }, [sizes, accountSize]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sendJson('/api/admin/test-accounts', 'GET');
      setAccounts(data.accounts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load test accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
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

  const matches = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!directory || query.length < 2) return [];
    return directory.filter((user) => {
      const name = `${user.displayName || ''} ${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      return user.email.toLowerCase().includes(query) || name.includes(query);
    }).slice(0, 8);
  }, [directory, userQuery]);

  const createAccount = async () => {
    if (!customer) {
      setError('Choose a customer first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sendJson('/api/admin/test-accounts', 'POST', {
        userId: customer.uid,
        accountType,
        accountSize,
        platform,
        funded: accountType !== 'vip' && funded,
        failed,
      });
      await loadAccounts();
      flash('Test account added. It is on that customer’s dashboard.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create the test account');
    } finally {
      setSaving(false);
    }
  };

  const toggleFailed = async (account: TestAccountRow) => {
    setSaving(true);
    setError(null);
    try {
      const data = await sendJson(`/api/admin/test-accounts/${encodeURIComponent(account.accountId)}`, 'PATCH', {
        failed: !account.failed,
      });
      setAccounts((current) => current.map((row) => (
        row.accountId === account.accountId
          ? { ...row, failed: data.failed, status: data.status }
          : row
      )));
      flash(data.failed ? 'Account marked failed.' : 'Account marked open.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update the test account');
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (account: TestAccountRow) => {
    if (!window.confirm(`Remove the test ${account.accountType} account from ${account.email || 'this customer'}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await sendJson(`/api/admin/test-accounts/${encodeURIComponent(account.accountId)}`, 'DELETE');
      setAccounts((current) => current.filter((row) => row.accountId !== account.accountId));
      flash('Test account removed.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to delete the test account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Test Accounts</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Add a sample account to a customer so you can check the dashboard, reset price, and metrics.
          Sample numbers stay on the account. Live broker data is left alone.
        </p>
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

      <section className="space-y-4 rounded-xl border border-white/10 bg-black p-4">
        <div className="flex items-center gap-2">
          <Beaker size={18} className="text-[#0FF1CE]" />
          <h2 className="text-sm font-semibold text-white">Add a test account</h2>
        </div>

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
            placeholder="Search a customer by name or email"
            className="w-full rounded-lg border border-white/10 bg-black py-2.5 pl-10 pr-3 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
          />
          {searchOpen && userQuery.trim().length >= 2 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-black">
              {directoryLoading ? (
                <p className="px-4 py-3 text-sm text-gray-400">Loading customers...</p>
              ) : matches.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No matching customers</p>
              ) : (
                matches.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                      setCustomer({
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                      });
                      setUserQuery(user.email);
                      setSearchOpen(false);
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
        {customer && <p className="text-xs text-[#0FF1CE]">Adding to {customer.name} · {customer.email}</p>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-gray-400">Challenge type</span>
            <select
              value={accountType}
              onChange={(event) => {
                const next = event.target.value;
                if (isTestChallengeType(next)) {
                  setAccountType(next);
                  if (next === 'vip') setFunded(false);
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-400">Account size</span>
            <select
              value={accountSize}
              onChange={(event) => setAccountSize(Number(event.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
            >
              {sizes.map((row) => (
                <option key={row.key} value={row.accountSize}>{row.amountLabel}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-400">Platform</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value === 'mt4' ? 'mt4' : 'mt5')}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-[#0FF1CE]/50 focus:outline-none"
            >
              <option value="mt5">MT5</option>
              <option value="mt4">MT4</option>
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className={`flex items-center gap-2 text-sm text-white ${accountType === 'vip' ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                checked={accountType !== 'vip' && funded}
                disabled={accountType === 'vip'}
                onChange={(event) => setFunded(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black text-[#0FF1CE]"
              />
              Funded
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={failed}
                onChange={(event) => setFailed(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black text-[#0FF1CE]"
              />
              Failed
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={createAccount}
          disabled={saving || !customer}
          className="rounded-lg bg-[#0FF1CE] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add test account'}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Current test accounts</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin text-[#0FF1CE]" />
            Loading test accounts...
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-400">No test accounts yet.</p>
        ) : (
          accounts.map((account) => (
            <div key={account.accountId} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{account.name || account.email || account.userId}</p>
                <p className="text-xs text-gray-400">{account.email}</p>
                <p className="mt-1 text-xs text-gray-300">
                  {TYPE_LABELS[account.accountType as TestChallengeType] || account.accountType} · {money(account.accountSize)} · {account.platform.toUpperCase()} · {account.status}
                  {account.step === 3 ? ' · funded' : ''}
                </p>
                <p className="mt-1 truncate text-[11px] text-gray-500">{account.accountId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleFailed(account)}
                  disabled={saving}
                  className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                    account.failed
                      ? 'border border-white/10 text-white'
                      : 'border border-red-500/40 text-red-300'
                  }`}
                >
                  {account.failed ? 'Mark open' : 'Mark failed'}
                </button>
                <button
                  type="button"
                  onClick={() => removeAccount(account)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:text-white disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
