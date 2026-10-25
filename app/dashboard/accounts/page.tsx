'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, UserMetaApiAccount, getCachedMetrics } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Particles from '../../components/Particles';
import { formatMetaApiAccountName, isVipMetaApiAccount } from '../../../lib/vip-accounts';
import { Lock, Plus, AlertTriangle, TrendingUp, Loader2, ChevronRight, DollarSign, BarChart } from 'lucide-react';
import VipLoginCredentialsAccordion from '../../components/VipLoginCredentials';

interface AccountWithMetrics extends UserMetaApiAccount {
  cachedMetrics?: any;
}

export default function MyAccountsPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountWithMetrics[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          setIsAdmin(idTokenResult.claims.admin === true);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const fetchAllAccounts = async () => {
      if (user) {
        try {
          // Query all accounts for this user
          const accountsRef = collection(db, 'userMetaApiAccounts');
          const q = query(accountsRef, where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          
          const accountsData: AccountWithMetrics[] = [];
          
          // Fetch each account with its cached metrics
          for (const doc of snapshot.docs) {
            const account = doc.data() as UserMetaApiAccount;
            // VIP accounts are managed on /dashboard/vip/accounts
            if (isVipMetaApiAccount(account)) continue;
            
            // Try to get cached metrics for each account
            const metrics = await getCachedMetrics(account.accountId);
            
            accountsData.push({
              ...account,
              cachedMetrics: metrics
            });
          }

          // Add placeholder accounts for admins (for testing/maintenance)
          if (isAdmin && accountsData.length === 0) {
            const placeholderAccounts: AccountWithMetrics[] = [
              {
                accountId: 'PLACEHOLDER_10K_ACTIVE',
                userId: user.uid,
                accountType: 'standard',
                accountSize: 10000,
                step: 1,
                status: 'active',
                platform: 'mt5',
                accountToken: 'placeholder-token-10k',
                createdAt: { toMillis: () => Date.now() } as any,
                updatedAt: { toMillis: () => Date.now() } as any,
                startDate: { toDate: () => new Date() } as any,
                cachedMetrics: {
                  balance: 10450.50,
                  equity: 10450.50,
                  profit: 450.50,
                  drawdown: 2.5,
                  dailyDrawdown: 1.2,
                  totalTrades: 15,
                  winRate: 66.7,
                  lastUpdated: new Date().toISOString()
                }
              },
              {
                accountId: 'PLACEHOLDER_50K_FUNDED',
                userId: user.uid,
                accountType: 'gauntlet',
                accountSize: 50000,
                step: 3,
                status: 'active',
                platform: 'mt5',
                accountToken: 'placeholder-token-50k',
                createdAt: { toMillis: () => Date.now() - 86400000 } as any,
                updatedAt: { toMillis: () => Date.now() } as any,
                startDate: { toDate: () => new Date(Date.now() - 86400000) } as any,
                cachedMetrics: {
                  balance: 53200.75,
                  equity: 53200.75,
                  profit: 3200.75,
                  drawdown: 5.8,
                  dailyDrawdown: 0.5,
                  totalTrades: 42,
                  winRate: 71.4,
                  lastUpdated: new Date().toISOString()
                }
              },
              {
                accountId: 'PLACEHOLDER_100K_1STEP',
                userId: user.uid,
                accountType: '1-step',
                accountSize: 100000,
                step: 1,
                status: 'active',
                platform: 'mt4',
                accountToken: 'placeholder-token-100k',
                createdAt: { toMillis: () => Date.now() - 172800000 } as any,
                updatedAt: { toMillis: () => Date.now() } as any,
                startDate: { toDate: () => new Date(Date.now() - 172800000) } as any,
                cachedMetrics: {
                  balance: 107850.25,
                  equity: 107850.25,
                  profit: 7850.25,
                  drawdown: 3.2,
                  dailyDrawdown: 0.8,
                  totalTrades: 28,
                  winRate: 75.0,
                  lastUpdated: new Date().toISOString()
                }
              }
            ];
            
            accountsData.push(...placeholderAccounts);
          }
          
          // Sort accounts: active first, then by creation date
          accountsData.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return b.createdAt.toMillis() - a.createdAt.toMillis();
          });
          
          setAccounts(accountsData);
        } catch (error) {
          console.error('Error fetching accounts:', error);
        }
      }
      setLoading(false);
    };

    fetchAllAccounts();
  }, [user, isAdmin]);

  const handleStartChallenge = () => {
    router.push('/challenge');
  };

  const handleViewAccount = (accountId: string) => {
    // Check if it's a placeholder account
    if (accountId.startsWith('PLACEHOLDER_')) {
      alert('This is a placeholder account for testing. The full account view is available for real accounts only.');
      return;
    }
    router.push(`/dashboard/accounts/${accountId}`);
  };
  
  // Determine status styling
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

  const getIconColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#0FF1CE]/10 text-[#0FF1CE]';
      case 'passed':
        return 'bg-blue-500/10 text-blue-400';
      case 'failed':
        return 'bg-red-500/10 text-red-400';
      case 'funded':
        return 'bg-purple-500/10 text-purple-400';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-400';
      default:
        return 'bg-[#0FF1CE]/10 text-[#0FF1CE]';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  // If user has accounts, show them
  if (accounts.length > 0) {
    const activeAccounts = accounts.filter(acc => acc.status === 'active' || acc.status === 'inactive');
    const canAddMore = activeAccounts.length < 5;

    return (
      <div className="relative min-h-screen">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
        <Particles />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Maintenance Banner - Hidden */}
          {/* <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-500/20 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-400 font-semibold mb-1">Metrics Dashboard Maintenance</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our metrics dashboard is currently undergoing maintenance and is temporarily offline. Please trade safe and manage your risk carefully during this time. We'll have it back online shortly.
                </p>
              </div>
            </div>
          </div> */}

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">My Trading Accounts</h1>
              <p className="text-sm text-gray-400 mt-1">
                {activeAccounts.length} of 5 active challenge accounts
              </p>
            </div>
            
            {canAddMore && (
              <button 
                onClick={handleStartChallenge}
                className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-semibold py-2 px-4 rounded-lg hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Challenge
              </button>
            )}
          </div>

          {/* Account Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {accounts.map((account) => {
              const isPlaceholder = account.accountId.startsWith('PLACEHOLDER_');
              return (
                <div 
                  key={account.accountId}
                  className={`bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6 ${getBorderStyle(account.status)} transition-all duration-300 ${isPlaceholder ? 'relative' : ''}`}
                >
                  {/* Placeholder Badge */}
                  {isPlaceholder && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold">
                      TEST ACCOUNT
                    </div>
                  )}

                  <div
                    className="cursor-pointer"
                    onClick={() => handleViewAccount(account.accountId)}
                  >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {formatMetaApiAccountName(account.accountType)}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        ${account.accountSize.toLocaleString()} • {account.step === 3 ? 'Funded' : 
                                                                  (account.accountType === '1-step' || account.accountType === 'gauntlet') ? 'Challenge' : 
                                                                  `Step ${account.step}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 ${getStatusStyle(account.status)} text-xs font-medium rounded-full`}>
                      {account.status.toUpperCase()}
                    </span>
                  </div>

                  {account.status === 'failed' && (
                    <p className="text-xs text-red-400 mb-4">
                      Challenge failed. View final metrics and history.
                    </p>
                  )}

                  {/* Quick Stats */}
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
                          Profit
                        </div>
                        <p className={`font-medium ${
                          (account.cachedMetrics.balance - account.accountSize) >= 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          ${((account.cachedMetrics.balance || account.accountSize) - account.accountSize).toLocaleString()}
                        </p>
                      </div>
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
                    emptyMessage="Login details will appear here after your challenge account is connected with broker credentials."
                  />
                </div>
              );
            })}

            {/* Add New Challenge Card - Only show if less than 5 active */}
            {canAddMore && (
              <div 
                className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-dashed border-[#2F2F2F] p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#0FF1CE]/50 transition-all duration-300 min-h-[280px]"
                onClick={handleStartChallenge}
              >
                <div className="w-12 h-12 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center mb-4">
                  <Plus className="text-[#0FF1CE]" size={24} />
                </div>
                <h3 className="text-white font-medium mb-2">Start New Challenge</h3>
                <p className="text-xs text-gray-400 text-center">
                  Add up to {5 - activeAccounts.length} more challenge {5 - activeAccounts.length === 1 ? 'account' : 'accounts'}
                </p>
              </div>
            )}
          </div>

          {!canAddMore && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 mt-0.5" size={20} />
                <div>
                  <p className="text-amber-500 font-medium">Maximum Accounts Reached</p>
                  <p className="text-sm text-gray-300 mt-1">
                    You have reached the maximum of 5 active challenge accounts. Complete or close an existing challenge to add a new one.
                  </p>
                </div>
              </div>
            </div>
          )}
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

  // Otherwise show the locked state
  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Maintenance Banner - Hidden */}
      {/* <div className="relative z-10 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-500/20 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-400 font-semibold mb-1">Metrics Dashboard Maintenance</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our metrics dashboard is currently undergoing maintenance and is temporarily offline. Please trade safe and manage your risk carefully during this time. We'll have it back online shortly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Blurred placeholder content */}
      <div className="relative blur-sm pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Placeholder cards to show blurred in background */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50 h-64" />
            ))}
          </div>
        </div>
      </div>

      {/* Locked content overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-gradient-to-br from-[#1A1A1A]/95 to-[#151515]/95 backdrop-blur-sm rounded-2xl p-8 border border-[#0FF1CE]/20 shadow-[0_0_20px_rgba(15,241,206,0.15)] max-w-md w-full mx-4 text-center transform hover:scale-[1.02] hover:border-[#0FF1CE]/50 transition-all duration-300">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
            <Lock className="text-[#0FF1CE]" size={32} />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-3">Account Metrics Locked</h2>
          <p className="text-gray-400 mb-6">
            See your account metrics and performance analytics after purchasing a challenge. Start your journey to becoming a funded trader today.
          </p>
          <button 
            onClick={handleStartChallenge}
            className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 inline-flex items-center gap-2"
          >
            Start New Challenge
            <Plus size={20} />
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
