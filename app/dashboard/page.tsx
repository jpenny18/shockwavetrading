'use client';
import React from 'react';
import Particles from '../components/Particles';
import { useRouter } from 'next/navigation';

const PromotionalCard = ({ 
  title,
  description,
  features,
  image,
  buttonText
}: { 
  title: string;
  description: string;
  features: string[];
  image: string;
  buttonText: string;
}) => (
  <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 hover:scale-[1.02] border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300">
    <img src={image} alt={title} className="w-35 h-35 mb-4" />
    <p className="text-gray-400 mb-6">{description}</p>
    
    <div className="space-y-3 mb-6">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
            <span className="text-[#0FF1CE] text-sm">✓</span>
          </div>
          <span className="text-gray-300">{feature}</span>
        </div>
      ))}
    </div>

    <button className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 rounded-lg hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300">
      {buttonText}
    </button>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();

  const handleStartChallenge = (type: string) => {
    // Navigate to the challenge page with the type in session storage
    sessionStorage.setItem('preselectedChallengeType', type);
    router.push('/challenge');
  };

  return (
    <div className="relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-6">Dashboard</h1>

        {/* Promotional Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] mx-auto">
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl p-4 hover:scale-[1.02] border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <img src="/shockwavechallenge.png" alt="Shockwave Challenge" className="w-35 h-35 mb-2" />
            <p className="text-gray-400 text-sm mb-3">Push your trading to new heights in our ultra-competitive simulated trading environment.</p>
            
            <div className="space-y-2 mb-4">
              {[
                'Up to $500,000 in Simulated Capital',
                '15% Max Total Drawdown',
                '8% Max Daily Drawdown',
                '1:200 Leverage',
                'Simulated Profit Split up to 95%'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
                    <span className="text-[#0FF1CE] text-xs">✓</span>
                  </div>
                  <span className="text-gray-300 text-xs">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleStartChallenge('Standard')}
              className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold text-sm py-2 rounded-lg hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
            >
              Start Challenge
            </button>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl p-4 hover:scale-[1.02] border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <img src="/shockwaveinstant.png" alt="Shockwave Instant" className="w-35 h-35 mb-2" />
            <p className="text-gray-400 text-sm mb-3">Skip the wait and go straight into our high-intensity simulated trading model.</p>
            
            <div className="space-y-2 mb-4">
              {[
                'Immediate access to a simulated account',
                '1:200 Leverage',
                'Streamlined Drawdown Parameters',
                'Eligible for first simulated payout in as little as 6 days',
                'One free retry included'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center">
                    <span className="text-[#0FF1CE] text-xs">✓</span>
                  </div>
                  <span className="text-gray-300 text-xs">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleStartChallenge('Instant')}
              className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold text-sm py-2 rounded-lg hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
            >
              Get Instant Access
            </button>
          </div>
        </div>
        
        <div className="mt-8 max-w-3xl mx-auto">
          <p className="text-gray-400 text-xs text-center italic px-6 py-3 bg-gradient-to-br from-[#1A1A1A]/60 to-[#151515]/60 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/50">
            Note: All Shockwave trading programs operate in a simulated environment with real-time market data. Participation is for educational and performance benchmarking purposes. No real capital is deposited or withdrawn.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }
      `}</style>
    </div>
  );
} 