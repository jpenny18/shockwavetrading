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
import { fetchMyVipOffers, type PortalVipOffer } from '@/lib/vip-offer-client';
import { Loader2, Lock } from 'lucide-react';
import AllocationOffers from './components/AllocationOffers';
import PortalActions from './components/PortalActions';
import VipAccountCard, { sortVipAccounts, VipAccountListItem } from './components/VipAccountCard';

export default function VIPPortalPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(true);
  const [activation, setActivation] = useState<VIPActivation | null>(null);
  const [offers, setOffers] = useState<PortalVipOffer[]>([]);
  const [accounts, setAccounts] = useState<VipAccountListItem[]>([]);

  const loadData = async (uid: string) => {
    try {
      setIsLoading(true);
      const vip = await getVIPActivation(uid);
      setActivation(vip);
      if (vip) recordVIPPageVisit(uid);
      try {
        const token = await auth.currentUser?.getIdToken();
        setOffers(token ? await fetchMyVipOffers(token) : []);
      } catch (offersError) {
        console.error('Error loading VIP offers:', offersError);
        setOffers([]);
      }

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
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('offer') === 'crypto') {
      router.replace('/dashboard/vip/payment-pending?source=offer');
      return;
    }
    if (params.get('vip') === 'crypto') {
      router.replace('/dashboard/vip/payment-pending?source=allocation');
    }
  }, [router]);

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

  const refreshOffers = async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      setOffers(await fetchMyVipOffers(token));
    } catch (error) {
      console.error('Error refreshing VIP offers:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0FF1CE]" />
      </div>
    );
  }

  if (!activation && offers.length === 0 && accounts.length === 0) {
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-4 md:space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0FF1CE]">Shockwave VIP</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Your allocation offers</h1>
          </div>
          <PortalActions showReset={false} buyLabel={accounts.length > 0 ? 'Buy another allocation' : 'Buy an allocation'} />
        </header>

        {activation?.reviewNotes && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {activation.reviewNotes}
          </div>
        )}

        {user && (activation || offers.length > 0) && (
          <AllocationOffers
            userId={user.uid}
            activation={activation}
            offers={offers}
            onActivationUpdated={refreshActivation}
            onOffersUpdated={refreshOffers}
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
