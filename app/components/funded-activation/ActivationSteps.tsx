'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bitcoin, CreditCard } from 'lucide-react';
import Header from '../Header';
import Particles from '../Particles';
import CryptoPayment from '../CryptoPayment';
import { countries } from '@/lib/countries';
import {
  emptyFundedCustomer,
  readFundedCheckout,
  saveFundedCheckout,
  type FundedCheckoutDraft,
  type FundedCustomer,
} from './storage';

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

export interface ActivationSize {
  level: string;
  price: number;
  whopCheckoutUrl?: string;
}

interface ActivationStepsProps {
  step: 'details' | 'payment';
  source: FundedCheckoutDraft['source'];
  basePath: string;
  orderType: string;
  sizes: ActivationSize[];
  priceFor: (size: ActivationSize, mode: 'activate' | 'reset') => number;
  pendingPath: string;
}

function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StepBar({ current }: { current: 2 | 3 }) {
  const steps = ['Account', 'Information', 'Payment'];
  return (
    <ol className="mx-auto mb-8 flex max-w-md items-center justify-center gap-3">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = number === current;
        const done = number < current;
        return (
          <li key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active || done ? 'bg-[#0FF1CE] text-black' : 'bg-white/10 text-white/40'
              }`}>
                {number}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
            </div>
            {index < steps.length - 1 && <span className="h-px w-6 bg-white/15" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ActivationSteps({
  step,
  source,
  basePath,
  orderType,
  sizes,
  priceFor,
  pendingPath,
}: ActivationStepsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const level = searchParams?.get('level') || '';
  const modeParam = searchParams?.get('mode') === 'reset' ? 'reset' : 'activate';
  const size = sizes.find((option) => option.level.toLowerCase() === level.toLowerCase()) || null;
  const [form, setForm] = useState<FundedCustomer>(emptyFundedCustomer());
  const [errors, setErrors] = useState<Partial<Record<keyof FundedCustomer, string>>>({});
  const [draft, setDraft] = useState<FundedCheckoutDraft | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (step !== 'payment') return;
    const saved = readFundedCheckout(source);
    if (!saved) {
      router.replace(basePath);
      return;
    }
    setDraft(saved);
  }, [step, source, basePath, router]);

  useEffect(() => {
    if (step !== 'payment') return;
    const load = async () => {
      try {
        const response = await fetch('/api/crypto/prices');
        if (!response.ok) return;
        setCryptoPrices(await response.json());
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };
    load();
    const interval = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [step]);

  const update = (name: keyof FundedCustomer, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FundedCustomer, string>> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    if (!form.country.trim()) next.country = 'Country is required';
    if (!form.platform.trim()) next.platform = 'Choose a platform';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const continueToPayment = () => {
    if (!size || !validate()) return;
    const price = priceFor(size, modeParam);
    saveFundedCheckout({
      source,
      level: size.level,
      mode: modeParam,
      price,
      originalPrice: size.price,
      whopCheckoutUrl: size.whopCheckoutUrl,
      formData: {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        discordUsername: form.discordUsername.trim(),
      },
    });
    router.push(`${basePath}/payment`);
  };

  const payWithCard = async () => {
    if (!draft) return;
    setIsProcessing(true);
    try {
      const orderData = {
        status: 'PENDING',
        challengeType: orderType,
        challengeAmount: draft.level,
        activationMode: draft.mode,
        platform: draft.formData.platform,
        totalAmount: draft.price,
        customerEmail: draft.formData.email,
        customerName: `${draft.formData.firstName} ${draft.formData.lastName}`,
        customerPhone: draft.formData.phone,
        customerCountry: draft.formData.country,
        customerDiscordUsername: draft.formData.discordUsername || '',
        paymentMethod: 'card',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const response = await fetch('/api/card-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to save order');
      const { orderId } = await response.json();
      try {
        await fetch('/api/send-card-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...orderData, orderId, isPending: true }),
        });
      } catch (error) {
        console.error('Error sending admin email:', error);
      }
      if (!draft.whopCheckoutUrl) throw new Error('Checkout URL not configured');
      window.location.href = draft.whopCheckoutUrl;
    } catch (error) {
      console.error(error);
      alert('Failed to process payment. Please try again or contact support.');
      setIsProcessing(false);
    }
  };

  if (step === 'details' && !size) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-[22px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-white/70">Choose an account size before entering your details.</p>
          <button type="button" onClick={() => router.push(basePath)} className="mt-5 rounded-2xl bg-[#0FF1CE] px-6 py-3 text-sm font-bold text-black">
            Choose an account
          </button>
        </div>
      </Shell>
    );
  }

  if (step === 'payment') {
    if (!draft) {
      return (
        <Shell>
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
          </div>
        </Shell>
      );
    }
    const isReset = draft.mode === 'reset';
    const challengeData = {
      type: orderType,
      amount: draft.level,
      activationMode: draft.mode,
      platform: draft.formData.platform,
      formData: draft.formData,
      price: draft.price,
      originalPrice: draft.originalPrice,
      addOns: [],
    };
    if (paymentMethod === 'crypto') {
      return (
        <Shell>
          <StepBar current={3} />
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-6">
              <div>
                <button type="button" onClick={() => setPaymentMethod(null)} className="text-sm font-semibold text-[#0FF1CE] hover:underline">Back</button>
                <h1 className="mt-3 text-2xl font-semibold text-white">Pay with crypto</h1>
                <p className="mt-1 text-sm text-white/50">{draft.level} · {isReset ? 'Reset' : 'Activation'}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#0FF1CE]">${formatUsd(draft.price)}</div>
                <div className="text-xs text-white/45">{isReset ? 'Reset fee' : 'Activation fee'}</div>
              </div>
            </div>
            <CryptoPayment
              challengeData={challengeData}
              successRedirectPath={pendingPath}
              onProcessingStateChange={setIsProcessing}
              cryptoPrices={cryptoPrices}
            />
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <StepBar current={3} />
        <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Step 3</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Choose how to pay</h1>
          <p className="mt-2 text-sm text-white/50">{draft.formData.firstName} {draft.formData.lastName} · {draft.level} · {draft.formData.platform}</p>
          <div className="mt-6 space-y-3">
            <button type="button" onClick={payWithCard} className="hidden w-full rounded-2xl border border-white/10 bg-black/30 p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 font-semibold"><CreditCard size={18} className="text-[#0FF1CE]" /> Card</span>
                <span className="font-bold text-[#0FF1CE]">${formatUsd(draft.price)}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('crypto')}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-5 text-left transition-colors hover:border-[#0FF1CE]/40"
            >
              <span className="flex items-center gap-3 font-semibold"><Bitcoin size={18} className="text-[#0FF1CE]" /> Cryptocurrency</span>
              <span className="font-bold text-[#0FF1CE]">${formatUsd(draft.price)}</span>
            </button>
          </div>
          <p className="mt-4 text-sm text-white/45">Pay with BTC, ETH, USDT, or USDC. {isReset ? 'Reset discount is included in this total.' : 'This is the full fee.'}</p>
          <button type="button" onClick={() => router.push(`${basePath}/details?level=${encodeURIComponent(draft.level)}&mode=${draft.mode}`)} className="mt-6 text-sm font-semibold text-white/50 hover:text-white">
            Edit information
          </button>
          {isProcessing && <p className="mt-4 text-sm text-[#0FF1CE]">Processing payment...</p>}
        </div>
      </Shell>
    );
  }

  const price = size ? priceFor(size, modeParam) : 0;
  const isReset = modeParam === 'reset';

  return (
    <Shell>
      <StepBar current={2} />
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[28px] border border-white/10 bg-white/[0.04] p-6 lg:sticky lg:top-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0FF1CE]">{isReset ? 'Reset' : 'Activation'}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{size?.level}</h1>
          {price < (size?.price || 0) && <p className="mt-3 text-sm text-white/35 line-through">${formatUsd(size?.price || 0)}</p>}
          <p className="mt-1 text-3xl font-bold text-[#0FF1CE]">${formatUsd(price)}</p>
          <p className="mt-1 text-sm text-white/45">{isReset ? 'Reset fee, 12% off' : 'Due today'}</p>
          <button type="button" onClick={() => router.push(basePath)} className="mt-6 text-sm font-semibold text-white/50 hover:text-white">
            Change account size
          </button>
        </aside>
        <form
          className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            continueToPayment();
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0FF1CE]">Step 2</p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Your information</h2>
          <p className="mt-2 text-sm text-white/50">We use this to create the account and send the login details.</p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName}>
              <input value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className={fieldClass(errors.firstName)} autoComplete="given-name" />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <input value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className={fieldClass(errors.lastName)} autoComplete="family-name" />
            </Field>
            <Field label="Email" error={errors.email} className="sm:col-span-2">
              <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={fieldClass(errors.email)} autoComplete="email" />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={fieldClass(errors.phone)} autoComplete="tel" />
            </Field>
            <Field label="Country" error={errors.country}>
              <select value={form.country} onChange={(event) => update('country', event.target.value)} className={fieldClass(errors.country)}>
                <option value="">Select a country</option>
                {countries.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
              </select>
            </Field>
            <Field label="Platform" error={errors.platform}>
              <select value={form.platform} onChange={(event) => update('platform', event.target.value)} className={fieldClass(errors.platform)}>
                <option value="MT5">MetaTrader 5</option>
                <option value="MT4">MetaTrader 4</option>
              </select>
            </Field>
            <Field label="Discord" hint="Optional">
              <input value={form.discordUsername} onChange={(event) => update('discordUsername', event.target.value)} className={fieldClass()} />
            </Field>
          </div>
          <button type="submit" className="mt-6 w-full rounded-2xl bg-[#0FF1CE] px-6 py-3.5 text-base font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)]">
            Continue to payment
          </button>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      <Header />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
      <Particles />
      <main className="relative z-10 px-4 pb-20 pt-32 sm:px-6">{children}</main>
    </div>
  );
}

function Field({ label, error, hint, className = '', children }: { label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-sm text-white/70">
        {label}
        {hint && <span className="text-xs text-white/35">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

function fieldClass(error?: string) {
  return `w-full rounded-2xl border bg-black/40 px-4 py-3 text-base text-white outline-none transition-colors focus:border-[#0FF1CE]/70 ${error ? 'border-red-500' : 'border-white/10'}`;
}
