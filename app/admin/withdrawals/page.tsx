'use client';

import React, { useState, useEffect } from 'react';
import { 
  WithdrawalRequest,
  getAllWithdrawalRequests,
  updateWithdrawalStatus,
  getAllUsers,
  enableUserWithdrawal,
  setUserPayoutsAccess,
  getUser,
  auth,
  UserData
} from '../../../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  Search, 
  Check, 
  X, 
  Clock, 
  DollarSign, 
  Eye,
  FileText,
  AlertTriangle,
  Plus,
  CreditCard,
  TrendingUp,
  Hash,
  Copy,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast, Toaster } from 'react-hot-toast';

export default function AdminWithdrawalsPage() {
  const [user] = useAuthState(auth);
  const [withdrawals, setWithdrawals] = useState<(WithdrawalRequest & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WithdrawalRequest['status'] | 'all'>('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<(WithdrawalRequest & { id: string }) | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [enableEmail, setEnableEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amountOwed, setAmountOwed] = useState('');
  const [profitSplit, setProfitSplit] = useState('80');
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [accessUpdating, setAccessUpdating] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
    fetchAllUsers();
  }, [statusFilter]);

  const fetchAllUsers = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const data = await getAllWithdrawalRequests(filter);
      setWithdrawals(data.sort((a, b) => 
        b.createdAt.toMillis() - a.createdAt.toMillis()
      ));
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  // Handle live search as user types
  useEffect(() => {
    if (enableEmail.trim()) {
      const filtered = allUsers.filter(u => 
        u.email?.toLowerCase().includes(enableEmail.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(enableEmail.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(enableEmail.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(enableEmail.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowUserDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowUserDropdown(false);
      setSelectedUser(null);
    }
  }, [enableEmail, allUsers]);

  const handleSelectUser = async (selected: UserData) => {
    setSearching(true);
    try {
      const fresh = await getUser(selected.uid);
      setSelectedUser({ ...(fresh || selected), uid: selected.uid, email: fresh?.email || selected.email });
      setEnableEmail(selected.email || '');
      setShowUserDropdown(false);
      toast.success('User selected successfully');
    } catch (error) {
      console.error('Error selecting user:', error);
      toast.error('Error selecting user');
    } finally {
      setSearching(false);
    }
  };

  const handleTogglePayoutAccess = async () => {
    if (!selectedUser?.uid) {
      toast.error('Please select a user first');
      return;
    }
    if (!user) {
      toast.error('Authentication error. Please refresh and try again.');
      return;
    }

    const nextUnlocked = selectedUser.payoutsUnlocked !== true;
    setAccessUpdating(true);
    try {
      await setUserPayoutsAccess(selectedUser.uid, nextUnlocked, user.uid);
      const updated = { ...selectedUser, payoutsUnlocked: nextUnlocked };
      setSelectedUser(updated);
      setAllUsers((current) => current.map((entry) => (
        entry.uid === selectedUser.uid ? { ...entry, payoutsUnlocked: nextUnlocked } : entry
      )));
      toast.success(nextUnlocked ? 'Payout page unlocked' : 'Payout page locked');
    } catch (error) {
      console.error('Error updating payout access:', error);
      toast.error('Failed to update payout page access');
    } finally {
      setAccessUpdating(false);
    }
  };

  const handleEnableWithdrawal = async () => {
    if (!selectedUser) {
      toast.error('Please select a user first');
      return;
    }
    
    if (!amountOwed || parseFloat(amountOwed) <= 0) {
      toast.error('Please enter a valid amount owed');
      return;
    }
    
    if (!profitSplit || parseFloat(profitSplit) <= 0 || parseFloat(profitSplit) > 100) {
      toast.error('Please enter a valid profit split percentage (1-100)');
      return;
    }
    
    if (!user) {
      toast.error('Authentication error. Please refresh and try again.');
      return;
    }

    setUpdating(true);
    try {
      await enableUserWithdrawal(
        selectedUser.uid,
        selectedUser.email,
        parseFloat(amountOwed),
        parseFloat(profitSplit),
        user.uid
      );
      
      toast.success('Withdrawal enabled successfully');
      setShowEnableModal(false);
      setEnableEmail('');
      setSelectedUser(null);
      setAmountOwed('');
      setProfitSplit('80');
      setShowUserDropdown(false);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error enabling withdrawal:', error);
      toast.error('Failed to enable withdrawal');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (status: WithdrawalRequest['status']) => {
    if (!selectedWithdrawal || !user) return;

    // Validate transaction hash for completed status
    if (status === 'completed' && !transactionHash.trim()) {
      toast.error('Transaction hash is required for completed withdrawals');
      return;
    }

    setUpdating(true);
    try {
      await updateWithdrawalStatus(
        selectedWithdrawal.userId,
        status,
        reviewNotes || undefined,
        user.uid,
        status === 'completed' ? transactionHash : undefined
      );
      
      toast.success(`Withdrawal ${status}`);
      setSelectedWithdrawal(null);
      setReviewNotes('');
      setTransactionHash('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast.error('Failed to update withdrawal status');
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const getStatusColor = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'approved': return 'text-blue-400 bg-blue-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      case 'completed': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getPaymentMethodDisplay = (method?: string) => {
    switch (method) {
      case 'usdc_solana': return 'USDC (Solana)';
      case 'usdt_trc20': return 'USDT (TRC20)';
      default: return 'Not selected';
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal =>
    withdrawal.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    withdrawal.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending').length,
    approved: withdrawals.filter(w => w.status === 'approved').length,
    completed: withdrawals.filter(w => w.status === 'completed').length,
    rejected: withdrawals.filter(w => w.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0FF1CE]"></div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-center" />
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">Withdrawal Management</h1>
        <p className="text-gray-400 text-sm">Review and manage user withdrawal requests</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mb-5 md:mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', Icon: FileText, iconColor: 'text-gray-500' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-400', Icon: Clock, iconColor: 'text-yellow-400' },
          { label: 'Approved', value: stats.approved, color: 'text-blue-400', Icon: Check, iconColor: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-green-400', Icon: CheckCircle, iconColor: 'text-green-400' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-400', Icon: X, iconColor: 'text-red-400' },
        ].map(({ label, value, color, Icon, iconColor }) => (
          <div key={label} className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-2.5 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] md:text-sm truncate">{label}</p>
                <p className={`text-lg md:text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`${iconColor} hidden md:block`} size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mb-4 md:mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by email or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0D0D0D]/80 backdrop-blur-sm text-white pl-9 pr-4 py-2 text-sm rounded-lg border border-[#2F2F2F]/50 focus:border-[#0FF1CE]/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex-1 sm:flex-none bg-[#0D0D0D]/80 backdrop-blur-sm text-white px-3 py-2 text-sm rounded-lg border border-[#2F2F2F]/50 focus:border-[#0FF1CE]/50 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => setShowEnableModal(true)}
            className="bg-[#0FF1CE] text-black font-semibold px-3 md:px-4 py-2 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Enable Withdrawal</span>
            <span className="sm:hidden">Enable</span>
          </button>
        </div>
      </div>

      {/* Withdrawals - Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredWithdrawals.length === 0 ? (
          <div className="bg-[#0D0D0D]/80 rounded-xl border border-[#2F2F2F]/50 py-8 text-center text-gray-400">
            No withdrawal requests found
          </div>
        ) : filteredWithdrawals.map((withdrawal) => (
          <div key={withdrawal.id} className="bg-[#0D0D0D]/80 rounded-xl border border-[#2F2F2F]/50 p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-medium text-sm">{withdrawal.userEmail}</p>
                <p className="text-gray-500 text-xs">{withdrawal.userId.slice(0, 12)}...</p>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(withdrawal.status)}`}>
                {withdrawal.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#0FF1CE] font-semibold text-sm">${withdrawal.payoutAmount.toFixed(2)}</div>
                <div className="text-gray-500 text-xs">{getPaymentMethodDisplay(withdrawal.paymentMethod)}</div>
              </div>
              <button onClick={() => setSelectedWithdrawal(withdrawal)} className="text-[#0FF1CE] flex items-center gap-1 text-sm font-medium">
                <Eye size={15} />Review
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Withdrawals Table - Desktop */}
      <div className="hidden md:block bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2F2F2F]">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Amount</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Method</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Submitted</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No withdrawal requests found
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-[#2F2F2F]/50 hover:bg-white/5">
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium">{withdrawal.userEmail}</p>
                        <p className="text-gray-400 text-xs">{withdrawal.userId}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium">${withdrawal.payoutAmount.toFixed(2)}</p>
                        <p className="text-gray-400 text-xs">{withdrawal.profitSplit}% split</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white text-sm">{getPaymentMethodDisplay(withdrawal.paymentMethod)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-400 text-sm">
                        {withdrawal.submittedAt 
                          ? formatDistanceToNow(withdrawal.submittedAt.toDate(), { addSuffix: true })
                          : 'Not submitted'
                        }
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className="text-[#0FF1CE] hover:text-[#0FF1CE]/80 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enable Withdrawal Modal */}
      {showEnableModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] rounded-xl border border-[#2F2F2F] p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Enable Withdrawal</h3>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-2">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={enableEmail}
                    onChange={(e) => {
                      setEnableEmail(e.target.value);
                      // Clear selected user when typing new search
                      if (selectedUser && e.target.value !== selectedUser.email) {
                        setSelectedUser(null);
                      }
                    }}
                    placeholder="Search by email or name..."
                    className="w-full bg-[#151515] text-white pl-10 pr-3 py-2 rounded-lg border border-[#2F2F2F] focus:border-[#0FF1CE]/50 focus:outline-none"
                    disabled={searching}
                  />
                </div>
                
                {/* User dropdown */}
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#151515] border border-[#2F2F2F] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.map((user) => {
                      const hasExistingWithdrawal = withdrawals.some(w => w.userId === user.uid);
                      return (
                        <button
                          key={user.uid}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full text-left px-4 py-3 hover:bg-[#2F2F2F]/50 transition-colors border-b border-[#2F2F2F]/30 last:border-0"
                          disabled={searching}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-white font-medium">{user.email || 'No email'}</p>
                              {(user.displayName || user.firstName || user.lastName) && (
                                <p className="text-gray-400 text-sm">
                                  {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                                </p>
                              )}
                            </div>
                            {hasExistingWithdrawal && (
                              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                                Has Request
                              </span>
                            )}
                            {user.payoutsUnlocked && (
                              <span className="text-xs text-[#0FF1CE] bg-[#0FF1CE]/10 px-2 py-1 rounded ml-2">
                                Page open
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {showUserDropdown && filteredUsers.length === 0 && enableEmail.trim() && (
                  <div className="absolute z-10 w-full mt-1 bg-[#151515] border border-[#2F2F2F] rounded-lg shadow-lg p-4">
                    <p className="text-gray-400 text-sm text-center">No users found</p>
                  </div>
                )}
              </div>

              {selectedUser && (
                <>
                  <div className="bg-[#151515] rounded-lg p-3 border border-[#0FF1CE]/30">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-green-400 text-sm mb-1">Selected User:</p>
                        <p className="text-white font-medium">{selectedUser.email}</p>
                        {(selectedUser.displayName || selectedUser.firstName || selectedUser.lastName) && (
                          <p className="text-gray-400 text-sm">
                            {selectedUser.displayName || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">{selectedUser.uid}</p>
                        <p className={`text-xs mt-2 font-medium ${selectedUser.payoutsUnlocked ? 'text-[#0FF1CE]' : 'text-gray-500'}`}>
                          Payout page: {selectedUser.payoutsUnlocked ? 'Unlocked' : 'Locked'}
                          {withdrawals.some((entry) => entry.userId === selectedUser.uid)
                            ? ' · A payout request is already on file'
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setEnableEmail('');
                        }}
                        className="text-gray-400 hover:text-red-400 ml-2"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Total Profit Made ($)</label>
                    <input
                      type="number"
                      value={amountOwed}
                      onChange={(e) => setAmountOwed(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full bg-[#151515] text-white px-3 py-2 rounded-lg border border-[#2F2F2F] focus:border-[#0FF1CE]/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Profit Split (%)</label>
                    <input
                      type="number"
                      value={profitSplit}
                      onChange={(e) => setProfitSplit(e.target.value)}
                      placeholder="80"
                      min="0"
                      max="100"
                      step="1"
                      className="w-full bg-[#151515] text-white px-3 py-2 rounded-lg border border-[#2F2F2F] focus:border-[#0FF1CE]/50 focus:outline-none"
                    />
                  </div>

                  {amountOwed && profitSplit && (
                    <div className="bg-[#151515] rounded-lg p-3 border border-[#0FF1CE]/30">
                      <p className="text-gray-400 text-sm">Payout Amount:</p>
                      <p className="text-[#0FF1CE] text-xl font-bold">
                        ${((parseFloat(amountOwed) * parseFloat(profitSplit)) / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                type="button"
                onClick={handleTogglePayoutAccess}
                disabled={!selectedUser || accessUpdating || updating}
                className="w-full bg-[#151515] border border-[#2F2F2F] text-white font-semibold py-2 rounded-lg hover:border-[#0FF1CE]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accessUpdating
                  ? 'Saving...'
                  : selectedUser?.payoutsUnlocked
                    ? 'Lock payout page'
                    : 'Unlock payout page'}
              </button>
              <p className="text-gray-500 text-xs -mt-1">
                {selectedUser && withdrawals.some((entry) => entry.userId === selectedUser.uid)
                  ? 'This user already has a payout request, so the page stays open while that request exists. Unlock keeps it open after the request is gone.'
                  : 'Opens the payouts page without creating a payout. Use Enable Withdrawal when there is an amount to pay.'}
              </p>
              <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEnableModal(false);
                  setEnableEmail('');
                  setSelectedUser(null);
                  setAmountOwed('');
                  setProfitSplit('80');
                  setShowUserDropdown(false);
                }}
                className="flex-1 bg-white/10 text-white font-semibold py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleEnableWithdrawal();
                }}
                disabled={!selectedUser || !amountOwed || !profitSplit || updating || accessUpdating}
                className="flex-1 bg-[#0FF1CE] text-black font-semibold py-2 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Enabling...' : 'Enable Withdrawal'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Details Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] rounded-xl border border-[#2F2F2F] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Withdrawal Details</h3>
              <button
                onClick={() => {
                  setSelectedWithdrawal(null);
                  setReviewNotes('');
                  setTransactionHash('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">User Information</h4>
                <div className="bg-[#151515] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{selectedWithdrawal.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID:</span>
                    <span className="text-white font-mono text-sm">{selectedWithdrawal.userId}</span>
                  </div>
                </div>
              </div>

              {/* Withdrawal Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Withdrawal Details</h4>
                <div className="bg-[#151515] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Profit Made:</span>
                    <span className="text-white">${selectedWithdrawal.amountOwed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profit Split:</span>
                    <span className="text-white">{selectedWithdrawal.profitSplit}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payout Amount:</span>
                    <span className="text-[#0FF1CE] font-bold">${selectedWithdrawal.payoutAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="text-white">{getPaymentMethodDisplay(selectedWithdrawal.paymentMethod)}</span>
                  </div>
                  {selectedWithdrawal.walletAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Wallet Address:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {selectedWithdrawal.walletAddress.slice(0, 6)}...{selectedWithdrawal.walletAddress.slice(-4)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(selectedWithdrawal.walletAddress!)}
                          className="text-[#0FF1CE] hover:text-[#0FF1CE]/80"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Status Information</h4>
                <div className="bg-[#151515] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Status:</span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedWithdrawal.status)}`}>
                      {selectedWithdrawal.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Enabled At:</span>
                    <span className="text-white">
                      {formatDistanceToNow(selectedWithdrawal.enabledAt.toDate(), { addSuffix: true })}
                    </span>
                  </div>
                  {selectedWithdrawal.submittedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Submitted At:</span>
                      <span className="text-white">
                        {formatDistanceToNow(selectedWithdrawal.submittedAt.toDate(), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  {selectedWithdrawal.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reviewed At:</span>
                      <span className="text-white">
                        {formatDistanceToNow(selectedWithdrawal.reviewedAt.toDate(), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Hash (for completed) */}
              {selectedWithdrawal.transactionHash && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Transaction Information</h4>
                  <div className="bg-[#151515] rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Transaction Hash:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {selectedWithdrawal.transactionHash.slice(0, 10)}...{selectedWithdrawal.transactionHash.slice(-8)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(selectedWithdrawal.transactionHash!)}
                          className="text-[#0FF1CE] hover:text-[#0FF1CE]/80"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {selectedWithdrawal.reviewNotes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Review Notes</h4>
                  <div className="bg-[#151515] rounded-lg p-4">
                    <p className="text-white text-sm">{selectedWithdrawal.reviewNotes}</p>
                  </div>
                </div>
              )}

              {/* Action Section */}
              {selectedWithdrawal.status === 'pending' && selectedWithdrawal.walletAddress && (
                <div className="space-y-4 pt-4 border-t border-[#2F2F2F]">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Review Notes (Optional)</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about this withdrawal..."
                      rows={3}
                      className="w-full bg-[#151515] text-white px-3 py-2 rounded-lg border border-[#2F2F2F] focus:border-[#0FF1CE]/50 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdateStatus('approved')}
                      disabled={updating}
                      className="flex-1 bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('rejected')}
                      disabled={updating}
                      className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>

                  {!selectedWithdrawal.walletAddress && (
                    <p className="text-yellow-400 text-sm text-center">
                      <AlertTriangle className="inline-block mr-1" size={16} />
                      User has not submitted wallet address yet
                    </p>
                  )}
                </div>
              )}

              {/* Mark as Complete (for approved withdrawals) */}
              {selectedWithdrawal.status === 'approved' && (
                <div className="space-y-4 pt-4 border-t border-[#2F2F2F]">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Transaction Hash</label>
                    <input
                      type="text"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="Enter blockchain transaction hash..."
                      className="w-full bg-[#151515] text-white px-3 py-2 rounded-lg border border-[#2F2F2F] focus:border-[#0FF1CE]/50 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updating || !transactionHash.trim()}
                    className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Mark as Completed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 