'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../../../components/Particles';
import { CheckCircle, ArrowLeft, Mail } from 'lucide-react';

interface PaymentSuccess {
  orderId: string;
  amount: number;
  challengeType: string;
  paymentMethod: string;
}

interface ChallengeData {
  type: string;
  amount: string;
  platform: string;
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    discordUsername?: string;
  };
  price: number;
}

export default function SuccessPage() {
  const router = useRouter();
  const [paymentData, setPaymentData] = useState<PaymentSuccess | null>(null);
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // First useEffect to load data from sessionStorage
  useEffect(() => {
    const storedPaymentData = sessionStorage.getItem('paymentSuccess');
    const storedChallengeData = sessionStorage.getItem('challengeData');
    
    if (!storedPaymentData || !storedChallengeData) {
      setIsLoading(false);
      router.push('/promo/promochallenge');
      return;
    }
    
    // Parse and set the data
    setPaymentData(JSON.parse(storedPaymentData));
    setChallengeData(JSON.parse(storedChallengeData));
    setIsLoading(false);
    setDataLoaded(true);
  }, [router]);

  // Second useEffect to clear sessionStorage after data is loaded
  useEffect(() => {
    if (dataLoaded) {
      // Use a timeout to ensure the UI renders with the data before clearing storage
      const timer = setTimeout(() => {
        sessionStorage.removeItem('paymentSuccess');
        sessionStorage.removeItem('challengeData');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [dataLoaded]);

  if (isLoading || !paymentData || !challengeData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <Particles />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </button>

        <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#2F2F2F]/50">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-[#0FF1CE]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Payment Successful</h1>
              <p className="text-gray-400">Your challenge has been created successfully</p>
            </div>
          </div>
          
          {/* Email confirmation notice */}
          <div className="bg-[#0FF1CE]/10 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Mail className="h-5 w-5 text-[#0FF1CE] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-sm">
                A confirmation email has been sent to <span className="font-semibold">{challengeData.formData.email}</span> with your order details.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Your account credentials will be sent separately within the next few hours.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-[#2F2F2F]/50">
              <span className="text-gray-400">Order number</span>
              <span className="text-white">{paymentData.orderId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2F2F2F]/50">
              <span className="text-gray-400">Account Size</span>
              <span className="text-white">{challengeData.amount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2F2F2F]/50">
              <span className="text-gray-400">Account Type</span>
              <span className="text-white">{challengeData.type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2F2F2F]/50">
              <span className="text-gray-400">Platform</span>
              <span className="text-white">{challengeData.platform}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2F2F2F]/50">
              <span className="text-gray-400">Trading Account Currency</span>
              <span className="text-white">USD</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2F2F2F]/50">
              <span className="text-gray-400">Payment Method</span>
              <span className="text-white">{paymentData.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cryptocurrency'}</span>
            </div>
            <div className="flex justify-between py-2 text-xl font-semibold">
              <span className="text-white">Amount Paid</span>
              <span className="text-[#0FF1CE]">${paymentData.amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-medium text-white">Next Steps</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center mt-1">
                  <span className="text-[#0FF1CE]">1</span>
                </div>
                <span className="text-gray-300">Check your email for login credentials</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center mt-1">
                  <span className="text-[#0FF1CE]">2</span>
                </div>
                <span className="text-gray-300">Download and install {challengeData.platform}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center mt-1">
                  <span className="text-[#0FF1CE]">3</span>
                </div>
                <span className="text-gray-300">Log in to your trading account and start trading</span>
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