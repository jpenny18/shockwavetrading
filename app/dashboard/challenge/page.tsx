'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../../components/Particles';
import Image from 'next/image';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Check } from 'lucide-react';
import Link from 'next/link';

// Define the type for challenge options
type ChallengeType = 'Standard' | 'Instant';

const challengeTypes = [
  { 
    id: 'Standard' as const, 
    name: 'Shockwave Challenge', 
    amounts: ['$5,000', '$10,000', '$25,000', '$50,000', '$100,000', '$200,000', '$500,000'],
    image: '/shockwavechallenge.png',
    description: 'Classic two-phase trading evaluation'
  },
  { 
    id: 'Instant' as const, 
    name: 'Shockwave Instant', 
    amounts: ['$25,000', '$50,000', '$100,000'],
    image: '/shockwaveinstant.png',
    description: 'Access a simulated funded account instantly'
  }
];

const platforms = ['MT4', 'MT5'];

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

// Function to calculate table values
const calculateTableValues = (selectedType: ChallengeType | null, selectedAmount: string | null) => {
  if (!selectedType || !selectedAmount) return null;
  
  const baseAmount = parseInt(selectedAmount.replace(/\$|,/g, ''));
  
  return {
    maxDailyLoss: baseAmount * (selectedType === 'Standard' ? 0.08 : 0.04),
    maxLoss: baseAmount * (selectedType === 'Standard' ? 0.15 : 0.12),
    profitTargetStep1: baseAmount * (selectedType === 'Standard' ? 0.10 : 0.12),
    profitTargetStep2: baseAmount * (selectedType === 'Standard' ? 0.05 : 0)
  };
};

export default function ChallengePage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    discordUsername: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // Calculate table values when selectedType or selectedAmount changes
  const tableValues = calculateTableValues(selectedType, selectedAmount);

  // Check for preselected challenge type from the dashboard
  useEffect(() => {
    const preselectedType = sessionStorage.getItem('preselectedChallengeType');
    if (preselectedType && ['Standard', 'Instant'].includes(preselectedType)) {
      setSelectedType(preselectedType as ChallengeType);
      
      // Clear the preselection
      sessionStorage.removeItem('preselectedChallengeType');
    }
  }, []);

  const handleTypeSelect = (type: ChallengeType) => {
    setSelectedType(type);
    setSelectedAmount(null);
  };

  const handleAmountSelect = (amount: string) => {
    setSelectedAmount(amount);
  };

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getCurrentPrice = () => {
    if (!selectedType || !selectedAmount) return null;
    const originalPrice = calculatePrice(selectedType, selectedAmount);
    return calculateDiscountedPrice(originalPrice, appliedDiscount);
  };

  const handleProceedToPayment = () => {
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
      
      setFormErrors(errors);
      return;
    }
    
    // Store form data in session storage
    sessionStorage.setItem('challengeData', JSON.stringify({
      type: selectedType,
      amount: selectedAmount,
      platform: selectedPlatform,
      formData: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
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
    
    router.push('/dashboard/challenge/payment');
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
      termsAccepted
    );
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

  const renderDiscountSection = () => (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-4 text-white">Discount Code</h3>
      <div className="flex gap-4">
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
            className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
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
          className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black px-6 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
      {formErrors.discountCode && (
        <p className="mt-2 text-red-400 text-sm">{formErrors.discountCode}</p>
      )}
      {appliedDiscount && (
        <div className="mt-2 text-[#0FF1CE] text-sm flex items-center gap-2">
          <Check size={16} />
          <span>
            Discount applied: {appliedDiscount.type === 'percentage' 
              ? `${appliedDiscount.value}% off` 
              : `$${appliedDiscount.value} off`}
          </span>
        </div>
      )}
    </div>
  );

  const renderPriceSection = () => {
    const originalPrice = selectedType && selectedAmount ? calculatePrice(selectedType, selectedAmount) : null;
    const finalPrice = getCurrentPrice();
    
    if (!originalPrice || !finalPrice) return null;
    
    return (
      <div className="flex justify-between items-center">
        <div>
          <div className="text-gray-400">Total Amount</div>
          {appliedDiscount && (
            <div className="text-[#0FF1CE] text-sm mt-1 flex items-center gap-2">
              <Check size={14} />
              <span>
                {appliedDiscount.code} ({appliedDiscount.type === 'percentage' 
                  ? `${appliedDiscount.value}% off` 
                  : `$${appliedDiscount.value} off`})
              </span>
            </div>
          )}
        </div>
        <div className="text-right">
          {appliedDiscount && (
            <div className="text-gray-400 line-through text-sm mb-1">${originalPrice.toFixed(2)}</div>
          )}
          <div className="text-2xl font-bold text-[#0FF1CE]">${finalPrice.toFixed(2)}</div>
        </div>
      </div>
    );
  };

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
        {/* Launch Day Sale Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-[#0FF1CE]/10 to-[#00D4FF]/10 rounded-lg border border-[#0FF1CE]/20 shadow-lg shadow-[#0FF1CE]/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0FF1CE]/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00D4FF]/10 rounded-full blur-xl -ml-8 -mb-8"></div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between relative z-10">
            <div className="flex flex-col items-center md:items-start">
              <div className="text-sm text-white/70 mb-1">Special Launch Offer!</div>
              <div className="text-2xl md:text-3xl font-bold text-[#0FF1CE] mb-1 md:mb-0">SAVE 40% OFF</div>
            </div>
            <div className="flex flex-col items-center md:items-end mt-3 md:mt-0">
              <div className="text-xs text-gray-400 mb-1">Use Code:</div>
              <div className="text-xl font-mono font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent tracking-wider px-4 py-2 border border-[#0FF1CE]/30 rounded-md">
                SHOCKWAVE
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-6">No more hand holding and baby rules. Let's get you funded</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* First Card - Challenge Selection */}
          <div className="lg:col-span-3 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50">
            {/* Challenge Type Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-white">Select Challenge Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {/* Image section - top 70% */}
                    <div className="relative w-full aspect-[16/10] overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#151515] to-[#0D0D0D]">
                      <div className="relative w-[105%] h-[105%]">
                        <Image
                          src={type.image}
                          alt={type.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    </div>
                    
                    {/* Text section - bottom 30% */}
                    <div className="p-4 bg-[#0D0D0D]">
                      <h2 className="text-sm font-bold mb-1 text-white text-center">
                        {type.name}
                      </h2>
                      <div className="h-0.5 w-12 bg-[#0FF1CE] mb-2 rounded mx-auto"></div>
                      <p className="text-gray-400 text-xs text-center">
                        {type.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Selection */}
            <div className={`mb-8 ${selectedType ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <h3 className="text-lg font-medium mb-4 text-white">Select Account Size</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(selectedType ? challengeTypes.find(type => type.id === selectedType)?.amounts : [])?.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`p-4 rounded-xl border-2 bg-gradient-to-b from-[#151515] to-[#0D0D0D] transition-all duration-300 ${
                      selectedAmount === amount
                        ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)] text-[#0FF1CE]'
                        : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 text-gray-300'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Selection */}
            <div className={`mb-8 ${selectedAmount ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <h3 className="text-lg font-medium mb-4 text-white">Select Platform</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-full md:max-w-[50%]">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handlePlatformSelect(platform)}
                    className={`p-4 rounded-xl border-2 min-w-[100px] bg-gradient-to-b from-[#151515] to-[#0D0D0D] transition-all duration-300 ${
                      selectedPlatform === platform
                        ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)] text-[#0FF1CE]'
                        : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 text-gray-300'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Code and Price Display */}
            {selectedType && selectedAmount && selectedPlatform && (
              <>
                {renderDiscountSection()}
                <div className="p-4 bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 rounded-lg border border-[#0FF1CE]/20">
                  {renderPriceSection()}
                </div>
              </>
            )}
          </div>

          {/* Second Card - Personal Information */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50">
            <h3 className="text-lg font-medium mb-4 text-white">Your Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.firstName ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                />
                {formErrors.firstName && <p className="mt-1 text-sm text-red-500">{formErrors.firstName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.lastName ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                />
                {formErrors.lastName && <p className="mt-1 text-sm text-red-500">{formErrors.lastName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.email ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.phone ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                />
                {formErrors.phone && <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full bg-[#151515]/50 backdrop-blur-sm border ${formErrors.country ? 'border-red-500' : 'border-[#2F2F2F]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all`}
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {formErrors.country && <p className="mt-1 text-sm text-red-500">{formErrors.country}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Discord Username (Optional)</label>
                <input
                  type="text"
                  name="discordUsername"
                  value={formData.discordUsername}
                  onChange={handleInputChange}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="pt-4">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="disclaimer"
                    checked={termsAccepted}
                    onChange={() => setTermsAccepted(!termsAccepted)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]"
                  />
                  <label htmlFor="disclaimer" className="text-sm text-gray-400">
                    I acknowledge that Shockwave Capital provides a simulated trading environment and that all activity is for educational and evaluative purposes only. I agree to the{' '}
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
                {formErrors.terms && <p className="mt-1 text-sm text-red-500">{formErrors.terms}</p>}
              </div>
              
              <button
                onClick={handleProceedToPayment}
                className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 mt-6"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>

        {/* Challenge Details Table */}
        {selectedType && selectedAmount && (
          <div className="mt-12 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#2F2F2F]/50">
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
                        ['Minimum Profitable Days', '4 Days', '4 Days', 'X'],
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
                        ['Profit Target', `$${tableValues?.profitTargetStep1.toLocaleString()} (10%)`, `$${tableValues?.profitTargetStep2.toLocaleString()} (5%)`, 'X'],
                        ['Leverage', 
                          <div key="lev1" className="flex items-center justify-center">
                            <span className="text-[#0FF1CE] font-bold text-base md:text-lg animate-pulse">1:200</span>
                          </div>,
                          <div key="lev2" className="flex items-center justify-center">
                            <span className="text-[#0FF1CE] font-bold text-base md:text-lg animate-pulse">1:200</span>
                          </div>,
                          <div key="lev3" className="flex items-center justify-center">
                            <span className="text-[#0FF1CE] font-bold text-base md:text-lg animate-pulse">1:200</span>
                          </div>
                        ],
                        ['News Trading', 'Yes', 'Yes', 'Yes'],
                        ['Profit Split', '-', '-', 'Up to 95% (Simulated Payout)'],
                        ['Payout Eligibility', '-', '-', '14 Days'],
                        ['Refundable Fee', `$${getCurrentPrice()}`, 'Free', 'Refund']
                      ].map((row, i) => (
                        <div 
                          key={i} 
                          className={`col-span-4 grid grid-cols-4 border-b border-[#2F2F2F] last:border-b-0 transition-colors duration-300 hover:bg-[#0FF1CE]/5 ${i % 2 === 0 ? 'bg-[#1A1A1A]/80' : 'bg-[#0D0D0D]/80'}`}
                        >
                          <div className="p-3 md:p-4 border-r border-[#2F2F2F] font-medium flex items-center text-xs md:text-sm text-white">{row[0]}</div>
                          <div className="p-3 md:p-4 border-r border-[#2F2F2F] text-center flex items-center justify-center text-white">{row[1]}</div>
                          <div className="p-3 md:p-4 border-r border-[#2F2F2F] text-center flex items-center justify-center text-white">{row[2]}</div>
                          <div className="p-3 md:p-4 text-center flex items-center justify-center text-white">{row[3]}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        ['Trading Period', '30 Days'],
                        ['Minimum Trading Days', '5 Days'],
                        ['Maximum Daily Loss', 
                          <div key="dailyi" className="flex flex-col items-center">
                            <span className="text-[#0FF1CE] font-bold text-base md:text-lg">4%</span>
                            <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxDailyLoss.toLocaleString()}</span>
                          </div>
                        ],
                        ['Maximum Loss', 
                          <div key="maxi" className="flex flex-col items-center">
                            <span className="text-[#0FF1CE] font-bold text-base md:text-lg">12%</span>
                            <span className="text-white text-[10px] md:text-xs mt-1 bg-[#0FF1CE]/20 px-2 py-0.5 rounded-full">${tableValues?.maxLoss.toLocaleString()}</span>
                          </div>
                        ],
                        ['Profit Target', `$${tableValues?.profitTargetStep1.toLocaleString()} (12%)`],
                        ['Leverage', 
                          <div key="levi" className="flex items-center justify-center">
                            <span className="text-[#0FF1CE] font-bold text-base md:text-lg animate-pulse">1:200</span>
                          </div>
                        ],
                        ['News Trading', 'Yes'],
                        ['Payout Eligibility', '6 Days'],
                        ['Profit Split', '70% (Simulated Payout)'],
                        ['One Free Retry', 'Yes'],
                        ['One-Time Price', `$${getCurrentPrice()}`]
                      ].map((row, i) => (
                        <div 
                          key={i} 
                          className={`col-span-2 grid grid-cols-2 border-b border-[#2F2F2F] last:border-b-0 transition-colors duration-300 hover:bg-[#0FF1CE]/5 ${i % 2 === 0 ? 'bg-[#1A1A1A]/80' : 'bg-[#0D0D0D]/80'}`}
                        >
                          <div className="p-3 md:p-4 border-r border-[#2F2F2F] font-medium flex items-center text-xs md:text-sm text-white">{row[0]}</div>
                          <div className="p-3 md:p-4 text-center flex items-center justify-center text-white">{row[1]}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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