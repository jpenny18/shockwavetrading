'use client';

import React from 'react';
import { formatVipDollars, getVipProfitTracker } from '../../lib/vip-accounts';

export default function VipProfitTracker({
  profit,
  profitSplit,
  compact = false
}: {
  profit: number;
  profitSplit?: number | string | null;
  compact?: boolean;
}) {
  const tracker = getVipProfitTracker(profit, profitSplit);
  const profitColor = tracker.profit >= 0 ? 'text-green-400' : 'text-red-400';

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-500 mb-1">Profit</p>
          <p className={profitColor}>{formatVipDollars(tracker.profit)}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Your share ({tracker.profitSplit}%)</p>
          <p className="text-[#0FF1CE]">{formatVipDollars(tracker.traderShare)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Profit Tracker</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Current profit</p>
          <p className={`text-2xl font-semibold ${profitColor}`}>{formatVipDollars(tracker.profit)}</p>
        </div>
        <div className="rounded-lg border border-[#0FF1CE]/20 bg-[#0FF1CE]/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Your share ({tracker.profitSplit}%)</p>
          <p className="text-2xl font-semibold text-[#0FF1CE]">{formatVipDollars(tracker.traderShare)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        VIP is a funded allocation. There is no profit target to pass. Your share uses the {tracker.profitSplit}/{100 - tracker.profitSplit} split on positive profit.
      </p>
    </div>
  );
}
