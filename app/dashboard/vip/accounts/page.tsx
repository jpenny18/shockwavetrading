'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, UserMetaApiAccount, getCachedMetrics, getVIPActivation } from '../../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Particles from '../../../components/Particles';
import { formatVipAllocation, getVipTierName, isVipMetaApiAccount, VIP_RULES } from '../../../../lib/vip-accounts';
import { Lock, AlertTriangle, Loader2, ChevronRight, DollarSign, BarChart, Crown } from 'lucide-react';
import VipLoginCredentialsAccordion from '../../../components/VipLoginCredentials';
import VipProfitTracker from '../../../components/VipProfitTracker';

interface AccountWithMetrics extends UserMetaApiAccount {
  cachedMetrics?: any;
}

export default function VipAccountsPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountWithMetrics[]>([]);
  const [hasVipAccess, setHasVipAccess] = useState(false);

  useEffect(() => {
    const fetchVipAccounts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const vip = await getVIPActivation(user.uid);
        setHasVipAccess(!!vip);

        const accountsRef = collection(db, 'userMetaApiAccounts');
        const q = query(accountsRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);

        const accountsData: AccountWithMetrics[] = [];

        for (const docSnap of snapshot.docs) {
          const account = docSnap.data() as UserMetaApiAccount;
          if (!isVipMetaApiAccount(account)) continue;

          const metrics = await getCachedMetrics(account.accountId);
          accountsData.push({
            ...account,
            cachedMetrics: metrics
          });
        }

        accountsData.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

        setAccounts(accountsData);
      } catch (error) {
        console.error('Error fetching VIP accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVipAccounts();
  }, [user]);

  const handleViewAccount = (accountId: string) => {
    router.push(`/dashboard/vip/accounts/${accountId}`);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'passed':
        return 'bg-blue-500/20 text-blue-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'funded':
        return 'bg-purple-500/20 text-purple-400';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getBorderStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'hover:border-[#0FF1CE]/30';
      case 'passed':
        return 'hover:border-blue-400/30';
      case 'failed':
        return 'hover:border-red-400/30';
      case 'funded':
        return 'hover:border-purple-400/30';
      case 'inactive':
        return 'hover:border-gray-400/30';
      default:
        return 'hover:border-[#0FF1CE]/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  if (accounts.length > 0) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
        <Particles />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent flex items-center gap-2">
                <Crown className="w-6 h-6 text-[#0FF1CE]" />
                VIP Trading Accounts
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {accounts.length} VIP {accounts.length === 1 ? 'account' : 'accounts'} • Funded allocation • {VIP_RULES.maxDrawdown}% / {VIP_RULES.maxDailyDrawdown}% drawdown
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {accounts.map((account) => (
              <div
                key={account.accountId}
                className={`bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6 ${getBorderStyle(account.status)} transition-all duration-300`}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => handleViewAccount(account.accountId)}
                >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Shockwave VIP</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatVipAllocation(account.accountSize)} • {getVipTierName(account.accountSize)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 ${getStatusStyle(account.status)} text-xs font-medium rounded-full`}>
                    {account.status.toUpperCase()}
                  </span>
                </div>

                {account.status === 'failed' && (
                  <p className="text-xs text-red-400 mb-4">
                    VIP account failed. View final metrics and history.
                  </p>
                )}

                {account.cachedMetrics && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-lg border border-[#0FF1CE]/20 p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <DollarSign size={14} />
                        Balance
                      </div>
                      <p className="text-white font-medium">
                        ${account.cachedMetrics.balance?.toLocaleString() || '-'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-lg border border-[#0FF1CE]/20 p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <BarChart size={14} />
                        Max DD
                      </div>
                      <p className={`font-medium ${(account.cachedMetrics.maxDrawdown || 0) > VIP_RULES.maxDrawdown ? 'text-red-400' : 'text-white'}`}>
                        {(account.cachedMetrics.maxDrawdown ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )}

                {account.cachedMetrics && (
                  <div className="mb-4">
                    <VipProfitTracker
                      compact
                      profit={(account.cachedMetrics.balance || account.accountSize) - account.accountSize}
                      profitSplit={account.profitSplit}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#2F2F2F]/50">
                  <div className="text-xs text-gray-400">
                    {account.platform.toUpperCase()} •
                    {account.startDate ? ` Started ${new Date(account.startDate.toDate()).toLocaleDateString()}` : ' Not started'}
                  </div>
                  <ChevronRight className="text-gray-400" size={16} />
                </div>
                </div>

                <VipLoginCredentialsAccordion
                  credentials={account.loginCredentials}
                  platform={account.platform}
                  emptyMessage="Login details will appear here after your VIP account is connected with broker credentials."
                />
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          .background-noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
            opacity: 0.15;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <Particles />

      <div className="relative blur-sm pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50 h-64" />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-gradient-to-br from-[#1A1A1A]/95 to-[#151515]/95 backdrop-blur-sm rounded-2xl p-8 border border-[#0FF1CE]/20 shadow-[0_0_20px_rgba(15,241,206,0.15)] max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
            {hasVipAccess ? <AlertTriangle className="text-[#0FF1CE]" size={32} /> : <Lock className="text-[#0FF1CE]" size={32} />}
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-3">
            {hasVipAccess ? 'No VIP Account Linked Yet' : 'VIP Accounts Locked'}
          </h2>
          <p className="text-gray-400 mb-6">
            {hasVipAccess
              ? 'Your VIP portal is unlocked. Once your allocation is provisioned, your live metrics, drawdown, and profit split tracker will appear here.'
              : 'VIP account metrics become available after your VIP allocation is unlocked and connected.'}
          </p>
          <button
            onClick={() => router.push(hasVipAccess ? '/dashboard/vip' : '/vip')}
            className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 inline-flex items-center gap-2"
          >
            {hasVipAccess ? 'Open VIP Portal' : 'View VIP Program'}
            <Crown size={20} />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }
      `}</style>
    </div>
  );
}
