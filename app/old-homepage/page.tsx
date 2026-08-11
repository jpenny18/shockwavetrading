'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import Image from 'next/image';
import Particles from '../components/Particles';
import Header from '../components/Header';
import Link from 'next/link';
import PricingTable from '../components/PricingTable';
import { ChevronRight, ChevronDown } from 'lucide-react';

// VIP Card Component with Accordion
const VipCard = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="max-w-6xl mx-auto mb-16">
      <div className="relative group bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-3xl p-8 border-2 border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 transition-all duration-300 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0FF1CE]/5 to-transparent rounded-3xl opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-[#0FF1CE]/10 blur-[60px] rounded-full"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header Section - Always Visible */}
          <div 
            className="cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Badge */}
                <div className="inline-block bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black px-4 py-2 rounded-full text-sm font-bold mb-4">
                  NEW: VIP PROGRAM
                </div>
                
                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#0FF1CE] mb-4">
                  Shockwave VIP
                </h2>
                
                {/* Description */}
                <p className="text-white text-base md:text-lg leading-relaxed">
                  Trade bigger. Keep it simple. Up to <span className="text-[#0FF1CE] font-semibold">$3,000,000</span> in funded allocation 
                  for experienced traders who have outgrown traditional prop firm account sizes.
                </p>
              </div>
              
              {/* Expand/Collapse Button */}
              <button 
                className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0FF1CE]/20 border border-[#0FF1CE]/40 flex items-center justify-center hover:bg-[#0FF1CE]/30 transition-all"
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
              >
                <ChevronDown 
                  size={24} 
                  className={`text-[#0FF1CE] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Expandable Details Section */}
          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? 'max-h-[2000px] opacity-100 mt-8' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-6">
              {/* Key Points Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="group bg-gradient-to-br from-[#0FF1CE]/15 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 bg-[#0FF1CE] rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-[#0FF1CE] font-bold text-sm">Up to $3M Allocation</div>
                      <div className="text-gray-300 text-xs">One larger account, not ten small ones</div>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-gradient-to-br from-[#0FF1CE]/15 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 bg-[#0FF1CE] rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-[#0FF1CE] font-bold text-sm">Simple Rules</div>
                      <div className="text-gray-300 text-xs">No consistency rules, no restrictions</div>
                    </div>
                  </div>
                </div>
                
                <div className="group bg-gradient-to-br from-[#0FF1CE]/15 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 bg-[#0FF1CE] rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-[#0FF1CE] font-bold text-sm">VIP Infrastructure</div>
                      <div className="text-gray-300 text-xs">Dedicated 24/7 account manager</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Allocations Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: "Professional", level: "$1M", price: "$5,499" },
                  { name: "Executive", level: "$2M", price: "$9,999" },
                  { name: "Institutional", level: "$3M", price: "$14,999" }
                ].map((item, index) => (
                  <div key={index} className="text-center bg-[#0FF1CE]/5 rounded-xl p-4 border border-[#0FF1CE]/20">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{item.name}</div>
                    <div className="text-[#0FF1CE] font-bold text-2xl">{item.level}</div>
                    <div className="text-white font-semibold text-sm mt-1">{item.price}</div>
                  </div>
                ))}
              </div>
              
              {/* Special Callout */}
              <div className="bg-gradient-to-r from-[#0FF1CE]/20 via-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0FF1CE]/5 to-transparent rounded-xl"></div>
                <div className="relative z-10 text-center">
                  <div className="text-[#0FF1CE] font-bold text-sm mb-1">
                    Live Copy Trading to Corporate Accounts
                  </div>
                  <div className="text-gray-300 text-xs">
                    All trades are live copy traded to our corporate accounts — your performance moves real capital.
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Max DD", value: "15%" },
                  { label: "Daily DD", value: "8%" },
                  { label: "Leverage", value: "1:100" },
                  { label: "Profit Split", value: "80%" }
                ].map((item, index) => (
                  <div key={index} className="text-center bg-[#0FF1CE]/5 rounded-lg p-3 border border-[#0FF1CE]/20">
                    <div className="text-[#0FF1CE] font-bold text-xl">{item.value}</div>
                    <div className="text-gray-300 text-sm">{item.label}</div>
                  </div>
                ))}
              </div>
              
              {/* CTA */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <Link href="/vip">
                  <button className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg hover:shadow-[#0FF1CE]/25 group">
                    <div className="flex items-center justify-center gap-2">
                      <span>Explore Shockwave VIP</span>
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </Link>
                <p className="text-center text-gray-400 text-sm">Monthly payouts via bank transfer, Wise or crypto — VIP dashboard included</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-[#0FF1CE]/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#0FF1CE]/10 rounded-full blur-xl"></div>
      </div>
    </div>
  );
};

// Disabled Promotional Modal Component - 40% OFF Deal
const PromotionalModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  // Modal is disabled - always return null
  return null;
};

// Shockwave Sunday Modal Component - 30% OFF Deal (DISABLED - keeping code for future use)
const ShockwaveSundayModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  // Modal is disabled - always return null
  return null;
  
  // Original modal code preserved below (not rendered)
  /*
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8 md:py-12">
        <div className="relative w-full max-w-md mx-auto">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-[#0FF1CE] text-black rounded-full flex items-center justify-center font-bold hover:scale-110 transition-transform shadow-lg"
          >
            ×
          </button>

          <div className="relative bg-gradient-to-br from-[#0D0D0D] via-[#121212] to-[#0D0D0D] border-2 border-[#0FF1CE] rounded-3xl p-6 overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/5 rounded-3xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#0FF1CE]/10 blur-[60px] rounded-full"></div>
            
            <div className="relative z-10 text-center">
              <div className="mb-6">
                <div className="relative w-full max-w-[280px] mx-auto">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#181818] border-2 border-[#0FF1CE]/30 shadow-[0_0_20px_rgba(15,241,206,0.2)]">
                    <Image
                      src="/shockwavegauntlet.png"
                      alt="Gauntlet Challenge - Pay After You Pass"
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 280px) 100vw, 280px"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-4 -mt-3">
                <span className="inline-block bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black font-bold px-4 py-2 rounded-full text-sm shadow-lg animate-pulse">
                  💪 PAY ONLY AFTER YOU PASS! 💪
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <h3 className="text-2xl font-bold text-white">
                  One-Step Gauntlet Challenge
                </h3>
                
                <div className="bg-[#0FF1CE]/10 border border-[#0FF1CE]/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#0FF1CE] rounded-full"></div>
                        <div>
                          <div className="text-xs text-gray-400">Profit Target</div>
                          <div className="text-white font-bold">10%</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#0FF1CE] rounded-full"></div>
                        <div>
                          <div className="text-xs text-gray-400">Max Drawdown</div>
                          <div className="text-white font-bold">15%</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#0FF1CE] rounded-full"></div>
                        <div>
                          <div className="text-xs text-gray-400">Daily DD</div>
                          <div className="text-white font-bold">8%</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#0FF1CE] rounded-full"></div>
                        <div>
                          <div className="text-xs text-gray-400">Leverage</div>
                          <div className="text-white font-bold">1:200</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 text-sm px-4">
                  Complete <span className="text-[#0FF1CE] font-bold">ONE SIMPLE STEP</span> to get funded. 
                  Only pay the activation fee <span className="text-[#0FF1CE] font-bold">AFTER</span> you pass!
                </p>
              </div>

              <div className="space-y-3">
                <Link href="/challenge" onClick={onClose}>
                  <button className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black font-bold py-3 px-6 rounded-xl hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(15,241,206,0.4)] hover:shadow-[0_0_30px_rgba(15,241,206,0.6)]">
                    START GAUNTLET CHALLENGE →
                  </button>
                </Link>
                <button
                  onClick={onClose}
                  className="w-full bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] font-bold py-2 px-6 rounded-xl hover:bg-[#0FF1CE]/10 transition-all duration-300"
                >
                  Learn More
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center space-x-3 text-xs text-gray-400">
                <span className="flex items-center">
                  <span className="text-[#0FF1CE] mr-1">✓</span> Cheapest way to get funded
                </span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center">
                  <span className="text-[#0FF1CE] mr-1">✓</span> Quickest way to get funded
                </span>
              </div>
            </div>

            <div className="absolute top-4 right-4 w-16 h-16 bg-[#0FF1CE]/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#00D9FF]/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
  */
};

// Promotional Modal - Introducing Shockwave VIP
const VipAnnouncementModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center p-4 pt-8 md:pt-12 pb-8 md:pb-12">
        <div className="relative w-full max-w-lg mx-auto" style={{ transform: 'scale(0.75)' }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold hover:scale-110 transition-transform shadow-lg text-2xl"
          >
            ×
          </button>

          {/* Modal Content */}
          <div className="relative bg-gradient-to-br from-[#0D0D0D] via-[#121212] to-[#0D0D0D] border-2 border-[#0FF1CE]/30 rounded-3xl overflow-hidden shadow-2xl p-8">
            {/* Promo Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black px-6 py-2 rounded-bl-2xl font-bold text-sm shadow-lg">
              NEW: VIP PROGRAM
            </div>

            {/* Content */}
            <div className="text-center pt-6">
              {/* Main Heading */}
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2">
                Shockwave VIP
              </h2>

              {/* Subheading */}
              <div className="bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-transparent bg-clip-text text-2xl md:text-3xl font-bold mb-8">
                $1,000,000+ Funded  Accounts
              </div>

              {/* Key Benefits */}
              <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
                <div className="flex items-start gap-3 bg-[#1A1A1A]/50 p-4 rounded-lg border border-[#0FF1CE]/20">
                  <div className="text-[#0FF1CE] text-2xl mt-1 font-bold">•</div>
                  <div>
                    <div className="text-white font-bold text-lg">Simple Rules, Big Capital</div>
                    <div className="text-gray-400 text-sm">15% drawdown, no consistency or extra rules</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#1A1A1A]/50 p-4 rounded-lg border border-[#0FF1CE]/20">
                  <div className="text-[#0FF1CE] text-2xl mt-1 font-bold">•</div>
                  <div>
                    <div className="text-white font-bold text-lg">VIP Support</div>
                    <div className="text-gray-400 text-sm">24/7 account manager & VIP dashboard</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#1A1A1A]/50 p-4 rounded-lg border border-[#0FF1CE]/20">
                  <div className="text-[#0FF1CE] text-2xl mt-1 font-bold">•</div>
                  <div>
                    <div className="text-white font-bold text-lg">80% Profit Split</div>
                    <div className="text-gray-400 text-sm">$1M, $2M & $3M allocations</div>
                  </div>
                </div>
           
              </div>

              {/* CTA Button */}
              <Link href="/vip" onClick={onClose}>
                <button className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black font-bold py-4 px-8 rounded-xl hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(15,241,206,0.4)] hover:shadow-[0_0_30px_rgba(15,241,206,0.6)] text-lg">
                  EXPLORE VIP ALLOCATIONS →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ShockwaveLandingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [showVipModal, setShowVipModal] = useState(false); // VIP announcement modal enabled
    
    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user && !loading) {
          router.push('/access');
        }
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, [router, loading]);

    // Show VIP announcement modal after page loads
    useEffect(() => {
      if (!loading) {
        const timer = setTimeout(() => {
          setShowVipModal(true);
        }, 1500); // Show modal 1.5 seconds after page loads
  
        return () => clearTimeout(timer);
      }
    }, [loading]);
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
          <div className="w-8 h-8 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    return (
      <div className="bg-black text-white min-h-screen font-sans">
        <Header />
        
        {/* VIP Announcement Modal */}
        <VipAnnouncementModal 
          isOpen={showVipModal} 
          onClose={() => setShowVipModal(false)}
        />
        
        {/* Hero Section */}
        <section className="relative z-10 px-6 pt-24 md:pt-28 pb-12 md:pb-10 text-center overflow-hidden bg-black">
          <Particles />
          <div className="max-w-5xl mx-auto">
          
            {/* Main Hero Image */}
            <div className="relative mb-6 md:mb-4">
              <div className="relative w-full max-w-3xl mx-auto aspect-[16/9]">
                <Image
                  src="/shockwavehero.png"
                  alt="Shockwave Capital - Funded or Fried"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-transparent bg-clip-text mb-3 md:mb-2">
              Funded or Fried
            </h1>
            
            {/* Badge */}
            <div className="inline-block bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black font-bold px-5 py-2 rounded-full text-sm md:text-base mb-6 md:mb-5">
              Prop trading without the training wheels
            </div>

            <p className="text-gray-400 max-w-3xl mx-auto text-sm md:text-base mb-8">
              High-octane funding for elite traders. Push your trading into Overdrive with industry-leading conditions.
            </p>

            {/* Floating Stats Cards */}
            <div className="grid grid-cols-3 gap-2 md:flex md:flex-row md:justify-center md:items-center md:gap-8 px-2 md:px-0 mb-8">
              {[
                { value: "15%", label: "Max Drawdown", delay: "0s" },
                { value: "8%", label: "Daily Drawdown", delay: "0.1s" },
                { value: "1:200", label: "Leverage", delay: "0.2s" }
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

            {/* NO BS Rules Card */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#0FF1CE]/20"
                style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                <h3 className="text-xl md:text-2xl font-bold text-[#0FF1CE] mb-6 text-center">NO BS Funded Account RULES</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "No consistency rules",
                    "News trading allowed",
                    "Hold over weekends",
                    "EAs & Bots allowed",
                    "No Profit Caps",
                    "No Position size caps"
                  ].map((rule, index) => (
                    <div key={index} className="flex items-center space-x-3 group">
                      <div className="w-6 h-6 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                        <span className="text-[#0FF1CE] text-sm">✓</span>
                      </div>
                      <span className="text-gray-300 text-sm md:text-base group-hover:text-white transition-colors">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-6 max-w-sm md:max-w-[600px] mx-auto w-full mb-12">
              <Link href="/challenge">
                <button className="px-10 py-3 md:py-4 bg-[#0FF1CE] text-black text-sm md:text-lg font-bold rounded-lg hover:scale-105 transition-transform w-full md:w-[300px]">
                  START CHALLENGE
                </button>             
              </Link>
            </div>

            {/* Tradable Assets */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 max-w-4xl mx-auto">
                {[
                  {
                    name: "Forex",
                    icon: (
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm16.5-4.5h-2.79l-2.33 7h-2.76l-2.33-7H5.5v-2h13v2z"/>
                      </svg>
                    )
                  },
                  {
                    name: "Metals",
                    icon: (
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L4 8v3h16V8l-8-6zM4 19v-6h16v6H4z"/>
                      </svg>
                    )
                  },
                  {
                    name: "Indices",
                    icon: (
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.5 18.5l6-6 4 4L22 7.5L20.5 6l-7 7-4-4-6 6z"/>
                      </svg>
                    )
                  },
                  {
                    name: "Crypto",
                    icon: (
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                      </svg>
                    )
                  },
                  {
                    name: "Stocks",
                    icon: (
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 3h6v4H3V3zm12 0h6v4h-6V3zM3 11h6v4H3v-4zm12 0h6v4h-6v-4zM3 19h6v4H3v-4zm12 0h6v4h-6v-4z"/>
                      </svg>
                    )
                  }
                ].map(({ name, icon }) => (
                  <div key={name} className="flex flex-col items-center gap-2 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-[#0FF1CE] group-hover:text-white transition-colors">
                        {icon}
                      </span>
                    </div>
                    <span className="text-[0.6rem] md:text-xs text-gray-400 group-hover:text-[#0FF1CE] transition-colors">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
          </div>
        </section>
  
        {/* Live Payout Interviews Section */}
        <section className="py-16 md:py-20 px-6 bg-black relative overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-1/2 h-[300px] bg-[#0FF1CE]/[0.02] blur-[120px] rounded-full"></div>
          <div className="relative z-10">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0FF1CE] mb-4">Live Payout Interviews</h2>
              <p className="text-gray-300 text-base md:text-xl max-w-3xl mx-auto">
                Watch real traders receive their payouts live.
              </p>
            </div>

            {/* Desktop: 50/50 Layout | Mobile: Stacked */}
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-start gap-8 md:gap-12">
                
                {/* Left Side: Video/Certificate Cards (Mobile: Infinite Scroll) */}
                <div className="w-full md:w-1/2 order-1 md:order-1">
                  
                  {/* Desktop: 2x2 Bento Grid */}
                  <div className="hidden md:grid md:grid-cols-2 gap-4">
                    {/* Video 1 - Top Left */}
                    <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                      style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                        <iframe
                          src="https://www.youtube.com/embed/C2_8YzvnamQ?si=nQlC1MMt-h7OYIDB"
                          title="Trader Payout Interview 1"
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$2,100 Payout</h3>
                        <p className="text-gray-400 text-xs">Andrew S | UK</p>
                        <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>$50,000</span>
                          <span>•</span>
                          <span>15 mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Certificate 1 - Top Right */}
                    <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                      style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#181818] mb-3">
                        {/* Certificate image */}
                        <Image
                          src="/certificates/bento-certificate-1.png"
                          alt="Payout Certificate 1"
                          fill
                          className="object-cover rounded-xl"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          onError={(e) => {
                            // Fallback to placeholder if image doesn't exist
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <div class="text-center">
                                    <div class="text-[#0FF1CE] text-sm font-bold mb-1">Certificate #1</div>
                                    <div class="text-gray-400 text-xs">Upload bento-certificate-1.png</div>
                                    <div class="text-gray-500 text-xs mt-1">to /public/certificates/</div>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="text-center">
                        <div className="text-[#0FF1CE] font-bold text-xs mb-1">$4,442 Payout</div>
                        <p className="text-gray-400 text-xs">James | Australia</p>
                        <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>$100,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Certificate 2 - Bottom Left */}
                    <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                      style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#181818] mb-3">
                        {/* Certificate image */}
                        <Image
                          src="/certificates/bento-certificate-2.png"
                          alt="Payout Certificate 2"
                          fill
                          className="object-cover rounded-xl"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          onError={(e) => {
                            // Fallback to placeholder if image doesn't exist
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <div class="text-center">
                                    <div class="text-[#0FF1CE] text-sm font-bold mb-1">Certificate #2</div>
                                    <div class="text-gray-400 text-xs">Upload bento-certificate-2.png</div>
                                    <div class="text-gray-500 text-xs mt-1">to /public/certificates/</div>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$8,935 Payout</h3>
                        <p className="text-gray-400 text-xs">Marcus | Canada</p>
                        <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>$200,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Video 2 - Bottom Right */}
                    <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                      style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                        <iframe
                          src="https://www.youtube.com/embed/CZrKX44a5JY?si=6Ztd5N5wZHO4ch4f"
                          title="Trader Payout Interview 2"
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$1,815 Payout</h3>
                        <p className="text-gray-400 text-xs">Nikola | Serbia</p>
                        <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>$100,000</span>
                          <span>•</span>
                          <span>20 mins</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile: Infinite Scroll */}
                  <div className="md:hidden relative overflow-hidden -mx-6">
                    {/* Gradient overlays */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#131313] to-transparent z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#131313] to-transparent z-10"></div>
                    
                    {/* Scrolling Track */}
                    <div className="flex animate-infinite-scroll-mobile" style={{ width: '800%' }}>
                      {/* First Set: Andrew, Certificate, Nikola, Certificate */}
                      <div className="flex">
                        {/* Andrew Video */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <iframe
                                src="https://www.youtube.com/embed/C2_8YzvnamQ?si=nQlC1MMt-h7OYIDB"
                                title="Trader Payout Interview 1"
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                            <div className="text-center">
                              <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$2,100 Payout</h3>
                              <p className="text-gray-400 text-xs">Andrew S | UK</p>
                            </div>
                          </div>
                        </div>

                        {/* Certificate 1 */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <Image
                                src="/certificates/mobile-certificate-1.png"
                                alt="Mobile Payout Certificate 1"
                                fill
                                className="object-cover rounded-xl"
                                sizes="256px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center">
                                        <div class="text-center">
                                          <div class="text-[#0FF1CE] text-sm font-bold mb-1">Certificate #1</div>
                                          <div class="text-gray-400 text-xs">Upload mobile-certificate-1.png</div>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-[#0FF1CE] font-bold text-xs mb-1">$4,442 Payout</div>
                              <p className="text-gray-400 text-xs">James | Australia</p>
                            </div>
                          </div>
                        </div>

                        {/* Nikola Video */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <iframe
                                src="https://www.youtube.com/embed/CZrKX44a5JY?si=6Ztd5N5wZHO4ch4f"
                                title="Trader Payout Interview 2"
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                            <div className="text-center">
                              <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$1,815 Payout</h3>
                              <p className="text-gray-400 text-xs">Nikola | Serbia</p>
                            </div>
                          </div>
                        </div>

                        {/* Certificate 2 */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <Image
                                src="/certificates/mobile-certificate-2.png"
                                alt="Mobile Payout Certificate 2"
                                fill
                                className="object-cover rounded-xl"
                                sizes="256px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center">
                                        <div class="text-center">
                                          <div class="text-[#0FF1CE] text-sm font-bold mb-1">Certificate #2</div>
                                          <div class="text-gray-400 text-xs">Upload mobile-certificate-2.png</div>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-[#0FF1CE] font-bold text-xs mb-1">$8,935 Payout</div>
                              <p className="text-gray-400 text-xs">Marcus | Canada</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Duplicate Set for Seamless Loop */}
                      <div className="flex">
                        {/* Andrew Video */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <iframe
                                src="https://www.youtube.com/embed/C2_8YzvnamQ?si=nQlC1MMt-h7OYIDB"
                                title="Trader Payout Interview 1"
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                            <div className="text-center">
                              <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$2,100 Payout</h3>
                              <p className="text-gray-400 text-xs">Andrew S | UK</p>
                            </div>
                          </div>
                        </div>

                        {/* Certificate 3 */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <Image
                                src="/certificates/mobile-certificate-3.png"
                                alt="Mobile Payout Certificate 3"
                                fill
                                className="object-cover rounded-xl"
                                sizes="256px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center">
                                        <div class="text-center">
                                          <div class="text-[#0FF1CE] text-sm font-bold mb-1">Certificate #3</div>
                                          <div class="text-gray-400 text-xs">Upload mobile-certificate-3.png</div>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-[#0FF1CE] font-bold text-xs mb-1">$4,442 Payout</div>
                              <p className="text-gray-400 text-xs">James | Australia</p>
                            </div>
                          </div>
                        </div>

                        {/* Nikola Video */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <iframe
                                src="https://www.youtube.com/embed/CZrKX44a5JY?si=6Ztd5N5wZHO4ch4f"
                                title="Trader Payout Interview 2"
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                            <div className="text-center">
                              <h3 className="text-[#0FF1CE] font-bold text-sm mb-1">$1,815 Payout</h3>
                              <p className="text-gray-400 text-xs">Nikola | Serbia</p>
                            </div>
                          </div>
                        </div>

                        {/* Certificate 4 */}
                        <div className="flex-shrink-0 mx-2 w-64">
                          <div className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300"
                            style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] mb-3">
                              <Image
                                src="/certificates/mobile-certificate-4.png"
                                alt="Mobile Payout Certificate 4"
                                fill
                                className="object-cover rounded-xl"
                                sizes="256px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex items-center justify-center">
                                        <div class="text-center">
                                          <div class="text-[#0FF1CE] text-sm font-bold mb-1">Certificate #4</div>
                                          <div class="text-gray-400 text-xs">Upload mobile-certificate-4.png</div>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-[#0FF1CE] font-bold text-xs mb-1">$8,935 Payout</div>
                              <p className="text-gray-400 text-xs">Marcus | Canada</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Content Text (Mobile: Shows second) */}
                <div className="w-full md:w-1/2 order-2 md:order-2 md:px-8 lg:px-12">
                  <h3 className="text-xl md:text-2xl font-bold text-[#0FF1CE] mb-4 md:mb-6">
                    Unleash Your Trading Potential
                  </h3>
                  
                  <div className="space-y-3 md:space-y-4 text-gray-300 text-sm leading-relaxed">
                    <p>
                      Shockwave Capital developed a revolutionary <span className="text-[#0FF1CE] font-semibold">High-Octane Evaluation Process</span> for elite traders, consisting of our Shockwave Challenge and Verification - specifically engineered to discover true trading excellence.
                    </p>
                    
                    <p>
                      While other prop firms suffocate traders with restrictive rules and microscopic drawdowns, we've seen the industry's limitations and refuse to follow suit. Upon completing our Evaluation Process, traders gain access to <span className="text-[#0FF1CE] font-semibold">simulated funded accounts up to $500,000</span> with industry-leading conditions.
                    </p>
                    
                    <p>
                      Despite operating in a simulated environment, Shockwave traders can earn <span className="text-[#0FF1CE] font-semibold">up to 100% of their simulated profits</span> without risking personal capital. Our top performers unlock our Live Copy Trading Program, where consistent traders can have their trades copied 1:1 and scale to <span className="text-[#0FF1CE] font-semibold">$5 million in simulated capital</span>.
                    </p>
                    
                    <p className="text-[#0FF1CE] font-semibold">
                      The journey to becoming a Shockwave trader isn't for everyone - but for those ready to break free from industry limitations, we provide the tools, conditions, and opportunity to trade without restraints.
                    </p>
                  </div>

                  <div className="mt-6 md:mt-8 flex flex-wrap gap-3 md:gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-[#0FF1CE] rounded-full"></div>
                      <span className="text-xs md:text-sm text-gray-400">15% Max Drawdown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-[#0FF1CE] rounded-full"></div>
                      <span className="text-xs md:text-sm text-gray-400">1:200 Leverage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-[#0FF1CE] rounded-full"></div>
                      <span className="text-xs md:text-sm text-gray-400">14-Day Payouts</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* CTA Section */}
            <div className="mx-auto mt-12 md:mt-16 text-center">
              <button
                onClick={() => window.location.href = '/challenge'}
                className="px-8 py-4 bg-gradient-to-r from-[#0FF1CE] to-[#0AA89E] text-black text-lg md:text-xl font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-[#0FF1CE]/25"
              >
                GET FUNDED NOW
              </button>
            </div>
          </div>
        </section>

        {/* Payout Certificates Infinite Scroll Section */}
        {/* Infinite Scroll Container */}
        <div className="relative overflow-hidden">
          {/* Gradient overlays for smooth edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-[#111111] via-[#111111]/80 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-[#111111] via-[#111111]/80 to-transparent z-10"></div>
          
          {/* Scrolling Track */}
          <div className="flex animate-infinite-scroll md:animate-infinite-scroll-mobile" style={{ width: '600%' }}>
            {/* First set of certificates */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
              <div key={`first-${index}`} className="flex-shrink-0 mx-4">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden w-64 md:w-80 hover:scale-105 transition-all duration-300">
                  {/* Payout certificate image */}
                  <Image
                    src={`/certificates/certificate-${index}.png`}
                    alt={`Payout Certificate ${index}`}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 256px, 320px"
                    onError={(e) => {
                      // Fallback to placeholder if image doesn't exist
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full bg-[#181818] flex items-center justify-center rounded-lg">
                            <div class="text-center">
                              <div class="text-[#0FF1CE] text-lg font-bold mb-2">Certificate #${index}</div>
                              <div class="text-gray-400 text-sm">Upload certificate-${index}.png</div>
                              <div class="mt-3 text-xs text-gray-500">to /public/certificates/</div>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              </div>
            ))}
            
            {/* Duplicate set for seamless loop */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
              <div key={`second-${index}`} className="flex-shrink-0 mx-4">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden w-64 md:w-80 hover:scale-105 transition-all duration-300">
                  {/* Payout certificate image */}
                  <Image
                    src={`/certificates/certificate-${index}.png`}
                    alt={`Payout Certificate ${index}`}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 256px, 320px"
                    onError={(e) => {
                      // Fallback to placeholder if image doesn't exist
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full bg-[#181818] flex items-center justify-center rounded-lg">
                            <div class="text-center">
                              <div class="text-[#0FF1CE] text-lg font-bold mb-2">Certificate #${index}</div>
                              <div class="text-gray-400 text-sm">Upload certificate-${index}.png</div>
                              <div class="mt-3 text-xs text-gray-500">to /public/certificates/</div>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* How It Works Section */}
        <section className="py-12 md:py-20 px-4 md:px-6 bg-black relative overflow-hidden">
          <div className="absolute top-1/3 right-0 w-1/2 h-[300px] bg-[#0FF1CE]/[0.015] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/3 left-0 w-1/2 h-[300px] bg-[#0FF1CE]/[0.01] blur-[120px] rounded-full"></div>
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0FF1CE] mb-3 md:mb-4">How It Works</h2>
              <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
                Get started in three simple steps and begin your journey to becoming a funded trader
              </p>
            </div>
            
            {/* Desktop/Tablet: Grid Layout */}
            <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: "1",
                  title: "Create Your Account",
                  description: "Choose your evaluation plan and gain immediate access to a live-market simulated environment."
                },
                {
                  icon: "2",
                  title: "Complete the Challenge",
                  description: "Demonstrate consistency, discipline, and strategic risk management in real-time simulated conditions."
                },
                {
                  icon: "3",
                  title: "Progress to Simulated Funded Status",
                  description: "Once your performance meets the challenge criteria, you'll be transitioned into our Simulated Funded Program — designed to mirror the pressure and opportunity of trading at scale."
                },
              ].map(({ icon, title, description }, index) => (
                <div
                  key={title}
                  className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 transition-all duration-300 hover:scale-105 overflow-hidden"
                  style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}
                >
                  {/* Background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#0FF1CE]/10 blur-[40px] rounded-full"></div>
                  
                  <div className="relative z-10">
                    {/* Step Number Badge */}
                    <div className="w-12 h-12 rounded-full bg-[#0FF1CE]/10 border-2 border-[#0FF1CE] flex items-center justify-center mb-4">
                      <span className="text-[#0FF1CE] text-xl font-bold">{icon}</span>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
                  </div>

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-2xl bg-[#0FF1CE]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>

            {/* Mobile: Vertical Stack with Connectors */}
            <div className="md:hidden space-y-0">
              {[
                {
                  icon: "1",
                  title: "Create Your Account",
                  description: "Choose your evaluation plan and gain immediate access to a live-market simulated environment."
                },
                {
                  icon: "2",
                  title: "Complete the Challenge",
                  description: "Demonstrate consistency, discipline, and strategic risk management in real-time simulated conditions."
                },
                {
                  icon: "3",
                  title: "Progress to Simulated Funded Status",
                  description: "Once your performance meets the challenge criteria, you'll be transitioned into our Simulated Funded Program."
                },
              ].map(({ icon, title, description }, index) => (
                <div key={title} className="relative">
                  {/* Card */}
                  <div className="relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-5 border-2 border-[#0FF1CE]/30 overflow-hidden"
                    style={{ boxShadow: '0 0 15px rgba(15, 241, 206, 0.1)' }}>
                    
                    {/* Background glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#0FF1CE]/10 blur-[30px] rounded-full"></div>
                    
                    <div className="relative z-10">
                      {/* Step Number Badge */}
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#0FF1CE]/10 border-2 border-[#0FF1CE] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#0FF1CE] text-lg font-bold">{icon}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">{title}</h3>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-400 text-sm leading-relaxed pl-14">{description}</p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < 2 && (
                    <div className="flex justify-start pl-5 py-3">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-[#0FF1CE]/50 to-[#0FF1CE]/20"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-center mt-10 md:mt-12">
              <Link href="/challenge">
                <button className="px-8 md:px-12 py-3 md:py-4 bg-[#0FF1CE] text-black text-base md:text-lg font-bold rounded-lg hover:scale-105 transition-transform shadow-lg hover:shadow-[#0FF1CE]/20">
                  Start Your Challenge
                </button>
              </Link>
            </div>
          </div>
        </section>
  
        {/* Challenge Details Table Section */}
        <section id="pricing" className="relative py-20 px-6 bg-black overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-1/2 h-[400px] bg-[#0FF1CE]/[0.02] blur-[150px] rounded-full"></div>
          
          {/* VIP Showcase Card */}
          <VipCard />
          
          <PricingTable />
        </section>

        {/* Scaling Plan Section */}
        <section className="py-12 md:py-20 px-4 md:px-6 bg-black relative overflow-hidden">
          <div className="absolute top-1/2 right-1/4 w-1/2 h-[350px] bg-[#0FF1CE]/[0.02] blur-[130px] rounded-full"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0FF1CE] mb-3 md:mb-6">Performance Scaling Plan</h2>
            <p className="text-gray-300 text-center text-sm md:text-base max-w-3xl mx-auto mb-8 md:mb-12">
              We believe trader development is a journey — not a one-time event. That's why Shockwave Capital offers an ongoing scale-up path for consistent performers.
            </p>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
              {/* Overview Card */}
              <div className="relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl md:rounded-2xl p-5 md:p-8 border-2 border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 hover:scale-[1.01] transition-all duration-300 overflow-hidden"
                style={{ boxShadow: '0 0 15px rgba(15, 241, 206, 0.1)' }}>
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-[#0FF1CE]/10 blur-[60px] rounded-full"></div>
                
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-8">Scaling plan <span className="text-[#0FF1CE]">overview</span></h3>
                <ul className="space-y-3 md:space-y-6 text-sm md:text-base">
                  {[
                    "Upgraded Profit Split of up to 95%",
                    "Balance Scale up of 50% every 3 months",
                    "Ongoing increases every 3 months if objectives are met",
                    "Trading Objectives remain the same as your original plan on increased balance",
                    "Maximum Allocation per trader of $5 million Simulated Account"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start space-x-3 md:space-x-4 group">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center mt-0.5 md:mt-1 group-hover:scale-110 transition-transform shrink-0">
                        <span className="text-[#0FF1CE] text-sm md:text-lg">✓</span>
                      </div>
                      <span className="text-gray-300 group-hover:text-white transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
                  <div className="mt-6 md:mt-8">
                    <Link href="/challenge">
                      <button className="w-full md:w-auto px-4 py-2 md:px-8 md:py-4 bg-[#0FF1CE] text-black text-sm md:text-lg font-bold rounded-lg hover:scale-105 transition-transform">
                        Get Funded
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl md:rounded-2xl p-5 md:p-8 border-2 border-[#0FF1CE]/30 hover:border-[#0FF1CE]/50 overflow-hidden hover:scale-[1.01] transition-all duration-300"
                style={{ boxShadow: '0 0 15px rgba(15, 241, 206, 0.1)' }}>
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-[#0FF1CE]/10 blur-[60px] rounded-full"></div>
                
                <div className="relative z-10">
                <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
                  <table className="w-full text-sm md:text-base">
                    <thead>
                      <tr className="border-b border-[#0FF1CE]/20">
                        <th className="py-3 md:py-4 px-3 md:px-6 text-left text-[#0FF1CE] font-bold">Elapsed Time</th>
                        <th className="py-3 md:py-4 px-3 md:px-6 text-right text-[#0FF1CE] font-bold">Simulated Capital</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { time: "0 months", balance: "$500,000" },
                        { time: "3 months", balance: "$750,000" },
                        { time: "6 months", balance: "$1,000,000" },
                        { time: "9 months", balance: "$1,250,000" },
                        { time: "12 months", balance: "$1,500,000" },
                        { time: "15 months", balance: "$1,750,000" },
                        { time: "18 months", balance: "$2,000,000" },
                        { time: "21 months", balance: "$2,250,000" },
                        { time: "24 months", balance: "$2,500,000" }
                      ].map((row, index) => (
                        <tr 
                          key={index}
                          className="border-b border-[#2F2F2F] last:border-b-0 hover:bg-[#0FF1CE]/5 transition-colors group"
                        >
                          <td className="py-2 md:py-4 px-3 md:px-6 text-left text-gray-300 group-hover:text-white transition-colors">
                            {row.time}
                          </td>
                          <td className="py-2 md:py-4 px-3 md:px-6 text-right font-bold text-[#0FF1CE]">
                            {row.balance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  <div className="mt-4 md:mt-6 text-xs md:text-sm text-gray-400">
                    Simulated capital increments on the Shockwave Funded Account can occur every 3 months. To qualify for a capital increase, the trader must generate at least 10% net profit over 3 consecutive months.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
  
        {/* Comparison Section */}
        <section className="py-12 md:py-20 px-4 md:px-6 bg-black relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-[400px] bg-[#0FF1CE]/[0.015] blur-[130px] rounded-full"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0FF1CE] mb-3 md:mb-6">How we compare?</h2>
            <p className="text-gray-300 text-center text-sm md:text-base max-w-3xl mx-auto mb-8 md:mb-16">
              Discover how Shockwave Capital stands out in the industry and compares to other leading prop firms.
            </p>

            {/* Comparison Section Table */}
            <div className="max-w-7xl mx-auto overflow-x-auto pb-4 px-4 md:px-8 py-2 md:py-4">
              <div className="min-w-[768px] grid grid-cols-4 gap-px bg-[#0FF1CE]/20 rounded-2xl overflow-hidden border-2 border-[#0FF1CE]/30 transform hover:scale-[1.01] hover:border-[#0FF1CE]/50 transition-all duration-300 mx-auto"
                style={{ boxShadow: '0 0 30px rgba(15, 241, 206, 0.15)' }}>
                {/* Header Row */}
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-4 md:p-8 flex items-center justify-center"></div>
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-4 md:p-8 flex flex-col items-center justify-center">
                  <div className="bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/5 p-3 md:p-4 rounded-xl md:rounded-2xl mb-2 md:mb-4 w-20 h-20 md:w-40 md:h-40 flex items-center justify-center border border-[#0FF1CE]/30">
                    <Image src="/logo.png" alt="Shockwave Capital" width={120} height={120} className="w-16 h-16 md:w-32 md:h-32" />
                  </div>
                  <span className="text-[#0FF1CE] font-bold text-base md:text-xl">Shockwave</span>
                </div>
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-4 md:p-8 flex flex-col items-center justify-center">
                  <div className="bg-gradient-to-br from-[#0FF1CE]/5 to-transparent p-3 md:p-4 rounded-xl md:rounded-2xl mb-2 md:mb-4 w-20 h-20 md:w-40 md:h-40 flex items-center justify-center border border-[#0FF1CE]/20">
                    <span className="text-lg md:text-2xl font-bold text-white">FTMO</span>
                  </div>
                  <span className="text-white font-bold text-base md:text-xl">FTMO</span>
                </div>
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-4 md:p-8 flex flex-col items-center justify-center">
                  <div className="bg-gradient-to-br from-[#0FF1CE]/5 to-transparent p-3 md:p-4 rounded-xl md:rounded-2xl mb-2 md:mb-4 w-20 h-20 md:w-40 md:h-40 flex items-center justify-center border border-[#0FF1CE]/20">
                    <span className="text-xs md:text-2xl font-bold text-white">FundedNext</span>
                  </div>
                  <span className="text-white font-bold text-base md:text-xl">FundedNext</span>
                </div>

                {/* Comparison Rows */}
                {[
                  {
                    feature: "Max Drawdown",
                    shockwave: "15%",
                    ftmo: "10%",
                    fundedNext: "10%"
                  },
                  {
                    feature: "Max Daily Drawdown",
                    shockwave: "8%",
                    ftmo: "5%",
                    fundedNext: "5%"
                  },

                  {
                    feature: "Leverage",
                    shockwave: "1:200",
                    ftmo: "1:30",
                    fundedNext: "1:100"
                  },

                  {
                    feature: "First Payout Eligibility",
                    shockwave: "14 Days",
                    ftmo: "14 Days",
                    fundedNext: "21 Days"
                  },
        
                  {
                    feature: "Simulated Instant Access",
                    shockwave: true,
                    ftmo: false,
                    fundedNext: false
                  },
                  {
                    feature: "Simulated Max Allocation",
                    shockwave: "$500k",
                    ftmo: "$400k",
                    fundedNext: "$300k"
                  },
                  {
                    feature: "Minimum Trading Days",
                    shockwave: "5",
                    ftmo: "5",
                    fundedNext: "5"
                  },
                  {
                    feature: "Weekend Holding",
                    shockwave: true,
                    ftmo: false,
                    fundedNext: true
                  }
                ].map((row, index) => (
                  <React.Fragment key={index}>
                    <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-3 md:p-6 flex items-center font-medium text-white border-t border-[#0FF1CE]/20 text-xs md:text-base">
                      {row.feature}
                    </div>
                    {[row.shockwave, row.ftmo, row.fundedNext].map((value, i) => (
                      <div key={i} className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-3 md:p-6 flex items-center justify-center border-t border-[#0FF1CE]/20 group hover:bg-[#0FF1CE]/15 transition-colors">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-[#0FF1CE]/30">
                              <span className="text-[#0FF1CE] text-lg md:text-2xl">✓</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-red-500/30">
                              <span className="text-red-500 text-lg md:text-2xl">×</span>
                            </div>
                          )
                        ) : (
                          <span className={`font-bold text-xs md:text-base ${i === 0 ? 'text-[#0FF1CE]' : 'text-white'}`}>{value}</span>
                        )}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <div className="max-w-4xl mx-auto mt-8 md:mt-16 text-center">
              <Link href="/challenge">
                <button className="px-6 py-3 md:px-8 md:py-4 bg-[#0FF1CE] text-black text-base md:text-xl font-bold rounded-lg hover:scale-105 transition-transform shadow-lg hover:shadow-[#0FF1CE]/20">
                  Choose the Best. Choose Shockwave
                </button>
              </Link>
            </div>
          </div>
        </section>
  
        {/* Global Network Section */}
        <section className="py-20 px-6 bg-black relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#0FF1CE]/[0.05] blur-[120px] rounded-full"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-center text-[#0FF1CE] mb-6">Global Network</h2>
            <p className="text-base md:text-xl text-gray-300 text-center max-w-2xl mx-auto mb-16">
              Global Access. Elite Focus. Unmatched Simulation.
            </p>

            <div className="max-w-5xl mx-auto relative">
              {/* Logo positioned above SVG */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-10">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#121212] border-2 border-[#0FF1CE] animate-pulse"></div>
                  <Image
                    src="/logo.png"
                    alt="Shockwave Capital" 
                    width={80}
                    height={80}
                    className="relative z-10 w-[40px] h-[40px] md:w-[80px] md:h-[80px]"
                  />
                </div>
              </div>

              <svg viewBox="-1 -1 802 402" className="w-full h-auto">
                <defs>
                  <linearGradient id="globe-gradient" x1="0" y1="0" x2="0" y2="400" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0FF1CE" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0FF1CE" stopOpacity="0.1" />
                  </linearGradient>
                  <radialGradient id="node-gradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0FF1CE" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0FF1CE" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background Circle */}
                <circle cx="400" cy="400" r="400" fill="#181818" />

                {/* Grid Lines */}
                <g stroke="url(#globe-gradient)" strokeWidth="1">
                  {/* Vertical Lines */}
                  <path d="M 400 800 A -400 400 0 0 0 400 0" fill="none" />
                  <path d="M 400 800 A -328.701 400 0 0 0 400 0" fill="none" />
                  <path d="M 400 800 A -235.355 400 0 0 0 400 0" fill="none" />
                  <path d="M 400 800 A -123.097 400 0 0 0 400 0" fill="none" />
                  <path d="M 400 800 A 0 400 0 0 0 400 0" fill="none" />
                  <path d="M 400 0 A 123.097 400 0 0 0 400 800" fill="none" />
                  <path d="M 400 0 A 235.355 400 0 0 0 400 800" fill="none" />
                  <path d="M 400 0 A 328.701 400 0 0 0 400 800" fill="none" />
                  <path d="M 400 0 A 400 400 0 0 0 400 800" fill="none" />

                  {/* Horizontal Lines */}
                  <path d="M160,80 h480" fill="none" />
                  <path d="M80,160 h640" fill="none" />
                  <path d="M33.394,240 h733.212" fill="none" />
                  <path d="M8.082,320 h783.837" fill="none" />
                  <path d="M0,400 h800" fill="none" />
                </g>

                {/* Trading Nodes */}
                {[
                  { cx: 701.26, cy: 240, delay: "0s", path: "M 400 0 A 328.701 400 0 0 1 701.26 240" },
                  { cx: 77.94, cy: 320, delay: "1s", path: "M 400 0 A -328.701 400 0 0 0 77.94 320" },
                  { cx: 498.48, cy: 160, delay: "2s", path: "M 400 0 A 123.097 400 0 0 1 498.48 160" },
                  { cx: 258.79, cy: 80, delay: "1.5s", path: "M 400 0 A -235.355 400 0 0 0 258.79 80" }
                ].map(({ cx, cy, delay, path }, i) => (
                  <g key={i}>
                    {/* Pulse Effect */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="0"
                      stroke="#0FF1CE"
                      strokeWidth="2"
                      fill="none"
                    >
                      <animate
                        attributeName="r"
                        values="0;12;18;24;0"
                        dur="4s"
                        begin={delay}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;1;0.5;0;0"
                        dur="4s"
                        begin={delay}
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Node */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="6"
                      fill="#0FF1CE"
                      className="animate-pulse"
                      stroke="none"
                    />

                    {/* Connection Line */}
                    {path && (
                      <g>
                        <path
                          d={path}
                          stroke="#0FF1CE"
                          strokeWidth="2"
                          fill="none"
                          opacity="0.3"
                        >
                          <animate
                            attributeName="stroke-dasharray"
                            values="0,1000;1000,0"
                            dur={`${3 + i}s`}
                            repeatCount="indefinite"
                          />
                        </path>
                        <circle r="4" fill="#0FF1CE">
                          <animateMotion
                            dur={`${3 + i}s`}
                            repeatCount="indefinite"
                            path={path}
                          />
                        </circle>
                      </g>
                    )}
                  </g>
                ))}
              </svg>
            </div>

            {/* Stats Cards - Positioned to overlap SVG */}
            <div className="relative -mt-5 md:-mt-15 px-6">
              <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                  <h3 className="text-[#0FF1CE] text-lg md:text-4xl font-bold mb-2">24/7</h3>
                  <p className="text-gray-400 text-[0.625rem] md:text-base">Global Market Access</p>
                </div>
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                  <h3 className="text-[#0FF1CE] text-lg md:text-4xl font-bold mb-2">100+</h3>
                  <p className="text-gray-400 text-[0.625rem] md:text-base">Countries Supported</p>
                </div>
                <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                  <h3 className="text-[#0FF1CE] text-lg md:text-4xl font-bold mb-2">$2M+</h3>
                  <p className="text-gray-400 text-[0.625rem] md:text-base">Simulated Capital Programs</p>
                </div>
              </div>
            </div>
          </div>
          
           <div className="absolute top-1/3 right-1/4 w-1/2 h-[300px] bg-[#0FF1CE]/[0.02] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/3 left-1/4 w-1/2 h-[300px] bg-[#0FF1CE]/[0.015] blur-[120px] rounded-full"></div>
          <div className="relative z-10">
            <h2 id="faq" className="text-4xl font-bold text-center text-[#0FF1CE] mb-12 mt-16 md:mt-20">FAQ</h2>
            
            {/* Mobile Scroll Indicators */}
            <div className="relative">
              {/* Right scroll indicator - only visible on mobile */}
              <div className="md:hidden absolute -right-2 top-1/2 -translate-y-1/2 z-20 animate-bounce-x">
                <div className="flex items-center">
                  <span className="text-[#0FF1CE] text-4xl">&rsaquo;</span>
                </div>
              </div>
              
              {/* Gradient overlays */}
              <div className="md:hidden absolute -left-4 top-0 bottom-0 w-8 bg-gradient-to-r from-[#121212] to-transparent z-10"></div>
              <div className="md:hidden absolute -right-4 top-0 bottom-0 w-8 bg-gradient-to-l from-[#121212] to-transparent z-10"></div>
              
              <div className="max-w-7xl mx-auto overflow-x-auto hide-scrollbar">
                <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
                  {[
                    {
                      question: "What makes Shockwave different?",
                      questionShort: "We don't play small.",
                      answer: "While other platforms overpromise and underdeliver, we offer structured simulations with higher drawdown tolerance, tighter feedback loops, and faster scaling potential — all with fully disclosed rules and performance metrics."
                    },
                    {
                      question: "How soon can I start trading?",
                      questionShort: "Immediately after setup.",
                      answer: "Once your account is set up and your evaluation fee is processed, you're good to go. No long waiting times, no phases to unlock — just start trading in our live-market simulation environment."
                    },
                    {
                      question: "What's the payout process like?",
                      questionShort: "Fast and straightforward.",
                      answer: "After meeting performance benchmarks, simulated payouts become eligible after 14 days and the required number of profitable trade days. Standard accounts: up to 90% simulated share. Instant accounts: up to 70%."
                    },
                    {
                      question: "What trading styles are allowed?",
                      questionShort: "All legitimate strategies.",
                      answer: "We support all strategies — scalping, swing, algorithmic — as long as your trades stay within risk rules and show consistency."
                    },
                    {
                      question: "What happens if I don't pass?",
                      questionShort: "You get another chance.",
                      answer: "On our Instant Evaluation plan, every trader gets one free retry. Standard Challenge users can reset for $199 if needed — no penalty, just another shot at proving yourself."
                    }
                  ].map(({ question, questionShort, answer }, index) => (
                    <div
                      key={question}
                      className="group relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 hover:scale-105 transition-all duration-300 min-w-[300px] md:min-w-0 animate-fadeIn"
                      style={{
                        boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)',
                        animationDelay: `${index * 0.1}s`
                      }}
                    >
                      {/* Chat Container */}
                      <div className="space-y-4">
                        {/* Trader Question */}
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <span className="text-sm text-white">T</span>
                            </div>
                            <span className="text-gray-400 text-sm">Trader</span>
                          </div>
                          <div className="bg-gray-800 rounded-2xl rounded-tl-none p-4 text-white text-sm">
                            {question}
                          </div>
                        </div>

                        {/* Shockwave Response */}
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-[#0FF1CE] flex items-center justify-center">
                              <span className="text-sm text-black font-bold">S</span>
                            </div>
                            <span className="text-[#0FF1CE] text-sm">Shockwave</span>
                          </div>
                          <div className="bg-[#0FF1CE]/10 backdrop-blur-sm rounded-2xl rounded-tl-none p-4">
                            <p className="text-[#0FF1CE] font-bold mb-2">{questionShort}</p>
                            <p className="text-gray-300 text-sm whitespace-pre-line">{answer}</p>
                          </div>
                        </div>
                      </div>

                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="max-w-4xl mx-auto mt-16 text-center">
            <Link href="/challenge">
              <button className="px-8 md:px-12 py-3 md:py-4 bg-[#0FF1CE] text-black text-sm md:text-xl font-bold rounded-lg hover:scale-105 transition-transform shadow-lg hover:shadow-[#0FF1CE]/20">
                Stop coasting and go full throttle
              </button>
            </Link>
          </div>
        </section>
  
        
       
  
        {/* Community & Newsletter Section */}
        <section className="py-20 px-6 bg-black relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-[#0FF1CE]/[0.025] blur-[150px] rounded-full"></div>
          <div className="relative z-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Discord Community */}
              <div className="relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-8 hover:scale-105 transition-all duration-300"
                style={{
                  boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)'
                }}>
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#0FF1CE] mb-4">LEARN FROM OUR DISCORD COMMUNITY</h2>
                    <a href="#" className="inline-block mt-6 text-[#0FF1CE] hover:text-[#0FF1CE]/80 font-bold text-lg transition-colors">
                      JOIN OUR DISCORD →
                    </a>
                  </div>
                  <div className="mt-8">
                    <svg viewBox="0 0 127.14 96.36" className="w-32 h-32 ml-auto" fill="#0FF1CE" opacity="0.2">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email Signup */}
              <div className="relative bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-8 hover:scale-105 transition-all duration-300"
                style={{
                  boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)'
                }}>
                <h2 className="text-3xl md:text-4xl font-bold text-[#0FF1CE] mb-6">Subscribe for Email Updates</h2>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-white mb-2">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      placeholder="Type your name"
                      className="w-full px-4 py-3 bg-[#181818] border border-[#0FF1CE]/20 rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-white mb-2">Email*</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="Type your email"
                      className="w-full px-4 py-3 bg-[#181818] border border-[#0FF1CE]/20 rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400"
                    />
                  </div>
                  <button type="submit" className="w-full md:w-auto px-8 py-3 bg-[#0FF1CE] text-black font-bold rounded-lg hover:scale-105 transition-transform">
                    Submit
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
  
        {/* Footer Section */}
        <footer className="bg-black border-t border-[#2F2F2F]/50 pt-16 pb-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-[#0FF1CE]/[0.01] blur-[120px] rounded-full"></div>
          <div className="max-w-7xl mx-auto px-6">
            {/* Footer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
              {/* Brand Column */}
              <div className="space-y-6">
                <Image
                  src="/logo.png"
                  alt="Shockwave Capital"
                  width={120}
                  height={120}
                  className="h-auto w-auto"
                />
                <p className="text-gray-400 text-sm">
                High-performance simulated trading for skilled traders. Test your strategy with industry-leading virtual conditions and 1:200 simulated leverage in our evaluation programs.
                </p>
                <div className="flex space-x-4">
                  {[
                    { icon: "twitter", href: "#" },
                    { icon: "discord", href: "#" },
                    { icon: "telegram", href: "#" },
                    { icon: "instagram", href: "#" }
                  ].map(({ icon, href }) => (
                    <a
                      key={icon}
                      href={href}
                      className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm flex items-center justify-center group hover:scale-110 transition-all duration-300"
                      style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}
                    >
                      <span className="text-[#0FF1CE] group-hover:text-white transition-colors">
                        {icon === 'twitter' && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        )}
                        {icon === 'discord' && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                        )}
                        {icon === 'telegram' && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69c.01-.03-.01-.06-.03-.05c-.11.03-1.79 1.14-2.71 1.71c-.16.1-.51.33-1.09.33c-.58 0-1.58-.31-2.25-.57c-.91-.36-1.77-.79-1.77-1.77c0-.37.19-.67.48-.67c.89 0 2.12 1.28 2.12 1.28s3.72-1.58 5.57-2.38c.33-.14.73-.44 1.19-.44c.21 0 .41.08.54.23c.22.22.23.54.2.84z"/>
                          </svg>
                        )}
                        {icon === 'instagram' && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.315 2c2.43 0 2.784.013 3.808.06c1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153a4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427c.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772a4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465c-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153a4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427c-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058c-.975.045-1.504.207-1.857.344c-.467.182-.8.398-1.15.748c-.35.35-.566.683-.748 1.15c-.137.353-.3.882-.344 1.857c-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807c.045.975.207 1.504.344 1.857c.182.466.399.8.748 1.15c.35.35.683.566 1.15.748c.353.137.882.3 1.857.344c1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058c.976-.045 1.505-.207 1.858-.344c.466-.182.8-.398 1.15-.748c.35-.35.566-.683.748-1.15c.137-.353.3-.882.344-1.857c.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96c-.045-.976-.207-1.505-.344-1.858c-.182-.466-.398-.8-.748-1.15c-.35-.35-.683-.566-1.15-.748c-.353-.137-.882-.3-1.857-.344c-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
                          </svg>
                        )}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-[#0FF1CE] font-bold text-lg mb-6">Quick Links</h3>
                <ul className="space-y-4">
                  {[
                    { text: 'Home', href: '/' },
                    { text: 'Challenge', href: '/challenge' },
                    { text: 'Pricing', href: '/#pricing', scroll: true },
                    { text: 'FAQ', href: '/#faq', scroll: true }
                  ].map(({ text, href, scroll }) => (
                    <li key={text}>
                      <Link 
                        href={href}
                        className="text-gray-400 hover:text-[#0FF1CE] transition-colors"
                        scroll={scroll}
                      >
                        {text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-[#0FF1CE] font-bold text-lg mb-6">Resources</h3>
                <ul className="space-y-4">
                  {[
                    { text: 'How Shockwave Operates', href: '/How-Shockwave-Operates', active: true },
                    { text: 'Terms of Service', href: '/terms', active: true },
                    { text: 'Privacy Policy', href: '/privacy', active: true },
                    { text: 'Refund Policy', href: '/refund', active: true },
                    { text: 'Support Center', href: '/support-center', active: true }
                  ].map(({ text, href, active }) => (
                    <li key={text}>
                      {active ? (
                        <Link href={href} className="text-gray-400 hover:text-[#0FF1CE] transition-colors">{text}</Link>
                      ) : (
                        <span className="text-gray-500 cursor-not-allowed">{text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter */}
              <div>
                <h3 className="text-[#0FF1CE] font-bold text-lg mb-6">Stay Updated</h3>
                <p className="text-gray-400 text-sm mb-4">Subscribe to our newsletter for the latest updates and exclusive offers.</p>
                <form className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 bg-[#181818] border border-[#0FF1CE]/20 rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400"
                  />
                  <button type="submit" className="w-full px-4 py-2 bg-[#0FF1CE] text-black font-bold rounded-lg hover:scale-105 transition-transform">
                    Subscribe
                  </button>
                </form>
              </div>
            </div>

            {/* Disclaimer and Copyright */}
            <div className="border-t border-[#2F2F2F] pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="text-xs text-gray-500">
                <p className="mb-2">
  ⚠️ <strong>Disclaimer:</strong> Shockwave Capital provides access to simulated trading environments for educational and evaluation purposes only. No real funds are traded, invested, or deposited by participants at any stage. References to "funded accounts," "capital," "payouts," or "profit splits" refer exclusively to simulated performance metrics within our proprietary trading models.
</p>

<p className="mb-2">
  Participation in our challenges does not constitute an offer or solicitation to invest or manage capital. Shockwave Capital is not a broker-dealer, investment advisor, or financial institution and does not provide financial, investment, or trading advice.
</p>

<p className="mb-2">
  All trading activity on our platform takes place in a simulated environment using live or delayed market data. Any strategies executed, profits generated, or losses incurred are part of a simulated experience and do not reflect actual market performance or real financial gain/loss.
</p>

<p className="mb-2">
  By purchasing access to any evaluation or subscription plan, you acknowledge and agree to our Terms of Use, Privacy Policy, and Program Rules. All purchases are final. Fees are non-refundable once your simulated trading account is activated or access to our services is granted.
</p>

<p className="mb-2">
  Shockwave Capital retains full control over all account parameters and reserves the right to update challenge rules, evaluation criteria, payout structures, or access terms with appropriate notice. Continued use of our services constitutes acceptance of any such updates.
</p>

<p className="mb-2">
  Trading leveraged products like forex, indices, and commodities carries inherent risk. Even in simulated environments, practicing risk management and caution is essential. Past simulated performance is not indicative of future results.
</p>

                  <p>
                    &copy; {new Date().getFullYear()} Shockwave Capital. All rights reserved.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 md:justify-end text-xs">
                  <Link href="/terms" className="text-gray-400 hover:text-[#0FF1CE] transition-colors">Terms</Link>
                  <Link href="/privacy" className="text-gray-400 hover:text-[#0FF1CE] transition-colors">Privacy</Link>
                  <Link href="/refund" className="text-gray-400 hover:text-[#0FF1CE] transition-colors">Refund Policy</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Features Section */}
        <style jsx global>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @keyframes fadeInUp {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }

          @keyframes infinite-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          @keyframes bounceX {
            0%, 100% { transform: translate(-50%, -50%); }
            50% { transform: translate(0%, -50%); }
          }
          
          .animate-bounce-x {
            animation: bounceX 1.5s ease-in-out infinite;
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }

          .animate-infinite-scroll {
            animation: infinite-scroll 40s linear infinite;
          }

          .animate-infinite-scroll:hover {
            animation-play-state: paused;
          }

          .animate-infinite-scroll-mobile {
            animation: infinite-scroll 15s linear infinite;
          }

          .animate-infinite-scroll-mobile:hover {
            animation-play-state: paused;
          }
          
          .background-noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
            opacity: 0.15;
          }

          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }

          @media (max-width: 768px) {
            .hide-scrollbar {
              scroll-snap-type: x mandatory;
              scroll-behavior: smooth;
            }
            
            .hide-scrollbar > div > div {
              scroll-snap-align: center;
            }
          }
        `}</style>
      </div>
    );
  }
  