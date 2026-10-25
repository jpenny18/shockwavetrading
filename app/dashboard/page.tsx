'use client';
import React from 'react';
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
  <div className="bg-black rounded-2xl p-6 hover:scale-[1.02] border border-white/10 hover:border-[#0FF1CE]/50 transition-all duration-300">
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

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-2xl font-semibold text-white mb-6">Dashboard</h1>

        {/* Promotional Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] mx-auto">
          <div className="bg-black rounded-xl p-4 hover:scale-[1.02] border border-white/10 hover:border-[#0FF1CE]/50 transition-all duration-300">
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

          <div className="bg-black rounded-xl p-4 hover:scale-[1.02] border border-white/10 hover:border-[#0FF1CE]/50 transition-all duration-300">
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
          <p className="text-gray-400 text-xs text-center italic px-6 py-3 bg-black rounded-lg border border-white/10">
            Note: All Shockwave trading programs operate in a simulated environment with real-time market data. Participation is for educational and performance benchmarking purposes. No real capital is deposited or withdrawn.
          </p>
        </div>
      </div>


    </div>
  );
} 