'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import Particles from '../../components/Particles';
import Header from '../../components/Header';

export default function GauntletActivationPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user && !loading) {
        router.push('/access');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0FF1CE] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      <Header />
      
      <section className="relative z-10 overflow-hidden bg-black px-6 pb-16 pt-36 text-center md:pb-24 md:pt-44">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
        <Particles />
        
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0FF1CE] shadow-[0_8px_30px_rgba(15,241,206,0.28)]">
            <svg className="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>

          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Payment received</p>
          <h1 className="mb-4 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] bg-clip-text text-4xl font-extrabold leading-tight text-transparent md:mb-6 md:text-6xl">
            🔥 Activation Complete!
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-sm text-white/60 md:text-base">
            Your Gauntlet account activation payment has been received! We're now setting up your simulated funded account with zero trading restrictions.
          </p>

          <div className="mx-auto mb-8 max-w-2xl rounded-[22px] border border-white/10 bg-white/[0.04] p-6 text-left backdrop-blur-xl md:p-8">
            <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-white">What happens next?</h2>
            
            <div className="space-y-5">
              {[
                {
                  step: '1',
                  title: 'Account Setup (2-4 hours)',
                  body: "We're configuring your simulated funded account with the exact parameters from your Gauntlet challenge."
                },
                {
                  step: '2',
                  title: 'Login Credentials Sent',
                  body: "You'll receive your MT4/MT5 login details via email within 4 hours during business hours."
                },
                {
                  step: '3',
                  title: 'Start Trading',
                  body: 'Begin trading with zero restrictions, news trading allowed, weekend holding permitted.'
                }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0FF1CE] text-sm font-bold text-black">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-white/55">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Max DD", value: "15%" },
              { label: "Daily DD", value: "8%" },
              { label: "Leverage", value: "1:200" },
              { label: "Restrictions", value: "None" }
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-xl">
                <div className="text-xl font-bold text-[#0FF1CE]">{item.value}</div>
                <div className="mt-1 text-sm text-white/50">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-3 md:flex-row">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-2xl bg-[#0FF1CE] px-8 py-3.5 text-base font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push('/support-center')}
              className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
            >
              Contact Support
            </button>
          </div>

          <p className="mt-6 text-sm text-white/45">
            🔥 Welcome to the ultimate trading experience - no limits, no restrictions, just pure trading freedom.
          </p>
        </div>
      </section>
    </div>
  );
}
