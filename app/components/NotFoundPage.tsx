'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';

const HERO_CYAN = '#00F0F2';

const HERO_NAV = [
  { name: 'Home', href: '/' },
  { name: 'How Shockwave Operates', href: '/How-Shockwave-Operates' },
  { name: 'Shockwave Pulse', href: '/Shockwave-Pulse' },
];

function HeroMark() {
  return (
    <Link href="/" aria-label="Shockwave" className="block h-9 w-[7.75rem] shrink-0 md:h-11 md:w-[9.1rem]" />
  );
}

function HeroHeader({ isScrolled }: { isScrolled: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <Image
        src="/Neon Shockwave Logo Lockup.png"
        alt=""
        width={1672}
        height={941}
        priority
        className="pointer-events-none fixed left-[3px] top-[-10px] z-[60] h-[88px] w-[156px] mix-blend-screen md:left-[36px] md:top-[-15px] md:h-[102px] md:w-[182px] lg:left-[calc(11vw-20px)] xl:left-[calc(18vw-20px)]"
      />
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          isScrolled || isMenuOpen ? 'border-b border-white/10 bg-[#05080e]/80 backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="flex h-[68px] items-center justify-between px-5 md:h-[72px] md:px-14 lg:pl-[11vw] lg:pr-10 xl:pl-[18vw] xl:pr-12">
          <HeroMark />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 lg:flex xl:gap-8">
            {HERO_NAV.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-[13px] font-normal text-white/85 transition-colors hover:text-white xl:text-[14px]"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/access" className="text-[14px] font-medium text-white/90 transition-colors hover:text-white">
              Log in
            </Link>
            <Link
              href="/challenge"
              className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-[#062028] transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: HERO_CYAN }}
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-white lg:hidden"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X size={22} strokeWidth={1.75} />
            ) : (
              <span className="flex w-[22px] flex-col gap-[5px]" aria-hidden="true">
                <span className="h-[1.5px] w-full bg-white" />
                <span className="h-[1.5px] w-full bg-white" />
                <span className="h-[1.5px] w-full bg-white" />
              </span>
            )}
          </button>
        </div>

        <div className={`lg:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-white/10 bg-[#05080e]/95 px-5 pb-5 pt-2`}>
          <nav className="flex flex-col">
            {HERO_NAV.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="border-b border-white/10 py-3.5 text-[15px] text-white/90"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-3">
            <Link href="/access" className="px-2 text-sm font-medium text-white" onClick={() => setIsMenuOpen(false)}>
              Log in
            </Link>
            <Link
              href="/challenge"
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-[#062028]"
              style={{ backgroundColor: HERO_CYAN }}
              onClick={() => setIsMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

function UnderlineLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex flex-col items-start font-medium text-white ${className}`}>
      <span className="inline-flex items-center gap-2">
        {children}
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
      <span className="mt-2 h-[2px] w-full lg:h-[2.5px]" style={{ backgroundColor: HERO_CYAN }} />
    </Link>
  );
}

export default function NotFoundPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-black font-sans text-white">
      <HeroHeader isScrolled={isScrolled} />
      <div
        className="h-full overflow-x-hidden overflow-y-auto"
        onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 12)}
      >
      <section className="relative min-h-[100svh] overflow-x-hidden bg-black">
        <Image
          src="/herotestmobile.png"
          alt=""
          fill
          priority
          className="object-cover object-[54%_46%] opacity-[0.88] md:hidden"
          sizes="100vw"
        />
        <Image
          src="/herotest.png"
          alt=""
          fill
          priority
          className="hidden object-cover object-[center_center] opacity-80 md:block"
          sizes="100vw"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/20 md:bg-none md:bg-black/25" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-black/35 to-black md:h-64" />

        <div className="relative z-10 flex min-h-[100svh] flex-col px-6 pb-16 pt-[6.75rem] sm:px-8 md:px-14 md:pb-28 md:pt-[21vh] lg:pl-[11vw] lg:pr-[6vw] xl:pl-[18vw] xl:pt-[16vh]">
          <div className="md:max-w-[640px] lg:max-w-[800px]">
            <div className="mb-4 h-[3px] w-8 md:mb-5 md:w-9 lg:mb-[1.5625rem] lg:h-[3.75px] lg:w-[2.8125rem]" style={{ backgroundColor: HERO_CYAN }} />
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/75 sm:text-[11px] sm:tracking-[0.18em] md:text-[12px] lg:text-[15px]">
              Error 404
            </p>

            <h1 className="mt-4 text-[clamp(2.15rem,8.7vw,3.15rem)] font-bold leading-[0.98] tracking-[-0.035em] text-white md:mt-5 md:text-[clamp(3.15rem,5.05vw,4.85rem)] md:leading-[0.96] lg:mt-[1.5625rem] lg:text-[clamp(3.9375rem,6.3125vw,6.0625rem)]">
              This page
              <br />
              <span style={{ color: HERO_CYAN }}>isn&apos;t here.</span>
            </h1>

            <p className="mt-4 max-w-[17.5rem] text-[15px] leading-[1.5] text-white/80 sm:max-w-[22rem] md:mt-6 md:text-[16px] lg:mt-[1.875rem] lg:max-w-[27.5rem] lg:text-[20px] lg:leading-[1.55]">
              The link may be broken, or the page may have moved. Head home, or start a challenge.
            </p>

            <div className="mt-6 flex w-[70%] max-w-[17rem] flex-col items-stretch gap-4 md:mt-9 md:w-auto md:max-w-none md:flex-row md:items-center md:gap-6 lg:mt-[2.8125rem] lg:gap-[1.875rem]">
              <Link
                href="/"
                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg text-[15px] font-semibold text-[#062028] transition-transform hover:scale-[1.02] md:h-9 md:w-auto md:px-4 md:text-[14px] lg:h-[2.8125rem] lg:rounded-xl lg:px-5 lg:text-[17.5px]"
                style={{ backgroundColor: HERO_CYAN }}
              >
                Back home
                <span aria-hidden="true" className="text-[16px] leading-none lg:text-[20px]">→</span>
              </Link>
              <UnderlineLink href="/challenge" className="self-start text-[15px] md:text-[14px] lg:text-[17.5px]">
                Get Started
              </UnderlineLink>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
