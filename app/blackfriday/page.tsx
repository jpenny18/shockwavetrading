'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, Check, Copy, MousePointerClick, RefreshCw, X } from 'lucide-react';
import BlackFridayPayflow from '../components/BlackFridayPayflow';
import BlackFridayPricing from '../components/BlackFridayPricing';

const PROMO_CODE = 'BLACKFRIDAY';

const NAV = [
  { name: 'Home', href: '/' },
  { name: 'How Shockwave Operates', href: '/How-Shockwave-Operates' },
  { name: 'Challenges', href: '#challenges' },
  { name: 'Client Area', href: '/dashboard' },
];

const STATS = [
  { value: '15%', label: 'Max drawdown' },
  { value: '8%', label: 'Daily drawdown' },
  { value: '1:200', label: 'Leverage' },
  { value: 'NO', label: 'Consistency rules' },
];

const STEPS = [
  {
    icon: MousePointerClick,
    title: '1. Select',
    body: 'Choose your challenge. BLACKFRIDAY is applied for you at checkout.',
  },
  {
    icon: BarChart3,
    title: '2. Trade',
    body: 'Complete your evaluation under our challenge rules.',
  },
  {
    icon: RefreshCw,
    title: '3. Retry',
    body: "If you don't pass, you'll receive one free retry on the same challenge.",
  },
];

function scrollToDeals(event: React.MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById('challenges');
  if (!target) return;
  event.preventDefault();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', '#challenges');
}

export default function BlackFridayPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
    } catch {
      const input = document.createElement('textarea');
      input.value = PROMO_CODE;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#05080e] text-white">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled || menuOpen ? 'border-b border-white/10 bg-[#05080e] shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : 'bg-gradient-to-b from-[#05080e]/80 to-transparent'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:h-24 md:px-4">
          <Link href="/" className="shrink-0" aria-label="Shockwave Capital home">
            <Image src="/logo.png" alt="Shockwave Capital" width={96} height={96} priority className="h-[4.25rem] w-[4.25rem] md:h-20 md:w-20" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) =>
              item.href.startsWith('#') ? (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={scrollToDeals}
                  className="text-sm text-white/80 transition-colors hover:text-[#0FF1CE]"
                >
                  {item.name}
                </a>
              ) : (
                <Link key={item.name} href={item.href} className="text-sm text-white/80 transition-colors hover:text-[#0FF1CE]">
                  {item.name}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/challenge"
              className="hidden rounded-full bg-[#0FF1CE] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-black shadow-[0_8px_24px_rgba(15,241,206,0.25)] transition-transform hover:scale-[1.03] lg:inline-flex"
            >
              Get Funded
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center text-white lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X size={22} />
              ) : (
                <span className="flex w-[22px] flex-col gap-[5px]" aria-hidden="true">
                  <span className="h-[1.5px] w-full bg-white" />
                  <span className="h-[1.5px] w-full bg-white" />
                  <span className="h-[1.5px] w-full bg-white" />
                </span>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#05080e] px-6 pb-5 shadow-[0_24px_40px_rgba(0,0,0,0.45)] lg:hidden">
            <nav className="flex flex-col">
              {NAV.map((item) =>
                item.href.startsWith('#') ? (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(event) => {
                      scrollToDeals(event);
                      setMenuOpen(false);
                    }}
                    className="border-b border-white/10 py-3.5 text-[15px] text-white/90"
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-white/10 py-3.5 text-[15px] text-white/90"
                  >
                    {item.name}
                  </Link>
                )
              )}
            </nav>
            <Link
              href="/challenge"
              onClick={() => setMenuOpen(false)}
              className="mt-4 inline-flex rounded-full bg-[#0FF1CE] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-black"
            >
              Get Funded
            </Link>
          </div>
        )}
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/herotest.png"
            alt=""
            fill
            priority
            className="object-cover object-[72%_center]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05080e] from-[18%] via-[#05080e]/88 via-[48%] to-[#05080e]/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05080e] via-[#05080e]/25 to-[#05080e]/55" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-32 md:px-14 md:pb-20 md:pt-36 lg:px-20">
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] md:items-center md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:gap-16">
            <div className="mx-auto max-w-xl text-center md:mx-0 md:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white md:text-sm">
                Black Friday 2026 — Limited time
              </p>
              <h1 className="mt-3 text-[2.65rem] font-extrabold leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block text-white">50% OFF +</span>
                <span className="block text-[#0FF1CE]">1 FREE RETRY</span>
              </h1>

              <div className="mt-6 flex flex-col items-center gap-5 md:items-start lg:mt-8 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/45 px-4 py-2.5 backdrop-blur-md">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/55">Use code</span>
                  <span className="h-4 w-px bg-white/20" />
                  <span className="font-bold tracking-wide text-white">{PROMO_CODE}</span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="text-white/70 transition-colors hover:text-[#0FF1CE]"
                    aria-label={copied ? 'Code copied' : 'Copy discount code'}
                  >
                    {copied ? <Check size={16} className="text-[#0FF1CE]" /> : <Copy size={16} />}
                  </button>
                </div>
                <a
                  href="#challenges"
                  onClick={scrollToDeals}
                  className="inline-flex items-center rounded-full bg-[#0FF1CE] px-6 py-3 text-sm font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.28)] transition-transform hover:scale-[1.02]"
                >
                  <span className="sm:hidden">Explore Deals →</span>
                  <span className="hidden sm:inline">Explore Black Friday Deals →</span>
                </a>
              </div>
            </div>

            <BlackFridayPayflow placement="hero" />
          </div>

          <div className="mt-8 rounded-[28px] border border-[#0FF1CE]/35 bg-[#071016] p-4 shadow-[0_0_50px_rgba(15,241,206,0.07)] md:mx-auto md:mt-12 md:w-1/2 md:rounded-2xl md:p-3">
            <div className="grid grid-cols-4 divide-x divide-white/10">
              {STATS.map((stat) => (
                <div key={stat.label} className="px-1 text-center md:px-2">
                  <div className="text-lg font-bold tracking-tight text-white sm:text-2xl md:text-lg">{stat.value}</div>
                  <div className="mt-1 text-[9px] font-medium uppercase leading-tight tracking-[0.12em] text-white/55 sm:text-[11px] md:mt-0.5 md:text-[9px] md:tracking-[0.08em]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BlackFridayPayflow />

      <BlackFridayPricing />

      <section className="px-6 pb-16 md:px-4 md:pb-24">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-[#0FF1CE]/30 bg-[#071016] p-5 shadow-[0_0_40px_rgba(15,241,206,0.06)] md:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">How your free retry works.</h2>
          <div className="mt-6 flex flex-col gap-4 md:mt-8 md:flex-row md:items-center">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.title}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#0FF1CE]/35 bg-[#0FF1CE]/10 text-[#0FF1CE]">
                    <step.icon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-white">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{step.body}</p>
                  </div>
                  <span className="text-white/30 md:hidden" aria-hidden="true">
                    →
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <span className="hidden shrink-0 text-xl text-white/30 md:block" aria-hidden="true">
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 md:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <div className="text-xs leading-relaxed text-gray-500">
              <p className="mb-2">
                ⚠️ <strong>Disclaimer:</strong> Shockwave Capital provides funded trading accounts after an evaluation. Payouts can be requested on demand when you have no open positions and have not breached the account. A breached funded account cannot receive a payout.
              </p>
              <p className="mb-2">
                Participation in our challenges does not constitute an offer or solicitation to invest or manage capital. Shockwave Capital is not a broker-dealer, investment advisor, or financial institution and does not provide financial, investment, or trading advice.
              </p>
              <p className="mb-2">
                Funded accounts trade live market conditions. The requested payout is deducted from the account balance immediately, and you can keep trading that same account while the payout is processed. The minimum payout is $50 after Shockwave&apos;s performance split. Payouts are sent as USDC on ERC-20, or USDT on Tron or Solana.
              </p>
              <p className="mb-2">
                By purchasing access to any evaluation or subscription plan, you acknowledge and agree to our Terms of Use, Privacy Policy, and Program Rules. All purchases are final. Fees are non-refundable once your funded account is activated or access to our services is granted.
              </p>
              <p className="mb-2">
                Shockwave Capital retains full control over all account parameters and reserves the right to update challenge rules, evaluation criteria, payout structures, or access terms with appropriate notice. Continued use of our services constitutes acceptance of any such updates.
              </p>
              <p className="mb-2">
                Trading leveraged products like forex, indices, and commodities carries inherent risk. Risk management is essential. Past performance is not indicative of future results.
              </p>
              <p>&copy; {new Date().getFullYear()} Shockwave Capital. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs md:justify-end">
              <Link href="/terms" className="text-gray-400 transition-colors hover:text-[#0FF1CE]">Terms</Link>
              <Link href="/privacy" className="text-gray-400 transition-colors hover:text-[#0FF1CE]">Privacy</Link>
              <Link href="/refund" className="text-gray-400 transition-colors hover:text-[#0FF1CE]">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
