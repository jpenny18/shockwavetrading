'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  auth,
  getCachedMetrics,
  getUserVipMetaApiAccounts,
  getVIPActivation,
  recordVIPPageVisit,
  VIPActivation
} from '@/lib/firebase';
import { VIP_RULES } from '@/lib/vip-accounts';
import { ChevronDown, Loader2, Lock } from 'lucide-react';
import PortalActions from './components/PortalActions';
import VipAccountCard, { sortVipAccounts, VipAccountListItem } from './components/VipAccountCard';
import VipOnboarding from './components/VipOnboarding';

const RULES = [
  [`${VIP_RULES.maxDrawdown}%`, 'Max drawdown'],
  [`${VIP_RULES.maxDailyDrawdown}%`, 'Daily drawdown'],
  [VIP_RULES.leverage, 'Leverage'],
  [`${VIP_RULES.profitSplit}%`, 'Starting split']
];

export default function VIPPortalPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(true);
  const [activation, setActivation] = useState<VIPActivation | null>(null);
  const [accounts, setAccounts] = useState<VipAccountListItem[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);

  const loadData = async (uid: string) => {
    try {
      setIsLoading(true);
      const vip = await getVIPActivation(uid);
      setActivation(vip);
      if (vip) recordVIPPageVisit(uid);

      try {
        const vipAccounts = await getUserVipMetaApiAccounts(uid);
        const withMetrics = await Promise.all(vipAccounts.map(async (account) => ({
          ...account,
          cachedMetrics: await getCachedMetrics(account.accountId)
        })));
        setAccounts(sortVipAccounts(withMetrics));
      } catch (accountsError) {
        console.error('Error loading VIP trading accounts:', accountsError);
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error loading VIP activation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/access');
      return;
    }
    loadData(user.uid);
  }, [user, authLoading, router]);

  const refreshActivation = async () => {
    if (!user) return;
    try {
      const vip = await getVIPActivation(user.uid);
      setActivation(vip);
    } catch (error) {
      console.error('Error refreshing VIP activation:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0FF1CE]" />
      </div>
    );
  }

  if (!activation && accounts.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-black px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
          <Lock className="text-[#0FF1CE]" size={20} />
        </div>
        <h1 className="text-xl font-semibold text-white">VIP is locked</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-400">
          VIP opens after an allocation is purchased or unlocked for your account.
        </p>
        <button
          type="button"
          onClick={() => router.push('/vip')}
          className="mt-6 rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] px-5 py-2.5 text-sm font-semibold text-black"
        >
          View VIP allocations
        </button>
      </div>
    );
  }

  const savings = activation?.publicPrice && activation.publicPrice > activation.price
    ? activation.publicPrice - activation.price
    : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="space-y-4 md:space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0FF1CE]">Shockwave VIP</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Your allocations</h1>
          </div>
          <PortalActions buyLabel={accounts.length > 0 ? 'Buy another allocation' : 'Buy an allocation'} />
        </header>

        {activation?.reviewNotes && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {activation.reviewNotes}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          {activation && (
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                {activation.tierName && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">{activation.tierName}</p>
                )}
                <h2 className="mt-1 break-words text-2xl font-semibold text-white">{activation.accountSize}</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Your private allocation{activation.platform ? ` · ${activation.platform}` : ''}
                </p>
              </div>
              {activation.paymentStatus === 'unpaid' && (
                <div className="sm:text-right">
                  {savings > 0 && (
                    <p className="text-sm text-gray-500 line-through">${activation.publicPrice!.toLocaleString()}</p>
                  )}
                  <p className="text-2xl font-semibold text-white">${activation.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{savings > 0 ? `You save $${savings.toLocaleString()}` : 'One-time fee'}</p>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setRulesOpen((open) => !open)}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-gray-300 sm:px-5 ${activation ? 'border-t border-white/10' : ''}`}
            aria-expanded={rulesOpen}
          >
            Allocation rules
            <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
          </button>
          {rulesOpen && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 px-4 py-4 sm:grid-cols-4 sm:px-5">
              {RULES.map(([value, label]) => (
                <div key={label} className="min-w-0">
                  <p className="text-lg font-semibold text-white">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {activation && user && (
          <VipOnboarding
            userId={user.uid}
            activation={activation}
            onUpdated={refreshActivation}
          />
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Accounts</h2>
            {accounts.length > 0 && (
              <button type="button" onClick={() => router.push('/dashboard/vip/accounts')} className="text-sm text-gray-400 hover:text-white">
                View all
              </button>
            )}
          </div>
          {accounts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {accounts.map((account) => (
                <VipAccountCard key={account.accountId} account={account} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-gray-400">
              {activation
                ? 'No trading account is connected yet. It will show up here with login details, drawdown, and your profit split after provisioning.'
                : 'Your VIP accounts will show up here once they are connected.'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
