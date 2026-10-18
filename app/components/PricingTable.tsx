'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactDOM from 'react-dom';

interface TooltipData {
  [key: string]: string;
}

interface PlanFeature {
  name: string;
  subtitle?: string;
  tooltip: string;
  values: { [key: number]: string };
}

interface PlanData {
  name: string;
  accounts: number[];
  prices: { [key: number]: number };
  features: PlanFeature[];
}

interface ChallengeData {
  standard: PlanData;
  onestep: PlanData;
  instant: PlanData;
  gauntlet: PlanData;
}

const tooltipData: TooltipData = {
  "profit-share": "Your percentage of profits earned during the verification phase. This is your reward for successful trading performance.",
  "challenge-target": "The profit percentage you need to achieve in Phase 1 to advance to the verification phase.",
  "verification-target": "The profit percentage required in Phase 2 to qualify for the funded account.",
  "daily-loss": "Maximum amount you can lose in a single trading day. Exceeding this limit will result in account termination.",
  "overall-loss": "Maximum total loss allowed throughout the entire challenge. This is your absolute risk limit.",
  "leverage": "The maximum leverage ratio available for your trades. Higher leverage means greater potential profits and risks.",
  "news-trading": "Permission to trade during high-impact news events. Many prop firms restrict this due to increased volatility.",
  "profit-split": "Your share of profits once you become a funded trader. This percentage increases with consistent performance.",
  "trading-days": "Minimum number of days you must trade to complete each phase. Ensures consistent trading activity.",
  "payout-eligibility": "Waiting period before your first withdrawal becomes available after reaching the funded phase.",
  "funded-activation-fee": "One-time activation fee paid when you successfully pass the challenge and want to activate your funded account.",
  "one-free-retry": "One free retry if you breach the drawdown limits or reach the time limit. This DOES NOT reset the 30 calendar day period it ONLY resets the account balance.",
  "pay-when-pass": "Pay only $99 to try the challenge, then pay the activation fee only when you successfully pass.",
  "no-restrictions": "No trading rules, no time restrictions, no news trading limits - trade however you want."
};

const challengeData: ChallengeData = {
  standard: {
    name: "Shockwave Standard",
    accounts: [5000, 10000, 25000, 50000, 100000, 200000, 500000],
    prices: {
      5000: 88.50,
      10000: 163.50,
      25000: 283.50,
      50000: 433.50,
      100000: 748.50,
      200000: 1423.50,
      500000: 2848.50
    },
    features: [
      {
        name: "10% Profit Share",
        subtitle: "From Challenge Phase 2",
        tooltip: "profit-share",
        values: {
          5000: "$25",
          10000: "$50",
          25000: "$125",
          50000: "$250",
          100000: "$500",
          200000: "$1,000",
          500000: "$2,500"
        }
      },
      {
        name: "Challenge Profit Target",
        subtitle: "Phase 1",
        tooltip: "challenge-target",
        values: {
          5000: "10% ($500)",
          10000: "10% ($1,000)",
          25000: "10% ($2,500)",
          50000: "10% ($5,000)",
          100000: "10% ($10,000)",
          200000: "10% ($20,000)",
          500000: "10% ($50,000)"
        }
      },
      {
        name: "Verification Profit Target",
        subtitle: "Phase 2",
        tooltip: "verification-target",
        values: {
          5000: "5% ($250)",
          10000: "5% ($500)",
          25000: "5% ($1,250)",
          50000: "5% ($2,500)",
          100000: "5% ($5,000)",
          200000: "5% ($10,000)",
          500000: "5% ($25,000)"
        }
      },
      {
        name: "Maximum Daily Loss",
        subtitle: "",
        tooltip: "daily-loss",
        values: {
          5000: "8% ($400)",
          10000: "8% ($800)",
          25000: "8% ($2,000)",
          50000: "8% ($4,000)",
          100000: "8% ($8,000)",
          200000: "8% ($16,000)",
          500000: "8% ($40,000)"
        }
      },
      {
        name: "Maximum Overall Loss",
        subtitle: "",
        tooltip: "overall-loss",
        values: {
          5000: "15% ($750)",
          10000: "15% ($1,500)",
          25000: "15% ($3,750)",
          50000: "15% ($7,500)",
          100000: "15% ($15,000)",
          200000: "15% ($30,000)",
          500000: "15% ($75,000)"
        }
      },
      {
        name: "Leverage",
        subtitle: "",
        tooltip: "leverage",
        values: {
          5000: "1:200",
          10000: "1:200",
          25000: "1:200",
          50000: "1:200",
          100000: "1:200",
          200000: "1:200",
          500000: "1:200"
        }
      },
      {
        name: "News Trading",
        subtitle: "",
        tooltip: "news-trading",
        values: {
          5000: "✓",
          10000: "✓",
          25000: "✓",
          50000: "✓",
          100000: "✓",
          200000: "✓",
          500000: "✓"
        }
      },
      {
        name: "Profit Split",
        subtitle: "Up to 95%",
        tooltip: "profit-split",
        values: {
          5000: "95%",
          10000: "95%",
          25000: "95%",
          50000: "95%",
          100000: "95%",
          200000: "95%",
          500000: "95%"
        }
      },
      {
        name: "Minimum Trading Days",
        subtitle: "",
        tooltip: "trading-days",
        values: {
          5000: "5 Days",
          10000: "5 Days",
          25000: "5 Days",
          50000: "5 Days",
          100000: "5 Days",
          200000: "5 Days",
          500000: "5 Days"
        }
      },
      {
        name: "First Payout Eligibility",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: {
          5000: "21 Days",
          10000: "21 Days",
          25000: "21 Days",
          50000: "21 Days",
          100000: "21 Days",
          200000: "21 Days",
          500000: "21 Days"
        }
      },
      {
        name: "Refundabe Fee",
        subtitle: "Pay only when you pass",
        tooltip: "funded-activation-fee",
        values: {
          5000: "$88.50",
          10000: "$163.50",
          25000: "$283.50",
          50000: "$433.50",
          100000: "$748.50",
          200000: "$1,423.50",
          500000: "$2,848.50"
        }
      }
    ]
  },
  onestep: {
    name: "Shockwave 1-Step",
    accounts: [5000, 10000, 25000, 50000, 100000, 200000, 500000],
    prices: {
      5000: 97.50,
      10000: 178.50,
      25000: 298.50,
      50000: 433.50,
      100000: 853.50,
      200000: 1483.50,
      500000: 2998.50
    },
    features: [
      {
        name: "10% Profit Share",
        subtitle: "From Challenge Phase",
        tooltip: "profit-share",
        values: {
          5000: "$50",
          10000: "$100",
          25000: "$250",
          50000: "$500",
          100000: "$1,000",
          200000: "$2,000",
          500000: "$5,000"
        }
      },
      {
        name: "Profit Target",
        subtitle: "Single Phase",
        tooltip: "challenge-target",
        values: {
          5000: "10% ($500)",
          10000: "10% ($1,000)",
          25000: "10% ($2,500)",
          50000: "10% ($5,000)",
          100000: "10% ($10,000)",
          200000: "10% ($20,000)",
          500000: "10% ($50,000)"
        }
      },
      {
        name: "Maximum Daily Loss",
        subtitle: "",
        tooltip: "daily-loss",
        values: {
          5000: "4% ($200)",
          10000: "4% ($400)",
          25000: "4% ($1,000)",
          50000: "4% ($2,000)",
          100000: "4% ($4,000)",
          200000: "4% ($8,000)",
          500000: "4% ($20,000)"
        }
      },
      {
        name: "Maximum Overall Loss",
        subtitle: "",
        tooltip: "overall-loss",
        values: {
          5000: "8% ($400)",
          10000: "8% ($800)",
          25000: "8% ($2,000)",
          50000: "8% ($4,000)",
          100000: "8% ($8,000)",
          200000: "8% ($16,000)",
          500000: "8% ($40,000)"
        }
      },
      {
        name: "Leverage",
        subtitle: "",
        tooltip: "leverage",
        values: {
          5000: "1:200",
          10000: "1:200",
          25000: "1:200",
          50000: "1:200",
          100000: "1:200",
          200000: "1:200",
          500000: "1:200"
        }
      },
      {
        name: "News Trading",
        subtitle: "",
        tooltip: "news-trading",
        values: {
          5000: "✓",
          10000: "✓",
          25000: "✓",
          50000: "✓",
          100000: "✓",
          200000: "✓",
          500000: "✓"
        }
      },
      {
        name: "Profit Split",
        subtitle: "Up to 95%",
        tooltip: "profit-split",
        values: {
          5000: "95%",
          10000: "95%",
          25000: "95%",
          50000: "95%",
          100000: "95%",
          200000: "95%",
          500000: "95%"
        }
      },
      {
        name: "Minimum Trading Days",
        subtitle: "",
        tooltip: "trading-days",
        values: {
          5000: "5 Days",
          10000: "5 Days",
          25000: "5 Days",
          50000: "5 Days",
          100000: "5 Days",
          200000: "5 Days",
          500000: "5 Days"
        }
      },
      {
        name: "First Withdrawal",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: {
          5000: "5 Days",
          10000: "5 Days",
          25000: "5 Days",
          50000: "5 Days",
          100000: "5 Days",
          200000: "5 Days",
          500000: "5 Days"
        }
      }
    ]
  },
  instant: {
    name: "Shockwave Instant",
    accounts: [5000, 10000, 25000, 50000, 100000, 200000, 500000],
    prices: { 
      5000: 448.50,
      10000: 823.50,
      25000: 1123.50, 
      50000: 1348.50, 
      100000: 2698.50,
      200000: 5248.50,
      500000: 10498.50
    },
    features: [
      {
        name: "70% Profit Share",
        subtitle: "Of Profit Target",
        tooltip: "profit-share",
        values: { 
          5000: "$420",
          10000: "$840", 
          25000: "$2,100", 
          50000: "$4,200", 
          100000: "$8,400",
          200000: "$16,800",
          500000: "$42,000"
        }
      },
      {
        name: "Profit Target",
        subtitle: "Single Phase",
        tooltip: "challenge-target",
        values: {
          5000: "12% ($600)",
          10000: "12% ($1,200)",
          25000: "12% ($3,000)",
          50000: "12% ($6,000)",
          100000: "12% ($12,000)",
          200000: "12% ($24,000)",
          500000: "12% ($60,000)"
        }
      },
      {
        name: "Maximum Daily Loss",
        subtitle: "",
        tooltip: "daily-loss",
        values: {
          5000: "✗",
          10000: "✗",
          25000: "✗",
          50000: "✗",
          100000: "✗",
          200000: "✗",
          500000: "✗"
        }
      },
      {
        name: "Maximum Overall Loss",
        subtitle: "",
        tooltip: "overall-loss",
        values: {
          5000: "4% ($200)",
          10000: "4% ($400)",
          25000: "4% ($1,000)",
          50000: "4% ($2,000)",
          100000: "4% ($4,000)",
          200000: "4% ($8,000)",
          500000: "4% ($20,000)"
        }
      },
      {
        name: "Leverage",
        subtitle: "",
        tooltip: "leverage",
        values: { 
          5000: "1:200",
          10000: "1:200", 
          25000: "1:200", 
          50000: "1:200", 
          100000: "1:200",
          200000: "1:200",
          500000: "1:200"
        }
      },
      {
        name: "News Trading",
        subtitle: "",
        tooltip: "news-trading",
        values: { 
          5000: "✓",
          10000: "✓", 
          25000: "✓", 
          50000: "✓", 
          100000: "✓",
          200000: "✓",
          500000: "✓"
        }
      },
      {
        name: "Minimum Trading Days",
        subtitle: "",
        tooltip: "trading-days",
        values: { 
          5000: "5 Days",
          10000: "5 Days", 
          25000: "5 Days", 
          50000: "5 Days", 
          100000: "5 Days",
          200000: "5 Days",
          500000: "5 Days"
        }
      },
      {
        name: "First Withdrawal",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: { 
          5000: "6 Days",
          10000: "6 Days", 
          25000: "6 Days", 
          50000: "6 Days", 
          100000: "6 Days",
          200000: "6 Days",
          500000: "6 Days"
        }
      },
      {
        name: "One Free Retry",
        subtitle: "",
        tooltip: "one-free-retry",
        values: { 
          5000: "Yes",
          10000: "Yes", 
          25000: "Yes", 
          50000: "Yes", 
          100000: "Yes",
          200000: "Yes",
          500000: "Yes"
        }
      }
    ]
  },
  gauntlet: {
    name: "Shockwave Gauntlet",
    accounts: [10000, 25000, 50000, 100000, 200000],
    prices: {
      10000: 19.99,
      25000: 19.99,
      50000: 19.99,
      100000: 19.99,
      200000: 19.99
    },
    features: [
      {
        name: "Pay When You Pass",
        subtitle: "Only $19.99 to try",
        tooltip: "pay-when-pass",
        values: {
          10000: "$199 activation",
          25000: "$299 activation",
          50000: "$499 activation",
          100000: "$799 activation",
          200000: "$1,499 activation"
        }
      },
      {
        name: "Profit Target",
        subtitle: "Single Phase",
        tooltip: "challenge-target",
        values: {
          10000: "10% ($1,000)",
          25000: "10% ($2,500)",
          50000: "10% ($5,000)",
          100000: "10% ($10,000)",
          200000: "10% ($20,000)"
        }
      },
      {
        name: "Maximum Daily Loss",
        subtitle: "",
        tooltip: "daily-loss",
        values: {
          10000: "8% ($800)",
          25000: "8% ($2,000)",
          50000: "8% ($4,000)",
          100000: "8% ($8,000)",
          200000: "8% ($16,000)"
        }
      },
      {
        name: "Maximum Overall Loss",
        subtitle: "",
        tooltip: "overall-loss",
        values: {
          10000: "15% ($1,500)",
          25000: "15% ($3,750)",
          50000: "15% ($7,500)",
          100000: "15% ($15,000)",
          200000: "15% ($30,000)"
        }
      },
      {
        name: "Leverage",
        subtitle: "",
        tooltip: "leverage",
        values: {
          10000: "1:200",
          25000: "1:200",
          50000: "1:200",
          100000: "1:200",
          200000: "1:200"
        }
      },
      {
        name: "No Restrictions",
        subtitle: "Trade freely",
        tooltip: "no-restrictions",
        values: {
          10000: "✓",
          25000: "✓",
          50000: "✓",
          100000: "✓",
          200000: "✓"
        }
      },
      {
        name: "News Trading",
        subtitle: "",
        tooltip: "news-trading",
        values: {
          10000: "✓",
          25000: "✓",
          50000: "✓",
          100000: "✓",
          200000: "✓"
        }
      },
      {
        name: "Profit Split",
        subtitle: "Up to 95%",
        tooltip: "profit-split",
        values: {
          10000: "95%",
          25000: "95%",
          50000: "95%",
          100000: "95%",
          200000: "95%"
        }
      },
      {
        name: "Minimum Trading Days",
        subtitle: "",
        tooltip: "trading-days",
        values: {
          10000: "0 Days",
          25000: "0 Days",
          50000: "0 Days",
          100000: "0 Days",
          200000: "0 Days"
        }
      },
      {
        name: "First Withdrawal",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: {
          10000: "14 Days",
          25000: "14 Days",
          50000: "14 Days",
          100000: "14 Days",
          200000: "14 Days"
        }
      }
    ]
  }
};

export default function PricingTable() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<'standard' | 'onestep' | 'instant' | 'gauntlet'>('standard');
  const [selectedAccount, setSelectedAccount] = useState(100000);
  const [showModal, setShowModal] = useState<string | null>(null);

  const handlePurchase = (plan: string, price: number) => {
    // Set the preselected challenge type and navigate to challenge page
    let challengeType = 'Standard';
    if (plan.includes('Instant')) {
      challengeType = 'Instant';
    } else if (plan.includes('1-Step')) {
      challengeType = '1-Step';
    } else if (plan.includes('Gauntlet')) {
      challengeType = 'Gauntlet';
    }
    
    sessionStorage.setItem('preselectedChallengeType', challengeType);
    sessionStorage.setItem('preselectedBalance', selectedAccount.toString());
    router.push('/challenge');
  };

  const data = challengeData[currentPlan];
  const availableAccounts = data.accounts;

  // Ensure selectedAccount is valid for current plan
  React.useEffect(() => {
    if (!availableAccounts.includes(selectedAccount)) {
      setSelectedAccount(availableAccounts.includes(100000) ? 100000 : availableAccounts[0]);
    }
  }, [currentPlan, availableAccounts, selectedAccount]);

  React.useEffect(() => {
    const chip = document.getElementById(`account-size-${selectedAccount}`);
    const scroller = chip?.parentElement;
    if (!chip || !scroller || chip.offsetParent === null) return;
    scroller.scrollTo({
      left: chip.offsetLeft - scroller.clientWidth / 2 + chip.clientWidth / 2,
      behavior: 'smooth'
    });
  }, [selectedAccount, currentPlan]);

  // Handle body overflow when modal is open
  React.useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  return (
    <div className="relative z-10">
      {/* Step 2 Header */}
      <div className="text-center mb-8">
        {/* Number Badge */}
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black rounded-full text-lg font-bold mb-4">
          1
        </div>
        
        {/* Title */}
        <h2 className="font-bold text-xl md:text-4xl text-white">
          Configure Your Accounts
        </h2>
      </div>

      {/* Plan Type Selection - Desktop */}
      <div className="hidden lg:block container max-w-6xl mx-auto pt-10 mb-8">
        <div className="flex justify-center text-white">
          <div className="flex items-center justify-between rounded-full border border-white/30 bg-black/60 backdrop-blur-sm px-2 sm:px-3 py-2 sm:py-3 glow-effect">
            <button
              type="button"
              onClick={() => setCurrentPlan('standard')}
              className={`flex items-center justify-center rounded-full text-[13px] px-4 sm:px-6 py-2 sm:py-3 sm:text-base font-bold transition-all duration-300 gap-2 ${
                currentPlan === 'standard' 
                  ? 'bg-[#0FF1CE] text-black border border-[#0FF1CE]' 
                  : 'bg-transparent text-white/80 border border-white/20 hover:bg-[#0FF1CE]/10 hover:text-[#0FF1CE] hover:border-[#0FF1CE]/50'
              }`}
            >
              Shockwave Standard
            </button>
            <button
              type="button"
              onClick={() => setCurrentPlan('onestep')}
              className={`flex items-center justify-center rounded-full text-[13px] px-4 sm:px-6 py-2 sm:py-3 sm:text-base font-bold transition-all duration-300 gap-2 ${
                currentPlan === 'onestep' 
                  ? 'bg-[#0FF1CE] text-black border border-[#0FF1CE]' 
                  : 'bg-transparent text-white/80 border border-white/20 hover:bg-[#0FF1CE]/10 hover:text-[#0FF1CE] hover:border-[#0FF1CE]/50'
              }`}
            >
              Shockwave 1-Step
            </button>
            <button
              type="button"
              onClick={() => setCurrentPlan('instant')}
              className={`flex items-center justify-center rounded-full text-[13px] px-4 sm:px-6 py-2 sm:py-3 sm:text-base font-bold transition-all duration-300 gap-2 ${
                currentPlan === 'instant' 
                  ? 'bg-[#0FF1CE] text-black border border-[#0FF1CE]' 
                  : 'bg-transparent text-white/80 border border-white/20 hover:bg-[#0FF1CE]/10 hover:text-[#0FF1CE] hover:border-[#0FF1CE]/50'
              }`}
            >
              Shockwave Instant
            </button>
            <button
              type="button"
              onClick={() => setCurrentPlan('gauntlet')}
              className={`flex items-center justify-center rounded-full text-[13px] px-4 sm:px-6 py-2 sm:py-3 sm:text-base font-bold transition-all duration-300 gap-2 ${
                currentPlan === 'gauntlet' 
                  ? 'bg-[#0FF1CE] text-black border border-[#0FF1CE]' 
                  : 'bg-transparent text-white/80 border border-white/20 hover:bg-[#0FF1CE]/10 hover:text-[#0FF1CE] hover:border-[#0FF1CE]/50'
              }`}
            >
              Gauntlet
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Plan Selection */}
      <div className="lg:hidden mb-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {([
            ['standard', 'Standard'],
            ['onestep', '1-Step'],
            ['instant', 'Instant'],
            ['gauntlet', 'Gauntlet']
          ] as const).map(([plan, label]) => (
            <button
              key={plan}
              type="button"
              onClick={() => setCurrentPlan(plan)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                currentPlan === plan
                  ? 'bg-[#0FF1CE] text-black'
                  : 'border border-white/10 bg-white/[0.04] text-white/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Pricing Table - Desktop */}
      <div className="hidden lg:block max-w-[1400px] mx-auto px-4 overflow-x-auto pt-4">
        <div className="flex gap-0 min-w-fit">
          {/* Left Column - Feature Labels */}
          <div className="flex-shrink-0 w-40 pt-[80px]">
            {data.features.map((feature, idx) => (
              <div 
                key={idx} 
                className="h-[44px] flex items-center gap-2 px-2"
              >
                <span className="text-white text-[11px] font-medium">{feature.name}</span>
                <div
                  className="info-icon-small"
                  onClick={() => setShowModal(feature.tooltip)}
                >
                  i
                </div>
              </div>
            ))}
            <div className="mt-2 px-2">
              <p className="text-gray-500 text-[10px]">Activation payments are one-time payments</p>
            </div>
          </div>

          {/* Account Cards */}
          <div className="flex gap-1.5 flex-1 justify-center">
            {availableAccounts.map((account, cardIndex) => {
              const isBestValue = cardIndex === 2; // 100K is typically best value
              
              return (
                <div 
                  key={account} 
                  className={`flex-shrink-0 w-[140px] relative ${isBestValue ? 'z-10' : ''}`}
                >
                  {/* Best Value Badge */}
                  {isBestValue && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                      <div className="bg-[#0FF1CE] text-black text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        Best value
                      </div>
                    </div>
                  )}
                  
                  <div className={`rounded-lg overflow-hidden ${
                    isBestValue 
                      ? 'bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm border-2 border-[#0FF1CE]/50' 
                      : 'bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm border-2 border-[#0FF1CE]/30'
                  }`}>
                    {/* Account Size Header */}
                    <div className={`p-3 text-center ${isBestValue ? 'pt-4' : ''}`}>
                      <div className="text-gray-400 text-[9px] font-medium mb-0.5">Account</div>
                      <div className="text-white text-lg font-bold">
                        ${account >= 1000 ? `${account / 1000}K` : account}
                      </div>
                    </div>

                    {/* Feature Values */}
                    <div className="flex flex-col">
                      {data.features.map((feature, idx) => {
                        const value = feature.values[account] || '-';
                        const isCheckmark = value === '✓';
                        
                        return (
                          <div 
                            key={idx} 
                            className="h-[44px] flex items-center justify-center px-1.5 border-t border-[#0FF1CE]/20"
                          >
                            {isCheckmark ? (
                              <span className="text-[#0FF1CE] text-[11px] font-medium">{value}</span>
                            ) : (
                              <span className="text-white text-[11px] font-medium">{value}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pricing */}
                    <div className="p-3 pt-2 border-t border-[#0FF1CE]/20">
                      <div className="flex flex-col items-center justify-center gap-0.5 mb-2">
                        <span className="text-[#0FF1CE] text-lg font-bold">${data.prices[account].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          sessionStorage.setItem('preselectedBalance', account.toString());
                          handlePurchase(`${data.name} $${account.toLocaleString()}`, data.prices[account]);
                        }}
                        className="w-full bg-[#0FF1CE] hover:bg-[#0AA89E] text-black font-bold py-1.5 px-2 rounded-md transition-all duration-300 hover:scale-105 text-xs"
                      >
                        Start now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: one selected account, FTMO-style */}
      <div className="lg:hidden px-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {availableAccounts.map((account) => {
            const isSelected = account === selectedAccount;
            return (
              <button
                key={account}
                id={`account-size-${account}`}
                type="button"
                onClick={() => setSelectedAccount(account)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-[#0FF1CE] text-black'
                    : 'border border-white/10 bg-white/[0.04] text-white/80'
                }`}
              >
                ${account >= 1000 ? `${account / 1000}K` : account}
              </button>
            );
          })}
        </div>

        {availableAccounts.includes(selectedAccount) && (
          <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 pb-4 pt-5 text-center">
              <p className="text-xs font-medium text-white/50">{data.name}</p>
              <h3 className="mt-1 text-3xl font-semibold tracking-tight text-white">
                ${selectedAccount.toLocaleString()}
              </h3>
            </div>

            <div className="divide-y divide-white/10">
              {data.features.map((feature, index) => {
                const value = feature.values[selectedAccount] || '-';
                const isCheckmark = value === '✓';
                return (
                  <div key={index} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white/85">{feature.name}</p>
                        <div
                          className="info-icon flex-shrink-0"
                          onClick={() => setShowModal(feature.tooltip)}
                        >
                          i
                        </div>
                      </div>
                      {feature.subtitle ? (
                        <p className="text-xs text-white/45">{feature.subtitle}</p>
                      ) : null}
                    </div>
                    <p className={`shrink-0 text-right text-sm font-semibold ${isCheckmark ? 'text-[#0FF1CE]' : 'text-white'}`}>
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="mb-3 text-center text-2xl font-bold text-[#0FF1CE]">
                ${data.prices[selectedAccount].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('preselectedBalance', selectedAccount.toString());
                  handlePurchase(`${data.name} $${selectedAccount.toLocaleString()}`, data.prices[selectedAccount]);
                }}
                className="w-full rounded-2xl bg-[#0FF1CE] py-3.5 text-base font-bold text-black transition-transform duration-300 hover:scale-[1.01]"
              >
                Start now
              </button>
              <p className="mt-3 text-center text-[11px] text-white/40">One-time activation fee</p>
            </div>
          </div>
        )}
      </div>

      {/* Add-ons Section */}
      <div className="mb-16 lg:mb-24 mt-12 lg:mt-16 max-w-6xl mx-auto px-4 hidden">
        <h3 className="text-xl lg:text-2xl font-bold text-[#0FF1CE] mb-6 text-center">
          Available Add-ons
        </h3>
        
        {/* Unified Card Layout for All Devices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-[#0FF1CE]/20 hover:border-[#0FF1CE]/40 transition-all duration-300 hover:scale-105">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-[#0FF1CE] rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-white font-semibold text-sm lg:text-base mb-1">No Min Trading Days</h4>
                <p className="text-white/60 text-xs lg:text-sm">Trade at your own pace without minimum day requirements</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-[#0FF1CE]/20 hover:border-[#0FF1CE]/40 transition-all duration-300 hover:scale-105">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-[#0FF1CE] rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-white font-semibold text-sm lg:text-base mb-1">100% Profit Split</h4>
                <p className="text-white/60 text-xs lg:text-sm">Increase your initial profit share from 80% to 100%</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-[#0FF1CE]/20 hover:border-[#0FF1CE]/40 transition-all duration-300 hover:scale-105 hidden">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-[#0FF1CE] rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-white font-semibold text-sm lg:text-base mb-1">1:500 Leverage</h4>
                <p className="text-white/60 text-xs lg:text-sm">Higher leverage for increased trading potential</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-[#0FF1CE]/20 hover:border-[#0FF1CE]/40 transition-all duration-300 hover:scale-105 hidden">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-[#0FF1CE] rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-white font-semibold text-sm lg:text-base mb-1">150% Reward</h4>
                <p className="text-white/60 text-xs lg:text-sm">Boost your rewards with 50% extra</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center mt-8 lg:mt-16 hidden">
        <button
          onClick={() => {
            sessionStorage.setItem('preselectedChallengeType', 'Standard');
            router.push('/challenge');
          }}
          className="px-6 py-3 lg:px-12 lg:py-4 bg-[#0FF1CE] text-black text-lg lg:text-xl font-bold rounded-lg hover:scale-105 transition-transform shadow-lg hover:shadow-[#0FF1CE]/20"
        >
          Start Your Challenge Today
        </button>
      </div>

      {/* Info Modal */}
      {showModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-container">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm modal-backdrop"
            onClick={() => setShowModal(null)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-gradient-to-br from-[#0D0D0D] to-[#1a1a1a] border-2 border-[#0FF1CE] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl shadow-[#0FF1CE]/20 modal-content">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 transition-colors"
              aria-label="Close modal"
            >
              <span className="text-[#0FF1CE] text-xl font-bold">×</span>
            </button>
            
            {/* Modal Title */}
            <h3 className="text-[#0FF1CE] text-xl md:text-2xl font-bold mb-4">
              {showModal.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </h3>
            
            {/* Modal Description */}
            <p className="text-white/90 text-sm md:text-base leading-relaxed">
              {tooltipData[showModal]}
            </p>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        .account-size-btn {
          transition: all 0.3s ease;
          border: 2px solid rgba(15, 241, 206, 0.3);
          background: rgba(15, 241, 206, 0.1);
          backdrop-filter: blur(10px);
          transform: translateZ(0);
          will-change: transform;
          position: relative;
          z-index: 1;
        }

        .account-size-btn:hover {
          border-color: var(--shockwave-cyan);
          background: rgba(15, 241, 206, 0.2);
          transform: scale(1.05) translateZ(0);
          box-shadow: 0 4px 15px rgba(15, 241, 206, 0.3);
        }

        .account-size-btn.selected {
          background: var(--shockwave-cyan) !important;
          color: #000 !important;
          border-color: var(--shockwave-cyan) !important;
          box-shadow: 0 0 20px rgba(15, 241, 206, 0.4) !important;
          font-weight: bold;
          transform: scale(1.1) translateZ(0);
        }

        .table-row {
          transition: all 0.3s ease;
          transform: translateZ(0);
          position: relative;
          z-index: 1;
        }

        .table-row:hover {
          transform: translateX(2px) translateZ(0);
          z-index: 2;
        }

        .glow-effect {
          box-shadow: 0 0 30px rgba(15, 241, 206, 0.2);
          border: 1px solid rgba(15, 241, 206, 0.2);
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--shockwave-cyan), rgba(15, 241, 206, 0.6));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }

        .info-icon {
          width: 16px;
          height: 16px;
          background: rgba(15, 241, 206, 0.2);
          border: 1px solid var(--shockwave-cyan);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 8px;
          font-size: 10px;
          color: var(--shockwave-cyan);
          transition: all 0.3s ease;
          cursor: pointer;
          font-style: italic;
          font-weight: bold;
          transform: translateZ(0);
          position: relative;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .info-icon:hover {
          background: var(--shockwave-cyan);
          color: #000;
          transform: scale(1.1) translateZ(0);
          box-shadow: 0 0 10px rgba(15, 241, 206, 0.5);
        }

        .info-icon-small {
          width: 14px;
          height: 14px;
          background: rgba(15, 241, 206, 0.2);
          border: 1px solid var(--shockwave-cyan);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
          font-size: 9px;
          color: var(--shockwave-cyan);
          transition: all 0.3s ease;
          cursor: pointer;
          font-style: italic;
          font-weight: bold;
          transform: translateZ(0);
          position: relative;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          flex-shrink: 0;
        }

        .info-icon-small:hover {
          background: var(--shockwave-cyan);
          color: #000;
          transform: scale(1.1) translateZ(0);
          box-shadow: 0 0 10px rgba(15, 241, 206, 0.5);
        }

        @media (max-width: 768px) {
          .info-icon {
            background: rgba(15, 241, 206, 0.3) !important;
            border: 2px solid #0ff1ce !important;
            width: 20px;
            height: 20px;
            font-size: 12px;
          }

          .info-icon:active {
            background: #0ff1ce !important;
            color: #000 !important;
          }

          .account-size-btn {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-tap-highlight-color: transparent;
          }

          .account-size-btn::-webkit-scrollbar {
            display: none;
          }

          .account-size-btn.selected {
            background: #0ff1ce !important;
            color: #000000 !important;
            border: 2px solid #0ff1ce !important;
          }
        }

        .checkmark-icon {
          color: var(--shockwave-cyan);
          font-size: 18px;
          font-weight: bold;
        }

        :root {
          --shockwave-cyan: #0ff1ce;
          --shockwave-dark: #0d0d0d;
          --shockwave-darker: #121212;
        }

        * {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-perspective: 1000;
          perspective: 1000;
        }

        /* Modal animation */
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes backdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 99999 !important;
        }

        .modal-backdrop {
          animation: backdropFadeIn 0.2s ease-out;
        }

        .modal-content {
          animation: modalFadeIn 0.2s ease-out;
          z-index: 100000;
        }
      `}</style>
    </div>
  );
} 