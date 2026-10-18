'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../components/Particles';
import Image from 'next/image';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, registerUser, signInUser, getUser, updateUser, getCurrentUser } from '@/lib/firebase';
import { Check, Zap, Shield, TrendingUp, ChevronRight, AlertCircle, CreditCard, CalendarOff, Percent, Tag, Gift, ChevronDown } from 'lucide-react';
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
    description: 'Access a simulated funded account instantly',
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

const countries = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo, Democratic Republic' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Korea, North' },
  { code: 'KR', name: 'Korea, South' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macao' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
];

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  password?: string;
  confirmPassword?: string;
  type?: string;
  amount?: string;
  platform?: string;
  terms?: string;
  discountCode?: string;
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    discordUsername: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountUser, setAccountUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);
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

  const hasAccountAccess = Boolean(accountUser || (password.length >= 6 && password === confirmPassword));

  const isInfoComplete = Boolean(
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.phone &&
    formData.country &&
    termsAccepted &&
    hasAccountAccess
  );

  const isInfoStarted = Boolean(
    formData.firstName ||
    formData.lastName ||
    formData.email ||
    formData.phone ||
    formData.country ||
    formData.discordUsername ||
    termsAccepted ||
    addonsContinued
  );

  // Steps 1-3 require selections; step 4 (add-ons) is optional;
  // step 5 completes when required info + terms are filled.
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
      if (!user) {
        setAccountUser(null);
        return;
      }

      setAccountUser({ uid: user.uid, email: user.email });

      try {
        const profile = await getUser(user.uid);
        const nameParts = (user.displayName || '').split(' ').filter(Boolean);
        setFormData((prev) => ({
          ...prev,
          email: user.email || prev.email,
          firstName: prev.firstName || profile?.firstName || nameParts[0] || '',
          lastName: prev.lastName || profile?.lastName || nameParts.slice(1).join(' ') || '',
          phone: prev.phone || profile?.phone || '',
          country: prev.country || profile?.country || ''
        }));
      } catch (error) {
        console.error('Could not load account profile:', error);
        if (user.email) {
          setFormData((prev) => ({ ...prev, email: user.email || prev.email }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const ensureAccount = async (): Promise<{ uid: string; email: string } | null> => {
    const signedIn = accountUser
      ? accountUser
      : await (async () => {
          const user = await getCurrentUser();
          if (!user) return null;
          const linked = { uid: user.uid, email: user.email };
          setAccountUser(linked);
          return linked;
        })();

    if (signedIn) {
      try {
        await updateUser(signedIn.uid, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          country: formData.country,
          displayName: `${formData.firstName} ${formData.lastName}`.trim()
        });
      } catch (error) {
        console.error('Could not refresh profile before checkout:', error);
      }
      return { uid: signedIn.uid, email: signedIn.email || formData.email };
    }

    if (password.length < 6) {
      setFormErrors((prev) => ({ ...prev, password: 'Password must be at least 6 characters' }));
      return null;
    }
    if (password !== confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return null;
    }

    try {
      const credential = await registerUser(formData.email, password, {
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      try {
        await updateUser(credential.user.uid, {
          phone: formData.phone,
          country: formData.country
        });
      } catch (error) {
        console.error('Could not save profile details:', error);
      }
      const linked = { uid: credential.user.uid, email: credential.user.email || formData.email };
      setAccountUser(linked);
      return linked;
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        try {
          const credential = await signInUser(formData.email, password);
          const linked = { uid: credential.user.uid, email: credential.user.email || formData.email };
          setAccountUser(linked);
          return linked;
        } catch (signInError: any) {
          const activeUser = auth.currentUser;
          const wrongPassword = ['auth/wrong-password', 'auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-email'].includes(signInError?.code);
          if (!wrongPassword && activeUser && activeUser.email?.toLowerCase() === formData.email.toLowerCase()) {
            const linked = { uid: activeUser.uid, email: activeUser.email };
            setAccountUser(linked);
            return linked;
          }
          setFormErrors((prev) => ({
            ...prev,
            email: 'This email already has an account.',
            password: 'Enter the password for that account to continue.'
          }));
          return null;
        }
      }

      setFormErrors((prev) => ({
        ...prev,
        password: 'Could not create your account. Please try again.'
      }));
      return null;
    }
  };

  const handleProceedToPayment = async () => {
    if (!isFormValid()) {
      // Show validation errors
      const errors: FormErrors = {};
      if (!formData.firstName) errors.firstName = 'First name is required';
      if (!formData.lastName) errors.lastName = 'Last name is required';
      if (!formData.email) errors.email = 'Email is required';
      if (!formData.phone) errors.phone = 'Phone number is required';
      if (!formData.country) errors.country = 'Country is required';
      if (!selectedType) errors.type = 'Please select a challenge type';
      if (!selectedAmount) errors.amount = 'Please select an amount';
      if (!selectedPlatform) errors.platform = 'Please select a platform';
      if (!termsAccepted) errors.terms = 'Please accept the terms and conditions';
      if (!accountUser && password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (!accountUser && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
      
      setFormErrors(errors);
      return;
    }

    setIsLinkingAccount(true);
    try {
      const account = await ensureAccount();
      if (!account) return;
    
    // Store form data in session storage
    sessionStorage.setItem('challengeData', JSON.stringify({
      type: selectedType,
      amount: selectedAmount,
      platform: selectedPlatform,
      addOns: selectedAddOns,
      userId: account.uid,
      formData: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: account.email,
        phone: formData.phone,
        country: formData.country,
        discordUsername: formData.discordUsername || ''
      },
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
    if (!isFormValid()) {
      // Show validation errors
      const errors: FormErrors = {};
      if (!formData.firstName) errors.firstName = 'First name is required';
      if (!formData.lastName) errors.lastName = 'Last name is required';
      if (!formData.email) errors.email = 'Email is required';
      if (!formData.phone) errors.phone = 'Phone number is required';
      if (!formData.country) errors.country = 'Country is required';
      if (!selectedType) errors.type = 'Please select a challenge type';
      if (!selectedAmount) errors.amount = 'Please select an amount';
      if (!selectedPlatform) errors.platform = 'Please select a platform';
      if (!termsAccepted) errors.terms = 'Please accept the terms and conditions';
      if (!accountUser && password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (!accountUser && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
      
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
        customerEmail: account.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country,
        discordUsername: formData.discordUsername || '',
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
      selectedType &&
      selectedAmount &&
      selectedPlatform &&
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.country &&
      termsAccepted &&
      hasAccountAccess &&
      !isLinkingAccount
    );
  };

  const renderStepCircle = (step: number, size: 'sm' | 'md' = 'md') => {
    const state = getStepState(step);
    const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold border-2 transition-all duration-500 shrink-0 ${
          state === 'complete'
            ? 'bg-[#0FF1CE] border-[#0FF1CE] text-black shadow-[0_0_12px_rgba(15,241,206,0.45)]'
            : state === 'current'
              ? 'bg-[#0FF1CE]/15 border-[#0FF1CE] text-[#0FF1CE] shadow-[0_0_12px_rgba(15,241,206,0.35)] scale-110'
              : 'bg-[#151515] border-[#2F2F2F] text-gray-500'
        }`}
      >
        {state === 'complete' ? <Check size={size === 'sm' ? 14 : 16} strokeWidth={3} /> : step}
      </div>
    );
  };

  const renderProgressStepper = () => (
    <div className="mb-8 lg:mb-10 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-[#2F2F2F]/50">
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
                    className="h-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] rounded-full transition-all duration-700 ease-out"
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
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#0FF1CE] to-[#00D4FF] transition-all duration-700 ease-out rounded-full"
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
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#0FF1CE] to-[#00D4FF] transition-all duration-700 ease-out rounded-full"
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
          <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(4) === 'upcoming' ? 'text-gray-500' : 'text-[#0FF1CE]'}`}>
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
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                      : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                  }`}
                >
                  <div className="relative p-4 bg-gradient-to-b from-[#151515] to-[#0D0D0D]">
                    <div className="relative flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#0FF1CE]/20 border-[#0FF1CE]/50 text-[#0FF1CE] shadow-[0_0_16px_rgba(15,241,206,0.35)]'
                          : 'bg-[#1A1A1A] border-[#2F2F2F] text-gray-400 group-hover:text-[#0FF1CE] group-hover:border-[#0FF1CE]/40'
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

              <div className="hidden lg:block p-4 bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 rounded-lg border border-[#0FF1CE]/20">
                {renderPriceSection()}
              </div>
              <div className="p-4 bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 rounded-lg border border-[#0FF1CE]/20 lg:hidden">
                {renderPriceSection()}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddonsContinued(true);
                  scrollToStep(5, true);
                }}
                className={`mt-auto w-full rounded-xl overflow-hidden border-2 transition-all duration-300 group ${
                  getStepState(5) === 'upcoming'
                    ? 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                    : 'border-[#0FF1CE]/40 hover:border-[#0FF1CE] shadow-[0_0_16px_rgba(15,241,206,0.15)] hover:shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-b from-[#151515] to-[#0D0D0D] group-hover:from-[#0FF1CE]/10 group-hover:to-[#0D0D0D] transition-colors">
                  <div className="text-left min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-[#0FF1CE]/80 font-semibold">Next Step</div>
                    <div className="text-sm sm:text-base font-semibold text-white group-hover:text-[#0FF1CE] transition-colors truncate">
                      Continue to Your Information
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#0FF1CE] shrink-0 group-hover:translate-x-1 transition-transform" />
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
          className="w-full rounded-xl overflow-hidden border-2 border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 group"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-b from-[#151515] to-[#0D0D0D] text-white font-medium group-hover:text-[#0FF1CE] transition-colors">
            <Tag size={18} className="text-[#0FF1CE]" />
            <span>Apply Discount</span>
            <ChevronDown size={16} className="text-gray-400 group-hover:text-[#0FF1CE] transition-colors" />
          </div>
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden border-2 border-[#2F2F2F]/50 bg-gradient-to-b from-[#151515] to-[#0D0D0D]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2F2F2F]/50">
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
                  className="w-full bg-[#0D0D0D]/80 border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-[#0FF1CE]/40 transition-all placeholder:text-gray-600"
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
                className="bg-[#0FF1CE] text-black px-5 py-3 rounded-lg font-semibold hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                Apply
              </button>
            </div>
            {formErrors.discountCode && (
              <p className="mt-2 text-red-400 text-sm">{formErrors.discountCode}</p>
            )}
            {appliedDiscount && (
              <div className="mt-3 text-[#0FF1CE] text-sm flex items-center gap-2 bg-[#0FF1CE]/10 border border-[#0FF1CE]/20 rounded-lg px-3 py-2">
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
      <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50">
        <h3 className="text-xl font-bold text-[#0FF1CE] mb-6 text-center">Challenge Details</h3>
        
        <div className={`${selectedType === 'Standard' ? 'max-w-5xl' : 'max-w-3xl'} mx-auto overflow-x-auto py-4 px-4 md:px-8`}>
          <div className={`${selectedType === 'Standard' ? 'min-w-[650px]' : 'min-w-[450px]'} md:min-w-0 rounded-2xl transform hover:scale-[1.01] transition-transform duration-300 overflow-hidden mx-auto md:scale-[0.85] md:origin-top`}>
            <div 
              className={`grid ${selectedType === 'Standard' ? 'grid-cols-4' : 'grid-cols-2'} text-xs md:text-sm bg-gradient-to-br from-[#0FF1CE]/10 to-transparent backdrop-blur-sm rounded-2xl border border-[#0FF1CE]/30`}
              style={{
                boxShadow: '0 0 30px rgba(15, 241, 206, 0.2)'
              }}
            >
              {/* Header */}
              {selectedType === 'Standard' ? (
                <div className="col-span-4 grid grid-cols-4 bg-gradient-to-r from-[#0FF1CE] to-[#0FF1CE]/80">
                  <div className="p-3 md:p-4 border-r border-black/20 text-black font-bold"></div>
                  <div className="p-3 md:p-4 border-r border-black/20 text-center text-black font-bold">CHALLENGE</div>
                  <div className="p-3 md:p-4 border-r border-black/20 text-center text-black font-bold">VERIFICATION</div>
                  <div className="p-3 md:p-4 text-center text-black font-bold">FUNDED</div>
                </div>
              ) : selectedType === '1-Step' ? (
                <div className="col-span-2 grid grid-cols-2 bg-gradient-to-r from-[#0FF1CE] to-[#0FF1CE]/80">
                  <div className="p-3 md:p-4 border-r border-black/20 text-black font-bold"></div>
                  <div className="p-3 md:p-4 text-center text-black font-bold">FUNDED</div>
                </div>
              ) : selectedType === 'Gauntlet' ? (
                <div className="col-span-2 grid grid-cols-2 bg-gradient-to-r from-[#FF6B6B] to-[#EE5A24]">
                  <div className="p-3 md:p-4 border-r border-black/20 text-white font-bold"></div>
                  <div className="p-3 md:p-4 text-center text-white font-bold">GAUNTLET</div>
                </div>
              ) : (
                <div className="col-span-2 grid grid-cols-2 bg-gradient-to-r from-[#0FF1CE] to-[#0FF1CE]/80">
                  <div className="p-3 md:p-4 border-r border-black/20 text-black font-bold"></div>
                  <div className="p-3 md:p-4 text-center text-black font-bold">FUNDED</div>
                </div>
              )}

              {/* Rows */}
              {selectedType === 'Standard' ? (
                <>
                  {[
                    ['Trading Period', 'Unlimited', 'Unlimited', 'Unlimited'],
                    ['Minimum Trading Days', '5 Days', '5 Days', 'X'],
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
                    ['Payout Eligibility', 'X', 'X', '14 Days'],
                    ['Profit Split', 'X', 'X', 'Up to 95%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-[#0FF1CE]/[0.08]'}`}>
                      <div className="p-3 md:p-4 border-t border-[#2F2F2F]/50 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-[#2F2F2F]/50 text-center text-sm md:text-xs">{row[1]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-[#2F2F2F]/50 text-center text-sm md:text-xs">{row[2]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-[#2F2F2F]/50 text-center text-sm md:text-xs">{row[3]}</div>
                    </div>
                  ))}
                </>
              ) : selectedType === '1-Step' ? (
                <>
                  {[
                    ['Trading Period', 'Unlimited'],
                    ['Minimum Trading Days', '5 Days'],
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
                    ['First Withdrawal', '5 Days'],
                    ['Profit Split', 'Up to 95%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-[#0FF1CE]/[0.08]'}`}>
                      <div className="p-3 md:p-4 border-t border-[#2F2F2F]/50 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-[#2F2F2F]/50 text-center text-sm md:text-xs">{row[1]}</div>
                    </div>
                  ))}
                </>
              ) : selectedType === 'Instant' ? (
                <>
                  {[
                    ['Trading Period', '30 Days'],
                    ['Minimum Profitable Days', '5 Days'],
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
                    ['First Withdrawal', '6 Days'],
                    ['Profit Split', '70%']
                  ].map((row, index) => (
                    <div key={index} className={`contents text-white ${index % 2 === 0 ? 'bg-[#ffffff08]' : 'bg-[#0FF1CE]/[0.08]'}`}>
                      <div className="p-3 md:p-4 border-t border-[#2F2F2F]/50 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-[#2F2F2F]/50 text-center text-sm md:text-xs">{row[1]}</div>
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
                      <div className="p-3 md:p-4 border-t border-[#2F2F2F]/50 font-medium text-sm md:text-xs">{row[0]}</div>
                      <div className="p-3 md:p-4 border-t border-l border-[#2F2F2F]/50 text-center text-sm md:text-xs">{row[1]}</div>
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
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0D] via-[#0D0D0D] to-[#151515] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      </div>
      <Particles />

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-xl lg:text-5xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-4">
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
          <div className="lg:col-span-7 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50">
            <div ref={step1Ref} className="flex gap-3 sm:gap-4 mb-2">
              {renderStepRail(1)}
              <div className="flex-1 min-w-0 pb-8">
                <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(1) === 'upcoming' ? 'text-gray-500' : 'text-[#0FF1CE]'}`}>
                  Select Challenge Type
                </h3>
                <div className="max-md:scale-[1] max-md:origin-top">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {challengeTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        className={`relative group w-full rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                          selectedType === type.id
                            ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                            : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                        }`}
                      >
                        {/* Image section */}
                        <div className="relative w-full aspect-[16/12] overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#151515] to-[#0D0D0D]">
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
                        <div className="p-3 bg-[#0D0D0D]">
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
                <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(2) === 'upcoming' ? 'text-gray-500' : 'text-[#0FF1CE]'}`}>
                  Select Account Size
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(selectedType ? challengeTypes.find(type => type.id === selectedType)?.amounts : [])?.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                        selectedAmount === amount
                          ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                          : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                      }`}
                    >
                      <div className={`px-3 py-4 bg-gradient-to-b from-[#151515] to-[#0D0D0D] font-semibold transition-colors ${
                        selectedAmount === amount ? 'text-[#0FF1CE]' : 'text-gray-300'
                      }`}>
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
                <h3 className={`text-lg font-medium mb-4 transition-colors duration-300 ${getStepState(3) === 'upcoming' ? 'text-gray-500' : 'text-[#0FF1CE]'}`}>
                  Select Platform
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => handlePlatformSelect(platform)}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                        selectedPlatform === platform
                          ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                          : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
                      }`}
                    >
                      <div className="relative w-full aspect-[16/7] overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#151515] to-[#0D0D0D] px-4">
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
                <div className="hidden lg:block mb-4 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-4 border border-[#0FF1CE]/30">
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
                    <div className="mt-4 pt-4 border-t border-[#0FF1CE]/20">
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
          className="mt-8 lg:mt-12 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-[#2F2F2F]/50"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            {renderStepCircle(5)}
            <h3 className={`text-xl lg:text-2xl font-bold transition-colors duration-300 ${getStepState(5) === 'upcoming' ? 'text-gray-500' : 'text-[#0FF1CE]'}`}>
              Your Information
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 max-w-4xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.firstName ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                placeholder="First Name"
                />
              {formErrors.firstName && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.firstName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.lastName ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                placeholder="Last Name"
                />
              {formErrors.lastName && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.lastName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={accountUser?.email || formData.email}
                  onChange={handleInputChange}
                  readOnly={Boolean(accountUser)}
                className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.email ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all ${accountUser ? 'opacity-80' : ''}`}
                placeholder="Email"
                />
              {formErrors.email && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.email}</p>}
              {accountUser && (
                <p className="mt-1 text-xs text-[#0FF1CE]">This purchase will be added to your account.</p>
              )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.phone ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                placeholder="Phone"
                />
              {formErrors.phone && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.country ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                >
                  <option value="">Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              {formErrors.country && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.country}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <span className="md:hidden">Discord (Optional)</span>
                  <span className="hidden md:inline">Discord Username (Optional)</span>
                </label>
                <input
                  type="text"
                  name="discordUsername"
                  value={formData.discordUsername}
                  onChange={handleInputChange}
                className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                placeholder="Discord Username"
                />
            </div>

            {!accountUser && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Create Password</label>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.password ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                    placeholder="Create a password"
                  />
                  {formErrors.password && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.confirmPassword ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                    placeholder="Confirm password"
                  />
                  {formErrors.confirmPassword && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.confirmPassword}</p>}
                  <p className="mt-1 text-xs text-gray-500">Create an account so this purchase is saved to your client portal.</p>
                </div>
              </>
            )}
              </div>
              
          <div className="mt-8 max-w-4xl mx-auto">
            
            
            <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="disclaimer"
                    checked={termsAccepted}
                    onChange={() => setTermsAccepted(!termsAccepted)}
                className="mt-1 w-4 h-4 rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]/50"
                  />
                  <label htmlFor="disclaimer" className="text-sm text-gray-400">
                    <span className="md:hidden">
                      I understand Shockwave Capital is a simulated trading environment for educational and evaluative purposes only. I agree to the{' '}
                    </span>
                    <span className="hidden md:inline">
                      I acknowledge that Shockwave Capital provides a simulated trading environment and that all activity is for educational and evaluative purposes only. I agree to the{' '}
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
            {formErrors.terms && <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle size={14} />{formErrors.terms}</p>}
              
              {/* Credit/Debit Card payment - hidden (Whop dropped us) */}
              <div className="hidden">
                <button
                  onClick={handleCreditCardPayment}
                  disabled={!isFormValid()}
                  className={`w-full mt-6 relative overflow-hidden rounded-xl font-bold py-4 px-6 transition-all duration-300 ${
                    isFormValid()
                      ? 'bg-gradient-to-r from-[#0FF1CE] to-[#0AA89E] text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="relative flex items-center justify-center gap-2">
                    <CreditCard size={20} />
                    <span>Pay with Credit/Debit Card</span>
                    <ChevronRight size={20} className={isFormValid() ? 'group-hover:translate-x-1 transition-transform' : ''} />
                  </div>
                </button>
              </div>
              
              <button
                onClick={handleProceedToPayment}
                disabled={!isFormValid()}
                className={`w-full mt-6 relative overflow-hidden rounded-xl font-bold py-4 px-6 transition-all duration-300 ${
                  isFormValid()
                    ? 'bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="relative flex items-center justify-center gap-2">
                  <span>{isLinkingAccount ? 'Saving your account...' : 'Continue To Payment'}</span>
                  <ChevronRight size={20} className={isFormValid() ? 'group-hover:translate-x-1 transition-transform' : ''} />
                </div>
              </button>
              {selectedType === 'Gauntlet' ? (
                <div className="text-center mt-3 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg">
                  <p className="text-[#FF6B6B] font-bold text-sm mb-1">🔥 Gauntlet Challenge</p>
                  <p className="text-white text-xs">
                    Pay only $19.99 now. If you pass, you'll pay the activation fee to get your funded account.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Activation fees: $10k→$199, $25k→$299, $50k→$499, $100k→$799, $200k→$1,499, $500k→$2,999
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center mt-2">
                  You will be redirected to complete your purchase
                </p>
              )}
            </div>
          </div>
        </div>
    </div>
  );
} 