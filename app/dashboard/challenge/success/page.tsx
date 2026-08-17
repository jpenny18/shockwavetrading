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
    const paymentSuccess = sessionStorage.getItem('paymentSuccess');
    const challengeData = sessionStorage.getItem('challengeData');
    
    if (!paymentSuccess || !challengeData) {
      setIsLoading(false);
      return;
    }

    // Parse and set the data
    setPaymentData(JSON.parse(paymentSuccess));
    setChallengeData(JSON.parse(challengeData));
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment confirmation...</p>
        </div>
      </div>
    );
  }

  if (!paymentData || !challengeData) {
    return (
      <div className="relative bg-gradient-to-br from-[#0D0D0D] via-[#0D0D0D] to-[#151515]">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
        </div>
        <Particles />

        <div className="relative z-10 py-10 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(15,241,206,0.4)]">
                <CheckCircle className="w-8 h-8 text-[#0FF1CE]" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-2">Payment Successful</h1>
              <p className="text-gray-400">
                Your payment has been processed successfully.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/challenge')}
                className="w-full bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] py-3 rounded-xl font-bold hover:bg-[#0FF1CE]/10 transition-all duration-300"
              >
                Start Another Challenge
              </button>
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

  return (
    <div className="relative bg-gradient-to-br from-[#0D0D0D] via-[#0D0D0D] to-[#151515]">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      </div>
      <Particles />

      <div className="relative z-10">
        <div className="max-w-3xl mx-auto py-10 px-4">
          <div className="mb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(15,241,206,0.4)]">
              <CheckCircle className="w-8 h-8 text-[#0FF1CE]" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-2">Your order has been received</h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              We will start processing your {challengeData.type} Challenge as soon as possible. 
              Your login credentials will be emailed to you shortly.
            </p>
          </div>
          
          {/* Email confirmation notice */}
          <div className="max-w-xl mx-auto bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 rounded-lg border border-[#0FF1CE]/20 p-4 mb-6 flex items-start gap-3">
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

          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#2F2F2F]/50">
            <h2 className="text-xl font-medium mb-6 text-white">Order Details</h2>
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
          </div>

          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#2F2F2F]/50">
            <h2 className="text-xl font-medium mb-6 text-white">What's Next?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0FF1CE] font-medium">1</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Receive your login credentials</h3>
                  <p className="text-gray-400 text-sm">
                    Check your email at {challengeData.formData.email} for your trading platform login details. 
                    This typically takes 10-15 minutes but can take up to 24 hours during busy periods.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0FF1CE] font-medium">2</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Log into your trading platform</h3>
                  <p className="text-gray-400 text-sm">
                    Download and install {challengeData.platform} if you haven't already, then log in with the credentials provided.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0FF1CE] font-medium">3</span>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Start trading</h3>
                  <p className="text-gray-400 text-sm">
                    Begin trading according to the challenge rules. Remember to stay within the drawdown limits and profit targets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/challenge')}
              className="flex-1 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] py-3 rounded-xl font-bold hover:bg-[#0FF1CE]/10 transition-all duration-300"
            >
              Start Another Challenge
            </button>
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