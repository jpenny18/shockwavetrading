'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { updateProfile } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AlertCircle, Bitcoin, CreditCard, RefreshCw, X } from 'lucide-react';
import CryptoPayment from '@/app/components/CryptoPayment';
import { auth, getUser, updateUser } from '@/lib/firebase';
import { countries, countryName } from '@/lib/countries';
import {
  formatResetUsd,
  getResetQuote,
  normalizeResetCustomer,
  resetCustomerFieldErrors,
  type ResetAccountInput,
  type ResetCustomer,
} from '@/lib/reset-pricing';

export interface ResetAccountRef extends ResetAccountInput {
  accountId: string;
}

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

const EMPTY_CUSTOMER: ResetCustomer = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  discordUsername: '',
};

function storedCountry(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const byName = countries.find((country) => country.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.name;
  if (/^[a-z]{2}$/i.test(trimmed)) return countryName(trimmed.toUpperCase());
  return trimmed;
}

function fieldClass(invalid?: string) {
  return `w-full rounded-xl border bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${
    invalid ? 'border-red-500/70' : 'border-white/10'
  }`;
}

export default function AccountResetButton({
  account,
  className,
  label = 'Reset account',
}: {
  account: ResetAccountRef;
  className?: string;
  label?: string;
}) {
  const [user] = useAuthState(auth);
  const [open, setOpen] = useState(false);

  if (!account.accountId || account.accountId.startsWith('PLACEHOLDER_')) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center justify-center gap-2 ${className || 'rounded-xl border border-[#0FF1CE]/30 px-4 py-2 text-sm font-semibold text-[#0FF1CE] transition hover:bg-[#0FF1CE]/10'}`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <RefreshCw size={15} />
          {label}
        </span>
      </button>
      {open && user && (
        <AccountResetDialog
          account={account}
          userId={user.uid}
          email={user.email || ''}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AccountResetDialog({
  account,
  userId,
  email,
  onClose,
}: {
  account: ResetAccountRef;
  userId: string;
  email: string;
  onClose: () => void;
}) {
  const quote = getResetQuote(account);
  const [step, setStep] = useState<'details' | 'crypto'>('details');
  const [profileLoading, setProfileLoading] = useState(true);
  const [customer, setCustomer] = useState<ResetCustomer>({ ...EMPTY_CUSTOMER, email });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ResetCustomer | 'terms' | 'freshStart', string>>>({});
  const [freshStartAccepted, setFreshStartAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRedirecting && !isProcessing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isProcessing, isRedirecting, onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUser(userId);
        if (cancelled) return;
        const displayParts = (profile?.displayName || '').trim().split(/\s+/).filter(Boolean);
        setCustomer({
          firstName: profile?.firstName || displayParts[0] || '',
          lastName: profile?.lastName || displayParts.slice(1).join(' ') || '',
          email: email || profile?.email || '',
          phone: profile?.phone || '',
          country: storedCountry(profile?.country || ''),
          discordUsername: '',
        });
      } catch (error) {
        console.error('Could not load profile for account reset:', error);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, userId]);

  useEffect(() => {
    if (step !== 'crypto') return;
    let cancelled = false;
    const loadPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices');
        const data = await response.json();
        if (!cancelled && data) setCryptoPrices(data);
      } catch (error) {
        console.error('Could not load crypto prices:', error);
      }
    };
    loadPrices();
    const interval = window.setInterval(loadPrices, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [step]);

  const countryOptions = customer.country && !countries.some((country) => country.name === customer.country)
    ? [{ code: 'saved', name: customer.country }, ...countries]
    : countries;

  const updateField = (name: keyof ResetCustomer, value: string) => {
    setCustomer((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const readyCustomer = (): ResetCustomer | null => {
    const next = normalizeResetCustomer(customer, email || customer.email);
    const errors = resetCustomerFieldErrors(next);
    const nextErrors: Partial<Record<keyof ResetCustomer | 'terms' | 'freshStart', string>> = { ...errors };
    if (!freshStartAccepted) nextErrors.freshStart = 'Confirm that you want a fresh start';
    if (!termsAccepted) nextErrors.terms = 'Please accept the terms and conditions';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length || !quote) return null;
    return next;
  };

  const saveProfile = async (next: ResetCustomer) => {
    try {
      const displayName = `${next.firstName} ${next.lastName}`.trim();
      await updateUser(userId, {
        firstName: next.firstName,
        lastName: next.lastName,
        phone: next.phone,
        country: next.country,
        displayName,
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName }).catch(() => undefined);
      }
    } catch (error) {
      console.error('Could not save profile before reset checkout:', error);
    }
  };

  const handleCrypto = async () => {
    const next = readyCustomer();
    if (!next) return;
    await saveProfile(next);
    setCustomer(next);
    setCardError(null);
    setStep('crypto');
  };

  const handleCard = async () => {
    if (isRedirecting) return;
    const next = readyCustomer();
    if (!next || !quote) return;

    setCardError(null);
    setIsRedirecting(true);
    try {
      await saveProfile(next);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Sign in again before paying.');
      const idempotencyKey = idempotencyKeyRef.current || crypto.randomUUID();
      idempotencyKeyRef.current = idempotencyKey;
      const response = await fetch('/api/reset-checkout-handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await currentUser.getIdToken()}`,
        },
        body: JSON.stringify({
          idempotencyKey,
          accountId: account.accountId,
          expectedAmount: quote.price,
          firstName: next.firstName,
          lastName: next.lastName,
          phone: next.phone,
          country: next.country,
          discordUsername: next.discordUsername,
          termsAccepted: true,
          freshStartAccepted: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Unable to start card checkout');
      }
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error(error);
      setCardError(error instanceof Error ? error.message : 'Unable to start card checkout');
      setIsRedirecting(false);
    }
  };

  const challengeData = quote
    ? {
        type: quote.challengeType,
        amount: quote.amountLabel,
        platform: quote.platform,
        price: quote.price,
        originalPrice: quote.originalPrice,
        discountPercent: quote.discountPercent,
        addOns: [],
        userId,
        accountId: account.accountId,
        accountType: quote.accountType,
        accountSize: quote.accountSize,
        resetCategory: quote.category,
        orderKind: 'account-reset',
        activationMode: 'reset',
        termsAccepted: true,
        freshStartAccepted: true,
        formData: customer,
      }
    : null;

  const dialog = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => {
          if (!isRedirecting && !isProcessing) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-reset-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0d0f] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">Account reset</p>
            <h2 id="account-reset-title" className="mt-1 text-xl font-semibold tracking-tight text-white">
              Would you like to reset your starting balance to 0 and get a fresh start?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRedirecting || isProcessing}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {step === 'crypto' && challengeData ? (
            <div className="relative">
              <div className="px-5 pt-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  disabled={isProcessing}
                  className="text-sm font-medium text-[#0FF1CE] hover:underline disabled:opacity-40"
                >
                  Back to reset details
                </button>
                <p className="mt-2 text-sm text-gray-400">
                  {quote?.productLabel} · {quote?.amountLabel} · {formatResetUsd(quote?.price || 0)}
                </p>
              </div>
              {isProcessing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <p className="text-sm text-white">Submitting your payment...</p>
                </div>
              )}
              <CryptoPayment
                challengeData={challengeData}
                successRedirectPath={`/dashboard/accounts/reset-pending?account=${encodeURIComponent(account.accountId)}`}
                onProcessingStateChange={setIsProcessing}
                cryptoPrices={cryptoPrices}
                getAuthToken={async () => {
                  const current = auth.currentUser;
                  if (!current) return null;
                  return current.getIdToken();
                }}
              />
            </div>
          ) : (
            <div className="space-y-5 px-5 py-5 sm:px-6">
              {quote ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{quote.productLabel}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {quote.amountLabel} · {quote.platform} · {quote.categoryLabel} reset
                      </p>
                    </div>
                    <div className="text-right">
                      {quote.discountPercent > 0 && (
                        <p className="text-xs text-gray-500 line-through">{formatResetUsd(quote.originalPrice)}</p>
                      )}
                      <p className="text-lg font-semibold text-[#0FF1CE]">{formatResetUsd(quote.price)}</p>
                      <p className="text-[11px] text-gray-500">{quote.feeNote}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-gray-400">
                    Account {account.accountId}. Profit and loss return to zero, and the balance is restored to the original starting amount after payment is confirmed.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  This account does not have a reset price yet. Email support@shockwave-capital.com and include account {account.accountId}.
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white">Your information</h3>
                <p className="mt-1 text-xs text-gray-500">Filled from your Shockwave account. Update anything that is missing before you pay.</p>
                {profileLoading ? (
                  <p className="mt-4 text-sm text-gray-400">Loading your details...</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400" htmlFor={`reset-first-${account.accountId}`}>First name</label>
                        <input
                          id={`reset-first-${account.accountId}`}
                          value={customer.firstName}
                          onChange={(event) => updateField('firstName', event.target.value)}
                          className={fieldClass(fieldErrors.firstName)}
                          autoComplete="given-name"
                        />
                        {fieldErrors.firstName && <p className="mt-1 text-xs text-red-400">{fieldErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400" htmlFor={`reset-last-${account.accountId}`}>Last name</label>
                        <input
                          id={`reset-last-${account.accountId}`}
                          value={customer.lastName}
                          onChange={(event) => updateField('lastName', event.target.value)}
                          className={fieldClass(fieldErrors.lastName)}
                          autoComplete="family-name"
                        />
                        {fieldErrors.lastName && <p className="mt-1 text-xs text-red-400">{fieldErrors.lastName}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400" htmlFor={`reset-email-${account.accountId}`}>Email</label>
                      <input
                        id={`reset-email-${account.accountId}`}
                        value={customer.email}
                        disabled
                        className={`${fieldClass()} cursor-not-allowed opacity-70`}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400" htmlFor={`reset-phone-${account.accountId}`}>Phone</label>
                        <input
                          id={`reset-phone-${account.accountId}`}
                          value={customer.phone}
                          onChange={(event) => updateField('phone', event.target.value)}
                          className={fieldClass(fieldErrors.phone)}
                          autoComplete="tel"
                        />
                        {fieldErrors.phone && <p className="mt-1 text-xs text-red-400">{fieldErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400" htmlFor={`reset-country-${account.accountId}`}>Country</label>
                        <select
                          id={`reset-country-${account.accountId}`}
                          value={customer.country}
                          onChange={(event) => updateField('country', event.target.value)}
                          className={fieldClass(fieldErrors.country)}
                        >
                          <option value="">Select a country</option>
                          {countryOptions.map((country) => (
                            <option key={country.code} value={country.name}>{country.name}</option>
                          ))}
                        </select>
                        {fieldErrors.country && <p className="mt-1 text-xs text-red-400">{fieldErrors.country}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400" htmlFor={`reset-discord-${account.accountId}`}>Discord username (optional)</label>
                      <input
                        id={`reset-discord-${account.accountId}`}
                        value={customer.discordUsername}
                        onChange={(event) => updateField('discordUsername', event.target.value)}
                        className={fieldClass(fieldErrors.discordUsername)}
                      />
                      {fieldErrors.discordUsername && <p className="mt-1 text-xs text-red-400">{fieldErrors.discordUsername}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={freshStartAccepted}
                    onChange={(event) => {
                      setFreshStartAccepted(event.target.checked);
                      setFieldErrors((current) => ({ ...current, freshStart: undefined }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-black text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0"
                  />
                  <span className="text-sm leading-relaxed text-gray-300">
                    Yes. Reset this account&apos;s starting balance to 0 and give me a fresh start.
                  </span>
                </label>
                {fieldErrors.freshStart && <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={13} />{fieldErrors.freshStart}</p>}

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => {
                      setTermsAccepted(event.target.checked);
                      setFieldErrors((current) => ({ ...current, terms: undefined }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-black text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0"
                  />
                  <span className="text-sm leading-relaxed text-gray-300">
                    I understand Shockwave Capital provides a funded trading account and that payouts follow the program rules. I agree to the{' '}
                    <Link href="/disclaimer" target="_blank" rel="noopener noreferrer" className="text-[#0FF1CE] hover:underline">Disclaimer</Link>,{' '}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0FF1CE] hover:underline">Terms of Use</Link>,{' '}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0FF1CE] hover:underline">Privacy Policy</Link>,{' '}
                    <Link href="/legal-disclosure" target="_blank" rel="noopener noreferrer" className="text-[#0FF1CE] hover:underline">Legal Disclosure</Link>, and{' '}
                    <Link href="/refund" target="_blank" rel="noopener noreferrer" className="text-[#0FF1CE] hover:underline">Refund Policy</Link>.
                  </span>
                </label>
                {fieldErrors.terms && <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={13} />{fieldErrors.terms}</p>}
              </div>

              {quote && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleCard}
                    disabled={profileLoading || isRedirecting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0FF1CE] px-4 py-3.5 text-sm font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <CreditCard size={18} />
                    {isRedirecting ? 'Redirecting to payment portal...' : 'Pay with card'}
                  </button>
                  <p className="text-center text-xs text-gray-500">You will be redirected to our payment portal to finish the card payment.</p>
                  <button
                    type="button"
                    onClick={handleCrypto}
                    disabled={profileLoading || isRedirecting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0FF1CE] px-4 py-3.5 text-sm font-bold text-[#0FF1CE] transition hover:bg-[#0FF1CE]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Bitcoin size={18} />
                    Pay with crypto
                  </button>
                  {cardError && (
                    <p className="flex items-center justify-center gap-1 text-sm text-red-400">
                      <AlertCircle size={14} />
                      {cardError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {isRedirecting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6 text-center backdrop-blur-sm">
            <div>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
              <p className="text-sm text-white">Please wait while we redirect you to our payment portal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(dialog, document.body);
}
