'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bitcoin, CreditCard } from 'lucide-react';
import CryptoPayment from '../../components/CryptoPayment';
import {
  VIP_CHECKOUT,
  VIP_OPTIONS,
  VIP_PLATFORMS,
  VIP_RESET_DISCOUNT_PERCENT,
  centsToDollars,
  formatUsd,
  vipChargeCents,
  type VipOption,
} from '../config';
import { VIP_COUNTRIES } from '../countries';
import VipCardPayment, { type VipCardHandle } from './VipCardPayment';

type PaymentMethod = 'card' | 'crypto';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  discordUsername: string;
};

type FormErrors = Partial<FormState & { platform: string; allocation: string; resetCode: string }>;

type CryptoPrices = {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
};

const sessionCache = new Map<string, Promise<{ clientSecret: string; sessionId: string }>>();

function sessionKey(level: string, resetCode: string) {
  return `${level}|${resetCode}`;
}

function requestCardSession(level: string, resetCode: string) {
  const key = sessionKey(level, resetCode);
  const cached = sessionCache.get(key);
  if (cached) return cached;

  const promise = fetch('/vip/api/checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, resetCode }),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      sessionCache.delete(key);
      throw new Error(data.error || 'Unable to start card checkout');
    }
    return {
      clientSecret: String(data.clientSecret),
      sessionId: String(data.sessionId),
    };
  });

  sessionCache.set(key, promise);
  return promise;
}

const fieldClass = (invalid?: string) =>
  `w-full bg-[#151515]/50 backdrop-blur-sm border ${
    invalid ? 'border-red-500' : 'border-[#2F2F2F]'
  } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`;

export default function VipCheckout({ publishableKey }: { publishableKey: string }) {
  const router = useRouter();
  const cardRef = useRef<VipCardHandle>(null);
  const [selected, setSelected] = useState<VipOption | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    discordUsername: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stripeTotal, setStripeTotal] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [isCryptoProcessing, setIsCryptoProcessing] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [resetAccount, setResetAccount] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [appliedResetCode, setAppliedResetCode] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });

  const resetApplied = resetAccount && appliedResetCode.length > 0;

  useEffect(() => {
    let cancelled = false;
    const loadPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices');
        const data = await response.json();
        if (!cancelled) setCryptoPrices(data);
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };
    loadPrices();
    const interval = setInterval(loadPrices, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selected || paymentMethod !== 'card') return;
    let cancelled = false;
    setSessionError(null);
    setClientSecret(null);
    setSessionId(null);
    setStripeTotal('');

    requestCardSession(selected.level, resetApplied ? appliedResetCode : '')
      .then((session) => {
        if (cancelled) return;
        setClientSecret(session.clientSecret);
        setSessionId(session.sessionId);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSessionError(error instanceof Error ? error.message : 'Unable to start card checkout');
      });

    return () => {
      cancelled = true;
    };
  }, [selected, paymentMethod, sessionAttempt, resetApplied, appliedResetCode]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!selected) errors.allocation = 'Choose an allocation';
    if (!platform) errors.platform = 'Please select a platform';
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = 'Invalid email format';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (resetAccount && !appliedResetCode) errors.resetCode = 'Apply a valid reset code, or turn off Reset account';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById('vip-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleSelect = (option: VipOption) => {
    setSelected(option);
    setPaymentError(null);
    setFormErrors((prev) => ({ ...prev, allocation: undefined }));
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById('vip-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };

  const handlePay = async () => {
    if (!validate() || !selected || !platform || !sessionId) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      const detailsResponse = await fetch('/vip/api/checkout-session/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          level: selected.level,
          platform,
          ...formData,
        }),
      });
      const details = await detailsResponse.json();
      if (!detailsResponse.ok) {
        throw new Error(details.error || 'Unable to save checkout details');
      }

      const result = await cardRef.current?.confirm({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
      if (!result) throw new Error('Card checkout is still loading.');
      if (result.type === 'error') {
        setPaymentError(result.message);
        setIsPaying(false);
        return;
      }

      await fetch('/vip/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      router.push(`${VIP_CHECKOUT.returnPath}?session_id=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Payment could not be completed.');
      setIsPaying(false);
    }
  };

  const retrySession = () => {
    if (!selected) return;
    sessionCache.delete(sessionKey(selected.level, resetApplied ? appliedResetCode : ''));
    setSessionAttempt((attempt) => attempt + 1);
  };

  const applyResetCode = async () => {
    setResetError(null);
    setIsCheckingCode(true);
    try {
      const response = await fetch('/vip/api/reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resetCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAppliedResetCode('');
        setResetError(data.error || 'Invalid reset code');
        return;
      }
      setAppliedResetCode(String(data.code));
      setResetCode(String(data.code));
      setFormErrors((prev) => ({ ...prev, resetCode: undefined }));
    } catch {
      setAppliedResetCode('');
      setResetError('Unable to check that reset code');
    } finally {
      setIsCheckingCode(false);
    }
  };

  const chargedAmount = selected ? centsToDollars(vipChargeCents(selected.price, resetApplied)) : 0;
  const displayedTotal = stripeTotal || (selected ? formatUsd(chargedAmount) : '');

  return (
    <section id="account-selector" className="scroll-mt-24 px-4 py-12 md:px-6 md:py-20">
      <div className="relative z-10 mx-auto max-w-6xl">
        <h2 className="mb-3 text-center text-3xl font-bold text-[#0FF1CE] md:text-4xl">Choose Your Allocation</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-gray-400 md:mb-12 md:text-base">
          One larger allocation. More usable drawdown. Fewer restrictions.
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="rounded-2xl border border-[#2F2F2F]/50 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 p-6 backdrop-blur-sm lg:col-span-3">
            <h3 className="mb-4 text-lg font-medium text-white">Select Allocation</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {VIP_OPTIONS.map((option) => {
                const active = selected?.level === option.level;
                return (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`rounded-xl border-2 bg-gradient-to-b from-[#151515] to-[#0D0D0D] p-4 text-left transition-all duration-300 ${
                      active
                        ? 'border-[#0FF1CE] text-white shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                        : 'border-[#2F2F2F]/50 text-gray-300 hover:border-[#0FF1CE]/50'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-[#0FF1CE]">{option.name}</div>
                    <div className="mt-1 text-2xl font-bold text-white">{option.level}</div>
                    <div className="mt-2 text-sm text-gray-300">
                      {resetApplied ? (
                        <>
                          <span className="mr-2 text-gray-500 line-through">${option.price.toLocaleString()}</span>
                          <span>{formatUsd(centsToDollars(vipChargeCents(option.price, true)))}</span>
                        </>
                      ) : (
                        `$${option.price.toLocaleString()}`
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{resetApplied ? `${VIP_RESET_DISCOUNT_PERCENT}% reset discount` : 'One-time fee'}</div>
                  </button>
                );
              })}
            </div>
            {formErrors.allocation && <p className="mt-2 text-sm text-red-400">{formErrors.allocation}</p>}

            <div className={`mt-8 ${selected ? '' : 'pointer-events-none opacity-50'}`}>
              <h3 className="mb-4 text-lg font-medium text-white">Select Platform</h3>
              <div className="grid max-w-md grid-cols-2 gap-4">
                {VIP_PLATFORMS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setPlatform(item);
                      setFormErrors((prev) => ({ ...prev, platform: undefined }));
                    }}
                    className={`rounded-xl border-2 bg-gradient-to-b from-[#151515] to-[#0D0D0D] p-4 transition-all duration-300 ${
                      platform === item
                        ? 'border-[#0FF1CE] text-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                        : 'border-[#2F2F2F]/50 text-gray-300 hover:border-[#0FF1CE]/50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {formErrors.platform && <p className="mt-2 text-sm text-red-400">{formErrors.platform}</p>}
            </div>

            <div className={`mt-8 ${selected && platform ? '' : 'pointer-events-none opacity-50'}`}>
              <h3 className="mb-4 text-lg font-medium text-white">Payment Method</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    setPaymentError(null);
                  }}
                  className={`flex items-center gap-3 rounded-xl border-2 bg-gradient-to-b from-[#151515] to-[#0D0D0D] p-4 text-left transition-all ${
                    paymentMethod === 'card'
                      ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.25)]'
                      : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                  }`}
                >
                  <CreditCard className="text-[#0FF1CE]" size={20} />
                  <span>
                    <span className="block font-medium text-white">Credit Card</span>
                    <span className="text-xs text-gray-400">Visa, Mastercard, Amex</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('crypto');
                    setPaymentError(null);
                  }}
                  className={`flex items-center gap-3 rounded-xl border-2 bg-gradient-to-b from-[#151515] to-[#0D0D0D] p-4 text-left transition-all ${
                    paymentMethod === 'crypto'
                      ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.25)]'
                      : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                  }`}
                >
                  <Bitcoin className="text-[#0FF1CE]" size={20} />
                  <span>
                    <span className="block font-medium text-white">Cryptocurrency</span>
                    <span className="text-xs text-gray-400">BTC, ETH, USDT, USDC</span>
                  </span>
                </button>
              </div>

              {paymentMethod === 'card' && selected && (
                <div className="relative mt-4 rounded-xl border border-[#2F2F2F]/50 bg-gradient-to-b from-[#151515] to-[#0D0D0D] p-5">
                  {isPaying && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
                        <p className="text-sm text-white">Processing payment...</p>
                      </div>
                    </div>
                  )}
                  {!publishableKey && (
                    <p className="text-sm text-red-400">Card checkout is not configured. Add VIPPK to .env.</p>
                  )}
                  {sessionError && (
                    <div className="text-sm text-red-400">
                      <p>{sessionError}</p>
                      <button type="button" onClick={retrySession} className="mt-3 text-[#0FF1CE] underline">
                        Try again
                      </button>
                    </div>
                  )}
                  {!sessionError && !clientSecret && publishableKey && (
                    <div className="flex items-center gap-3 py-4 text-sm text-gray-400">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
                      Preparing secure checkout...
                    </div>
                  )}
                  {clientSecret && publishableKey && (
                    <VipCardPayment
                      ref={cardRef}
                      publishableKey={publishableKey}
                      clientSecret={clientSecret}
                      onTotal={setStripeTotal}
                    />
                  )}
                </div>
              )}

              {paymentMethod === 'crypto' && selected && platform && (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-[#2F2F2F]/50 bg-gradient-to-b from-[#151515] to-[#0D0D0D]">
                  {isCryptoProcessing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
                        <p className="text-sm text-white">Processing payment...</p>
                      </div>
                    </div>
                  )}
                  <CryptoPayment
                    challengeData={{
                      type: VIP_CHECKOUT.challengeType,
                      amount: selected.level,
                      platform,
                      formData,
                      price: chargedAmount,
                      addOns: [],
                    }}
                    successRedirectPath={VIP_CHECKOUT.pendingPath}
                    onProcessingStateChange={setIsCryptoProcessing}
                    cryptoPrices={cryptoPrices}
                    beforeSubmit={validate}
                  />
                </div>
              )}
            </div>

            {selected && (
              <div className="mt-6 rounded-lg border border-[#0FF1CE]/20 bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Total</div>
                    <div className="text-sm text-white">
                      VIP {selected.name} · {selected.level}
                      {platform ? ` · ${platform}` : ''}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0FF1CE]">{displayedTotal}</div>
                </div>
              </div>
            )}
          </div>

          <div
            id="vip-details"
            className="scroll-mt-24 rounded-2xl border border-[#2F2F2F]/50 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 p-6 backdrop-blur-sm lg:col-span-2"
          >
            <h3 className="mb-4 text-lg font-medium text-white">Your Information</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-400">First Name</span>
                <input name="firstName" value={formData.firstName} onChange={handleInputChange} className={fieldClass(formErrors.firstName)} />
                {formErrors.firstName && <p className="mt-1 text-sm text-red-500">{formErrors.firstName}</p>}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-400">Last Name</span>
                <input name="lastName" value={formData.lastName} onChange={handleInputChange} className={fieldClass(formErrors.lastName)} />
                {formErrors.lastName && <p className="mt-1 text-sm text-red-500">{formErrors.lastName}</p>}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-400">Email Address</span>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={fieldClass(formErrors.email)} />
                {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-400">Phone Number</span>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={fieldClass(formErrors.phone)} />
                {formErrors.phone && <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-400">Country</span>
                <select name="country" value={formData.country} onChange={handleInputChange} className={fieldClass(formErrors.country)}>
                  <option value="">Select a country</option>
                  {VIP_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {formErrors.country && <p className="mt-1 text-sm text-red-500">{formErrors.country}</p>}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-400">Discord Username (Optional)</span>
                <input
                  name="discordUsername"
                  value={formData.discordUsername}
                  onChange={handleInputChange}
                  className={fieldClass()}
                />
              </label>

              <div id="vip-reset" className="scroll-mt-24 rounded-lg border border-[#2F2F2F] bg-[#151515]/40 p-4">
                <label className="flex items-start gap-3 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={resetAccount}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setResetAccount(checked);
                      setResetError(null);
                      setFormErrors((prev) => ({ ...prev, resetCode: undefined }));
                      if (!checked) setAppliedResetCode('');
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-[#1A1A1A] text-[#0FF1CE] focus:ring-[#0FF1CE]"
                  />
                  <span>
                    <span className="font-medium">Reset account</span>
                    <span className="mt-1 block text-gray-400">
                      Enter a reset code to take {VIP_RESET_DISCOUNT_PERCENT}% off any allocation.
                    </span>
                  </span>
                </label>
                {resetAccount && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      <input
                        value={resetCode}
                        onChange={(event) => {
                          setResetCode(event.target.value.toUpperCase());
                          setAppliedResetCode('');
                          setResetError(null);
                        }}
                        placeholder="Reset code"
                        className={fieldClass(formErrors.resetCode || resetError || undefined)}
                      />
                      <button
                        type="button"
                        onClick={applyResetCode}
                        disabled={isCheckingCode || !resetCode.trim()}
                        className="rounded-lg bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
                      >
                        {isCheckingCode ? 'Checking' : 'Apply'}
                      </button>
                    </div>
                    {(formErrors.resetCode || resetError) && (
                      <p className="mt-2 text-sm text-red-400">{formErrors.resetCode || resetError}</p>
                    )}
                    {resetApplied && (
                      <p className="mt-2 text-sm text-[#0FF1CE]">
                        {appliedResetCode} applied. {VIP_RESET_DISCOUNT_PERCENT}% off this allocation.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selected && (
                <div className="space-y-2 border-t border-[#2F2F2F]/60 pt-4 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Allocation</span>
                    <span className="text-white">
                      {selected.level} {selected.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Max drawdown</span>
                    <span className="text-white">{selected.maxDrawdown}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Daily drawdown</span>
                    <span className="text-white">{selected.dailyDrawdown}</span>
                  </div>
                  {resetApplied && (
                    <div className="flex justify-between text-gray-400">
                      <span>Reset discount</span>
                      <span className="text-[#0FF1CE]">{VIP_RESET_DISCOUNT_PERCENT}% off</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 text-base">
                    <span className="text-white">Total</span>
                    <span className="text-right font-bold text-[#0FF1CE]">
                      {resetApplied && (
                        <span className="mr-2 text-sm font-normal text-gray-500 line-through">
                          {formatUsd(selected.price)}
                        </span>
                      )}
                      {displayedTotal}
                    </span>
                  </div>
                </div>
              )}

              {paymentError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{paymentError}</p>
              )}

              {paymentMethod === 'card' ? (
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isPaying || !clientSecret}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] py-3 font-bold text-black shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[#0FF1CE]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPaying ? 'Processing...' : `Pay ${displayedTotal || ''}`.trim()}
                </button>
              ) : (
                <p className="text-sm text-gray-400">
                  Complete the cryptocurrency payment on the left. Your details are submitted with that order.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
