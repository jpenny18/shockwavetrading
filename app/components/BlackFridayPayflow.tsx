'use client';

import { Fragment, useEffect, useState } from 'react';

const PAYOUT_AMOUNT = '+$6,300';

const NODES = [
  {
    title: 'Trade closes',
    sub: `${PAYOUT_AMOUNT} P&L`,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="14 7 21 7 21 14" />
      </svg>
    ),
  },
  {
    title: 'Payout requested',
    sub: 'Submitted',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
    ),
  },
  {
    title: 'USDC received',
    sub: 'External wallet',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
] as const;

function receiptFor(step: number) {
  if (step >= 3) {
    return { status: 'USDC received', when: 'External wallet', amount: PAYOUT_AMOUNT, paid: true };
  }
  if (step >= 2) {
    return { status: 'Request received', when: 'On-demand payouts, 24/7', amount: '+$0', paid: false };
  }
  return { status: 'Trade closed', when: 'On-demand payouts, 24/7', amount: '+$0', paid: false };
}

function DesktopConnector({ active, complete }: { active: boolean; complete: boolean }) {
  return (
    <div className="relative mt-[22px] h-0.5 w-full rounded-full bg-white/15">
      <span
        className={`absolute inset-y-0 left-0 w-full rounded-full bg-[#0FF1CE] ${
          complete ? 'bf-fill-done' : active ? 'bf-fill-run' : 'bf-fill-idle'
        }`}
      />
      {active && <span className="bf-pay-x" />}
    </div>
  );
}

export default function BlackFridayPayflow({ placement = 'section' }: { placement?: 'section' | 'hero' }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    let stopped = false;

    const visible = () => (placement === 'hero' ? desktopQuery.matches : !desktopQuery.matches);

    const tickFrom = (current: number) => {
      const delay = placement === 'hero' ? (current === 3 ? 2200 : 1100) : current === 3 ? 2600 : 1400;
      timer = window.setTimeout(() => {
        if (stopped) return;
        const next = current >= 3 ? 1 : current + 1;
        setStep(next);
        tickFrom(next);
      }, delay);
    };

    const sync = () => {
      window.clearTimeout(timer);
      if (!visible()) return;
      if (reduceQuery.matches) {
        setStep(3);
        return;
      }
      setStep(1);
      tickFrom(1);
    };

    sync();
    desktopQuery.addEventListener('change', sync);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      desktopQuery.removeEventListener('change', sync);
    };
  }, [placement]);

  const receipt = receiptFor(step);

  const card = (
    <div
      className={`rounded-[28px] border border-[#0FF1CE]/35 bg-[#071016] shadow-[0_0_50px_rgba(15,241,206,0.07)] ${
        placement === 'hero' ? 'p-4 lg:p-5' : 'p-3'
      }`}
      role="img"
      aria-label="Payout flow: trade closes, payout requested, USDC received"
    >
      <div aria-hidden="true">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Funded Account</p>
          <p className={placement === 'hero' ? 'text-lg font-bold tracking-tight text-white md:text-xl' : 'text-base font-bold tracking-tight text-white'}>$100K</p>
        </div>

        {placement === 'hero' ? (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_1.75rem_minmax(0,1fr)_1.75rem_minmax(0,1fr)] items-start">
            {NODES.map((node, index) => {
              const on = step >= index + 1;
              return (
                <Fragment key={node.title}>
                  <div className={`flex min-w-0 flex-col items-center text-center transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-45'}`}>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors duration-500 ${
                        on
                          ? 'border-[#0FF1CE]/40 bg-[#0FF1CE]/10 text-[#0FF1CE] shadow-[0_0_18px_rgba(15,241,206,0.16)]'
                          : 'border-white/10 bg-white/[0.03] text-white/45'
                      }`}
                    >
                      {node.icon}
                    </div>
                    <p className="mt-2 text-[11px] font-semibold leading-tight text-white">{node.title}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-white/55">{node.sub}</p>
                  </div>
                  {index < NODES.length - 1 && <DesktopConnector active={step === index + 1} complete={step > index + 1} />}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex flex-col">
            {NODES.map((node, index) => {
              const on = step >= index + 1;
              const isLast = index === NODES.length - 1;
              return (
                <div key={node.title} className="contents">
                  <div className={`flex w-full items-center gap-2.5 transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-40'}`}>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500 ${
                        on
                          ? 'border-[#0FF1CE]/40 bg-[#0FF1CE]/10 text-[#0FF1CE] shadow-[0_0_18px_rgba(15,241,206,0.16)]'
                          : 'border-white/10 bg-white/[0.03] text-white/45'
                      }`}
                    >
                      {node.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight text-white">{node.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/55">{node.sub}</p>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="relative ml-5 h-6 w-px shrink-0 bg-white/10">
                      <span
                        className={`absolute inset-0 origin-top bg-[#0FF1CE] transition-transform duration-700 ease-out ${
                          step > index + 1 ? 'scale-y-100' : 'scale-y-0'
                        }`}
                      />
                      {step === index + 1 && <span className="bf-pay-y" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 ${
          placement === 'hero' ? 'mt-5 px-4 py-3.5 md:mt-6' : 'mt-3 px-3 py-2.5'
        }`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#0FF1CE] shadow-[0_0_8px_#0FF1CE]" />
                <p className={`truncate font-semibold text-white ${placement === 'hero' ? 'text-sm' : 'text-xs'}`}>{receipt.status}</p>
              </div>
              <p className={`text-white/50 ${placement === 'hero' ? 'mt-1 text-xs' : 'mt-0.5 text-[11px]'}`}>{receipt.when}</p>
            </div>
            <p className={`shrink-0 font-bold tabular-nums ${placement === 'hero' ? 'text-xl md:text-2xl' : 'text-lg'} ${receipt.paid ? 'text-[#0FF1CE]' : 'text-white/35'}`}>
              {receipt.amount}
            </p>
          </div>
        </div>
      </div>
  );

  return (
    <div className={placement === 'hero' ? 'hidden w-full md:block' : 'px-6 pt-2 md:hidden'}>
      {placement === 'hero' ? card : <div className="mb-[-8%] origin-top scale-[0.85]">{card}</div>}
      <style>{`
        @keyframes bf-pay-x {
          0% { left: 0; opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { left: calc(100% - 8px); opacity: 0; }
        }
        @keyframes bf-pay-y {
          0% { top: 0; opacity: 0; }
          18% { opacity: 1; }
          82% { opacity: 1; }
          100% { top: calc(100% - 8px); opacity: 0; }
        }
        @keyframes bf-fill-x {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .bf-pay-x,
        .bf-pay-y {
          position: absolute;
          z-index: 1;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #0FF1CE;
          box-shadow: 0 0 10px #0FF1CE;
        }
        .bf-pay-x {
          top: 50%;
          margin-top: -4px;
          animation: bf-pay-x 1s linear;
        }
        .bf-pay-y {
          left: 50%;
          margin-left: -4px;
          animation: bf-pay-y 1.05s ease-in-out;
        }
        .bf-fill-idle {
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.35s ease;
        }
        .bf-fill-done {
          transform: scaleX(1);
          transform-origin: left center;
        }
        .bf-fill-run {
          transform-origin: left center;
          animation: bf-fill-x 1s linear forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .bf-pay-x,
          .bf-pay-y,
          .bf-fill-run { animation: none; }
          .bf-pay-x,
          .bf-pay-y { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
