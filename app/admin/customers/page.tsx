'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Mail,
  Phone,
  Globe,
  Edit,
  X, 
  User, 
  Download,
  Eye,
  MoreHorizontal,
  ExternalLink,
  Loader,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { UserData, getAllUsers, updateUser, Timestamp } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Customer extends Omit<UserData, 'lastOrderDate'> {
  id: string;
  joinDate: string; // Formatted date string
  lastOrderDate?: string; // Formatted date string
  actualTotalSpent?: number; // Calculated from actual orders
  actualOrderCount?: number; // Calculated from actual orders
}

interface Order {
  id: string;
  customerEmail: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: any;
}

interface CryptoOrder {
  id: string;
  customerEmail: string;
  usdAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: any;
}

type JoinDatePreset = 'all' | '24h' | '48h' | '7d' | '30d' | 'custom';

function getCustomerJoinTime(customer: Customer): number {
  try {
    if (customer.createdAt && typeof customer.createdAt.toDate === 'function') {
      const date = customer.createdAt.toDate();
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.getTime();
      }
    }
  } catch {
    // Fall through to the formatted joinDate string
  }

  const fallback = new Date(`${customer.joinDate}T12:00:00`).getTime();
  return isNaN(fallback) ? 0 : fallback;
}

function formatJoinDate(customer: Customer): string {
  const timestamp = getCustomerJoinTime(customer);
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString();
}

function isWithinJoinDateRange(
  customer: Customer,
  preset: JoinDatePreset,
  customStart: string,
  customEnd: string
): boolean {
  if (preset === 'all') return true;

  const joinTs = getCustomerJoinTime(customer);
  if (!joinTs) return false;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  switch (preset) {
    case '24h':
      return joinTs >= now - day;
    case '48h':
      return joinTs >= now - 2 * day;
    case '7d':
      return joinTs >= now - 7 * day;
    case '30d':
      return joinTs >= now - 30 * day;
    case 'custom': {
      if (!customStart && !customEnd) return true;
      if (customStart) {
        const start = new Date(`${customStart}T00:00:00`);
        if (!isNaN(start.getTime()) && joinTs < start.getTime()) return false;
      }
      if (customEnd) {
        const end = new Date(`${customEnd}T23:59:59.999`);
        if (!isNaN(end.getTime()) && joinTs > end.getTime()) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

/** RFC 4180 CSV field: quoted, with newlines stripped so SendGrid can parse the file. */
function escapeCsvField(value: string): string {
  const normalized = String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, ' ')
    .replace(/[\r\n]/g, ' ')
    .trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getExportNames(customer: Customer): { first_name: string; last_name: string } {
  const first = (customer.firstName || '').trim();
  const last = (customer.lastName || '').trim();
  if (first || last) {
    return { first_name: first, last_name: last };
  }

  const display = (customer.displayName || '').trim();
  if (!display || display.toLowerCase() === 'unknown') {
    return { first_name: '', last_name: '' };
  }

  const parts = display.split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ')
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [joinDatePreset, setJoinDatePreset] = useState<JoinDatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerMessage, setCustomerMessage] = useState<string | null>(null);
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
  });

  useEffect(() => {
    const joined = new URLSearchParams(window.location.search).get('joined');
    if (joined === '24h' || joined === '48h' || joined === '7d' || joined === '30d') {
      setJoinDatePreset(joined);
    }
  }, []);

  // Helper function to fetch orders for a customer
  const fetchCustomerOrders = async (customerEmail: string) => {
    try {
      // Fetch regular orders
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, where('customerEmail', '==', customerEmail));
      const ordersSnapshot = await getDocs(ordersQuery);
      
      // Fetch crypto orders
      const cryptoOrdersRef = collection(db, 'crypto-orders');
      const cryptoOrdersQuery = query(cryptoOrdersRef, where('customerEmail', '==', customerEmail));
      const cryptoOrdersSnapshot = await getDocs(cryptoOrdersQuery);
      
      let totalSpent = 0;
      let orderCount = 0;
      let lastOrderDate: Date | null = null;
      
      // Process regular orders
      ordersSnapshot.forEach((doc) => {
        const order = doc.data() as Order;
        if (order.paymentStatus === 'completed') {
          totalSpent += order.totalAmount;
          orderCount++;
          
          try {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            if (orderDate instanceof Date && !isNaN(orderDate.getTime())) {
              if (!lastOrderDate || orderDate > lastOrderDate) {
                lastOrderDate = orderDate;
              }
            }
          } catch (e) {
            console.warn('Invalid date in order:', order);
          }
        }
      });
      
      // Process crypto orders
      cryptoOrdersSnapshot.forEach((doc) => {
        const order = doc.data() as CryptoOrder;
        if (order.status === 'COMPLETED') {
          totalSpent += order.usdAmount;
          orderCount++;
          
          try {
            let orderDate: Date;
            if (typeof order.createdAt === 'string') {
              orderDate = new Date(order.createdAt);
            } else if (order.createdAt && typeof order.createdAt.toDate === 'function') {
              orderDate = order.createdAt.toDate();
            } else {
              orderDate = new Date(order.createdAt);
            }
            
            if (orderDate instanceof Date && !isNaN(orderDate.getTime())) {
              if (!lastOrderDate || orderDate > lastOrderDate) {
                lastOrderDate = orderDate;
              }
            }
          } catch (e) {
            console.warn('Invalid date in crypto order:', order);
          }
        }
      });
      
      // Format the last order date safely
      const formatDate = (date: Date | null): string | undefined => {
        if (!date) return undefined;
        try {
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.warn('Error formatting date:', e);
          return undefined;
        }
      };

      return {
        actualTotalSpent: totalSpent,
        actualOrderCount: orderCount,
        lastOrderDate: formatDate(lastOrderDate)
      };
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      return {
        actualTotalSpent: 0,
        actualOrderCount: 0,
        lastOrderDate: undefined
      };
    }
  };
  
  // Fetch customers from Firebase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setLoadingOrders(true);
        const usersData = await getAllUsers();
        
        // Transform Firebase user data to Customer interface
        const transformedCustomers: Customer[] = usersData.map(user => ({
          id: user.uid,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Unknown',
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || 'N/A',
          country: user.country || 'Unknown',
          joinDate: user.createdAt.toDate().toISOString().split('T')[0], // Format as YYYY-MM-DD
          totalSpent: user.totalSpent || 0,
          orderCount: user.orderCount || 0,
          lastOrderDate: user.lastOrderDate ? user.lastOrderDate.toDate().toISOString().split('T')[0] : undefined,
          status: user.status || 'inactive',
          notes: user.notes || '',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          actualTotalSpent: 0,
          actualOrderCount: 0
        }));
        
        setCustomers(transformedCustomers);
        
        // Fetch actual orders data for each customer
        const customersWithOrders = await Promise.all(
          transformedCustomers.map(async (customer) => {
            const orderData = await fetchCustomerOrders(customer.email);
            return {
              ...customer,
              ...orderData
            };
          })
        );
        
        setCustomers(customersWithOrders);
        setLoadingOrders(false);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setLoadingOrders(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomers();
  }, []);
  
  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => 
      (statusFilter === 'all' || customer.status === statusFilter) &&
      isWithinJoinDateRange(customer, joinDatePreset, customStartDate, customEndDate) &&
      (
        (customer.displayName && customer.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
    .sort((a, b) => {
      switch(sortBy) {
        case 'newest':
          return getCustomerJoinTime(b) - getCustomerJoinTime(a);
        case 'oldest':
          return getCustomerJoinTime(a) - getCustomerJoinTime(b);
        case 'highest-spend':
          return (b.actualTotalSpent || 0) - (a.actualTotalSpent || 0);
        case 'most-orders':
          return (b.actualOrderCount || 0) - (a.actualOrderCount || 0);
        case 'name-az':
          return (a.displayName || '').localeCompare(b.displayName || '');
        case 'name-za':
          return (b.displayName || '').localeCompare(a.displayName || '');
        default:
          return 0;
      }
    });

  // Pagination calculations
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, itemsPerPage, joinDatePreset, customStartDate, customEndDate]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
    setIsEditingCustomer(false);
    setCustomerMessage(null);
    setNotesStatus('idle');
  };
  
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setIsEditingCustomer(false);
    setTimeout(() => setSelectedCustomer(null), 200);
  };

  const handleStatusChange = async (customerId: string, newStatus: 'active' | 'inactive') => {
    try {
      await updateUser(customerId, { status: newStatus });
      
      setCustomers(customers.map(customer => 
        customer.id === customerId ? { ...customer, status: newStatus } : customer
      ));
      
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer({ ...selectedCustomer, status: newStatus });
      }
      setCustomerMessage(null);
    } catch (error) {
      console.error('Error updating customer status:', error);
      setCustomerMessage('Failed to update customer status.');
    }
  };

  const handleUpdateNotes = async (customerId: string, notes: string) => {
    setNotesStatus('saving');
    try {
      await updateUser(customerId, { notes });
      
      setCustomers(customers.map(customer => 
        customer.id === customerId ? { ...customer, notes } : customer
      ));
      
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer({ ...selectedCustomer, notes });
      }
      setNotesStatus('saved');
    } catch (error) {
      console.error('Error updating customer notes:', error);
      setNotesStatus('error');
    }
  };

  const startEditingCustomer = () => {
    if (!selectedCustomer) return;
    setEditForm({
      firstName: selectedCustomer.firstName || '',
      lastName: selectedCustomer.lastName || '',
      phone: selectedCustomer.phone || '',
      country: selectedCustomer.country || '',
    });
    setIsEditingCustomer(true);
    setCustomerMessage(null);
  };

  const saveCustomerEdits = async () => {
    if (!selectedCustomer) return;
    setSavingCustomer(true);
    setCustomerMessage(null);
    try {
      const firstName = editForm.firstName.trim();
      const lastName = editForm.lastName.trim();
      const updates = {
        firstName,
        lastName,
        phone: editForm.phone.trim(),
        country: editForm.country.trim(),
        displayName: `${firstName} ${lastName}`.trim() || selectedCustomer.displayName || selectedCustomer.email,
      };
      await updateUser(selectedCustomer.id, updates);
      const nextCustomer = { ...selectedCustomer, ...updates };
      setSelectedCustomer(nextCustomer);
      setCustomers((current) => current.map((customer) => (
        customer.id === selectedCustomer.id ? { ...customer, ...updates } : customer
      )));
      setIsEditingCustomer(false);
      setCustomerMessage('Customer details saved.');
    } catch (error) {
      console.error('Error saving customer:', error);
      setCustomerMessage('Failed to save customer changes.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleExportCustomers = () => {
    const seenEmails = new Set<string>();
    const rows: string[] = [];

    for (const customer of filteredCustomers) {
      const rawEmail = (customer.email || '').trim();
      const emailKey = rawEmail.toLowerCase();
      if (!isValidEmail(emailKey) || seenEmails.has(emailKey)) continue;
      seenEmails.add(emailKey);

      const { first_name, last_name } = getExportNames(customer);
      rows.push([escapeCsvField(rawEmail), escapeCsvField(first_name), escapeCsvField(last_name)].join(','));
    }

    if (rows.length === 0) {
      return;
    }

    // SendGrid Marketing Campaigns: unquoted reserved headers, comma-delimited, CRLF, UTF-8
    const csvContent = ['email,first_name,last_name', ...rows].join('\r\n') + '\r\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    const rangeStamp = joinDatePreset === 'custom'
      ? `custom-${customStartDate || 'start'}-to-${customEndDate || 'end'}`
      : joinDatePreset;

    link.href = url;
    link.download = `shockwave-customers-${rangeStamp}-${dateStamp}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Customers</h1>
        <button
          onClick={handleExportCustomers}
          disabled={filteredCustomers.length === 0}
          className="flex items-center gap-2 bg-[#0FF1CE] text-black px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors text-sm w-full sm:w-auto justify-center sm:justify-start disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          <span>Export CSV{filteredCustomers.length > 0 ? ` (${filteredCustomers.length})` : ''}</span>
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-3 mb-4 md:mb-6">
        <div className="relative w-full md:flex-grow md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
          />
        </div>
        <div className="grid grid-cols-2 md:contents gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 md:px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="relative">
            <select
              value={joinDatePreset}
              onChange={(e) => setJoinDatePreset(e.target.value as JoinDatePreset)}
              className="appearance-none w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 md:px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="all">Joined: All Time</option>
              <option value="24h">Joined: Last 24 Hours</option>
              <option value="48h">Joined: Last 48 Hours</option>
              <option value="7d">Joined: Last 7 Days</option>
              <option value="30d">Joined: Last 30 Days</option>
              <option value="custom">Joined: Custom Dates</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <Calendar size={14} />
            </div>
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 md:px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest-spend">Top Spend</option>
              <option value="most-orders">Most Orders</option>
              <option value="name-az">A-Z</option>
              <option value="name-za">Z-A</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="relative">
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="appearance-none w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 md:px-4 py-2.5 pr-8 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value={25}>25/page</option>
              <option value={50}>50/page</option>
              <option value={100}>100/page</option>
              <option value={200}>200/page</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
        {joinDatePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center">
            <div className="flex flex-col gap-1">
              <label htmlFor="join-start-date" className="text-xs text-gray-400">From</label>
              <input
                id="join-start-date"
                type="date"
                value={customStartDate}
                max={customEndDate || undefined}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="join-end-date" className="text-xs text-gray-400">To</label>
              <input
                id="join-end-date"
                type="date"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Customers List */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="h-8 w-8 text-[#0FF1CE] animate-spin" />
            <span className="ml-4 text-gray-400">Loading customers...</span>
          </div>
        ) : (
          <>
          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-[#2F2F2F]/50">
            {paginatedCustomers.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500">
                <User className="mx-auto mb-2" size={24} />
                <p>No customers found</p>
              </div>
            ) : paginatedCustomers.map((customer) => (
              <div key={customer.id} className="px-4 py-3 hover:bg-[#151515]/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE] flex-shrink-0">
                      <User size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white text-sm truncate">{customer.displayName}</div>
                      <div className="text-gray-400 text-xs truncate">{customer.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      customer.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${customer.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {customer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => handleViewDetails(customer)} className="p-1.5 rounded hover:bg-[#2F2F2F] transition-colors">
                      <Eye size={15} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-12">
                  <div className="text-xs text-gray-400"><span className="text-white font-medium">{customer.actualOrderCount ?? 0}</span> orders</div>
                  <div className="text-xs text-gray-400"><span className="text-white font-medium">${(customer.actualTotalSpent ?? 0).toLocaleString()}</span> spent</div>
                  <div className="text-xs text-gray-500">{customer.country}</div>
                  <div className="text-xs text-gray-500">Joined {formatJoinDate(customer)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-[#2F2F2F]">
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium">
                  Orders
                  {loadingOrders && <Loader className="inline ml-2 h-3 w-3 animate-spin" />}
                </th>
                <th className="px-6 py-4 font-medium">
                  Total Spent
                  {loadingOrders && <Loader className="inline ml-2 h-3 w-3 animate-spin" />}
                </th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Order</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="border-b border-[#2F2F2F] last:border-b-0 text-white hover:bg-[#151515] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE]">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="font-medium">{customer.displayName}</div>
                        <div className="text-gray-400 text-sm">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{formatJoinDate(customer)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{customer.actualOrderCount ?? 0}</div>
                    <div className="text-gray-400 text-sm">orders</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">${(customer.actualTotalSpent ?? 0).toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">total</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.status === 'active' 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {customer.status === 'active' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                          Active
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'No orders'}</div>
                    <div className="text-gray-400 text-sm">{customer.country}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(customer)}
                        className="p-1.5 rounded hover:bg-[#2F2F2F] transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} className="text-gray-400 hover:text-white" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-[#2F2F2F] transition-colors"
                        title="Send Email"
                      >
                        <Mail size={16} className="text-gray-400 hover:text-white" />
                      </button>
                      <div className="relative">
                        <button
                          className="p-1.5 rounded hover:bg-[#2F2F2F] transition-colors"
                          title="More Actions"
                        >
                          <MoreHorizontal size={16} className="text-gray-400 hover:text-white" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              
              {paginatedCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <User className="mx-auto mb-2" size={24} />
                    <p>No customers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          </>
        )}
        
        {/* Pagination Controls */}
        {!loading && paginatedCustomers.length > 0 && (
          <div className="px-4 md:px-6 py-4 border-t border-[#2F2F2F] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs md:text-sm text-gray-400">
              Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-[#151515] border border-[#2F2F2F] text-gray-400 hover:text-white hover:border-[#0FF1CE]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-2 text-gray-400">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-[#0FF1CE] text-black'
                            : 'bg-[#151515] border border-[#2F2F2F] text-gray-400 hover:text-white hover:border-[#0FF1CE]/50'
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-[#151515] border border-[#2F2F2F] text-gray-400 hover:text-white hover:border-[#0FF1CE]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Customer Details Slide-in Panel */}
      {selectedCustomer && (
        <div className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity ${isDetailsOpen ? 'opacity-100' : 'opacity-0'}`}>
          <div 
            className={`absolute right-0 top-0 h-full bg-[#0D0D0D] border-l border-[#2F2F2F] w-full max-w-2xl transform transition-transform duration-300 ${isDetailsOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex items-center justify-between border-b border-[#2F2F2F] p-6">
              <h2 className="text-xl font-bold text-white">Customer Details</h2>
              <button 
                onClick={handleCloseDetails}
                className="p-1.5 rounded-lg hover:bg-[#151515] text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 h-[calc(100vh-73px)] overflow-y-auto">
              {/* Customer Info Card */}
              <div className="bg-[#151515] rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center text-[#0FF1CE]">
                    <User size={32} />
                  </div>
                  <div className="flex-grow">
                    {isEditingCustomer ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={editForm.firstName}
                          onChange={(e) => setEditForm((current) => ({ ...current, firstName: e.target.value }))}
                          placeholder="First name"
                          className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                        <input
                          value={editForm.lastName}
                          onChange={(e) => setEditForm((current) => ({ ...current, lastName: e.target.value }))}
                          placeholder="Last name"
                          className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                      </div>
                    ) : (
                      <h3 className="text-xl font-semibold text-white">{selectedCustomer.displayName}</h3>
                    )}
                    <p className="text-gray-400">{selectedCustomer.email}</p>
                  </div>
                  
                  <div className="ml-auto">
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedCustomer.status}
                        onChange={(e) => handleStatusChange(selectedCustomer.id, e.target.value as 'active' | 'inactive')}
                        className={`appearance-none rounded-full px-3 py-1 text-xs font-medium ${
                          selectedCustomer.status === 'active' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Phone</div>
                    {isEditingCustomer ? (
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((current) => ({ ...current, phone: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                      />
                    ) : (
                      <div className="text-white">{selectedCustomer.phone || 'Not provided'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Country</div>
                    {isEditingCustomer ? (
                      <input
                        value={editForm.country}
                        onChange={(e) => setEditForm((current) => ({ ...current, country: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
                      />
                    ) : (
                      <div className="text-white">{selectedCustomer.country || 'Not provided'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Join Date</div>
                    <div className="text-white">{formatJoinDate(selectedCustomer)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Last Login</div>
                    <div className="text-white">{selectedCustomer.lastLoginAt ? selectedCustomer.lastLoginAt.toDate().toLocaleDateString() : 'Never'}</div>
                  </div>
                </div>
                
                {customerMessage && (
                  <p className={`text-sm mb-3 ${customerMessage.includes('Failed') ? 'text-red-400' : 'text-[#0FF1CE]'}`}>
                    {customerMessage}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/emails?to=${encodeURIComponent(selectedCustomer.email)}`)}
                    className="flex items-center gap-2 bg-[#0FF1CE] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors"
                  >
                    <Mail size={16} />
                    <span>Send Email</span>
                  </button>
                  {isEditingCustomer ? (
                    <>
                      <button
                        type="button"
                        onClick={saveCustomerEdits}
                        disabled={savingCustomer}
                        className="flex items-center gap-2 bg-[#151515] border border-[#0FF1CE]/40 text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2F2F2F] transition-colors disabled:opacity-50"
                      >
                        <span>{savingCustomer ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingCustomer(false)}
                        className="flex items-center gap-2 bg-[#151515] border border-[#2F2F2F] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2F2F2F] transition-colors"
                      >
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startEditingCustomer}
                      className="flex items-center gap-2 bg-[#151515] border border-[#2F2F2F] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2F2F2F] transition-colors"
                    >
                      <Edit size={16} />
                      <span>Edit Customer</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Customer Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#151515] rounded-xl p-5">
                  <div className="text-sm text-gray-400 mb-1">Total Spent</div>
                  <div className="text-2xl font-semibold text-white">${(selectedCustomer.actualTotalSpent ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-[#151515] rounded-xl p-5">
                  <div className="text-sm text-gray-400 mb-1">Orders</div>
                  <div className="text-2xl font-semibold text-white">{selectedCustomer.actualOrderCount ?? 0}</div>
                </div>
                <div className="bg-[#151515] rounded-xl p-5">
                  <div className="text-sm text-gray-400 mb-1">Avg. Order Value</div>
                  <div className="text-2xl font-semibold text-white">
                    ${selectedCustomer.actualOrderCount && selectedCustomer.actualOrderCount > 0 ? Math.round((selectedCustomer.actualTotalSpent || 0) / selectedCustomer.actualOrderCount).toLocaleString() : 0}
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div className="bg-[#151515] rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                <textarea
                  value={selectedCustomer.notes || ''}
                  onChange={(e) => {
                    // Update local state temporarily
                    setSelectedCustomer({
                      ...selectedCustomer,
                      notes: e.target.value
                    });
                  }}
                  onBlur={() => {
                    // Save to Firebase when focus is lost
                    if (selectedCustomer) {
                      handleUpdateNotes(selectedCustomer.id, selectedCustomer.notes || '');
                    }
                  }}
                  className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg p-3 text-white min-h-24 resize-none focus:outline-none focus:border-[#0FF1CE]/50"
                  placeholder="Add notes about this customer..."
                />
                <p className={`text-xs mt-2 ${notesStatus === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                  {notesStatus === 'saving' && 'Saving notes...'}
                  {notesStatus === 'saved' && 'Notes saved.'}
                  {notesStatus === 'error' && 'Failed to save notes.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 