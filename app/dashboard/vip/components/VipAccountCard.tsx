'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import VipLoginCredentialsAccordion from '@/app/components/VipLoginCredentials';
import { UserMetaApiAccount } from '@/lib/firebase';
import { VIP_PAYMENT_PORTAL_URL } from '@/lib/vip-portal';
import {
  formatVipAllocation,
  formatVipDollars,
  getVipProfitTracker,
  getVipTierName,
  VIP_RULES
} from '@/lib/vip-accounts';

export interface VipAccountListItem extends UserMetaApiAccount {
  cachedMetrics?: {
    balance?: number;
    maxDrawdown?: number;
  } | null;
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-400/10 text-emerald-300',
  passed: 'bg-sky-400/10 text-sky-300',
  failed: 'bg-red-400/10 text-red-300',
  funded: 'bg-violet-400/10 text-violet-300',
  inactive: 'bg-white/5 text-gray-400'
};

export function sortVipAccounts<T extends { status: string; createdAt?: { toMillis?: () => number } }>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
  });
}

export default function VipAccountCard({ account }: { account: VipAccountListItem }) {
  const router = useRouter();
  const metrics = account.cachedMetrics;
  const balance = metrics?.balance ?? account.accountSize;
  const profit = balance - account.accountSize;
  const tracker = getVipProfitTracker(profit, account.profitSplit);
  const profitColor = tracker.profit >= 0 ? 'text-emerald-300' : 'text-red-300';
  const drawdown = metrics?.maxDrawdown;

  return (
    <article className="rounded-2xl border border-white/10 bg-black p-4 sm:p-5">
      <button
        type="button"
        onClick={() => router.push(`/dashboard/vip/accounts/${account.accountId}`)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">
              {getVipTierName(account.accountSize)}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">{formatVipAllocation(account.accountSize)}</h3>
            <p className="mt-1 text-xs text-gray-500">{account.platform?.toUpperCase() || 'MT5'} · Shockwave VIP</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${STATUS_CLASS[account.status] || STATUS_CLASS.inactive}`}>
            {account.status}
          </span>
        </div>

        {metrics ? (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
            <div className="min-w-0">
              <p className="text-[10px] leading-tight text-gray-500 sm:text-[11px]">Balance</p>
              <p className="mt-1 break-words text-xs text-white sm:text-sm">{formatVipDollars(balance)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] leading-tight text-gray-500 sm:text-[11px]">Max drawdown</p>
              <p className={`mt-1 text-xs sm:text-sm ${(drawdown || 0) > VIP_RULES.maxDrawdown ? 'text-red-300' : 'text-white'}`}>
                {(drawdown ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] leading-tight text-gray-500 sm:text-[11px]">Your share</p>
              <p className={`mt-1 break-words text-xs sm:text-sm ${profitColor}`}>{formatVipDollars(tracker.traderShare)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-5 border-t border-white/5 pt-4 text-xs text-gray-500">
            {VIP_RULES.maxDrawdown}% max drawdown · {VIP_RULES.maxDailyDrawdown}% daily
          </p>
        )}

        <span className="mt-4 inline-flex items-center gap-1 text-xs text-gray-400">
          View metrics
          <ChevronRight size={14} />
        </span>
      </button>

      <VipLoginCredentialsAccordion
        credentials={account.loginCredentials}
        platform={account.platform}
        emptyMessage="Login details will appear here after your VIP account is connected with broker credentials."
      />

      {account.status === 'failed' && (
        <a
          href={VIP_PAYMENT_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm text-[#0FF1CE] hover:underline"
        >
          Reset this account
        </a>
      )}
    </article>
  );
}
