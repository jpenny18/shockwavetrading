'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { updateProfile } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AlertCircle, Bitcoin, CreditCard, X } from 'lucide-react';
import CryptoPayment from '@/app/components/CryptoPayment';
import { auth, getUser, updateUser } from '@/lib/firebase';
import { countries, countryName } from '@/lib/countries';
import { VIP_PURCHASE_PLATFORMS } from '@/lib/vip-purchase';
import { formatUsdExact, type VipCheckoutKind } from '@/lib/vip-offers';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  discordUsername: string;
};

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

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

export default function VipOfferPaymentModal({
  kind,
  offerId,
  title,
  summary,
  price,
  amountLabel,
  initialPlatform = '',
  onClose,
  onSubmitted
}: {
  kind: VipCheckoutKind;
  offerId: string;
  title: string;
  summary: string;
  price: number;
  amountLabel: string;
  initialPlatform?: 'MT4' | 'MT5' | '';
  onClose: () => void;
  onSubmitted?: () => Promise<void> | void;
}) {
  const [user] = useAuthState(auth);
  const [step, setStep] = useState<'details' | 'crypto'>('details');
  const [platform, setPlatform] = useState<(typeof VIP_PURCHASE_PLATFORMS)[number] | ''>(initialPlatform);
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    country: '',
    discordUsername: ''
  });
  const [errors, setErrors] = useState<Partial<FormState & { platform: string }>>({});
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
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUser(user.uid);
        if (cancelled) return;
        const displayParts = (profile?.displayName || user.displayName || '').trim().split(/\s+/).filter(Boolean);
        setForm({
          firstName: profile?.firstName || displayParts[0] || '',
          lastName: profile?.lastName || displayParts.slice(1).join(' ') || '',
          email: user.email || profile?.email || '',
          phone: profile?.phone || '',
          country: storedCountry(profile?.country || ''),
          discordUsername: ''
        });
      } catch (error) {
        console.error('Could not load profile for VIP offer checkout:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
    return () => {
      cancelled = true;
    };
  }, [step]);

  const ready = () => {
    const next: typeof errors = {};
    if (!platform) next.platform = 'Choose MT4 or MT5';
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    if (!form.country.trim()) next.country = 'Country is required';
    setErrors(next);
    return Object.keys(next).length === 0 && !!platform;
  };

  const saveProfile = async () => {
    if (!user) return;
    const displayName = `${form.firstName} ${form.lastName}`.trim();
    try {
      await updateUser(user.uid, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        displayName
      });
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName }).catch(() => undefined);
    } catch (error) {
      console.error('Could not save profile before VIP offer checkout:', error);
    }
  };

  const handleCard = async () => {
    if (isRedirecting || !ready() || !user || !platform) return;
    setCardError(null);
    setIsRedirecting(true);
    try {
      await saveProfile();
      const idempotencyKey = idempotencyKeyRef.current || crypto.randomUUID();
      idempotencyKeyRef.current = idempotencyKey;
      const response = await fetch('/api/vip-offer-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          idempotencyKey,
          kind,
          offerId,
          platform,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
          discordUsername: form.discordUsername.trim(),
          expectedAmount: price
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || 'Unable to start card checkout');
      window.location.href = data.checkoutUrl;
    } catch (error) {
      setCardError(error instanceof Error ? error.message : 'Unable to start card checkout');
      setIsRedirecting(false);
    }
  };

  const handleCrypto = async () => {
    if (!ready()) return;
    await saveProfile();
    setCardError(null);
    setStep('crypto');
  };

  const challengeData = platform ? {
    type: title,
    amount: amountLabel,
    platform,
    price,
    originalPrice: price,
    addOns: [],
    userId: user?.uid,
    orderKind: kind,
    offerId,
    formData: form
  } : null;

  const countryOptions = form.country && !countries.some((country) => country.name === form.country)
    ? [{ code: 'saved', name: form.country }, ...countries]
    : countries;
  const priceLabel = formatUsdExact(price);

  const dialog = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { if (!isRedirecting && !isProcessing) onClose(); }} />
      <div role="dialog" aria-modal="true" aria-labelledby="vip-offer-pay-title" className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0d0f] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">Secure checkout</p>
            <h2 id="vip-offer-pay-title" className="mt-1 text-xl font-semibold text-white">Pay for this offer</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isRedirecting || isProcessing} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-white disabled:opacity-40" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto">
          {step === 'crypto' && challengeData ? (
            <div className="relative">
              <div className="px-5 pt-4">
                <button type="button" onClick={() => setStep('details')} disabled={isProcessing} className="text-sm font-medium text-[#0FF1CE] hover:underline disabled:opacity-40">
                  Back to order details
                </button>
                <p className="mt-2 text-sm text-gray-400">{title} · {platform} · {priceLabel}</p>
              </div>
              <CryptoPayment
                challengeData={challengeData}
                successRedirectPath="/dashboard/vip/payment-pending?source=offer"
                onProcessingStateChange={setIsProcessing}
                cryptoPrices={cryptoPrices}
                hardRedirect
                onPaymentSubmitted={async () => {
                  try {
                    await onSubmitted?.();
                  } catch (error) {
                    console.error('Could not refresh the VIP offer after crypto payment:', error);
                  }
                }}
                getAuthToken={async () => auth.currentUser?.getIdToken() || null}
              />
            </div>
          ) : (
            <div className="space-y-5 px-5 py-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs text-gray-400">{summary}</p>
                  </div>
                  <p className="text-lg font-semibold text-[#0FF1CE]">{priceLabel}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-400">Platform</p>
                <div className="grid grid-cols-2 gap-2">
                  {VIP_PURCHASE_PLATFORMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setPlatform(item);
                        setErrors((current) => ({ ...current, platform: undefined }));
                      }}
                      className={`rounded-xl border py-2.5 text-sm font-semibold ${platform === item ? 'border-[#0FF1CE] text-[#0FF1CE]' : 'border-white/10 text-gray-300'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {errors.platform && <p className="mt-1 text-xs text-red-400">{errors.platform}</p>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(['firstName', 'lastName', 'phone', 'country'] as const).map((name) => (
                  <div key={name}>
                    <label className="mb-1 block text-xs text-gray-400" htmlFor={`offer-${name}`}>
                      {name === 'firstName' ? 'First name' : name === 'lastName' ? 'Last name' : name === 'phone' ? 'Phone' : 'Country'}
                    </label>
                    {name === 'country' ? (
                      <select id="offer-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} className={fieldClass(errors.country)}>
                        <option value="">Select country</option>
                        {countryOptions.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
                      </select>
                    ) : (
                      <input id={`offer-${name}`} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className={fieldClass(errors[name])} />
                    )}
                    {errors[name] && <p className="mt-1 text-xs text-red-400">{errors[name]}</p>}
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400" htmlFor="offer-email">Email</label>
                <input id="offer-email" value={form.email} disabled className={`${fieldClass()} cursor-not-allowed opacity-70`} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400" htmlFor="offer-discord">Discord username</label>
                <input id="offer-discord" value={form.discordUsername} onChange={(event) => setForm((current) => ({ ...current, discordUsername: event.target.value }))} className={fieldClass()} />
              </div>
              <div>
                <button type="button" onClick={handleCard} disabled={isRedirecting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0FF1CE] px-4 py-3.5 text-sm font-bold text-black disabled:opacity-50">
                  <CreditCard size={18} />
                  {isRedirecting ? 'Opening card checkout...' : 'Pay with card'}
                </button>
                <p className="mt-2 text-center text-xs text-gray-500">Card payment continues in the secure checkout. The price above is the amount charged.</p>
              </div>
              <div>
                <button type="button" onClick={handleCrypto} disabled={isRedirecting} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0FF1CE] px-4 py-3.5 text-sm font-bold text-[#0FF1CE] disabled:opacity-50">
                  <Bitcoin size={18} />
                  Pay with crypto
                </button>
                <p className="mt-2 text-center text-xs text-gray-500">Crypto orders are reviewed after the transfer is submitted.</p>
              </div>
              {cardError && (
                <p className="flex items-center justify-center gap-1 text-center text-sm text-red-400">
                  <AlertCircle size={14} />
                  {cardError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(dialog, document.body);
}
