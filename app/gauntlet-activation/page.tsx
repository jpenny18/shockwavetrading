'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Particles from '../components/Particles';
import Header from '../components/Header';
import { Check, ChevronDown, Bitcoin, CreditCard } from 'lucide-react';
import CryptoPayment from '../components/CryptoPayment';

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  platform: string;
  discordUsername?: string;
}

interface ActivationOption {
  level: string;
  price: number;
  features: string[];
  whopCheckoutUrl?: string;
}

type ActivationMode = 'activate' | 'reset';

// Reset accounts get 12% off the activation fee
const RESET_DISCOUNT = 0.12;

const ACTIVATION_OPTIONS: ActivationOption[] = [
  {
    level: '$10k',
    price: 199,
    whopCheckoutUrl: 'https://whop.com/checkout/plan_gYWVAVyu65Zwa',
    features: [
      '$10,000 Simulated Capital',
      '15% Max Drawdown',
      '8% Daily Drawdown',
      '1:200 Leverage',
      'No Trading Restrictions',
      'Weekend Holding Allowed'
    ]
  },
  {
    level: '$25k',
    price: 299,
    whopCheckoutUrl: 'https://whop.com/checkout/plan_4JiIRmkyRqjq8',
    features: [
      '$25,000 Simulated Capital',
      '15% Max Drawdown',
      '8% Daily Drawdown',
      '1:200 Leverage',
      'No Trading Restrictions',
      'Weekend Holding Allowed'
    ]
  },
  {
    level: '$50k',
    price: 499,
    whopCheckoutUrl: 'https://whop.com/checkout/plan_9t46Mcti2Gl1G',
    features: [
      '$50,000 Simulated Capital',
      '15% Max Drawdown',
      '8% Daily Drawdown',
      '1:200 Leverage',
      'No Trading Restrictions',
      'Weekend Holding Allowed'
    ]
  },
  {
    level: '$100k',
    price: 799,
    whopCheckoutUrl: 'https://whop.com/checkout/plan_mYd9abFhGM9Mg',
    features: [
      '$100,000 Simulated Capital',
      '15% Max Drawdown',
      '8% Daily Drawdown',
      '1:200 Leverage',
      'No Trading Restrictions',
      'Weekend Holding Allowed'
    ]
  },
  {
    level: '$200k',
    price: 1499,
    whopCheckoutUrl: 'https://whop.com/checkout/plan_ArcXmNChT9aLe',
    features: [
      '$200,000 Simulated Capital',
      '15% Max Drawdown',
      '8% Daily Drawdown',
      '1:200 Leverage',
      'No Trading Restrictions',
      'Weekend Holding Allowed'
    ]
  },
  {
    level: '$500k',
    price: 2999,
    features: [
      '$500,000 Simulated Capital',
      '15% Max Drawdown',
      '8% Daily Drawdown',
      '1:200 Leverage',
      'No Trading Restrictions',
      'Weekend Holding Allowed'
    ]
  }
];

function GauntletActivationContent() {
  const searchParams = useSearchParams();
  const [selectedOption, setSelectedOption] = useState<ActivationOption | null>(null);
  const [activationMode, setActivationMode] = useState<ActivationMode>('activate');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    platform: 'MT5',
    discordUsername: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // Admin-controlled feature flag: hides the Reset Account option when disabled
  const [resetFeatureEnabled, setResetFeatureEnabled] = useState(false);

  // Filter activation options based on URL parameter
  const levelParam = searchParams?.get('level'); // e.g., ?level=200k or ?level=$200k
  const filteredOptions = levelParam 
    ? ACTIVATION_OPTIONS.filter(option => {
        const normalizedLevel = option.level.toLowerCase().replace('$', '');
        const normalizedParam = levelParam.toLowerCase().replace('$', '');
        return normalizedLevel === normalizedParam;
      })
    : ACTIVATION_OPTIONS;

  // Auto-select if only one option available
  useEffect(() => {
    if (filteredOptions.length === 1 && !selectedOption) {
      setSelectedOption(filteredOptions[0]);
    }
  }, [filteredOptions, selectedOption]);

  // Fetch crypto prices
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

    fetchPrices();
    const interval = setInterval(fetchPrices, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch the admin feature toggle for the Reset Account option
  useEffect(() => {
    const fetchFeatureToggle = async () => {
      try {
        const response = await fetch('/api/site-settings');
        if (!response.ok) return;
        const data = await response.json();
        setResetFeatureEnabled(data.gauntletResetEnabled === true);
      } catch (error) {
        console.error('Error fetching site settings:', error);
      }
    };

    fetchFeatureToggle();
  }, []);

  // If the reset feature gets disabled, never leave the user stuck in reset mode
  useEffect(() => {
    if (!resetFeatureEnabled && activationMode === 'reset') {
      setActivationMode('activate');
      setShowPayment(false);
    }
  }, [resetFeatureEnabled, activationMode]);

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.platform.trim()) errors.platform = 'Platform selection is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectOption = (option: ActivationOption) => {
    setSelectedOption(option);
    setShowPayment(false);
    // On mobile, auto-scroll to the information section once it has rendered
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        document.getElementById('information-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handleModeSelect = (mode: ActivationMode) => {
    setActivationMode(mode);
    setShowPayment(false);
  };

  // Effective fee for the selected mode (reset = 12% off the activation fee)
  const getEffectivePrice = (option: ActivationOption): number => {
    if (activationMode === 'reset') {
      return Math.round(option.price * (1 - RESET_DISCOUNT) * 100) / 100;
    }
    return option.price;
  };

  const isReset = activationMode === 'reset';
  const feeLabel = isReset ? 'Reset Fee (12% Off)' : 'Activation Fee';
  const orderLabel = isReset ? 'Gauntlet Reset' : 'Gauntlet Activation';

  const handleProceedToPayment = () => {
    if (!selectedOption) return;
    
    if (validateForm()) {
      setShowPayment(true);
    }
  };

  const handleCardPayment = async () => {
    if (!selectedOption) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Save order to Firebase first
      const orderData = {
        status: 'PENDING',
        challengeType: 'gauntlet-activation',
        challengeAmount: selectedOption.level,
        activationMode,
        platform: formData.platform,
        totalAmount: getEffectivePrice(selectedOption),
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerPhone: formData.phone,
        customerCountry: formData.country,
        customerDiscordUsername: formData.discordUsername || '',
        paymentMethod: 'card',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch('/api/card-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to save order');
      }

      const { orderId } = await response.json();
      console.log('Gauntlet activation order saved:', orderId);

      // Send admin notification email about pending gauntlet activation order
      try {
        await fetch('/api/send-card-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...orderData,
            orderId: orderId,
            isPending: true // Flag to indicate this is a pending order notification
          })
        });
        console.log('Admin notification sent for pending gauntlet activation order');
      } catch (emailError) {
        console.error('Error sending admin email:', emailError);
        // Don't block the flow if email fails
      }

      // Redirect to Whop checkout
      if (selectedOption.whopCheckoutUrl) {
        window.location.href = selectedOption.whopCheckoutUrl;
      } else {
        throw new Error('Checkout URL not configured');
      }
    } catch (error) {
      console.error('Error processing card payment:', error);
      alert('Failed to process payment. Please try again or contact support.');
      setIsProcessingPayment(false);
    }
  };

  const getChallengeData = () => {
    if (!selectedOption) return null;
    
    return {
      type: 'gauntlet-activation',
      amount: selectedOption.level,
      activationMode,
      platform: formData.platform,
      formData,
      price: getEffectivePrice(selectedOption),
      addOns: []
    };
  };

  if (showPayment && selectedOption) {
    // If crypto payment method is selected, show crypto payment
    if (paymentMethod === 'crypto') {
      return (
        <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
          <Header />
          <Particles />
          
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-32 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
              {isProcessingPayment && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[22px] bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent"></div>
                    <p className="text-white">Processing payment...</p>
                  </div>
                </div>
              )}
              
              <div className="border-b border-white/10 p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Crypto checkout</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{isReset ? 'Reset Your Gauntlet Account' : 'Activate Your Gauntlet Account'}</h2>
                    <p className="mt-1 text-sm text-white/50">{orderLabel} - {selectedOption.level}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                    <div className="text-sm text-white/45">{feeLabel}</div>
                  </div>
                </div>
              </div>

              <CryptoPayment
                challengeData={getChallengeData()}
                successRedirectPath="/gauntlet-activation/pending"
                onProcessingStateChange={setIsProcessingPayment}
                cryptoPrices={cryptoPrices}
              />
            </div>
          </div>
        </div>
      );
    }

    // Payment method selection
    return (
      <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
        <Header />
        <Particles />
        
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-32 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8">
            {isProcessingPayment && (
              <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[22px] bg-black/60 backdrop-blur-sm">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent"></div>
                  <p className="text-white">Processing payment...</p>
                </div>
              </div>
            )}
            
            <div className="mb-8">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Checkout</p>
              <h2 className="mb-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Select Payment Method</h2>
              <p className="text-sm text-white/50">{orderLabel} - {selectedOption.level}</p>
            </div>

            <div className="mb-8 space-y-4">
              {/* Card Payment Option - hidden until payment processor is restored */}
              <div className="hidden">
                <button
                  onClick={handleCardPayment}
                  className="group w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-6 text-left transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-[#0FF1CE] transition-colors group-hover:border-[#0FF1CE]/40 group-hover:bg-[#0FF1CE]/15">
                        <CreditCard size={24} />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-semibold text-white">Credit/Debit Card</div>
                        <div className="text-sm text-white/50">Secure checkout via Whop</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                  </div>
                </button>
              </div>

              {/* Crypto Payment Option */}
              <button
                onClick={() => setPaymentMethod('crypto')}
                className="group w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-6 text-left transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-[#0FF1CE] transition-colors group-hover:border-[#0FF1CE]/40 group-hover:bg-[#0FF1CE]/15">
                      <Bitcoin size={24} />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-semibold text-white">Cryptocurrency</div>
                      <div className="text-sm text-white/50">Pay with BTC, ETH, USDT, or USDC</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                </div>
              </button>
            </div>

            {/* Order Summary */}
            <div className="rounded-[18px] border border-white/10 bg-black/30 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-white/50">Customer:</span>
                  <span className="text-right text-white">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-white/50">Email:</span>
                  <span className="break-all text-right text-white">{formData.email}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-white/50">Account Size:</span>
                  <span className="text-white">{selectedOption.level}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-white/50">Platform:</span>
                  <span className="text-white">{formData.platform}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-white/50">Option:</span>
                  <span className="text-white">{isReset ? 'Reset Account' : 'Activate Account'}</span>
                </div>
                {isReset && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-white/50">Reset Discount (12%):</span>
                    <span className="text-[#0FF1CE]">-${(selectedOption.price - getEffectivePrice(selectedOption)).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-3">
                  <span className="font-semibold text-white">Total:</span>
                  <span className="text-xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden bg-black px-6 pb-12 pt-36 text-center md:pb-16 md:pt-44">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
        <Particles />
        
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-4 inline-block rounded-full bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] px-4 py-1.5 text-xs font-bold text-black md:mb-5 md:text-sm">
            FUNDED ACTIVATION
          </div>
          
          <h1 className="mb-4 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] bg-clip-text text-4xl font-extrabold leading-tight text-transparent md:mb-6 md:text-6xl">
            Activate Your Funded Account
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-white/60 md:text-base">
            Skip the challenge, Pay your activation fee to unlock your funded account with zero restrictions.
          </p>

          {/* Price Increase Notice */}
          {/* <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/40 text-orange-400 px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-6 md:mb-8 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            PRICES INCREASE TOMORROW — LOCK IN TODAY
          </div> */}

          <div className="mb-8 grid grid-cols-3 gap-2 px-2 md:flex md:flex-row md:items-center md:justify-center md:gap-8 md:px-0">
            {[
              { value: "15%", label: "Max Drawdown" },
              { value: "8%", label: "Daily Drawdown" },
              { value: "1:200", label: "Leverage" }
            ].map(({ value, label }) => (
              <div
                key={label}
                className="group relative w-full rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 p-3 backdrop-blur-sm md:w-44 md:p-4"
                style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}
              >
                <div className="mb-1 text-xl font-bold text-[#0FF1CE] md:text-3xl">{value}</div>
                <div className="text-xs text-gray-400 md:text-sm">{label}</div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
          </div>

          <div className="mx-auto mb-8 max-w-2xl">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl md:p-8">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Funded rules</p>
              <h3 className="mb-6 text-center text-xl font-semibold tracking-tight text-white md:text-2xl">NO BS Funded Account RULES</h3>
              <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
                {[
                  "No consistency rules",
                  "News trading allowed",
                  "Hold over weekends",
                  "EAs & Bots allowed",
                  "No Profit Caps",
                  "No Position size caps"
                ].map((rule) => (
                  <div key={rule} className="group flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0FF1CE]/10 transition-transform group-hover:scale-110">
                      <span className="text-sm text-[#0FF1CE]">✓</span>
                    </div>
                    <span className="text-sm text-white/70 transition-colors group-hover:text-white md:text-base">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile CTA - scrolls to account selector */}
          <button
            onClick={() => document.getElementById('account-selector')?.scrollIntoView({ behavior: 'smooth' })}
            className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#0FF1CE] px-8 py-3.5 text-sm font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform duration-300 active:scale-[0.98] md:hidden"
          >
            <span>Choose Your Account</span>
            <ChevronDown size={18} />
          </button>
        </div>
      </section>

      {/* Activation Options Section */}
      <section id="account-selector" className="relative scroll-mt-20 overflow-hidden bg-black px-6 py-16 md:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]" />
        <div className="relative z-10">
          <div className="mx-auto mb-8 max-w-3xl text-center md:mb-12">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Account size</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Activate your Funded Account
            </h2>
            {levelParam && (
              <p className="mt-3 text-sm text-white/50">{levelParam.toUpperCase()} Account Activation</p>
            )}
          </div>

          {/* Activate / Reset Mode Selection (shown only when enabled by admin) */}
          {resetFeatureEnabled && (
          <div className="mx-auto mb-10 grid max-w-xl grid-cols-2 gap-3 md:mb-12">
            <button
              type="button"
              onClick={() => handleModeSelect('activate')}
              className={`rounded-[18px] border px-4 py-4 text-center font-semibold transition-colors duration-300 ${
                activationMode === 'activate'
                  ? 'border-[#0FF1CE] bg-[#0FF1CE] text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)]'
                  : 'border-white/10 bg-white/[0.04] text-white hover:border-white/20'
              }`}
            >
              Activate Account
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect('reset')}
              className={`rounded-[18px] border px-4 py-4 text-center font-semibold transition-colors duration-300 ${
                activationMode === 'reset'
                  ? 'border-[#0FF1CE] bg-[#0FF1CE] text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)]'
                  : 'border-white/10 bg-white/[0.04] text-white hover:border-white/20'
              }`}
            >
              Reset Account
            </button>
          </div>
          )}
          
          {filteredOptions.length > 0 ? (
            <>
              <div className="hide-scrollbar -mx-6 flex max-w-7xl snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:mx-auto md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
                {filteredOptions.map((option) => {
                  const isSelected = selectedOption?.level === option.level;
                  return (
                  <div
                    key={option.level}
                    className={`group relative w-[70%] max-w-[260px] shrink-0 cursor-pointer snap-center rounded-[22px] border p-6 backdrop-blur-xl transition-colors duration-300 md:w-auto md:max-w-none ${
                      isSelected
                        ? 'border-[#0FF1CE]/70 bg-white/[0.07]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                    }`}
                    onClick={() => handleSelectOption(option)}
                  >
                    <div className="text-center">
                      <div className="mb-2 text-2xl font-bold text-[#0FF1CE]">{option.level}</div>
                      {isReset && (
                        <div className="text-sm text-white/40 line-through">${option.price.toLocaleString()}</div>
                      )}
                      <div className="text-3xl font-bold text-white">${getEffectivePrice(option).toLocaleString()}</div>
                      <div className="mt-1 text-sm text-white/45">{feeLabel}</div>
                    </div>

                    {isSelected && (
                      <div className="absolute right-3 top-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0FF1CE]">
                          <Check size={14} className="text-black" />
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              {filteredOptions.length > 1 && (
                <p className="mt-2 text-center text-xs text-white/40 md:hidden">← Swipe to explore account sizes →</p>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-2xl text-center">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
                <p className="mb-4 text-white/60">No activation options found for the specified level.</p>
                <a href="/gauntlet-activation" className="font-semibold text-[#0FF1CE] hover:underline">
                  View all activation options
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Form Section */}
      {selectedOption && (
        <section id="information-section" className="relative scroll-mt-20 overflow-hidden bg-black px-6 py-16 md:py-24">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[50%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/[0.08] blur-[120px]" />
          <div className="relative z-10">
            <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Checkout</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Complete Your Information</h2>
            </div>
            
            <div className="mx-auto max-w-2xl">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl md:p-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${
                          formErrors.firstName ? 'border-red-500' : 'border-white/10'
                        }`}
                        placeholder="Enter your first name"
                      />
                      {formErrors.firstName && <p className="mt-1 text-sm text-red-400">{formErrors.firstName}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${
                          formErrors.lastName ? 'border-red-500' : 'border-white/10'
                        }`}
                        placeholder="Enter your last name"
                      />
                      {formErrors.lastName && <p className="mt-1 text-sm text-red-400">{formErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${
                        formErrors.email ? 'border-red-500' : 'border-white/10'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {formErrors.email && <p className="mt-1 text-sm text-red-400">{formErrors.email}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${
                          formErrors.phone ? 'border-red-500' : 'border-white/10'
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {formErrors.phone && <p className="mt-1 text-sm text-red-400">{formErrors.phone}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">Country *</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white focus:border-[#0FF1CE]/60 focus:outline-none ${
                          formErrors.country ? 'border-red-500' : 'border-white/10'
                        }`}
                      >
                        <option value="">Select your country</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Other">Other</option>
                      </select>
                      {formErrors.country && <p className="mt-1 text-sm text-red-400">{formErrors.country}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Trading Platform *</label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white focus:border-[#0FF1CE]/60 focus:outline-none ${
                        formErrors.platform ? 'border-red-500' : 'border-white/10'
                      }`}
                    >
                      <option value="MT5">MetaTrader 5 (MT5)</option>
                      <option value="MT4">MetaTrader 4 (MT4)</option>
                    </select>
                    {formErrors.platform && <p className="mt-1 text-sm text-red-400">{formErrors.platform}</p>}
                    <p className="mt-1 text-xs text-white/40">Select your preferred trading platform</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Discord Username (Optional)</label>
                    <input
                      type="text"
                      name="discordUsername"
                      value={formData.discordUsername}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none"
                      placeholder="Your Discord username"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-white">{orderLabel}</div>
                        <div className="text-[#0FF1CE]">{selectedOption.level} Funded Account</div>
                      </div>
                      <div className="text-right">
                        {isReset && (
                          <div className="text-sm text-white/40 line-through">${selectedOption.price.toLocaleString()}</div>
                        )}
                        <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                        <div className="text-sm text-white/45">{feeLabel}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedToPayment}
                      className="w-full rounded-2xl bg-[#0FF1CE] px-8 py-3.5 text-base font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isReset ? 'Reset Gauntlet Account' : 'Activate Gauntlet Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <style jsx global>{`
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

// Wrapper component with Suspense boundary
export default function GauntletActivationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <GauntletActivationContent />
    </Suspense>
  );
}
