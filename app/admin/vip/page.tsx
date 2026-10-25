'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllVIPActivations,
  enableVIPActivation,
  updateVIPActivation,
  updateVIPKybStatus,
  deleteVIPActivation,
  getVIPActivation,
  VIPActivation,
  Timestamp
} from '@/lib/firebase';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  AlertCircle,
  Crown,
  FileText,
  User,
  ChevronDown,
  Loader2,
  X,
  Trash2,
  DollarSign,
  Bitcoin,
  Shield,
  Save
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VIPActivationWithId extends VIPActivation {
  id: string;
}

interface ResolvedUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

const ALLOCATION_PRESETS = [
  { level: '$1M', tierName: 'Professional', publicPrice: 5499 },
  { level: '$2M', tierName: 'Executive', publicPrice: 9999 },
  { level: '$3M', tierName: 'Institutional', publicPrice: 14999 }
];

const DEFAULT_CUSTOM_TERMS_TITLE = 'Corporate Allocation Terms';

// Default template for the per-user additional terms tab (based on the
// $3M Corporate Allocation Term Sheet). Fully editable before unlocking:
// adjust the client name, allocation, drawdown figures, fee and payout split per user.
const DEFAULT_CUSTOM_TERMS_CONTENT = `SHOCKWAVE CAPITAL - PRIVATE CORPORATE ALLOCATION TERM SHEET

Client: [Client name] / approved corporate entity
Status: Private invitation - subject to final approval, verification and an executed agreement

COMMERCIAL TERMS

- Program: Shockwave Private Corporate Allocation
- Allocation: $3,000,000 consolidated account
- Platform / account type: Dominion - Institutional account
- Login structure: One consolidated account and one primary trading login
- Registration: Approved corporate entity, subject to corporate KYC/KYB
- Program fee: $8,999 one-time, payable in cryptocurrency
- Maximum drawdown: 15% of the initial account balance ($450,000)
- Maximum daily drawdown: 8% of the initial account balance ($240,000)
- Leverage: Up to 1:200, subject to instrument specifications and platform limits
- Consistency rule: None
- Additional strategy restrictions: None, except the prohibited conduct listed below
- Existing accounts: Existing funded accounts remain separate; existing challenges remain unchanged
- Dedicated service: Named personal account manager and direct payout review
- Payout split / timing: 80% of net profits in favour of the trader, reviewed and paid on a monthly basis

NATURE OF THE ACCOUNT

The allocation is operated as a live account and trading activity is live copy traded to Shockwave Capital's corporate accounts. The displayed allocation balance is not client-owned capital and is not withdrawable. The trader's entitlement is limited to the payout split described above, calculated on net profits and subject to the payout review standard below.

ACCOUNT OPERATION AND EXECUTION

- The allocation is operated through one consolidated Dominion Institutional account rather than multiple manually traded logins.
- The account uses the same general execution environment and instrument specifications applicable to Dominion Institutional accounts.
- Execution should be comparable under normal market conditions; however, fills cannot be guaranteed to be identical to smaller accounts because larger orders may experience slippage during fast markets, major news releases or reduced liquidity.
- The trader is not required to increase lot size or percentage risk simply because the displayed allocation is larger.

PERMITTED TRADING ACTIVITY

- The same symbols and strategy may be used across accounts owned by the same verified client, subject to platform functionality and the final agreement.
- Personal EAs, indicators and VPS use are permitted where they are controlled by the client and do not involve third-party account management or prohibited copying.
- News, overnight and weekend trading permissions will follow the written specifications issued with the final account.

PROHIBITED CONDUCT

- Account sharing, sale, rental or operation by an undisclosed third party.
- Third-party account management or copying trades from an unrelated person or service in a manner that defeats individual account evaluation.
- Coordinated hedging or opposite-position schemes across separate identities or accounts.
- Latency arbitrage, use of stale or erroneous pricing, platform exploitation, order flooding, or deliberate exploitation of a technical malfunction.
- Fraud, false documents, payment abuse, sanctions violations or other unlawful activity.

PAYOUT REVIEW AND APPROVAL STANDARD

Core commitment: Payout requests will be reviewed against the objective written terms of the corporate account. If those terms have been followed, the payout will be approved. Profitability, payout size, trading style or strong performance will not, by themselves, be grounds for denial.

- Each payout request will be assigned to the client's dedicated account manager for direct review.
- Any concern must identify the specific transaction, factual issue and contractual provision involved.
- A payout may only be delayed or withheld for a documented rule breach, suspected fraud, account ownership concern, legal or sanctions restriction, payment-destination problem, platform or pricing exploitation, or a verified technical/calculation error.
- Where additional information is required, Shockwave will explain what is needed and provide a reasonable opportunity to respond.
- If a payout is not approved, the client will receive a written explanation and may request a secondary review by a different authorized representative.
- No retroactive or unpublished rule will be used to determine payout eligibility.

CONDITIONS BEFORE ACTIVATION

- Completion and approval of corporate KYC/KYB.
- Payment of the program fee of $8,999 in cryptocurrency.
- Execution of the definitive corporate allocation agreement and risk disclosures.
- Confirmation of Dominion Institutional account availability and final instrument specifications.
- Completion of onboarding and technical access setup.

By accepting these terms you confirm that you have read and understood the structure described above, including that the displayed allocation is not client-owned or withdrawable capital, and you agree to operate the account in accordance with these terms and the final executed agreement.`;

export default function AdminVIPPage() {
  const [activations, setActivations] = useState<VIPActivationWithId[]>([]);
  const [filteredActivations, setFilteredActivations] = useState<VIPActivationWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kybFilter, setKybFilter] = useState<VIPActivation['kybStatus'] | 'all'>('all');
  const [selectedActivation, setSelectedActivation] = useState<VIPActivationWithId | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Unlock form
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<ResolvedUser | null>(null);
  const [existingActivation, setExistingActivation] = useState<VIPActivation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allocationChoice, setAllocationChoice] = useState('$3M');
  const [customAllocation, setCustomAllocation] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [includeCustomTerms, setIncludeCustomTerms] = useState(false);
  const [customTermsTitle, setCustomTermsTitle] = useState(DEFAULT_CUSTOM_TERMS_TITLE);
  const [customTermsContent, setCustomTermsContent] = useState('');

  // Manage modal - offer editing
  const [editPrice, setEditPrice] = useState('');
  const [editPublicPrice, setEditPublicPrice] = useState('');
  const [editCustomTermsTitle, setEditCustomTermsTitle] = useState('');
  const [editCustomTermsContent, setEditCustomTermsContent] = useState('');

  useEffect(() => {
    loadActivations();
  }, []);

  useEffect(() => {
    filterActivations();
  }, [activations, searchQuery, kybFilter]);

  useEffect(() => {
    // Prefill public price when a preset allocation is chosen
    const preset = ALLOCATION_PRESETS.find(p => p.level === allocationChoice);
    if (preset) {
      setPublicPrice(preset.publicPrice.toString());
    }
  }, [allocationChoice]);

  const loadActivations = async () => {
    try {
      setIsLoading(true);
      const all = await getAllVIPActivations();
      setActivations(all);
    } catch (error) {
      console.error('Error loading VIP activations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterActivations = () => {
    let filtered = [...activations];

    if (kybFilter !== 'all') {
      filtered = filtered.filter(a => a.kybStatus === kybFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.userEmail.toLowerCase().includes(q) ||
        a.accountSize.toLowerCase().includes(q) ||
        (a.companyName || '').toLowerCase().includes(q)
      );
    }

    // Sort by enabled date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.enabledAt?.toDate?.() || new Date(0);
      const dateB = b.enabledAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredActivations(filtered);
  };

  const searchUserByEmail = async () => {
    if (!userSearchEmail) return;

    try {
      setIsSearching(true);
      setSearchedUser(null);
      setExistingActivation(null);

      // Resolve the authoritative Firebase Auth UID server-side.
      // (The users collection can contain stale duplicate docs for an email,
      // so querying it directly can return a UID the user no longer logs in with.)
      const response = await fetch('/api/admin/resolve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userSearchEmail })
      });

      if (response.ok) {
        const resolved: ResolvedUser = await response.json();
        setSearchedUser(resolved);

        // Check if this user already has a VIP activation
        const existing = await getVIPActivation(resolved.uid);
        setExistingActivation(existing);
      } else if (response.status === 404) {
        alert('User not found');
      } else {
        alert('Error searching for user');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      alert('Error searching for user');
    } finally {
      setIsSearching(false);
    }
  };

  const unlockVIPForUser = async () => {
    if (!searchedUser) return;

    const accountSize = allocationChoice === 'custom' ? customAllocation.trim() : allocationChoice;
    if (!accountSize) {
      alert('Please enter an allocation size');
      return;
    }

    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const pubPrice = publicPrice ? parseFloat(publicPrice) : undefined;
    if (publicPrice && (isNaN(pubPrice!) || pubPrice! <= 0)) {
      alert('Public price must be a valid number');
      return;
    }

    if (includeCustomTerms && !customTermsContent.trim()) {
      alert('Please enter the custom terms text (or untick "Attach additional custom terms")');
      return;
    }

    try {
      setIsUpdating(true);

      const preset = ALLOCATION_PRESETS.find(p => p.level === accountSize);

      await enableVIPActivation(
        searchedUser.uid,
        searchedUser.email,
        {
          accountSize,
          tierName: preset?.tierName,
          price,
          publicPrice: pubPrice,
          adminNotes: adminNotes.trim() || undefined,
          customTermsTitle: includeCustomTerms ? customTermsTitle : undefined,
          customTermsContent: includeCustomTerms ? customTermsContent : undefined
        },
        'admin'
      );

      alert('VIP portal unlocked for user successfully');
      setUserSearchEmail('');
      setSearchedUser(null);
      setExistingActivation(null);
      setCustomPrice('');
      setCustomAllocation('');
      setAdminNotes('');
      setIncludeCustomTerms(false);
      setCustomTermsTitle(DEFAULT_CUSTOM_TERMS_TITLE);
      setCustomTermsContent('');
      await loadActivations();
    } catch (error) {
      console.error('Error unlocking VIP portal:', error);
      alert('Failed to unlock VIP portal for user');
    } finally {
      setIsUpdating(false);
    }
  };

  const openManageModal = (activation: VIPActivationWithId) => {
    setSelectedActivation(activation);
    setEditPrice(activation.price.toString());
    setEditPublicPrice(activation.publicPrice?.toString() || '');
    setEditCustomTermsTitle(activation.customTerms?.title || DEFAULT_CUSTOM_TERMS_TITLE);
    setEditCustomTermsContent(activation.customTerms?.content || '');
    setReviewNotes('');
  };

  const closeManageModal = () => {
    setSelectedActivation(null);
    setReviewNotes('');
  };

  const handleSaveOffer = async () => {
    if (!selectedActivation) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const pubPrice = editPublicPrice ? parseFloat(editPublicPrice) : undefined;
    if (editPublicPrice && (isNaN(pubPrice!) || pubPrice! <= 0)) {
      alert('Public price must be a valid number');
      return;
    }

    try {
      setIsUpdating(true);
      const update: Partial<VIPActivation> = { price };
      if (pubPrice !== undefined) {
        update.publicPrice = pubPrice;
      }
      await updateVIPActivation(selectedActivation.userId, update);
      await loadActivations();
      closeManageModal();
    } catch (error) {
      console.error('Error updating VIP offer:', error);
      alert('Failed to update offer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCustomTerms = async () => {
    if (!selectedActivation) return;

    if (!editCustomTermsContent.trim()) {
      alert('Please enter the custom terms text, or use "Remove Custom Terms" instead');
      return;
    }

    try {
      setIsUpdating(true);
      await updateVIPActivation(selectedActivation.userId, {
        customTerms: {
          title: editCustomTermsTitle.trim() || 'Additional Account Terms',
          content: editCustomTermsContent.trim()
        }
      });
      await loadActivations();
      closeManageModal();
    } catch (error) {
      console.error('Error saving custom terms:', error);
      alert('Failed to save custom terms');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveCustomTerms = async () => {
    if (!selectedActivation) return;
    if (!confirm('Remove the additional custom terms for this user? Their VIP page will only show the standard Funded Trader Agreement.')) {
      return;
    }

    try {
      setIsUpdating(true);
      await updateVIPActivation(selectedActivation.userId, {
        customTerms: null
      } as unknown as Partial<VIPActivation>);
      await loadActivations();
      closeManageModal();
    } catch (error) {
      console.error('Error removing custom terms:', error);
      alert('Failed to remove custom terms');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkPaymentCompleted = async () => {
    if (!selectedActivation) return;

    try {
      setIsUpdating(true);
      await updateVIPActivation(selectedActivation.userId, {
        paymentStatus: 'completed',
        paymentCompletedAt: Timestamp.now()
      });
      await loadActivations();
      closeManageModal();
    } catch (error) {
      console.error('Error marking payment completed:', error);
      alert('Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKybStatusUpdate = async (status: VIPActivation['kybStatus']) => {
    if (!selectedActivation) return;

    try {
      setIsUpdating(true);
      await updateVIPKybStatus(
        selectedActivation.userId,
        status,
        reviewNotes,
        'admin'
      );
      await loadActivations();
      closeManageModal();
    } catch (error) {
      console.error('Error updating KYB status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedActivation) return;
    if (!confirm(`Revoke VIP portal access for ${selectedActivation.userEmail}? This will lock the VIP page for this user again.`)) {
      return;
    }

    try {
      setIsUpdating(true);
      await deleteVIPActivation(selectedActivation.userId);
      await loadActivations();
      closeManageModal();
    } catch (error) {
      console.error('Error revoking VIP access:', error);
      alert('Failed to revoke access');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPaymentBadge = (status: VIPActivation['paymentStatus']) => {
    const config = {
      unpaid: { color: 'bg-gray-500', icon: Clock, text: 'Unpaid' },
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      completed: { color: 'bg-green-500', icon: CheckCircle, text: 'Paid' }
    };
    const { color, icon: Icon, text } = config[status];
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${color}/20 text-white`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{text}</span>
      </div>
    );
  };

  const getKybBadge = (status: VIPActivation['kybStatus']) => {
    const config = {
      not_submitted: { color: 'bg-gray-500', icon: FileText, text: 'Not Submitted' },
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending Review' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500', icon: XCircle, text: 'Rejected' },
      needs_resubmission: { color: 'bg-orange-500', icon: RefreshCw, text: 'Needs Resubmission' }
    };
    const { color, icon: Icon, text } = config[status];
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${color}/20 text-white`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{text}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-1 md:mb-2">
          <h1 className="text-xl md:text-3xl font-bold text-white">VIP Portal Management</h1>
          <Link
            href="/admin/vip-accounts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold hover:bg-[#0FF1CE]/90 w-fit"
          >
            <Crown className="w-4 h-4" />
            Manage VIP Accounts
          </Link>
        </div>
        <p className="text-gray-400 text-sm">Unlock the dashboard VIP portal per user with custom pricing, and review corporate/KYB submissions</p>
      </div>

      {/* Unlock VIP Section */}
      <div className="bg-[#1A1A1A] rounded-xl p-4 md:p-6 border border-[#2F2F2F] mb-5 md:mb-8">
        <h2 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#0FF1CE]" />
          Unlock VIP Portal for User
        </h2>
        <p className="text-xs md:text-sm text-gray-400 mb-3 md:mb-4">
          Search for a user by email, set their allocation and the custom price you agreed on, then unlock their VIP portal.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <input
            type="email"
            value={userSearchEmail}
            onChange={(e) => setUserSearchEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
          />
          <button
            onClick={searchUserByEmail}
            disabled={isSearching || !userSearchEmail}
            className="px-4 md:px-6 py-2 bg-[#0FF1CE] text-black rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>

        {searchedUser && (
          <div className="mt-4 p-4 bg-[#0D0D0D] rounded-lg border border-[#2F2F2F]">
            <div className="mb-4">
              <p className="text-white font-medium">
                {searchedUser.firstName} {searchedUser.lastName}
              </p>
              <p className="text-sm text-gray-400">{searchedUser.email}</p>
              {existingActivation && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-500">
                    This user already has a VIP activation ({existingActivation.accountSize} at ${existingActivation.price.toLocaleString()}).
                    Unlocking again will reset it, including payment and document status. To change only the price, use Manage in the table below.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Allocation</label>
                <div className="relative">
                  <select
                    value={allocationChoice}
                    onChange={(e) => setAllocationChoice(e.target.value)}
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:border-[#0FF1CE]/50"
                  >
                    {ALLOCATION_PRESETS.map((preset) => (
                      <option key={preset.level} value={preset.level}>
                        {preset.level} ({preset.tierName}) - public ${preset.publicPrice.toLocaleString()}
                      </option>
                    ))}
                    <option value="custom">Custom allocation...</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>
              </div>

              {allocationChoice === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Custom Allocation Label</label>
                  <input
                    type="text"
                    value={customAllocation}
                    onChange={(e) => setCustomAllocation(e.target.value)}
                    placeholder="e.g. $5M"
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Custom Price (USD) *</label>
                <input
                  type="number"
                  min="1"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="e.g. 8999"
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                />
                <p className="text-[11px] text-gray-500 mt-1">The agreed price this user will pay</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Public Price (USD, optional)</label>
                <input
                  type="number"
                  min="1"
                  value={publicPrice}
                  onChange={(e) => setPublicPrice(e.target.value)}
                  placeholder="e.g. 14999"
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                />
                <p className="text-[11px] text-gray-500 mt-1">Shown crossed out on the user's offer</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Internal Notes (optional)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Agreed with Michael over Discord on Aug 15"
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>
            </div>

            {/* Per-user additional terms */}
            <div className="mb-4 p-3 bg-[#151515]/60 rounded-lg border border-[#2F2F2F]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCustomTerms}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeCustomTerms(checked);
                    if (checked && !customTermsContent.trim()) {
                      const clientName =
                        [searchedUser?.firstName, searchedUser?.lastName].filter(Boolean).join(' ') ||
                        searchedUser?.email ||
                        '[Client name]';
                      setCustomTermsContent(DEFAULT_CUSTOM_TERMS_CONTENT.replace('[Client name]', clientName));
                      if (!customTermsTitle.trim()) setCustomTermsTitle(DEFAULT_CUSTOM_TERMS_TITLE);
                    }
                  }}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm text-white font-medium">Attach additional custom terms</span>
                  <p className="text-[11px] text-gray-500">
                    Adds a second terms tab (e.g. the Corporate Allocation term sheet) the user must accept on top of the standard Funded Trader Agreement
                  </p>
                </div>
              </label>

              {includeCustomTerms && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Terms Tab Title</label>
                    <input
                      type="text"
                      value={customTermsTitle}
                      onChange={(e) => setCustomTermsTitle(e.target.value)}
                      placeholder="e.g. Corporate Allocation Terms"
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Terms Text</label>
                    <textarea
                      value={customTermsContent}
                      onChange={(e) => setCustomTermsContent(e.target.value)}
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-xs leading-relaxed focus:outline-none focus:border-[#0FF1CE]/50 min-h-[260px]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Prefilled from the $3M Corporate Allocation term sheet with this user's name. Edit names, allocation, fee and payout split per user — this exact text is what the user reads and electronically signs.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={unlockVIPForUser}
              disabled={isUpdating || !customPrice || (allocationChoice === 'custom' && !customAllocation.trim())}
              className="w-full sm:w-auto px-6 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-medium hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  {existingActivation ? 'Reset & Unlock VIP Portal' : 'Unlock VIP Portal'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Filters and Stats */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-5 md:gap-4 mb-5 md:mb-8">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, allocation or company..."
              className="w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            />
          </div>
        </div>

        <div className="relative">
          <select
            value={kybFilter}
            onChange={(e) => setKybFilter(e.target.value as any)}
            className="w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-[#0FF1CE]/50"
          >
            <option value="all">All KYB Status</option>
            <option value="not_submitted">Not Submitted</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_resubmission">Needs Resubmission</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>

        <div className="grid grid-cols-2 gap-2 md:contents">
          <div className="bg-[#1A1A1A] rounded-lg p-3 md:p-4 border border-[#2F2F2F]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs md:text-sm">Total</p>
                <p className="text-xl md:text-2xl font-bold text-white">{activations.length}</p>
              </div>
              <Crown className="text-[#0FF1CE]" size={20} />
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg p-3 md:p-4 border border-[#2F2F2F]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs md:text-sm">Pending KYB</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-500">
                  {activations.filter(a => a.kybStatus === 'pending').length}
                </p>
              </div>
              <Clock className="text-yellow-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Activations - Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredActivations.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2F2F2F] px-4 py-8 text-center text-gray-400">
            No VIP activations found
          </div>
        ) : filteredActivations.map((activation) => (
          <div key={activation.id} className="bg-[#1A1A1A] rounded-xl border border-[#2F2F2F] p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{activation.userEmail}</p>
                <p className="text-gray-400 text-xs">
                  {activation.accountSize} - ${activation.price.toLocaleString()}
                </p>
              </div>
              <button onClick={() => openManageModal(activation)} className="text-[#0FF1CE] text-sm flex items-center gap-1 font-medium flex-shrink-0 ml-2">
                <Eye className="w-3.5 h-3.5" />Manage
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {getPaymentBadge(activation.paymentStatus)}
              {getKybBadge(activation.kybStatus)}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Last visit:{' '}
              {activation.lastVisitedAt?.toDate
                ? `${activation.lastVisitedAt.toDate().toLocaleString()} (${formatDistanceToNow(activation.lastVisitedAt.toDate(), { addSuffix: true })})`
                : 'Never'}
            </p>
          </div>
        ))}
      </div>

      {/* Activations Table - Desktop */}
      <div className="hidden md:block bg-[#1A1A1A] rounded-xl border border-[#2F2F2F] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2F2F2F]">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Allocation</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">KYB</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Unlocked</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Visit</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F2F2F]">
              {filteredActivations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    No VIP activations found
                  </td>
                </tr>
              ) : (
                filteredActivations.map((activation) => (
                  <tr key={activation.id} className="hover:bg-[#0D0D0D]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{activation.userEmail}</p>
                        {activation.companyName && (
                          <p className="text-sm text-gray-400">{activation.companyName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{activation.accountSize}</p>
                      {activation.tierName && (
                        <p className="text-xs text-gray-400">{activation.tierName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[#0FF1CE] font-medium">${activation.price.toLocaleString()}</p>
                      {activation.publicPrice && activation.publicPrice > activation.price && (
                        <p className="text-xs text-gray-500 line-through">${activation.publicPrice.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getPaymentBadge(activation.paymentStatus)}
                    </td>
                    <td className="px-6 py-4">
                      {getKybBadge(activation.kybStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">
                        <p>{activation.enabledAt?.toDate?.().toLocaleDateString() || 'N/A'}</p>
                        <p className="text-xs">
                          {activation.enabledAt && formatDistanceToNow(activation.enabledAt.toDate(), { addSuffix: true })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activation.lastVisitedAt?.toDate ? (
                        <div className="text-sm text-gray-400">
                          <p>{activation.lastVisitedAt.toDate().toLocaleString()}</p>
                          <p className="text-xs">
                            {formatDistanceToNow(activation.lastVisitedAt.toDate(), { addSuffix: true })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Never</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openManageModal(activation)}
                        className="text-[#0FF1CE] hover:text-[#0FF1CE]/80 font-medium text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Modal */}
      {selectedActivation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2F2F2F] p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Manage VIP Activation</h2>
                <button
                  onClick={closeManageModal}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0FF1CE]" />
                  User
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{selectedActivation.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Company / Entity</p>
                    <p className="text-white">{selectedActivation.companyName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Last on VIP page</p>
                    {selectedActivation.lastVisitedAt?.toDate ? (
                      <>
                        <p className="text-white">{selectedActivation.lastVisitedAt.toDate().toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(selectedActivation.lastVisitedAt.toDate(), { addSuffix: true })}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">Never</p>
                    )}
                  </div>
                  {selectedActivation.adminNotes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400">Internal Notes</p>
                      <p className="text-white text-sm">{selectedActivation.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Offer */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#0FF1CE]" />
                  Offer
                </h3>
                <div className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2F2F2F]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Allocation</p>
                      <p className="text-white font-medium">
                        {selectedActivation.accountSize}
                        {selectedActivation.tierName && ` (${selectedActivation.tierName})`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Custom Price (USD)</label>
                      <input
                        type="number"
                        min="1"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        disabled={selectedActivation.paymentStatus === 'completed'}
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Public Price (USD)</label>
                      <input
                        type="number"
                        min="1"
                        value={editPublicPrice}
                        onChange={(e) => setEditPublicPrice(e.target.value)}
                        disabled={selectedActivation.paymentStatus === 'completed'}
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  {selectedActivation.paymentStatus !== 'completed' && (
                    <button
                      onClick={handleSaveOffer}
                      disabled={isUpdating}
                      className="mt-4 px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-medium hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Offer
                    </button>
                  )}
                  {selectedActivation.paymentStatus === 'completed' && (
                    <p className="mt-3 text-xs text-gray-500">Pricing is locked because the payment has been completed.</p>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bitcoin className="w-5 h-5 text-[#0FF1CE]" />
                  Payment
                </h3>
                <div className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2F2F2F]">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div>{getPaymentBadge(selectedActivation.paymentStatus)}</div>
                      {selectedActivation.platform && (
                        <p className="text-sm text-gray-400">Platform: <span className="text-white">{selectedActivation.platform}</span></p>
                      )}
                      {selectedActivation.cryptoOrderId && (
                        <p className="text-sm text-gray-400">
                          Crypto Order: <span className="text-[#0FF1CE] font-mono text-xs">{selectedActivation.cryptoOrderId}</span>
                          <span className="text-gray-500 text-xs"> (see Crypto Orders page)</span>
                        </p>
                      )}
                      {selectedActivation.paymentSubmittedAt && (
                        <p className="text-xs text-gray-500">
                          Submitted {selectedActivation.paymentSubmittedAt.toDate?.().toLocaleString()}
                        </p>
                      )}
                    </div>
                    {selectedActivation.paymentStatus !== 'completed' && (
                      <button
                        onClick={handleMarkPaymentCompleted}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Mark Payment Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0FF1CE]" />
                  Corporate / KYB Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedActivation.documents?.corporateDocs || []).length === 0 ? (
                    <div className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2F2F2F] md:col-span-2">
                      <p className="text-gray-500 text-sm">No documents uploaded yet</p>
                    </div>
                  ) : (
                    (selectedActivation.documents.corporateDocs || []).map((docItem, index) => (
                      <div key={index} className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2F2F2F]">
                        <p className="text-xs text-gray-500 mb-2 truncate">{docItem.fileName}</p>
                        <a
                          href={docItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#0FF1CE] hover:text-[#0FF1CE]/80 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Document
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Terms acceptance */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#0FF1CE]" />
                  Account Terms
                </h3>
                <div className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2F2F2F] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Funded Trader Agreement</span>
                    {selectedActivation.documents?.agreementSignedAt ? (
                      <div className="flex items-center gap-2 text-green-500 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          Signed on {selectedActivation.documents.agreementSignedAt.toDate?.().toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>Not signed</span>
                      </div>
                    )}
                  </div>
                  {(selectedActivation.customTerms || selectedActivation.documents?.customTermsSignedAt) && (
                    <div className="flex items-center justify-between gap-3 border-t border-[#2F2F2F] pt-3">
                      <span className="text-sm text-gray-400">
                        {selectedActivation.customTerms?.title || 'Additional Account Terms'}
                      </span>
                      {selectedActivation.documents?.customTermsSignedAt ? (
                        <div className="flex items-center gap-2 text-green-500 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Signed on {selectedActivation.documents.customTermsSignedAt.toDate?.().toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Not signed</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom terms editor */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0FF1CE]" />
                  Custom Terms (per-user)
                </h3>
                <div className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2F2F2F] space-y-3">
                  {!selectedActivation.customTerms && (
                    <p className="text-xs text-gray-500">
                      No custom terms attached — this user only sees the standard Funded Trader Agreement. Add terms below to show an extra tab they must also accept.
                    </p>
                  )}
                  {selectedActivation.customTerms && selectedActivation.documents?.customTermsSignedAt && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-500">
                        The user has already accepted these terms. Editing the text will not reset their acceptance.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Terms Tab Title</label>
                    <input
                      type="text"
                      value={editCustomTermsTitle}
                      onChange={(e) => setEditCustomTermsTitle(e.target.value)}
                      placeholder="e.g. Corporate Allocation Terms"
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Terms Text</label>
                    <textarea
                      value={editCustomTermsContent}
                      onChange={(e) => setEditCustomTermsContent(e.target.value)}
                      placeholder={'Paste or write the terms this user must accept.\nLeave empty and use "Load Template" to start from the $3M Corporate Allocation term sheet.'}
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-xs leading-relaxed focus:outline-none focus:border-[#0FF1CE]/50 min-h-[220px]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveCustomTerms}
                      disabled={isUpdating || !editCustomTermsContent.trim()}
                      className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-medium hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Custom Terms
                    </button>
                    {!editCustomTermsContent.trim() && (
                      <button
                        onClick={() => {
                          setEditCustomTermsContent(DEFAULT_CUSTOM_TERMS_CONTENT);
                          if (!editCustomTermsTitle.trim()) setEditCustomTermsTitle(DEFAULT_CUSTOM_TERMS_TITLE);
                        }}
                        className="px-4 py-2 bg-[#151515] border border-[#2F2F2F] text-gray-300 rounded-lg text-sm font-medium hover:text-white transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Load Template
                      </button>
                    )}
                    {selectedActivation.customTerms && (
                      <button
                        onClick={handleRemoveCustomTerms}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-transparent border border-red-500/50 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Custom Terms
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Review Notes</h3>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this submission (visible to the user)..."
                  className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50 min-h-[100px]"
                />
              </div>

              {/* Previous Review Notes */}
              {selectedActivation.reviewNotes && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm font-medium text-yellow-500 mb-1">Previous Review Notes</p>
                  <p className="text-sm text-gray-300">{selectedActivation.reviewNotes}</p>
                </div>
              )}

              {/* KYB Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleKybStatusUpdate('approved')}
                  disabled={isUpdating}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleKybStatusUpdate('needs_resubmission')}
                  disabled={isUpdating}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Request Resubmission
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleKybStatusUpdate('rejected')}
                  disabled={isUpdating}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Reject
                    </>
                  )}
                </button>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-[#2F2F2F] pt-4">
                <button
                  onClick={handleRevokeAccess}
                  disabled={isUpdating}
                  className="w-full sm:w-auto px-4 py-2 bg-transparent border border-red-500/50 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Revoke VIP Portal Access
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Removes this VIP activation and locks the VIP page for the user again. Any crypto order already placed stays in Crypto Orders.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
