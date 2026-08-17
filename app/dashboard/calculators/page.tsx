'use client';
import React, { useState } from 'react';
import Particles from '../../components/Particles';
import { Calculator, TrendingUp, Target, DollarSign, BarChart3, Globe, Zap } from 'lucide-react';

// Type definitions
type ForexPair = {
  pipSize: number;
  pipPosition: number;
  basePosition: string;
};

type Index = {
  pipSize: number;
  contractSize: number;
  symbol: string;
};

type Commodity = {
  pipSize: number;
  contractSize: number;
  symbol: string;
};

// Asset data for specific calculations
const FOREX_PAIRS: Record<string, ForexPair> = {
  'EUR/USD': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'GBP/USD': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'USD/JPY': { pipSize: 0.01, pipPosition: 2, basePosition: 'left' },
  'USD/CHF': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'AUD/USD': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'USD/CAD': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'NZD/USD': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'EUR/GBP': { pipSize: 0.0001, pipPosition: 4, basePosition: 'left' },
  'EUR/JPY': { pipSize: 0.01, pipPosition: 2, basePosition: 'left' },
  'GBP/JPY': { pipSize: 0.01, pipPosition: 2, basePosition: 'left' }
};

const INDICES: Record<string, Index> = {
  'US30': { pipSize: 1, contractSize: 1, symbol: 'Dow Jones' },
  'SPX500': { pipSize: 0.1, contractSize: 1, symbol: 'S&P 500' },
  'NAS100': { pipSize: 0.25, contractSize: 1, symbol: 'NASDAQ 100' },
  'UK100': { pipSize: 1, contractSize: 1, symbol: 'FTSE 100' },
  'GER40': { pipSize: 1, contractSize: 1, symbol: 'DAX 40' },
  'FRA40': { pipSize: 1, contractSize: 1, symbol: 'CAC 40' },
  'JPN225': { pipSize: 1, contractSize: 1, symbol: 'Nikkei 225' },
  'AUS200': { pipSize: 1, contractSize: 1, symbol: 'ASX 200' }
};

const COMMODITIES: Record<string, Commodity> = {
  'XAUUSD': { pipSize: 0.01, contractSize: 100, symbol: 'Gold' },
  'XAGUSD': { pipSize: 0.001, contractSize: 5000, symbol: 'Silver' },
  'USOIL': { pipSize: 0.01, contractSize: 1000, symbol: 'Crude Oil' },
  'UKOIL': { pipSize: 0.01, contractSize: 1000, symbol: 'Brent Oil' }
};

// Tab configuration
const CALCULATOR_TABS = [
  { id: 'position', label: 'Position Size', icon: Target, description: 'Calculate optimal position size based on risk' },
  { id: 'pl', label: 'Profit & Loss', icon: DollarSign, description: 'Calculate potential profit or loss' },
  { id: 'pip', label: 'Pip Value', icon: Calculator, description: 'Calculate monetary value per pip' },
  { id: 'compound', label: 'Compound Growth', icon: TrendingUp, description: 'Project account growth over time' }
];

interface CalculatorCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

const CalculatorCard = ({ icon, title, description, children, className = "" }: CalculatorCardProps) => (
  <div className={`bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-4 sm:p-6 lg:p-8 hover:border-[#0FF1CE]/50 transition-all duration-300 ${className}`}>
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 flex items-center justify-center border border-[#0FF1CE]/20">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg sm:text-xl font-bold text-white truncate">{title}</h3>
        <p className="text-gray-400 text-sm sm:text-base">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "number",
  suffix = "",
  step = "any"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  suffix?: string;
  step?: string;
}) => (
  <div className="space-y-2">
    <label className="text-white text-sm font-medium block">{label}</label>
    <div className="relative">
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all text-sm sm:text-base"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const SelectField = ({ 
  label, 
  value, 
  onChange, 
  options,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-white text-sm font-medium block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all text-sm sm:text-base"
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-[#1A1A1A] text-white">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const ResultField = ({ 
  label, 
  value, 
  className = "",
  highlight = false 
}: { 
  label: string; 
  value: string; 
  className?: string;
  highlight?: boolean;
}) => (
  <div className={`bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/20 ${highlight ? 'border-[#0FF1CE]/40 shadow-[0_0_20px_rgba(15,241,206,0.15)]' : ''} ${className}`} style={{ boxShadow: highlight ? undefined : '0 0 20px rgba(15, 241, 206, 0.1)' }}>
    <div className="text-gray-400 text-xs sm:text-sm mb-1 uppercase tracking-wide">{label}</div>
    <div className={`font-bold text-lg sm:text-xl ${highlight ? 'text-[#0FF1CE]' : 'text-white'}`}>{value}</div>
  </div>
);

const TabButton = ({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: typeof CALCULATOR_TABS[0]; 
  isActive: boolean; 
  onClick: () => void; 
}) => {
  const IconComponent = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 text-sm sm:text-base font-medium
        ${isActive 
          ? 'bg-[#0FF1CE]/15 border border-[#0FF1CE] text-[#0FF1CE] shadow-[0_0_12px_rgba(15,241,206,0.35)]' 
          : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/50 border border-transparent'
        }
      `}
    >
      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
      <span className="hidden sm:inline">{tab.label}</span>
      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
    </button>
  );
};

export default function CalculatorsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState('position');
  
  // Asset Selection
  const [assetType, setAssetType] = useState('forex');
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  
  // Universal inputs
  const [accountBalance, setAccountBalance] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('2');
  const [lotSize, setLotSize] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [tradeDirection, setTradeDirection] = useState('buy');
  
  // Compound calculator
  const [compInitialBalance, setCompInitialBalance] = useState('');
  const [compMonthlyReturn, setCompMonthlyReturn] = useState('');
  const [compMonths, setCompMonths] = useState('');

  // Get current asset data
  const getCurrentAssetData = (): ForexPair | Index | Commodity | null => {
    switch (assetType) {
      case 'forex':
        return FOREX_PAIRS[selectedAsset as keyof typeof FOREX_PAIRS] || null;
      case 'indices':
        return INDICES[selectedAsset as keyof typeof INDICES] || null;
      case 'commodities':
        return COMMODITIES[selectedAsset as keyof typeof COMMODITIES] || null;
      default:
        return FOREX_PAIRS['EUR/USD'];
    }
  };

  // Get asset options
  const getAssetOptions = () => {
    switch (assetType) {
      case 'forex':
        return Object.keys(FOREX_PAIRS).map(pair => ({
          value: pair,
          label: pair
        }));
      case 'indices':
        return Object.entries(INDICES).map(([key, data]) => ({
          value: key,
          label: `${key} (${data.symbol})`
        }));
      case 'commodities':
        return Object.entries(COMMODITIES).map(([key, data]) => ({
          value: key,
          label: `${key} (${data.symbol})`
        }));
      default:
        return [];
    }
  };

  // Calculate pip value
  const calculatePipValue = () => {
    const assetData = getCurrentAssetData();
    const lotSizeNum = parseFloat(lotSize);
    
    if (!assetData || !lotSizeNum) return 0;
    
    if (assetType === 'forex') {
      const contractSize = 100000; // Standard lot
      return (assetData.pipSize * lotSizeNum * contractSize);
    } else if (assetType === 'indices') {
      return assetData.pipSize * lotSizeNum;
    } else if (assetType === 'commodities') {
      // Type guard to ensure contractSize exists
      const contractSize = 'contractSize' in assetData ? assetData.contractSize : 1;
      return (assetData.pipSize * lotSizeNum * contractSize);
    }
    
    return 0;
  };

  // Calculate position size based on risk
  const calculatePositionSize = () => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercentage);
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const assetData = getCurrentAssetData();
    
    if (!balance || !risk || !entry || !stop || !assetData) {
      return {
        riskAmount: '$0.00',
        positionSize: '0.00 lots',
        pipValue: '$0.00',
        pipDistance: '0 pips'
      };
    }
    
    const riskAmount = (balance * risk) / 100;
    const pipDistance = Math.abs(entry - stop);
    const pipsInDistance = pipDistance / assetData.pipSize;
    
    let optimalLotSize = 0;
    if (assetType === 'forex') {
      const pipValuePerLot = assetData.pipSize * 100000;
      optimalLotSize = riskAmount / (pipsInDistance * pipValuePerLot);
    } else if (assetType === 'indices') {
      optimalLotSize = riskAmount / (pipsInDistance * assetData.pipSize);
    } else if (assetType === 'commodities') {
      // Type guard to ensure contractSize exists
      const contractSize = 'contractSize' in assetData ? assetData.contractSize : 1;
      const pipValuePerLot = assetData.pipSize * contractSize;
      optimalLotSize = riskAmount / (pipsInDistance * pipValuePerLot);
    }
    
    const pipValue = calculatePipValue();
    
    return {
      riskAmount: `$${riskAmount.toFixed(2)}`,
      positionSize: `${optimalLotSize.toFixed(3)} lots`,
      pipValue: `$${pipValue.toFixed(4)}`,
      pipDistance: `${pipsInDistance.toFixed(1)} pips`
    };
  };

  // Calculate P&L
  const calculatePL = () => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const lots = parseFloat(lotSize);
    const assetData = getCurrentAssetData();
    
    if (!entry || !exit || !lots || !assetData) {
      return {
        profit: '$0.00',
        pips: '0 pips',
        status: 'No Trade',
        percentage: '0%'
      };
    }
    
    const priceMovement = tradeDirection === 'buy' ? (exit - entry) : (entry - exit);
    const pipsMovement = priceMovement / assetData.pipSize;
    
    let profit = 0;
    if (assetType === 'forex') {
      profit = priceMovement * lots * 100000;
    } else if (assetType === 'indices') {
      profit = priceMovement * lots;
    } else if (assetType === 'commodities') {
      // Type guard to ensure contractSize exists
      const contractSize = 'contractSize' in assetData ? assetData.contractSize : 1;
      profit = priceMovement * lots * contractSize;
    }
    
    const balance = parseFloat(accountBalance) || 1;
    const percentage = (profit / balance) * 100;
    
    return {
      profit: `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
      pips: `${pipsMovement >= 0 ? '+' : ''}${pipsMovement.toFixed(1)} pips`,
      status: profit >= 0 ? 'Profit' : 'Loss',
      percentage: `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
    };
  };

  // Calculate compound interest
  const calculateCompound = () => {
    const initial = parseFloat(compInitialBalance);
    const monthlyReturn = parseFloat(compMonthlyReturn);
    const months = parseInt(compMonths);

    if (!initial || !monthlyReturn || !months) {
      return {
        finalBalance: '$0.00',
        totalGain: '$0.00',
        totalReturn: '0%',
        annualRate: '0%'
      };
    }

    const finalBalance = initial * Math.pow((1 + monthlyReturn / 100), months);
    const totalGain = finalBalance - initial;
    const totalReturnPercentage = ((finalBalance - initial) / initial) * 100;
    const annualRate = (Math.pow(1 + monthlyReturn / 100, 12) - 1) * 100;

    return {
      finalBalance: `$${finalBalance.toFixed(2)}`,
      totalGain: `$${totalGain.toFixed(2)}`,
      totalReturn: `${totalReturnPercentage.toFixed(2)}%`,
      annualRate: `${annualRate.toFixed(2)}%`
    };
  };

  // Update selected asset when asset type changes
  React.useEffect(() => {
    const options = getAssetOptions();
    if (options.length > 0) {
      setSelectedAsset(options[0].value);
    }
  }, [assetType]);

  const positionResults = calculatePositionSize();
  const plResults = calculatePL();
  const compoundResults = calculateCompound();
  const currentPipValue = calculatePipValue();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'position':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Account Balance"
                  value={accountBalance}
                  onChange={setAccountBalance}
                  placeholder="10000"
                  suffix="$"
                />
                <InputField
                  label="Risk Percentage"
                  value={riskPercentage}
                  onChange={setRiskPercentage}
                  placeholder="2"
                  suffix="%"
                  step="0.1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Entry Price"
                  value={entryPrice}
                  onChange={setEntryPrice}
                  placeholder={assetType === 'forex' ? '1.1000' : assetType === 'indices' ? '4500' : '2000'}
                  step="0.00001"
                />
                <InputField
                  label="Stop Loss Price"
                  value={stopLoss}
                  onChange={setStopLoss}
                  placeholder={assetType === 'forex' ? '1.0950' : assetType === 'indices' ? '4450' : '1950'}
                  step="0.00001"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultField label="Risk Amount" value={positionResults.riskAmount} highlight />
              <ResultField label="Position Size" value={positionResults.positionSize} highlight />
              <ResultField label="Pip Value" value={positionResults.pipValue} />
              <ResultField label="Distance" value={positionResults.pipDistance} />
            </div>
          </div>
        );

      case 'pl':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Trade Direction"
                  value={tradeDirection}
                  onChange={setTradeDirection}
                  options={[
                    { value: 'buy', label: 'Buy (Long)' },
                    { value: 'sell', label: 'Sell (Short)' }
                  ]}
                />
                <InputField
                  label="Lot Size"
                  value={lotSize}
                  onChange={setLotSize}
                  placeholder="1.0"
                  suffix="lots"
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Entry Price"
                  value={entryPrice}
                  onChange={setEntryPrice}
                  placeholder={assetType === 'forex' ? '1.1000' : assetType === 'indices' ? '4500' : '2000'}
                  step="0.00001"
                />
                <InputField
                  label="Exit Price"
                  value={exitPrice}
                  onChange={setExitPrice}
                  placeholder={assetType === 'forex' ? '1.1050' : assetType === 'indices' ? '4550' : '2050'}
                  step="0.00001"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultField 
                label="Profit/Loss" 
                value={plResults.profit}
                className={plResults.status === 'Profit' ? 'border-green-500/30 bg-green-500/5' : plResults.status === 'Loss' ? 'border-red-500/30 bg-red-500/5' : ''}
                highlight
              />
              <ResultField label="Percentage" value={plResults.percentage} />
              <ResultField label="Pips" value={plResults.pips} />
              <ResultField label="Status" value={plResults.status} />
            </div>
          </div>
        );

      case 'pip':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-4">
              <InputField
                label="Lot Size"
                value={lotSize}
                onChange={setLotSize}
                placeholder="1.0"
                suffix="lots"
                step="0.01"
              />
              <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl p-4 border border-[#2F2F2F]/50">
                <div className="text-gray-400 text-xs mb-2">ASSET INFORMATION</div>
                <div className="text-white text-sm space-y-1">
                  <div>Asset: <span className="text-[#0FF1CE]">{selectedAsset}</span></div>
                  <div>Pip Size: <span className="text-[#0FF1CE]">{getCurrentAssetData()?.pipSize}</span></div>
                  {assetType === 'forex' && <div>Contract Size: <span className="text-[#0FF1CE]">100,000</span></div>}
                  {assetType === 'commodities' && <div>Contract Size: <span className="text-[#0FF1CE]">{
                    (() => {
                      const assetData = getCurrentAssetData();
                      return assetData && 'contractSize' in assetData ? assetData.contractSize : 1;
                    })()
                  }</span></div>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <ResultField 
                label="Pip Value" 
                value={`$${currentPipValue.toFixed(4)}`} 
                highlight 
              />
              <ResultField 
                label="10 Pips Move" 
                value={`$${(currentPipValue * 10).toFixed(2)}`} 
              />
              <ResultField 
                label="50 Pips Move" 
                value={`$${(currentPipValue * 50).toFixed(2)}`} 
              />
              <ResultField 
                label="100 Pips Move" 
                value={`$${(currentPipValue * 100).toFixed(2)}`} 
              />
            </div>
          </div>
        );

      case 'compound':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Initial Balance"
                  value={compInitialBalance}
                  onChange={setCompInitialBalance}
                  placeholder="10000"
                  suffix="$"
                />
                <InputField
                  label="Monthly Return"
                  value={compMonthlyReturn}
                  onChange={setCompMonthlyReturn}
                  placeholder="5"
                  suffix="%"
                  step="0.1"
                />
              </div>
              <InputField
                label="Number of Months"
                value={compMonths}
                onChange={setCompMonths}
                placeholder="12"
                suffix="months"
                type="number"
                step="1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultField label="Final Balance" value={compoundResults.finalBalance} highlight />
              <ResultField label="Total Gain" value={compoundResults.totalGain} highlight />
              <ResultField label="Total Return" value={compoundResults.totalReturn} />
              <ResultField label="Annual Rate" value={compoundResults.annualRate} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-3">Trading Calculators</h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-2xl">
            Professional-grade calculators with asset-specific calculations for precise risk management and position sizing.
          </p>
        </div>

        {/* Asset Selection */}
        <div className="mb-8">
          <CalculatorCard
            icon={<Globe className="w-5 h-5 sm:w-6 sm:h-6 text-[#0FF1CE]" />}
            title="Asset Selection"
            description="Choose your asset type and specific instrument for accurate calculations"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SelectField
                label="Asset Type"
                value={assetType}
                onChange={setAssetType}
                options={[
                  { value: 'forex', label: 'Forex Pairs' },
                  { value: 'indices', label: 'Stock Indices' },
                  { value: 'commodities', label: 'Commodities' }
                ]}
              />
              <SelectField
                label={assetType === 'forex' ? 'Currency Pair' : assetType === 'indices' ? 'Index' : 'Commodity'}
                value={selectedAsset}
                onChange={setSelectedAsset}
                options={getAssetOptions()}
                className="sm:col-span-1 lg:col-span-1"
              />
              <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 border border-[#0FF1CE]/20" style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
                <div className="text-[#0FF1CE] text-xs font-medium mb-1">SELECTED ASSET</div>
                <div className="text-white font-bold text-lg">{selectedAsset}</div>
                <div className="text-gray-400 text-xs mt-1">
                  Pip Size: {getCurrentAssetData()?.pipSize || 'N/A'}
                </div>
              </div>
            </div>
          </CalculatorCard>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 sm:gap-3 p-2 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50">
            {CALCULATOR_TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          <CalculatorCard
            icon={React.createElement(CALCULATOR_TABS.find(tab => tab.id === activeTab)?.icon || Target, {
              className: "w-5 h-5 sm:w-6 sm:h-6 text-[#0FF1CE]"
            })}
            title={CALCULATOR_TABS.find(tab => tab.id === activeTab)?.label || 'Calculator'}
            description={CALCULATOR_TABS.find(tab => tab.id === activeTab)?.description || 'Professional trading calculator'}
          >
            {renderTabContent()}
          </CalculatorCard>
        </div>

        {/* Risk Disclaimer */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-yellow-500 font-semibold mb-2">Important Disclaimer</h4>
              <p className="text-yellow-200/80 text-sm sm:text-base leading-relaxed">
                These calculators are educational tools designed to help with risk management and position sizing. 
                Always verify calculations independently and consider real market conditions including spreads, slippage, 
                commissions, and swap fees. Past performance does not guarantee future results. 
                Trading involves substantial risk of loss.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #0D0D0D;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #2F2F2F;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #0FF1CE;
        }
      `}</style>
    </div>
  );
} 