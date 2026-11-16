'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bitcoin, CreditCard } from 'lucide-react';
import Header from './Header';
import Particles from './Particles';
import CryptoPayment from './CryptoPayment';
import ActivationSteps from './ActivationSteps';
import {
  ACTIVATION_PRODUCTS,
  activationPrice,
  findActivationOption,
  formatActivationUsd,
  readActivationDraft,
  type ActivationDraft,
  type ActivationProductId,
} from '@/lib/activation-checkout';

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

export default function ActivationPaymentForm({ productId }: { productId: ActivationProductId }) {
  const product = ACTIVATION_PRODUCTS[productId];
  const router = useRouter();
  const [draft, setDraft] = useState<ActivationDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState<'crypto' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });

  useEffect(() => {
    const stored = readActivationDraft();
    if (!stored || stored.productId !== productId) {
      router.replace(product.homePath);
      return;
    }
    setDraft(stored);
    setReady(true);
  }, [product.homePath, productId, router]);

  useEffect(() => {
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
  }, []);

  const option = draft ? findActivationOption(product, draft.level) : null;
  const price = option && draft ? activationPrice(product, option, draft.mode) : 0;
  const isReset = draft?.mode === 'reset';
  const orderLabel = isReset ? 'Reset' : 'Activation';

  const challengeData = draft && option ? {
    type: product.challengeType,
    amount: option.level,
    activationMode: draft.mode,
    platform: draft.platform,
    formData: {
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      country: draft.country,
      discordUsername: draft.discordUsername,
    },
    price,
    originalPrice: option.price,
    addOns: [],
  } : null;

  const payWithCard = async () => {
    if (!draft || !option) return;
    setProcessing(true);
    try {
      const orderData = {
        status: 'PENDING',
        challengeType: product.challengeType,
        challengeAmount: option.level,
        activationMode: draft.mode,
        platform: draft.platform,
        totalAmount: price,
        customerEmail: draft.email,
        customerName: `${draft.firstName} ${draft.lastName}`,
        customerPhone: draft.phone,
        customerCountry: draft.country,
        customerDiscordUsername: draft.discordUsername || '',
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
      } catch (emailError) {
        console.error('Error sending admin email:', emailError);
      }
      if (!option.whopCheckoutUrl) throw new Error('Checkout URL not configured');
      window.location.href = option.whopCheckoutUrl;
    } catch (error) {
      console.error('Error processing card payment:', error);
      alert('Failed to process payment. Please try again or contact support.');
      setProcessing(false);
    }
  };

  if (!ready || !draft || !option || !challengeData) {
    return <div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0FF1CE] border-t-transparent" /></div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      <Header />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
      <Particles />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6">
        <ActivationSteps current={3} homePath={product.homePath} />
        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
          {processing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <p className="text-white">Processing payment...</p>
            </div>
          )}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6 md:p-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0FF1CE]">Payment</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{orderLabel} · {option.level}</h1>
              <p className="mt-1 text-sm text-white/50">{draft.firstName} {draft.lastName} · {draft.platform}</p>
            </div>
            <div className="text-right">
              {price !== option.price && <div className="text-sm text-white/35 line-through">${formatActivationUsd(option.price)}</div>}
              <div className="text-3xl font-bold text-[#0FF1CE]">${formatActivationUsd(price)}</div>
            </div>
          </div>

          {method === 'crypto' ? (
            <div>
              <button type="button" onClick={() => setMethod(null)} className="px-6 pt-5 text-sm font-semibold text-[#0FF1CE] hover:underline md:px-8">
                Back
              </button>
            <CryptoPayment
              challengeData={challengeData}
              successRedirectPath={product.pendingPath}
              onProcessingStateChange={setProcessing}
              cryptoPrices={cryptoPrices}
            />
            </div>
          ) : (
            <div className="space-y-4 p-6 md:p-8">
              <button
                type="button"
                onClick={() => setMethod('crypto')}
                className="flex w-full items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/30 p-5 text-left transition-colors hover:border-[#0FF1CE]/50"
              >
                <span className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0FF1CE]/15 text-[#0FF1CE]">
                    <Bitcoin size={22} />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold">Cryptocurrency</span>
                    <span className="block text-sm text-white/50">BTC, ETH, USDT, or USDC</span>
                  </span>
                </span>
                <span className="text-xl font-bold text-[#0FF1CE]">${formatActivationUsd(price)}</span>
              </button>
              <button
                type="button"
                onClick={payWithCard}
                className="hidden w-full items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/30 p-5 text-left"
              >
                <span className="flex items-center gap-4">
                  <CreditCard size={22} />
                  <span>Credit or debit card</span>
                </span>
              </button>
              <button type="button" onClick={() => router.push(product.informationPath + `?level=${encodeURIComponent(option.level)}&mode=${draft.mode}`)} className="text-sm font-semibold text-[#0FF1CE] hover:underline">
                Edit information
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
