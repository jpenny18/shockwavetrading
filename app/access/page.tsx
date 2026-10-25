'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Particles from '../components/Particles';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Check,
  AlertCircle,
  Rocket,
  Zap,
  Shield,
  TrendingUp,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { registerUser, signInUser, resetPassword } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { countries } from '@/lib/countries';

interface AuthData {
  email: string;
  password: string;
  confirmPassword: string;
  rememberMe: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
}

interface AuthErrors {
  [key: string]: string | undefined;
}

// Launch Modal Component
const LaunchModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-[#0D0D0D] rounded-2xl border border-[#0FF1CE]/30 overflow-hidden shadow-2xl">
        {/* Header with close button */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-[#0D0D0D]/95 backdrop-blur-sm border-b border-[#2F2F2F]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0FF1CE]/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0FF1CE]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0FF1CE]">New Launch Preview</h3>
              <p className="text-xs text-gray-400">See what's coming to Shockwave Capital</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/launch"
              target="_blank"
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#0FF1CE]/10 text-[#0FF1CE] rounded-lg hover:bg-[#0FF1CE]/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open Full Page
            </Link>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2F2F2F]/50 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Iframe Content */}
        <div className="w-full h-full pt-16">
          <iframe
            src="/launch"
            className="w-full h-full border-0"
            title="Shockwave Capital Launch Preview"
          />
        </div>
      </div>
    </div>
  );
};

const FloatingLabelInput = ({
  id,
  label,
  icon: Icon,
  type = 'text',
  required = false,
  value,
  onChange,
  error
}: {
  id: string;
  label: string;
  icon: any;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Icon size={18} className={`transition-all duration-300 ${value.length > 0 || isFocused ? 'text-[#0FF1CE]' : 'text-gray-500'}`} />
        </div>
        <input
          id={id}
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          className={`
            w-full bg-[#1A1A1A]/50 backdrop-blur-sm border rounded-xl pl-11 pr-4 py-4 text-white 
            transition-all duration-300 focus:outline-none
            ${value.length > 0 || isFocused ? 'border-[#0FF1CE]/50 bg-[#0FF1CE]/5' : 'border-[#2F2F2F]/50 hover:border-[#2F2F2F]'}
            ${error ? 'border-red-500/50 bg-red-500/5' : ''}
            placeholder:text-gray-500 text-sm md:text-base
          `}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#0FF1CE] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {/* Glow effect on focus */}
        <div className={`absolute inset-0 rounded-xl bg-[#0FF1CE]/20 blur-xl transition-opacity duration-300 pointer-events-none ${isFocused ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>
      {error && (
        <p className="mt-2 text-xs md:text-sm text-red-400 flex items-center gap-1 animate-shake">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  );
};

export default function EarlyAccessPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [formData, setFormData] = useState<AuthData>({
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    firstName: '',
    lastName: '',
    phone: '',
    country: ''
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // Prevent zoom on mobile by setting viewport meta tag
  useEffect(() => {
    // Get existing viewport meta tag or create one
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    const originalContent = viewportMeta?.getAttribute('content') || '';
    
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    } else {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      document.head.appendChild(viewportMeta);
    }

    // Restore original viewport settings when component unmounts
    return () => {
      if (viewportMeta) {
        if (originalContent) {
          viewportMeta.setAttribute('content', originalContent);
        }
      }
    };
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !loading) {
        router.push('/dashboard');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, loading]);

  // Launch modal disabled - keeping code for future use
  // useEffect(() => {
  //   if (!loading) {
  //     const timer = setTimeout(() => {
  //       setShowLaunchModal(true);
  //     }, 2000); // Show modal after 2 seconds

  //     return () => clearTimeout(timer);
  //   }
  // }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#0FF1CE]/20 rounded-full animate-spin"></div>
          <div className="w-12 h-12 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    setSuccess('');

    try {
      // For login form
      if (isLogin) {
        // Validation
        if (!formData.email || !formData.password) {
          setErrors({
            email: !formData.email ? 'Please enter your email address' : undefined,
            password: !formData.password ? 'Please enter your password' : undefined
          });
          setIsSubmitting(false);
          return;
        }

        if (!acceptDisclaimer) {
          setErrors({ disclaimer: 'You must acknowledge and accept the disclaimer' });
          setIsSubmitting(false);
          return;
        }

        // Sign in with Firebase
        await signInUser(formData.email, formData.password);
        // If successful, redirect to main page
        router.push('/dashboard');
      } else {
        // For registration form
        // Validation
        const phoneDigits = formData.phone.replace(/\D/g, '');
        const nextErrors: AuthErrors = {
          email: !formData.email ? 'Please enter your email address' : undefined,
          password: !formData.password ? 'Please enter your password' : undefined,
          firstName: !formData.firstName.trim() ? 'Please enter your first name' : undefined,
          lastName: !formData.lastName.trim() ? 'Please enter your last name' : undefined,
          phone: !formData.phone.trim()
            ? 'Please enter your phone number'
            : (phoneDigits.length < 7 || phoneDigits.length > 15)
              ? 'Enter a valid phone number'
              : undefined,
          country: !formData.country ? 'Please select your country' : undefined
        };
        if (Object.values(nextErrors).some(Boolean)) {
          setErrors(nextErrors);
          setIsSubmitting(false);
          return;
        }

        if (!acceptTerms || !acceptDisclaimer) {
          setErrors({
            terms: !acceptTerms ? 'You must accept the terms and conditions' : undefined,
            disclaimer: !acceptDisclaimer ? 'You must acknowledge and accept the disclaimer' : undefined
          });
          setIsSubmitting(false);
          return;
        }

        // Password strength check
        if (formData.password.length < 6) {
          setErrors({ password: 'Password must be at least 6 characters' });
          setIsSubmitting(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setErrors({ confirmPassword: 'Passwords do not match' });
          setIsSubmitting(false);
          return;
        }

        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();

        await registerUser(formData.email, formData.password, {
          displayName: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          phone: formData.phone.trim(),
          country: formData.country
        });

        // If successful, redirect to main page
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      // Handle different Firebase auth errors
      const errorCode = error.code;
      let errorMessage = 'An unexpected error occurred. Please try again.';

      switch (errorCode) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already in use.';
          setErrors({ email: errorMessage });
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          setErrors({ email: errorMessage });
          break;
        case 'auth/user-disabled':
          errorMessage = 'This user account has been disabled.';
          setErrors({ general: errorMessage });
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          setErrors({ general: errorMessage });
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak.';
          setErrors({ password: errorMessage });
          break;
        default:
          setErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Prevent zoom on mobile when focusing inputs */}
      <style jsx global>{`
        @media screen and (max-width: 768px) {
          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="tel"],
          select,
          textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
        </div>
        <Particles opacityMultiplier={0.6} />

        {/* Launch Modal - Hidden */}
        {/* <LaunchModal isOpen={showLaunchModal} onClose={() => setShowLaunchModal(false)} /> */}

        <div className="relative z-10 flex min-h-screen">
          {/* Left Panel - Hidden on mobile */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative">
            <div className="max-w-lg relative">
              {/* Animated Background Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/5 rounded-3xl blur-xl animate-pulse"></div>

              <div className="relative">
                {/* Logo */}
                <div className="mb-8 animate-float flex justify-center">
                  <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center backdrop-blur-sm border border-[#0FF1CE]/30">
                    <img
                      src="/shockwaveS.png"
                      alt="Shockwave Logo"
                      className="w-14 h-14 object-contain"
                      style={{ maxWidth: "56px", maxHeight: "56px" }}
                    />
                  </div>
                </div>
          
          

                {/* Welcome Text */}
                <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">
                  The Future of Trading
                </h1>
                <p className="text-xl text-gray-300 mb-12 leading-relaxed">
                  Become one of our elite traders in our high-octane trading environment.
                </p>

                {/* Feature Cards */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-[#1A1A1A]/50 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/30 transition-all">
                    <div className="w-12 h-12 bg-[#0FF1CE]/10 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[#0FF1CE]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">15% Max Drawdown</h3>
                      <p className="text-sm text-gray-400">Trade with confidence</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-[#1A1A1A]/50 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/30 transition-all">
                    <div className="w-12 h-12 bg-[#0FF1CE]/10 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#0FF1CE]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">1:200 Leverage</h3>
                      <p className="text-sm text-gray-400">Maximum trading power</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-[#1A1A1A]/50 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/30 transition-all">
                    <div className="w-12 h-12 bg-[#0FF1CE]/10 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-[#0FF1CE]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Up to 100% Profit Split</h3>
                      <p className="text-sm text-gray-400">Keep more of what you earn</p>

                    </div>
                  </div>
                </div>

                {/* New Launch Preview Button - Hidden */}
                {/* <div className="mt-8">
                  <button
                    onClick={() => setShowLaunchModal(true)}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#0FF1CE]/20 to-[#00D4FF]/20 rounded-xl border border-[#0FF1CE]/30 hover:from-[#0FF1CE]/30 hover:to-[#00D4FF]/30 transition-all group"
                  >
                    <Sparkles className="w-5 h-5 text-[#0FF1CE] group-hover:animate-pulse" />
                    <div className="text-left">
                      <h4 className="font-semibold text-[#0FF1CE]">New Launch Preview</h4>
                      <p className="text-xs text-gray-400">See what's coming next</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#0FF1CE] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div> */}
              </div>
            </div>
          </div>

          {/* Right Panel - Auth Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md">
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mb-8">
                <div className="inline-flex items-stretch rounded-2xl bg-black border border-[#0FF1CE]/30 px-4 py-3 w-full max-w-xs">
                  <div className="flex items-center justify-center w-1/4">
                    <img
                      src="/shockwaveS.png"
                      alt="Shockwave S"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div className="w-px bg-[#0FF1CE]/30 mx-3"></div>
                  <div className="flex items-center justify-center w-3/4">
                    <h2 className="text-lg font-bold text-[#0FF1CE] text-center leading-tight">Shockwave Capital</h2>
                  </div>
                </div>

                {/* Mobile Launch Preview Button - Hidden */}
                {/* <button
                  onClick={() => setShowLaunchModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0FF1CE]/10 rounded-lg border border-[#0FF1CE]/30 text-sm text-[#0FF1CE] hover:bg-[#0FF1CE]/20 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>See New Launch</span>
                </button> */}
              </div>
        

              {/* Mobile-only Stats Cards */}
              <div className="lg:hidden grid grid-cols-3 gap-2 px-2 mb-8">
                {[
                  { value: "15%", label: "Max Drawdown", delay: "0s" },
                  { value: "8%", label: "Daily Drawdown", delay: "0.1s" },
                  { value: "1:200", label: "Leverage", delay: "0.2s" }
                ].map(({ value, label, delay }) => (
                  <div
                    key={label}
                    className="group relative w-full bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-3 hover:scale-105 transition-all duration-300"
                    style={{
                      animation: `float 3s ease-in-out infinite`,
                      animationDelay: delay,
                      boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)'
                    }}
                  >
                    <div className="text-xl font-bold text-[#0FF1CE] mb-1">{value}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#0FF1CE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ))}
              </div>

              {/* Auth Header */}
              <div className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {isLogin ? 'Log into Shockwave' : 'Create Your Account'}
                </h1>
                <p className="text-sm text-gray-400">
                  {isLogin ? (
                    <>
                      Don't have a profile yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          setErrors({});
                        }}
                        className="text-[#0FF1CE] hover:underline font-semibold"
                      >
                        create a profile
                      </button>
                    </>
                  ) : (
                    <>
                      Already have a profile?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setErrors({});
                        }}
                        className="text-[#0FF1CE] hover:underline font-semibold"
                      >
                        sign in
                      </button>
                    </>
                  )}
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="w-3/4 lg:w-full mx-auto lg:mx-0 flex bg-[#1A1A1A]/30 backdrop-blur-sm rounded-xl p-1 mb-8">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setErrors({});
                  }}
                  className={`flex-1 py-2 lg:py-3 px-4 rounded-lg font-semibold text-sm lg:text-base transition-all duration-300 ${isLogin
                      ? 'bg-[#0FF1CE] text-black'
                      : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setErrors({});
                  }}
                  className={`flex-1 py-2 lg:py-3 px-4 rounded-lg font-semibold text-sm lg:text-base transition-all duration-300 ${!isLogin
                      ? 'bg-[#0FF1CE] text-black'
                      : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Promo Badge - Simplified for mobile */}
              <div className="mb-6 hidden">
                <div className="p-4 bg-gradient-to-r from-[#0FF1CE]/10 to-[#5059FC]/10 rounded-xl border border-[#0FF1CE]/20 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#0FF1CE]/20 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="inline-block px-4 py-1 rounded-full bg-[#0FF1CE]/20 text-[#0FF1CE] font-bold uppercase tracking-wider text-sm mb-3">
                      50% Off All Challenges + 1 Free Retry
                    </div>
                    <ul className="text-white text-sm space-y-3 text-left mt-3 max-w-md mx-auto">
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0FF1CE]" />
                        <span>
                          <span className="font-bold text-[#ffffff]">Use code:</span>{' '}
                          <span className="font-mono bg-[#0FF1CE]/15 text-[#0FF1CE] px-2 py-0.5 rounded font-semibold tracking-wide ml-1">ONEYEAR</span>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0FF1CE]" />
                        <span>
                          <span className="text-gray-400">One Year Anniversary Sale • limited time</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
         
         

              {success && (
                <div className="mb-6 p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl text-green-400 flex items-center gap-2 animate-slideIn">
                  <Check size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              {errors.general && (
                <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 animate-shake">
                  <AlertCircle size={18} />
                  <span className="text-sm">{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <>
                    <FloatingLabelInput
                      id="firstName"
                      label="First Name"
                      icon={User}
                      value={formData.firstName}
                      onChange={(value) => setFormData({ ...formData, firstName: value })}
                      error={errors.firstName}
                      required
                    />
                    <FloatingLabelInput
                      id="lastName"
                      label="Last Name"
                      icon={User}
                      value={formData.lastName}
                      onChange={(value) => setFormData({ ...formData, lastName: value })}
                      error={errors.lastName}
                      required
                    />
                    <FloatingLabelInput
                      id="phone"
                      label="Phone Number"
                      icon={Phone}
                      type="tel"
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      error={errors.phone}
                      required
                    />
                    <div>
                      <label htmlFor="country" className="mb-2 block text-sm text-gray-400">Country</label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className={`w-full rounded-xl border bg-[#1A1A1A]/50 px-4 py-4 text-sm text-white focus:outline-none md:text-base ${errors.country ? 'border-red-500/50' : 'border-[#2F2F2F]/50'}`}
                        required
                      >
                        <option value="">Select country</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>{country.name}</option>
                        ))}
                      </select>
                      {errors.country && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-red-400 md:text-sm">
                          <AlertCircle size={14} />
                          {errors.country}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <FloatingLabelInput
                  id="email"
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                  error={errors.email}
                  required
                />

                <FloatingLabelInput
                  id="password"
                  label="Password"
                  icon={Lock}
                  type="password"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  error={errors.password}
                  required
                />

                {!isLogin && (
                  <>
                    <p className={`-mt-2 text-xs ${formData.password.length >= 6 ? 'text-[#0FF1CE]' : 'text-gray-500'}`}>
                      At least 6 characters. Use the eye icon to view it, then retype it below.
                    </p>
                    <FloatingLabelInput
                      id="confirmPassword"
                      label="Retype Password"
                      icon={Lock}
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                      error={errors.confirmPassword}
                      required
                    />
                  </>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]/50 backdrop-blur-sm"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                  </label>
                </div>

                {/* Simplified Disclaimer for Mobile */}
                <div className="space-y-2 md:space-y-3">
                  <label className="flex items-start gap-2 md:gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="disclaimer"
                      checked={acceptDisclaimer}
                      onChange={(e) => setAcceptDisclaimer(e.target.checked)}
                      className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]/50 backdrop-blur-sm mt-0.5"
                    />
                    <span className="text-[11px] leading-snug md:text-xs md:leading-normal text-gray-400 group-hover:text-gray-300 transition-colors">
                      <span className="md:hidden">
                        I agree to the{' '}
                        <Link href="/terms" className="text-[#0FF1CE] hover:underline">Terms</Link>,{' '}
                        <Link href="/privacy" className="text-[#0FF1CE] hover:underline">Privacy</Link> &{' '}
                        <Link href="/disclaimer" className="text-[#0FF1CE] hover:underline">Disclaimer</Link>
                      </span>
                      <span className="hidden md:inline">
                        I acknowledge the simulated environment and agree to the{' '}
                        <Link href="/terms" className="text-[#0FF1CE] hover:underline">Terms</Link>,{' '}
                        <Link href="/privacy" className="text-[#0FF1CE] hover:underline">Privacy</Link>, and{' '}
                        <Link href="/disclaimer" className="text-[#0FF1CE] hover:underline">Disclaimer</Link>
                      </span>
                    </span>
                  </label>

                  {!isLogin && (
                    <label className="flex items-start gap-2 md:gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]/50 backdrop-blur-sm mt-0.5"
                      />
                      <span className="text-[11px] leading-snug md:text-xs md:leading-normal text-gray-400 group-hover:text-gray-300 transition-colors">
                        <span className="md:hidden">I accept the Terms &amp; Privacy Policy</span>
                        <span className="hidden md:inline">I accept the Terms of Service and Privacy Policy</span>
                      </span>
                    </label>
                  )}

                  {(errors.disclaimer || errors.terms) && (
                    <p className="text-xs text-red-400 flex items-center gap-1 animate-shake">
                      <AlertCircle size={14} />
                      {errors.disclaimer || errors.terms}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative w-full bg-[#0FF1CE] text-black font-bold py-4 px-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </form>

              <div className="hidden lg:block mt-6 text-center">
                <p className="text-sm text-gray-400">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setErrors({});
                      setSuccess('');
                    }}
                    className="text-[#0FF1CE] hover:underline font-semibold"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>

              {/* Compact Disclaimer for Mobile */}
              <div className="mt-8">
                <details className="group">
                  <summary className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                    <Shield className="w-4 h-4 text-orange-400" />
                    <span>Important Disclaimer</span>
                    <span className="ml-auto group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-4 p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20 text-xs text-gray-400 space-y-2 animate-slideIn">
                    <p>⚠️ <strong>Shockwave Capital offers access to a simulated trading environment for the sole purpose of evaluating trading skill and discipline.</strong> All trading activity occurs on demo accounts using real-time market data. No actual capital is deposited, invested, or traded on behalf of users.</p>

                    <p>References to "funding," "capital," "payouts," or "profit splits" pertain exclusively to performance-based simulations and do not imply the transfer or management of real funds.</p>

                    <p>Participation in Shockwave Capital's programs is strictly for educational and evaluative purposes and does not constitute financial advice, investment services, or brokerage activity.</p>

                    <p className="text-orange-400 font-semibold pt-2">By signing up or logging in, you confirm that:</p>

                    <ul className="space-y-1 ml-4 list-disc">
                      <li>You are not participating in real-money or live trading.</li>
                      <li>You understand this platform is not a broker-dealer, investment advisor, or asset management firm.</li>
                      <li>Any rewards, incentives, or performance-based milestones are tied to simulated results and subject to our internal review and compliance criteria.</li>
                      <li>You accept these terms and agree to our full Terms of Use and Privacy Policy.</li>
                    </ul>

                    <p className="text-orange-400 font-semibold pt-2">If you do not agree to these conditions, please do not proceed.</p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </>
  );
} 