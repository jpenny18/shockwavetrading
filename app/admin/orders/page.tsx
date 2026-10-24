'use client';
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Mail,
  RefreshCw,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { collection, query, orderBy, getDocs, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Order {
  id: string;
  customerEmail: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  discordUsername?: string;
  challengeType: string;
  challengeAmount: string;
  platform: string;
  addOns?: string[];
  totalAmount: number;
  paymentMethod: 'card' | 'crypto';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  challengeStatus?: 'pending' | 'passed' | 'failed' | 'funded' | 'in progress';
  paymentIntentId?: string;
  transactionId?: string;
  resetCode?: string | null;
  originalAmount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Status styles
const statusStyles = {
  completed: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
  pending: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  processing: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: RefreshCw },
  failed: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
  unknown: { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle }, // Fallback style
};

// Challenge status styles
const challengeStatusStyles = {
  passed: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
  failed: { color: 'text-red-500', bg: 'bg-red-500/10', icon: X },
  funded: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle },
  'in progress': { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: RefreshCw },
  pending: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  unknown: { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle },
};

// Sort options
const sortOptions = [
  { label: 'Newest first', value: 'date_desc' },
  { label: 'Oldest first', value: 'date_asc' },
  { label: 'Highest amount', value: 'amount_desc' },
  { label: 'Lowest amount', value: 'amount_asc' },
];

// Filter options
const filterOptions = {
  status: ['All', 'Completed', 'Processing', 'Pending', 'Failed'],
  type: ['All', 'Standard Challenge', 'Express Challenge', 'Instant Funding', 'VIP Activation', 'vip-activation'],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState<string | null>(null);
  const [showChallengeDropdown, setShowChallengeDropdown] = useState<string | null>(null);

  // Fetch orders from Firebase
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
        });
        
        setOrders(fetchedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowPaymentDropdown(null);
        setShowChallengeDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Update payment status
  const handleUpdatePaymentStatus = async (orderId: string, newStatus: 'completed' | 'failed') => {
    try {
      setUpdatingOrderId(orderId);
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        paymentStatus: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, paymentStatus: newStatus, updatedAt: Timestamp.now() }
            : order
        )
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Update challenge status
  const handleUpdateChallengeStatus = async (orderId: string, newStatus: 'passed' | 'failed' | 'funded' | 'in progress') => {
    try {
      setUpdatingOrderId(orderId);
      
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        challengeStatus: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, challengeStatus: newStatus, updatedAt: Timestamp.now() }
            : order
        )
      );
    } catch (error) {
      console.error('Error updating challenge status:', error);
      setError('Failed to update challenge status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Apply filters and search
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (filterStatus !== 'All' && order.paymentStatus !== filterStatus.toLowerCase()) {
      return false;
    }
    
    // Type filter
    if (filterType !== 'All' && order.challengeType !== filterType) {
      return false;
    }
    
    // Search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.id.toLowerCase().includes(searchLower) ||
        order.firstName.toLowerCase().includes(searchLower) ||
        order.lastName.toLowerCase().includes(searchLower) ||
        order.customerEmail.toLowerCase().includes(searchLower) ||
        order.challengeType.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Apply sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch(sortBy) {
      case 'date_asc':
        return a.createdAt.seconds - b.createdAt.seconds;
      case 'date_desc':
        return b.createdAt.seconds - a.createdAt.seconds;
      case 'amount_asc':
        return a.totalAmount - b.totalAmount;
      case 'amount_desc':
        return b.totalAmount - a.totalAmount;
      default:
        return 0;
    }
  });

  const toggleOrderDetails = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  const handleResendCredentials = async (email: string) => {
    // TODO: Implement resend credentials functionality
    alert(`Credentials will be resent to ${email}`);
  };

  const handleExportCSV = () => {
    // Convert orders to CSV format
    const headers = ['Order ID', 'Date', 'Customer', 'Email', 'Type', 'Amount', 'Status', 'Payment Method'];
    const csvData = sortedOrders.map(order => [
      order.id,
      new Date(order.createdAt.seconds * 1000).toLocaleDateString(),
      `${order.firstName} ${order.lastName}`,
      order.customerEmail,
      order.challengeType,
      order.totalAmount,
      order.paymentStatus,
      order.paymentMethod
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === sortedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(sortedOrders.map(order => order.id)));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'orders', orderId));
      
      // Remove from local state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setSelectedOrders(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(orderId);
        return newSelected;
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      setError('Failed to delete order. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Delete all selected orders
      await Promise.all(
        Array.from(selectedOrders).map(orderId => 
          deleteDoc(doc(db, 'orders', orderId))
        )
      );
      
      // Remove from local state
      setOrders(prevOrders => 
        prevOrders.filter(order => !selectedOrders.has(order.id))
      );
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Error deleting orders:', error);
      setError('Failed to delete orders. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0FF1CE] mx-auto mb-4" />
          <p className="text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-[#0FF1CE]/10 text-[#0FF1CE] px-4 py-2 rounded-lg hover:bg-[#0FF1CE]/20 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Orders</h1>
        <div className="flex items-center gap-2 md:gap-4">
          {selectedOrders.size > 0 && (
            <button 
              onClick={() => {
                setOrderToDelete(null);
                setShowDeleteConfirm(true);
              }}
              className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-red-500/20 transition-colors text-sm"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Delete Selected ({selectedOrders.size})</span>
              <span className="sm:hidden">({selectedOrders.size})</span>
            </button>
          )}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#0FF1CE] text-black px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors text-sm"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col gap-2 md:flex-row md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <input 
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:contents">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full md:w-36 bg-[#151515] border border-[#2F2F2F] rounded-lg px-2 md:px-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              {filterOptions.status.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full md:w-44 bg-[#151515] border border-[#2F2F2F] rounded-lg px-2 md:px-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              {filterOptions.type.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-36 bg-[#151515] border border-[#2F2F2F] rounded-lg px-2 md:px-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table / Cards */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50">
        
        {/* Mobile card view */}
        <div className="md:hidden p-3 space-y-2">
          {sortedOrders.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No orders found matching your filters.</p>
          ) : sortedOrders.map((order) => {
            const status = order.paymentStatus && statusStyles[order.paymentStatus] ? order.paymentStatus : 'unknown';
            const StatusIcon = statusStyles[status].icon;
            const challengeStatus = order.challengeStatus || 'pending';
            const ChallengeIcon = challengeStatusStyles[challengeStatus]?.icon || AlertCircle;
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-[#0FF1CE]/30 bg-[#0FF1CE]/5' : 'border-[#2F2F2F]/50 bg-[#151515]/40'}`}>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]"
                      />
                      <span className="text-white text-xs font-mono font-medium">#{order.id.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status].bg} ${statusStyles[status].color}`}>
                        <StatusIcon size={10} className="mr-1" />
                        <span className="capitalize">{order.paymentStatus}</span>
                      </div>
                      <button onClick={() => toggleOrderDetails(order.id)} className="text-gray-400 hover:text-[#0FF1CE] p-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-medium">{order.firstName} {order.lastName}</div>
                      <div className="text-gray-500 text-xs">{order.challengeType} · {order.challengeAmount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#0FF1CE] font-semibold text-sm">${order.totalAmount}</div>
                      <div className="text-gray-500 text-xs">{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${challengeStatusStyles[challengeStatus]?.bg || 'bg-gray-500/10'} ${challengeStatusStyles[challengeStatus]?.color || 'text-gray-500'}`}>
                      <ChallengeIcon size={10} className="mr-1" />
                      <span className="capitalize">{challengeStatus}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.id); setShowDeleteConfirm(true); }}
                      className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-[#2F2F2F]/50 p-3 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Email</div>
                        <div className="text-white text-xs break-all">{order.customerEmail}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Phone</div>
                        <div className="text-white text-xs">{order.phone}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Country</div>
                        <div className="text-white text-xs">{order.country}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Platform</div>
                        <div className="text-white text-xs">{order.platform}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleUpdatePaymentStatus(order.id, 'completed')} disabled={updatingOrderId === order.id || order.paymentStatus === 'completed'} className="flex-1 flex items-center justify-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50">
                        <CheckCircle size={11} /><span>Complete</span>
                      </button>
                      <button onClick={() => handleUpdatePaymentStatus(order.id, 'failed')} disabled={updatingOrderId === order.id || order.paymentStatus === 'failed'} className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50">
                        <X size={11} /><span>Fail</span>
                      </button>
                      <button onClick={() => handleResendCredentials(order.customerEmail)} className="flex-1 flex items-center justify-center gap-1 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 text-[#0FF1CE] py-1.5 rounded text-xs font-medium transition-colors">
                        <Mail size={11} /><span>Resend</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#2F2F2F]">
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === sortedOrders.length && sortedOrders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]"
                  />
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account Size</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Challenge Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F2F2F]">
              {sortedOrders.map((order) => {
                // Add type safety for payment status
                const status = order.paymentStatus && statusStyles[order.paymentStatus] ? order.paymentStatus : 'unknown';
                const Status = statusStyles[status].icon;
                const isExpanded = expandedOrderId === order.id;
                
                return (
                  <React.Fragment key={order.id}>
                    <tr 
                      className={`hover:bg-white/5 transition-colors ${isExpanded ? 'bg-[#0FF1CE]/5' : ''}`}
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-600 text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 bg-[#1A1A1A]"
                        />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-white">{order.id}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">{`${order.firstName} ${order.lastName}`}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">{order.challengeType}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">{order.challengeAmount}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">${order.totalAmount}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPaymentDropdown(showPaymentDropdown === order.id ? null : order.id);
                              setShowChallengeDropdown(null);
                            }}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium hover:scale-105 transition-all cursor-pointer ${statusStyles[status].bg} ${statusStyles[status].color}`}
                          >
                            <Status size={12} className="mr-1" />
                            <span className="capitalize">{order.paymentStatus || 'Unknown'}</span>
                            <ChevronDown size={10} className="ml-1" />
                          </button>
                          
                          {/* Payment Status Dropdown */}
                          {showPaymentDropdown === order.id && (
                            <div className="absolute top-full left-0 mt-1 bg-[#1A1A1A] border border-[#2F2F2F]/50 rounded-lg shadow-lg z-50 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdatePaymentStatus(order.id, 'completed');
                                  setShowPaymentDropdown(null);
                                }}
                                disabled={updatingOrderId === order.id || order.paymentStatus === 'completed'}
                                className="w-full text-left px-3 py-2 text-xs text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                <CheckCircle size={12} />
                                <span>Completed</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdatePaymentStatus(order.id, 'failed');
                                  setShowPaymentDropdown(null);
                                }}
                                disabled={updatingOrderId === order.id || order.paymentStatus === 'failed'}
                                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                <X size={12} />
                                <span>Failed</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="relative">
                          {(() => {
                            const challengeStatus = order.challengeStatus || 'pending';
                            const ChallengeStatusIcon = challengeStatusStyles[challengeStatus]?.icon || AlertCircle;
                            return (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowChallengeDropdown(showChallengeDropdown === order.id ? null : order.id);
                                    setShowPaymentDropdown(null);
                                  }}
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium hover:scale-105 transition-all cursor-pointer ${challengeStatusStyles[challengeStatus]?.bg || 'bg-gray-500/10'} ${challengeStatusStyles[challengeStatus]?.color || 'text-gray-500'}`}
                                >
                                  <ChallengeStatusIcon size={12} className="mr-1" />
                                  <span className="capitalize">{order.challengeStatus || 'Pending'}</span>
                                  <ChevronDown size={10} className="ml-1" />
                                </button>
                                
                                {/* Challenge Status Dropdown */}
                                {showChallengeDropdown === order.id && (
                                  <div className="absolute top-full left-0 mt-1 bg-[#1A1A1A] border border-[#2F2F2F]/50 rounded-lg shadow-lg z-50 min-w-[120px]">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateChallengeStatus(order.id, 'in progress');
                                        setShowChallengeDropdown(null);
                                      }}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'in progress'}
                                      className="w-full text-left px-3 py-2 text-xs text-orange-500 hover:bg-orange-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      <RefreshCw size={12} />
                                      <span>In Progress</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateChallengeStatus(order.id, 'passed');
                                        setShowChallengeDropdown(null);
                                      }}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'passed'}
                                      className="w-full text-left px-3 py-2 text-xs text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      <CheckCircle size={12} />
                                      <span>Passed</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateChallengeStatus(order.id, 'failed');
                                        setShowChallengeDropdown(null);
                                      }}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'failed'}
                                      className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      <X size={12} />
                                      <span>Failed</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateChallengeStatus(order.id, 'funded');
                                        setShowChallengeDropdown(null);
                                      }}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'funded'}
                                      className="w-full text-left px-3 py-2 text-xs text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      <CheckCircle size={12} />
                                      <span>Funded</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleOrderDetails(order.id)}
                            className="p-1 text-gray-400 hover:text-[#0FF1CE] transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToDelete(order.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr className="bg-[#0FF1CE]/5">
                        <td colSpan={9} className="py-4 px-6 text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-white font-medium mb-3">Customer Details</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Name:</span>
                                  <span className="text-white">{`${order.firstName} ${order.lastName}`}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Email:</span>
                                  <span className="text-white">{order.customerEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Phone:</span>
                                  <span className="text-white">{order.phone}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Country:</span>
                                  <span className="text-white">{order.country}</span>
                                </div>
                                {order.discordUsername && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Discord:</span>
                                    <span className="text-white">{order.discordUsername}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-white font-medium mb-3">Order Details</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Challenge Type:</span>
                                  <span className="text-white">{order.challengeType}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Account Size:</span>
                                  <span className="text-white">{order.challengeAmount}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Platform:</span>
                                  <span className="text-white">{order.platform}</span>
                                </div>
                                {order.resetCode && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Reset code:</span>
                                    <span className="text-white">{order.resetCode}</span>
                                  </div>
                                )}
                                {typeof order.originalAmount === 'number' && order.originalAmount !== order.totalAmount && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Original price:</span>
                                    <span className="text-white">${order.originalAmount.toLocaleString()}</span>
                                  </div>
                                )}
                                {order.addOns && order.addOns.length > 0 && (
                                  <div className="flex justify-between items-start">
                                    <span className="text-gray-400">Add-ons:</span>
                                    <div className="text-right">
                                      {order.addOns.map((addOn, index) => {
                                        // Map addOn IDs to display names
                                        const addOnNames: Record<string, string> = {
                                          'no-min-days': 'No Min Trading Days',
                                          'profit-split-80': '80% Initial Profit Split', // Legacy orders
                                          'profit-split-100': '100% Initial Profit Split',
                                          'leverage-500': '1:500 Leverage',
                                          'reward-150': '150% Reward'
                                        };
                                        return (
                                          <div key={index} className="text-white text-sm">
                                            {addOnNames[addOn] || addOn}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Payment Method:</span>
                                  <span className="text-white capitalize">{order.paymentMethod}</span>
                                </div>
                                {order.paymentIntentId && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Payment ID:</span>
                                    <span className="text-white font-mono text-xs">{order.paymentIntentId}</span>
                                  </div>
                                )}
                                {order.transactionId && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Transaction ID:</span>
                                    <span className="text-white font-mono text-xs">{order.transactionId}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Created:</span>
                                  <span className="text-white">
                                    {new Date(order.createdAt.seconds * 1000).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Last Updated:</span>
                                  <span className="text-white">
                                    {new Date(order.updatedAt.seconds * 1000).toLocaleString()}
                                  </span>
                                </div>

                                {/* Resend Credentials Button */}
                                <button 
                                  onClick={() => handleResendCredentials(order.customerEmail)}
                                  className="w-full flex items-center justify-center gap-2 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 text-[#0FF1CE] py-2 rounded-lg transition-colors"
                                >
                                  <Mail size={16} />
                                  <span>Resend Credentials</span>
                                </button>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-[#2F2F2F]/50 space-y-4">
                                {/* Payment Status Update Buttons */}
                                <div>
                                  <h4 className="text-white font-medium mb-2">Update Payment Status</h4>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleUpdatePaymentStatus(order.id, 'completed')}
                                      disabled={updatingOrderId === order.id || order.paymentStatus === 'completed'}
                                      className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingOrderId === order.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <CheckCircle size={12} />
                                      )}
                                      <span>Mark Completed</span>
                                    </button>
                                    <button 
                                      onClick={() => handleUpdatePaymentStatus(order.id, 'failed')}
                                      disabled={updatingOrderId === order.id || order.paymentStatus === 'failed'}
                                      className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingOrderId === order.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <X size={12} />
                                      )}
                                      <span>Mark Failed</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Challenge Status Update Buttons */}
                                <div>
                                  <h4 className="text-white font-medium mb-2">Update Challenge Status</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    <button 
                                      onClick={() => handleUpdateChallengeStatus(order.id, 'passed')}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'passed'}
                                      className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingOrderId === order.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <CheckCircle size={12} />
                                      )}
                                      <span>Passed</span>
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateChallengeStatus(order.id, 'failed')}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'failed'}
                                      className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingOrderId === order.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <X size={12} />
                                      )}
                                      <span>Failed</span>
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateChallengeStatus(order.id, 'funded')}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'funded'}
                                      className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingOrderId === order.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <CheckCircle size={12} />
                                      )}
                                      <span>Funded</span>
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateChallengeStatus(order.id, 'in progress')}
                                      disabled={updatingOrderId === order.id || order.challengeStatus === 'in progress'}
                                      className="flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingOrderId === order.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <RefreshCw size={12} />
                                      )}
                                      <span>In Progress</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {sortedOrders.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-400">No orders found matching your filters.</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2F2F2F]/50 p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Confirm Delete</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              {orderToDelete
                ? 'Are you sure you want to delete this order? This action cannot be undone.'
                : `Are you sure you want to delete ${selectedOrders.size} selected orders? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => orderToDelete ? handleDeleteOrder(orderToDelete) : handleBulkDelete()}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 