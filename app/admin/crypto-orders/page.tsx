'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  X, 
  Trash2, 
  Clock, 
  RefreshCw,
  Search,
  ChevronDown,
  Filter,
  ChevronRight,
  ChevronUp,
  Copy
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface CryptoOrder {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  challengeStatus?: 'IN_PROGRESS' | 'FAILED' | 'PASSED';
  cryptoType: string;
  cryptoAmount: string;
  cryptoAddress: string;
  usdAmount: number;
  verificationPhrase: string;
  challengeType: string;
  challengeAmount: string;
  platform: string;
  addOns?: string[];
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerCountry: string;
  customerDiscordUsername?: string;
  discountCode?: string;
  discountId?: string;
  originalAmount?: number;
  createdAt: string;
  updatedAt: string;
  applicationType?: string;
  applicationData?: {
    q1_experience: string;
    q2_markets: string[];
    q3_frequency: string;
    q4_challenges: string[];
    q5_risk: string;
    q6_style: string;
    q7_mistakes: string[];
    q8_rules: string;
    q9_accountSize: string;
    q10_priority: string;
    score: number;
    riskTag: string;
    highRiskBehavior: boolean;
    highValueIntent: boolean;
  };
}

export default function CryptoOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<CryptoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [cryptoFilter, setCryptoFilter] = useState<'ALL' | 'BTC' | 'ETH' | 'USDT'>('ALL');
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'FAILED' | 'PASSED'>('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get('q');
    if (search) setSearchTerm(search);
  }, []);

  useEffect(() => {
    setLoading(true);
    setListError(null);
    const q = query(collection(db, 'crypto-orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: CryptoOrder[] = [];
      snapshot.forEach((orderDoc) => {
        ordersData.push({ id: orderDoc.id, ...orderDoc.data() } as CryptoOrder);
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading crypto orders:', error);
      setListError('Failed to load crypto orders. Please try again.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshKey]);

  const handleStatusChange = async (orderId: string, newStatus: 'COMPLETED' | 'CANCELLED') => {
    try {
      const orderRef = doc(db, 'crypto-orders', orderId);
      await updateDoc(orderRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // If order is marked as completed, send success email
      if (newStatus === 'COMPLETED') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          try {
            const response = await fetch('/api/send-crypto-emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...order,
                id: orderId,
                status: newStatus
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to send emails');
            }
          } catch (error) {
            console.error('Error sending emails:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      await deleteDoc(doc(db, 'crypto-orders', orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const toggleRowExpansion = (orderId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(orderId)) {
      newExpandedRows.delete(orderId);
    } else {
      newExpandedRows.add(orderId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getStats = () => {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + order.usdAmount, 0);
    const completedOrders = orders.filter(order => order.status === 'COMPLETED').length;
    const passedChallenges = orders.filter(order => order.challengeStatus === 'PASSED').length;
    const failedChallenges = orders.filter(order => order.challengeStatus === 'FAILED').length;
    const inProgressChallenges = orders.filter(order => order.challengeStatus === 'IN_PROGRESS').length;

    return {
      totalOrders,
      totalValue,
      completedOrders,
      passedChallenges,
      failedChallenges,
      inProgressChallenges
    };
  };

  const handleChallengeStatusChange = async (orderId: string, newStatus: 'IN_PROGRESS' | 'FAILED' | 'PASSED') => {
    try {
      const orderRef = doc(db, 'crypto-orders', orderId);
      await updateDoc(orderRef, { 
        challengeStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating challenge status:', error);
      setStatusError('Failed to update challenge status. Please try again.');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.verificationPhrase || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.cryptoAddress || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.challengeType || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesCrypto = cryptoFilter === 'ALL' || order.cryptoType === cryptoFilter;
    const matchesChallengeStatus = challengeStatusFilter === 'ALL' || order.challengeStatus === challengeStatusFilter;

    return matchesSearch && matchesStatus && matchesCrypto && matchesChallengeStatus;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Crypto Orders</h1>
        <button
          onClick={() => setRefreshKey((key) => key + 1)}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 text-[#0FF1CE] rounded-lg text-sm w-full sm:w-auto justify-center sm:justify-start"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {(listError || statusError) && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {listError || statusError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        {[
          { label: 'Total', value: getStats().totalOrders, color: 'text-white' },
          { label: 'Value', value: `$${getStats().totalValue.toFixed(0)}`, color: 'text-[#0FF1CE]' },
          { label: 'Completed', value: getStats().completedOrders, color: 'text-white' },
          { label: 'Passed', value: getStats().passedChallenges, color: 'text-green-400' },
          { label: 'Failed', value: getStats().failedChallenges, color: 'text-red-400' },
          { label: 'In Progress', value: getStats().inProgressChallenges, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#151515] p-2.5 md:p-4 rounded-lg border border-[#2F2F2F]/50">
            <div className="text-gray-400 text-[10px] md:text-sm truncate">{label}</div>
            <div className={`text-base md:text-2xl font-bold ${color} truncate`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-4">
        <div className="relative w-full md:flex-1 md:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search by email, name, phrase, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#151515] border border-[#2F2F2F]/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-[#0FF1CE]/50"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:contents">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-3 pr-7 py-2 bg-[#151515] border border-[#2F2F2F]/50 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
          <div className="relative">
            <select
              value={cryptoFilter}
              onChange={(e) => setCryptoFilter(e.target.value as any)}
              className="w-full pl-3 pr-7 py-2 bg-[#151515] border border-[#2F2F2F]/50 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="ALL">All Crypto</option>
              <option value="BTC">Bitcoin</option>
              <option value="ETH">Ethereum</option>
              <option value="USDT">USDT</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
          <div className="relative">
            <select
              value={challengeStatusFilter}
              onChange={(e) => setChallengeStatusFilter(e.target.value as any)}
              className="w-full pl-3 pr-7 py-2 bg-[#151515] border border-[#2F2F2F]/50 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="ALL">All Challenge</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FAILED">Failed</option>
              <option value="PASSED">Passed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      {/* Orders: Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
            <RefreshCw className="animate-spin" size={16} /><span>Loading...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No orders found</div>
        ) : filteredOrders.map((order) => {
          const isExpanded = expandedRows.has(order.id);
          return (
            <div key={order.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-[#0FF1CE]/30 bg-[#0FF1CE]/5' : 'border-[#2F2F2F]/50 bg-[#151515]/40'}`}>
              <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white text-sm font-medium">{order.customerName}</div>
                    <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'COMPLETED' ? 'bg-green-400/10 text-green-400' :
                      order.status === 'CANCELLED' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {order.status === 'COMPLETED' && <Check size={10} className="mr-1" />}
                      {order.status === 'CANCELLED' && <X size={10} className="mr-1" />}
                      {order.status === 'PENDING' && <Clock size={10} className="mr-1" />}
                      {order.status}
                    </span>
                    <button onClick={() => toggleRowExpansion(order.id)} className="text-gray-400 p-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-500 text-xs">{order.challengeType} · {order.challengeAmount} · {order.platform}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#0FF1CE] font-semibold text-sm">${order.usdAmount.toFixed(2)}</div>
                    <div className="text-gray-500 text-xs">{order.cryptoAmount} {order.cryptoType}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  {order.challengeStatus ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.challengeStatus === 'PASSED' ? 'bg-green-400/10 text-green-400' :
                      order.challengeStatus === 'FAILED' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {order.challengeStatus.replace('_', ' ')}
                    </span>
                  ) : <span />}
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleChallengeStatusChange(order.id, 'IN_PROGRESS')} className={`p-1.5 rounded text-xs ${order.challengeStatus === 'IN_PROGRESS' ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-[#2F2F2F]/20'}`} title="In Progress"><Clock size={13} /></button>
                    <button onClick={() => handleChallengeStatusChange(order.id, 'FAILED')} className={`p-1.5 rounded text-xs ${order.challengeStatus === 'FAILED' ? 'bg-red-400/20 text-red-400' : 'text-gray-400 hover:bg-[#2F2F2F]/20'}`} title="Failed"><X size={13} /></button>
                    <button onClick={() => handleChallengeStatusChange(order.id, 'PASSED')} className={`p-1.5 rounded text-xs ${order.challengeStatus === 'PASSED' ? 'bg-green-400/20 text-green-400' : 'text-gray-400 hover:bg-[#2F2F2F]/20'}`} title="Passed"><Check size={13} /></button>
                    {order.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleStatusChange(order.id, 'COMPLETED')} className="p-1.5 rounded text-green-400 hover:bg-green-400/10" title="Complete"><Check size={13} /></button>
                        <button onClick={() => handleStatusChange(order.id, 'CANCELLED')} className="p-1.5 rounded text-red-400 hover:bg-red-400/10" title="Cancel"><X size={13} /></button>
                      </>
                    )}
                    <button onClick={() => handleDelete(order.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-[#2F2F2F]/50 p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[#0FF1CE] font-medium mb-1 text-xs uppercase tracking-wide">Customer</div>
                    <div className="space-y-1 text-gray-300">
                      <div>{order.customerPhone}</div>
                      <div>{order.customerCountry}</div>
                      {order.customerDiscordUsername && <div>{order.customerDiscordUsername}</div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#0FF1CE] font-medium mb-1 text-xs uppercase tracking-wide">Payment</div>
                    <div className="space-y-1 text-gray-300">
                      <div>{order.cryptoAmount} {order.cryptoType}</div>
                      <div className="font-mono text-[10px] break-all">{order.cryptoAddress}</div>
                      <div className="text-gray-500">Phrase: <span className="text-white font-mono">{order.verificationPhrase}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Orders Table - Desktop only */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#2F2F2F]/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Challenge</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Payment</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <>
                  <tr key={order.id} className="border-b border-[#2F2F2F]/50 hover:bg-[#151515]">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleRowExpansion(order.id)}
                        className="p-1 hover:bg-[#2F2F2F]/20 rounded"
                      >
                        {expandedRows.has(order.id) ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="text-white">{new Date(order.createdAt).toLocaleDateString()}</div>
                      <div className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-white">{order.customerName}</div>
                          <div className="text-sm text-gray-400">{order.customerEmail}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(order.customerName);
                            }}
                            className="p-1 hover:bg-[#2F2F2F]/20 rounded transition-colors"
                            title="Copy name"
                          >
                            {copiedText === order.customerName ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(order.customerEmail);
                            }}
                            className="p-1 hover:bg-[#2F2F2F]/20 rounded transition-colors"
                            title="Copy email"
                          >
                            {copiedText === order.customerEmail ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-white">{order.challengeType}</div>
                      <div className="text-sm text-gray-400">{order.challengeAmount}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-[#0FF1CE]">{order.platform}</div>
                        {order.applicationType === 'fund-trader' && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                            FUND
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-white">${order.usdAmount.toFixed(2)}</div>
                      <div className="text-sm text-gray-400">
                        {order.cryptoAmount} {order.cryptoType}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'COMPLETED' ? 'bg-green-400/10 text-green-400' :
                          order.status === 'CANCELLED' ? 'bg-red-400/10 text-red-400' :
                          'bg-yellow-400/10 text-yellow-400'
                        }`}>
                          {order.status === 'COMPLETED' && <Check size={12} className="mr-1" />}
                          {order.status === 'CANCELLED' && <X size={12} className="mr-1" />}
                          {order.status === 'PENDING' && <Clock size={12} className="mr-1" />}
                          {order.status}
                        </span>
                        
                        {/* Challenge Status Badge */}
                        {order.challengeStatus && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.challengeStatus === 'PASSED' ? 'bg-green-400/10 text-green-400' :
                            order.challengeStatus === 'FAILED' ? 'bg-red-400/10 text-red-400' :
                            'bg-yellow-400/10 text-yellow-400'
                          }`}>
                            {order.challengeStatus === 'PASSED' && <Check size={12} className="mr-1" />}
                            {order.challengeStatus === 'FAILED' && <X size={12} className="mr-1" />}
                            {order.challengeStatus === 'IN_PROGRESS' && <Clock size={12} className="mr-1" />}
                            {order.challengeStatus.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {/* Challenge Status Controls */}
                        <div className="flex items-center gap-1 border-r border-[#2F2F2F]/50 pr-2 mr-2">
                          <button
                            onClick={() => handleChallengeStatusChange(order.id, 'IN_PROGRESS')}
                            className={`p-1.5 rounded transition-colors ${
                              order.challengeStatus === 'IN_PROGRESS' 
                                ? 'bg-yellow-400/20 text-yellow-400' 
                                : 'text-gray-400 hover:bg-[#2F2F2F]/20'
                            }`}
                            title="Mark Challenge as In Progress"
                          >
                            <Clock size={16} />
                          </button>
                          <button
                            onClick={() => handleChallengeStatusChange(order.id, 'FAILED')}
                            className={`p-1.5 rounded transition-colors ${
                              order.challengeStatus === 'FAILED' 
                                ? 'bg-red-400/20 text-red-400' 
                                : 'text-gray-400 hover:bg-[#2F2F2F]/20'
                            }`}
                            title="Mark Challenge as Failed"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleChallengeStatusChange(order.id, 'PASSED')}
                            className={`p-1.5 rounded transition-colors ${
                              order.challengeStatus === 'PASSED' 
                                ? 'bg-green-400/20 text-green-400' 
                                : 'text-gray-400 hover:bg-[#2F2F2F]/20'
                            }`}
                            title="Mark Challenge as Passed"
                          >
                            <Check size={16} />
                          </button>
                        </div>

                        {/* Original Order Status Controls */}
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                              className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                              title="Mark Order as Completed"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                              className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                              title="Mark Order as Cancelled"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                          title="Delete Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(order.id) && (
                    <tr className="bg-[#151515]/50">
                      <td colSpan={7} className="px-8 py-4">
                        <div className={`grid ${order.applicationData ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'} gap-6`}>
                          {/* Customer Details */}
                          <div>
                            <h3 className="text-[#0FF1CE] font-medium mb-2">Customer Details</h3>
                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-gray-400">Full Name</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-white">{order.customerName}</span>
                                  <button
                                    onClick={() => handleCopy(order.customerName)}
                                    className="p-1 hover:bg-[#2F2F2F]/20 rounded"
                                    title="Copy name"
                                  >
                                    {copiedText === order.customerName ? (
                                      <Check size={12} className="text-green-400" />
                                    ) : (
                                      <Copy size={12} className="text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400">Email</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-white">{order.customerEmail}</span>
                                  <button
                                    onClick={() => handleCopy(order.customerEmail)}
                                    className="p-1 hover:bg-[#2F2F2F]/20 rounded"
                                    title="Copy email"
                                  >
                                    {copiedText === order.customerEmail ? (
                                      <Check size={12} className="text-green-400" />
                                    ) : (
                                      <Copy size={12} className="text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400">Phone</div>
                                <div className="text-white">{order.customerPhone}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Country</div>
                                <div className="text-white">{order.customerCountry}</div>
                              </div>
                              {order.customerDiscordUsername && (
                                <div>
                                  <div className="text-gray-400">Discord</div>
                                  <div className="text-white">{order.customerDiscordUsername}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Challenge Details */}
                          <div>
                            <h3 className="text-[#0FF1CE] font-medium mb-2">Challenge Details</h3>
                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-gray-400">Type</div>
                                <div className="text-white">{order.challengeType}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Amount</div>
                                <div className="text-white">{order.challengeAmount}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Platform</div>
                                <div className="text-white">{order.platform}</div>
                              </div>
                              {order.addOns && order.addOns.length > 0 && (
                                <div>
                                  <div className="text-gray-400">Add-ons</div>
                                  <div className="text-white">
                                    {order.addOns.map((addOn, index) => {
                                      const addOnNames: { [key: string]: string } = {
                                        'no-min-days': 'No Min Trading Days',
                                        'profit-split-80': '80% Initial Profit Split', // Legacy
                                        'profit-split-100': '100% Initial Profit Split',
                                        'leverage-500': '1:500 Leverage',
                                        'reward-150': '150% Reward'
                                      };
                                      return (
                                        <div key={index} className="text-xs">
                                          • {addOnNames[addOn] || addOn}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {order.discountCode && (
                                <div>
                                  <div className="text-gray-400">Discount Applied</div>
                                  <div className="text-white">{order.discountCode}</div>
                                </div>
                              )}
                              {order.originalAmount && (
                                <div>
                                  <div className="text-gray-400">Original Price</div>
                                  <div className="text-white">${order.originalAmount.toFixed(2)}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payment Details */}
                          <div>
                            <h3 className="text-[#0FF1CE] font-medium mb-2">Payment Details</h3>
                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-gray-400">Crypto Type</div>
                                <div className="text-white">{order.cryptoType}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Crypto Amount</div>
                                <div className="text-white">{order.cryptoAmount} {order.cryptoType}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">USD Amount</div>
                                <div className="text-white">${order.usdAmount.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Wallet Address</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs truncate text-white">{order.cryptoAddress}</span>
                                  <button
                                    onClick={() => handleCopy(order.cryptoAddress)}
                                    className="p-1 hover:bg-[#2F2F2F]/20 rounded"
                                  >
                                    {copiedText === order.cryptoAddress ? (
                                      <Check size={14} className="text-green-400" />
                                    ) : (
                                      <Copy size={14} className="text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400">Verification Phrase</div>
                                <div className="font-mono text-xs text-white">{order.verificationPhrase}</div>
                              </div>
                            </div>
                          </div>

                          {/* Application Details - Only for fund trader applications */}
                          {order.applicationData && (
                            <div>
                              <h3 className="text-[#0FF1CE] font-medium mb-2">Fund Application Data</h3>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-gray-400">Application Score</div>
                                  <div className="text-white font-bold">{order.applicationData.score}</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Risk Profile</div>
                                  <div className={`font-medium ${
                                    order.applicationData.riskTag === 'Risk_A' ? 'text-green-400' :
                                    order.applicationData.riskTag === 'Risk_B' ? 'text-yellow-400' :
                                    'text-orange-400'
                                  }`}>
                                    {order.applicationData.riskTag}
                                  </div>
                                </div>
                                {order.applicationData.highRiskBehavior && (
                                  <div>
                                    <div className="text-red-400 font-medium">⚠️ High Risk Behavior</div>
                                  </div>
                                )}
                                {order.applicationData.highValueIntent && (
                                  <div>
                                    <div className="text-[#0FF1CE] font-medium">⭐ High Value Intent</div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-gray-400">Experience</div>
                                  <div className="text-white capitalize">{order.applicationData.q1_experience}</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Trading Style</div>
                                  <div className="text-white capitalize">{order.applicationData.q6_style}</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Risk Per Trade</div>
                                  <div className="text-white">{order.applicationData.q5_risk}</div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Markets</div>
                                  <div className="text-white text-xs">
                                    {order.applicationData.q2_markets.map((m, i) => (
                                      <span key={i} className="capitalize">{m}{i < order.applicationData!.q2_markets.length - 1 ? ', ' : ''}</span>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-400">Priority Access Reason</div>
                                  <div className="text-white text-xs bg-[#1A1A1A] p-2 rounded mt-1 max-h-24 overflow-y-auto">
                                    {order.applicationData.q10_priority}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 