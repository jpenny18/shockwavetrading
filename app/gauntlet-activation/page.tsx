'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Particles from '../components/Particles';
import Header from '../components/Header';
import { Check, ChevronDown, ChevronUp, Bitcoin, Copy, CreditCard } from 'lucide-react';
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
        <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans">
          <Header />
          <Particles />
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 overflow-hidden">
              {isProcessingPayment && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white">Processing payment...</p>
                  </div>
                </div>
              )}
              
              <div className="p-6 md:p-8 border-b border-[#0FF1CE]/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0FF1CE]">{isReset ? 'Reset Your Gauntlet Account' : 'Activate Your Gauntlet Account'}</h2>
                    <p className="text-gray-400 mt-1">{orderLabel} - {selectedOption.level}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">{feeLabel}</div>
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
      <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans">
        <Header />
        <Particles />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-8">
            {isProcessingPayment && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white">Processing payment...</p>
                </div>
              </div>
            )}
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0FF1CE] mb-2">Select Payment Method</h2>
              <p className="text-gray-400">{orderLabel} - {selectedOption.level}</p>
            </div>

            <div className="space-y-4 mb-8">
              {/* Card Payment Option - hidden until payment processor is restored */}
              <div className="hidden">
                <button
                  onClick={handleCardPayment}
                  className="w-full bg-gradient-to-r from-[#0FF1CE]/10 to-[#00D9FF]/10 hover:from-[#0FF1CE]/20 hover:to-[#00D9FF]/20 border-2 border-[#0FF1CE]/30 hover:border-[#0FF1CE] rounded-xl p-6 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#0FF1CE]/20 rounded-lg flex items-center justify-center group-hover:bg-[#0FF1CE]/30 transition-colors">
                        <CreditCard size={24} className="text-[#0FF1CE]" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-white">Credit/Debit Card</div>
                        <div className="text-sm text-gray-400">Secure checkout via Whop</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                  </div>
                </button>
              </div>

              {/* Crypto Payment Option */}
              <button
                onClick={() => setPaymentMethod('crypto')}
                className="w-full bg-gradient-to-r from-[#0FF1CE]/10 to-[#00D9FF]/10 hover:from-[#0FF1CE]/20 hover:to-[#00D9FF]/20 border-2 border-[#0FF1CE]/30 hover:border-[#0FF1CE] rounded-xl p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0FF1CE]/20 rounded-lg flex items-center justify-center group-hover:bg-[#0FF1CE]/30 transition-colors">
                      <Bitcoin size={24} className="text-[#0FF1CE]" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-white">Cryptocurrency</div>
                      <div className="text-sm text-gray-400">Pay with BTC, ETH, USDT, or USDC</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                </div>
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-[#151515]/50 rounded-xl p-6 border border-[#2F2F2F]/30">
              <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Customer:</span>
                  <span className="text-white">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{formData.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Account Size:</span>
                  <span className="text-white">{selectedOption.level}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Platform:</span>
                  <span className="text-white">{formData.platform}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Option:</span>
                  <span className="text-white">{isReset ? 'Reset Account' : 'Activate Account'}</span>
                </div>
                {isReset && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Reset Discount (12%):</span>
                    <span className="text-[#0FF1CE]">-${(selectedOption.price - getEffectivePrice(selectedOption)).toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-[#2F2F2F]/50 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Total:</span>
                  <span className="text-[#0FF1CE] font-bold text-xl">${getEffectivePrice(selectedOption).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans">
      <Header />
      
      {/* Hero Section */}
      <section className="relative px-4 md:px-6 pt-24 md:pt-40 pb-10 md:pb-32 text-center overflow-hidden bg-gradient-to-b from-[#121212] to-[#131313]">
        <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
        <Particles />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-block bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-3 md:mb-4">
            FUNDED ACTIVATION
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-transparent bg-clip-text mb-3 md:mb-6">
            Activate Your Funded Account
          </h1>
          <p className="text-sm md:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-4 md:mb-8">
            Skip the challenge, Pay your activation fee to unlock your funded account with zero restrictions.
          </p>

          {/* Price Increase Notice */}
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/40 text-orange-400 px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-6 md:mb-8 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            PRICES INCREASE TOMORROW — LOCK IN TODAY
          </div>

          {/* Floating Stats Cards */}
          <div className="grid grid-cols-3 gap-2 md:flex md:flex-row md:justify-center md:items-center md:gap-8 px-1 md:px-0 mb-6 md:mb-8">
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
          <div className="max-w-2xl mx-auto mb-6 md:mb-8">
            <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-4 md:p-8 border border-[#0FF1CE]/20"
              style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
              <h3 className="text-lg md:text-2xl font-bold text-[#0FF1CE] mb-4 md:mb-6 text-center">NO BS Funded Account RULES</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-4 text-left">
                {[
                  "No consistency rules",
                  "News trading allowed",
                  "Hold over weekends",
                  "EAs & Bots allowed",
                  "No Profit Caps",
                  "No Position size caps"
                ].map((rule, index) => (
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

          {/* Mobile CTA - scrolls to account selector */}
          <button
            onClick={() => document.getElementById('account-selector')?.scrollIntoView({ behavior: 'smooth' })}
            className="md:hidden w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black text-sm font-bold rounded-xl active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(15,241,206,0.3)]"
          >
            <span>Choose Your Account</span>
            <ChevronDown size={18} />
          </button>
        </div>
      </section>

      {/* Activation Options Section */}
      <section id="account-selector" className="py-12 md:py-20 px-6 bg-gradient-to-b from-[#131313] to-[#111111] relative overflow-hidden scroll-mt-20">
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-[#131313] to-transparent"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-center text-[#0FF1CE] mb-8">
            Activate your Funded Account
            {levelParam && <span className="block text-xl text-gray-400 mt-2">{levelParam.toUpperCase()} Account Activation</span>}
          </h2>

          {/* Activate / Reset Mode Selection (shown only when enabled by admin) */}
          {resetFeatureEnabled && (
          <div className="max-w-xl mx-auto grid grid-cols-2 gap-4 mb-12">
            <button
              onClick={() => handleModeSelect('activate')}
              className={`p-4 rounded-xl border-2 transition-all duration-300 text-center ${
                activationMode === 'activate'
                  ? 'border-[#0FF1CE] bg-[#0FF1CE]/10 shadow-[0_0_15px_rgba(15,241,206,0.2)]'
                  : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/30'
              }`}
            >
              <div className={`font-bold ${activationMode === 'activate' ? 'text-[#0FF1CE]' : 'text-white'}`}>Activate Account</div>
         
            </button>
            <button
              onClick={() => handleModeSelect('reset')}
              className={`p-4 rounded-xl border-2 transition-all duration-300 text-center ${
                activationMode === 'reset'
                  ? 'border-[#0FF1CE] bg-[#0FF1CE]/10 shadow-[0_0_15px_rgba(15,241,206,0.2)]'
                  : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/30'
              }`}
            >
              <div className={`font-bold ${activationMode === 'reset' ? 'text-[#0FF1CE]' : 'text-white'}`}>Reset Account</div>
             
            </button>
          </div>
          )}
          
          {filteredOptions.length > 0 ? (
            <>
              <div className="max-w-7xl -mx-6 px-6 md:mx-auto md:px-0 flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none pb-4 md:pb-0 hide-scrollbar">
                {filteredOptions.map((option, index) => (
                  <div
                    key={option.level}
                    className={`group relative shrink-0 w-[70%] max-w-[260px] snap-center md:w-auto md:max-w-none bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 border border-[#0FF1CE]/20 hover:scale-105 transition-all duration-300 cursor-pointer ${
                      selectedOption?.level === option.level ? 'ring-2 ring-[#0FF1CE]' : ''
                    }`}
                    style={{
                      boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)'
                    }}
                    onClick={() => handleSelectOption(option)}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#0FF1CE] mb-2">{option.level}</div>
                      {isReset && (
                        <div className="text-sm text-gray-500 line-through">${option.price.toLocaleString()}</div>
                      )}
                      <div className="text-3xl font-bold text-white">${getEffectivePrice(option).toLocaleString()}</div>
                      <div className="text-sm text-gray-400 mt-1">{feeLabel}</div>
                    </div>

                    {selectedOption?.level === option.level && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-[#0FF1CE] rounded-full flex items-center justify-center">
                          <Check size={14} className="text-black" />
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ))}
              </div>
              {filteredOptions.length > 1 && (
                <p className="md:hidden text-center text-gray-500 text-xs mt-2">← Swipe to explore account sizes →</p>
              )}
            </>
          ) : (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-8 border border-[#0FF1CE]/20"
                style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                <p className="text-gray-400 mb-4">No activation options found for the specified level.</p>
                <a href="/gauntlet-activation" className="text-[#0FF1CE] hover:underline">
                  View all activation options
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Form Section */}
      {selectedOption && (
        <section id="information-section" className="py-12 md:py-20 px-6 bg-gradient-to-b from-[#111111] to-[#131313] relative overflow-hidden scroll-mt-20">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-center text-[#0FF1CE] mb-16">Complete Your Information</h2>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-8 border border-[#0FF1CE]/20"
                style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white mb-2">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-[#181818] border rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400 ${
                          formErrors.firstName ? 'border-red-500' : 'border-[#0FF1CE]/20'
                        }`}
                        placeholder="Enter your first name"
                      />
                      {formErrors.firstName && <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>}
                    </div>

                    <div>
                      <label className="block text-white mb-2">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-[#181818] border rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400 ${
                          formErrors.lastName ? 'border-red-500' : 'border-[#0FF1CE]/20'
                        }`}
                        placeholder="Enter your last name"
                      />
                      {formErrors.lastName && <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-[#181818] border rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400 ${
                        formErrors.email ? 'border-red-500' : 'border-[#0FF1CE]/20'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-[#181818] border rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400 ${
                          formErrors.phone ? 'border-red-500' : 'border-[#0FF1CE]/20'
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-white mb-2">Country *</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-[#181818] border rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white ${
                          formErrors.country ? 'border-red-500' : 'border-[#0FF1CE]/20'
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
                      {formErrors.country && <p className="text-red-500 text-sm mt-1">{formErrors.country}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Trading Platform *</label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-[#181818] border rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white ${
                        formErrors.platform ? 'border-red-500' : 'border-[#0FF1CE]/20'
                      }`}
                    >
                      <option value="MT5">MetaTrader 5 (MT5)</option>
                      <option value="MT4">MetaTrader 4 (MT4)</option>
                    </select>
                    {formErrors.platform && <p className="text-red-500 text-sm mt-1">{formErrors.platform}</p>}
                    <p className="text-gray-400 text-xs mt-1">Select your preferred trading platform</p>
                  </div>

                  <div>
                    <label className="block text-white mb-2">Discord Username (Optional)</label>
                    <input
                      type="text"
                      name="discordUsername"
                      value={formData.discordUsername}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#181818] border border-[#0FF1CE]/20 rounded-lg focus:outline-none focus:border-[#0FF1CE] text-white placeholder-gray-400"
                      placeholder="Your Discord username"
                    />
                  </div>

                  <div className="pt-6 border-t border-[#0FF1CE]/20">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <div className="text-lg font-semibold text-white">{orderLabel}</div>
                        <div className="text-[#0FF1CE]">{selectedOption.level} Funded Account</div>
                      </div>
                      <div className="text-right">
                        {isReset && (
                          <div className="text-sm text-gray-500 line-through">${selectedOption.price.toLocaleString()}</div>
                        )}
                        <div className="text-2xl font-bold text-[#0FF1CE]">${getEffectivePrice(selectedOption).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm">{feeLabel}</div>
                      </div>
                    </div>

                    <button
                      onClick={handleProceedToPayment}
                      className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] hover:scale-105 text-black font-bold py-4 rounded-xl transition-all"
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

// Wrapper component with Suspense boundary
export default function GauntletActivationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="w-8 h-8 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <GauntletActivationContent />
    </Suspense>
  );
}
