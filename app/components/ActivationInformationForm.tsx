'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from './Header';
import Particles from './Particles';
import ActivationSteps from './ActivationSteps';
import { countries } from '@/lib/countries';
import {
  ACTIVATION_PRODUCTS,
  activationPrice,
  findActivationOption,
  formatActivationUsd,
  writeActivationDraft,
  type ActivationCustomer,
  type ActivationMode,
  type ActivationProductId,
} from '@/lib/activation-checkout';

const emptyCustomer = (): ActivationCustomer => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  platform: 'MT5',
  discordUsername: '',
});

function ActivationInformationContent({ productId }: { productId: ActivationProductId }) {
  const product = ACTIVATION_PRODUCTS[productId];
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = searchParams?.get('mode') === 'reset' ? 'reset' : 'activate';
  const option = findActivationOption(product, searchParams?.get('level') || null);
  const [mode] = useState<ActivationMode>(requestedMode);
  const [form, setForm] = useState<ActivationCustomer>(emptyCustomer());
  const [errors, setErrors] = useState<Partial<Record<keyof ActivationCustomer, string>>>({});

  const price = useMemo(() => (option ? activationPrice(product, option, mode) : 0), [option, product, mode]);
  const feeLabel = mode === 'reset' ? 'Reset fee' : 'Activation fee';

  const update = (name: keyof ActivationCustomer, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof ActivationCustomer, string>> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    if (!form.country.trim()) next.country = 'Country is required';
    if (!form.platform) next.platform = 'Choose a platform';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const continueToPayment = () => {
    if (!option || !validate()) return;
    writeActivationDraft({
      productId,
      level: option.level,
      mode,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country,
      platform: form.platform,
      discordUsername: form.discordUsername.trim(),
    });
    router.push(product.paymentPath);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      <Header />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
      <Particles />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6">
        <ActivationSteps current={2} homePath={product.homePath} />
        {!option ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-white/70">Choose an account size to continue.</p>
            <Link href={product.homePath} className="mt-4 inline-block font-semibold text-[#0FF1CE] hover:underline">
              Back to account sizes
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0FF1CE]">{mode === 'reset' ? 'Reset' : 'Activation'}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{option.level} funded account</h1>
                <p className="mt-1 text-sm text-white/50">{feeLabel}. Card and crypto are on the next step.</p>
              </div>
              <div className="text-right">
                {price !== option.price && (
                  <div className="text-sm text-white/35 line-through">${formatActivationUsd(option.price)}</div>
                )}
                <div className="text-3xl font-bold text-[#0FF1CE]">${formatActivationUsd(price)}</div>
              </div>
            </div>

            <form
              className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 md:p-7"
              onSubmit={(event) => {
                event.preventDefault();
                continueToPayment();
              }}
            >
              <h2 className="text-xl font-semibold tracking-tight">Your information</h2>
              <p className="mt-1 text-sm text-white/50">We use this to create the account and send your login details.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                  <select value={form.country} onChange={(event) => update('country', event.target.value)} className={fieldClass(errors.country)} autoComplete="country-name">
                    <option value="">Select your country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium">Trading platform</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['MT5', 'MT4'] as const).map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => update('platform', platform)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                          form.platform === platform
                            ? 'border-[#0FF1CE] bg-[#0FF1CE] text-black'
                            : 'border-white/10 bg-black/30 text-white hover:border-white/20'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{platform === 'MT5' ? 'MetaTrader 5' : 'MetaTrader 4'}</span>
                        <span className={`mt-1 block text-xs ${form.platform === platform ? 'text-black/60' : 'text-white/45'}`}>{platform}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Discord username" hint="Optional" className="sm:col-span-2">
                  <input value={form.discordUsername} onChange={(event) => update('discordUsername', event.target.value)} className={fieldClass()} placeholder="username" />
                </Field>
              </div>
              <button
                type="submit"
                className="mt-6 w-full rounded-2xl bg-[#0FF1CE] px-6 py-4 text-base font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform hover:scale-[1.01]"
              >
                Continue to payment
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 flex items-center justify-between text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-white/40">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  );
}

function fieldClass(error?: string) {
  return `w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#0FF1CE]/70 ${
    error ? 'border-red-500' : 'border-white/10'
  }`;
}

export default function ActivationInformationForm({ productId }: { productId: ActivationProductId }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0FF1CE] border-t-transparent" /></div>}>
      <ActivationInformationContent productId={productId} />
    </Suspense>
  );
}
