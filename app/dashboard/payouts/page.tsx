'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  auth, 
  getWithdrawalRequest, 
  submitWithdrawalDetails
} from '../../../lib/firebase';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Plus, 
  Calendar,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Building,
  Bitcoin,
  Lock,
  DollarSign,
  AlertTriangle,
  Copy,
  ExternalLink,
  Info,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Particles from '../../components/Particles';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  method: 'Bank Transfer' | 'Credit Card' | 'Crypto';
  reference: string;
}

const statusColors = {
  completed: 'bg-green-500',
  pending: 'bg-yellow-500',
  failed: 'bg-red-500'
};

const statusIcons = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle
};

const methodIcons = {
  'Bank Transfer': Building,
  'Credit Card': CreditCard,
  'Crypto': Bitcoin
};

const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = statusIcons[transaction.status];
  const MethodIcon = methodIcons[transaction.method];
  
  return (
    <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon size={20} className={`
              ${transaction.status === 'completed' ? 'text-green-500' : ''}
              ${transaction.status === 'pending' ? 'text-yellow-500' : ''}
              ${transaction.status === 'failed' ? 'text-red-500' : ''}
            `} />
            <div>
              <div className="text-white font-medium">Withdrawal</div>
              <div className="text-gray-400 text-sm">{transaction.date}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-white font-medium">${transaction.amount.toLocaleString()}</div>
              <div className="text-gray-400 text-sm flex items-center justify-end gap-1">
                <MethodIcon size={14} /> {transaction.method}
              </div>
            </div>
            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-[#2F2F2F]/50 mt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Status</div>
              <div className={`flex items-center gap-1 capitalize
                ${transaction.status === 'completed' ? 'text-green-500' : ''}
                ${transaction.status === 'pending' ? 'text-yellow-500' : ''}
                ${transaction.status === 'failed' ? 'text-red-500' : ''}
              `}>
                <StatusIcon size={14} /> {transaction.status}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Payment Method</div>
              <div className="text-white flex items-center gap-1">
                <MethodIcon size={14} /> {transaction.method}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Transaction ID</div>
              <div className="text-white">{transaction.id}</div>
            </div>
            <div>
              <div className="text-gray-400">Reference</div>
              <div className="text-white">{transaction.reference}</div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button className="flex items-center gap-2 text-[#0FF1CE] hover:text-[#0FF1CE]/80 transition-colors">
              <Download size={14} />
              <span className="text-sm">Download Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentMethodCard = ({ 
  icon: Icon, 
  title, 
  description,
  isSelected,
  onSelect
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <div 
    onClick={onSelect}
    className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
      isSelected 
        ? 'border-[#0FF1CE] bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 shadow-[0_0_20px_rgba(15,241,206,0.3)]' 
        : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-full ${isSelected ? 'bg-[#0FF1CE]/20' : 'bg-[#2F2F2F]/30'}`}>
        <Icon size={18} className={isSelected ? 'text-[#0FF1CE]' : 'text-gray-400'} />
      </div>
      <div>
        <div className="text-white font-medium">{title}</div>
        <div className="text-gray-400 text-sm">{description}</div>
      </div>
    </div>
  </div>
);

export default function PayoutsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [withdrawalRequest, setWithdrawalRequest] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'usdc_solana' | 'usdt_trc20' | ''>('usdc_solana');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkEligibilityAndFetchData = async () => {
      if (!user) {
        router.push('/signin');
        return;
      }

      try {
        // Check for existing withdrawal request enabled by admin
        const request = await getWithdrawalRequest(user.uid);
        setWithdrawalRequest(request);
        
        // If request exists and has payment method, set it
        if (request?.paymentMethod) {
          setPaymentMethod(request.paymentMethod);
        }
        if (request?.walletAddress) {
          setWalletAddress(request.walletAddress);
        }
      } catch (error) {
        console.error('Error loading payout data:', error);
        toast.error('Failed to load payout information');
      } finally {
        setLoading(false);
      }
    };

    checkEligibilityAndFetchData();
  }, [user, router]);

  const handleSubmitDetails = async () => {
    console.log('Submit button clicked', { paymentMethod, walletAddress, user });
    
    if (!paymentMethod || !walletAddress.trim()) {
      toast.error('Please select payment method and enter wallet address');
      return;
    }

    // Basic wallet address validation
    if (paymentMethod === 'usdc_solana' && walletAddress.length < 32) {
      toast.error('Invalid Solana wallet address');
      return;
    }
    if (paymentMethod === 'usdt_trc20' && !walletAddress.startsWith('T')) {
      toast.error('Invalid TRC20 wallet address');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting withdrawal details...', { userId: user!.uid, paymentMethod, walletAddress });
      await submitWithdrawalDetails(user!.uid, paymentMethod, walletAddress);
      
      // Refresh withdrawal request
      const updatedRequest = await getWithdrawalRequest(user!.uid);
      setWithdrawalRequest(updatedRequest);
      
      toast.success('Withdrawal details submitted successfully');
    } catch (error) {
      console.error('Error submitting withdrawal details:', error);
      toast.error('Failed to submit withdrawal details');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'approved': return 'text-blue-400 bg-blue-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      case 'completed': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0FF1CE]"></div>
      </div>
    );
  }

  // If not eligible (no withdrawal request)
  if (!withdrawalRequest) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-8">Payouts</h1>
          
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-8 max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-400/10 flex items-center justify-center">
              <Lock className="text-gray-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Payouts Locked</h2>
            <p className="text-gray-400 mb-6">
              To access payouts, you need to have an active funded trading account with profitable trades. Start by viewing your accounts or purchasing a new challenge.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/accounts')}
                className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Wallet size={18} />
                View My Accounts
              </button>
              
              <button
                onClick={() => router.push('/challenge')}
                className="w-full bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] font-bold py-3 rounded-xl hover:bg-[#0FF1CE]/10 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Purchase Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main payout interface
  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-6">Payouts</h1>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-[#151515]/50 backdrop-blur-sm rounded-lg p-1 border border-[#2F2F2F]/50 max-w-xs">
          <button
            onClick={() => router.push('/dashboard/payouts')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              pathname === '/dashboard/payouts'
                ? 'bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => router.push('/dashboard/payouts/new')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              pathname === '/dashboard/payouts/new'
                ? 'bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            New Payout
          </button>
        </div>

        {/* Status Banner */}
        {withdrawalRequest.status === 'rejected' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-400 mt-0.5" size={20} />
              <div>
                <h3 className="text-red-400 font-semibold mb-1">Withdrawal Rejected</h3>
                {withdrawalRequest.reviewNotes && (
                  <p className="text-gray-300 text-sm">{withdrawalRequest.reviewNotes}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {withdrawalRequest.status === 'approved' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-blue-400 mt-0.5" size={20} />
              <div>
                <h3 className="text-blue-400 font-semibold mb-1">Withdrawal Approved</h3>
                <p className="text-gray-300 text-sm">
                  Your withdrawal has been approved and will be processed soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {withdrawalRequest.status === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-400 mt-0.5" size={20} />
              <div>
                <h3 className="text-green-400 font-semibold mb-1">Withdrawal Completed</h3>
                <p className="text-gray-300 text-sm">
                  Your withdrawal has been processed successfully.
                </p>
                {withdrawalRequest.transactionHash && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-400 text-sm">Transaction:</span>
                    <span className="text-white font-mono text-sm">
                      {withdrawalRequest.transactionHash.slice(0, 10)}...{withdrawalRequest.transactionHash.slice(-8)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(withdrawalRequest.transactionHash)}
                      className="text-[#0FF1CE] hover:text-[#0FF1CE]/80"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Withdrawal Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amount Information */}
            <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-2xl border border-[#0FF1CE]/20 p-6" style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
              <h2 className="text-xl font-semibold text-white mb-4">Withdrawal Details</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-[#2F2F2F]/50">
                  <span className="text-gray-400">Total Profit Made</span>
                  <span className="text-white font-medium">${withdrawalRequest.amountOwed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[#2F2F2F]/50">
                  <span className="text-gray-400">Profit Split</span>
                  <span className="text-white font-medium">{withdrawalRequest.profitSplit}%</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400 font-medium">Payout Amount</span>
                  <span className="text-[#0FF1CE] text-2xl font-bold">${withdrawalRequest.payoutAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            {withdrawalRequest.status === 'pending' && (
              <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Payment Method</h2>
                
                <div className="space-y-3 mb-6">
                  <label className="relative flex items-center p-4 bg-[#151515]/50 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 cursor-pointer hover:border-[#0FF1CE]/50 transition-all duration-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="usdc_solana"
                      checked={paymentMethod === 'usdc_solana'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="sr-only"
                      disabled={!!withdrawalRequest.submittedAt}
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      paymentMethod === 'usdc_solana' ? 'border-[#0FF1CE]' : 'border-[#2F2F2F]'
                    }`}>
                      {paymentMethod === 'usdc_solana' && (
                        <div className="w-2.5 h-2.5 bg-[#0FF1CE] rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">USDC (Solana)</p>
                      <p className="text-gray-400 text-sm">Fast and low-cost transfers on Solana network</p>
                    </div>
                  </label>

                  {/* USDT TRC20 option - Hidden but not deleted */}
                  {/* <label className="relative flex items-center p-4 bg-[#151515] rounded-lg border border-[#2F2F2F] cursor-pointer hover:border-[#0FF1CE]/30 transition-all">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="usdt_trc20"
                      checked={paymentMethod === 'usdt_trc20'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="sr-only"
                      disabled={!!withdrawalRequest.submittedAt}
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      paymentMethod === 'usdt_trc20' ? 'border-[#0FF1CE]' : 'border-[#2F2F2F]'
                    }`}>
                      {paymentMethod === 'usdt_trc20' && (
                        <div className="w-2.5 h-2.5 bg-[#0FF1CE] rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">USDT (TRC20)</p>
                      <p className="text-gray-400 text-sm">Tether on TRON network</p>
                    </div>
                  </label> */}
                </div>

                {/* Wallet Address Input */}
                {paymentMethod && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Solana Wallet Address
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter your Solana address"
                      className="w-full bg-[#151515]/50 backdrop-blur-sm text-white px-4 py-3 rounded-lg border border-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                      disabled={!!withdrawalRequest.submittedAt}
                    />
                    <p className="text-gray-400 text-xs mt-2">
                      <Info className="inline-block mr-1" size={12} />
                      Please double-check your wallet address. Incorrect addresses may result in permanent loss of funds.
                    </p>
                    
                    {/* Important Notice Card */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="text-red-400 font-semibold text-sm mb-2">Critical Notice - Wallet Address Verification</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            You are solely responsible for ensuring the accuracy of your wallet address. Any funds sent to an incorrect address will result in permanent and irreversible loss. Once a withdrawal is processed and marked as successful, no additional withdrawals will be issued regardless of address errors. Please verify your address multiple times before submission.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {!withdrawalRequest.submittedAt && (
                  <button
                    type="button"
                    onClick={handleSubmitDetails}
                    disabled={!paymentMethod || !walletAddress.trim() || submitting}
                    className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      'Submit Withdrawal Details'
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Submitted Details (Read-only) */}
            {withdrawalRequest.submittedAt && (
              <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Submitted Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Payment Method</p>
                    <p className="text-white font-medium">
                      {withdrawalRequest.paymentMethod === 'usdc_solana' ? 'USDC (Solana)' : 'USDT (TRC20)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Wallet Address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm break-all">{withdrawalRequest.walletAddress}</p>
                      <button
                        onClick={() => copyToClipboard(withdrawalRequest.walletAddress)}
                        className="text-[#0FF1CE] hover:text-[#0FF1CE]/80 flex-shrink-0"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Status & Info */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Current Status</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(withdrawalRequest.status)}`}>
                    {withdrawalRequest.status.toUpperCase()}
                  </span>
                </div>
                {withdrawalRequest.submittedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Submitted</span>
                    <span className="text-white text-sm">
                      {new Date(withdrawalRequest.submittedAt.toDate()).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {withdrawalRequest.reviewedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Reviewed</span>
                    <span className="text-white text-sm">
                      {new Date(withdrawalRequest.reviewedAt.toDate()).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Important Notes</h3>
              
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#0FF1CE] mt-0.5">•</span>
                  <span>Withdrawals are processed within 1-3 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0FF1CE] mt-0.5">•</span>
                  <span>Minimum withdrawal amount may apply</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0FF1CE] mt-0.5">•</span>
                  <span>Network fees are covered by Shockwave Capital</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0FF1CE] mt-0.5">•</span>
                  <span>Ensure your wallet supports the selected token</span>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>
              <p className="text-gray-400 text-sm mb-4">
                If you have any questions about your withdrawal, please contact our support team.
              </p>
              <a
                href="mailto:support@shockwavecapital.com"
                className="flex items-center gap-2 text-[#0FF1CE] hover:text-[#0FF1CE]/80 transition-colors"
              >
                <span>support@shockwavecapital.com</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
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