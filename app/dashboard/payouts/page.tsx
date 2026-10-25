'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  auth,
  getUser,
  getWithdrawalRequest,
  submitWithdrawalDetails
} from '../../../lib/firebase';
import {
  Wallet,
  CheckCircle,
  Clock,
  Lock,
  AlertTriangle,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

function formatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTimestamp(value: { toDate?: () => Date } | string | number | Date | undefined) {
  try {
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (value === undefined || value === null || typeof value === 'object') return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function statusLabel(status?: string, submitted?: boolean) {
  if (status === 'pending' && !submitted) return 'Action needed';
  if (status === 'pending') return 'In review';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'completed') return 'Paid';
  return 'Open';
}

function statusTone(status?: string) {
  switch (status) {
    case 'pending': return 'text-yellow-300 bg-yellow-400/10 border-yellow-400/20';
    case 'approved': return 'text-sky-300 bg-sky-400/10 border-sky-400/20';
    case 'rejected': return 'text-red-300 bg-red-400/10 border-red-400/20';
    case 'completed': return 'text-[#0FF1CE] bg-[#0FF1CE]/10 border-[#0FF1CE]/20';
    default: return 'text-gray-300 bg-white/5 border-white/10';
  }
}

export default function PayoutsPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [payoutsUnlocked, setPayoutsUnlocked] = useState(false);
  const [withdrawalRequest, setWithdrawalRequest] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'usdc_solana' | 'usdt_trc20' | ''>('usdc_solana');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkEligibilityAndFetchData = async () => {
      if (authLoading) return;

      if (!user) {
        router.push('/access');
        return;
      }

      try {
        const [request, profile] = await Promise.all([
          getWithdrawalRequest(user.uid),
          getUser(user.uid).catch(() => null)
        ]);
        setWithdrawalRequest(request);
        setPayoutsUnlocked(profile?.payoutsUnlocked === true);

        if (request?.paymentMethod) {
          setPaymentMethod(request.paymentMethod);
        }
        if (request?.walletAddress) {
          setWalletAddress(request.walletAddress);
        }
      } catch (error) {
        console.error('Error loading payout data:', error);
        toast.error('Failed to load payout information');
      } finally {
        setLoading(false);
      }
    };

    checkEligibilityAndFetchData();
  }, [user, authLoading, router]);

  const handleSubmitDetails = async () => {
    if (!paymentMethod || !walletAddress.trim()) {
      toast.error('Please select payment method and enter wallet address');
      return;
    }

    if (paymentMethod === 'usdc_solana' && walletAddress.length < 32) {
      toast.error('Invalid Solana wallet address');
      return;
    }
    if (paymentMethod === 'usdt_trc20' && !walletAddress.startsWith('T')) {
      toast.error('Invalid TRC20 wallet address');
      return;
    }

    setSubmitting(true);
    try {
      await submitWithdrawalDetails(user!.uid, paymentMethod, walletAddress);
      const updatedRequest = await getWithdrawalRequest(user!.uid);
      setWithdrawalRequest(updatedRequest);
      toast.success('Withdrawal details submitted successfully');
    } catch (error) {
      console.error('Error submitting withdrawal details:', error);
      toast.error('Failed to submit withdrawal details');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Toaster position="top-center" />
        <Loader2 className="h-8 w-8 animate-spin text-[#0FF1CE]" />
      </div>
    );
  }

  const pageOpen = Boolean(withdrawalRequest) || payoutsUnlocked;

  if (!pageOpen) {
    return (
      <div className="max-w-xl mx-auto py-8 md:py-16">
        <Toaster position="top-center" />
        <div className="rounded-3xl border border-white/10 bg-[#111111]/80 p-8 md:p-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-400">
            <Lock size={26} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0FF1CE]">Payouts</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">This page is locked</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400 hidden">
            Payouts open when a funded account is ready for a payout, or when our team unlocks the page for you.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard/accounts')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0FF1CE] px-4 py-3 text-sm font-semibold text-black hover:bg-[#0FF1CE]/90"
            >
              <Wallet size={16} />
              View my accounts
            </button>
            <button
              onClick={() => router.push('/challenge')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:border-[#0FF1CE]/40"
            >
              Purchase a challenge
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submitted = Boolean(withdrawalRequest?.submittedAt);
  const needsWallet = withdrawalRequest?.status === 'pending' && !submitted;
  const steps = withdrawalRequest
    ? [
        { label: 'Issued', done: true },
        { label: 'Wallet', done: submitted || withdrawalRequest.status !== 'pending' },
        { label: 'Review', done: withdrawalRequest.status === 'approved' || withdrawalRequest.status === 'completed' },
        { label: 'Paid', done: withdrawalRequest.status === 'completed' }
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      <Toaster position="top-center" />
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0FF1CE]">Shockwave</p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Payouts</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
            {withdrawalRequest
              ? 'Your payout details, wallet, and review status live here.'
              : 'Your payout page is open. A payout will appear here when one is issued.'}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(withdrawalRequest?.status)}`}>
          {withdrawalRequest?.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
          {statusLabel(withdrawalRequest?.status, submitted)}
        </span>
      </div>

      {!withdrawalRequest ? (
        <div className="rounded-3xl border border-white/10 bg-[#111111]/80 p-8 md:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0FF1CE]/10 text-[#0FF1CE]">
            <ShieldCheck size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-white">You will be able to submit a payout here once you have an eligible account.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-400 hidden">
            The page is unlocked. When a payout is issued, you will see the amount, profit split, and a form for your Solana wallet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <div className="space-y-6">
            {withdrawalRequest.status === 'rejected' && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-red-300" size={18} />
                  <div>
                    <h2 className="font-semibold text-red-200">Withdrawal rejected</h2>
                    {withdrawalRequest.reviewNotes && (
                      <p className="mt-1 text-sm text-gray-300">{withdrawalRequest.reviewNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-3xl border border-[#0FF1CE]/20 bg-[#0FF1CE]/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-400">You receive</p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
                    {formatMoney(withdrawalRequest.payoutAmount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/30 px-3 py-2 text-right">
                  <p className="text-xs text-gray-500">Split</p>
                  <p className="text-lg font-semibold text-[#0FF1CE]">{withdrawalRequest.profitSplit ?? 0}%</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/25 px-4 py-3">
                  <p className="text-xs text-gray-500">Total profit</p>
                  <p className="mt-1 text-sm font-medium text-white">{formatMoney(withdrawalRequest.amountOwed)}</p>
                </div>
                <div className="rounded-2xl bg-black/25 px-4 py-3">
                  <p className="text-xs text-gray-500">Network</p>
                  <p className="mt-1 text-sm font-medium text-white">USDC on Solana</p>
                </div>
              </div>
            </section>

            {needsWallet && (
              <section className="rounded-3xl border border-white/10 bg-[#111111]/80 p-6">
                <h2 className="text-lg font-semibold text-white">Where should we send it?</h2>
                <p className="mt-1 text-sm text-gray-400">USDC on Solana is the payout method for this request.</p>

                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-[#0FF1CE]/40 bg-[#0FF1CE]/5 px-4 py-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0FF1CE]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0FF1CE]" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-white">USDC (Solana)</span>
                    <span className="block text-xs text-gray-400">Fast transfers on the Solana network</span>
                  </span>
                </label>

                <label className="mt-5 block text-sm font-medium text-gray-300" htmlFor="solana-wallet">
                  Solana wallet address
                </label>
                <input
                  id="solana-wallet"
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your Solana address"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#0FF1CE]/60"
                />
                <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-gray-500">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  Double-check the address. An incorrect address can permanently lose the payout.
                </p>

                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 shrink-0 text-red-300" size={18} />
                    <p className="text-sm leading-6 text-gray-300">
                      You are responsible for the wallet address you submit. Funds sent to the wrong address are not reissued after a payout is marked successful.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitDetails}
                  disabled={!paymentMethod || !walletAddress.trim() || submitting}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0FF1CE] px-4 py-3 text-sm font-semibold text-black hover:bg-[#0FF1CE]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {submitting ? 'Submitting...' : 'Submit withdrawal details'}
                </button>
              </section>
            )}

            {submitted && (
              <section className="rounded-3xl border border-white/10 bg-[#111111]/80 p-6">
                <h2 className="text-lg font-semibold text-white">Destination</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Method</p>
                    <p className="mt-1 text-sm text-white">
                      {withdrawalRequest.paymentMethod === 'usdt_trc20' ? 'USDT (TRC20)' : 'USDC (Solana)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Wallet</p>
                    <div className="mt-1 flex items-start gap-2">
                      <p className="break-all font-mono text-sm text-white">{withdrawalRequest.walletAddress}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(withdrawalRequest.walletAddress)}
                        className="shrink-0 text-[#0FF1CE]"
                        aria-label="Copy wallet address"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  {withdrawalRequest.transactionHash && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Transaction</p>
                      <div className="mt-1 flex items-start gap-2">
                        <p className="break-all font-mono text-sm text-white">{withdrawalRequest.transactionHash}</p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(withdrawalRequest.transactionHash)}
                          className="shrink-0 text-[#0FF1CE]"
                          aria-label="Copy transaction hash"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="text-sm font-semibold text-white">Progress</h2>
              <ol className="mt-5 space-y-4">
                {steps.map((step, index) => (
                  <li key={step.label} className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done ? 'bg-[#0FF1CE] text-black' : 'bg-white/5 text-gray-500'
                    }`}>
                      {step.done ? <CheckCircle size={14} /> : index + 1}
                    </span>
                    <span className={step.done ? 'text-sm text-white' : 'text-sm text-gray-500'}>{step.label}</span>
                  </li>
                ))}
              </ol>
              {withdrawalRequest.status === 'rejected' && (
                <p className="mt-4 text-sm text-red-300">This payout was not approved.</p>
              )}
              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                {submitted && (
                  <div className="flex justify-between gap-3 text-gray-400">
                    <span>Submitted</span>
                    <span className="text-white">{formatTimestamp(withdrawalRequest.submittedAt)}</span>
                  </div>
                )}
                {withdrawalRequest.reviewedAt && (
                  <div className="flex justify-between gap-3 text-gray-400">
                    <span>Reviewed</span>
                    <span className="text-white">{formatTimestamp(withdrawalRequest.reviewedAt)}</span>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="text-sm font-semibold text-white">Before you submit</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-400">
                <li>Payouts are processed within 1–3 business days after review.</li>
                <li>Network fees are covered by Shockwave Capital.</li>
                <li>The wallet must support USDC on Solana.</li>
              </ul>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#111111]/80 p-6">
              <h2 className="text-sm font-semibold text-white">Need help?</h2>
              <a
                href="mailto:support@shockwavecapital.com"
                className="mt-3 inline-flex items-center gap-2 text-sm text-[#0FF1CE] hover:text-[#0FF1CE]/80"
              >
                support@shockwavecapital.com
                <ExternalLink size={14} />
              </a>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
