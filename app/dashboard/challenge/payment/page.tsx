'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../../../components/Particles';
import { 
  CreditCard, 
  Bitcoin, 
  ChevronDown, 
  ChevronUp, 
  Check,
  Shield,
  RefreshCcw,
  HeadphonesIcon,
  Mail
} from 'lucide-react';
import CryptoPayment from '../../../components/CryptoPayment';
import StripeCardForm from '../../../components/StripeCardForm';

type ChallengeType = 'Standard' | 'Instant';

// Function to calculate price based on challenge type and amount
const calculatePrice = (type: ChallengeType, amount: string): number => {
  const baseAmount = parseInt(amount.replace(/\$|,/g, ''));
  
  switch(type) {
    case 'Standard':
      switch(baseAmount) {
        case 5000: return 79;
        case 10000: return 149;
        case 25000: return 299;
        case 50000: return 349;
        case 100000: return 599;
        case 200000: return 999;
        case 500000: return 1999;
        default: return 0;
      }
    case 'Instant':
      switch(baseAmount) {
        case 25000: return 799;
        case 50000: return 999;
        case 100000: return 1999;
        default: return 0;
      }
    default:
      return 0;
  }
};

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
  discount?: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  };
}

const validateChallengeData = (data: ChallengeData | null): boolean => {
  if (!data) return false;
  
  // Required fields
  const requiredFields = [
    data.type,
    data.amount,
    data.platform,
    data.price,
    data.formData.firstName,
    data.formData.lastName,
    data.formData.email,
    data.formData.phone,
    data.formData.country
  ];
  
  return requiredFields.every(field => field && String(field).trim() !== '');
};

const PaymentProcessingOverlay = () => (
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
    <div className="text-center">
      <div className="w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white">Processing payment...</p>
    </div>
  </div>
);

const PriceDisplay = ({ originalPrice, finalPrice, discount }: { 
  originalPrice: number;
  finalPrice: number;
  discount?: ChallengeData['discount'];
}) => (
  <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50 mb-8">
    <h2 className="text-xl font-semibold mb-4 text-white">Order Summary</h2>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Subtotal</span>
        <span className={discount ? 'line-through text-gray-400' : 'text-white'}>
          ${originalPrice.toFixed(2)}
        </span>
      </div>
      
      {discount && (
        <div className="flex justify-between items-center text-[#0FF1CE]">
          <span>
            Discount ({discount.type === 'percentage' 
              ? `${discount.value}%` 
              : `$${discount.value}`})
          </span>
          <span>
            -${(originalPrice - finalPrice).toFixed(2)}
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center pt-2 border-t border-[#2F2F2F]">
        <span className="font-medium text-white">Total</span>
        <span className="text-xl font-bold text-[#0FF1CE]">
          ${finalPrice.toFixed(2)}
        </span>
      </div>
    </div>
  </div>
);

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

export default function PaymentPage() {
  // Add feature flag at the top of the component
  const CRYPTO_PAYMENTS_ENABLED = false; // Feature flag for crypto payments
  
  const router = useRouter();
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | null>(null);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isCryptoExpanded, setIsCryptoExpanded] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingPaymentIntent, setIsLoadingPaymentIntent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });

  useEffect(() => {
    const storedData = sessionStorage.getItem('challengeData');
    if (!storedData) {
      router.push('/challenge');
      return;
    }
    
    const parsedData = JSON.parse(storedData);
    if (!validateChallengeData(parsedData)) {
      router.push('/challenge');
      return;
    }
    
    setChallengeData(parsedData);
  }, [router]);

  // Fetch crypto prices every 15 minutes
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices');
        const data = await response.json();
        setCryptoPrices(data);
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };

    fetchPrices(); // Initial fetch
    const interval = setInterval(fetchPrices, 15 * 60 * 1000); // Fetch every 15 minutes

    return () => clearInterval(interval);
  }, []);

  // Function to create a payment intent
  const createPaymentIntent = async () => {
    if (!challengeData) return;
    
    try {
      setIsLoadingPaymentIntent(true);
      setPaymentError(null);
      
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: challengeData.price,
          email: challengeData.formData.email,
          metadata: {
            challengeType: challengeData.type,
            challengeAmount: challengeData.amount,
            platform: challengeData.platform,
            customerName: `${challengeData.formData.firstName} ${challengeData.formData.lastName}`,
            existingPaymentIntentId: paymentIntentId || undefined,
            discountCode: challengeData.discount?.code,
            discountId: challengeData.discount?.id,
            originalAmount: challengeData.discount ? calculatePrice(challengeData.type as ChallengeType, challengeData.amount) : undefined
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      console.log('Payment intent created in dashboard component:', data.paymentIntentId);
      
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setPaymentError(error instanceof Error ? error.message : 'Failed to initialize payment. Please try again later.');
    } finally {
      setIsLoadingPaymentIntent(false);
    }
  };

  const getCryptoPrice = () => {
    if (!challengeData?.price) return 0;
    return Math.round(challengeData.price * 0.9); // 10% discount
  };

  const handlePaymentSelect = async (method: 'card' | 'crypto') => {
    if (method === 'card') {
      const wasExpanded = isCardExpanded;
      setIsCardExpanded(!wasExpanded);
      setIsCryptoExpanded(false);
      
      // If expanding the card section and we don't have a client secret yet, create a payment intent
      if (!wasExpanded && !clientSecret) {
        await createPaymentIntent();
      }
    } else {
      setIsCryptoExpanded(!isCryptoExpanded);
      setIsCardExpanded(false);
    }
    setPaymentMethod(method);
  };

  if (!challengeData) {
    return (
      <div className="relative">
        <Particles />
        <div className="relative z-10">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render card payment form or loading state
  const renderCardPaymentSection = () => {
    if (isLoadingPaymentIntent) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-[#0FF1CE] border-t-transparent rounded-full"></div>
          <span className="ml-3 text-white/70">Initializing payment...</span>
        </div>
      );
    }
    
    if (paymentError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {paymentError}
          <button
            className="mt-4 px-4 py-2 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] font-bold rounded-xl hover:bg-[#0FF1CE]/10 transition-all duration-300"
            onClick={createPaymentIntent}
          >
            Try Again
          </button>
      </div>
      );
    }
    
    if (!clientSecret) {
      return (
        <div className="p-6 text-center">
          <p className="text-white/70">Unable to initialize payment. Please try again.</p>
          <button
            className="mt-4 px-4 py-2 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] font-bold rounded-xl hover:bg-[#0FF1CE]/10 transition-all duration-300"
            onClick={createPaymentIntent}
          >
            Initialize Payment
          </button>
    </div>
  );
    }
    
    // Only render the StripeCardForm when clientSecret is available
    return (
      <StripeCardForm
        clientSecret={clientSecret}
        challengeData={challengeData}
        successRedirectPath="/dashboard/challenge/success"
        onProcessingStateChange={setIsProcessingPayment}
      />
    );
  };

  return (
    <div className="bg-gradient-to-br from-[#0D0D0D] via-[#0D0D0D] to-[#151515] text-white min-h-screen font-sans">
      {/* System Alert Banner */}
      <div className="relative z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 rounded-xl border border-orange-500/30 shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-orange-500/20 rounded-full p-2 mt-1">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-orange-400">Payment System Temporarily Paused</h3>
                <div className="space-y-2 text-gray-300">
                  <p>
                    Due to an unexpected issue with our payment processor, we are temporarily unable to accept new payments. We are actively implementing new payment solutions including cryptocurrency and a new credit/debit card processor.
                  </p>
                  <p className="text-white font-medium">
                    <span className="text-[#0FF1CE]">Good news for early supporters:</span> Everybody who purchased during our launch day have received their accounts for free! We've chosen to absorb the $30,000 loss from these transactions to demonstrate our commitment to the trading community.
                  </p>
                  <p>
                    This decision reflects our core values: we are here for the traders, and we aim to be the most transparent in the industry. We appreciate your patience during this brief transition.
                  </p>
                  <p className="text-orange-400 font-medium mt-4">
                    New payment systems will be operational shortly. Please check back soon or contact support for updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      </div>
      <Particles />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-8 text-center">Complete Your Payment</h1>

        {/* Payment Support Notice */}
        <div className="mb-8 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#0FF1CE]/30 overflow-hidden">
          <div className="px-4 py-3 bg-[#0FF1CE]/10 border-b border-[#0FF1CE]/20">
            <h3 className="text-[#0FF1CE] font-medium">Having trouble with your payment?</h3>
          </div>
          <div className="p-4 flex items-start gap-3">
            <Mail className="text-[#0FF1CE] w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-300">
              If your card declines or you encounter any payment issues, please email{' '}
              <a href="mailto:support@shockwave-capital.com" className="text-[#0FF1CE] hover:underline">
                support@shockwave-capital.com
              </a>
              {' '}for alternative payment methods or assistance.
            </p>
          </div>
        </div>

        <PriceDisplay 
          originalPrice={challengeData.discount ? calculatePrice(challengeData.type as ChallengeType, challengeData.amount) : challengeData.price}
          finalPrice={challengeData.price}
          discount={challengeData.discount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Payment Methods */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50 mb-8">
              <h2 className="text-xl font-semibold mb-6 text-white">Payment Methods</h2>

              {/* Credit Card Payment Option */}
              <div className="mb-4">
              <button
                onClick={() => handlePaymentSelect('card')}
                  className="w-full bg-gradient-to-b from-[#151515] to-[#0D0D0D] border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 rounded-xl p-4 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <CreditCard className="text-[#0FF1CE] mr-3" size={20} />
                      <span className="font-medium text-white">Credit Card</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2 text-white">${challengeData.price.toFixed(2)}</span>
                      {isCardExpanded ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
                </div>
                </div>
              </button>

              {isCardExpanded && (
                  <div className="mt-4 relative">
                    {isProcessingPayment && <PaymentProcessingOverlay />}
                    <div className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-5 border border-[#2F2F2F]/50">
                      {renderCardPaymentSection()}
                  </div>
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-4 text-center border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 group">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:bg-[#0FF1CE]/20 transition-colors">
                      <Shield className="text-[#0FF1CE]" size={24} />
                    </div>
                    <div className="text-[#0FF1CE] font-medium mb-1 text-xs">Secure Payment</div>
                    <div className="text-[0.5rem] text-gray-400 leading-relaxed">256-bit SSL encryption for maximum security</div>
                  </div>
                  
                  <div className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-4 text-center border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 group">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:bg-[#0FF1CE]/20 transition-colors">
                      <RefreshCcw className="text-[#0FF1CE]" size={24} />
                    </div>
                    <div className="text-[#0FF1CE] font-medium mb-1 text-xs">Refund Policy</div>
                    <div className="text-[0.5rem] text-gray-400 leading-relaxed">Full refund after successfully completing the evaluation</div>
                  </div>

                  <div className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-4 text-center border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 group">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#0FF1CE]/10 flex items-center justify-center group-hover:bg-[#0FF1CE]/20 transition-colors">
                      <HeadphonesIcon className="text-[#0FF1CE]" size={24} />
                    </div>
                    <div className="text-[#0FF1CE] font-medium mb-1 text-xs">24/7 Support</div>
                    <div className="text-[0.5rem] text-gray-400 leading-relaxed">Round-the-clock customer service assistance</div>
                  </div>
                </div>
            </div>

              {/* Crypto Payment Option - Only render if enabled */}
              {CRYPTO_PAYMENTS_ENABLED && (
                <div>
                  <button
                    onClick={() => handlePaymentSelect('crypto')}
                    className="w-full bg-gradient-to-b from-[#151515] to-[#0D0D0D] border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 rounded-xl p-4 transition-all duration-300"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Bitcoin className="text-[#0FF1CE] mr-3" size={20} />
                        <span className="font-medium text-white">Cryptocurrency</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2 text-white">${challengeData.price.toFixed(2)}</span>
                        {isCryptoExpanded ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
                      </div>
                    </div>
                  </button>

                  {isCryptoExpanded && (
                    <div className="mt-4">
                      <div className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl border border-[#2F2F2F]/50 relative">
                        {isProcessingPayment && <PaymentProcessingOverlay />}
                        <CryptoPayment
                          challengeData={challengeData}
                          successRedirectPath="/dashboard/challenge/success"
                          onProcessingStateChange={setIsProcessingPayment}
                          cryptoPrices={cryptoPrices}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Important Disclaimer Notice */}
            <div className="mt-6 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-lg p-4 border border-orange-500/30 shadow-lg">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-orange-400 text-xl">⚠️</span>
                <h3 className="text-orange-400 font-bold">Important Disclaimer</h3>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                Shockwave Capital offers access to a simulated trading environment for the sole purpose of evaluating trading skill and discipline. All trading activity occurs on demo accounts using real-time market data. No actual capital is deposited, invested, or traded on behalf of users.
              </p>
              <p className="text-sm text-gray-300 mb-3">
                References to "funding," "capital," "payouts," or "profit splits" pertain exclusively to performance-based simulations and do not imply the transfer or management of real funds.
              </p>
              <p className="text-sm text-gray-300 mb-3">
                Participation in Shockwave Capital's programs is strictly for educational and evaluative purposes and does not constitute financial advice, investment services, or brokerage activity.
              </p>
              <p className="text-sm text-gray-300 font-semibold mb-2">By proceeding with payment, you confirm that:</p>
              <ul className="text-sm text-gray-300 list-disc pl-5 mb-3 space-y-1">
                <li>You are not participating in real-money or live trading.</li>
                <li>You understand this platform is not a broker-dealer, investment advisor, or asset management firm.</li>
                <li>Any rewards, incentives, or performance-based milestones are tied to simulated results and subject to our internal review and compliance criteria.</li>
                <li>You accept these terms and agree to our full Terms of Use and Privacy Policy.</li>
              </ul>
              <p className="text-sm text-orange-400 font-semibold">
                If you do not agree to these conditions, please do not proceed with payment.
              </p>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50 sticky top-8">
              <h2 className="text-xl font-semibold mb-6 text-white">Order Summary</h2>
              
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Challenge Type:</span>
                  <span className="font-medium text-white">{challengeData.type}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Account Size:</span>
                  <span className="font-medium text-white">{challengeData.amount}</span>
        </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Platform:</span>
                  <span className="font-medium text-white">{challengeData.platform}</span>
                </div>
              </div>
              
              <div className="border-t border-[#2F2F2F]/50 pt-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Subtotal:</span>
                  <span className="font-medium text-white">${challengeData.price.toFixed(2)}</span>
                </div>
                {CRYPTO_PAYMENTS_ENABLED && paymentMethod === 'crypto' && (
                  <div className="flex justify-between mb-2 text-green-400">
                    <span>Crypto Discount (10%):</span>
                    <span>-${challengeData.price - getCryptoPrice()}</span>
              </div>
                )}
                <div className="flex justify-between text-lg font-semibold mt-4">
                  <span className="text-white">Total:</span>
                  <span className="text-[#0FF1CE]">
                    ${(CRYPTO_PAYMENTS_ENABLED && paymentMethod === 'crypto') ? getCryptoPrice() : challengeData.price.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-white/60">
                <p className="mb-2">By completing this purchase, you agree to our Terms of Service and acknowledge that all sales are final.</p>
                <p>Need help? <a href="#" className="text-[#0FF1CE] hover:underline">Contact Support</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 