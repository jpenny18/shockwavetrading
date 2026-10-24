'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadVipStripe, type VipStripeActions, type VipStripeSession } from '../lib/load-stripe';

const appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#0FF1CE',
    colorBackground: '#101010',
    colorText: '#ffffff',
    colorDanger: '#f87171',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

export type VipCardCustomer = {
  firstName: string;
  lastName: string;
  email: string;
};

export type VipCardHandle = {
  confirm: (customer: VipCardCustomer) => Promise<{ type: 'success' } | { type: 'error'; message: string }>;
};

type VipCardPaymentProps = {
  publishableKey: string;
  clientSecret: string;
  onTotal: (amount: string) => void;
};

function readTotal(session: VipStripeSession | undefined): string {
  return session?.total?.total?.amount || '';
}

const VipCardPayment = forwardRef<VipCardHandle, VipCardPaymentProps>(function VipCardPayment(
  { publishableKey, clientSecret, onTotal },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<VipStripeActions | null>(null);
  const onTotalRef = useRef(onTotal);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onTotalRef.current = onTotal;
  }, [onTotal]);

  useImperativeHandle(ref, () => ({
    async confirm(customer) {
      const actions = actionsRef.current;
      if (!actions) {
        return { type: 'error', message: 'Card checkout is still loading.' };
      }

      const session = actions.getSession();
      const total = readTotal(session);
      if (total) onTotalRef.current(total);

      const result = await actions.confirm({
        redirect: 'if_required',
        email: customer.email.trim(),
      });

      if (result.type === 'error') {
        return { type: 'error', message: result.error?.message || 'Payment could not be completed.' };
      }
      return { type: 'success' };
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let paymentElement: { mount: (target: Element | string) => void; unmount: () => void } | null = null;
    setReady(false);
    setError(null);
    actionsRef.current = null;

    (async () => {
      try {
        const stripe = await loadVipStripe(publishableKey);
        if (cancelled) return;

        const checkout = stripe.initCheckoutElementsSdk({
          clientSecret,
          elementsOptions: { appearance },
        });
        const loaded = await checkout.loadActions();
        if (cancelled) return;
        if (loaded.type !== 'success') {
          setError(loaded.error?.message || 'Unable to load card checkout.');
          return;
        }

        actionsRef.current = loaded.actions;
        const initialTotal = readTotal(loaded.actions.getSession());
        if (initialTotal) onTotalRef.current(initialTotal);

        checkout.on('change', (session) => {
          const nextTotal = readTotal(session);
          if (nextTotal) onTotalRef.current(nextTotal);
        });

        if (!containerRef.current) return;
        paymentElement = checkout.createPaymentElement({ layout: 'tabs' });
        paymentElement.mount(containerRef.current);
        if (!cancelled) setReady(true);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load card checkout.');
        }
      }
    })();

    return () => {
      cancelled = true;
      actionsRef.current = null;
      try {
        paymentElement?.unmount();
      } catch {
        // The element is already gone when the allocation changes.
      }
    };
  }, [clientSecret, publishableKey]);

  return (
    <div>
      {!ready && !error && (
        <div className="flex items-center gap-3 py-6 text-sm text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
          Loading secure card form...
        </div>
      )}
      <div ref={containerRef} className={ready ? 'min-h-[120px]' : 'min-h-[40px]'} />
      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

export default VipCardPayment;
