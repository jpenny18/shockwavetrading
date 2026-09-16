'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../../../components/Particles';
import { Loader2, LayoutDashboard } from 'lucide-react';

export default function CryptoPendingPage() {
  const router = useRouter();

  // Clear challenge data from session storage
  useEffect(() => {
    sessionStorage.removeItem('challengeData');
  }, []);

  return (
    <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans">
      <Particles />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#2F2F2F]/50">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto">
              <Loader2 className="w-16 h-16 text-[#0FF1CE] animate-spin" />
            </div>
            
            <h1 className="text-3xl font-bold text-white">Payment Pending</h1>
            
            <div className="max-w-lg mx-auto space-y-4 text-gray-300">
              <p>
                We are waiting to receive your crypto payment. This process may take up to 30 minutes depending on network conditions.
              </p>
              <p>
                Once we confirm your payment, we will process your challenge and send you an email with your account details.
              </p>
              <p>
                You can safely close this page. We'll notify you via email once everything is ready.
              </p>
            </div>

            <div className="pt-6 border-t border-[#2F2F2F]/50 space-y-4">
              <p className="text-sm text-gray-400">
                Having issues? Contact our support at{' '}
                <a href="mailto:support@shockwave-capital.com" className="text-[#0FF1CE] hover:underline">
                  support@shockwave-capital.com
                </a>
              </p>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 text-[#0FF1CE] rounded-xl transition-colors"
              >
                <LayoutDashboard size={18} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 