'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Percent,
  Users,
  DollarSign,
  Clock,
  Globe,
  Target,
  TrendingDown,
  ChevronsDown,
  CalendarDays,
  Ban,
  Plus,
  Minus,
  Play,
  BadgeCheck,
  LayoutDashboard,
  Activity,
  MessagesSquare,
  Headphones,
  MonitorSmartphone
} from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wistia-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'media-id': string;
        aspect?: string;
      };
    }
  }
}

/* ---------------------------------- Data ---------------------------------- */

const CHALLENGE_RULES = [
  { label: 'Profit Target', value: '10%', icon: Target },
  { label: 'Max Daily Loss', value: '5%', icon: TrendingDown },
  { label: 'Max Loss', value: '15%', icon: ChevronsDown },
  { label: 'Trading Period', value: 'Unlimited', icon: CalendarDays },
  { label: 'Consistency Rule', value: 'None', icon: Ban },
  { label: 'Rewards', value: '90% ON-DEMAND', icon: DollarSign, highlight: true }
];

const ACCOUNTS = [
  { size: 200000, label: '$200,000', price: 1199 },
  { size: 100000, label: '$100,000', price: 499, originalPrice: 624, bestValue: true },
  { size: 50000, label: '$50,000', price: 399 },
  { size: 25000, label: '$25,000', price: 289 },
  { size: 10000, label: '$10,000', price: 99 }
];

const TRUST_STATS = [
  { icon: Users, value: '1,000+', label: 'Funded traders worldwide' },
  { icon: DollarSign, value: '$2M+', label: 'Paid in rewards worldwide' },
  { icon: Clock, value: '1 Hour', label: 'Avg. payout processing' },
  { icon: Globe, value: '90%', label: 'Performance rewards', desktopOnly: true }
];

const ACCESS_PERKS = [
  { icon: LayoutDashboard, label: 'Trader Dashboard' },
  { icon: Activity, label: 'Shockwave Pulse' },
  { icon: MessagesSquare, label: 'Discord Community' },
  { icon: Headphones, label: '24/7 Support' },
  { icon: MonitorSmartphone, label: 'MT4 & MT5 Platforms' },
  { icon: Clock, label: 'On-Demand Payouts' }
];

const INTERVIEWS = [
  {
    type: 'video' as const,
    src: 'https://www.youtube.com/embed/C2_8YzvnamQ?si=nQlC1MMt-h7OYIDB',
    title: 'Trader Payout Interview 1',
    flag: '🇬🇧',
    name: 'Andrew S',
    country: 'United Kingdom',
    payout: '$2,100',
    account: '$50,000'
  },
  {
    type: 'image' as const,
    src: '/certificates/mobile-certificate-1.png',
    title: 'Payout Certificate — James',
    flag: '🇦🇺',
    name: 'James',
    country: 'Australia',
    payout: '$4,442',
    account: '$100,000'
  },
  {
    type: 'video' as const,
    src: 'https://www.youtube.com/embed/CZrKX44a5JY?si=6Ztd5N5wZHO4ch4f',
    title: 'Trader Payout Interview 2',
    flag: '🇷🇸',
    name: 'Nikola',
    country: 'Serbia',
    payout: '$1,815',
    account: '$100,000'
  },
  {
    type: 'image' as const,
    src: '/certificates/mobile-certificate-2.png',
    title: 'Payout Certificate — Marcus',
    flag: '🇨🇦',
    name: 'Marcus',
    country: 'Canada',
    payout: '$8,935',
    account: '$200,000'
  }
];

const FAQ_ITEMS = [
  {
    question: 'What is the Shockwave 1-Step Challenge and how does it differ from the Standard Challenge?',
    answer: (
      <>
        The Shockwave 1-Step Challenge is a one-phase evaluation with no Verification stage. Meet a 10% profit target while staying within a 5% daily and 15% max loss, and you move directly to your funded account.
      </>
    )
  },
  {
    question: 'Can I trade news during the 1-Step Challenge?',
    answer: (
      <>
        Yes, all strategies including news trading are allowed as long as you follow the risk management rules.
      </>
    )
  },
  {
    question: 'What is the minimum time required to pass the 1-Step Challenge?',
    answer: (
      <>
        There is no minimum time. The trading period is unlimited—take as long as you need within the rules.
      </>
    )
  },
  {
    question: 'Is there a consistency or best day rule?',
    answer: (
      <>
        No, there are no consistency or best day rules. Only drawdown limits apply.
      </>
    )
  },
  {
    question: 'What happens after I pass?',
    answer: (
      <>
        Once you complete the objectives, you get a funded account and can earn up to 90% of profits, with payouts on demand.
      </>
    )
  },
  {
    question: 'Do I need to complete KYC to purchase a challenge or request a withdrawal?',
    answer: (
      <>
        No, identity verification (KYC) is not required to buy a challenge or request a withdrawal.
      </>
    )
  }
];

const FINAL_STATS = [
  { value: '$2M+', label: 'Paid Rewards' },
  { value: '1,000+', label: 'Funded Traders' },
  { value: '1 Hr', label: 'Average Payout' },
  { value: '90%', label: 'Profit Splits' }
];

/* ------------------------------- UI Helpers ------------------------------- */

function DiscountHex({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims =
    size === 'lg'
      ? 'w-20 h-[88px] text-xl'
      : size === 'sm'
      ? 'w-10 h-11 text-[10px]'
      : 'w-14 h-16 text-sm';
  return (
    <div className={`pointer-events-none ${className}`} style={{ filter: 'drop-shadow(0 0 14px rgba(15,241,206,0.55))' }}>
      <div
        className={`${dims} flex items-center justify-center font-extrabold text-black`}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: 'linear-gradient(160deg, #B8FFF4 0%, #0FF1CE 40%, #0AA89E 75%, #067C6B 100%)',
          transform: 'rotate(-8deg)'
        }}
      >
        -20%
      </div>
    </div>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 44"
      className={`h-10 w-5 text-white/30 flex-shrink-0 ${flip ? '-scale-x-100' : ''}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="14" cy="38" rx="5.5" ry="2.4" transform="rotate(-35 14 38)" />
      <ellipse cx="10" cy="29" rx="5.5" ry="2.4" transform="rotate(-50 10 29)" />
      <ellipse cx="7.5" cy="19" rx="5.5" ry="2.4" transform="rotate(-68 7.5 19)" />
      <ellipse cx="7" cy="9" rx="5.5" ry="2.4" transform="rotate(-85 7 9)" />
      <ellipse cx="9" cy="2.5" rx="4" ry="2" transform="rotate(-100 9 2.5)" />
    </svg>
  );
}

function PromoHeader() {
  return (
    <header className="fixed w-full top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-[#2F2F2F]/60">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0FF1CE]/40 to-transparent pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-20 overflow-visible">
          <Link href="/promo" className="block group flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Shockwave Capital"
              width={160}
              height={160}
              className="h-40 w-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_12px_rgba(15,241,206,0.15)]"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

function PromoVsl() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-[#0FF1CE]/30 bg-[#0d1117]"
      style={{ boxShadow: '0 0 40px rgba(15, 241, 206, 0.18)' }}
    >
      <Script src="https://fast.wistia.com/player.js" strategy="afterInteractive" />
      <Script src="https://fast.wistia.com/embed/q8u5vp5j3r.js" strategy="afterInteractive" type="module" />
      <wistia-player media-id="q8u5vp5j3r" aspect="1.7777777777777777" />
    </div>
  );
}

function InterviewMedia({ item }: { item: (typeof INTERVIEWS)[number] }) {
  return (
    <div className="relative aspect-video bg-[#181818] overflow-hidden">
      {item.type === 'video' ? (
        <iframe
          src={item.src}
          title={item.title}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <Image src={item.src} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 256px, 25vw" />
      )}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        {item.type === 'video' ? (
          <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-md">
            <span className="flex items-center justify-center w-4 h-3 bg-red-600 rounded-[3px]">
              <Play size={7} fill="white" stroke="none" />
            </span>
            YouTube • Live Interview
          </span>
        ) : (
          <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-[#0FF1CE] text-[10px] font-semibold px-2 py-1 rounded-md">
            <BadgeCheck size={12} />
            Verified Payout
          </span>
        )}
      </div>
    </div>
  );
}

function InterviewCard({ item }: { item: (typeof INTERVIEWS)[number] }) {
  return (
    <div
      className="group bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden hover:border-[#0FF1CE]/40 hover:scale-[1.02] transition-all duration-300 h-full flex flex-col"
      style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.08)' }}
    >
      <InterviewMedia item={item} />
      <div className="p-4 flex-1">
        <div className="text-white font-bold text-sm">
          <span className="mr-1.5">{item.flag}</span>
          {item.name}
        </div>
        <div className="text-gray-400 text-xs mt-0.5">{item.country}</div>
      </div>
      <div className="grid grid-cols-2 border-t border-gray-800">
        <div className="p-3 border-r border-gray-800">
          <div className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider mb-0.5">Rewards Earned</div>
          <div className="text-[#0FF1CE] font-bold text-sm">{item.payout}</div>
        </div>
        <div className="p-3">
          <div className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider mb-0.5">Account Size</div>
          <div className="text-white font-bold text-sm">{item.account}</div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Page ----------------------------------- */

export default function PromoPage() {
  const router = useRouter();
  const [selectedMobileAccount, setSelectedMobileAccount] = useState(100000);
  const [openFaqs, setOpenFaqs] = useState<number[]>([0]);

  const handleStartNow = (accountSize: number) => {
    sessionStorage.setItem('preselectedChallengeType', '1-Step');
    sessionStorage.setItem('preselectedBalance', accountSize.toString());
    router.push('/promo/promochallenge');
  };

  const scrollToAccounts = () => {
    document.getElementById('accounts')?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const mobileAccount = ACCOUNTS.find((a) => a.size === selectedMobileAccount) ?? ACCOUNTS[1];

  return (
    <div className="bg-black text-white min-h-screen font-sans relative overflow-hidden">
      <PromoHeader />

      {/* ============================== HERO ============================== */}
      <section className="relative z-10 px-6 pt-36 md:pt-40 pb-14 md:pb-16 text-center overflow-hidden bg-black">
        {/* Spotlight glow */}
        <div
          className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(15,241,206,0.14), transparent 70%)' }}
        ></div>
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#0FF1CE]/[0.06] blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-[64px] lg:text-[72px] font-extrabold text-white leading-[0.95] tracking-tight mb-5 md:mb-6">
            GET FUNDED IN
            <br />
            <span
              className="bg-gradient-to-b from-[#D8FFF8] via-[#0FF1CE] to-[#0BB89F] text-transparent bg-clip-text"
              style={{ filter: 'drop-shadow(0 0 28px rgba(15,241,206,0.45))' }}
            >
              ONE TRADE.
            </span>
          </h1>
     

          <p className="text-[#0FF1CE] text-[11px] sm:text-xs md:text-sm font-bold uppercase mb-4">
            <span className="hidden sm:inline-block tracking-[0.18em] text-nowrap" style={{ lineHeight: "1", whiteSpace: "nowrap" }}>
              <span className="inline-block align-middle w-1.5 h-1.5 bg-[#0FF1CE] rounded-full mr-2"></span>
              15% Max Drawdown · 
              <span className="inline-block align-middle w-1.5 h-1.5 bg-[#0FF1CE] rounded-full mx-2"></span>
              1:200 Leverage · 
              <span className="inline-block align-middle w-1.5 h-1.5 bg-[#0FF1CE] rounded-full mx-2"></span>
              No Consistency Rule · 
              <span className="inline-block align-middle w-1.5 h-1.5 bg-[#0FF1CE] rounded-full mx-2"></span>
              No Minimum Trading Days
            </span>
       
       
            <span className="sm:hidden leading-relaxed tracking-wide">
              15% Max Drawdown · 1:200 Leverage
              <br />
              No Consistency Rule · No Minimum Trading Days
            </span>
          </p>

          <p className="text-gray-400 text-xs sm:text-sm md:text-lg mb-6 md:mb-10">
            Pass in a single trade. Get funded. Request payouts on demand.
          </p>
     

          <div className="relative max-w-3xl mx-auto mb-8 md:mb-10">
            <PromoVsl />
          </div>

          <button
            type="button"
            onClick={scrollToAccounts}
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#0FF1CE] text-black text-base md:text-lg font-bold rounded-lg hover:bg-[#0AA89E] hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(15,241,206,0.35)]"
          >
            BECOME FUNDED
            <ArrowRight size={20} />
          </button>

          <div className="mt-10 md:mt-12">
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">
              Trusted by Traders
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto">
              {TRUST_STATS.map(({ icon: Icon, value, label, desktopOnly }) => (
                <div key={label} className={`${desktopOnly ? 'hidden md:flex' : 'flex'} flex-col items-center`}>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0FF1CE]/10 text-[#0FF1CE] mb-3">
                    <Icon size={15} />
                  </span>
                  <div className="text-white text-xl md:text-2xl font-bold">{value}</div>
                  <div className="text-gray-400 text-[11px] md:text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 md:mt-12 max-w-3xl mx-auto">
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">
              Trading Platforms - CFD/FOREX
            </div>
            <div
              className="
                grid
                grid-cols-2
                gap-4
                sm:grid-cols-2
              "
              style={{
                // override Tailwind for mobile grid to be 2 columns, not stacked
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
              }}
            >
              {[
                { id: 'MT4', name: 'MetaTrader 4', src: '/mt4checkout.svg' },
                { id: 'MT5', name: 'MetaTrader 5', src: '/mt5checkout.svg' }
              ].map((platform) => (
                <div
                  key={platform.id}
                  className="rounded-2xl overflow-hidden border border-[#0FF1CE]/30 bg-[#0d1117]"
                  style={{ boxShadow: '0 0 24px rgba(15, 241, 206, 0.12)' }}
                >
                  <div className="relative w-full aspect-[16/7] flex items-center justify-center bg-gradient-to-b from-[#151515] to-[#0D0D0D] px-6">
                    <Image
                      src={platform.src}
                      alt={platform.name}
                      width={180}
                      height={50}
                      className="object-contain w-full max-w-[160px] h-auto"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
 
        </div>
      </section>

      {/* ========================== HERO (PRESERVED) ========================== */}
      <section className="hidden relative z-10 px-6 pt-28 md:pt-32 pb-14 md:pb-16 text-center overflow-hidden bg-black">
        {/* Spotlight glow */}
        <div
          className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(15,241,206,0.14), transparent 70%)' }}
        ></div>
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#0FF1CE]/[0.06] blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative max-w-4xl mx-auto">
          {/* Desktop hero */}
          <div className="hidden md:block">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 bg-[#0FF1CE]/10 border border-[#0FF1CE]/30 text-[#0FF1CE] text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
                <Percent size={12} />
                Special Deal
              </span>
            </div>

            {/* 20% OFF neon art */}
            <div className="mb-8 select-none">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#0FF1CE]/15 blur-[70px] rounded-full pointer-events-none"></div>
                <div
                  className="relative leading-[0.9] font-black tracking-tight bg-gradient-to-b from-[#D8FFF8] via-[#0FF1CE] to-[#0BB89F] text-transparent bg-clip-text animate-float"
                  style={{ filter: 'drop-shadow(0 0 28px rgba(15,241,206,0.45))' }}
                >
                  <span className="block text-[110px]">20%</span>
                  <span className="block text-[86px]">OFF</span>
                </div>
              </div>
            </div>

            <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] mb-3">
              $100K Shockwave Challenge: 1-Step
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-8">Claim Your Special Deal</h1>

            <button
              onClick={() => handleStartNow(100000)}
              className="inline-flex items-center gap-2 px-10 py-4 bg-[#0FF1CE] text-black text-lg font-bold rounded-lg hover:bg-[#0AA89E] hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(15,241,206,0.35)]"
            >
              Claim Discount
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Mobile hero */}
          <div className="md:hidden">
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-8">
              Take Your $100K
              <br />
              1-Step Today
            </h1>

            <div className="relative max-w-sm mx-auto">
              <DiscountHex className="absolute -top-5 -right-3 z-20 animate-float" />
              <div
                className="relative rounded-2xl border border-[#0FF1CE]/40 px-6 pt-8 pb-6"
                style={{
                  background: 'linear-gradient(180deg, rgba(15,241,206,0.10) 0%, rgba(13,17,23,0.95) 55%, #000000 100%)',
                  boxShadow: '0 0 40px rgba(15,241,206,0.18)'
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-black border border-[#0FF1CE]/50 text-[#0FF1CE] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                    <Percent size={10} />
                    Special Deal
                  </span>
                </div>

                <div className="text-gray-300 text-sm font-medium mb-2">1-Step Shockwave Challenge</div>
                <div
                  className="text-6xl font-black bg-gradient-to-b from-white via-gray-200 to-gray-500 text-transparent bg-clip-text mb-4 select-none"
                  style={{ filter: 'drop-shadow(0 4px 14px rgba(255,255,255,0.12))' }}
                >
                  $100,000
                </div>

                <div className="flex items-center justify-center gap-2 mb-5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-black">
                    <Percent size={11} />
                  </span>
                  <span className="text-white text-sm font-semibold">Special Deal</span>
                  <span className="text-[#0FF1CE] text-2xl font-extrabold">$399</span>
                  <span className="text-gray-500 line-through text-base">$499</span>
                </div>

                <button
                  onClick={() => handleStartNow(100000)}
                  className="w-full py-3.5 bg-[#0FF1CE] text-black text-base font-bold rounded-lg hover:bg-[#0AA89E] transition-all duration-300"
                >
                  Claim Offer
                </button>
              </div>
            </div>
          </div>

          {/* Shared: disclaimer + trust stats */}
          <p className="text-gray-500 text-[11px] md:text-xs leading-relaxed max-w-xl mx-auto mt-8 md:mt-10">
            Shockwave Capital offers a simulated trading environment and fictitious capital. The special deal for the
            1-Step $100,000 Shockwave Challenge is only available if you don&apos;t already have an active 1-Step
            $100,000 Shockwave Challenge.
          </p>

          <div className="mt-10 md:mt-12">
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">
              Trusted by Traders
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto">
              {TRUST_STATS.map(({ icon: Icon, value, label, desktopOnly }) => (
                <div key={label} className={`${desktopOnly ? 'hidden md:flex' : 'flex'} flex-col items-center`}>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0FF1CE]/10 text-[#0FF1CE] mb-3">
                    <Icon size={15} />
                  </span>
                  <div className="text-white text-xl md:text-2xl font-bold">{value}</div>
                  <div className="text-gray-400 text-[11px] md:text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================= PRICING ============================= */}
      <section id="accounts" className="relative z-10 py-16 md:py-20 px-4 md:px-6 overflow-hidden scroll-mt-24">
        {/* Spotlight beams */}
        <div
          className="absolute inset-x-0 top-0 h-[380px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(15,241,206,0.25), transparent 70%)' }}
        ></div>
        <div className="absolute top-16 left-6 w-72 h-72 bg-[#0FF1CE]/20 rounded-full blur-[90px] pointer-events-none"></div>
        <div className="absolute bottom-16 right-6 w-80 h-80 bg-[#0FF1CE]/[0.16] rounded-full blur-[100px] pointer-events-none"></div>
   

        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-center font-extrabold text-3xl md:text-5xl text-white mb-8 pb-2">
            Choose Your 1-Step
            <br className="md:hidden" /> Shockwave Challenge
          </h2>
     

          {/* Desktop comparison table */}
          <div className="hidden lg:flex justify-center items-start gap-2 pt-6">
            {/* Labels column */}
            <div className="w-44 flex-shrink-0 pt-[84px]">
              {CHALLENGE_RULES.map(({ label, icon: Icon }) => (
                <div key={label} className="h-11 flex items-center gap-2 px-2">
                  <Icon size={14} className="text-gray-500 flex-shrink-0" />
                  <span className="text-white text-xs font-medium border-b border-dotted border-gray-600 pb-0.5">
                    {label}
                  </span>
                </div>
              ))}
              <div className="h-[76px] flex items-center px-2">
                <span className="text-gray-400 text-xs leading-tight">
                  One-time fee
                  <br />
                  <span className="text-gray-600">(new accounts)</span>
                </span>
              </div>
            </div>

            {/* Account cards */}
            {ACCOUNTS.map((account) => (
              <div key={account.size} className={`relative w-[176px] flex-shrink-0 ${account.bestValue ? 'z-10' : ''}`}>
                {account.bestValue && (
                  <>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                      <span className="bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        Best value
                      </span>
                    </div>
                    <DiscountHex className="absolute -top-7 -right-6 z-20" />
                  </>
                )}
                <div
                  className={`rounded-2xl overflow-hidden ${
                    account.bestValue
                      ? 'border-2 border-[#0FF1CE]/60 bg-gradient-to-b from-[#0FF1CE]/[0.12] via-[#0d1117] to-[#0d1117]'
                      : 'border border-gray-800 bg-[#0d1117]'
                  }`}
                  style={account.bestValue ? { boxShadow: '0 0 40px rgba(15,241,206,0.18)' } : undefined}
                >
                  {/* Header */}
                  <div className="h-[84px] flex flex-col items-center justify-center">
                    <div className="text-gray-400 text-[10px] font-medium mb-1">Account</div>
                    <div className="text-white text-xl font-bold">{account.label}</div>
                  </div>

                  {/* Rule values */}
                  {CHALLENGE_RULES.map(({ label, value, highlight }) => (
                    <div key={label} className="h-11 flex items-center justify-center border-t border-gray-800/60">
                      {highlight ? (
                        <span className="bg-green-500/15 text-green-400 text-xs font-bold px-2 py-0.5 rounded">
                          {value}
                        </span>
                      ) : (
                        <span className="text-white text-sm">{value}</span>
                      )}
                    </div>
                  ))}

                  {/* Price */}
                  <div className="h-[76px] flex items-center justify-center gap-1.5 border-t border-gray-800/60 px-2">
                    {account.originalPrice ? (
                      <>
                        <DiscountHex size="sm" />
                        <span className="text-[#0FF1CE] text-xl font-extrabold">${account.price}</span>
                        <span className="text-gray-500 line-through text-sm">${account.originalPrice}</span>
                      </>
                    ) : (
                      <span className="text-white text-xl font-bold">${account.price}</span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-3 pb-4">
                    <button
                      onClick={() => handleStartNow(account.size)}
                      className={`w-full font-bold py-2.5 rounded-lg text-sm transition-all duration-300 hover:scale-[1.03] ${
                        account.bestValue
                          ? 'bg-[#0FF1CE] text-black hover:bg-[#0AA89E] shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                          : 'bg-[#0FF1CE]/10 text-[#0FF1CE] border border-[#0FF1CE]/40 hover:bg-[#0FF1CE] hover:text-black'
                      }`}
                    >
                      Start now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile pricing */}
          <div className="lg:hidden">
            {/* Account selector pills */}
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
              {[...ACCOUNTS].sort((a, b) => a.size - b.size).map((account) => {
                const isSelected = selectedMobileAccount === account.size;
                return (
                  <button
                    key={account.size}
                    onClick={() => setSelectedMobileAccount(account.size)}
                    className={`relative px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                      isSelected
                        ? 'bg-[#0FF1CE] text-black'
                        : 'bg-[#0d1117] text-white border border-gray-800'
                    }`}
                  >
                    {account.size / 1000}K
                    {account.bestValue && (
                      <span
                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-[#0FF1CE]'
                        }`}
                      ></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected account card */}
            <div className="max-w-sm mx-auto relative">
              {mobileAccount.bestValue && (
                <>
                  <div className="absolute -top-3 left-6 z-20">
                    <span className="bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black text-[10px] font-bold px-3 py-1 rounded-full">
                      Best value
                    </span>
                  </div>
                  <DiscountHex className="absolute -top-6 -right-2 z-20" />
                </>
              )}
              <div
                className={`rounded-2xl overflow-hidden ${
                  mobileAccount.bestValue
                    ? 'border-2 border-[#0FF1CE]/60 bg-gradient-to-b from-[#0FF1CE]/[0.12] via-[#0d1117] to-[#0d1117]'
                    : 'border border-gray-800 bg-[#0d1117]'
                }`}
                style={mobileAccount.bestValue ? { boxShadow: '0 0 40px rgba(15,241,206,0.18)' } : undefined}
              >
                <div className="p-5 pt-7 text-center">
                  <div className="text-gray-400 text-xs font-medium mb-1">Account</div>
                  <div className="text-white text-3xl font-bold mb-5">{mobileAccount.label}</div>

                  <button
                    onClick={() => handleStartNow(mobileAccount.size)}
                    className="w-full bg-[#0FF1CE] text-black font-bold py-3 rounded-lg hover:bg-[#0AA89E] transition-all duration-300 text-base mb-4"
                  >
                    Start now
                  </button>

                  <div className="text-gray-400 text-xs mb-1">One-time fee</div>
                  <div className="flex items-center justify-center gap-2">
                    {mobileAccount.originalPrice ? (
                      <>
                        <DiscountHex size="sm" />
                        <span className="text-[#0FF1CE] text-2xl font-extrabold">${mobileAccount.price}</span>
                        <span className="text-gray-500 line-through">${mobileAccount.originalPrice}</span>
                      </>
                    ) : (
                      <span className="text-white text-2xl font-bold">${mobileAccount.price}</span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-gray-800/60 border-t border-gray-800/60">
                  {CHALLENGE_RULES.map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-white text-sm border-b border-dotted border-gray-600 pb-0.5">{label}</span>
                      {highlight ? (
                        <span className="bg-green-500/15 text-green-400 text-xs font-bold px-2 py-0.5 rounded">
                          {value}
                        </span>
                      ) : (
                        <span className="text-white text-sm font-medium">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Access perks */}
          <div className="mt-12 md:mt-14">
            <p className="text-white font-semibold text-sm mb-4 text-center md:text-center">
              You will also get access to:
            </p>
            <div
              className="
                grid grid-cols-2 grid-rows-3 gap-2.5 justify-center 
                md:flex md:flex-wrap md:justify-center md:gap-3
                md:w-full md:mx-auto
                "
              style={{
                // On mobile scale down the whole perks block
                transform: 'scale(0.75)',
                transformOrigin: 'top center',
                width: '133.333%',    // 1/0.75 to preserve sizing visually
                marginLeft: '-16.666%', // center the scaled div
                marginRight: '-16.666%'
              }}
            >
              {ACCESS_PERKS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-2 bg-[#0d1117] border border-gray-800 rounded-lg px-4 py-2.5 text-xs md:text-sm text-gray-300 hover:border-[#0FF1CE]/40 transition-colors duration-300 w-full min-w-0 justify-center md:w-auto"
                  style={{ minHeight: '44px' }}
                >
                  <Icon size={15} className="text-[#0FF1CE]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
  
     
        </div>
      </section>

      {/* =========================== TESTIMONIALS =========================== */}
      <section className="relative z-10 py-16 md:py-20 px-6 bg-black overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-1/2 h-[300px] bg-[#0FF1CE]/[0.03] blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-10 md:mb-12">
            
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8">
              What Traders Say About <span className="text-[#0FF1CE]">Shockwave</span>
            </h2>
            

            <div className="flex items-center justify-center divide-x divide-gray-800">
              {[
                { value: '1,000+', label: 'Funded Traders' },
                { value: '$2M+', label: 'Paid Rewards' },
                { value: '1 hr', label: 'Average Payout' }
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="px-3 md:px-4 flex flex-col md:flex-row md:items-baseline md:gap-1"
                >
                  <span className="text-white text-base md:text-lg font-bold">{value}</span>
                  <span className="text-gray-400 text-[10px] md:text-xs">{label}</span>
                </div>
              ))}
            </div>

            <p className="text-gray-400 text-xs md:text-sm mb-3 mt-4 md:mt-6 pt-2">
              Real traders. Real payouts. <span className="text-[#0FF1CE] font-semibold">Live interviews.</span>
            </p>
       
       
          </div>

          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
            {INTERVIEWS.map((item) => (
              <InterviewCard key={item.name} item={item} />
            ))}
          </div>

          {/* Mobile infinite scroll */}
          <div className="md:hidden relative overflow-hidden -mx-6">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

            <div className="flex animate-infinite-scroll-mobile" style={{ width: 'max-content' }}>
              {[0, 1].map((setIndex) => (
                <div className="flex" key={setIndex}>
                  {INTERVIEWS.map((item) => (
                    <div key={`${setIndex}-${item.name}`} className="flex-shrink-0 mx-2 w-64">
                      <InterviewCard item={item} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================== FAQ =============================== */}
      <section className="relative z-10 py-16 md:py-24 px-6 bg-black">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-start">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              Frequently Asked
              <br className="hidden md:block" /> Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map(({ question, answer }, index) => {
              const isOpen = openFaqs.includes(index);
              return (
                <div
                  key={index}
                  className="bg-[#0d1117] border border-gray-800 rounded-xl hover:border-[#0FF1CE]/30 transition-colors duration-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-start gap-3 p-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 transition-colors duration-300 ${
                        isOpen ? 'border-[#0FF1CE] text-[#0FF1CE]' : 'border-gray-500 text-gray-400'
                      }`}
                    >
                      {isOpen ? <Minus size={13} /> : <Plus size={13} />}
                    </span>
                    <span className="text-white font-semibold text-sm md:text-base leading-snug">{question}</span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="px-5 pb-5 pl-14 text-gray-400 text-sm leading-relaxed">{answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================ FINAL CTA ============================ */}
      <section
        className="relative z-10 px-6 py-20 md:py-28 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #011611 28%, #04453B 68%, #06675D 100%)'
        }}
   
      >
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[#0FF1CE]/10 blur-[100px] pointer-events-none"></div>

        <div className="relative max-w-3xl mx-auto">
          <DiscountHex size="lg" className="mx-auto mb-8 animate-float w-fit" />

          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
            Take Your $100K
            <br />
            1-Step Today
          </h2>

          <p className="hidden md:block text-white/80 text-base md:text-lg max-w-xl mx-auto mb-8">
            Unleash your power with $100,000 in FUNDED capital. Master the 1-Step Shockwave Challenge and progress
            to financial rewards.
          </p>
          <p className="md:hidden text-white/80 text-base max-w-xs mx-auto mb-8">
            Engineered for traders who refuse limits. Are you the next to join us?
          </p>

          <button
            onClick={() => handleStartNow(100000)}
            className="px-10 py-4 bg-[#0FF1CE] text-black text-base md:text-lg font-bold rounded-lg border border-white/20 hover:bg-[#0AA89E] hover:scale-105 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          >
            Start Shockwave Challenge
          </button>

          <p className="text-white/80 text-sm mt-5">
            Or start smaller with a{' '}
            <button
              type="button"
              onClick={() => handleStartNow(10000)}
              className="text-white font-semibold underline underline-offset-2 hover:text-[#CFFFF7] transition-colors"
            >
              $10K account for $99
            </button>
          </p>

          <div className="mt-14 md:mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
            {FINAL_STATS.map(({ value, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Laurel />
                <div className="text-center">
                  <div className="text-white font-bold text-lg md:text-xl">{value}</div>
                  <div className="text-white/70 text-[11px] md:text-xs max-w-[130px]">{label}</div>
                </div>
                <Laurel flip />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ DISCLAIMER ============================ */}
      <footer className="relative z-10 bg-black px-6 py-10">
        <div className="max-w-4xl mx-auto text-[11px] leading-relaxed text-gray-500 space-y-3">
          <p>
            <strong>Disclaimer:</strong> Shockwave Capital provides access to simulated trading environments for
            educational and evaluation purposes only. No real funds are traded, invested, or deposited by participants
            at any stage. References to &quot;funded accounts,&quot; &quot;capital,&quot; &quot;payouts,&quot; or
            &quot;profit splits&quot; refer exclusively to simulated performance metrics within our proprietary
            trading models.
          </p>
          <p>
            Participation in our challenges does not constitute an offer or solicitation to invest or manage capital.
            Shockwave Capital is not a broker-dealer, investment advisor, or financial institution and does not
            provide financial, investment, or trading advice. Trading leveraged products like forex, indices, and
            commodities carries inherent risk. Past simulated performance is not indicative of future results.
          </p>
          <p className="text-gray-600">&copy; {new Date().getFullYear()} Shockwave Capital. All rights reserved.</p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes infinite-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-infinite-scroll-mobile {
          animation: infinite-scroll 30s linear infinite;
        }

        .animate-infinite-scroll-mobile:hover {
          animation-play-state: paused;
        }

        wistia-player[media-id='q8u5vp5j3r']:not(:defined) {
          background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/q8u5vp5j3r/swatch');
          display: block;
          filter: blur(5px);
          padding-top: 56.25%;
        }
      `}</style>
    </div>
  );
}
