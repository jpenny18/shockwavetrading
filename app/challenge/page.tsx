'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../components/Particles';
import Image from 'next/image';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, registerUser, signInUser, getUser, updateUser, getCurrentUser, resetPassword, signOut as signOutUser } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { countries, countryName } from '@/lib/countries';
import { Check, Zap, ChevronRight, AlertCircle, CreditCard, CalendarOff, Percent, Tag, Gift, ChevronDown, Bitcoin, Mail, Lock, User, Phone, Eye, EyeOff, LogOut } from 'lucide-react';
import Link from 'next/link';

// Define the type for challenge options
type ChallengeType = 'Standard' | '1-Step' | 'Instant' | 'Gauntlet';

const challengeSteps = [
  { id: 1, label: 'Challenge Type', shortLabel: 'Type' },
  { id: 2, label: 'Account Size', shortLabel: 'Size' },
  { id: 3, label: 'Platform', shortLabel: 'Platform' },
  { id: 4, label: 'Add-ons', shortLabel: 'Add-ons' },
  { id: 5, label: 'Your Info', shortLabel: 'Info' },
] as const;

const challengeTypes = [
  { 
    id: 'Standard' as const, 
    name: 'Shockwave Challenge', 
    amounts: ['$5,000', '$10,000', '$25,000', '$50,000', '$100,000', '$200,000', '$500,000'],
    image: '/shockwavechallenge.png',
    description: 'Classic two-phase trading evaluation',
    badge: 'MOST POPULAR',
    features: ['2 Phase Evaluation', 'Up to 100% Profit Split', '15% Max Drawdown']
  },
  { 
    id: '1-Step' as const, 
    name: 'Shockwave 1-Step', 
    amounts: ['$5,000', '$10,000', '$25,000', '$50,000', '$100,000', '$200,000', '$500,000'],
    image: '/shockwave1step.png',
    description: 'Fast-track single phase evaluation',
    badge: 'BEST VALUE',
    features: ['1 Phase Only', 'Up to 100% Profit Split', '8% Max Drawdown']
  },
  { 
    id: 'Instant' as const, 
    name: 'Shockwave Instant', 
    amounts: ['$5,000', '$10,000', '$25,000', '$50,000', '$100,000', '$200,000', '$500,000'],
    image: '/shockwaveinstant.png',
    description: 'Access a funded account instantly',
    badge: 'FASTEST',
    features: ['Instant Funding', '70% Profit Split', '4% Max Drawdown']
  },
  { 
    id: 'Gauntlet' as const, 
    name: 'Shockwave Gauntlet', 
    amounts: ['$10,000', '$25,000', '$50,000', '$100,000', '$200,000', '$500,000'],
    image: '/shockwavegauntlet.png',
    description: 'Pay when you pass - ultimate freedom',
    badge: 'PAY WHEN YOU PASS',
    features: ['$19.99 Entry Fee', 'No Restrictions', 'Activation Fee on Pass']
  }
];

const platforms = ['MT4', 'MT5'] as const;

const platformImages: Record<string, string> = {
  MT4: '/mt4checkout.svg',
  MT5: '/mt5checkout.svg',
};

const addOnMeta: Record<string, { icon: typeof CalendarOff }> = {
  'no-min-days': { icon: CalendarOff },
  'profit-split-100': { icon: Percent },
};

interface FormErrors {
  account?: string;
  type?: string;
  amount?: string;
  platform?: string;
  terms?: string;
  discountCode?: string;
}

interface AuthErrors {
  general?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  disclaimer?: string;
  terms?: string;
}

interface AccountProfile {
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
}

interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  discordUsername: string;
}

const emptyCustomer = (): CustomerDetails => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  discordUsername: '',
});

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function customerFromAccount(
  email: string | null | undefined,
  profile: AccountProfile | null,
  displayName?: string | null
): CustomerDetails {
  const resolvedEmail = (email || profile?.email || '').trim();
  const profileFirst = profile?.firstName?.trim() || '';
  const profileLast = profile?.lastName?.trim() || '';
  const fallbackParts = (displayName || profile?.displayName || '').split(' ').filter(Boolean);

  return {
    firstName: profileFirst || fallbackParts[0] || '',
    lastName: profileLast || fallbackParts.slice(1).join(' '),
    email: resolvedEmail,
    phone: profile?.phone?.trim() || '',
    country: profile?.country?.trim() || '',
    discordUsername: '',
  };
}

interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  expiresAt: any;
  usageLimit: number | null;
  usageCount: number;
}

interface AddOn {
  id: string;
  name: string;
  description: string;
  priceMultiplier: number;
}

const addOns: AddOn[] = [
  {
    id: 'no-min-days',
    name: 'No Min Trading Days',
    description: 'Trade at your own pace without minimum day requirements',
    priceMultiplier: 0.30
  },
  {
    id: 'profit-split-100',
    name: '100% Initial Profit Split',
    description: 'Start with 100% profit split instead of standard rates',
    priceMultiplier: 0.30
  }
  // Hidden add-ons (keeping for potential future use):
  // {
  //   id: 'leverage-500',
  //   name: '1:500 Leverage',
  //   description: 'Trade with higher leverage for increased potential',
  //   priceMultiplier: 0.30
  // },
  // {
  //   id: 'reward-150',
  //   name: '150% Reward',
  //   description: 'Boost your refundable fee by 50% extra!',
  //   priceMultiplier: 0.30
  // }
];

// Function to calculate price based on challenge type and amount
const calculatePrice = (type: ChallengeType, amount: string): number => {
  const baseAmount = parseInt(amount.replace(/\$|,/g, ''));
  
  switch(type) {
    case 'Standard':
      switch(baseAmount) {
        case 5000: return 88.50;
        case 10000: return 163.50;
        case 25000: return 283.50;
        case 50000: return 433.50;
        case 100000: return 748.50;
        case 200000: return 1423.50;
        case 500000: return 2848.50;
        default: return 0;
      }
    case '1-Step':
      switch(baseAmount) {
        case 5000: return 97.50;
        case 10000: return 178.50;
        case 25000: return 298.50;
        case 50000: return 433.50;
        case 100000: return 853.50;
        case 200000: return 1483.50;
        case 500000: return 2998.50;
        default: return 0;
      }
    case 'Instant':
      switch(baseAmount) {
        case 5000: return 448.50;
        case 10000: return 823.50;
        case 25000: return 1123.50;
        case 50000: return 1348.50;
        case 100000: return 2698.50;
        case 200000: return 5248.50;
        case 500000: return 10498.50;
        default: return 0;
      }
    case 'Gauntlet':
      // All Gauntlet challenges cost $19.99 regardless of size
      switch(baseAmount) {
        case 10000: return 19.99;
        case 25000: return 19.99;
        case 50000: return 19.99;
        case 100000: return 19.99;
        case 200000: return 19.99;
        case 500000: return 19.99;
        default: return 0;
      }
    default:
      return 0;
  }
};

// Function to calculate table values
const calculateTableValues = (selectedType: ChallengeType | null, selectedAmount: string | null) => {
  if (!selectedType || !selectedAmount) return null;
  
  const baseAmount = parseInt(selectedAmount.replace(/\$|,/g, ''));
  
  return {
    maxDailyLoss: baseAmount * (selectedType === 'Standard' ? 0.08 : selectedType === '1-Step' ? 0.04 : selectedType === 'Gauntlet' ? 0.08 : 0.04),
    maxLoss: baseAmount * (selectedType === 'Standard' ? 0.15 : selectedType === '1-Step' ? 0.08 : selectedType === 'Gauntlet' ? 0.15 : 0.04),
    profitTargetStep1: baseAmount * (selectedType === 'Standard' ? 0.10 : selectedType === '1-Step' ? 0.10 : selectedType === 'Gauntlet' ? 0.10 : 0.12),
    profitTargetStep2: baseAmount * (selectedType === 'Standard' ? 0.05 : 0)
  };
};

export default function ChallengePage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [formData, setFormData] = useState<CustomerDetails>(emptyCustomer());
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accountUser, setAccountUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCountry, setAuthCountry] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  const [acceptAuthDisclaimer, setAcceptAuthDisclaimer] = useState(false);
  const [acceptAuthTerms, setAcceptAuthTerms] = useState(false);
  const [authErrors, setAuthErrors] = useState<AuthErrors>({});
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
  });
  const [profileErrors, setProfileErrors] = useState<AuthErrors>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const signupProfileRef = useRef<CustomerDetails | null>(null);
  const profileDraftUidRef = useRef<string | null>(null);
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [addonsContinued, setAddonsContinued] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);
  const stepRefs = [null, step1Ref, step2Ref, step3Ref, step4Ref, step5Ref] as const;

  const orderProfileReady = Boolean(
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    isValidPhone(formData.phone) &&
    formData.country.trim()
  );

  const isInfoComplete = Boolean(accountUser && termsAccepted && orderProfileReady);

  const isInfoStarted = Boolean(termsAccepted || addonsContinued);

  // Steps 1-3 require selections; step 4 (add-ons) is optional;
  // step 5 completes once the shopper is signed in and accepts the purchase terms.
  const completedSteps =
    isInfoComplete && selectedType && selectedAmount && selectedPlatform ? 5 :
    isInfoStarted && selectedPlatform ? 4 :
    selectedPlatform ? 3 :
    selectedAmount ? 2 :
    selectedType ? 1 :
    0;

  const currentStep = Math.min(completedSteps + 1, 5);

  const isStepUnlocked = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return Boolean(selectedType);
    if (step === 3) return Boolean(selectedAmount);
    if (step === 4 || step === 5) return Boolean(selectedPlatform);
    return false;
  };

  const scrollToStep = (step: number, force = false) => {
    if (!force && !isStepUnlocked(step) && step > currentStep) return;
    const ref = stepRefs[step];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getStepState = (step: number): 'complete' | 'current' | 'upcoming' => {
    if (step <= completedSteps) return 'complete';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          signupProfileRef.current = null;
          setAccountUser(null);
          setFormData(emptyCustomer());
          return;
        }

        setAccountUser({ uid: user.uid, email: user.email });

        let profile: AccountProfile | null = null;
        try {
          profile = await getUser(user.uid);
          if (!profile) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            profile = await getUser(user.uid);
          }
        } catch (error) {
          console.error('Could not load account profile:', error);
        }

        setFormData((prev) => {
          const next = customerFromAccount(user.email, profile, user.displayName);
          const typedName = signupProfileRef.current;
          const sameAccount = prev.email.toLowerCase() === next.email.toLowerCase()
            || typedName?.email.toLowerCase() === next.email.toLowerCase();
          if (!sameAccount) return next;

          const kept = typedName && typedName.email.toLowerCase() === next.email.toLowerCase() ? typedName : prev;
          return {
            ...next,
            firstName: profile?.firstName?.trim() || kept.firstName || next.firstName,
            lastName: profile?.lastName?.trim() || kept.lastName || next.lastName,
            phone: profile?.phone?.trim() || kept.phone || next.phone,
            country: profile?.country?.trim() || kept.country || next.country,
          };
        });
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!accountUser || !authReady) {
      if (!accountUser) profileDraftUidRef.current = null;
      return;
    }

    const profileLoaded = formData.email === (accountUser.email || '')
      || Boolean(formData.firstName || formData.lastName || formData.phone || formData.country);
    if (!profileLoaded || profileDraftUidRef.current === accountUser.uid) return;

    profileDraftUidRef.current = accountUser.uid;
    setProfileDraft({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      country: formData.country,
    });
  }, [accountUser, authReady, formData.firstName, formData.lastName, formData.phone, formData.country]);

  // Check for preselected values from pricing table
  useEffect(() => {
    const preselectedType = sessionStorage.getItem('preselectedChallengeType');
    const preselectedBalance = sessionStorage.getItem('preselectedBalance');
    
    if (preselectedType) {
      // Map the pricing table types to challenge types
      let mappedType: ChallengeType = 'Standard';
      if (preselectedType === 'Instant') {
        mappedType = 'Instant';
      } else if (preselectedType === '1-Step') {
        mappedType = '1-Step';
      } else if (preselectedType === 'Gauntlet') {
        mappedType = 'Gauntlet';
      }
      setSelectedType(mappedType);
      sessionStorage.removeItem('preselectedChallengeType');
    }
    
    if (preselectedBalance) {
      const formattedBalance = `$${parseInt(preselectedBalance).toLocaleString()}`;
      setSelectedAmount(formattedBalance);
      sessionStorage.removeItem('preselectedBalance');
    }
  }, []);
  
  // Calculate table values when selectedType or selectedAmount changes
  const tableValues = calculateTableValues(selectedType, selectedAmount);

  const handleTypeSelect = (type: ChallengeType) => {
    setSelectedType(type);
    setSelectedAmount(null);
    setTimeout(() => scrollToStep(2, true), 150);
  };

  const handleAmountSelect = (amount: string) => {
    setSelectedAmount(amount);
    setTimeout(() => scrollToStep(3, true), 150);
  };

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    setTimeout(() => scrollToStep(4, true), 150);
  };

  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addOnId) 
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const calculateAddOnsPrice = (basePrice: number): number => {
    // 🎁 ADD-ONS ARE FREE PROMOTION
    // To restore normal pricing, uncomment the code below and remove the return 0
    return 0; // FREE ADD-ONS!
    
    /* NORMAL PRICING (currently disabled):
    let totalMultiplier = 0;
    selectedAddOns.forEach(addOnId => {
      const addOn = addOns.find(a => a.id === addOnId);
      if (addOn) {
        totalMultiplier += addOn.priceMultiplier;
      }
    });
    return basePrice * totalMultiplier;
    */
  };

  const validateDiscountCode = async (code: string) => {
    if (!code) {
      setAppliedDiscount(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const discountQuery = query(
        collection(db, 'discounts'),
        where('code', '==', code.toUpperCase()),
        where('active', '==', true)
      );
      
      const snapshot = await getDocs(discountQuery);
      
      if (snapshot.empty) {
        setFormErrors(prev => ({ ...prev, discountCode: 'Invalid discount code' }));
        setAppliedDiscount(null);
        return;
      }
      
      const discount = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as DiscountCode;
      
      // Validate expiration
      if (discount.expiresAt && new Date() > discount.expiresAt.toDate()) {
        setFormErrors(prev => ({ ...prev, discountCode: 'This code has expired' }));
        setAppliedDiscount(null);
        return;
      }
      
      // Validate usage limit
      if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
        setFormErrors(prev => ({ ...prev, discountCode: 'This code has reached its usage limit' }));
        setAppliedDiscount(null);
        return;
      }
      
      setFormErrors(prev => ({ ...prev, discountCode: undefined }));
      setAppliedDiscount(discount);
      
    } catch (error) {
      console.error('Error validating discount code:', error);
      setFormErrors(prev => ({ ...prev, discountCode: 'Error validating code' }));
      setAppliedDiscount(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const calculateDiscountedPrice = (originalPrice: number, discount: DiscountCode | null): number => {
    if (!discount) return originalPrice;
    
    if (discount.type === 'percentage') {
      return originalPrice * (1 - discount.value / 100);
    } else {
      return Math.max(0, originalPrice - discount.value);
    }
  };

  const getCurrentPrice = () => {
    if (!selectedType || !selectedAmount) return null;
    const basePrice = calculatePrice(selectedType, selectedAmount);
    const addOnsPrice = calculateAddOnsPrice(basePrice);
    const priceWithAddOns = basePrice + addOnsPrice;
    return calculateDiscountedPrice(priceWithAddOns, appliedDiscount);
  };

  const ensureAccount = async (): Promise<{ uid: string; email: string; customer: CustomerDetails } | null> => {
    let signedIn = accountUser;
    if (!signedIn) {
      const user = await getCurrentUser();
      if (user) {
        signedIn = { uid: user.uid, email: user.email };
        setAccountUser(signedIn);
      }
    }

    if (!signedIn) {
      setFormErrors((prev) => ({ ...prev, account: 'Sign in or create an account to continue' }));
      return null;
    }

    let profile: AccountProfile | null = null;
    try {
      profile = await getUser(signedIn.uid);
    } catch (error) {
      console.error('Could not load account profile:', error);
    }

    const customer = customerFromAccount(
      signedIn.email || auth.currentUser?.email,
      profile,
      auth.currentUser?.displayName
    );
    const typedName = signupProfileRef.current;
    if (typedName && typedName.email.toLowerCase() === customer.email.toLowerCase()) {
      customer.firstName = profile?.firstName?.trim() || typedName.firstName || customer.firstName;
      customer.lastName = profile?.lastName?.trim() || typedName.lastName || customer.lastName;
      customer.phone = profile?.phone?.trim() || typedName.phone || customer.phone;
      customer.country = profile?.country?.trim() || typedName.country || customer.country;
    }

    if (!customer.email) {
      setFormErrors((prev) => ({ ...prev, account: 'Your account is missing an email address.' }));
      return null;
    }

    if (!customer.firstName || !customer.lastName || !customer.phone || !customer.country) {
      setFormErrors((prev) => ({
        ...prev,
        account: 'Add your last name, phone number, and country before payment.',
      }));
      return null;
    }

    setFormData(customer);
    return { uid: signedIn.uid, email: customer.email, customer };
  };

  const applyAuthError = (error: any) => {
    const errorCode = error?.code;
    switch (errorCode) {
      case 'auth/email-already-in-use':
        setAuthErrors({ email: 'This email address is already in use.' });
        break;
      case 'auth/invalid-email':
        setAuthErrors({ email: 'The email address is not valid.' });
        break;
      case 'auth/user-disabled':
        setAuthErrors({ general: 'This user account has been disabled.' });
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setAuthErrors({ general: 'Invalid email or password.' });
        break;
      case 'auth/weak-password':
        setAuthErrors({ password: 'The password is too weak.' });
        break;
      default:
        setAuthErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrors({});
    setAuthMessage('');
    setFormErrors((prev) => ({ ...prev, account: undefined }));
    setIsAuthSubmitting(true);

    try {
      if (authMode === 'login') {
        const nextErrors: AuthErrors = {};
        if (!authEmail.trim()) nextErrors.email = 'Please enter your email address';
        if (!authPassword) nextErrors.password = 'Please enter your password';
        if (!acceptAuthDisclaimer) nextErrors.disclaimer = 'You must acknowledge and accept the disclaimer';
        if (Object.keys(nextErrors).length) {
          setAuthErrors(nextErrors);
          return;
        }

        const credential = await signInUser(authEmail.trim(), authPassword);
        const profile = await getUser(credential.user.uid).catch(() => null);
        const customer = customerFromAccount(credential.user.email, profile, credential.user.displayName);
        signupProfileRef.current = null;
        setAccountUser({ uid: credential.user.uid, email: credential.user.email });
        setFormData(customer);
        setAuthPassword('');
        setTimeout(() => scrollToStep(5, true), 150);
        return;
      }

      const nextErrors: AuthErrors = {};
      if (!authFirstName.trim()) nextErrors.firstName = 'First name is required';
      if (!authLastName.trim()) nextErrors.lastName = 'Last name is required';
      if (!authPhone.trim()) nextErrors.phone = 'Phone number is required';
      else if (!isValidPhone(authPhone)) nextErrors.phone = 'Enter a valid phone number';
      if (!authCountry) nextErrors.country = 'Country is required';
      if (!authEmail.trim()) nextErrors.email = 'Please enter your email address';
      if (!authPassword) nextErrors.password = 'Please enter your password';
      else if (authPassword.length < 6) nextErrors.password = 'Password must be at least 6 characters';
      if (!authConfirmPassword) nextErrors.confirmPassword = 'Retype your password';
      else if (authPassword !== authConfirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
      if (!acceptAuthDisclaimer) nextErrors.disclaimer = 'You must acknowledge and accept the disclaimer';
      if (!acceptAuthTerms) nextErrors.terms = 'You must accept the terms and conditions';
      if (Object.keys(nextErrors).length) {
        setAuthErrors(nextErrors);
        return;
      }

      const firstName = authFirstName.trim();
      const lastName = authLastName.trim();
      const phone = authPhone.trim();
      const displayName = `${firstName} ${lastName}`.trim();
      const credential = await registerUser(authEmail.trim(), authPassword, {
        displayName,
        firstName,
        lastName,
        phone,
        country: authCountry,
      });
      const customer = customerFromAccount(
        credential.user.email || authEmail.trim(),
        {
          email: credential.user.email || authEmail.trim(),
          displayName,
          firstName,
          lastName,
          phone,
          country: authCountry,
        },
        displayName
      );
      signupProfileRef.current = customer;
      setAccountUser({ uid: credential.user.uid, email: credential.user.email });
      setFormData(customer);
      setAuthPassword('');
      setAuthConfirmPassword('');
      setTimeout(() => scrollToStep(5, true), 150);
    } catch (error: any) {
      console.error('Authentication error:', error);
      applyAuthError(error);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthErrors({});
    setAuthMessage('');
    if (!authEmail.trim()) {
      setAuthErrors({ email: 'Enter your email address first' });
      return;
    }

    try {
      await resetPassword(authEmail.trim());
      setAuthMessage('Password reset email sent.');
    } catch (error) {
      console.error('Password reset failed:', error);
      setAuthErrors({ general: 'Could not send a reset email. Check the address and try again.' });
    }
  };

  const handleUseDifferentAccount = async () => {
    setAuthErrors({});
    try {
      await signOutUser();
    } catch (error) {
      console.error('Could not sign out:', error);
      setAuthErrors({ general: 'Could not sign out. Please try again.' });
      return;
    }

    signupProfileRef.current = null;
    profileDraftUidRef.current = null;
    setAccountUser(null);
    setFormData(emptyCustomer());
    setTermsAccepted(false);
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthMode('login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountUser) return;

    const nextErrors: AuthErrors = {};
    if (!profileDraft.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!profileDraft.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!profileDraft.phone.trim()) nextErrors.phone = 'Phone number is required';
    else if (!isValidPhone(profileDraft.phone)) nextErrors.phone = 'Enter a valid phone number';
    if (!profileDraft.country) nextErrors.country = 'Country is required';
    if (Object.keys(nextErrors).length) {
      setProfileErrors(nextErrors);
      return;
    }

    setIsSavingProfile(true);
    setProfileErrors({});
    try {
      const firstName = profileDraft.firstName.trim();
      const lastName = profileDraft.lastName.trim();
      const phone = profileDraft.phone.trim();
      const country = profileDraft.country;
      const displayName = `${firstName} ${lastName}`.trim();
      await updateUser(accountUser.uid, {
        firstName,
        lastName,
        phone,
        country,
        displayName,
      });
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName });
        } catch (error) {
          console.error('Could not update auth display name:', error);
        }
      }

      const customer: CustomerDetails = {
        firstName,
        lastName,
        email: accountUser.email || formData.email,
        phone,
        country,
        discordUsername: '',
      };
      signupProfileRef.current = customer;
      setFormData(customer);
      setFormErrors((prev) => ({ ...prev, account: undefined }));
    } catch (error) {
      console.error('Could not save profile:', error);
      setProfileErrors({ general: 'Could not save your profile. Please try again.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const collectCheckoutErrors = (): FormErrors => {
    const errors: FormErrors = {};
    if (!selectedType) errors.type = 'Please select a challenge type';
    if (!selectedAmount) errors.amount = 'Please select an amount';
    if (!selectedPlatform) errors.platform = 'Please select a platform';
    if (!accountUser) errors.account = 'Sign in or create an account to continue';
    if (accountUser && !orderProfileReady) errors.account = 'Add your last name, phone number, and country before payment';
    if (!termsAccepted) errors.terms = 'Please accept the terms and conditions';
    return errors;
  };

  const handleProceedToPayment = async () => {
    const errors = collectCheckoutErrors();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setIsLinkingAccount(true);
    try {
      const account = await ensureAccount();
      if (!account) return;

      sessionStorage.setItem('challengeData', JSON.stringify({
        type: selectedType,
        amount: selectedAmount,
        platform: selectedPlatform,
        addOns: selectedAddOns,
        userId: account.uid,
        formData: account.customer,
        price: getCurrentPrice(),
        discount: appliedDiscount ? {
          id: appliedDiscount.id,
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.value
        } : null
      }));

      router.push('/challenge/payment');
    } finally {
      setIsLinkingAccount(false);
    }
  };

  const handlePayWithCard = async () => {
    if (isRedirecting || isLinkingAccount) return;

    const errors = collectCheckoutErrors();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    setCardError(null);
    setIsRedirecting(true);

    try {
      const account = await ensureAccount();
      if (!account) {
        setIsRedirecting(false);
        return;
      }

      const expectedAmount = getCurrentPrice();
      if (expectedAmount === null) {
        setCardError('Choose a challenge before paying.');
        setIsRedirecting(false);
        return;
      }

      let response: Response | null = null;
      let data: { error?: string; checkoutUrl?: string } = {};
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch('/api/checkout-handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey,
            userId: account.uid,
            firstName: account.customer.firstName,
            lastName: account.customer.lastName,
            email: account.customer.email,
            phone: account.customer.phone,
            country: account.customer.country,
            discordUsername: account.customer.discordUsername,
            challengeType: selectedType,
            challengeAmount: selectedAmount,
            platform: selectedPlatform,
            addOns: selectedAddOns,
            discountCode: appliedDiscount?.code || '',
            expectedAmount,
          }),
        });
        data = await response.json().catch(() => ({}));
        if (response.ok || response.status < 500) break;
      }

      if (!response?.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Unable to start card checkout');
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error(error);
      setCardError(error instanceof Error ? error.message : 'Unable to start card checkout');
      setIsRedirecting(false);
    }
  };

  // Credit card payment links mapping
  const getCreditCardPaymentLink = (type: ChallengeType, amount: string): string => {
    const baseAmount = parseInt(amount.replace(/\$|,/g, ''));
    
    // Map challenge types and amounts to Whop checkout links
    const linkMap: Record<ChallengeType, Record<number, string>> = {
      'Standard': {
        5000: 'https://whop.com/checkout/plan_PvLnd7AJ7tOJR',
        10000: 'https://whop.com/checkout/plan_nLHPg0brgwLaU',
        25000: 'https://whop.com/checkout/plan_p20uUwXp4vLJg',
        50000: 'https://whop.com/checkout/plan_6Gdrc0yiKWbWJ',
        100000: 'https://whop.com/checkout/plan_zJrF6l5Nm6rhF',
        200000: 'https://whop.com/checkout/plan_4GEAYuCbwNA22',
        500000: 'https://whop.com/checkout/plan_MsJZGNy1YnhBK',
      },
      '1-Step': {
        5000: 'https://whop.com/checkout/plan_rnzYhDBJQq5ex',
        10000: 'https://whop.com/checkout/plan_ZXJ8BZBTcQ1i3',
        25000: 'https://whop.com/checkout/plan_SAasdjmOXScaq',
        50000: 'https://whop.com/checkout/plan_qOqEJtqF2mcAd',
        100000: 'https://whop.com/checkout/plan_qt3kbauM0ofsP',
        200000: 'https://whop.com/checkout/plan_qS9oRkJjbbuSA',
        500000: 'https://whop.com/checkout/plan_d3shIHASZfY6F',
      },
      'Instant': {
        5000: 'https://whop.com/checkout/plan_guY9HeiVOT6GJ',
        10000: 'https://whop.com/checkout/plan_yhLgP3Ak6d9Xf',
        25000: 'https://whop.com/checkout/plan_lGyscFHovQUqU',
        50000: 'https://whop.com/checkout/plan_Y9A5dZToRiaoC',
        100000: 'https://whop.com/checkout/plan_O4HGedgNjl24z',
        200000: 'https://whop.com/checkout/plan_FJbU5HpiROFYO',
        500000: 'https://whop.com/checkout/plan_6k1Q3p7dAbrEn',
      },
      'Gauntlet': {
        10000: 'https://whop.com/checkout/plan_fheAViDdgQcGV',
        25000: 'https://whop.com/checkout/plan_fheAViDdgQcGV',
        50000: 'https://whop.com/checkout/plan_fheAViDdgQcGV',
        100000: 'https://whop.com/checkout/plan_fheAViDdgQcGV',
        200000: 'https://whop.com/checkout/plan_fheAViDdgQcGV',
        500000: 'https://whop.com/checkout/plan_fheAViDdgQcGV',
      }
    };
    
    return linkMap[type][baseAmount] || '';
  };

  const handleCreditCardPayment = async () => {
    const errors = collectCheckoutErrors();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    
    setIsLinkingAccount(true);
    try {
      const account = await ensureAccount();
      if (!account) return;

      // Create order data for card-orders collection
      const orderData = {
        userId: account.uid,
        customerEmail: account.customer.email,
        firstName: account.customer.firstName,
        lastName: account.customer.lastName,
        phone: account.customer.phone,
        country: account.customer.country,
        discordUsername: account.customer.discordUsername,
        challengeType: selectedType!,
        challengeAmount: selectedAmount!,
        platform: selectedPlatform!,
        addOns: selectedAddOns,
        totalAmount: getCurrentPrice() || 0,
        paymentMethod: 'card' as const,
        paymentStatus: 'pending' as const,
        status: 'pending' as const,
      };
      
      // Save to card-orders collection via API
      const response = await fetch('/api/card-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      // Send admin notification email
      try {
        await fetch('/api/send-card-order-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });
        // Don't block on email - continue even if it fails
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
      
      // Get the Whop payment link
      const paymentLink = getCreditCardPaymentLink(selectedType!, selectedAmount!);
      
      if (paymentLink) {
        // Redirect to Whop checkout (no metadata passed)
        window.location.href = paymentLink;
      } else {
        console.error('No payment link found for this selection');
        alert('Payment link not available for this selection. Please contact support.');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setIsLinkingAccount(false);
    }
  };

  const isFormValid = () => {
    return (
      authReady &&
      Boolean(accountUser) &&
      orderProfileReady &&
      selectedType &&
      selectedAmount &&
      selectedPlatform &&
      termsAccepted &&
      !isLinkingAccount &&
      !isAuthSubmitting
    );
  };

  const renderStepCircle = (step: number, size: 'sm' | 'md' = 'md') => {
    const state = getStepState(step);
    const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold border transition-colors duration-300 shrink-0 ${
          state === 'complete'
            ? 'bg-[#0FF1CE] border-[#0FF1CE] text-black'
            : state === 'current'
              ? 'border-[#0FF1CE] bg-[#0FF1CE]/15 text-[#0FF1CE]'
              : 'border-white/10 bg-white/[0.04] text-white/35'
        }`}
      >
        {state === 'complete' ? <Check size={size === 'sm' ? 14 : 16} strokeWidth={3} /> : step}
      </div>
    );
  };

  const renderProgressStepper = () => (
    <div className="mb-8 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5 lg:mb-10">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {challengeSteps.map((step, index) => {
          const state = getStepState(step.id);
          const lineFilled = completedSteps >= step.id;
          const unlocked = isStepUnlocked(step.id);
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (!unlocked) return;
                  if (step.id >= 5) setAddonsContinued(true);
                  scrollToStep(step.id);
                }}
                disabled={!unlocked}
                className={`flex flex-col items-center gap-1.5 min-w-0 ${unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                aria-label={`Step ${step.id}: ${step.label}`}
              >
                {renderStepCircle(step.id, 'sm')}
                <span
                  className={`text-[10px] sm:text-xs font-medium truncate max-w-[4.5rem] sm:max-w-none transition-colors duration-300 ${
                    state === 'complete' || state === 'current' ? 'text-[#0FF1CE]' : 'text-gray-500'
                  }`}
                >
                  <span className="sm:hidden">{step.shortLabel}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </button>
              {index < challengeSteps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 sm:mx-2 bg-[#2F2F2F] rounded-full overflow-hidden min-w-[12px]">
                  <div
                    className="h-full rounded-full bg-[#0FF1CE] transition-all duration-700 ease-out"
                    style={{ width: lineFilled ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderStepRail = (step: number, showConnector = true) => {
    const state = getStepState(step);
    const connectorFilled = completedSteps >= step;
    return (
      <div className="flex flex-col items-center self-stretch shrink-0">
        {renderStepCircle(step)}
        {showConnector && (
          <div className="w-0.5 flex-1 min-h-[1.5rem] mt-2 bg-[#2F2F2F] rounded-full overflow-hidden relative">
            <div
              className="absolute top-0 left-0 right-0 rounded-full bg-[#0FF1CE] transition-all duration-700 ease-out"
              style={{ height: connectorFilled ? '100%' : state === 'current' ? '40%' : '0%' }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderAddOnsSection = () => {
    const showCheckoutExtras = Boolean(selectedType && selectedAmount && selectedPlatform);
    const connectorFilled = completedSteps >= 4;
    const connectorPartial = currentStep === 4;

    return (
      <div
        ref={step4Ref}
        className={`flex gap-3 sm:gap-4 ${selectedPlatform ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
      >
        <div className="flex flex-col items-center self-stretch shrink-0">
          {renderStepCircle(4)}
          <div className="w-0.5 flex-1 min-h-[1.5rem] mt-2 bg-[#2F2F2F] rounded-full overflow-hidden relative">
            <div
              className="absolute top-0 left-0 right-0 rounded-full bg-[#0FF1CE] transition-all duration-700 ease-out"
              style={{ height: connectorFilled ? '100%' : connectorPartial ? '45%' : '0%' }}
            />
          </div>
          {showCheckoutExtras && (
            <div className="mt-2">
              {renderStepCircle(5)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col pb-2">
          <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(4) === 'upcoming' ? 'text-white/35' : 'text-white'}`}>
            Available Add-ons
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {addOns.map((addOn) => {
              const meta = addOnMeta[addOn.id];
              const Icon = meta?.icon || Gift;
              const isSelected = selectedAddOns.includes(addOn.id);
              return (
                <div
                  key={addOn.id}
                  onClick={() => selectedPlatform && handleAddOnToggle(addOn.id)}
                  className={`relative cursor-pointer overflow-hidden rounded-[18px] border p-4 backdrop-blur-xl transition-colors duration-300 ${
                    isSelected
                      ? 'border-[#0FF1CE]/70 bg-white/[0.07]'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                  }`}
                >
                  <div className="relative">
                    <div className="relative flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${
                        isSelected
                          ? 'border-[#0FF1CE]/40 bg-[#0FF1CE]/15 text-[#0FF1CE]'
                          : 'border-white/10 bg-black/30 text-white/45'
                      }`}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-white">{addOn.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-[#0FF1CE] text-black'
                              : 'bg-[#0FF1CE]/15 text-[#0FF1CE] border border-[#0FF1CE]/30'
                          }`}>
                            FREE
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{addOn.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${isSelected ? 'text-[#0FF1CE]' : 'text-gray-500'}`}>
                            {isSelected ? 'Added to challenge' : 'Tap to unlock'}
                          </span>
                          <div className={`w-6 h-6 rounded border-2 transition-all duration-300 flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#0FF1CE] border-[#0FF1CE]'
                              : 'bg-transparent border-gray-500'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="sr-only"
                            />
                            {isSelected && <Check size={14} className="text-black" strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Promotional Text - Shows when add-ons are selected */}
          {selectedAddOns.length > 0 && (
            <div className="hidden mt-4 p-4 bg-gradient-to-r from-[#FF6B6B]/10 to-[#EE5A24]/10 border border-[#FF6B6B]/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#FF6B6B] rounded-full animate-pulse"></div>
                <span className="text-[#FF6B6B] font-semibold text-sm">🎉 SPECIAL OFFER</span>
              </div>
              <p className="text-white text-sm">
                <strong>Add-Ons are free for debit/credit card purchases during our re-launch week only!</strong>
              </p>
            </div>
          )}

          {showCheckoutExtras && (
            <div className="mt-8 space-y-4 flex-1 flex flex-col">
              {renderDiscountSection()}

              <div className="hidden rounded-[18px] border border-white/10 bg-black/30 p-4 lg:block">
                {renderPriceSection()}
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/30 p-4 lg:hidden">
                {renderPriceSection()}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddonsContinued(true);
                  scrollToStep(5, true);
                }}
                className="group mt-auto w-full rounded-2xl bg-[#0FF1CE] px-4 py-3.5 text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60">Next Step</div>
                    <div className="truncate text-sm font-semibold text-black sm:text-base">
                      {accountUser ? 'Continue to Payment' : 'Continue to Sign In'}
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-black transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDiscountSection = () => (
    <div className="mb-8">
      {!showDiscountInput && !appliedDiscount ? (
        <button
          type="button"
          onClick={() => setShowDiscountInput(true)}
          className="group w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition-colors duration-300 hover:bg-white/[0.07]"
        >
          <div className="flex items-center justify-center gap-2 font-medium text-white">
            <Tag size={18} className="text-[#0FF1CE]" />
            <span>Apply Discount</span>
            <ChevronDown size={16} className="text-gray-400 group-hover:text-[#0FF1CE] transition-colors" />
          </div>
        </button>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-[#0FF1CE] font-medium text-sm">
              <Tag size={16} />
              <span>Discount Code</span>
            </div>
            {!appliedDiscount && (
              <button
                type="button"
                onClick={() => {
                  setShowDiscountInput(false);
                  setDiscountCode('');
                  setFormErrors(prev => ({ ...prev, discountCode: undefined }));
                }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setFormErrors(prev => ({ ...prev, discountCode: undefined }));
                  }}
                  onBlur={() => validateDiscountCode(discountCode)}
                  placeholder="Enter discount code"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none"
                />
                {isValidatingCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0FF1CE] border-t-transparent"></div>
                  </div>
                )}
              </div>
              <button
                onClick={() => validateDiscountCode(discountCode)}
                disabled={isValidatingCode || !discountCode}
                className="shrink-0 rounded-2xl bg-[#0FF1CE] px-5 py-3 font-semibold text-black transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {formErrors.discountCode && (
              <p className="mt-2 text-red-400 text-sm">{formErrors.discountCode}</p>
            )}
            {appliedDiscount && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#0FF1CE]/30 bg-[#0FF1CE]/10 px-3 py-2 text-sm text-[#0FF1CE]">
                <Check size={16} />
                <span>
                  Discount applied: {appliedDiscount.type === 'percentage' 
                    ? `${appliedDiscount.value}% off` 
                    : `$${appliedDiscount.value} off`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderPriceSection = () => {
    if (!selectedType || !selectedAmount) return null;
    
    const basePrice = calculatePrice(selectedType, selectedAmount);
    const addOnsPrice = calculateAddOnsPrice(basePrice);
    const subtotal = basePrice + addOnsPrice;
    const finalPrice = calculateDiscountedPrice(subtotal, appliedDiscount);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Base Price:</span>
          <span className="text-white font-semibold">${basePrice.toFixed(2)}</span>
        </div>
        
        {selectedAddOns.length > 0 && (
          <>
            <div className="border-t border-gray-600 pt-2">
              {selectedAddOns.map(addOnId => {
                const addOn = addOns.find(a => a.id === addOnId);
                if (!addOn) return null;
                // const addOnPrice = basePrice * addOn.priceMultiplier; // DISABLED FOR FREE PROMO
                return (
                  <div key={addOnId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">{addOn.name}:</span>
                    <span className="text-[#0FF1CE] font-semibold">FREE</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-400">Subtotal:</span>
              <span className="text-white">${subtotal.toFixed(2)}</span>
            </div>
          </>
        )}
        
        {appliedDiscount && (
          <div className="flex justify-between items-center text-[#0FF1CE]">
            <span>Discount:</span>
            <span>
              -{appliedDiscount.type === 'percentage' 
                ? `${appliedDiscount.value}%` 
                : `$${appliedDiscount.value}`}
            </span>
          </div>
        )}
        
        <div className="border-t border-[#0FF1CE]/30 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-white">Total:</span>
            <span className="text-2xl font-bold text-[#0FF1CE]">${finalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderChallengeTable = () => {
    if (!selectedType) return null;

    return (
      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <h3 className="mb-6 text-center text-xl font-semibold tracking-tight text-white">Challenge Details</h3>
        
        <div className={`${selectedType === 'Standard' ? 'max-w-5xl' : 'max-w-3xl'} mx-auto overflow-x-auto py-4 px-4 md:px-8`}>
          <div className={`${selectedType === 'Standard' ? 'min-w-[650px]' : 'min-w-[450px]'} mx-auto overflow-hidden rounded-[18px] md:min-w-0 md:origin-top md:scale-[0.85]`}>
            <div 
              className={`grid ${selectedType === 'Standard' ? 'grid-cols-4' : 'grid-cols-2'} overflow-hidden rounded-[18px] border border-white/10 bg-[#0b0d0f] text-xs md:text-sm`}
            >
              {/* Header */}
              {selectedType === 'Standard' ? (
                <div className="col-span-4 grid grid-cols-4 bg-[#0FF1CE]">
                  <div className="p-3 md:p-4 border-r border-black/20 text-black font-bold"></div>
                  <div className="p-3 md:p-4 border-r border-black/20 text-center text-black font-bold">CHALLENGE</div>
                  <div className="p-3 md:p-4 border-r border-black/20 text-center text-black font-bold">VERIFICATION</div>
                  <div className="p-3 md:p-4 text-center text-black font-bold">FUNDED</div>
                </div>
              ) : selectedType === '1-Step' ? (
                <div className="col-span-2 grid grid-cols-2 bg-[#0FF1CE]">
                  <div className="p-3 md:p-4 border-r border-black/20 text-black font-bold"></div>
                  <div className="p-3 md:p-4 text-center text-black font-bold">FUNDED</div>
                </div>
              ) : selectedType === 'Gauntlet' ? (
                <div className="col-span-2 grid grid-cols-2 bg-gradient-to-r from-[#FF6B6B] to-[#EE5A24]">
                  <div className="p-3 md:p-4 border-r border-black/20 text-white font-bold"></div>
                  <div className="p-3 md:p-4 text-center text-white font-bold">GAUNTLET</div>
                </div>
              ) : (
                <div className="col-span-2 grid grid-cols-2 bg-[#0FF1CE]">
                  <div className="p-3 md:p-4 border-r border-black/20 text-black font-bold"></div>
                  <div className="p-3 md:p-4 text-center text-black font-bold">FUNDED</div>
                </div>
              )}

              {/* Rows */}
              {selectedType === 'Standard' ? (
                <>
                  {[
                    ['Trading Period', 'Unlimited', 'Unlimited', 'Unlimited'],
                    ['Minimum Trading Days', 'None', 'None', 'None'],
                    ['Maximum Daily Loss', 
                      <div key="daily1" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">8%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxDailyLoss.toLocaleString()}</span>
                      </div>, 
                      <div key="daily2" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">8%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxDailyLoss.toLocaleString()}</span>
                      </div>, 
                      <div key="daily3" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">8%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxDailyLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Maximum Loss', 
                      <div key="max1" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">15%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                      </div>,
                      <div key="max2" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">15%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                      </div>,
                      <div key="max3" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">15%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Profit Target', 
                      <div key="profit1" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">10%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.profitTargetStep1.toLocaleString()}</span>
                      </div>,
                      <div key="profit2" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">5%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.profitTargetStep2.toLocaleString()}</span>
                      </div>,
                      'X'
                    ],
                    ['Leverage', '1:200', '1:200', '1:200'],
                    ['News Trading', 'Allowed', 'Allowed', 'Allowed'],
                    ['Payout Eligibility', 'X', 'X', 'On-demand'],
                    ['Profit Split', 'X', 'X', 'Up to 95%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-white/[0.03]'}`}>
                      <div className="p-3 md:p-4 border-t border-white/10 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-white/10 text-center text-sm md:text-xs">{row[1]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-white/10 text-center text-sm md:text-xs">{row[2]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-white/10 text-center text-sm md:text-xs">{row[3]}</div>
                    </div>
                  ))}
                </>
              ) : selectedType === '1-Step' ? (
                <>
                  {[
                    ['Trading Period', 'Unlimited'],
                    ['Minimum Trading Days', 'None'],
                    ['Maximum Daily Loss', 
                      <div key="daily" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">4%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxDailyLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Maximum Loss', 
                      <div key="max" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">8%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Profit Target', 
                      <div key="profit" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">10%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.profitTargetStep1.toLocaleString()}</span>
                      </div>
                    ],
                    ['Leverage', '1:200'],
                    ['News Trading', 'Allowed'],
                    ['First Withdrawal', 'On-demand'],
                    ['Profit Split', 'Up to 95%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-white/[0.03]'}`}>
                      <div className="p-3 md:p-4 border-t border-white/10 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-white/10 text-center text-sm md:text-xs">{row[1]}</div>
                    </div>
                  ))}
                </>
              ) : selectedType === 'Instant' ? (
                <>
                  {[
                    ['Trading Period', '30 Days'],
                    ['Minimum Profitable Days', 'None'],
                    ['Maximum Loss', 
                      <div key="max" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">4%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Profit Target', 
                      <div key="profit" className="flex flex-col items-center">
                        <span className="text-[#0FF1CE] font-bold text-base md:text-lg">12%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.profitTargetStep1.toLocaleString()}</span>
                      </div>
                    ],
                    ['Leverage', '1:100'],
                    ['News Trading', 'Allowed'],
                    ['First Withdrawal', 'On-demand'],
                    ['Profit Split', '70%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-white/[0.03]'}`}>
                      <div className="p-3 md:p-4 border-t border-white/10 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-white/10 text-center text-sm md:text-xs">{row[1]}</div>
                    </div>
                  ))}
                </>
              ) : selectedType === 'Gauntlet' ? (
                <>
                  {[
                    ['Trading Period', 'Unlimited'],
                    ['Minimum Trading Days', '0 Days'],
                    ['Maximum Daily Loss', 
                      <div key="daily" className="flex flex-col items-center">
                        <span className="text-[#FF6B6B] font-bold text-base md:text-lg">8%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#FF6B6B]/20 px-2 py-0.5 rounded-full">${tableValues?.maxDailyLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Maximum Loss', 
                      <div key="max" className="flex flex-col items-center">
                        <span className="text-[#FF6B6B] font-bold text-base md:text-lg">15%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#FF6B6B]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                      </div>
                    ],
                    ['Profit Target', 
                      <div key="profit" className="flex flex-col items-center">
                        <span className="text-[#FF6B6B] font-bold text-base md:text-lg">10%</span>
                        <span className="text-white text-[10px] md:text-xs mt-1 bg-[#FF6B6B]/20 px-2 py-0.5 rounded-full">${tableValues?.profitTargetStep1.toLocaleString()}</span>
                      </div>
                    ],
                    ['Leverage', '1:200'],
                    ['Trading Rules', 'No Restrictions'],
                    ['News Trading', 'Allowed'],
                    ['Entry Fee', '$19.99'],
                    ['Activation Fee', 'Pay When You Pass'],
                    ['Profit Split', 'Up to 95%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-[#FF6B6B]/[0.08]'}`}>
                      <div className="p-3 md:p-4 border-t border-white/10 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-white/10 text-center text-sm md:text-xs">{row[1]}</div>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-[#0FF1CE]/10 blur-[120px]"></div>
      </div>
      <Particles />

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0FF1CE]">Checkout</p>
          <h1 className="mb-4 text-3xl font-semibold tracking-tight text-white lg:text-5xl">
            Start Your Trading Journey
          </h1>
            </div>

        {renderProgressStepper()}

        {/* Launch Day Sale Banner - Mobile Optimized */}
        <div className="mb-8 lg:mb-12 relative space-y-5">
          {/* Launch Sale Promo removed */}
     
     
     
     
          {/* On-Demand Payouts Promo */}
          <div className="relative hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0FF1CE]/20 to-[#5059FC]/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-r from-[#0FF1CE]/10 to-[#5059FC]/10 rounded-2xl p-6 lg:p-8 border border-[#0FF1CE]/20 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                    <Zap className="w-5 h-5 text-[#0FF1CE]" />
                    <span className="text-sm font-bold text-white">On-Demand Payouts Now Available!</span>
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-[#0FF1CE] mb-1">
                    Up to $5,000 Instantly
                  </div>
                  <div className="text-sm text-white font-medium">
                    Available on <span className="font-bold text-[#0FF1CE]">Standard</span>, <span className="font-bold text-[#0FF1CE]">1-Step</span>, and <span className="font-bold text-[#0FF1CE]">Instant</span> accounts
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Selection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* First Card - Challenge Selection */}
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl lg:col-span-7">
            <div ref={step1Ref} className="flex gap-3 sm:gap-4 mb-2">
              {renderStepRail(1)}
              <div className="flex-1 min-w-0 pb-8">
                <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(1) === 'upcoming' ? 'text-white/35' : 'text-white'}`}>
                  Select Challenge Type
                </h3>
                <div className="max-md:scale-[1] max-md:origin-top">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {challengeTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        className={`relative w-full overflow-hidden rounded-[18px] border transition-colors duration-300 ${
                          selectedType === type.id
                            ? 'border-[#0FF1CE]/70 bg-white/[0.07]'
                            : 'border-white/10 bg-black/20 hover:border-white/20'
                        }`}
                      >
                        {/* Image section */}
                        <div className="relative flex aspect-[16/12] w-full items-center justify-center overflow-hidden bg-black/40">
                          <div className="relative w-[85%] h-[85%]">
                            <Image
                              src={type.image}
                              alt={type.name}
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
                          </div>
                        </div>
                        
                        {/* Text section */}
                        <div className="bg-black/30 p-3">
                          <h2 className="text-xs lg:text-sm font-bold mb-1 text-white text-center">
                            {type.name}
                          </h2>
                          <div className="h-0.5 w-12 bg-[#0FF1CE] mb-2 rounded mx-auto"></div>
                          <p className="text-[10px] lg:text-xs text-gray-400 text-center">
                            {type.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Selection */}
            <div
              ref={step2Ref}
              className={`flex gap-3 sm:gap-4 mb-2 ${selectedType ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
            >
              {renderStepRail(2)}
              <div className="flex-1 min-w-0 pb-8">
                <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(2) === 'upcoming' ? 'text-white/35' : 'text-white'}`}>
                  Select Account Size
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(selectedType ? challengeTypes.find(type => type.id === selectedType)?.amounts : [])?.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className={`relative overflow-hidden rounded-[18px] border transition-colors duration-300 ${
                        selectedAmount === amount
                          ? 'border-[#0FF1CE] bg-[#0FF1CE] text-black'
                          : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20'
                      }`}
                    >
                      <div className="px-3 py-4 font-semibold">
                        {amount}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Selection */}
            <div
              ref={step3Ref}
              className={`flex gap-3 sm:gap-4 mb-2 ${selectedAmount ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}
            >
              {renderStepRail(3)}
              <div className="flex-1 min-w-0 pb-8">
                <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(3) === 'upcoming' ? 'text-white/35' : 'text-white'}`}>
                  Select Platform
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => handlePlatformSelect(platform)}
                      className={`relative overflow-hidden rounded-[18px] border transition-colors duration-300 ${
                        selectedPlatform === platform
                          ? 'border-[#0FF1CE]/70 bg-white/[0.07]'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden bg-black/40 px-4">
                        <Image
                          src={platformImages[platform]}
                          alt={platform}
                          width={160}
                          height={44}
                          className="object-contain w-full max-w-[140px] h-auto"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add-ons Selection + discount, price, continue */}
            {renderAddOnsSection()}
          </div>

          {/* Second Card - Challenge Details */}
          <div className="lg:col-span-5 relative">
            {/* Sticky container for desktop */}
            <div className="lg:sticky lg:top-8">
              {/* Sticky Price Display - Desktop Only */}
              {selectedType && selectedAmount && (
                <div className="mb-4 hidden rounded-[22px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl lg:block">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400">Your Selection</div>
                      <div className="text-lg font-semibold text-white">{selectedType} - {selectedAmount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total Price</div>
                      <div className="text-2xl font-bold text-[#0FF1CE]">
                        ${getCurrentPrice()?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show price breakdown if there are add-ons or discount */}
                  {(selectedAddOns.length > 0 || appliedDiscount) && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {renderPriceSection()}
                    </div>
                  )}
                </div>
              )}
              
              {/* Challenge Details Table */}
              {renderChallengeTable()}
            </div>
          </div>
        </div>

        {/* Personal Information Section - Full Width Mobile First */}
        <div
          ref={step5Ref}
          className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl lg:mt-12 lg:p-8"
        >
          <div className="mb-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-3">
              {renderStepCircle(5)}
              <h3 className={`text-xl font-bold transition-colors duration-300 lg:text-2xl ${getStepState(5) === 'upcoming' ? 'text-white/35' : 'text-white'}`}>
                Your Information
              </h3>
            </div>
            <p className="mx-auto max-w-xl text-sm text-gray-400">
              {accountUser
                ? orderProfileReady
                  ? 'Signed in. This order uses the details saved on your account.'
                  : 'Add your last name, phone number, and country. Payment stays locked until your profile is complete.'
                : 'Sign in or create an account. Payment stays locked until you do.'}
            </p>
          </div>

          {!authReady ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
            </div>
          ) : accountUser ? (
            <>
            <div className="mx-auto max-w-xl rounded-[18px] border border-[#0FF1CE]/30 bg-[#0FF1CE]/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0FF1CE] text-black">
                    <Check size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0FF1CE]">Signed in</p>
                    <p className="font-semibold text-white">
                      {[formData.firstName, formData.lastName].filter(Boolean).join(' ') || 'Your account'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseDifferentAccount}
                  className="inline-flex items-center gap-1 text-xs text-gray-300 transition-colors hover:text-white"
                >
                  <LogOut size={14} />
                  Switch account
                </button>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Email</dt>
                  <dd className="break-all text-right text-white">{accountUser.email || formData.email}</dd>
                </div>
                {formData.phone ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-400">Phone</dt>
                    <dd className="text-right text-white">{formData.phone}</dd>
                  </div>
                ) : null}
                {formData.country ? (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-400">Country</dt>
                    <dd className="text-right text-white">{countryName(formData.country)}</dd>
                  </div>
                ) : null}
              </dl>
              {orderProfileReady && (
                <p className="mt-4 text-sm text-gray-300">This purchase will be added to your account.</p>
              )}
            </div>
            {!orderProfileReady && (
              <form onSubmit={handleSaveProfile} className="mx-auto mt-4 max-w-xl space-y-4" noValidate>
                <p className="text-sm text-gray-300">
                  Your account is missing details this order needs. Save them to your profile before payment.
                </p>
                {profileErrors.general && (
                  <p className="flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{profileErrors.general}</p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-first-name" className="mb-2 block text-sm font-medium text-gray-400">First Name</label>
                    <input
                      id="profile-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={profileDraft.firstName}
                      onChange={(e) => setProfileDraft((current) => ({ ...current, firstName: e.target.value }))}
                      placeholder="First name"
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${profileErrors.firstName ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {profileErrors.firstName && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{profileErrors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="profile-last-name" className="mb-2 block text-sm font-medium text-gray-400">Last Name</label>
                    <input
                      id="profile-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={profileDraft.lastName}
                      onChange={(e) => setProfileDraft((current) => ({ ...current, lastName: e.target.value }))}
                      placeholder="Last name"
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${profileErrors.lastName ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {profileErrors.lastName && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{profileErrors.lastName}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium text-gray-400">Phone Number</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      autoComplete="tel"
                      value={profileDraft.phone}
                      onChange={(e) => setProfileDraft((current) => ({ ...current, phone: e.target.value }))}
                      placeholder="Phone number"
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${profileErrors.phone ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {profileErrors.phone && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{profileErrors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="profile-country" className="mb-2 block text-sm font-medium text-gray-400">Country</label>
                    <select
                      id="profile-country"
                      value={profileDraft.country}
                      onChange={(e) => setProfileDraft((current) => ({ ...current, country: e.target.value }))}
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white focus:border-[#0FF1CE]/60 focus:outline-none ${profileErrors.country ? 'border-red-500' : 'border-white/10'}`}
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                    {profileErrors.country && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{profileErrors.country}</p>}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0FF1CE] px-4 py-4 font-bold text-black transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving profile...' : 'Save profile'}
                </button>
              </form>
            )}
            </>
          ) : (
            <form onSubmit={handleAuthSubmit} className="mx-auto max-w-xl space-y-4" noValidate>
              <div className="flex rounded-2xl bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthErrors({});
                    setAuthMessage('');
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    authMode === 'login' ? 'bg-[#0FF1CE] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthErrors({});
                    setAuthMessage('');
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    authMode === 'signup' ? 'bg-[#0FF1CE] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <p className="text-center text-sm text-gray-400">
                {authMode === 'login' ? (
                  <>
                    Don&apos;t have a profile yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthErrors({});
                      }}
                      className="font-semibold text-[#0FF1CE] hover:underline"
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
                        setAuthMode('login');
                        setAuthErrors({});
                      }}
                      className="font-semibold text-[#0FF1CE] hover:underline"
                    >
                      sign in
                    </button>
                  </>
                )}
              </p>

              {authMessage && (
                <div className="flex items-center gap-2 rounded-2xl border border-[#0FF1CE]/30 bg-[#0FF1CE]/10 px-4 py-3 text-sm text-[#0FF1CE]">
                  <Check size={16} />
                  <span>{authMessage}</span>
                </div>
              )}

              {authErrors.general && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <AlertCircle size={16} />
                  <span>{authErrors.general}</span>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="auth-first-name" className="mb-2 block text-sm font-medium text-gray-400">First Name</label>
                    <div className="relative">
                      <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        id="auth-first-name"
                        type="text"
                        autoComplete="given-name"
                        value={authFirstName}
                        onChange={(e) => setAuthFirstName(e.target.value)}
                        placeholder="First name"
                        className={`w-full rounded-2xl border bg-black/40 py-3.5 pl-11 pr-4 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.firstName ? 'border-red-500' : 'border-white/10'}`}
                      />
                    </div>
                    {authErrors.firstName && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="auth-last-name" className="mb-2 block text-sm font-medium text-gray-400">Last Name</label>
                    <input
                      id="auth-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={authLastName}
                      onChange={(e) => setAuthLastName(e.target.value)}
                      placeholder="Last name"
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.lastName ? 'border-red-500' : 'border-white/10'}`}
                    />
                    {authErrors.lastName && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.lastName}</p>}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-gray-400">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email address"
                    className={`w-full rounded-2xl border bg-black/40 py-3.5 pl-11 pr-4 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.email ? 'border-red-500' : 'border-white/10'}`}
                  />
                </div>
                {authErrors.email && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.email}</p>}
              </div>

              {authMode === 'signup' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="auth-phone" className="mb-2 block text-sm font-medium text-gray-400">Phone Number</label>
                    <div className="relative">
                      <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        id="auth-phone"
                        type="tel"
                        autoComplete="tel"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="Phone number"
                        className={`w-full rounded-2xl border bg-black/40 py-3.5 pl-11 pr-4 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.phone ? 'border-red-500' : 'border-white/10'}`}
                      />
                    </div>
                    {authErrors.phone && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="auth-country" className="mb-2 block text-sm font-medium text-gray-400">Country</label>
                    <select
                      id="auth-country"
                      autoComplete="country"
                      value={authCountry}
                      onChange={(e) => setAuthCountry(e.target.value)}
                      className={`w-full rounded-2xl border bg-black/40 px-4 py-3.5 text-base text-white focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.country ? 'border-red-500' : 'border-white/10'}`}
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                    {authErrors.country && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.country}</p>}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-gray-400">Password</label>
                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="auth-password"
                    type={showAuthPassword ? 'text' : 'password'}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full rounded-2xl border bg-black/40 py-3.5 pl-11 pr-12 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.password ? 'border-red-500' : 'border-white/10'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-[#0FF1CE]"
                    aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {authErrors.password && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.password}</p>}
                {authMode === 'signup' ? (
                  <p className={`mt-2 text-xs ${authPassword.length >= 6 ? 'text-[#0FF1CE]' : 'text-gray-500'}`}>
                    At least 6 characters. Use the eye icon to view it, then retype it below.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="mt-2 text-xs font-medium text-[#0FF1CE] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {authMode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-medium text-gray-400">Retype Password</label>
                  <div className="relative">
                    <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="auth-confirm-password"
                      type={showAuthConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="Retype password"
                      className={`w-full rounded-2xl border bg-black/40 py-3.5 pl-11 pr-12 text-base text-white placeholder:text-gray-500 focus:border-[#0FF1CE]/60 focus:outline-none ${authErrors.confirmPassword ? 'border-red-500' : 'border-white/10'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthConfirmPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-[#0FF1CE]"
                      aria-label={showAuthConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    >
                      {showAuthConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {authErrors.confirmPassword && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{authErrors.confirmPassword}</p>}
                  {authConfirmPassword.length > 0 && authPassword === authConfirmPassword && (
                    <p className="mt-2 text-xs text-[#0FF1CE]">Passwords match.</p>
                  )}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptAuthDisclaimer}
                  onChange={(e) => setAcceptAuthDisclaimer(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-[#1A1A1A]/50 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0"
                />
                <span className="text-xs leading-relaxed text-gray-400">
                  I acknowledge the simulated environment and agree to the{' '}
                  <Link href="/terms" className="text-[#0FF1CE] hover:underline">Terms</Link>,{' '}
                  <Link href="/privacy" className="text-[#0FF1CE] hover:underline">Privacy</Link>, and{' '}
                  <Link href="/disclaimer" className="text-[#0FF1CE] hover:underline">Disclaimer</Link>.
                </span>
              </label>

              {authMode === 'signup' && (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptAuthTerms}
                    onChange={(e) => setAcceptAuthTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-[#1A1A1A]/50 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0"
                  />
                  <span className="text-xs leading-relaxed text-gray-400">
                    I accept the Terms of Service and Privacy Policy.
                  </span>
                </label>
              )}

              {(authErrors.disclaimer || authErrors.terms) && (
                <p className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle size={14} />
                  {authErrors.disclaimer || authErrors.terms}
                </p>
              )}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0FF1CE] px-4 py-4 font-bold text-black transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAuthSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {accountUser && orderProfileReady && (
          <div className="mx-auto mt-8 max-w-4xl">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="disclaimer"
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-[#1A1A1A]/50 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0"
              />
              <label htmlFor="disclaimer" className="text-sm text-gray-400">
                <span className="md:hidden">
                  I understand Shockwave Capital provides a funded trading account and that payouts follow the program rules. I agree to the{' '}
                </span>
                <span className="hidden md:inline">
                  I acknowledge that Shockwave Capital provides a funded trading account and that payouts follow the program rules. I agree to the{' '}
                </span>
                <Link href="/disclaimer" className="text-[#0FF1CE] hover:underline">
                  Disclaimer
                </Link>, {' '}
                <Link href="/terms" className="text-[#0FF1CE] hover:underline">
                  Terms of Use
                </Link>, {' '}
                <Link href="/privacy" className="text-[#0FF1CE] hover:underline">
                  Privacy Policy
                </Link>, {' '}
                <Link href="/legal-disclosure" className="text-[#0FF1CE] hover:underline">
                  Legal Disclosure
                </Link>, and {' '}
                <Link href="/refund" className="text-[#0FF1CE] hover:underline">
                  Refund Policy
                </Link>.
              </label>
            </div>
            {formErrors.terms && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{formErrors.terms}</p>}
            {formErrors.account && <p className="mt-1 flex items-center gap-1 text-sm text-red-400"><AlertCircle size={14} />{formErrors.account}</p>}

            <div className="hidden">
              <button
                type="button"
                onClick={handleCreditCardPayment}
                disabled={!isFormValid()}
                className={`mt-6 w-full rounded-xl px-6 py-4 font-bold transition-all duration-300 ${
                  isFormValid()
                    ? 'bg-gradient-to-r from-[#0FF1CE] to-[#0AA89E] text-black hover:scale-[1.02] active:scale-[0.98]'
                    : 'cursor-not-allowed bg-gray-700 text-gray-400 opacity-50'
                }`}
              >
                <div className="relative flex items-center justify-center gap-2">
                  <CreditCard size={20} />
                  <span>Pay with Credit/Debit Card</span>
                  <ChevronRight size={20} />
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePayWithCard}
              disabled={!isFormValid() || isRedirecting || isLinkingAccount}
              className={`mt-6 w-full rounded-2xl px-6 py-4 font-bold transition-all duration-300 ${
                isFormValid() && !isRedirecting
                  ? 'bg-[#0FF1CE] text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] hover:scale-[1.02] active:scale-[0.98]'
                  : 'cursor-not-allowed bg-white/10 text-white/35'
              }`}
            >
              <div className="relative flex items-center justify-center gap-2">
                <CreditCard size={20} />
                <span>Pay with card</span>
              </div>
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              You will be redirected to complete your purchase
            </p>
            {cardError && (
              <p className="mt-2 flex items-center justify-center gap-1 text-sm text-red-400">
                <AlertCircle size={14} />
                {cardError}
              </p>
            )}

            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={!isFormValid() || isRedirecting || isLinkingAccount}
              className={`mt-3 w-full rounded-2xl px-6 py-4 font-bold transition-all duration-300 ${
                isFormValid() && !isLinkingAccount
                  ? 'border border-[#0FF1CE] text-[#0FF1CE] hover:bg-[#0FF1CE]/10'
                  : 'cursor-not-allowed bg-white/10 text-white/35'
              }`}
            >
              <div className="relative flex items-center justify-center gap-2">
                <Bitcoin size={20} />
                <span>{isLinkingAccount ? 'Preparing payment...' : 'Pay with crypto'}</span>
              </div>
            </button>
          </div>
          )}
          {selectedType === 'Gauntlet' && (
            <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 p-4 text-center">
              <p className="mb-1 text-sm font-bold text-[#FF6B6B]">🔥 Gauntlet Challenge</p>
              <p className="text-xs text-white">
                Pay only $19.99 now. If you pass, you&apos;ll pay the activation fee to get your funded account.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Activation fees: $10k→$199, $25k→$299, $50k→$499, $100k→$799, $200k→$1,499, $500k→$2,999
              </p>
            </div>
          )}
        </div>
      </div>
      {isRedirecting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[22px] border border-white/10 bg-[#121212] p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#0FF1CE] border-t-transparent" />
            <p className="text-white">Please wait while we redirect you to our payment portal</p>
          </div>
        </div>
      )}
    </div>
  );
} 