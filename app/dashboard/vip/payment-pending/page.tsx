'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LayoutDashboard } from 'lucide-react';

type PendingSource = 'offer' | 'allocation';

export default function VipPaymentPendingPage() {
  const router = useRouter();
  const [source, setSource] = useState<PendingSource>('offer');

  useEffect(() => {
    document.body.style.overflow = '';
    const value = new URLSearchParams(window.location.search).get('source');
    if (value === 'allocation') setSource('allocation');
  }, []);

  const subject = source === 'allocation' ? 'VIP allocation' : 'private VIP offer';

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <div className="rounded-2xl border border-white/10 bg-black px-6 py-10 text-center sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0FF1CE]/10">
          <CheckCircle2 className="h-8 w-8 text-[#0FF1CE]" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0FF1CE]">Shockwave VIP</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Payment submitted</h1>
        <div className="mx-auto mt-4 max-w-lg space-y-3 text-sm leading-relaxed text-gray-300">
          <p>We received your crypto payment request for this {subject}.</p>
          <p>
            We still need to verify the transfer. That usually takes up to 30 minutes and can take longer depending on the network. We will email you when it is confirmed.
          </p>
          <p>You can leave this page. The email goes to the address on your account.</p>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="mb-4 text-sm text-gray-400">
            Need help? Email{' '}
            <a href="mailto:support@shockwave-capital.com" className="text-[#0FF1CE] hover:underline">
              support@shockwave-capital.com
            </a>
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/vip')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0FF1CE] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <LayoutDashboard size={18} />
            Back to VIP portal
          </button>
        </div>
      </div>
    </div>
  );
}
