'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Copy, X } from 'lucide-react';

const PROMO_CODE = 'BLACKFRIDAY';
const MODAL_SEEN_KEY = 'sw-blackfriday-modal-seen';
const BANNER_DISMISSED_KEY = 'sw-blackfriday-banner-dismissed';

function remember(key: string) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Private browsing can block storage. The promo still works for this view.
  }
}

function wasRemembered(key: string) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function BlackFridayModal() {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef<() => void>(() => {});

  dismissRef.current = () => {
    remember(MODAL_SEEN_KEY);
    setOpen(false);
  };

  useEffect(() => {
    if (wasRemembered(MODAL_SEEN_KEY)) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setOpen(true);
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    remember(MODAL_SEEN_KEY);
  }, [open]);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setRendered(false), 320);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!rendered) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [rendered]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close Black Friday offer"
        className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => dismissRef.current()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="black-friday-modal-title"
        className={`relative z-10 w-[min(92vw,420px)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.96] opacity-0'
        }`}
      >
        <h2 id="black-friday-modal-title" className="sr-only">
          Black Friday sale. 50% off plus one free retry. Use code BLACKFRIDAY.
        </h2>

        <div className="relative h-[min(78dvh,748px)] overflow-hidden rounded-[24px] border border-[#0FF1CE]/45 bg-[#05080e] shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_48px_rgba(15,241,206,0.18)]">
          <Link
            href="/challenge"
            onClick={() => dismissRef.current()}
            className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[#0FF1CE]"
          >
            <Image
              src="/blackfriday2.png"
              alt="Shockwave Capital Black Friday sale. 50% off plus one free retry. Use code BLACKFRIDAY. Claim offer."
              fill
              sizes="(max-width: 640px) 92vw, 420px"
              className="object-contain"
              priority
            />
          </Link>

          <button
            ref={closeRef}
            type="button"
            onClick={() => dismissRef.current()}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-md transition-colors hover:bg-[#0FF1CE] hover:text-black"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function BlackFridayBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (wasRemembered(BANNER_DISMISSED_KEY)) setDismissed(true);
  }, []);

  if (dismissed) return null;

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
    <aside
      className="relative overflow-hidden rounded-[22px] border border-[#0FF1CE]/35 bg-[#071016] shadow-[0_0_40px_rgba(15,241,206,0.08)]"
      aria-label="Black Friday sale"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#0FF1CE]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#0FF1CE]/15 blur-3xl" />

      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <div className="min-w-0 pr-8 sm:pr-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Black Friday sale</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            50% off <span className="text-[#0FF1CE]">+ 1 free retry</span>
          </p>
          <p className="mt-1 text-sm text-white/60">
            Live now on challenges, funded accounts, and VIP accounts.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-white/45">Code</span>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-full border border-[#0FF1CE]/40 bg-[#0FF1CE]/10 px-4 py-2 text-sm font-bold tracking-[0.16em] text-[#0FF1CE] transition-colors hover:bg-[#0FF1CE]/20"
            aria-label={copied ? 'Code copied' : 'Copy discount code BLACKFRIDAY'}
          >
            {PROMO_CODE}
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          remember(BANNER_DISMISSED_KEY);
          setDismissed(true);
        }}
        aria-label="Dismiss sale banner"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>

      <p className="sr-only" aria-live="polite">
        {copied ? 'Discount code copied' : ''}
      </p>
    </aside>
  );
}
