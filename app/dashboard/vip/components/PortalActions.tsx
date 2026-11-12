'use client';

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { VIP_PAYMENT_PORTAL_URL } from '@/lib/vip-portal';
import VipPurchaseModal from './VipPurchaseModal';

export default function PortalActions({
  compact = false,
  buyLabel = 'Buy another allocation',
  showReset = true
}: {
  compact?: boolean;
  buyLabel?: string;
  showReset?: boolean;
}) {
  const [buyOpen, setBuyOpen] = useState(false);
  const className = compact
    ? 'inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-center text-xs font-semibold leading-tight transition sm:w-auto'
    : 'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-sm font-semibold leading-tight transition sm:w-auto';

  return (
    <>
    <div className={showReset
      ? 'grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto'
      : 'flex w-full sm:w-auto'}>
      <button
        type="button"
        onClick={() => setBuyOpen(true)}
        className={`${className} bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black hover:brightness-110`}
      >
        <Plus size={compact ? 14 : 16} />
        {buyLabel}
      </button>
      {showReset && (
        <a
          href={VIP_PAYMENT_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} border border-[#2F2F2F] bg-[#141414] text-white hover:border-[#0FF1CE]/40`}
        >
          <RefreshCw size={compact ? 14 : 16} className="text-[#0FF1CE]" />
          Reset an account
        </a>
      )}
    </div>
    {buyOpen && <VipPurchaseModal onClose={() => setBuyOpen(false)} />}
    </>
  );
}
