'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Particles from '../../components/Particles';
import VipOrderReceived from '../components/VipOrderReceived';

type View = 'loading' | 'paid' | 'pending' | 'error';

export default function VipReturnClient() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [view, setView] = useState<View>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setView('error');
      setMessage('This return link is missing a payment session.');
      return;
    }

    let cancelled = false;

    const confirm = async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await fetch(`/vip/api/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setView('error');
            setMessage(data.error || 'Unable to confirm this payment.');
          }
          return;
        }

        if (data.paymentStatus === 'paid') {
          await fetch('/vip/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          if (!cancelled) setView('paid');
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (!cancelled) {
        setView('pending');
        setMessage('Your card payment is still processing. Refresh this page in a moment, or contact support if it does not complete.');
      }
    };

    confirm().catch(() => {
      if (!cancelled) {
        setView('error');
        setMessage('Unable to confirm this payment.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] font-sans text-white">
      <Header />
      <section className="relative overflow-hidden bg-gradient-to-b from-[#121212] to-[#131313] px-4 pb-16 pt-24 text-center md:px-6 md:pb-32 md:pt-40">
        <div className="absolute left-0 top-0 h-full w-full bg-[#0FF1CE]/[0.02] background-noise" />
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0FF1CE]/[0.03] opacity-60 blur-[150px] md:w-3/4" />
        <Particles />

        {view === 'loading' && (
          <div className="relative z-10 flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0FF1CE] border-t-transparent" />
          </div>
        )}

        {view === 'paid' && <VipOrderReceived />}

        {view !== 'loading' && view !== 'paid' && (
          <div className="relative z-10 mx-auto max-w-xl">
            <h1 className="mb-4 text-3xl font-bold text-white">{view === 'pending' ? 'Payment processing' : 'Payment not completed'}</h1>
            <p className="mb-8 text-gray-300">{message}</p>
            <Link
              href="/vip"
              className="inline-flex rounded-xl bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] px-8 py-4 font-bold text-black"
            >
              Return to VIP checkout
            </Link>
          </div>
        )}
      </section>
      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }
      `}</style>
    </div>
  );
}
