'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart2, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  ArrowUp, 
  ArrowDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Bitcoin
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDistanceToNow } from 'date-fns';

// Status styles
const statusStyles = {
  completed: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
  pending: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  processing: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Loader2 },
  failed: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
  cancelled: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle },
  unknown: { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle }
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, change, changeType, isLoading }: { 
  title: string; 
  value: string; 
  icon: React.ElementType;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}) => (
  <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6 hover:border-[#0FF1CE]/30 transition-all">
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-gray-400 text-xs md:text-sm truncate">{title}</p>
        {isLoading ? (
          <div className="h-7 md:h-8 w-20 md:w-24 bg-white/10 animate-pulse rounded mt-1"></div>
        ) : (
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1 truncate">{value}</h3>
        )}
        
        {change && !isLoading && (
          <div className={`flex items-center mt-1.5 text-xs font-medium ${
            changeType === 'up' ? 'text-green-500' : 
            changeType === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {changeType === 'up' ? (
              <ArrowUp size={11} className="mr-1 flex-shrink-0" />
            ) : changeType === 'down' ? (
              <ArrowDown size={11} className="mr-1 flex-shrink-0" />
            ) : null}
            <span className="truncate">{change}</span>
          </div>
        )}
      </div>
      
      <div className="p-2.5 md:p-3 rounded-lg bg-[#0FF1CE]/10 text-[#0FF1CE] ml-3 flex-shrink-0">
        <Icon size={18} />
      </div>
    </div>
  </div>
);

interface CardOrder {
  id: string;
  customerEmail: string;
  firstName: string;
  lastName: string;
  challengeType: string;
  challengeAmount: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Timestamp;
  orderType: 'card';
}

interface CryptoOrder {
  id: string;
  customerEmail: string;
  customerName: string;
  challengeType: string;
  challengeAmount: string;
  usdAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  challengeStatus?: 'IN_PROGRESS' | 'FAILED' | 'PASSED';
  cryptoType: string;
  cryptoAmount: string;
  cryptoAddress: string;
  platform: string;
  createdAt: string;
  orderType: 'crypto';
}

type UnifiedOrder = (CardOrder | CryptoOrder) & {
  displayName: string;
  displayAmount: number;
  displayStatus: string;
  displayDate: any;
};

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  avgOrderValue: number;
  cardOrders: number;
  cryptoOrders: number;
  cardRevenue: number;
  cryptoRevenue: number;
  monthlyGrowth: {
    orders: number;
    revenue: number;
    customers: number;
    avgOrder: number;
  };
  challengeTypes: {
    [key: string]: number;
  };
  challengeStatuses: {
    passed: number;
    failed: number;
    inProgress: number;
  };
}

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<UnifiedOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    cardOrders: 0,
    cryptoOrders: 0,
    cardRevenue: 0,
    cryptoRevenue: 0,
    monthlyGrowth: {
      orders: 0,
      revenue: 0,
      customers: 0,
      avgOrder: 0
    },
    challengeTypes: {},
    challengeStatuses: {
      passed: 0,
      failed: 0,
      inProgress: 0
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      // Get the date ranges for comparison
      const now = new Date();
      const timeRangeInDays = parseInt(timeRange);
      const currentPeriodStart = new Date(now.getTime() - (timeRangeInDays * 24 * 60 * 60 * 1000));
      const previousPeriodStart = new Date(currentPeriodStart.getTime() - (timeRangeInDays * 24 * 60 * 60 * 1000));
      
      // Fetch card orders
      const cardOrdersRef = collection(db, 'orders');
      const cardOrdersQuery = query(cardOrdersRef, orderBy('createdAt', 'desc'));
      const cardOrdersSnapshot = await getDocs(cardOrdersQuery);
      const allCardOrders = cardOrdersSnapshot.docs;
      
      // Fetch crypto orders
      const cryptoOrdersRef = collection(db, 'crypto-orders');
      const cryptoOrdersQuery = query(cryptoOrdersRef, orderBy('createdAt', 'desc'));
      const cryptoOrdersSnapshot = await getDocs(cryptoOrdersQuery);
      const allCryptoOrders = cryptoOrdersSnapshot.docs;
      
      const cardOrderDate = (orderDoc: (typeof allCardOrders)[number]) => {
        try {
          const createdAt = orderDoc.data().createdAt;
          return createdAt?.toDate ? createdAt.toDate() : null;
        } catch {
          return null;
        }
      };
      const cryptoOrderDate = (orderDoc: (typeof allCryptoOrders)[number]) => {
        const createdAt = orderDoc.data().createdAt;
        if (!createdAt) return null;
        const orderDate = new Date(createdAt);
        return Number.isNaN(orderDate.getTime()) ? null : orderDate;
      };

      // Filter card orders by period
      const currentPeriodCardOrders = allCardOrders.filter(orderDoc => {
        const orderDate = cardOrderDate(orderDoc);
        return orderDate && orderDate >= currentPeriodStart && orderDate <= now;
      });
      
      const previousPeriodCardOrders = allCardOrders.filter(orderDoc => {
        const orderDate = cardOrderDate(orderDoc);
        return orderDate && orderDate >= previousPeriodStart && orderDate < currentPeriodStart;
      });
      
      // Filter crypto orders by period
      const currentPeriodCryptoOrders = allCryptoOrders.filter(orderDoc => {
        const orderDate = cryptoOrderDate(orderDoc);
        return orderDate && orderDate >= currentPeriodStart && orderDate <= now;
      });
      
      const previousPeriodCryptoOrders = allCryptoOrders.filter(orderDoc => {
        const orderDate = cryptoOrderDate(orderDoc);
        return orderDate && orderDate >= previousPeriodStart && orderDate < currentPeriodStart;
      });
      
      // Calculate current period stats
      const currentCardCustomers = new Set(currentPeriodCardOrders.map(doc => doc.data().customerEmail));
      const currentCryptoCustomers = new Set(currentPeriodCryptoOrders.map(doc => doc.data().customerEmail));
      const currentCustomers = new Set([...Array.from(currentCardCustomers), ...Array.from(currentCryptoCustomers)]);
      
      const currentCardRevenue = currentPeriodCardOrders.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
      const currentCryptoRevenue = currentPeriodCryptoOrders.reduce((sum, doc) => sum + (doc.data().usdAmount || 0), 0);
      const currentRevenue = currentCardRevenue + currentCryptoRevenue;
      
      const currentTotalOrders = currentPeriodCardOrders.length + currentPeriodCryptoOrders.length;
      const currentAvgOrder = currentTotalOrders > 0 ? currentRevenue / currentTotalOrders : 0;
      
      // Calculate previous period stats
      const previousCardCustomers = new Set(previousPeriodCardOrders.map(doc => doc.data().customerEmail));
      const previousCryptoCustomers = new Set(previousPeriodCryptoOrders.map(doc => doc.data().customerEmail));
      const previousCustomers = new Set([...Array.from(previousCardCustomers), ...Array.from(previousCryptoCustomers)]);
      
      const previousCardRevenue = previousPeriodCardOrders.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
      const previousCryptoRevenue = previousPeriodCryptoOrders.reduce((sum, doc) => sum + (doc.data().usdAmount || 0), 0);
      const previousRevenue = previousCardRevenue + previousCryptoRevenue;
      
      const previousTotalOrders = previousPeriodCardOrders.length + previousPeriodCryptoOrders.length;
      const previousAvgOrder = previousTotalOrders > 0 ? previousRevenue / previousTotalOrders : 0;
      
      // Calculate growth percentages
      const calculateGrowth = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };
      
      const monthlyGrowth = {
        orders: calculateGrowth(currentTotalOrders, previousTotalOrders),
        revenue: calculateGrowth(currentRevenue, previousRevenue),
        customers: calculateGrowth(currentCustomers.size, previousCustomers.size),
        avgOrder: calculateGrowth(currentAvgOrder, previousAvgOrder)
      };
      
      // Combine and get recent orders (last 10 combined)
      const recentCardOrders = allCardOrders.slice(0, 10).map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderType: 'card' as const,
        displayName: `${doc.data().firstName} ${doc.data().lastName}`,
        displayAmount: doc.data().totalAmount,
        displayStatus: doc.data().paymentStatus,
        displayDate: doc.data().createdAt
      })) as UnifiedOrder[];
      
      const recentCryptoOrdersList = allCryptoOrders.slice(0, 10).map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderType: 'crypto' as const,
        displayName: doc.data().customerName,
        displayAmount: doc.data().usdAmount,
        displayStatus: (doc.data().status || 'unknown').toString().toLowerCase(),
        displayDate: doc.data().createdAt
      })) as UnifiedOrder[];
      
      // Combine and sort by date
      const combinedOrders = [...recentCardOrders, ...recentCryptoOrdersList].sort((a, b) => {
        const toTime = (order: UnifiedOrder) => {
          try {
            if (order.orderType === 'card') {
              const createdAt = (order as CardOrder).createdAt;
              return createdAt?.toDate ? createdAt.toDate().getTime() : 0;
            }
            const createdAt = new Date((order as CryptoOrder).createdAt);
            return Number.isNaN(createdAt.getTime()) ? 0 : createdAt.getTime();
          } catch {
            return 0;
          }
        };
        return toTime(b) - toTime(a);
      }).slice(0, 10);
      
      setRecentOrders(combinedOrders);
      
      // Calculate challenge type distribution (from both sources)
      const challengeTypes: { [key: string]: number } = {};
      currentPeriodCardOrders.forEach(doc => {
        const type = doc.data().challengeType;
        challengeTypes[type] = (challengeTypes[type] || 0) + 1;
      });
      currentPeriodCryptoOrders.forEach(doc => {
        const type = doc.data().challengeType;
        challengeTypes[type] = (challengeTypes[type] || 0) + 1;
      });
      
      const cardStatus = (orderDoc: (typeof currentPeriodCardOrders)[number]) => orderDoc.data().challengeStatus;
      // Calculate challenge statuses from both card and crypto orders
      const challengeStatuses = {
        passed:
          currentPeriodCryptoOrders.filter(orderDoc => orderDoc.data().challengeStatus === 'PASSED').length +
          currentPeriodCardOrders.filter(orderDoc => {
            const status = cardStatus(orderDoc);
            return status === 'passed' || status === 'funded';
          }).length,
        failed:
          currentPeriodCryptoOrders.filter(orderDoc => orderDoc.data().challengeStatus === 'FAILED').length +
          currentPeriodCardOrders.filter(orderDoc => cardStatus(orderDoc) === 'failed').length,
        inProgress:
          currentPeriodCryptoOrders.filter(orderDoc => orderDoc.data().challengeStatus === 'IN_PROGRESS').length +
          currentPeriodCardOrders.filter(orderDoc => {
            const status = cardStatus(orderDoc);
            return status === 'in progress' || status === 'pending';
          }).length
      };
      
      // Update stats
      setStats({
        totalOrders: currentTotalOrders,
        totalRevenue: currentRevenue,
        totalCustomers: currentCustomers.size,
        avgOrderValue: currentAvgOrder,
        cardOrders: currentPeriodCardOrders.length,
        cryptoOrders: currentPeriodCryptoOrders.length,
        cardRevenue: currentCardRevenue,
        cryptoRevenue: currentCryptoRevenue,
        monthlyGrowth,
        challengeTypes,
        challengeStatuses
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoadError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatMoney = (amount: unknown) => {
    const value = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(value)) return '—';
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (date: any) => {
    try {
      if (date?.toDate) {
        // Firestore Timestamp
        return formatDistanceToNow(date.toDate(), { addSuffix: true });
      } else if (typeof date === 'string') {
        // ISO string
        return formatDistanceToNow(new Date(date), { addSuffix: true });
      }
      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
        <select 
          className="bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50 w-full sm:w-auto"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
          <option value="365">Last 12 months</option>
        </select>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-red-400 text-sm">{loadError}</span>
          <button
            onClick={fetchDashboardData}
            className="text-sm text-[#0FF1CE] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders.toLocaleString()} 
          icon={ShoppingCart} 
          change={`${stats.monthlyGrowth.orders >= 0 ? '+' : ''}${stats.monthlyGrowth.orders.toFixed(1)}% vs prior period`}
          changeType={stats.monthlyGrowth.orders >= 0 ? "up" : "down"}
          isLoading={isLoading}
        />
        <StatCard 
          title="Total Revenue" 
          value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          change={`${stats.monthlyGrowth.revenue >= 0 ? '+' : ''}${stats.monthlyGrowth.revenue.toFixed(1)}% vs prior period`}
          changeType={stats.monthlyGrowth.revenue >= 0 ? "up" : "down"}
          isLoading={isLoading}
        />
        <StatCard 
          title="Customers" 
          value={stats.totalCustomers.toLocaleString()} 
          icon={Users} 
          change={`${stats.monthlyGrowth.customers >= 0 ? '+' : ''}${stats.monthlyGrowth.customers.toFixed(1)}% vs prior period`}
          changeType={stats.monthlyGrowth.customers >= 0 ? "up" : "down"}
          isLoading={isLoading}
        />
        <StatCard 
          title="Avg. Order Value" 
          value={`$${stats.avgOrderValue.toFixed(2)}`} 
          icon={BarChart2} 
          change={`${stats.monthlyGrowth.avgOrder >= 0 ? '+' : ''}${stats.monthlyGrowth.avgOrder.toFixed(1)}% vs prior period`}
          changeType={stats.monthlyGrowth.avgOrder >= 0 ? "up" : "down"}
          isLoading={isLoading}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Card Orders', value: stats.cardOrders, tone: 'bg-blue-500/10 text-blue-400', Icon: ShoppingCart, textColor: 'text-white' },
          { label: 'Crypto', value: stats.cryptoOrders, tone: 'bg-orange-500/10 text-orange-400', Icon: Bitcoin, textColor: 'text-white' },
          { label: 'Passed', value: stats.challengeStatuses.passed, tone: 'bg-green-500/10 text-green-400', Icon: CheckCircle, textColor: 'text-green-400' },
          { label: 'Failed', value: stats.challengeStatuses.failed, tone: 'bg-red-500/10 text-red-400', Icon: AlertCircle, textColor: 'text-red-400' },
          { label: 'In Progress', value: stats.challengeStatuses.inProgress, tone: 'bg-yellow-500/10 text-yellow-400', Icon: Clock, textColor: 'text-yellow-400' },
        ].map(({ label, value, tone, Icon, textColor }) => (
          <div key={label} className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-2.5 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
              <div className="min-w-0">
                <p className="text-gray-400 text-[10px] md:text-xs truncate">{label}</p>
                {isLoading ? (
                  <div className="h-5 md:h-6 w-10 md:w-16 bg-white/10 animate-pulse rounded mt-1"></div>
                ) : (
                  <h4 className={`text-lg md:text-xl font-bold mt-0.5 ${textColor}`}>{value}</h4>
                )}
              </div>
              <div className={`p-1.5 md:p-2 rounded-lg ${tone} self-end md:self-auto`}>
                <Icon size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Revenue Overview */}
        <div className="lg:col-span-2 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-semibold text-white">Revenue & Orders Overview</h2>
          </div>
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#151515]/50 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Card Revenue</div>
                  <div className="text-xl font-bold text-blue-400">
                    ${stats.cardRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.cardOrders} orders
                  </div>
                </div>
                <div className="bg-[#151515]/50 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Crypto Revenue</div>
                  <div className="text-xl font-bold text-orange-400">
                    ${stats.cryptoRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.cryptoOrders} orders
                  </div>
                </div>
              </div>

              {/* Order Type Distribution */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Order Type Distribution</div>
                <div className="flex gap-2 h-8 rounded-lg overflow-hidden bg-[#2F2F2F]/40">
                  {stats.totalOrders === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-500">No orders in this period</div>
                  ) : (
                    <>
                      {stats.cardOrders > 0 && (
                        <div 
                          className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${(stats.cardOrders / stats.totalOrders) * 100}%` }}
                        >
                          {`${((stats.cardOrders / stats.totalOrders) * 100).toFixed(0)}%`}
                        </div>
                      )}
                      {stats.cryptoOrders > 0 && (
                        <div 
                          className="bg-orange-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${(stats.cryptoOrders / stats.totalOrders) * 100}%` }}
                        >
                          {`${((stats.cryptoOrders / stats.totalOrders) * 100).toFixed(0)}%`}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-gray-400">Card Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-gray-400">Crypto Orders</span>
                  </div>
                </div>
              </div>

              {/* Challenge Status Overview */}
              <div>
                <div className="text-sm text-gray-400 mb-2">Challenge Progress</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.challengeStatuses.passed}</div>
                    <div className="text-xs text-gray-400 mt-1">Passed</div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stats.challengeStatuses.inProgress}</div>
                    <div className="text-xs text-gray-400 mt-1">In Progress</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">{stats.challengeStatuses.failed}</div>
                    <div className="text-xs text-gray-400 mt-1">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Challenge Types Breakdown */}
        <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-semibold text-white">Challenge Types</h2>
          </div>
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
            </div>
          ) : Object.keys(stats.challengeTypes).length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No challenge data for this period
            </div>
          ) : (
            <>
              {/* Simple bar chart representation */}
              <div className="space-y-4 mb-6">
                {Object.entries(stats.challengeTypes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                  const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0';
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">{type}</span>
                        <span className="text-sm text-white font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-[#2F2F2F]/50 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-[#0FF1CE] to-[#0FF1CE]/60 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="pt-4 border-t border-[#2F2F2F]/50">
                <div className="space-y-2">
                  {Object.entries(stats.challengeTypes)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([type, count], index) => {
                    const colors = ['bg-[#0FF1CE]', 'bg-cyan-400', 'bg-teal-400', 'bg-blue-400', 'bg-indigo-400'];
                    const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0';
                    return (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-2`}></div>
                          <span className="text-gray-400">{type}</span>
                        </div>
                        <span className="text-white font-medium">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
          <h2 className="text-base md:text-lg font-semibold text-white">Recent Orders</h2>
          <div className="flex gap-3">
            <Link 
              href="/admin/orders"
              className="text-[#0FF1CE] hover:underline text-xs md:text-sm"
            >
              Card Orders
            </Link>
            <span className="text-gray-600">|</span>
            <Link 
              href="/admin/crypto-orders"
              className="text-[#0FF1CE] hover:underline text-xs md:text-sm"
            >
              Crypto Orders
            </Link>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            No orders found
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-2">
              {recentOrders.map((order) => {
                const statusKey = order.displayStatus as keyof typeof statusStyles;
                const Status = statusStyles[statusKey]?.icon || statusStyles.unknown.icon;
                const isCrypto = order.orderType === 'crypto';
                return (
                  <div key={`${order.orderType}-${order.id}`} className="bg-[#151515]/60 rounded-lg p-3 border border-[#2F2F2F]/40">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isCrypto ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {isCrypto ? <Bitcoin size={10} className="mr-1" /> : <ShoppingCart size={10} className="mr-1" />}
                          {isCrypto ? 'Crypto' : 'Card'}
                        </div>
                        <Link href={`/admin/${isCrypto ? 'crypto-orders' : 'orders'}?q=${order.id}`} className="text-white text-xs font-mono hover:text-[#0FF1CE]">#{order.id.slice(0, 8)}</Link>
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[statusKey]?.bg || statusStyles.unknown.bg} ${statusStyles[statusKey]?.color || statusStyles.unknown.color}`}>
                        <Status size={10} className="mr-1" />
                        <span className="capitalize">{order.displayStatus}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{order.displayName}</div>
                        <div className="text-gray-500 text-xs">{order.challengeType} · {order.challengeAmount}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#0FF1CE] text-sm font-semibold">{formatMoney(order.displayAmount)}</div>
                        <div className="text-gray-500 text-xs">{formatDate(order.displayDate)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#2F2F2F]">
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order Type</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Challenge Type</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account Size</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2F2F2F]">
                  {recentOrders.map((order) => {
                    const statusKey = order.displayStatus as keyof typeof statusStyles;
                    const Status = statusStyles[statusKey]?.icon || statusStyles.unknown.icon;
                    const isCrypto = order.orderType === 'crypto';
                    
                    return (
                      <tr key={`${order.orderType}-${order.id}`} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isCrypto ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {isCrypto ? (
                              <><Bitcoin size={12} className="mr-1" />Crypto</>
                            ) : (
                              <><ShoppingCart size={12} className="mr-1" />Card</>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-white">
                          <Link href={`/admin/${isCrypto ? 'crypto-orders' : 'orders'}?q=${order.id}`} className="hover:text-[#0FF1CE]">
                            #{order.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">
                          {order.displayName}
                          {isCrypto && (
                            <div className="text-xs text-gray-500">{(order as CryptoOrder).customerEmail}</div>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">{order.challengeType}</td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">{order.challengeAmount}</td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">
                          {formatMoney(order.displayAmount)}
                          {isCrypto && (
                            <div className="text-xs text-gray-500">
                              {(order as CryptoOrder).cryptoAmount} {(order as CryptoOrder).cryptoType}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[statusKey]?.bg || statusStyles.unknown.bg} ${statusStyles[statusKey]?.color || statusStyles.unknown.color}`}>
                              <Status size={12} className="mr-1" />
                              <span className="capitalize">{order.displayStatus}</span>
                            </div>
                            {isCrypto && (order as CryptoOrder).challengeStatus && (
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                (order as CryptoOrder).challengeStatus === 'PASSED' ? 'bg-green-400/10 text-green-400' :
                                (order as CryptoOrder).challengeStatus === 'FAILED' ? 'bg-red-400/10 text-red-400' :
                                'bg-yellow-400/10 text-yellow-400'
                              }`}>
                                {(order as CryptoOrder).challengeStatus === 'PASSED' && <CheckCircle size={12} className="mr-1" />}
                                {(order as CryptoOrder).challengeStatus === 'FAILED' && <AlertCircle size={12} className="mr-1" />}
                                {(order as CryptoOrder).challengeStatus === 'IN_PROGRESS' && <Clock size={12} className="mr-1" />}
                                <span className="capitalize">{(order as CryptoOrder).challengeStatus?.replace('_', ' ')}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(order.displayDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 