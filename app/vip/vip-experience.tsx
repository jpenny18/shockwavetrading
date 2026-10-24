'use client';

import React, { Suspense } from 'react';
import Particles from '../components/Particles';
import Header from '../components/Header';
import { ChevronDown, Crown, Headphones, TrendingUp, Copy } from 'lucide-react';
import VipCheckout from './components/VipCheckout';

const VIP_RULES = [
  '15% Max Drawdown',
  '8% Daily Drawdown',
  'Up to 1:100 Leverage',
  'No Consistency Rule',
  'No Extra Strategy Restrictions',
  'News Trading Allowed',
  'Overnight & Weekend Holding',
  'EAs & VPS Allowed',
  'Corporate Registration Available',
  'Consolidated Account Structure'
];

function VipContent({ publishableKey }: { publishableKey: string }) {
  return (
    <div className="bg-black text-white min-h-screen font-sans">
      <Header />
      
      {/* Hero Section */}
      <section className="relative px-4 md:px-6 pt-24 md:pt-40 pb-10 md:pb-32 text-center overflow-hidden bg-black">
        <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
        <Particles />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-3 md:mb-4">
            <Crown size={14} />
            VIP FUNDED ALLOCATIONS
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-transparent bg-clip-text mb-3 md:mb-6">
            Trade Bigger. Keep It Simple.
          </h1>
          <p className="text-sm md:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-2 md:mb-4">
            Serious capital for experienced traders who have outgrown traditional prop firm account sizes.
          </p>
          <p className="text-sm md:text-base text-gray-400 max-w-3xl mx-auto leading-relaxed mb-6 md:mb-8">
            Up to <span className="text-[#0FF1CE] font-semibold">$3,000,000</span> in funded allocation. Straightforward drawdown rules. No consistency requirements. No unnecessary restrictions.
          </p>

          {/* Floating Stats Cards */}
          <div className="grid grid-cols-3 gap-2 md:flex md:flex-row md:justify-center md:items-center md:gap-8 px-1 md:px-0 mb-6 md:mb-8">
            {[
              { value: "15%", label: "Max Drawdown", delay: "0s" },
              { value: "8%", label: "Daily Drawdown", delay: "0.1s" },
              { value: "$3M", label: "Max Allocation", delay: "0.2s" }
            ].map(({ value, label, delay }) => (
              <div
                key={label}
                className="group relative w-full bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-3 md:p-4 md:w-44 hover:scale-105 transition-all duration-300 animate-float"
                style={{
                  animation: `float 3s ease-in-out infinite`,
                  animationDelay: delay,
                  boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)'
                }}
              >
                <div className="text-xl md:text-3xl font-bold text-[#0FF1CE] mb-1">{value}</div>
                <div className="text-xs md:text-sm text-gray-400">{label}</div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>

          {/* Simple Rules Card */}
          <div className="max-w-2xl mx-auto mb-6 md:mb-8">
            <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 md:p-8 border border-[#0FF1CE]/20"
              style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
              <h3 className="text-lg md:text-2xl font-bold text-[#0FF1CE] mb-4 md:mb-6 text-center">Simple Rules. Serious Capital.</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-4 text-left">
                {VIP_RULES.map((rule, index) => (
                  <div key={index} className="flex items-center space-x-2 md:space-x-3 group">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <span className="text-[#0FF1CE] text-xs md:text-sm">✓</span>
                    </div>
                    <span className="text-gray-300 text-xs md:text-base group-hover:text-white transition-colors">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile CTA - scrolls to allocation selector */}
          <button
            onClick={() => document.getElementById('account-selector')?.scrollIntoView({ behavior: 'smooth' })}
            className="md:hidden w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black text-sm font-bold rounded-xl active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(15,241,206,0.3)]"
          >
            <span>Choose Your Allocation</span>
            <ChevronDown size={18} />
          </button>
        </div>
      </section>

      {/* VIP Infrastructure Section */}
      <section className="py-12 md:py-20 px-6 bg-black relative overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0FF1CE] mb-8 md:mb-12">
            VIP-Level Support & Infrastructure
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 border border-[#0FF1CE]/20"
              style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
              <div className="w-12 h-12 bg-[#0FF1CE]/20 rounded-xl flex items-center justify-center mb-4">
                <Crown size={24} className="text-[#0FF1CE]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">VIP Dashboard</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Every Professional, Executive and Institutional trader receives access to the new Shockwave Capital VIP Dashboard — a dedicated environment built specifically for larger funded allocations.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 border border-[#0FF1CE]/20"
              style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
              <div className="w-12 h-12 bg-[#0FF1CE]/20 rounded-xl flex items-center justify-center mb-4">
                <Headphones size={24} className="text-[#0FF1CE]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Dedicated Account Manager</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your own dedicated trading support account manager, available 24/7 for account, platform and payout support with near-instant response times. No generic support queues. No waiting days for answers.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 border border-[#0FF1CE]/20"
              style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
              <div className="w-12 h-12 bg-[#0FF1CE]/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp size={24} className="text-[#0FF1CE]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Get Paid for Performance</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                80% starting profit split. Monthly payouts available through bank transfer / Wise or cryptocurrency. Larger corporate and institutional allocations receive priority payout support, dedicated onboarding and direct account management.
              </p>
            </div>
          </div>

          {/* Live Copy Trading Callout */}
          <div className="bg-gradient-to-r from-[#0FF1CE]/20 via-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-[#0FF1CE]/40 relative overflow-hidden mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0FF1CE]/5 to-transparent rounded-xl"></div>
            <div className="relative z-10 flex items-start md:items-center gap-3 md:gap-4">
              <div className="w-10 h-10 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center shrink-0">
                <Copy size={20} className="text-[#0FF1CE]" />
              </div>
              <div className="text-left">
                <div className="text-[#0FF1CE] font-bold text-sm md:text-base mb-1">
                  Live Copy Trading to Corporate Accounts
                </div>
                <div className="text-gray-300 text-xs md:text-sm">
                  All trades are live copy traded to our corporate accounts — your performance moves real capital.
                </div>
              </div>
            </div>
          </div>

          {/* Stop Managing Ten Small Accounts */}
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Stop Managing Ten Small Accounts.</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              {[
                "One larger allocation",
                "More usable drawdown",
                "Fewer restrictions",
                "Dedicated VIP infrastructure"
              ].map((item, index) => (
                <div key={index} className="text-center bg-[#0FF1CE]/5 rounded-lg p-3 border border-[#0FF1CE]/20">
                  <div className="text-gray-300 text-xs md:text-sm">{item}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-sm md:text-base mb-6">
              A structure built for experienced traders. Ready to trade serious capital?
            </p>
            <button
              onClick={() => document.getElementById('account-selector')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black text-base md:text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(15,241,206,0.3)]"
            >
              Choose Your Allocation & Get Started
            </button>
          </div>
        </div>
      </section>

      <VipCheckout publishableKey={publishableKey} />

      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

    </div>
  );
}


export default function VipExperience({ publishableKey }: { publishableKey: string }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="w-8 h-8 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <VipContent publishableKey={publishableKey} />
    </Suspense>
  );
}
