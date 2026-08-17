'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getUserMetaApiAccount, getCachedMetrics } from '../../../../lib/firebase';
import dynamic from 'next/dynamic';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart2, 
  Target,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Dynamically import ApexCharts to avoid SSR issues
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Define interfaces locally to avoid importing from metaapi-extended
interface TradingObjectives {
  minTradingDays: { target: number; current: number; passed: boolean };
  maxDrawdown: { target: number; current: number; passed: boolean; recentBreach?: boolean };
  // Optional: instant challenges have no daily drawdown objective
  maxDailyDrawdown?: { target: number; current: number; passed: boolean; recentBreach?: boolean };
  profitTarget: { target: number; current: number; passed: boolean };
}

interface TradeData {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  openTime: string;
  closeTime?: string;
  commission: number;
  swap: number;
  state: 'opened' | 'closed';
}

interface EquityChartPoint {
  date: string;
  equity: number;
  balance: number;
}

interface RiskEvent {
  id: string;
  type: string;
  exceededThresholdType: string;
  relativeDrawdown: number;
  absoluteDrawdown: number;
  brokerTime: string;
}

// Metric Card Component
const MetricCard = ({ title, value, icon: Icon, format = 'number', prefix = '', suffix = '' }: {
  title: string;
  value: number | string;
  icon?: React.ElementType;
  format?: 'number' | 'currency' | 'percent' | 'string';
  prefix?: string;
  suffix?: string;
}) => {
  const formatValue = () => {
    if (format === 'string') return value;
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    
    if (format === 'currency') return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (format === 'percent') return `${numValue.toFixed(2)}%`;
    return `${prefix}${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  };

  return (
    <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl border border-[#0FF1CE]/20 p-3 sm:p-4 hover:border-[#0FF1CE]/50 transition-all duration-300" style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs mb-1">{title}</p>
          <p className="text-white text-base sm:text-lg font-semibold break-words">{formatValue()}</p>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-[#0FF1CE]/10 text-[#0FF1CE] flex-shrink-0">
            <Icon size={16} />
          </div>
        )}
      </div>
    </div>
  );
};

// Trading Objectives Table Component
const TradingObjectivesTable = ({ objectives, accountStatus, riskEvents = [] }: {
  objectives: TradingObjectives;
  accountStatus?: string;
  riskEvents?: RiskEvent[];
}) => {
  const isFunded = accountStatus === 'funded';
  const [riskOpen, setRiskOpen] = useState(false);
  
  const rows = [
    { 
      label: isFunded ? 'Min Trading Days (0.5% gain required)' : 'Min Trading Days', 
      target: objectives.minTradingDays.target,
      current: objectives.minTradingDays.current,
      passed: objectives.minTradingDays.passed,
      format: 'days'
    },
    { 
      label: 'Max Drawdown %', 
      target: objectives.maxDrawdown.target,
      current: objectives.maxDrawdown.current,
      passed: objectives.maxDrawdown.passed,
      format: 'percent'
    },
    // Instant challenges have no daily drawdown objective
    ...(objectives.maxDailyDrawdown ? [{
      label: 'Max Daily Drawdown % (Highest Achieved)', 
      target: objectives.maxDailyDrawdown.target,
      current: objectives.maxDailyDrawdown.current,
      passed: objectives.maxDailyDrawdown.passed,
      format: 'percent'
    }] : []),
    { 
      label: 'Profit Target %', 
      target: objectives.profitTarget.target,
      current: objectives.profitTarget.current,
      passed: objectives.profitTarget.passed,
      format: 'percent'
    }
  ];

  const formatTarget = (row: typeof rows[number]) => row.format === 'percent' ? `${row.target}%` : row.target;
  const formatCurrent = (row: typeof rows[number]) => row.format === 'percent' ? `${row.current.toFixed(2)}%` : row.current;

  const hasRecentBreach = objectives.maxDrawdown.recentBreach || objectives.maxDailyDrawdown?.recentBreach;
  const recentRiskEvents = riskEvents.filter(event => {
    const eventTime = new Date(event.brokerTime);
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return eventTime > dayAgo;
  });
  const showRiskAccordion = hasRecentBreach || recentRiskEvents.length > 0;

  return (
    <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Trading Objectives</h3>

      <div className="divide-y divide-[#2F2F2F]/50">
        {rows.map((row, index) => (
          <div key={index} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-gray-300 leading-snug">{row.label}</p>
              {row.passed ? (
                <CheckCircle className="flex-shrink-0 text-green-400" size={18} />
              ) : (
                <XCircle className="flex-shrink-0 text-red-400" size={18} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Target</p>
                <p className="text-sm text-gray-400">{formatTarget(row)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Current</p>
                <p className={`text-sm ${row.passed ? 'text-green-400' : 'text-yellow-400'}`}>{formatCurrent(row)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showRiskAccordion && (
        <div className="mt-4 pt-3 border-t border-[#2F2F2F]/50">
          <button
            type="button"
            onClick={() => setRiskOpen(!riskOpen)}
            className="w-full flex items-center justify-between gap-3 py-1"
            aria-expanded={riskOpen}
          >
            <span className="flex items-center gap-2 text-red-400 font-semibold">
              <AlertTriangle size={18} />
              Risk Alert
            </span>
            <ChevronDown
              size={18}
              className={`text-red-400 transition-transform duration-300 ${riskOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            riskOpen ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
          }`}>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {hasRecentBreach && (
                <p className="text-gray-300 text-sm mb-2">
                  Recent drawdown threshold breach detected. Please review your risk management.
                </p>
              )}
              {recentRiskEvents.length > 0 && (
                <div className="text-sm text-gray-300">
                  <p className="mb-1">Recent risk events:</p>
                  {recentRiskEvents.slice(0, 3).map((event, index) => (
                    <p key={index} className="text-xs text-red-400">
                      • {event.exceededThresholdType}: {event.relativeDrawdown.toFixed(2)}% at {new Date(event.brokerTime).toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TradeRow = ({ trade }: { trade: TradeData }) => (
  <div className="py-3 first:pt-0">
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-sm font-medium text-white">{trade.symbol}</p>
      <p className={`text-sm tabular-nums ${
        trade.profit != null && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
      }`}>
        {trade.profit != null ? `$${trade.profit.toFixed(2)}` : '-'}
      </p>
    </div>
    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-400">
      <p className="truncate">
        <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
          {trade.type?.toUpperCase() || 'N/A'}
        </span>
        <span className="text-gray-600"> · </span>
        <span>{trade.volume != null ? trade.volume.toFixed(2) : '-'}</span>
        <span className="text-gray-600"> · </span>
        <span className="capitalize">{trade.state || 'unknown'}</span>
      </p>
      <p className="flex-shrink-0 text-gray-500">
        {trade.openTime ? formatDistanceToNow(new Date(trade.openTime), { addSuffix: true }) : '-'}
      </p>
    </div>
    <p className="mt-1 text-xs text-gray-500 tabular-nums">
      {trade.openPrice != null ? trade.openPrice.toFixed(5) : '-'}
      <span className="mx-1.5 text-gray-600">→</span>
      {trade.closePrice != null ? trade.closePrice.toFixed(5) : '-'}
    </p>
  </div>
);

// Trading Journal Component with Pagination
const TradingJournal = ({ trades }: { trades: TradeData[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const tradesPerPage = 20;

  const sortedTrades = [...trades].sort((a, b) => {
    const aTime = a.openTime ? new Date(a.openTime).getTime() : 0;
    const bTime = b.openTime ? new Date(b.openTime).getTime() : 0;
    return bTime - aTime;
  });
  
  const totalPages = Math.ceil(sortedTrades.length / tradesPerPage);
  const startIndex = (currentPage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const currentTrades = sortedTrades.slice(startIndex, endIndex);
  const previewDesktop = sortedTrades.slice(0, 2);
  const previewMobile = sortedTrades.slice(0, 4);
  
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 mb-4"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-white">Trading Journal</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {trades.length} {trades.length === 1 ? 'Trade' : 'Trades'} Total
          </span>
          <ChevronDown
            size={20}
            className={`text-[#0FF1CE] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {trades.length === 0 ? (
        <p className="py-8 text-center text-gray-400 text-sm">No trades found</p>
      ) : isOpen ? (
        <div className="divide-y divide-[#2F2F2F]/50">
          {currentTrades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </div>
      ) : (
        <>
          <div className="lg:hidden divide-y divide-[#2F2F2F]/50">
            {previewMobile.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
          <div className="hidden lg:block divide-y divide-[#2F2F2F]/50">
            {previewDesktop.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        </>
      )}
      
      {isOpen && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2F2F2F]/50">
          <p className="text-xs text-gray-500">
            {startIndex + 1}–{Math.min(endIndex, trades.length)} of {trades.length}
          </p>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 bg-[#151515] border border-[#2F2F2F] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black shadow-[0_0_20px_rgba(15,241,206,0.3)]'
                        : 'text-gray-400 bg-[#151515]/50 border border-[#2F2F2F] hover:bg-[#0FF1CE]/10 hover:text-[#0FF1CE]'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 bg-[#151515] border border-[#2F2F2F] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [objectives, setObjectives] = useState<TradingObjectives | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [chartData, setChartData] = useState<EquityChartPoint[]>([]);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [userAccount, setUserAccount] = useState<any>(null);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);

  // Chart configuration
  const chartOptions = {
    chart: {
      type: 'area' as const,
      height: 350,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2 },
    colors: ['#0FF1CE', '#3B82F6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.2,
        opacityTo: 0,
        stops: [0, 100]
      }
    },
    xaxis: {
      type: 'datetime' as const,
      labels: { style: { colors: '#9CA3AF' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#9CA3AF' },
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } }
    },
    legend: {
      show: true,
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      labels: { colors: '#9CA3AF' }
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy' },
      y: { formatter: (value: number) => `$${value.toLocaleString()}` }
    }
  };

  const chartSeries = [
    {
      name: 'Equity',
      data: chartData.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.equity
      }))
    },
    {
      name: 'Balance',
      data: chartData.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.balance
      }))
    }
  ];

  const fetchMetrics = async (showLoading = true) => {
    if (!user) return;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Get the accountId from URL params
      const accountId = params.accountId as string;
      
      // Get user's specific MetaAPI account using the accountId from URL
      const userAccount = await getUserMetaApiAccount(user.uid, accountId);
      if (!userAccount) {
        setError('Account not found or you do not have access to this account.');
        return;
      }

      // Store user account data for display
      setUserAccount(userAccount);

      // Check if account is failed and show notice
      const isFailed = userAccount.status === 'failed';
      const isFunded = userAccount.status === 'funded' || userAccount.step === 3;
      setAccountStatus(isFunded ? 'funded' : userAccount.status);

      // Check if we have recent cached data (less than 30 minutes old)
      const cachedData = await getCachedMetrics(userAccount.accountId);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const cachedLastUpdated = cachedData?.lastUpdated?.toDate ? cachedData.lastUpdated.toDate() : null;
      
      if (cachedData && cachedLastUpdated && cachedLastUpdated > thirtyMinutesAgo && !showLoading) {
        // Use cached data
        setMetrics({
          balance: cachedData.balance,
          equity: cachedData.equity,
          averageWin: cachedData.averageProfit,
          averageLoss: cachedData.averageLoss,
          trades: cachedData.numberOfTrades,
          lots: cachedData.lots,
          expectancy: cachedData.expectancy,
          profitFactor: cachedData.profitFactor,
          maxDrawdown: cachedData.maxDrawdown,
          relativeDrawdown: cachedData.dailyDrawdown,
          wonTrades: Math.round(cachedData.numberOfTrades * (cachedData.winRate / 100)),
          lostTrades: Math.round(cachedData.numberOfTrades * (1 - cachedData.winRate / 100)),
          winRate: cachedData.winRate,
          avgRRR: cachedData.averageRRR
        });
        setLastUpdate(cachedLastUpdated);
        return;
      }

      // Fetch fresh data from MetaAPI via our API route
      const token = await user.getIdToken();
      const response = await fetch('/api/metaapi/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: userAccount.accountId,
          accountToken: userAccount.accountToken,
          accountType: userAccount.accountType,
          accountSize: userAccount.accountSize,
          step: userAccount.step
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle special case for failed accounts with no cached data
        if (errorData.accountStatus === 'failed' && response.status === 404) {
          setError('This challenge has failed. No historical data is available.');
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch metrics');
      }

      const data = await response.json();

      setMetrics(data.metrics);
      setAccountInfo(data.accountInfo);
      setTrades(data.trades);
      setChartData(data.equityChart);
      setObjectives(data.objectives);
      setRiskEvents(data.riskEvents);

      // Note: the metrics API route already caches the full result server-side.
      // The previous client-side cache write here overwrote that document with a
      // partial subset (wiping trades/equity chart/objectives) and crashed for
      // instant accounts (no maxDailyDrawdown objective), so it was removed.

      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.message || 'Failed to fetch account metrics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && params.accountId) {
      fetchMetrics();
    }
  }, [user, params.accountId]);

  // Separate effect for auto-refresh
  useEffect(() => {
    if (user && accountStatus !== 'failed') {
      // Set up auto-refresh every 30 minutes (only for non-failed accounts)
      const interval = setInterval(() => {
        fetchMetrics(false);
      }, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user, accountStatus]);

  if (!user) {
    router.push('/signin');
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-red-500/30 p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white text-center mb-2">Error Loading Metrics</h2>
          <p className="text-gray-400 text-center mb-4">{error}</p>
          <button
            onClick={() => fetchMetrics()}
            className="w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-semibold py-2 px-4 rounded-lg hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const winRate = metrics?.winRate || 0;
  const avgRRR = metrics?.avgRRR || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">Account Metrics</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-1">
              Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      {/* Failed Account Notice */}
      {accountStatus === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">Challenge Failed</h3>
              <p className="text-gray-300 text-sm">
                This challenge has been marked as failed. The data shown below represents the final state of your account.
                No new updates will be fetched.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Funded Account Notice */}
      {accountStatus === 'funded' && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-purple-400 mt-0.5" size={20} />
            <div>
              <h3 className="text-purple-400 font-semibold mb-1">Funded Account Active</h3>
              <p className="text-gray-300 text-sm">
                Congratulations! Your account is now funded. Remember to maintain proper risk management:
              </p>
              <ul className="text-gray-300 text-sm mt-2 list-disc list-inside">
                <li>Maximum drawdown: 15%</li>
                <li>Daily drawdown: 8%</li>
                <li>Risk limit: Maximum 2% risk on open positions</li>
                <li>Payout eligibility: Minimum 5 trading days with 0.5% gain from starting balance</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="space-y-8">
        {/* Row 1: Trading Objectives (60%) + Account Information (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Trading Objectives - 60% width */}
          <div className="lg:col-span-3">
            {objectives && <TradingObjectivesTable objectives={objectives} accountStatus={accountStatus} riskEvents={riskEvents} />}
          </div>

          {/* Account Information - 40% width */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 sm:p-6">
              <button
                type="button"
                onClick={() => setAccountInfoOpen(!accountInfoOpen)}
                className="flex lg:hidden w-full items-center justify-between gap-3"
                aria-expanded={accountInfoOpen}
              >
                <h3 className="text-lg font-semibold text-white">Account Information</h3>
                <ChevronDown
                  size={20}
                  className={`text-[#0FF1CE] transition-transform duration-300 ${accountInfoOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <h3 className="hidden lg:block text-lg font-semibold text-white mb-4">Account Information</h3>
              <div className={`${accountInfoOpen ? 'block mt-4' : 'hidden'} lg:block lg:mt-0`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      accountInfo?.connectionStatus === 'CONNECTED' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <p className="text-sm text-white">
                      {accountInfo?.state || 'In Progress'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Start Date</p>
                  <p className="text-sm text-white">
                    {userAccount?.startDate ? 
                      (userAccount.startDate.toDate ? userAccount.startDate.toDate().toLocaleDateString() : new Date(userAccount.startDate).toLocaleDateString()) 
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Account Size</p>
                  <p className="text-sm text-white">
                    ${userAccount?.accountSize?.toLocaleString() || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Challenge Step</p>
                  <p className="text-sm text-white">
                    {userAccount?.step === 3 ? 'Step 3 (Funded)' : 
                     (userAccount?.accountType === '1-step' || userAccount?.accountType === 'gauntlet') ? 'Challenge' :
                     userAccount?.step === 2 ? 'Step 2' : userAccount?.step === 1 ? 'Step 1' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Account Type</p>
                  <p className="text-white font-medium">
                    {userAccount?.accountType === '1-step' ? 'Shockwave 1-Step' : 
                     userAccount?.accountType === 'gauntlet' ? 'Shockwave Gauntlet' :
                     userAccount?.accountType === 'instant' ? 'Shockwave Instant' : 'Shockwave Standard'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Platform</p>
                  <p className="text-sm text-white uppercase">{userAccount?.platform || accountInfo?.platform || 'MT5'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Server</p>
                  <p className="text-sm text-white">{accountInfo?.server || '-'}</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Key Metrics Grid - 100% width */}
        <div>
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
            <MetricCard title="Balance" value={metrics?.balance || 0} icon={DollarSign} format="currency" />
            <MetricCard title="Equity" value={metrics?.equity || 0} icon={TrendingUp} format="currency" />
            <MetricCard title="Average Profit" value={metrics?.averageWin || 0} icon={TrendingUp} format="currency" />
            <MetricCard title="Average Loss" value={Math.abs(metrics?.averageLoss || 0)} icon={TrendingDown} format="currency" />
            <MetricCard title="Number of Trades" value={metrics?.trades || 0} icon={BarChart2} />
            <MetricCard title="Average RRR" value={avgRRR} icon={Target} suffix=":1" />
            <MetricCard title="Lots" value={metrics?.lots || 0} icon={Activity} />
            <MetricCard title="Expectancy" value={metrics?.expectancy || 0} icon={Target} format="currency" />
            <MetricCard title="Win Rate" value={winRate} icon={CheckCircle} format="percent" />
            <MetricCard title="Profit Factor" value={metrics?.profitFactor || 0} icon={TrendingUp} />
          </div>
          </div>
        </div>

        {/* Row 3: Equity Growth Chart - 100% width */}
        <div>
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Equity Growth</h3>
            {chartData.length > 0 ? (
              <ApexChart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height={350}
              />
            ) : (
              <div className="h-[350px] flex items-center justify-center border border-dashed border-[#2F2F2F] rounded-lg">
                <p className="text-gray-500">No chart data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Trading Journal - 100% width */}
        <div>
          <TradingJournal trades={trades} />
        </div>
      </div>
    </div>
  );
} 