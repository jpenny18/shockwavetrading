'use client';
import React, { useState, useMemo } from 'react';
import Particles from '../../components/Particles';
import { 
  ChevronDown, 
  ChevronUp, 
  Search,
  HelpCircle,
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const categories = [
  'General',
  'Business Model',
  'Challenges',
  'Funded Accounts',
  'Risk Management',
  'Payouts',
  'Trading Rules',
  'Technical'
];

const FAQCard = ({ question, answer, isExpanded, onClick }: { 
  question: string;
  answer: string;
  isExpanded: boolean;
  onClick: () => void;
}) => {
  return (
    <div className={`bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl border-2 overflow-hidden transition-all duration-300 ${
      isExpanded 
        ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]' 
        : 'border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50'
    }`}>
      <div 
        className="p-4 cursor-pointer flex items-center justify-between gap-4 hover:bg-[#0FF1CE]/5 transition-colors"
        onClick={onClick}
      >
        <h3 className="text-white font-medium">{question}</h3>
        <button>
          {isExpanded ? 
            <ChevronUp size={20} className="text-[#0FF1CE]" /> : 
            <ChevronDown size={20} className="text-[#0FF1CE]" />
          }
        </button>
      </div>
      
      <div className={`
        overflow-hidden transition-all duration-300 ease-in-out
        ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}
      `}>
        <div className="p-4 pt-0 border-t border-[#2F2F2F]/50 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    // General Questions
    {
      question: "What is Shockwave Capital?",
      answer: "Shockwave Capital is a proprietary trading firm that provides funded trading opportunities to skilled traders. We operate with complete transparency, using real capital backed by an $800,000+ reserve pool. Unlike other firms, we copy your simulated trades to live capital accounts and pay you from actual profits, not just new challenge fees.",
      category: "General"
    },
    {
      question: "How does Shockwave operate differently from other prop firms?",
      answer: `Key differences include:
• Copy trades to live capital (rare among competitors)
• Full justification for every rule (others keep rules vague/hidden)
• Reserve-backed payouts ($800k+ vs fee-driven models)
• No gimmicks or gamification - straight talk only
• Long-term sustainable trader model vs churn & burn approach
• Complete transparency in operations and business model`,
      category: "General"
    },

    // Business Model Questions
    {
      question: "How does Shockwave's business model work?",
      answer: `Our model works in four steps:
1. Challenge fees fund operations and contribute to our growing $800k+ reserve pool
2. Successful traders receive simulated funded accounts
3. After 5 successful payouts, traders undergo strategy review for Live Copy Trading
4. Your simulated trades are copied 1:1 to live capital accounts, generating real profits

Payouts come from live profits and our reserve pool - rarely from new challenge fees directly.`,
      category: "Business Model"
    },
    {
      question: "What is the $800,000+ reserve pool?",
      answer: "We maintain a dedicated reserve pool currently exceeding $800,000 that's specifically designated for trader payouts. This isn't a marketing number - it exists to ensure we rarely rely on new challenge fees to pay current traders. Your payout is earned, not borrowed from the next trader.",
      category: "Business Model"
    },
    {
      question: "What is Live Copy Trading?",
      answer: "After demonstrating consistency with five successful payouts on your simulated account, our risk management team conducts a comprehensive strategy review. You're then elevated to A-Book status where your simulated trades are copied 1:1 to live capital accounts. Profits from these live trades fund your payouts directly.",
      category: "Business Model"
    },

    // Challenge Questions
    {
      question: "What challenge types do you offer?",
      answer: `We offer three challenge types:

**Shockwave Challenge (2-Step)**:
• Unlimited trading period
• 10% profit target (Phase 1), 5% (Phase 2)
• 15% max drawdown, 8% daily drawdown
• 5 minimum trading days
• 1:200 leverage

**Shockwave 1-Step**:
• Unlimited trading period
• 10% profit target (single phase)
• 8% max drawdown, 4% daily drawdown
• 5 minimum trading days
• 1:200 leverage

**Shockwave Instant**:
• 30-day trading period
• 12% profit target
• 4% max drawdown, no daily limit
• 5 minimum profitable days
• Immediate funding`,
      category: "Challenges"
    },
    {
      question: "What are the universal challenge rules?",
      answer: `Universal rules across all challenges:
• Maximum of 5 active challenge accounts per trader
• Minimum trading days require at least 1 trade placed on the same day
• Minimum profitable days require at least 0.5% gain of starting day balance/equity
• All drawdown calculations based on balance and/or floating equity with open trades`,
      category: "Challenges"
    },
    {
      question: "How does the Shockwave Instant challenge work?",
      answer: `Instant Challenge specifics:
• Exactly 30 calendar days to complete (no extensions)
• 12% profit target from starting balance
• 5 minimum profitable days required
• 4% maximum drawdown from highest balance/equity
• No daily loss limit
• Free reset included (resets balance, NOT the 30-day timer)
• Get paid within 6 days of starting
• One phase only - immediate withdrawal after completion`,
      category: "Challenges"
    },

    // Funded Account Questions  
    {
      question: "What are the funded account rules?",
      answer: `Core funded account requirements:
• Max daily drawdown: 8% of account balance
• Max total drawdown: 15% of account balance  
• Max total risk exposure: 2% of initial account balance across ALL open positions
• Stop loss & take profit highly recommended but not enforced
• You must manage total open risk and account for real-world execution factors

You're responsible for spread, slippage, commissions, swaps, and unexpected price movements.`,
      category: "Funded Accounts"
    },
    {
      question: "How does the 2% risk exposure rule work in practice?",
      answer: `Risk exposure examples:
• You can open trades with up to 2% risk, close them, then open new trades with 2% risk again
• NEVER have more than 2% total open risk simultaneously
• Real-world factors (slippage, gaps, spreads, swaps, commissions) count toward your risk
• If market conditions push your loss beyond 2% due to these factors, it's still a violation
• We recommend staying below 2% to buffer for execution realities
• Account restrictions or termination may result from violations`,
      category: "Risk Management"
    },

    // Payout Questions
    {
      question: "How do payouts work for simulated funded accounts?",
      answer: `Simulated Funded Account Payouts 80% profit split):
• First withdrawal available 21 days after first trade
• Subsequent withdrawals every 14 days (subject to monthly cap)
• 5 minimum profitable days required (0.5% daily gain minimum)
• No withdrawal cap
• $150 minimum withdrawal amount
• Trading days reset after each withdrawal
• After 5 successful withdrawals, mandatory transition to Live Copy Trading`,
      category: "Payouts"
    },
    {
      question: "How do payouts work for Live Copy Trading accounts?",
      answer: `Live Copy Trading Account Payouts (95% profit split):
• First withdrawal available 30 days after first trade
• Monthly withdrawal cycles thereafter
• 5 minimum profitable days required (0.5% daily gain minimum)
• NO withdrawal cap - unlimited payout potential
• Trading days reset after each withdrawal
• Payouts funded directly by live market profits`,
      category: "Payouts"
    },
    {
      question: "Where do payouts come from?",
      answer: `Payouts are funded by:
• Profits from live capital (copy trading)
• Shockwave's $800k+ reserve pool
• Rarely directly from new challenge fees

This means your payout is earned from real market profits, not borrowed from the next trader's fees.`,
      category: "Payouts"
    },

    // Trading Rules
    {
      question: "What trading strategies are allowed?",
      answer: "You can use any manual trading strategy as long as it complies with our risk management rules and does not manipulate or take advantage of simulated trading environments. We evaluate overall performance rather than specific strategies. Expert advisors (EAs) and automated trading are permitted. All trading done on any Shockwave Capital account can be reviewed by our risk management team at any given time to ensure compliance.",
      category: "Trading Rules"
    },
    {
      question: "What markets can I trade?",
      answer: "With a Shockwave Capital funded account, you can trade Forex, Indices, Commodities, Cryptocurrencies, and Stocks. The specific instruments available depend on your account type and size.",
      category: "Trading Rules"
    },
    {
      question: "Are there any time restrictions on trading?",
      answer: "There are no specific time restrictions, but you must be aware that trading during high-impact news events or low liquidity sessions can create challenging conditions including wider spreads, slippage, and gaps that could impact your risk management.",
      category: "Trading Rules"
    },

    // Risk Management
    {
      question: "Why do you have risk controls?",
      answer: `Risk controls exist to:
• Protect live capital and simulate real-world constraints
• Prevent reckless or system-abusive strategies  
• Ensure consistent performance and reduce gambling behavior
• Mirror what actual institutional trading accounts can support
• Maintain long-term sustainability for funded traders`,
      category: "Risk Management"
    },
    {
      question: "How is drawdown calculated?",
      answer: "All drawdown calculations are based on balance and/or floating equity if there are open trades. This applies to both daily and total drawdown limits. The calculation uses your highest achieved balance/equity as the reference point.",
      category: "Risk Management"
    },

    // Technical Questions
    {
      question: "What trading platforms do you support?",
      answer: "We support MetaTrader 4 (MT4), MetaTrader 5 (MT5). The available platforms may vary based on your account type and size. Login credentials and setup instructions are provided once your account is activated.",
      category: "Technical"
    },
    {
      question: "How do I reset my password?",
      answer: "To reset your password, click on the 'Forgot Password' link on the login page. Enter your registered email address, and you'll receive a password reset link. If you don't receive the email, please check your spam folder or contact our support team.",
      category: "Technical"
    },
    {
      question: "How does execution work on simulated accounts?",
      answer: "Simulated accounts use real-time market data with execution latency and slippage that mimics live prime brokerage conditions. This keeps our copy trading smooth, honest, and predictable while preparing you for real market conditions.",
      category: "Technical"
    }
  ];

  const filteredFAQs = useMemo(() => {
    return faqs
      .filter(faq => 
        (activeCategory === null || faq.category === activeCategory) &&
        (searchQuery === '' || 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [faqs, activeCategory, searchQuery]);

  return (
    <div className="relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-6">Frequently Asked Questions</h1>

        {/* Search and Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search questions..."
                className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="lg:col-span-1">
            <a href="/dashboard/support" className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300">
              <HelpCircle size={18} />
              <span>Need more help? Contact Support</span>
            </a>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeCategory === null
                ? 'bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black font-bold'
                : 'bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F]/50 text-gray-400 hover:text-white hover:border-[#0FF1CE]/50'
            }`}
          >
            All Categories
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-[#0FF1CE] to-[#00D9FF] text-black font-bold'
                  : 'bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F]/50 text-gray-400 hover:text-white hover:border-[#0FF1CE]/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4 mb-8">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <FAQCard
                key={index}
                question={faq.question}
                answer={faq.answer}
                isExpanded={expandedFAQ === index}
                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
              />
            ))
          ) : (
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-8 text-center">
              <HelpCircle size={32} className="text-[#0FF1CE] mx-auto mb-4" />
              <h3 className="text-white font-medium text-lg mb-2">No matching questions found</h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your search or browse all categories.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
                className="text-[#0FF1CE] font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Additional Resources */}
        <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#2F2F2F]/50">
          <h2 className="text-lg font-bold text-white mb-4">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a href="/How-Shockwave-Operates" className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-5 border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 flex flex-col">
              <BookOpen size={24} className="text-[#0FF1CE] mb-3" />
              <h3 className="text-white font-medium mb-2">How Shockwave Operates</h3>
              <p className="text-gray-400 text-sm mb-4">Complete transparency on our business model, rules, and operations.</p>
              <div className="flex items-center text-[#0FF1CE] mt-auto text-sm">
                <span>Read more</span>
                <ArrowRight size={14} className="ml-2" />
              </div>
            </a>
            <a href="/dashboard/support" className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-5 border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 flex flex-col">
              <ExternalLink size={24} className="text-[#0FF1CE] mb-3" />
              <h3 className="text-white font-medium mb-2">Contact Support</h3>
              <p className="text-gray-400 text-sm mb-4">Get personalized help from our support team for specific questions.</p>
              <div className="flex items-center text-[#0FF1CE] mt-auto text-sm">
                <span>Get help</span>
                <ArrowRight size={14} className="ml-2" />
              </div>
            </a>
            <a href="/challenge" className="bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl p-5 border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 flex flex-col">
              <HelpCircle size={24} className="text-[#0FF1CE] mb-3" />
              <h3 className="text-white font-medium mb-2">Start Your Challenge</h3>
              <p className="text-gray-400 text-sm mb-4">Ready to begin? Choose your challenge type and start trading.</p>
              <div className="flex items-center text-[#0FF1CE] mt-auto text-sm">
                <span>Get started</span>
                <ArrowRight size={14} className="ml-2" />
              </div>
            </a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }
      `}</style>
    </div>
  );
} 