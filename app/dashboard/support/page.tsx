'use client';

import React from 'react';
import { Mail, AlertTriangle, Clock } from 'lucide-react';
import Particles from '../../components/Particles';

export default function SupportPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-8 text-center">Support Center</h1>
        
        <div className="grid gap-6">
          {/* Contact Support Card */}
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <div className="flex items-start gap-4 text-gray-300">
              <div className="w-12 h-12 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center flex-shrink-0">
                <Mail className="text-[#0FF1CE]" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-3">Contact Support</h2>
                <p className="mb-4 text-gray-400">
                  Need assistance? Our support team is here to help! Please email us at:
                </p>
                <a 
                  href="mailto:support@shockwave-capital.com"
                  className="text-black text-lg font-bold inline-flex items-center gap-2 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] px-4 py-2 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
                >
                  <Mail size={16} />
                  support@shockwave-capital.com
                </a>
              </div>
            </div>
          </div>

          {/* Queue System Notice Card */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-8 border border-amber-500/30 hover:border-amber-500/50 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 flex-shrink-0">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Queue System Notice
                </h2>
                <div className="text-gray-300 space-y-3">
                  <p className="font-medium text-amber-100">
                    Important: Our support operates on a first-come, first-served queue system.
                  </p>
                  <p>
                    <strong className="text-amber-200">Please only send one email per issue.</strong> Sending multiple emails for the same issue will reset your position to the back of the queue and significantly prolong your wait time.
                  </p>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mt-4">
                    <p className="text-sm text-amber-100">
                      <strong>Best Practices:</strong> Include all relevant details in your initial email, such as account information, screenshots, and a clear description of your issue. This helps us resolve your inquiry faster.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Response Time Card */}
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center flex-shrink-0">
                <Clock className="text-[#0FF1CE]" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-3">Expected Response Times</h2>
                <div className="grid md:grid-cols-2 gap-4 text-gray-300">
                  <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/20">
                    <h3 className="font-semibold text-white mb-2">General Inquiries</h3>
                    <p className="text-[#0FF1CE] font-medium">24-48 hours</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/20">
                    <h3 className="font-semibold text-white mb-2">Account Issues</h3>
                    <p className="text-[#0FF1CE] font-medium">12-24 hours</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/20">
                    <h3 className="font-semibold text-white mb-2">Technical Support</h3>
                    <p className="text-[#0FF1CE] font-medium">24-48 hours</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/20">
                    <h3 className="font-semibold text-white mb-2">Urgent Matters</h3>
                    <p className="text-[#0FF1CE] font-medium">1-12 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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