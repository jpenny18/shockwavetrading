'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  auth,
  getVIPActivation,
  updateVIPActivation,
  recordVIPPageVisit,
  getUser,
  uploadFile,
  getUserVipMetaApiAccounts,
  getCachedMetrics,
  VIPActivation,
  UserMetaApiAccount,
  Timestamp
} from '@/lib/firebase';
import { formatVipAllocation, getVipTierName, VIP_RULES } from '@/lib/vip-accounts';
import CryptoPayment from '@/app/components/CryptoPayment';
import VipLoginCredentialsAccordion from '@/app/components/VipLoginCredentials';
import VipProfitTracker from '@/app/components/VipProfitTracker';
import {
  Crown,
  Lock,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Loader2,
  FileText,
  Shield,
  ChevronRight,
  Trash2,
  ArrowLeft,
  Building2,
  Bitcoin,
  Eye,
  Check
} from 'lucide-react';

interface CryptoPrice {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

interface BillingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  platform: string;
  discordUsername: string;
}

export default function VIPPortalPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(true);
  const [activation, setActivation] = useState<VIPActivation | null>(null);
  const [vipAccounts, setVipAccounts] = useState<(UserMetaApiAccount & { cachedMetrics?: any })[]>([]);

  // Payment
  const [paymentView, setPaymentView] = useState<'summary' | 'crypto'>('summary');
  const [billingData, setBillingData] = useState<BillingForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    platform: 'MT5',
    discordUsername: ''
  });
  const [billingErrors, setBillingErrors] = useState<Partial<BillingForm>>({});
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice>({ BTC: 0, ETH: 0, USDT: 1, USDC: 1 });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  // KYB (corporate docs + terms)
  const [companyName, setCompanyName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [customTermsAccepted, setCustomTermsAccepted] = useState(false);
  const [activeTermsTab, setActiveTermsTab] = useState<'funded' | 'custom'>('funded');
  const [isSubmittingKyb, setIsSubmittingKyb] = useState(false);
  const [kybError, setKybError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/access');
      return;
    }
    loadData(user.uid);
  }, [user, authLoading, router]);

  // Fetch crypto prices (needed for the payment step)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices', { cache: 'no-store' });
        const data = await response.json();
        if (data?.BTC && data?.ETH) {
          setCryptoPrices(data);
        }
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (uid: string) => {
    try {
      setIsLoading(true);
      const vip = await getVIPActivation(uid);
      setActivation(vip);

      if (vip) {
        recordVIPPageVisit(uid);

        try {
          const accounts = await getUserVipMetaApiAccounts(uid);
          const withMetrics = await Promise.all(accounts.map(async (account) => ({
            ...account,
            cachedMetrics: await getCachedMetrics(account.accountId)
          })));
          setVipAccounts(withMetrics);
        } catch (accountsError) {
          console.error('Error loading VIP trading accounts:', accountsError);
          setVipAccounts([]);
        }

        if (vip.companyName) setCompanyName(vip.companyName);

        // Prefill billing details from the user profile
        try {
          const profile = await getUser(uid);
          setBillingData(prev => ({
            ...prev,
            firstName: profile?.firstName || '',
            lastName: profile?.lastName || '',
            email: user?.email || profile?.email || '',
            phone: profile?.phone || '',
            country: profile?.country || '',
            platform: vip.platform || 'MT5'
          }));
        } catch (profileError) {
          console.error('Error loading user profile:', profileError);
          setBillingData(prev => ({ ...prev, email: user?.email || '' }));
        }
      }
    } catch (error) {
      console.error('Error loading VIP activation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActivation = async () => {
    if (!user) return;
    try {
      const vip = await getVIPActivation(user.uid);
      setActivation(vip);
    } catch (error) {
      console.error('Error refreshing VIP activation:', error);
    }
  };

  const validateBilling = (): boolean => {
    const errors: Partial<BillingForm> = {};

    if (!billingData.firstName.trim()) errors.firstName = 'First name is required';
    if (!billingData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!billingData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(billingData.email)) errors.email = 'Invalid email format';
    if (!billingData.phone.trim()) errors.phone = 'Phone number is required';
    if (!billingData.country.trim()) errors.country = 'Country is required';
    if (!billingData.platform.trim()) errors.platform = 'Platform selection is required';

    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToCrypto = async () => {
    if (!validateBilling()) return;
    setIsRefreshingPrices(true);
    try {
      const response = await fetch('/api/crypto/prices', { cache: 'no-store' });
      const data = await response.json();
      if (data?.BTC && data?.ETH) {
        setCryptoPrices(data);
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    } finally {
      setIsRefreshingPrices(false);
      setPaymentView('crypto');
    }
  };

  const getChallengeData = () => {
    if (!activation) return null;

    return {
      type: 'vip-activation',
      amount: activation.accountSize,
      platform: billingData.platform,
      formData: {
        firstName: billingData.firstName,
        lastName: billingData.lastName,
        email: billingData.email,
        phone: billingData.phone,
        country: billingData.country,
        discordUsername: billingData.discordUsername
      },
      price: activation.price,
      addOns: []
    };
  };

  const handlePaymentSubmitted = async (orderId: string) => {
    if (!user) return;
    try {
      await updateVIPActivation(user.uid, {
        paymentStatus: 'pending',
        cryptoOrderId: orderId,
        paymentSubmittedAt: Timestamp.now(),
        platform: billingData.platform
      });
    } catch (error) {
      console.error('Error updating VIP payment status:', error);
    }
    setPaymentView('summary');
    await refreshActivation();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      setKybError('');
    }
    // Reset the input so the same file can be re-selected if removed
    e.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const existingDocs = activation?.documents?.corporateDocs || [];
  const agreementAlreadySigned = !!activation?.documents?.agreementSignedAt;
  const hasCustomTerms = !!activation?.customTerms?.content;
  const customTermsTitle = activation?.customTerms?.title || 'Additional Account Terms';
  const customTermsAlreadySigned = !!activation?.documents?.customTermsSignedAt;

  const handleKybSubmit = async () => {
    if (!user || !activation) return;

    if (existingDocs.length === 0 && selectedFiles.length === 0) {
      setKybError('Please upload at least one corporate/KYB document');
      return;
    }
    if (!agreementAlreadySigned && !agreementAccepted) {
      setKybError('Please review and accept the account terms');
      return;
    }
    if (hasCustomTerms && !customTermsAlreadySigned && !customTermsAccepted) {
      setKybError(`Please review and accept the ${customTermsTitle}`);
      return;
    }

    try {
      setIsSubmittingKyb(true);
      setKybError('');

      // Upload any newly selected documents to Firebase Storage
      const uploadedDocs = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop();
        const path = `vip/${user.uid}/corporate-doc-${Date.now()}-${i}.${ext}`;
        const url = await uploadFile(file, path);
        uploadedDocs.push({
          url,
          fileName: file.name,
          uploadedAt: Timestamp.now()
        });
      }

      const documentsUpdate: VIPActivation['documents'] = {
        corporateDocs: [...existingDocs, ...uploadedDocs]
      };
      if (!agreementAlreadySigned) {
        documentsUpdate.agreementSignedAt = Timestamp.now();
      }
      if (hasCustomTerms && !customTermsAlreadySigned) {
        documentsUpdate.customTermsSignedAt = Timestamp.now();
      }

      const update: Partial<VIPActivation> = {
        kybStatus: 'pending',
        kybSubmittedAt: Timestamp.now(),
        documents: documentsUpdate
      };
      if (companyName.trim()) {
        update.companyName = companyName.trim();
      }

      await updateVIPActivation(user.uid, update);

      setSelectedFiles([]);
      await refreshActivation();
    } catch (error) {
      console.error('Error submitting KYB documents:', error);
      setKybError('Failed to submit documents. Please try again.');
    } finally {
      setIsSubmittingKyb(false);
    }
  };

  const getPaymentBadge = () => {
    if (!activation) return null;
    const config = {
      unpaid: { color: 'bg-gray-500', icon: Clock, text: 'Payment Required' },
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Payment Pending Confirmation' },
      completed: { color: 'bg-green-500', icon: CheckCircle, text: 'Payment Confirmed' }
    };
    const { color, icon: Icon, text } = config[activation.paymentStatus];
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${color}/20 text-white`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{text}</span>
      </div>
    );
  };

  const getKybBadge = () => {
    if (!activation) return null;
    const config = {
      not_submitted: { color: 'bg-gray-500', icon: FileText, text: 'Documents Required' },
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Documents Under Review' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Documents Approved' },
      rejected: { color: 'bg-red-500', icon: XCircle, text: 'Documents Rejected' },
      needs_resubmission: { color: 'bg-orange-500', icon: RefreshCw, text: 'Resubmission Required' }
    };
    const { color, icon: Icon, text } = config[activation.kybStatus];
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${color}/20 text-white`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{text}</span>
      </div>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  // Locked state - no VIP activation created by admin for this user
  if (!activation) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#2F2F2F]/50">
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mx-auto mb-6">
            <Lock className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent text-center mb-4">
            VIP Portal Locked
          </h1>
          <p className="text-gray-400 text-center mb-6">
            The VIP portal is unlocked by our team for approved traders with a custom allocation offer.
            If you have agreed on a VIP allocation with us and don't see it here, please contact support.
          </p>
          <button
            onClick={() => router.push('/dashboard/support')}
            className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
          >
            Contact Support
          </button>
        </div>
      </div>
    );
  }

  const savings =
    activation.publicPrice && activation.publicPrice > activation.price
      ? activation.publicPrice - activation.price
      : 0;

  const showKybForm =
    activation.kybStatus === 'not_submitted' ||
    activation.kybStatus === 'rejected' ||
    activation.kybStatus === 'needs_resubmission';

  // Step flow: 1 Payment -> 2 Terms -> 3 Documents (steps stay interactive; the rail is a visual guide)
  const paymentStepDone =
    activation.paymentStatus === 'pending' || activation.paymentStatus === 'completed';
  const termsStepDone =
    (agreementAlreadySigned || agreementAccepted) &&
    (!hasCustomTerms || customTermsAlreadySigned || customTermsAccepted);
  const docsStepDone =
    activation.kybStatus === 'pending' || activation.kybStatus === 'approved';
  const stepDoneList = [paymentStepDone, termsStepDone, docsStepDone];
  const currentVipStep = !paymentStepDone ? 1 : !termsStepDone ? 2 : !docsStepDone ? 3 : 4;

  const getVipStepState = (step: number): 'complete' | 'current' | 'upcoming' => {
    if (stepDoneList[step - 1]) return 'complete';
    if (step === currentVipStep) return 'current';
    return 'upcoming';
  };

  const renderStepCircle = (step: number) => {
    const state = getVipStepState(step);
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-500 shrink-0 ${
          state === 'complete'
            ? 'bg-[#0FF1CE] border-[#0FF1CE] text-black shadow-[0_0_12px_rgba(15,241,206,0.45)]'
            : state === 'current'
              ? 'bg-[#0FF1CE]/15 border-[#0FF1CE] text-[#0FF1CE] shadow-[0_0_12px_rgba(15,241,206,0.35)]'
              : 'bg-[#151515] border-[#2F2F2F] text-gray-500'
        }`}
      >
        {state === 'complete' ? <Check size={16} strokeWidth={3} /> : step}
      </div>
    );
  };

  const renderStepRail = (step: number, showConnector = true) => {
    const state = getVipStepState(step);
    const connectorFilled = stepDoneList[step - 1];
    return (
      <div className="flex flex-col items-center self-stretch shrink-0">
        {renderStepCircle(step)}
        {showConnector && (
          <div className="w-0.5 flex-1 min-h-[1.5rem] mt-2 bg-[#2F2F2F] rounded-full overflow-hidden relative">
            <div
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#0FF1CE] to-[#00D4FF] transition-all duration-700 ease-out rounded-full"
              style={{ height: connectorFilled ? '100%' : state === 'current' ? '40%' : '0%' }}
            />
          </div>
        )}
      </div>
    );
  };

  const stepHeadingClass = (step: number) =>
    `text-lg font-semibold mb-3 flex items-center gap-2 transition-colors duration-300 ${
      getVipStepState(step) === 'upcoming' ? 'text-gray-500' : 'text-[#0FF1CE]'
    }`;

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Decorative glow orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000 pointer-events-none"></div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent flex items-center gap-3">
            <Crown className="w-8 h-8 text-[#0FF1CE]" />
            VIP Portal
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {getPaymentBadge()}
            {getKybBadge()}
          </div>
        </div>
        <p className="text-gray-400">
          Your exclusive VIP allocation. Complete onboarding below, then track live account metrics, drawdown, and profit split in VIP Accounts.
        </p>
      </div>

      {/* Review Notes from admin */}
      {activation.reviewNotes && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-500 mb-1">Review Notes</p>
              <p className="text-sm text-gray-300">{activation.reviewNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Offer Summary */}
      <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#0FF1CE]/20 mb-8" style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {activation.tierName && (
              <div className="inline-block bg-[#0FF1CE]/10 text-[#0FF1CE] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
                {activation.tierName}
              </div>
            )}
            <div className="text-3xl font-bold text-[#0FF1CE]">{activation.accountSize} Allocation</div>
            <div className="text-gray-400 text-sm mt-1">
              VIP Funded Account{activation.platform ? ` - ${activation.platform}` : ''}
            </div>
          </div>
          <div className="text-left md:text-right">
            {savings > 0 && (
              <div className="text-gray-500 line-through text-lg">
                ${activation.publicPrice!.toLocaleString()}
              </div>
            )}
            <div className="text-3xl font-bold text-white">${activation.price.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">One-Time Fee</div>
            {savings > 0 && (
              <div className="inline-block mt-2 bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                You save ${savings.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {vipAccounts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#0FF1CE]" />
              VIP Trading Accounts
            </h2>
            <button
              onClick={() => router.push('/dashboard/vip/accounts')}
              className="text-sm text-[#0FF1CE] hover:underline inline-flex items-center gap-1"
            >
              View all
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vipAccounts.map((account) => {
              const profit = (account.cachedMetrics?.balance || account.accountSize) - account.accountSize;
              return (
                <div
                  key={account.accountId}
                  className="text-left bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-5 hover:border-[#0FF1CE]/30 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/vip/accounts/${account.accountId}`)}
                    className="w-full text-left"
                  >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold">Shockwave VIP</p>
                      <p className="text-sm text-gray-400">
                        {formatVipAllocation(account.accountSize)} • {getVipTierName(account.accountSize)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      account.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      account.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      account.status === 'passed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {account.status.toUpperCase()}
                    </span>
                  </div>
                  {account.cachedMetrics && (
                    <div className="mb-3">
                      <VipProfitTracker
                        compact
                        profit={profit}
                        profitSplit={account.profitSplit}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {VIP_RULES.maxDrawdown}% / {VIP_RULES.maxDailyDrawdown}% drawdown
                  </p>
                  </button>
                  <VipLoginCredentialsAccordion
                    credentials={account.loginCredentials}
                    platform={account.platform}
                    emptyMessage="Login details will appear here after your VIP account is connected with broker credentials."
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Payment */}
      <div className="flex gap-3 sm:gap-4">
        {renderStepRail(1)}
        <div className="flex-1 min-w-0 pb-8">
          <h2 className={stepHeadingClass(1)}>
            <Bitcoin className="w-5 h-5" />
            Payment
          </h2>
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#2F2F2F]/50 relative">
        {isProcessingPayment && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Processing payment...</p>
            </div>
          </div>
        )}

        {activation.paymentStatus === 'completed' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Payment Confirmed</h3>
            <p className="text-gray-400 max-w-xl mx-auto">
              Your payment for the {activation.accountSize} VIP allocation has been confirmed.
              {activation.kybStatus !== 'approved' && ' Please make sure your corporate documents below are submitted and approved to complete your onboarding.'}
            </p>
          </div>
        )}

        {activation.paymentStatus === 'pending' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Payment Submitted</h3>
            <p className="text-gray-400 mb-2 max-w-xl mx-auto">
              We've received your payment submission and our team is verifying it on-chain.
              This may take up to 30 minutes depending on network conditions.
            </p>
            {activation.cryptoOrderId && (
              <p className="text-gray-500 text-sm">
                Order Reference: <span className="text-[#0FF1CE] font-mono">{activation.cryptoOrderId}</span>
              </p>
            )}
          </div>
        )}

        {activation.paymentStatus === 'unpaid' && paymentView === 'summary' && (
          <div>
            <p className="text-gray-400 mb-6">
              Confirm your details below, then complete your payment with cryptocurrency (BTC, ETH, USDT or USDC).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                <input
                  type="text"
                  value={billingData.firstName}
                  onChange={(e) => setBillingData({ ...billingData, firstName: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="John"
                />
                {billingErrors.firstName && <p className="text-red-500 text-sm mt-1">{billingErrors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                <input
                  type="text"
                  value={billingData.lastName}
                  onChange={(e) => setBillingData({ ...billingData, lastName: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
                {billingErrors.lastName && <p className="text-red-500 text-sm mt-1">{billingErrors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={billingData.email}
                  onChange={(e) => setBillingData({ ...billingData, email: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="john.doe@example.com"
                />
                {billingErrors.email && <p className="text-red-500 text-sm mt-1">{billingErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={billingData.phone}
                  onChange={(e) => setBillingData({ ...billingData, phone: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="+1 (555) 123-4567"
                />
                {billingErrors.phone && <p className="text-red-500 text-sm mt-1">{billingErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                <input
                  type="text"
                  value={billingData.country}
                  onChange={(e) => setBillingData({ ...billingData, country: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="United States"
                />
                {billingErrors.country && <p className="text-red-500 text-sm mt-1">{billingErrors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Trading Platform</label>
                <select
                  value={billingData.platform}
                  onChange={(e) => setBillingData({ ...billingData, platform: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                >
                  <option value="MT5">MetaTrader 5 (MT5)</option>
                  <option value="MT4">MetaTrader 4 (MT4)</option>
                </select>
                {billingErrors.platform && <p className="text-red-500 text-sm mt-1">{billingErrors.platform}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Discord Username (Optional)</label>
                <input
                  type="text"
                  value={billingData.discordUsername}
                  onChange={(e) => setBillingData({ ...billingData, discordUsername: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="Your Discord username"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#2F2F2F]/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-white font-semibold">{activation.accountSize} VIP Allocation</div>
                <div className="text-[#0FF1CE] text-2xl font-bold">${activation.price.toLocaleString()}</div>
              </div>
              <button
                onClick={handleProceedToCrypto}
                disabled={cryptoPrices.BTC === 0 || isRefreshingPrices}
                className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black px-8 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cryptoPrices.BTC === 0 || isRefreshingPrices ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading Prices...
                  </>
                ) : (
                  <>
                    Pay with Crypto
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activation.paymentStatus === 'unpaid' && paymentView === 'crypto' && (
          <div>
            <button
              onClick={() => setPaymentView('summary')}
              className="flex items-center gap-2 text-gray-400 hover:text-[#0FF1CE] text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to details
            </button>

            <div className="flex items-center justify-between p-4 bg-[#151515]/50 rounded-xl border border-[#2F2F2F]/50 mb-2">
              <div>
                <div className="text-white font-semibold">{activation.accountSize} VIP Allocation</div>
                <div className="text-gray-400 text-sm">{billingData.platform} - {billingData.email}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#0FF1CE]">${activation.price.toLocaleString()}</div>
                <div className="text-gray-400 text-sm">One-Time Fee</div>
              </div>
            </div>

            <div className="-mx-6">
              <CryptoPayment
                challengeData={getChallengeData()}
                successRedirectPath="/dashboard/vip"
                onProcessingStateChange={setIsProcessingPayment}
                cryptoPrices={cryptoPrices}
                onPaymentSubmitted={handlePaymentSubmitted}
              />
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Step 2: Review & accept terms */}
      <div className="flex gap-3 sm:gap-4">
        {renderStepRail(2)}
        <div className="flex-1 min-w-0 pb-8">
          <h2 className={stepHeadingClass(2)}>
            <Shield className="w-5 h-5" />
            Review &amp; Accept Terms
          </h2>
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#2F2F2F]/50">
            <p className="text-gray-400 text-sm mb-4">
              {hasCustomTerms
                ? 'Your account has two agreements. Open each tab, review it carefully, then sign both electronically below.'
                : 'Review the agreement carefully, then sign it electronically below.'}
            </p>

            {/* Account Terms */}
            <div>
              {hasCustomTerms && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTermsTab('funded')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      activeTermsTab === 'funded'
                        ? 'bg-[#0FF1CE]/10 text-[#0FF1CE] border-[#0FF1CE]/50'
                        : 'bg-[#151515]/50 text-gray-400 border-[#2F2F2F] hover:text-white'
                    }`}
                  >
                    Funded Trader Agreement{(agreementAlreadySigned || agreementAccepted) ? ' ✓' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTermsTab('custom')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      activeTermsTab === 'custom'
                        ? 'bg-[#0FF1CE]/10 text-[#0FF1CE] border-[#0FF1CE]/50'
                        : 'bg-[#151515]/50 text-gray-400 border-[#2F2F2F] hover:text-white'
                    }`}
                  >
                    {customTermsTitle}{(customTermsAlreadySigned || customTermsAccepted) ? ' ✓' : ''}
                  </button>
                </div>
              )}

              <div className="bg-[#0D0D0D]/60 backdrop-blur-sm border border-[#2F2F2F]/50 rounded-xl p-6 mb-4 max-h-96 overflow-y-auto">
                {hasCustomTerms && activeTermsTab === 'custom' ? (
                  <div className="text-sm text-gray-400">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-white">{customTermsTitle}</h3>
                    </div>
                    <div className="whitespace-pre-line leading-relaxed">
                      {activation.customTerms?.content}
                    </div>
                  </div>
                ) : (
                <div className="space-y-6 text-sm text-gray-400">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">SHOCKWAVE CAPITAL FUNDED TRADER AGREEMENT</h3>
                    <p className="text-xs">
                      This Agreement ("Agreement") is entered into and made effective as of the date of the last signature by and between Shockwave Capital, a division of Ascendant Capital Investments LTD (hereinafter referred to as the "Company"), and the Trader, in connection with the Trader's access to a Simulated Funded Account. For good and valuable consideration, the parties hereby agree to the following:
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">1. Right to Simulated Trading</h4>
                    <p className="mb-2">
                      The Trader is granted a limited, non-transferable license to engage in simulated trading activity via a virtual demo account provided by the Company (the "Simulated Account"), which may reflect real-time financial market data from the foreign exchange (FOREX) or other financial markets. Access to the Simulated Account is conditional upon compliance with the terms of this Agreement and any associated Shockwave Capital programs, products, and policies. The Trader expressly acknowledges and agrees:
                    </p>
                    <p className="mb-2">The Simulated Account is wholly owned by the Company and does not represent access to real capital.</p>
                    <p className="mb-2">All performance in the Simulated Account is strictly for evaluation purposes.</p>
                    <p className="mb-2">Any potential remuneration, including simulated "payouts," is entirely discretionary and subject to Company assessment of whether the Trader's activity is aligned with realistic and acceptable trading behavior as determined solely by the Company.</p>
                    <p className="mb-2">The Trader's activity within the Simulated Account must remain confidential. Disclosure or misuse of proprietary strategies, data, or account access will result in immediate termination of this Agreement under Section 15.</p>
                    <p>The Company may, at its sole discretion and without obligation, request the Trader to disclose the methodology or strategy used during trading. Refusal to cooperate may result in termination of this Agreement with immediate effect.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">2. Capital and Risk Policy</h4>
                    <p className="mb-2">
                      While the Company does not instruct or influence the Trader's trading decisions or strategy, the Trader must adhere to predefined risk parameters. Specifically:
                    </p>
                    <p className="mb-2">The Trader's Simulated Account equity (including open and closed positions, commissions, and swaps) must not fall below 85% of the original simulated starting balance at any time.</p>
                    <p className="mb-2">Violation of this rule will result in automatic closure of all open trades and revocation of account access without prior notice.</p>
                    <p>The Company retains the right to immediately terminate this Agreement pursuant to Section 15 if this rule is breached.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">3. Acknowledgements and Limitations</h4>
                    <p className="mb-2">The Trader acknowledges and agrees to the following:</p>
                    <p className="mb-2">The Simulated Account does not involve real capital, and no actual profits, losses, or financial transactions occur.</p>
                    <p className="mb-2">The Company alone will determine whether the Trader's simulated performance constitutes behavior that reasonably reflects trading in real financial markets.</p>
                    <p className="mb-2">The Company is under no obligation to issue any form of compensation, payment, or simulated payout unless it elects to do so, entirely at its discretion.</p>
                    <p>The Company may terminate this Agreement at any time, with or without notice, for any reason, including but not limited to breaches, suspicion of manipulation, or strategic concerns, as set forth in Section 15.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">4. Right to Discretionary Remuneration</h4>
                    <p className="mb-2">
                      Subject to the conditions of this Agreement and the sole discretion of the Company, the Trader may be eligible for discretionary simulated remuneration based on the performance achieved within the Simulated Account. Any such payout is calculated based on net profits generated from closed trades, but only when the Company determines that trading activity closely reflects real-world market conditions.
                    </p>
                    <p className="mb-2">Remuneration cycles are assessed on a rolling 30-day basis, beginning either from the Trader's first day of trading or from the day following the most recent payout.</p>
                    <p className="mb-2">When eligible, the Trader may receive the agreed profit split of the net positive difference between the closing balance and the initial simulated capital in the funded account.</p>
                    <p className="mb-2">Payouts are not guaranteed. The Company retains absolute discretion to reject or modify the payout calculation or disbursement based on its internal assessment of trade legitimacy, realism, and strategy.</p>
                    <p className="mb-2">The Trader may only invoice the Company after receiving written confirmation of payout eligibility. Payment, when approved, shall be issued within 14 days of a valid invoice.</p>
                    <p>Shockwave Capital reserves the right to deny, withhold, adjust, or permanently cancel any and all remuneration without notice if trading behavior is deemed unrealistic, manipulative, or in violation of this Agreement.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">5. Compliance with Terms, Broker Policies, and Trading Guidelines</h4>
                    <p className="mb-2">The Trader agrees not to engage in any form of trading behavior that:</p>
                    <p className="mb-2">Violates the normal operation and logic of real-world financial markets,</p>
                    <p className="mb-2">Contravenes the rules and guidelines of the brokerage platform used,</p>
                    <p className="mb-2">Violates the Company's current Terms, Risk Disclaimers, and Program Conditions as published at: https://shockwave-capital.com/disclaimer,</p>
                    <p className="mb-2">Breaches the trading limits or drawdown requirements set forth in Section 2 of this Agreement,</p>
                    <p className="mb-2">Conflicts with any binding legal or regulatory framework applicable under Cayman Islands jurisdiction.</p>
                    <p>Any violation of the above conditions will void the Trader's eligibility for simulated remuneration, and the Company may immediately terminate this Agreement pursuant to Section 15.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">6. Legal Compliance</h4>
                    <p>
                      By signing this Agreement, the Trader agrees to adhere to all regulations applicable in the Cayman Islands or the jurisdiction in which the Company operates, including but not limited to trading restrictions, tax compliance, and financial reporting. The Trader is solely responsible for acquiring any permits or authorizations necessary to participate in simulated trading activities.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">7. Conflicts of Interest</h4>
                    <p>
                      The Trader agrees to immediately disclose to the Company any personal or financial interests in activities that may present a conflict of interest with Shockwave Capital, including affiliations with competing firms or proprietary trading systems that may be in direct competition or conflict with the Company's operations.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">8. Confidentiality & Ownership of Work Product</h4>
                    <p>
                      The Trader shall maintain strict confidentiality over any and all proprietary information, technology, strategies, or internal processes shared or accessed during the course of this Agreement. The Trader shall not reproduce, trademark, patent, or claim ownership over any intellectual property or derivative work created during their time with Shockwave Capital unless expressly agreed to in writing by the Company.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">9. Data Usage and Processing Consent</h4>
                    <p className="mb-2">The Trader acknowledges and consents to the Company's use of personal data for the following purposes:</p>
                    <p className="mb-2">Execution and administration of this Agreement;</p>
                    <p className="mb-2">Evaluation of trading performance and compliance across Shockwave Capital's customer base;</p>
                    <p className="mb-2">Internal auditing, dispute resolution, and compliance reporting;</p>
                    <p className="mb-2">Integration with third-party systems and platforms used by the Company for account, analytics, or communication management.</p>
                    <p>All data processing is performed in accordance with applicable privacy and data protection regulations. By signing this Agreement, the Trader grants permission for their personal and trading data to be processed and stored accordingly.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">10. Third-Party Data Sharing</h4>
                    <p className="mb-2">The Company may disclose or transfer the Trader's personal data to third parties, including technology partners, data processors, regulatory agencies, or foreign governments, only as necessary to:</p>
                    <p className="mb-2">Execute the terms of this Agreement;</p>
                    <p className="mb-2">Comply with applicable laws, regulations, and government requests;</p>
                    <p className="mb-2">Support systems or platforms necessary for account operation, billing, and compliance.</p>
                    <p>Unless prohibited by law, Shockwave Capital will notify the Trader of any such data disclosures.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">11. Right to Access and Correction</h4>
                    <p>
                      The Trader retains the right to access their personal data and request corrections if any of the information held is inaccurate or being processed in violation of applicable data protection laws. Any such requests must be submitted in writing, and the Company will evaluate the request within a reasonable timeframe.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">12. Return of Property</h4>
                    <p>
                      The Trader agrees to immediately return, upon request or upon termination of this Agreement, any Company-owned materials, content, data, internal documentation, software, strategy-related tools, or electronic devices related to Shockwave Capital. This includes all digital or physical copies, notes, and storage media. Copying, saving, or reproducing Company property in any form is strictly prohibited and may result in legal action.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">13. Risk Management Violations</h4>
                    <p className="mb-2">
                      The Trader agrees to employ sound and reasonable risk management practices while trading on the Shockwave Capital Simulated Account, in line with the risk parameters communicated for their specific account and program.
                    </p>
                    <p className="mb-2">Trading behavior deemed the result of reckless, unrealistic, or gambling-style trading may trigger an account review. The Company reserves the right to immediately terminate the Agreement and withhold all pending or future remuneration in such cases.</p>
                    <p>Violations of these conditions will be interpreted as speculative or abusive use of the platform, and the Company may exercise its right to termination as outlined in Section 15.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">14. Binding Documents</h4>
                    <p>
                      The Trader confirms that they have read, understood, and agree to all of Shockwave Capital's published legal terms, including the General Terms, Conditions, and Disclaimers (GTCD) and Privacy Policy, both of which are incorporated into and form an integral part of this Agreement.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">15. Termination</h4>
                    <p>
                      This Agreement is entered into for an indefinite term. It may be terminated by either party at any time, without prior notice and with immediate effect, for any reason or no reason, at the sole discretion of the terminating party. The Company shall bear no obligation to provide justification or remuneration upon termination.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">16. Duplicate Originals</h4>
                    <p>
                      This Agreement is executed in two original copies, each of which shall be deemed an equally valid and binding instrument. One copy shall be retained by Shockwave Capital, and the other by the Trader.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">17. Governing Law and Jurisdiction</h4>
                    <p className="mb-2">
                      This Agreement, including all incorporated documents and appendices, shall be governed by and construed in accordance with the laws of the Cayman Islands, where applicable, and subject to the local regulations of Alberta, Canada, where Shockwave Capital conducts operations.
                    </p>
                    <p>
                      In the event of any dispute that cannot be resolved through private mediation or arbitration as outlined in the Company's General Terms and Conditions (GTCD), both parties agree that jurisdiction shall fall under the provincial courts located in Edmonton, Alberta, Canada, and both parties expressly submit to this jurisdiction.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">18. Amendments</h4>
                    <p>
                      No amendment, modification, waiver, or addition to this Agreement shall be valid or enforceable unless made in writing and signed by both parties. Verbal agreements or informal changes shall carry no legal effect.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">19. Taxes and Financial Responsibility</h4>
                    <p>
                      The Trader acknowledges and agrees that Shockwave Capital shall bear no responsibility for the withholding, reporting, or remittance of any personal or corporate income taxes, fees, levies, or obligations related to any simulated earnings or remuneration paid under this Agreement. The Trader is solely responsible for complying with all tax obligations in their respective jurisdiction.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">20. Independent Relationship</h4>
                    <p>
                      Nothing in this Agreement shall be construed to create a legal partnership, employment relationship, joint venture, or agency between the Trader and Shockwave Capital. The Trader participates in simulated trading as an independent participant and shall not be entitled to any employee benefits, legal protections, or rights unless explicitly stated in a separate, written agreement.
                    </p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gray-600">
                    <p className="text-center font-medium text-white mb-4">
                      ACKNOWLEDGMENT OF AGREEMENT
                    </p>
                    <p className="text-center text-sm mb-2">
                      By signing below, the Trader confirms that they have carefully read, understood, and agreed to all terms and conditions contained within this Agreement, including all appendices and linked policies.
                    </p>
                  </div>
                </div>
                )}
              </div>

              {showKybForm ? (
              <div className="space-y-3">
                {agreementAlreadySigned ? (
                  <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F] flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p className="text-white text-sm">
                      Funded Trader Agreement signed on{' '}
                      {activation.documents.agreementSignedAt?.toDate?.().toLocaleDateString() || 'record'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreementAccepted}
                        onChange={(e) => setAgreementAccepted(e.target.checked)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-white text-sm">
                          I have read, understood, and agree to the Shockwave Capital Funded Trader Agreement above
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          By checking this box, you are electronically signing this agreement
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {hasCustomTerms && (
                  customTermsAlreadySigned ? (
                    <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F] flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-white text-sm">
                        {customTermsTitle} signed on{' '}
                        {activation.documents.customTermsSignedAt?.toDate?.().toLocaleDateString() || 'record'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F]">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customTermsAccepted}
                          onChange={(e) => setCustomTermsAccepted(e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-white text-sm">
                            I have read, understood, and agree to the {customTermsTitle} above
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            By checking this box, you are electronically signing this agreement
                          </p>
                        </div>
                      </label>
                    </div>
                  )
                )}
              </div>
              ) : (
              <div className="space-y-3">
                <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F] flex items-center gap-3">
                  {agreementAlreadySigned ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-white text-sm">
                        Funded Trader Agreement signed on{' '}
                        {activation.documents.agreementSignedAt?.toDate?.().toLocaleDateString() || 'record'}
                      </p>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <p className="text-gray-400 text-sm">Funded Trader Agreement - not signed yet</p>
                    </>
                  )}
                </div>
                {hasCustomTerms && (
                  <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F] flex items-center gap-3">
                    {customTermsAlreadySigned ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <p className="text-white text-sm">
                          {customTermsTitle} signed on{' '}
                          {activation.documents.customTermsSignedAt?.toDate?.().toLocaleDateString() || 'record'}
                        </p>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <p className="text-gray-400 text-sm">{customTermsTitle} - not signed yet</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Corporate documents */}
      <div className="flex gap-3 sm:gap-4">
        {renderStepRail(3, false)}
        <div className="flex-1 min-w-0">
          <h2 className={stepHeadingClass(3)}>
            <Building2 className="w-5 h-5" />
            Corporate Documents
          </h2>
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#2F2F2F]/50">
            {activation.kybStatus === 'approved' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Documents Approved</h3>
                <p className="text-gray-400 max-w-xl mx-auto">
                  Your corporate documents have been reviewed and approved. Our team will be in touch with your
                  account credentials and next steps shortly.
                </p>
                {existingDocs.length > 0 && (
                  <div className="mt-6 max-w-md mx-auto text-left space-y-2">
                    {existingDocs.map((docItem, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-[#151515]/50 rounded-lg border border-[#2F2F2F]">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-white text-sm truncate">{docItem.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activation.kybStatus === 'pending' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Documents Under Review</h3>
                <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                  Your submission has been received and is currently under review.
                  This typically takes 1-2 business days. We'll notify you once the review is complete.
                </p>
                {existingDocs.length > 0 && (
                  <div className="max-w-md mx-auto text-left space-y-2">
                    {existingDocs.map((docItem, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-[#151515]/50 rounded-lg border border-[#2F2F2F]">
                        <FileText className="w-4 h-4 text-[#0FF1CE] flex-shrink-0" />
                        <span className="text-white text-sm truncate">{docItem.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showKybForm && (
              <div>
                {(activation.kybStatus === 'rejected' || activation.kybStatus === 'needs_resubmission') && (
                  <div className={`mb-6 p-4 rounded-lg border ${
                    activation.kybStatus === 'rejected'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-orange-500/10 border-orange-500/30'
                  }`}>
                    <div className="flex items-start gap-3">
                      {activation.kybStatus === 'rejected' ? (
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-orange-500 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium mb-1 ${
                          activation.kybStatus === 'rejected' ? 'text-red-500' : 'text-orange-500'
                        }`}>
                          {activation.kybStatus === 'rejected' ? 'Submission Rejected' : 'Resubmission Required'}
                        </p>
                        <p className="text-sm text-gray-300">
                          Please review the notes above, update your documents and submit again.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-gray-400 text-sm mb-4">
                  Upload your corporate/KYB documents for verification. Our team will review your submission for approval.
                </p>

                {/* Company Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Company / Entity Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                    placeholder="Your registered company name"
                  />
                </div>

                {/* Corporate Documents Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Corporate / KYB Documents
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Certificate of incorporation, articles of association, proof of business address, director ID, or other corporate documents. You can upload multiple files.
                  </p>

                  {/* Already uploaded documents */}
                  {existingDocs.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {existingDocs.map((docItem, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F]">
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-white text-sm truncate">{docItem.fileName}</span>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-3">Uploaded</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Newly selected files */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#0FF1CE]/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-[#0FF1CE] flex-shrink-0" />
                            <span className="text-white text-sm truncate">{file.name}</span>
                          </div>
                          <button
                            onClick={() => removeSelectedFile(index)}
                            className="text-gray-400 hover:text-red-400 flex-shrink-0 ml-3 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="p-8 bg-[#151515]/50 backdrop-blur-sm rounded-xl border-2 border-dashed border-[#2F2F2F] hover:border-[#0FF1CE]/50 cursor-pointer transition-all duration-300 text-center">
                      <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-white mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG or PDF up to 10MB each - multiple files allowed</p>
                    </div>
                  </label>
                </div>

            {kybError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-500 text-sm">{kybError}</p>
              </div>
            )}

            <button
              onClick={handleKybSubmit}
              disabled={
                isSubmittingKyb ||
                (existingDocs.length === 0 && selectedFiles.length === 0) ||
                (!agreementAlreadySigned && !agreementAccepted) ||
                (hasCustomTerms && !customTermsAlreadySigned && !customTermsAccepted)
              }
              className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmittingKyb ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading & Submitting...
                </>
              ) : (
                <>
                  Submit for Review
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
