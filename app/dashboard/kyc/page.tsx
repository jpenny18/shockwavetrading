'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  auth,
  getKYCSubmission,
  createOrUpdateKYCSubmission,
  isUserEligibleForKYC,
  uploadFile,
  KYCSubmission,
  Timestamp
} from '@/lib/firebase';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Shield,
  Clock,
  XCircle,
  RefreshCw,
  Lock,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function KYCPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isEligible, setIsEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<KYCSubmission | null>(null);
  
  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: ''
  });

  // Document uploads
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);
  const [agreementSigned, setAgreementSigned] = useState(false);
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkEligibilityAndLoadData();
  }, []);

  const checkEligibilityAndLoadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth');
        return;
      }

      // Check if user is eligible (passed challenge)
      const eligible = await isUserEligibleForKYC(user.uid);
      setIsEligible(eligible);

      // Load existing submission if any
      const submission = await getKYCSubmission(user.uid);
      if (submission) {
        setExistingSubmission(submission);
        setPersonalInfo(submission.personalInfo);
        
        // Set current step based on submission status
        if (submission.status === 'approved') {
          setCurrentStep(4); // Show completed state
        } else if (submission.documents.tradingAgreementSignedAt) {
          setCurrentStep(3);
          setAgreementSigned(true);
        } else if (submission.documents.governmentIdUrl || submission.documents.proofOfAddressUrl) {
          setCurrentStep(2);
        }
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validatePersonalInfo = () => {
    const newErrors: Record<string, string> = {};
    
    if (!personalInfo.firstName) newErrors.firstName = 'First name is required';
    if (!personalInfo.lastName) newErrors.lastName = 'Last name is required';
    if (!personalInfo.address) newErrors.address = 'Address is required';
    if (!personalInfo.city) newErrors.city = 'City is required';
    if (!personalInfo.state) newErrors.state = 'State/Province is required';
    if (!personalInfo.postalCode) newErrors.postalCode = 'Postal code is required';
    if (!personalInfo.country) newErrors.country = 'Country is required';
    if (!personalInfo.phone) newErrors.phone = 'Phone number is required';
    if (!personalInfo.email) newErrors.email = 'Email is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePersonalInfoSubmit = async () => {
    if (!validatePersonalInfo()) return;
    
    try {
      setIsSaving(true);
      const user = auth.currentUser;
      if (!user) return;

      await createOrUpdateKYCSubmission(user.uid, {
        email: user.email || personalInfo.email,
        personalInfo
      });

      setCurrentStep(2);
    } catch (error) {
      console.error('Error saving personal info:', error);
      setErrors({ general: 'Failed to save information. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!governmentId || !proofOfAddress) {
      setErrors({ documents: 'Please upload both required documents' });
      return;
    }

    try {
      setIsSaving(true);
      const user = auth.currentUser;
      if (!user) return;

      // Upload government ID
      const govIdPath = `kyc/${user.uid}/government-id-${Date.now()}.${governmentId.name.split('.').pop()}`;
      const govIdUrl = await uploadFile(governmentId, govIdPath);

      // Upload proof of address
      const poaPath = `kyc/${user.uid}/proof-of-address-${Date.now()}.${proofOfAddress.name.split('.').pop()}`;
      const poaUrl = await uploadFile(proofOfAddress, poaPath);

      // Update submission with document URLs
      await createOrUpdateKYCSubmission(user.uid, {
        documents: {
          governmentIdUrl: govIdUrl,
          governmentIdFileName: governmentId.name,
          proofOfAddressUrl: poaUrl,
          proofOfAddressFileName: proofOfAddress.name
        }
      });

      // Refresh the existing submission data
      const updatedSubmission = await getKYCSubmission(user.uid);
      if (updatedSubmission) {
        setExistingSubmission(updatedSubmission);
      }

      setCurrentStep(3);
    } catch (error) {
      console.error('Error uploading documents:', error);
      setErrors({ documents: 'Failed to upload documents. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgreementSign = async () => {
    if (!agreementSigned) {
      setErrors({ agreement: 'Please agree to the terms' });
      return;
    }

    try {
      setIsSaving(true);
      const user = auth.currentUser;
      if (!user) return;

      // Update submission with agreement signature
      await createOrUpdateKYCSubmission(user.uid, {
        documents: {
          tradingAgreementSignedAt: Timestamp.now()
        },
        status: 'pending' // Ensure status is set to pending for review
      });

      setCurrentStep(4);
    } catch (error) {
      console.error('Error signing agreement:', error);
      setErrors({ agreement: 'Failed to save agreement. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  if (!isEligible && !existingSubmission) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#2F2F2F]/50">
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mx-auto mb-6">
            <Lock className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent text-center mb-4">
            KYC Verification Locked
          </h1>
          <p className="text-gray-400 text-center mb-6">
            KYC verification is only available for traders who have passed their challenge. 
            Complete your trading challenge first to unlock this feature.
          </p>
          <button
            onClick={() => router.push('/dashboard/accounts')}
            className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
          >
            View My Accounts
          </button>
        </div>
      </div>
    );
  }

  // Progress indicator
  const steps = [
    { number: 1, title: 'Personal Information', icon: User },
    { number: 2, title: 'Document Upload', icon: FileText },
    { number: 3, title: 'Trading Agreement', icon: Shield }
  ];

  const getStatusBadge = () => {
    if (!existingSubmission) return null;
    
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Under Review' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500', icon: XCircle, text: 'Rejected' },
      needs_resubmission: { color: 'bg-orange-500', icon: RefreshCw, text: 'Resubmission Required' }
    };
    
    const config = statusConfig[existingSubmission.status];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.color}/20 text-white`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{config.text}</span>
      </div>
    );
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Decorative glow orbs */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000 pointer-events-none"></div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">KYC Verification</h1>
          {getStatusBadge()}
        </div>
        <p className="text-gray-400">
          Complete your Know Your Customer (KYC) verification to become a funded trader.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number || existingSubmission?.status === 'approved';
          
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isCompleted ? 'bg-[#0FF1CE] border-[#0FF1CE] text-black shadow-[0_0_12px_rgba(15,241,206,0.45)]' : isActive ? 'bg-[#0FF1CE]/15 border-[#0FF1CE] text-[#0FF1CE] shadow-[0_0_12px_rgba(15,241,206,0.35)]' : 'bg-[#151515] border-[#2F2F2F] text-gray-500'}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-black" />
                  ) : (
                    <Icon className={`w-6 h-6 ${isActive ? 'text-[#0FF1CE]' : 'text-gray-500'}`} />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                    Step {step.number}
                  </p>
                  <p className={`text-xs ${isActive || isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${isCompleted ? 'bg-[#0FF1CE]' : 'bg-[#2F2F2F]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Review Notes */}
      {existingSubmission?.reviewNotes && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-500 mb-1">Review Notes</p>
              <p className="text-sm text-gray-300">{existingSubmission.reviewNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#2F2F2F]/50">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="John"
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="123 Main Street"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={personalInfo.city}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="New York"
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={personalInfo.state}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, state: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="NY"
                />
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={personalInfo.postalCode}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, postalCode: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="10001"
                />
                {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={personalInfo.country}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="United States"
                />
                {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                  placeholder="john.doe@example.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>

            {errors.general && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-500 text-sm">{errors.general}</p>
              </div>
            )}

            <button
              onClick={handlePersonalInfoSubmit}
              disabled={isSaving}
              className="mt-6 w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Document Upload</h2>
            <p className="text-gray-400 mb-8">
              Please upload clear photos or scans of the required documents. Ensure all information is visible and legible.
            </p>

            <div className="space-y-6">
              {/* Government ID Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Government Issued ID
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Passport, Driver's License, or National ID Card
                </p>
                
                {existingSubmission?.documents.governmentIdUrl && !governmentId ? (
                  <div className="flex items-center justify-between p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F]">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-white">{existingSubmission.documents.governmentIdFileName}</span>
                    </div>
                    <button
                      onClick={() => setGovernmentId(null)}
                      className="text-[#0FF1CE] hover:text-[#0FF1CE]/80 text-sm"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setGovernmentId(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="p-8 bg-[#151515]/50 backdrop-blur-sm rounded-xl border-2 border-dashed border-[#2F2F2F] hover:border-[#0FF1CE]/50 cursor-pointer transition-all duration-300 text-center">
                      <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-white mb-1">
                        {governmentId ? governmentId.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or PDF up to 10MB</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Proof of Address Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Proof of Address
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Utility bill, bank statement, or mobile bill (dated within last 3 months)
                </p>
                
                {existingSubmission?.documents.proofOfAddressUrl && !proofOfAddress ? (
                  <div className="flex items-center justify-between p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F]">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-white">{existingSubmission.documents.proofOfAddressFileName}</span>
                    </div>
                    <button
                      onClick={() => setProofOfAddress(null)}
                      className="text-[#0FF1CE] hover:text-[#0FF1CE]/80 text-sm"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="p-8 bg-[#151515]/50 backdrop-blur-sm rounded-xl border-2 border-dashed border-[#2F2F2F] hover:border-[#0FF1CE]/50 cursor-pointer transition-all duration-300 text-center">
                      <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-white mb-1">
                        {proofOfAddress ? proofOfAddress.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or PDF up to 10MB</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {errors.documents && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-500 text-sm">{errors.documents}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] py-3 rounded-xl font-bold hover:bg-[#0FF1CE]/10 transition-all duration-300"
              >
                Back
              </button>
              <button
                onClick={handleDocumentUpload}
                disabled={isSaving || (!governmentId && !existingSubmission?.documents.governmentIdUrl) || (!proofOfAddress && !existingSubmission?.documents.proofOfAddressUrl)}
                className="flex-1 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Trading Agreement */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Shockwave Funded Trader Agreement</h2>
            
            <div className="bg-[#0D0D0D]/60 backdrop-blur-sm border border-[#2F2F2F]/50 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
              <div className="space-y-6 text-sm text-gray-400">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">SHOCKWAVE CAPITAL FUNDED TRADER AGREEMENT</h3>
                  <p className="text-xs">
                    This Agreement ("Agreement") is entered into and made effective as of the date of the last signature by and between Shockwave Capital, a division of Ascendant Capital Investments LTD (hereinafter referred to as the "Company"), and the Trader, in connection with the Trader's successful completion of the Shockwave Capital Challenge and subsequent access to a Simulated Funded Account. For good and valuable consideration, the parties hereby agree to the following:
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
                  <p className="mb-2">When eligible, the Trader may receive 90% of the net positive difference between the closing balance and the initial simulated capital in the funded account.</p>
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
                  <h4 className="text-white font-medium mb-2">9. Continued Consent for Data Processing</h4>
                  <p className="mb-2">
                    The Trader grants Shockwave Capital consent to retain, process, and use their personal data throughout the term of this Agreement and for three (3) years following its termination, unless a longer retention period is required by applicable law. This includes use of personal data for:
                  </p>
                  <p className="mb-2">Execution and management of this Agreement;</p>
                  <p className="mb-2">Performance evaluations and account monitoring;</p>
                  <p className="mb-2">Compliance and dispute resolution procedures;</p>
                  <p className="mb-2">Notifications related to new services, products, or opportunities offered by Shockwave Capital or its affiliates.</p>
                  <p>The Trader acknowledges and agrees that if required by law or in cooperation with a law enforcement agency, the Company may retain personal data indefinitely without further notice or consent to aid investigative or regulatory activity.</p>
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
                    The Trader agrees to employ sound and reasonable risk management practices while trading on the Shockwave Capital Simulated Account. The following rules are strictly enforced:
                  </p>
                  <p className="mb-2 font-medium">Maximum Risk Exposure:</p>
                  <p className="mb-2">
                    The total risk exposure from all open positions at any given time must not exceed 2% of the total simulated account balance. This means that traders must actively manage position sizing and account for real-world execution factors such as slippage, spread widening, gaps, liquidity, swaps, and commissions. If the combined impact of these factors causes the total loss on open trades to exceed the 2% limit, it will be treated as a breach of this rule. Any breach will trigger an immediate internal review of the trader's account and may result in account termination or payout denial at the sole discretion of the risk team. To avoid unintended violations, traders are strongly advised to maintain a reasonable buffer below the 2% maximum risk threshold.
                  </p>
                  <p className="mb-2">Profits exceeding 5% in a single trading day will trigger an account review. If such profit is deemed the result of reckless, unrealistic, or gambling-style trading behavior, the Company reserves the right to immediately terminate the Agreement and withhold all pending or future remuneration.</p>
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
            </div>

            <div className="p-4 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F] mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementSigned}
                  onChange={(e) => setAgreementSigned(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="text-white text-sm">
                    I have read, understood, and agree to the Shockwave Funded Trader Agreement
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    By checking this box, you are electronically signing this agreement
                  </p>
                </div>
              </label>
            </div>

            {errors.agreement && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-500 text-sm">{errors.agreement}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] py-3 rounded-xl font-bold hover:bg-[#0FF1CE]/10 transition-all duration-300"
              >
                Back
              </button>
              <button
                onClick={handleAgreementSign}
                disabled={isSaving || !agreementSigned}
                className="flex-1 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit KYC
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Completed/Status */}
        {currentStep === 4 && existingSubmission && (
          <div className="text-center py-8">
            {existingSubmission.status === 'approved' ? (
              <>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">KYC Approved!</h2>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed text-center px-4 sm:px-0">
                  Your KYC verification has been approved. You are now eligible to receive payouts and start trading as a funded trader. You will receive your funded account credentials shortly but please allow up to 48hrs from KYC approval to receive your credentials.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black px-8 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
                >
                  Back to Dashboard
                </button>
              </>
            ) : existingSubmission.status === 'rejected' ? (
              <>
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">KYC Rejected</h2>
                <p className="text-gray-400 mb-8">
                  Your KYC submission was rejected. Please review the feedback and submit again.
                </p>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setExistingSubmission(null);
                  }}
                  className="bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black px-8 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
                >
                  Start New Submission
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">KYC Under Review</h2>
                <p className="text-gray-400 mb-2">
                  Your KYC submission has been received and is currently under review.
                </p>
                <p className="text-gray-500 text-sm mb-8">
                  This typically takes 1-2 business days. We'll notify you once the review is complete.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] px-8 py-3 rounded-xl font-bold hover:bg-[#0FF1CE]/10 transition-all duration-300"
                >
                  Back to Dashboard
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 