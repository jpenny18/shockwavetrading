'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, Layers } from 'lucide-react';

type PlanId = 'standard' | 'onestep' | 'instant' | 'gauntlet';

const SALE_PERCENT = 50;
const DEFAULT_ACCOUNT = 10000;

/**
 * Catalog fees match app/challenge/page.tsx calculatePrice and
 * app/components/PricingTable.tsx. The landing page shows half of those fees.
 * Gauntlet activation fees are paid after a pass and are not part of the sale price.
 */
const PLANS: Record<
  PlanId,
  {
    checkoutType: 'Standard' | '1-Step' | 'Instant' | 'Gauntlet';
    name: string;
    description: string;
    perks: string[];
    accounts: number[];
    prices: Record<number, number>;
    activationFees?: Record<number, number>;
  }
> = {
  standard: {
    checkoutType: 'Standard',
    name: 'Standard Challenge',
    description: 'Multi-phase evaluation with higher drawdown limits.',
    perks: ['15% max drawdown', 'On-demand payouts', 'No min days'],
    accounts: [5000, 10000, 25000, 50000, 100000, 200000, 500000],
    prices: {
      5000: 88.5,
      10000: 163.5,
      25000: 283.5,
      50000: 433.5,
      100000: 748.5,
      200000: 1423.5,
      500000: 2848.5,
    },
  },
  onestep: {
    checkoutType: '1-Step',
    name: '1-Step Challenge',
    description: 'Single-phase evaluation. One profit target, then a funded account.',
    perks: ['8% max drawdown', 'On-demand payouts', 'No min days'],
    accounts: [5000, 10000, 25000, 50000, 100000, 200000, 500000],
    prices: {
      5000: 97.5,
      10000: 178.5,
      25000: 298.5,
      50000: 433.5,
      100000: 853.5,
      200000: 1483.5,
      500000: 2998.5,
    },
  },
  instant: {
    checkoutType: 'Instant',
    name: 'Instant Challenge',
    description: 'A single profit target on an instant evaluation, with no daily loss limit.',
    perks: ['No daily loss limit', 'On-demand payouts', 'No min days'],
    accounts: [5000, 10000, 25000, 50000, 100000, 200000, 500000],
    prices: {
      5000: 448.5,
      10000: 823.5,
      25000: 1123.5,
      50000: 1348.5,
      100000: 2698.5,
      200000: 5248.5,
      500000: 10498.5,
    },
  },
  gauntlet: {
    checkoutType: 'Gauntlet',
    name: 'Gauntlet Challenge',
    description: 'Start for a small entry fee. The activation fee is charged only after you pass.',
    perks: ['$19.99 to start', 'On-demand payouts', 'No min days'],
    accounts: [10000, 25000, 50000, 100000, 200000, 500000],
    prices: {
      10000: 19.99,
      25000: 19.99,
      50000: 19.99,
      100000: 19.99,
      200000: 19.99,
      500000: 19.99,
    },
    activationFees: {
      10000: 199,
      25000: 299,
      50000: 499,
      100000: 799,
      200000: 1499,
      500000: 2999,
    },
  },
};

const TABS: { id: PlanId; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'onestep', label: '1-Step' },
  { id: 'instant', label: 'Instant' },
  { id: 'gauntlet', label: 'Gauntlet' },
];

function formatPrice(amount: number) {
  const rounded = Number(amount.toFixed(2));
  return `$${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatWhole(amount: number) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function sizeLabel(amount: number) {
  return amount >= 1000 ? `${amount / 1000}K` : String(amount);
}

function resolveAccount(accounts: number[], selected: number) {
  if (accounts.includes(selected)) return selected;
  return accounts.includes(DEFAULT_ACCOUNT) ? DEFAULT_ACCOUNT : accounts[0];
}

function salePrice(price: number) {
  return price * (1 - SALE_PERCENT / 100);
}

function percentOf(account: number, rate: number) {
  return `${Math.round(rate * 100)}% (${formatWhole(account * rate)})`;
}

export default function BlackFridayPricing() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId>('standard');
  const [selectedAccount, setSelectedAccount] = useState(DEFAULT_ACCOUNT);
  const [expanded, setExpanded] = useState(true);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const data = PLANS[plan];
  const activeAccount = resolveAccount(data.accounts, selectedAccount);

  useEffect(() => {
    if (!data.accounts.includes(selectedAccount)) {
      setSelectedAccount(resolveAccount(data.accounts, selectedAccount));
    }
  }, [data.accounts, selectedAccount]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || window.matchMedia('(min-width: 768px)').matches) return;
    const target = resolveAccount(data.accounts, selectedAccount);
    const track = scroller.querySelector<HTMLElement>('[data-account-track]');
    if (track) {
      track.style.marginRight = '0px';
      track.style.marginBottom = '0px';
      track.style.marginRight = `-${track.offsetWidth * 0.15}px`;
      track.style.marginBottom = `-${track.offsetHeight * 0.15}px`;
    }
    const align = () => {
      const card = scroller.querySelector<HTMLElement>(`[data-account="${target}"]`);
      if (!card) return;
      const delta = card.getBoundingClientRect().left - scroller.getBoundingClientRect().left - 16;
      scroller.scrollLeft = Math.max(0, scroller.scrollLeft + delta);
    };
    align();
    const frame = requestAnimationFrame(align);
    return () => cancelAnimationFrame(frame);
    // Only realign when the plan changes. Following every swipe fights the scroller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    if (!info) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInfo(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [info]);

  const selectFromScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.offsetParent === null) return;
    const edge = scroller.getBoundingClientRect().left + 16;
    let best = selectedAccount;
    let bestDistance = Infinity;
    data.accounts.forEach((account) => {
      const card = scroller.querySelector<HTMLElement>(`[data-account="${account}"]`);
      if (!card) return;
      const distance = Math.abs(card.getBoundingClientRect().left - edge);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = account;
      }
    });
    if (best !== selectedAccount) setSelectedAccount(best);
  };

  const scrollToAccount = (account: number) => {
    setSelectedAccount(account);
    const scroller = scrollerRef.current;
    const card = scroller?.querySelector<HTMLElement>(`[data-account="${account}"]`);
    if (!scroller || !card || window.matchMedia('(min-width: 768px)').matches) return;
    const delta = card.getBoundingClientRect().left - scroller.getBoundingClientRect().left - 16;
    scroller.scrollTo({ left: Math.max(0, scroller.scrollLeft + delta), behavior: 'smooth' });
  };

  const checkout = (account: number) => {
    sessionStorage.setItem('preselectedChallengeType', data.checkoutType);
    sessionStorage.setItem('preselectedBalance', String(account));
    router.push('/challenge');
  };

  const dailyRate = plan === 'standard' || plan === 'gauntlet' ? 0.08 : plan === 'onestep' ? 0.04 : 0;
  const maxRate = plan === 'standard' || plan === 'gauntlet' ? 0.15 : plan === 'onestep' ? 0.08 : 0.04;
  const targetRate = plan === 'instant' ? 0.12 : 0.1;
  const price = data.prices[activeAccount];
  const activation = data.activationFees?.[activeAccount];

  const profitInfo =
    plan === 'standard'
      ? 'Phase 1 is a 10% profit target. Phase 2 is a 5% profit target. Hit both to qualify for the funded account.'
      : plan === 'instant'
        ? 'Hit the profit target during the instant challenge to qualify for a payout.'
        : plan === 'gauntlet'
          ? 'Hit the profit target to pass. The activation fee is charged only after you pass.'
          : 'One profit target. Hit it in a single phase to qualify for the funded account.';

  const feeLabel = plan === 'gauntlet' ? 'Activation Fee' : plan === 'instant' ? 'Challenge Fee' : 'Refundable Fee';
  const feeInfo =
    plan === 'gauntlet'
      ? 'The price on the card is the entry fee. This activation fee is charged only after you pass.'
      : 'The full challenge fee is refunded with your first payout, unless the challenge was bought at a discount.';
  const feeValue =
    plan === 'gauntlet' && activation
      ? formatWhole(activation)
      : formatPrice(price);

  const rows: { label: string; info: string; value: React.ReactNode }[] = [
    {
      label: 'Profit Target',
      info: profitInfo,
      value:
        plan === 'standard' ? (
          <div className="grid grid-cols-[auto_auto] justify-end gap-x-3 text-right leading-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Phase 1</span>
            <span>{percentOf(activeAccount, 0.1)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Phase 2</span>
            <span>{percentOf(activeAccount, 0.05)}</span>
          </div>
        ) : (
          percentOf(activeAccount, targetRate)
        ),
    },
    {
      label: 'Max Daily Loss',
      info:
        plan === 'instant'
          ? 'Instant accounts have no daily loss limit. The overall loss limit still applies.'
          : 'The most the account can lose in one trading day. Passing this limit breaches the account.',
      value: plan === 'instant' ? 'None' : percentOf(activeAccount, dailyRate),
    },
    {
      label: 'Max Loss',
      info: 'The most the account can lose in total. Passing this limit breaches the account.',
      value: percentOf(activeAccount, maxRate),
    },
    {
      label: 'Leverage',
      info: 'The highest leverage available on this account.',
      value: '1:200',
    },
    {
      label: 'Profit Split',
      info: plan === 'instant' ? 'Your share of profits on an Instant account is 70%.' : 'Your share of profits on the funded account, up to 95%.',
      value: plan === 'instant' ? '70%' : '95%',
    },
    {
      label: feeLabel,
      info: feeInfo,
      value: feeValue,
    },
  ];

  return (
    <section id="challenges" className="scroll-mt-24 px-6 pb-16 pt-12 md:px-4 md:pb-20 md:pt-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center md:mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Choose your challenge.</h2>
          <p className="mt-2 text-base font-semibold text-[#0FF1CE] md:text-lg">
            Black Friday pricing — 50% off + one free retry
          </p>
        </div>

        <div className="mb-5 flex justify-start gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = tab.id === plan;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPlan(tab.id)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#0FF1CE] text-black shadow-[0_8px_24px_rgba(15,241,206,0.25)]'
                    : 'border border-white/10 bg-white/[0.03] text-white/80 hover:border-[#0FF1CE]/40 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[28px] border border-[#0FF1CE]/35 bg-[#071016] p-4 shadow-[0_0_50px_rgba(15,241,206,0.07)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0FF1CE]/30 bg-[#0FF1CE]/10 text-[#0FF1CE]">
                <Layers size={18} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-white md:text-xl">{data.name}</h3>
                <p className="mt-0.5 text-sm text-white/55">{data.description}</p>
              </div>
            </div>
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse challenge details' : 'Expand challenge details'}
              onClick={() => setExpanded((open) => !open)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-[#0FF1CE]/40 hover:text-[#0FF1CE]"
            >
              <ChevronUp size={18} className={`transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {expanded && (
            <>
              <div className="mt-5 md:grid md:grid-cols-2 md:gap-x-12">
                {[rows.slice(0, 3), rows.slice(3)].map((group) => (
                  <div key={group[0]?.label}>
                    {group.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 border-b border-white/10 py-3.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-sm text-white/80">{row.label}</span>
                          <button
                            type="button"
                            aria-label={`About ${row.label}`}
                            onClick={() => setInfo({ title: row.label, body: row.info })}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] font-semibold text-white/60 transition-colors hover:border-[#0FF1CE]/50 hover:text-[#0FF1CE]"
                          >
                            i
                          </button>
                        </div>
                        <div className="text-right text-sm font-semibold tabular-nums text-white">{row.value}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div
                ref={scrollerRef}
                onScroll={selectFromScroll}
                className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 pt-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 2xl:grid-cols-7 [&::-webkit-scrollbar]:hidden"
              >
                <div data-account-track="" className="flex w-max origin-top-left scale-[0.85] gap-3 md:contents">
                {data.accounts.map((account) => {
                  const original = data.prices[account];
                  const sale = salePrice(original);
                  const popular = account === DEFAULT_ACCOUNT;
                  const selected = account === selectedAccount;
                  return (
                    <article
                      key={account}
                      data-account={account}
                      className={`relative flex w-[168px] shrink-0 flex-col rounded-[22px] border bg-[#050a0e] p-4 md:w-auto md:min-w-0 ${
                        selected
                          ? 'border-[#0FF1CE] shadow-[0_0_28px_rgba(15,241,206,0.18)]'
                          : 'border-[#0FF1CE]/25'
                      }`}
                    >
                      {popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#0FF1CE]/50 bg-[#07141a] px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-[#0FF1CE]">
                          MOST POPULAR
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedAccount(account)}
                        className="text-left"
                      >
                        <p className={`text-[11px] font-semibold tracking-[0.16em] text-white/45 ${popular ? 'mt-2' : ''}`}>
                          {sizeLabel(account)} ACCOUNT
                        </p>
                        <p className="mt-3 text-sm text-white/35 line-through tabular-nums">{formatPrice(original)}</p>
                        <p className="mt-0.5 text-[1.65rem] font-bold leading-none tracking-tight text-[#0FF1CE] tabular-nums">
                          {formatPrice(sale)}
                        </p>
                        <span className="mt-3 inline-flex whitespace-nowrap rounded-full border border-[#0FF1CE]/40 px-1.5 py-1 text-[9px] font-bold leading-none tracking-tight text-[#0FF1CE]">
                          {SALE_PERCENT}% OFF + 1 FREE RETRY
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => checkout(account)}
                        className="mt-4 w-full rounded-full bg-[#0FF1CE] py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
                      >
                        Select Account →
                      </button>
                    </article>
                  );
                })}
                </div>
              </div>

              <div className="mt-3 flex justify-center gap-1.5 md:hidden">
                {data.accounts.map((account) => (
                  <button
                    key={account}
                    type="button"
                    aria-label={`Show ${sizeLabel(account)} account`}
                    onClick={() => scrollToAccount(account)}
                    className={`h-1.5 rounded-full transition-all ${
                      account === selectedAccount ? 'w-4 bg-[#0FF1CE]' : 'w-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>

            </>
          )}
        </div>
      </div>

      {info && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setInfo(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bf-info-title"
            className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d0f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            <button
              type="button"
              onClick={() => setInfo(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">Account rule</p>
            <h3 id="bf-info-title" className="mt-2 pr-8 text-2xl font-semibold text-white">
              {info.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{info.body}</p>
          </div>
        </div>
      )}
    </section>
  );
}
