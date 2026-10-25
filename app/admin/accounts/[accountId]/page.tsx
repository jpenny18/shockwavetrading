'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCachedMetrics, db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  Calendar,
  Server,
  Activity,
  RefreshCw,
  User,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { isVipMetaApiAccount } from '../../../../lib/vip-accounts';

// Dynamically import ApexCharts to avoid SSR issues
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Define interfaces
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
  accountId: string;
  sequenceNumber: number;
  brokerTime: string;
  absoluteDrawdown: number;
  relativeDrawdown: number;
  exceededThresholdType: string;
}

interface PeriodStatistic {
  period: string;
  startBrokerTime: string;
  endBrokerTime: string;
  balance: number;
  equity: number;
  maxDrawdown: number;
  maxDailyDrawdown: number;
  profit: number;
  trades: number;
  tradingDays: number;
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
    <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 hover:border-[#0FF1CE]/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-xs mb-1">{title}</p>
          <p className="text-white text-lg font-semibold">{formatValue()}</p>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-[#0FF1CE]/10 text-[#0FF1CE]">
            <Icon size={16} />
          </div>
        )}
      </div>
    </div>
  );
};

// Trading Objectives Table Component
const TradingObjectivesTable = ({ objectives, accountInfo }: { objectives: TradingObjectives; accountInfo?: any }) => {
  const isFunded = accountInfo?.step === 3 || accountInfo?.status === 'funded';
  
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

  return (
    <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Trading Objectives</h3>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="bg-[#151515] rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{row.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Target: {row.format === 'percent' ? `${row.target}%` : row.target}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-sm font-medium ${row.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                {row.format === 'percent' ? `${row.current.toFixed(2)}%` : row.current}
              </span>
              {row.passed ? (
                <CheckCircle className="text-green-400" size={16} />
              ) : (
                <XCircle className="text-red-400" size={16} />
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2F2F2F]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Objective</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Target</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Current</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-[#2F2F2F]/50">
                <td className="py-3 px-4 text-sm text-white">{row.label}</td>
                <td className="py-3 px-4 text-sm text-center text-gray-300">
                  {row.format === 'percent' ? `${row.target}%` : row.target}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  <span className={row.passed ? 'text-green-400' : 'text-yellow-400'}>
                    {row.format === 'percent' ? `${row.current.toFixed(2)}%` : row.current}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {row.passed ? (
                    <CheckCircle className="inline-block text-green-400" size={18} />
                  ) : (
                    <XCircle className="inline-block text-red-400" size={18} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Risk Events Table Component
const RiskEventsTable = ({ riskEvents }: { riskEvents: RiskEvent[] }) => {
  if (!riskEvents || riskEvents.length === 0) {
    return (
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Risk Events</h3>
        <p className="text-gray-400 text-sm">No risk events recorded</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Risk Events</h3>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {riskEvents.map((event, index) => (
          <div key={event.id || index} className="bg-[#151515] rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                event.exceededThresholdType === 'drawdown'
                  ? 'bg-red-500/20 text-red-400'
                  : event.exceededThresholdType === 'dailyDrawdown'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {event.exceededThresholdType}
              </span>
              <span className="text-sm font-medium text-red-400">{event.relativeDrawdown.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{new Date(event.brokerTime).toLocaleString()}</span>
              <span>${event.absoluteDrawdown.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2F2F2F]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Time</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Drawdown %</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
            </tr>
          </thead>
          <tbody>
            {riskEvents.map((event, index) => (
              <tr key={event.id || index} className="border-b border-[#2F2F2F]/50">
                <td className="py-3 px-4 text-sm text-white">
                  {new Date(event.brokerTime).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    event.exceededThresholdType === 'drawdown' 
                      ? 'bg-red-500/20 text-red-400'
                      : event.exceededThresholdType === 'dailyDrawdown'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {event.exceededThresholdType}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right text-red-400 font-medium">
                  {event.relativeDrawdown.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-sm text-right text-red-400">
                  ${event.absoluteDrawdown.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Period Statistics Component
const PeriodStatsChart = ({ periodStats }: { periodStats: PeriodStatistic[] }) => {
  if (!periodStats || periodStats.length === 0) {
    return (
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Period Statistics</h3>
        <p className="text-gray-400 text-sm">No period statistics available</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Daily Performance (Last 7 Days)</h3>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {periodStats.slice(-7).map((stat, index) => (
          <div key={index} className="bg-[#151515] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{new Date(stat.startBrokerTime).toLocaleDateString()}</span>
              <span className={`text-sm font-semibold ${stat.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stat.profit >= 0 ? '+' : ''}${stat.profit.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Balance</p>
                <p className="text-white">${stat.balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Max DD</p>
                <p className="text-yellow-400">{stat.maxDrawdown.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-gray-500">Trades</p>
                <p className="text-gray-300">{stat.trades}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2F2F2F]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Balance</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Equity</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Profit</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Max DD</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Daily DD</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Trades</th>
            </tr>
          </thead>
          <tbody>
            {periodStats.slice(-7).map((stat, index) => (
              <tr key={index} className="border-b border-[#2F2F2F]/50">
                <td className="py-3 px-4 text-sm text-white">
                  {new Date(stat.startBrokerTime).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-sm text-right text-white">
                  ${stat.balance.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-sm text-right text-white">
                  ${stat.equity.toLocaleString()}
                </td>
                <td className={`py-3 px-4 text-sm text-right font-medium ${
                  stat.profit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.profit >= 0 ? '+' : ''}${stat.profit.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-sm text-right text-yellow-400">
                  {stat.maxDrawdown.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-sm text-right text-orange-400">
                  {stat.maxDailyDrawdown.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-sm text-center text-gray-300">
                  {stat.trades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Trading Journal Component with Pagination
const TradingJournal = ({ trades }: { trades: TradeData[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 20;
  
  // Calculate pagination
  const totalPages = Math.ceil(trades.length / tradesPerPage);
  const startIndex = (currentPage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const currentTrades = trades.slice(startIndex, endIndex);
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
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
    <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-semibold text-white">Trading Journal</h3>
        <span className="text-xs md:text-sm text-gray-400">
          {trades.length} {trades.length === 1 ? 'Trade' : 'Trades'}
        </span>
      </div>
      {trades.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No trades found</p>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {currentTrades.map((trade) => (
              <div key={trade.id} className="bg-[#151515] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{trade.symbol}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.type?.toUpperCase() || 'N/A'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      trade.state === 'opened' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {trade.state || 'unknown'}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${trade.profit != null && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.profit != null ? `$${trade.profit.toFixed(2)}` : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                  <div>
                    <span className="text-gray-500">Vol: </span>
                    <span>{trade.volume != null ? trade.volume.toFixed(2) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Open: </span>
                    <span>{trade.openPrice != null ? trade.openPrice.toFixed(5) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Close: </span>
                    <span>{trade.closePrice != null ? trade.closePrice.toFixed(5) : '-'}</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {trade.openTime ? formatDistanceToNow(new Date(trade.openTime), { addSuffix: true }) : '-'}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#2F2F2F]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Symbol</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Volume</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Open Price</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Close Price</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Profit</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Open Time</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F2F2F]/50">
                {currentTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-white">{trade.symbol}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.type?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">{trade.volume != null ? trade.volume.toFixed(2) : '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{trade.openPrice != null ? trade.openPrice.toFixed(5) : '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {trade.closePrice != null ? trade.closePrice.toFixed(5) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={trade.profit != null && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {trade.profit != null ? `$${trade.profit.toFixed(2)}` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {trade.openTime ? formatDistanceToNow(new Date(trade.openTime), { addSuffix: true }) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trade.state === 'opened' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {trade.state || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 md:mt-6 pt-4 border-t border-[#2F2F2F]/50">
          <div className="text-xs md:text-sm text-gray-400">
            {startIndex + 1}–{Math.min(endIndex, trades.length)} of {trades.length}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Previous button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 bg-[#151515] border border-[#2F2F2F] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers */}
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
                        ? 'bg-[#0FF1CE] text-black'
                        : 'text-gray-400 bg-[#151515] border border-[#2F2F2F] hover:bg-[#1A1A1A] hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            
            {/* Next button */}
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

export default function AdminAccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [objectives, setObjectives] = useState<TradingObjectives | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [periodStats, setPeriodStats] = useState<PeriodStatistic[]>([]);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [chartData, setChartData] = useState<EquityChartPoint[]>([]);

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

  const fetchAccountData = async () => {
    try {
      setError(null);
      
      // First, get the account info from userMetaApiAccounts
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const accountQuery = query(accountsRef, where('accountId', '==', accountId), limit(1));
      const accountSnapshot = await getDocs(accountQuery);
      
      if (accountSnapshot.empty) {
        throw new Error('Account not found');
      }
      
      const accountData = accountSnapshot.docs[0].data();
      if (isVipMetaApiAccount(accountData)) {
        router.replace(`/admin/vip-accounts/${accountId}`);
        return;
      }
      setAccountStatus(accountData.status);
      
      // Get user info
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('uid', '==', accountData.userId), limit(1));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        setUserInfo(userSnapshot.docs[0].data());
      }
      
      // Try to get cached metrics first
      const cachedData = await getCachedMetrics(accountId);
      
      if (cachedData) {
        // Convert cached data to the expected format
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
          avgRRR: cachedData.averageRRR,
          profit: cachedData.currentProfit || ((cachedData.balance - accountData.accountSize) || 0),
          riskEvents: cachedData.lastRiskEvents || [],
          periodStats: cachedData.lastPeriodStats || [],
          lastTrades: cachedData.lastTrades || [],
          lastEquityChart: cachedData.lastEquityChart || []
        });
        
        // Set risk events and period stats
        setRiskEvents(cachedData.lastRiskEvents || []);
        setPeriodStats(cachedData.lastPeriodStats || []);
        setTrades(cachedData.lastTrades || []);
        setChartData(cachedData.lastEquityChart || []);
        
        // Use cached objectives if available (which include funded state calculations)
        if (cachedData.lastObjectives) {
          setObjectives(cachedData.lastObjectives);
        } else {
          // Fallback: Calculate objectives based on account type and step
          const isFunded = accountData.step === 3 || accountData.status === 'funded';
          
          if (isFunded) {
            // Funded account objectives
            const profitPercent = ((cachedData.balance - accountData.accountSize) / accountData.accountSize) * 100;
            
            setObjectives({
              minTradingDays: {
                target: 5, // 5 days with 0.5% gain required for payout eligibility
                current: cachedData.tradingDays || 0,
                passed: (cachedData.tradingDays || 0) >= 5
              },
              maxDrawdown: {
                target: 15, // 15% for funded accounts
                current: cachedData.maxDrawdown || 0,
                passed: (cachedData.maxDrawdown || 0) <= 15,
                recentBreach: false
              },
              maxDailyDrawdown: {
                target: 8, // 8% for funded accounts
                current: cachedData.maxDailyDrawdown || cachedData.dailyDrawdown || 0,
                passed: (cachedData.maxDailyDrawdown || cachedData.dailyDrawdown || 0) <= 8,
                recentBreach: false
              },
              profitTarget: {
                target: 0, // No profit target for funded accounts
                current: profitPercent,
                passed: true
              }
            });
          } else {
            // Regular challenge objectives
            const targetDrawdown = accountData.accountType === 'standard' || accountData.accountType === 'gauntlet' ? 15 : 
                                  accountData.accountType === '1-step' ? 8 : 4;
            // Instant challenges have no daily drawdown limit
            const targetDailyDrawdown: number | null = accountData.accountType === 'standard' || accountData.accountType === 'gauntlet' ? 8 : 
                                       accountData.accountType === '1-step' ? 4 : null;
            const targetProfit = accountData.accountType === 'gauntlet' ? 10 :  // Gauntlet: 10% (single phase)
                               accountData.accountType === '1-step' ? 10 :  // 1-Step: 10%
                               accountData.accountType === 'standard' 
              ? (accountData.step === 1 ? 10 : 5)  // Standard: Step 1 = 10%, Step 2 = 5%
              : 12;  // Instant: 12%
            const targetTradingDays = 5;
            
            const profitPercent = ((cachedData.balance - accountData.accountSize) / accountData.accountSize) * 100;
            
            // Check for recent breaches in risk events
            const recentBreaches = {
              maxDrawdown: false,
              dailyDrawdown: false
            };
            
            if (cachedData.lastRiskEvents && cachedData.lastRiskEvents.length > 0) {
              const recentEvents = cachedData.lastRiskEvents.filter((e: any) => {
                const eventTime = new Date(e.brokerTime);
                const dayAgo = new Date();
                dayAgo.setDate(dayAgo.getDate() - 1);
                return eventTime > dayAgo;
              });
              
              recentBreaches.maxDrawdown = recentEvents.some((e: any) => e.exceededThresholdType === 'drawdown');
              recentBreaches.dailyDrawdown = recentEvents.some((e: any) => e.exceededThresholdType === 'dailyDrawdown');
            }
            
            setObjectives({
              minTradingDays: {
                target: targetTradingDays,
                current: cachedData.tradingDays || 0,
                passed: (cachedData.tradingDays || 0) >= targetTradingDays
              },
              maxDrawdown: {
                target: targetDrawdown,
                current: cachedData.maxDrawdown || 0,
                passed: (cachedData.maxDrawdown || 0) <= targetDrawdown,
                recentBreach: recentBreaches.maxDrawdown
              },
              ...(targetDailyDrawdown !== null ? {
                maxDailyDrawdown: {
                  target: targetDailyDrawdown,
                  current: cachedData.maxDailyDrawdown || cachedData.dailyDrawdown || 0,
                  passed: (cachedData.maxDailyDrawdown || cachedData.dailyDrawdown || 0) <= targetDailyDrawdown,
                  recentBreach: recentBreaches.dailyDrawdown
                }
              } : {}),
              profitTarget: {
                target: targetProfit,
                current: profitPercent,
                passed: profitPercent >= targetProfit
              }
            });
          }
        }
        
        setLastUpdate(cachedData.lastUpdated?.toDate ? cachedData.lastUpdated.toDate() : null);
        
        // Set basic account info
        setAccountInfo({
          accountId: accountData.accountId,
          accountType: accountData.accountType,
          accountSize: accountData.accountSize,
          platform: accountData.platform,
          status: accountData.status,
          step: accountData.step
        });
      } else {
        throw new Error('No metrics data available. The user may need to load their dashboard first to generate metrics.');
      }
      
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setError(err.message || 'Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      // Get the account info
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const accountQuery = query(accountsRef, where('accountId', '==', accountId), limit(1));
      const accountSnapshot = await getDocs(accountQuery);
      
      if (accountSnapshot.empty) {
        throw new Error('Account not found');
      }
      
      const accountData = accountSnapshot.docs[0].data();
      
      // If we don't have account info yet, set it now
      if (!accountInfo) {
        setAccountInfo({
          accountId: accountData.accountId,
          accountType: accountData.accountType,
          accountSize: accountData.accountSize,
          platform: accountData.platform,
          status: accountData.status,
          step: accountData.step
        });
        setAccountStatus(accountData.status);
        
        // Also try to get user info if we don't have it
        if (!userInfo) {
          const usersRef = collection(db, 'users');
          const userQuery = query(usersRef, where('uid', '==', accountData.userId), limit(1));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            setUserInfo(userSnapshot.docs[0].data());
          }
        }
      }
      
      // Call the API to fetch fresh data
      const response = await fetch('/api/metaapi/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountData.accountId,
          accountToken: accountData.accountToken,
          accountType: accountData.accountType,
          accountSize: accountData.accountSize,
          isAdmin: true, // Add flag to bypass user auth check
          step: accountData.step
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh metrics');
      }

      const data = await response.json();
      
      // Update the UI
      setMetrics(data.metrics);
      setObjectives(data.objectives);
      setTrades(data.trades || []);
      setChartData(data.equityChart || []);
      setRiskEvents(data.riskEvents || []);
      setPeriodStats(data.periodStats || []);
      
      // Note: the metrics API route already caches the full result server-side.
      // The previous client-side cache write here overwrote that document with a
      // partial subset (wiping trades/equity chart/objectives) and crashed for
      // instant accounts (no maxDailyDrawdown objective), so it was removed.
      
      setLastUpdate(new Date());
      
      // Clear any errors
      setError(null);
    } catch (err: any) {
      console.error('Error refreshing metrics:', err);
      setError('Failed to refresh metrics: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, [accountId]);

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
        <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-red-500/30 p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white text-center mb-2">Error Loading Account</h2>
          <p className="text-gray-400 text-center mb-6">{error}</p>
          
          <div className="space-y-3">
            {/* Show fetch metrics button if the error is about missing cached data */}
            {error.toLowerCase().includes('no metrics') && (
              <button
                onClick={async () => {
                  setError(null);
                  await refreshMetrics();
                  await fetchAccountData();
                }}
                disabled={refreshing}
                className="w-full bg-[#0FF1CE] text-black font-semibold py-2 px-4 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {refreshing ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Fetching Metrics...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Fetch Metrics from MetaAPI
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={() => router.push('/admin/accounts')}
              className="w-full bg-white/10 text-white font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
            >
              Back to Accounts
            </button>
          </div>
        </div>
      </div>
    );
  }

  const winRate = metrics?.winRate || 0;
  const avgRRR = metrics?.avgRRR || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/accounts')}
            className="p-2 rounded-lg bg-[#0D0D0D]/80 border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/30 transition-all"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Account Metrics</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <User size={14} className="text-gray-400" />
              <p className="text-xs md:text-sm text-gray-400 truncate max-w-[200px] md:max-w-none">
                {userInfo?.email || 'Unknown User'} • {accountId.slice(0, 8)}...
              </p>
            </div>
            {lastUpdate && (
              <p className="text-xs text-gray-500 mt-0.5">
                Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => window.open(`/dashboard/accounts/${accountId}`, '_blank')}
            className="bg-white/10 text-white font-semibold py-2 px-3 md:px-4 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Eye size={15} />
            <span className="hidden sm:inline">View as User</span>
            <span className="sm:hidden">View</span>
          </button>
          <button
            onClick={refreshMetrics}
            disabled={refreshing}
            className="bg-[#0FF1CE] text-black font-semibold py-2 px-3 md:px-4 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
      </div>

      {/* Account Status Notice */}
      {accountStatus === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">Challenge Failed</h3>
              <p className="text-gray-300 text-sm">
                This challenge has been marked as failed. The data shown represents the final state of the account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Funded Account Notice */}
      {(accountStatus === 'funded' || accountInfo?.step === 3) && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-purple-400 mt-0.5" size={20} />
            <div>
              <h3 className="text-purple-400 font-semibold mb-1">Funded Account</h3>
              <p className="text-gray-300 text-sm">
                This is a funded account with the following rules:
              </p>
              <ul className="text-gray-300 text-sm mt-2 list-disc list-inside">
                <li>Maximum drawdown: 15% (from initial balance)</li>
                <li>Daily drawdown: 8% maximum per day</li>
                <li>Risk limit: Maximum 2% risk on open positions at any time</li>
                <li>Payout eligibility: Minimum 5 trading days with 0.5% gain from starting balance</li>
                <li>No profit target requirement</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Card */}
      {accountInfo && (
        <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server size={20} />
            Account Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-xs mb-1">Account Type</p>
              <p className="text-white font-medium">
                {accountInfo.accountType === '1-step' ? 'Shockwave 1-Step' :
                 accountInfo.accountType === 'gauntlet' ? 'Shockwave Gauntlet' :
                 accountInfo.accountType === 'standard' ? 'Shockwave Standard' : 'Shockwave Instant'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Account Size</p>
              <p className="text-white font-medium">${accountInfo.accountSize?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Platform</p>
              <p className="text-white font-medium">{accountInfo.platform?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Challenge Step</p>
              <p className="text-white font-medium">
                {accountInfo.step === 3 || accountInfo.status === 'funded' ? 'Funded' : 
                 accountInfo.accountType === 'gauntlet' || accountInfo.accountType === '1-step' ? 'Challenge' : `Step ${accountInfo.step}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <MetricCard title="Balance" value={metrics?.balance || 0} icon={DollarSign} format="currency" />
        <MetricCard title="Equity" value={metrics?.equity || 0} icon={TrendingUp} format="currency" />
        <MetricCard title="Profit/Loss" value={metrics?.profit || 0} icon={metrics?.profit >= 0 ? TrendingUp : TrendingDown} format="currency" />
        <MetricCard title="Total Trades" value={metrics?.trades || 0} icon={Activity} />
        <MetricCard title="Average RRR" value={avgRRR} icon={Target} suffix=":1" />
        <MetricCard title="Total Lots" value={metrics?.lots || 0} icon={BarChart2} />
        <MetricCard title="Expectancy" value={metrics?.expectancy || 0} icon={Target} format="currency" />
        <MetricCard title="Win Rate" value={winRate} icon={Activity} format="percent" />
        <MetricCard title="Profit Factor" value={metrics?.profitFactor || 0} icon={TrendingUp} />
        <MetricCard title="Max Drawdown" value={metrics?.maxDrawdown || 0} icon={TrendingDown} format="percent" />
      </div>

      {/* Trading Objectives */}
      {objectives && <TradingObjectivesTable objectives={objectives} accountInfo={accountInfo} />}

      {/* Equity Growth Chart */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6 mb-8 mt-8">
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

      {/* Risk Events */}
      {riskEvents.length > 0 && <RiskEventsTable riskEvents={riskEvents} />}

      {/* Period Statistics */}
      {periodStats.length > 0 && <PeriodStatsChart periodStats={periodStats} />}

      {/* Trading Journal */}
      <TradingJournal trades={trades} />
    </div>
  );
} 