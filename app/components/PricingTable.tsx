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
  "profit-target-standard": "Phase 1 is a 10% profit target. Phase 2 is a 5% profit target. Hit both to qualify for the funded account.",
  "profit-target-onestep": "One profit target. Hit it in a single phase to qualify for the funded account.",
  "profit-target-instant": "Hit the profit target during the instant challenge to qualify for a payout.",
  "profit-target-gauntlet": "Hit the profit target to pass. The activation fee is charged only after you pass.",
  "daily-loss": "The most the account can lose in one trading day. Passing this limit breaches the account.",
  "daily-loss-instant": "Instant accounts have no daily loss limit. The overall loss limit still applies.",
  "overall-loss": "The most the account can lose in total. Passing this limit breaches the account.",
  "leverage": "The highest leverage available on this account.",
  "profit-split": "Your share of profits on the funded account, up to 95%.",
  "profit-split-instant": "Your share of profits on an Instant account is 70%.",
  "refundable-fee": "The full challenge fee is refunded with your first payout, unless the challenge was bought at a discount.",
  "pay-when-pass": "Start for $19.99. The activation fee shown here is charged only after you pass.",
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
          5000: "None",
          10000: "None",
          25000: "None",
          50000: "None",
          100000: "None",
          200000: "None",
          500000: "None"
        }
      },
      {
        name: "First Payout Eligibility",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: {
          5000: "On-demand",
          10000: "On-demand",
          25000: "On-demand",
          50000: "On-demand",
          100000: "On-demand",
          200000: "On-demand",
          500000: "On-demand"
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
          5000: "None",
          10000: "None",
          25000: "None",
          50000: "None",
          100000: "None",
          200000: "None",
          500000: "None"
        }
      },
      {
        name: "First Withdrawal",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: {
          5000: "On-demand",
          10000: "On-demand",
          25000: "On-demand",
          50000: "On-demand",
          100000: "On-demand",
          200000: "On-demand",
          500000: "On-demand"
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
          5000: "None",
          10000: "None", 
          25000: "None", 
          50000: "None", 
          100000: "None",
          200000: "None",
          500000: "None"
        }
      },
      {
        name: "First Withdrawal",
        subtitle: "",
        tooltip: "payout-eligibility",
        values: { 
          5000: "On-demand",
          10000: "On-demand", 
          25000: "On-demand", 
          50000: "On-demand", 
          100000: "On-demand",
          200000: "On-demand",
          500000: "On-demand"
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
          10000: "On-demand",
          25000: "On-demand",
          50000: "On-demand",
          100000: "On-demand",
          200000: "On-demand"
        }
      }
    ]
  }
};

export default function PricingTable() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<'standard' | 'onestep' | 'instant' | 'gauntlet'>('standard');
  const [selectedAccount, setSelectedAccount] = useState(100000);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

  const handlePurchase = (plan: string, price: number, balance: number) => {
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
    sessionStorage.setItem('preselectedBalance', balance.toString());
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

  const cardScrollerRef = React.useRef<HTMLDivElement>(null);
  const programmaticCardScroll = React.useRef(false);
  const selectedAccountRef = React.useRef(selectedAccount);
  selectedAccountRef.current = selectedAccount;

  React.useEffect(() => {
    const chip = document.getElementById(`account-size-${selectedAccount}`);
    const scroller = chip?.parentElement;
    if (!chip || !scroller || chip.offsetParent === null) return;
    scroller.scrollTo({
      left: chip.offsetLeft - scroller.clientWidth / 2 + chip.clientWidth / 2,
      behavior: 'smooth'
    });
  }, [selectedAccount, currentPlan]);

  React.useLayoutEffect(() => {
    const scroller = cardScrollerRef.current;
    if (!scroller) return;
    let cancelled = false;

    const alignSelectedCard = () => {
      if (cancelled || scroller.offsetParent === null) return;
      const card = document.getElementById(`pricing-card-${selectedAccount}`);
      if (!card || card.getBoundingClientRect().width === 0) return;
      const padding = 16;
      const delta = card.getBoundingClientRect().left - (scroller.getBoundingClientRect().left + padding);
      if (Math.abs(delta) < 6) return;

      programmaticCardScroll.current = true;
      scroller.scrollLeft += delta;
      window.requestAnimationFrame(() => {
        programmaticCardScroll.current = false;
      });
    };

    alignSelectedCard();
    const observer = new ResizeObserver(alignSelectedCard);
    observer.observe(scroller);
    const retry = window.setTimeout(alignSelectedCard, 80);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(retry);
    };
  }, [selectedAccount, currentPlan]);

  React.useEffect(() => {
    const scroller = cardScrollerRef.current;
    if (!scroller) return;

    const syncSelection = () => {
      if (programmaticCardScroll.current || scroller.offsetParent === null) return;
      const edge = scroller.getBoundingClientRect().left + 16;
      let best = selectedAccountRef.current;
      let bestDistance = Infinity;
      availableAccounts.forEach((account) => {
        const card = document.getElementById(`pricing-card-${account}`);
        if (!card) return;
        const distance = Math.abs(card.getBoundingClientRect().left - edge);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = account;
        }
      });
      if (best !== selectedAccountRef.current) {
        setSelectedAccount(best);
      }
    };

    scroller.addEventListener('scrollend', syncSelection);
    return () => scroller.removeEventListener('scrollend', syncSelection);
  }, [availableAccounts, currentPlan]);

  React.useEffect(() => {
    if (!infoModal) {
      document.body.style.overflow = 'unset';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInfoModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [infoModal]);

  const featureByName = (name: string) => data.features.find((feature) => feature.name === name);

  const openInfo = (title: string, key: string) => {
    setInfoModal({ title, body: tooltipData[key] || '' });
  };

  const renderInfoButton = (title: string, key: string) => (
    <button
      type="button"
      aria-label={`About ${title}`}
      onClick={() => openInfo(title, key)}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-semibold text-white/70 transition-colors hover:border-[#0FF1CE]/50 hover:text-[#0FF1CE]"
    >
      i
    </button>
  );

  const renderAccountCard = (account: number) => {
    const priceLabel = data.prices[account].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const phaseOne = currentPlan === 'standard' ? featureByName('Challenge Profit Target')?.values[account] : undefined;
    const phaseTwo = currentPlan === 'standard' ? featureByName('Verification Profit Target')?.values[account] : undefined;
    const profitTarget = featureByName('Profit Target')?.values[account];
    const dailyLoss = featureByName('Maximum Daily Loss')?.values[account];
    const maxLoss = featureByName('Maximum Overall Loss')?.values[account];
    const leverage = featureByName('Leverage')?.values[account];
    const profitSplit = currentPlan === 'instant' ? '70%' : (featureByName('Profit Split')?.values[account] || '-');
    const refundable = currentPlan === 'gauntlet'
      ? featureByName('Pay When You Pass')?.values[account]?.replace(' activation', '')
      : (featureByName('Refundabe Fee')?.values[account] || `$${priceLabel}`);

    const rows: { name: string; tooltip: string; value?: string; phases?: { label: string; value: string }[] }[] = [
      currentPlan === 'standard'
        ? {
            name: 'Profit Target',
            tooltip: 'profit-target-standard',
            phases: [
              { label: 'Phase 1', value: phaseOne || '-' },
              { label: 'Phase 2', value: phaseTwo || '-' },
            ],
          }
        : {
            name: 'Profit Target',
            tooltip: currentPlan === 'instant'
              ? 'profit-target-instant'
              : currentPlan === 'gauntlet'
                ? 'profit-target-gauntlet'
                : 'profit-target-onestep',
            value: profitTarget || '-',
          },
      {
        name: 'Max Daily Loss',
        tooltip: currentPlan === 'instant' ? 'daily-loss-instant' : 'daily-loss',
        value: !dailyLoss || dailyLoss === '✗' ? 'None' : dailyLoss,
      },
      { name: 'Max Loss', tooltip: 'overall-loss', value: maxLoss || '-' },
      { name: 'Leverage', tooltip: 'leverage', value: leverage || '-' },
      {
        name: 'Profit Split',
        tooltip: currentPlan === 'instant' ? 'profit-split-instant' : 'profit-split',
        value: profitSplit,
      },
      currentPlan === 'gauntlet'
        ? { name: 'Activation Fee', tooltip: 'pay-when-pass', value: refundable || '-' }
        : { name: 'Refundable Fee', tooltip: 'refundable-fee', value: refundable || '-' },
    ];

    const perks = [
      'No consistency rule',
      'News trading allowed',
      'On-demand payouts, including weekends',
      'No minimum trading days or profitable days',
      'No position size limits',
      currentPlan === 'gauntlet'
        ? 'Activation fee is charged only when you pass'
        : 'Full challenge fee refunded with your first payout, unless the challenge was discounted',
      ...(currentPlan === 'instant' ? ['One free retry if you breach or reach the time limit'] : []),
    ];

    return (
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="px-4 pb-4 pt-5 text-center md:px-5">
          <p className="text-xs font-medium text-white/50">{data.name}</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            ${account.toLocaleString()}
          </h3>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0FF1CE]">${priceLabel}</p>
          <p className="mt-1 text-[11px] text-white/40">{currentPlan === 'gauntlet' ? 'Entry fee' : 'One-time fee'}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_1.25rem_max-content] items-center gap-x-3 gap-y-1 px-4 py-2 md:px-5">
          {rows.map((row) => (
            <React.Fragment key={row.name}>
              <div className="flex min-w-0 items-center self-stretch py-2">
                <p className="text-sm leading-snug text-white/85">{row.name}</p>
              </div>
              <div className="flex items-center justify-center self-stretch py-2">
                {renderInfoButton(row.name, row.tooltip)}
              </div>
              <div className="flex items-center justify-end self-stretch py-2 text-right">
                {row.phases ? (
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-end">
                      {row.phases.map((phase) => (
                        <div key={phase.label} className="py-px text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-white/40">
                          {phase.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-end">
                      {row.phases.map((phase) => {
                        const percent = phase.value.match(/^(\d+%)/)?.[1] || phase.value;
                        return (
                          <div key={`${phase.label}-value`} className="py-px text-xs font-semibold uppercase leading-4 tabular-nums text-white">
                            {percent}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-white">{row.value}</p>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-white/80 md:px-5 [&::-webkit-details-marker]:hidden">
            Included with every account
            <span className="text-white/40 transition-transform duration-300 group-open:rotate-180">⌄</span>
          </summary>
          <ul className="space-y-2 px-4 pb-4 md:px-5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm text-white/70">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0FF1CE] text-[10px] font-bold text-black">✓</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="p-4">
          <button
            type="button"
            onClick={() => {
              setSelectedAccount(account);
              handlePurchase(`${data.name} $${account.toLocaleString()}`, data.prices[account], account);
            }}
            className="w-full rounded-2xl bg-[#0FF1CE] py-3.5 text-base font-bold text-black shadow-[0_8px_30px_rgba(15,241,206,0.22)] transition-transform duration-300 hover:scale-[1.01]"
          >
            Start now
          </button>
        </div>
      </div>
    );
  };

  const highlights: Record<typeof currentPlan, string[]> = {
    standard: ['15% max drawdown', 'On-demand payouts', 'No min days'],
    onestep: ['Single phase', 'On-demand payouts', 'No min days'],
    instant: ['No daily loss limit', 'On-demand payouts', 'No min days'],
    gauntlet: ['$19.99 to start', 'On-demand payouts', 'No min days'],
  };

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

      {/* Plan, size, and details — same card on mobile and desktop */}
      <div className="px-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-auto lg:max-w-3xl lg:justify-center lg:overflow-visible lg:px-0">
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

        <div className="mx-auto mt-4 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] py-3 sm:flex sm:items-center sm:justify-center sm:divide-x-0 sm:px-2">
          {highlights[currentPlan].map((item, index) => (
            <div key={item} className="flex h-full min-w-0 flex-col items-center justify-start gap-1.5 px-2 text-center sm:h-auto sm:flex-row sm:justify-center sm:gap-2 sm:px-0">
              {index > 0 ? <span className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" /> : null}
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0FF1CE] text-[11px] font-bold text-black">✓</span>
              <span className="text-[11px] font-medium leading-tight text-white sm:px-1 sm:text-sm">{item}</span>
            </div>
          ))}
        </div>

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-auto lg:max-w-3xl lg:justify-center lg:overflow-visible lg:px-0">
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

        <div
          ref={cardScrollerRef}
          className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar md:hidden"
        >
          {availableAccounts.map((account) => (
            <div key={account} id={`pricing-card-${account}`} className="w-[calc(100vw-7.5rem)] shrink-0 snap-start">
              {renderAccountCard(account)}
            </div>
          ))}
        </div>

        {availableAccounts.includes(selectedAccount) && (
          <div className="mx-auto mt-4 hidden max-w-xl md:block lg:mt-6">
            {renderAccountCard(selectedAccount)}
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

      {infoModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="modal-container fixed inset-0 z-[9999] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <div
            className="modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setInfoModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-info-title"
            className="modal-content relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0d0f]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-7"
          >
            <div className="pointer-events-none absolute inset-x-8 -top-8 h-16 rounded-full bg-[#0FF1CE]/20 blur-3xl" />
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0FF1CE]">Account rule</p>
            <h3 id="pricing-info-title" className="mt-2 pr-8 text-2xl font-semibold tracking-tight text-white">
              {infoModal.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              {infoModal.body}
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