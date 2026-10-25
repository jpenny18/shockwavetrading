'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getCachedMetrics, getUserVipMetaApiAccounts, getVIPActivation } from '@/lib/firebase';
import { VIP_RULES } from '@/lib/vip-accounts';
import { Loader2 } from 'lucide-react';
import PortalActions from '../components/PortalActions';
import VipAccountCard, { sortVipAccounts, VipAccountListItem } from '../components/VipAccountCard';

export default function VipAccountsPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<VipAccountListItem[]>([]);
  const [hasVipAccess, setHasVipAccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [vip, vipAccounts] = await Promise.all([
          getVIPActivation(user.uid).catch((error) => {
            console.error('Error fetching VIP activation:', error);
            return null;
          }),
          getUserVipMetaApiAccounts(user.uid)
        ]);

        const withMetrics = await Promise.all(vipAccounts.map(async (account) => ({
          ...account,
          cachedMetrics: await getCachedMetrics(account.accountId)
        })));

        setHasVipAccess(!!vip || withMetrics.length > 0);
        setAccounts(sortVipAccounts(withMetrics));
      } catch (error) {
        console.error('Error fetching VIP accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, authLoading]);

  if (authLoading || loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0FF1CE]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/dashboard/vip" className="text-xs text-gray-500 hover:text-white">
            VIP home
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">Accounts</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {accounts.length > 0
              ? `${accounts.length} connected · ${VIP_RULES.maxDrawdown}% max drawdown · ${VIP_RULES.maxDailyDrawdown}% daily`
              : 'Connected VIP allocations'}
          </p>
        </div>
        {hasVipAccess && (
          <PortalActions buyLabel={accounts.length > 0 ? 'Buy another allocation' : 'Buy an allocation'} />
        )}
      </div>

      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <VipAccountCard key={account.accountId} account={account} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-white">
            {hasVipAccess ? 'No account connected yet' : 'VIP accounts are locked'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            {hasVipAccess
              ? 'Once your allocation is provisioned, balance, drawdown, profit split, and login details show up here.'
              : 'Buy an allocation on the VIP payment portal, or ask support if a private offer should already be on your account.'}
          </p>
          <button
            type="button"
            onClick={() => router.push(hasVipAccess ? '/dashboard/vip' : '/vip')}
            className="mt-6 rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] px-5 py-2.5 text-sm font-semibold text-black"
          >
            {hasVipAccess ? 'Back to VIP home' : 'View VIP allocations'}
          </button>
        </div>
      )}
    </div>
  );
}
