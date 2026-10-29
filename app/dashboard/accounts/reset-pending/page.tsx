'use client';

import { Loader2, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResetCryptoPendingPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 text-center">
        <Loader2 className="mx-auto h-14 w-14 animate-spin text-[#0FF1CE]" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Reset payment pending</h1>
        <div className="mx-auto mt-4 max-w-lg space-y-4 text-gray-300">
          <p>
            We are waiting to receive your crypto payment for this account reset. Confirmation can take up to 30 minutes depending on the network.
          </p>
          <p>
            After the payment is confirmed, the starting balance on this account is reset so you can take a fresh start. We will email you when that is done.
          </p>
          <p>You can close this page. The email goes to the address on your account.</p>
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
            onClick={() => router.push('/dashboard/accounts')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0FF1CE] px-6 py-3 font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform duration-300 hover:scale-[1.02]"
          >
            <LayoutDashboard size={18} />
            Back to my accounts
          </button>
        </div>
      </div>
    </div>
  );
}
