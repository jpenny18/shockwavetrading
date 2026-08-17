'use client';
import React, { useState } from 'react';
import Particles from '../../components/Particles';
import { 
  BookOpen, 
  Play, 
  Clock, 
  Users, 
  Star, 
  ChevronRight, 
  Download, 
  TrendingUp, 
  Target, 
  Brain, 
  BarChart3,
  Shield,
  Zap,
  Globe,
  Lightbulb,
  Award,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  FileText,
  Calculator,
  LineChart,
  Lock
} from 'lucide-react';

// Education modules data
const EDUCATION_MODULES = {
  beginner: [
    {
      id: 'trading-fundamentals',
      title: 'Trading Fundamentals',
      description: 'Master the essential concepts of financial markets and trading basics',
      icon: BookOpen,
      duration: '4-6 weeks',
      lessons: 8,
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      lessons_list: [
        'Introduction to Financial Markets',
        'Understanding Currency Pairs and Market Structure',
        'Types of Market Orders and Execution',
        'Reading Price Charts and Timeframes',
        'Basic Market Sessions and Trading Hours',
        'Introduction to Spreads and Commissions',
        'Creating Your First Trading Account',
        'Demo Trading Best Practices'
      ]
    },
    {
      id: 'chart-analysis-basics',
      title: 'Chart Analysis Basics',
      description: 'Learn to read charts, identify patterns, and understand price action',
      icon: LineChart,
      duration: '3-5 weeks',
      lessons: 7,
      color: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      lessons_list: [
        'Introduction to Candlestick Charts',
        'Understanding Wicks and Price Action',
        'Basic Chart Patterns (Triangles, Flags)',
        'Support and Resistance Levels',
        'Trend Lines and Channels',
        'Volume Analysis Fundamentals',
        'Multi-Timeframe Chart Reading'
      ]
    },
    {
      id: 'risk-management-101',
      title: 'Risk Management 101',
      description: 'Essential risk control techniques to protect your trading capital',
      icon: Shield,
      duration: '2-3 weeks',
      lessons: 6,
      color: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      lessons_list: [
        'Position Sizing Fundamentals',
        'Stop Loss Orders and Implementation',
        'Risk-Reward Ratios Explained',
        'The 2% Rule and Capital Preservation',
        'Understanding Leverage and Margin',
        'Common Risk Management Mistakes'
      ]
    },
    {
      id: 'trading-psychology-basics',
      title: 'Trading Psychology Basics',
      description: 'Develop the mental framework for successful trading',
      icon: Brain,
      duration: '3-4 weeks',
      lessons: 7,
      color: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      lessons_list: [
        'Emotions in Trading: Fear and Greed',
        'Building Trading Discipline',
        'Managing Expectations and Patience',
        'Dealing with Losses and Drawdowns',
        'The Importance of Trading Journals',
        'Developing Consistent Routines',
        'Building Confidence Through Practice'
      ]
    },
    {
      id: 'market-fundamentals',
      title: 'Market Fundamentals',
      description: 'Understand economic factors that drive market movements',
      icon: Globe,
      duration: '4-5 weeks',
      lessons: 9,
      color: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      lessons_list: [
        'Economic Indicators and Their Impact',
        'Central Banks and Monetary Policy',
        'Understanding Interest Rates',
        'GDP, Inflation, and Employment Data',
        'News Trading and Market Reactions',
        'Correlation Between Different Markets',
        'Seasonal and Cyclical Market Patterns',
        'Introduction to Market Sentiment',
        'Building a Fundamental Analysis Framework'
      ]
    }
  ],
  intermediate: [
    {
      id: 'advanced-technical-analysis',
      title: 'Advanced Technical Analysis',
      description: 'Master complex chart patterns, indicators, and price action strategies',
      icon: BarChart3,
      duration: '6-8 weeks',
      lessons: 10,
      color: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
      lessons_list: [
        'Advanced Chart Patterns (H&S, Double Tops/Bottoms)',
        'Fibonacci Retracements and Extensions',
        'Moving Averages and Trend Analysis',
        'RSI, MACD, and Momentum Indicators',
        'Bollinger Bands and Volatility Analysis',
        'Volume Profile and Market Structure',
        'Elliott Wave Theory Basics',
        'Divergence Analysis and Confirmation',
        'Multi-Timeframe Technical Analysis',
        'Creating Custom Technical Strategies'
      ]
    },
    {
      id: 'trading-strategies-development',
      title: 'Trading Strategies Development',
      description: 'Build, test, and optimize your own trading strategies',
      icon: Target,
      duration: '7-9 weeks',
      lessons: 9,
      color: 'from-teal-500/20 to-teal-600/10',
      borderColor: 'border-teal-500/30',
      lessons_list: [
        'Strategy Design Framework',
        'Backtesting and Forward Testing',
        'Day Trading vs Swing Trading Strategies',
        'Scalping Techniques and Execution',
        'Breakout and Momentum Strategies',
        'Mean Reversion and Range Trading',
        'Strategy Optimization and Parameter Tuning',
        'Walk-Forward Analysis Methods',
        'Performance Metrics and Evaluation'
      ]
    },
    {
      id: 'risk-management-advanced',
      title: 'Advanced Risk Management',
      description: 'Sophisticated risk control techniques and portfolio management',
      icon: Shield,
      duration: '5-6 weeks',
      lessons: 8,
      color: 'from-indigo-500/20 to-indigo-600/10',
      borderColor: 'border-indigo-500/30',
      lessons_list: [
        'Dynamic Position Sizing Methods',
        'Correlation and Portfolio Risk',
        'Value at Risk (VaR) Calculations',
        'Maximum Drawdown Management',
        'Kelly Criterion and Optimal Sizing',
        'Hedging Strategies and Techniques',
        'Black Swan Event Preparation',
        'Risk-Adjusted Performance Metrics'
      ]
    },
    {
      id: 'market-microstructure',
      title: 'Market Microstructure',
      description: 'Understand how markets work at the deepest level',
      icon: Zap,
      duration: '6-7 weeks',
      lessons: 9,
      color: 'from-pink-500/20 to-pink-600/10',
      borderColor: 'border-pink-500/30',
      lessons_list: [
        'Order Book Dynamics and Depth',
        'Bid-Ask Spreads and Liquidity',
        'Market Makers vs Market Takers',
        'High-Frequency Trading Impact',
        'Slippage and Execution Quality',
        'Dark Pools and Alternative Trading',
        'Market Impact and Order Flow',
        'Institutional Trading Patterns',
        'Smart Order Routing Systems'
      ]
    },
    {
      id: 'quantitative-analysis',
      title: 'Quantitative Analysis',
      description: 'Mathematical and statistical approaches to trading',
      icon: Calculator,
      duration: '8-10 weeks',
      lessons: 10,
      color: 'from-yellow-500/20 to-yellow-600/10',
      borderColor: 'border-yellow-500/30',
      lessons_list: [
        'Statistical Analysis in Trading',
        'Probability and Expected Value',
        'Monte Carlo Simulations',
        'Regression Analysis and Modeling',
        'Correlation and Cointegration',
        'Time Series Analysis Fundamentals',
        'Options Pricing Models',
        'Volatility Modeling and Forecasting',
        'Machine Learning in Trading Basics',
        'Quantitative Strategy Development'
      ]
    }
  ],
  advanced: [
    {
      id: 'algorithmic-trading-mastery',
      title: 'Algorithmic Trading Mastery',
      description: 'Build sophisticated trading algorithms and automated systems',
      icon: Brain,
      duration: '10-12 weeks',
      lessons: 12,
      color: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      lessons_list: [
        'Algorithmic Trading Architecture',
        'Programming for Trading (Python/MQL)',
        'API Integration and Data Feeds',
        'High-Frequency Trading Strategies',
        'Mean Reversion Algorithm Development',
        'Momentum and Trend Following Algos',
        'Statistical Arbitrage Strategies',
        'Machine Learning Algorithm Implementation',
        'Backtesting Infrastructure Development',
        'Risk Management in Automated Systems',
        'Execution Algorithms and Optimization',
        'Live Trading Deployment and Monitoring'
      ]
    },
    {
      id: 'institutional-trading-strategies',
      title: 'Institutional Trading Strategies',
      description: 'Learn strategies used by hedge funds and investment banks',
      icon: TrendingUp,
      duration: '8-10 weeks',
      lessons: 10,
      color: 'from-violet-500/20 to-violet-600/10',
      borderColor: 'border-violet-500/30',
      lessons_list: [
        'Proprietary Trading Strategies',
        'Market Making and Liquidity Provision',
        'Cross-Asset Arbitrage Opportunities',
        'Volatility Trading and Options Strategies',
        'Event-Driven Trading Strategies',
        'Merger Arbitrage and Special Situations',
        'Currency Carry Trade Strategies',
        'Credit and Fixed Income Trading',
        'Commodities and Futures Strategies',
        'Portfolio Construction and Optimization'
      ]
    },
    {
      id: 'alternative-data-trading',
      title: 'Alternative Data Trading',
      description: 'Leverage unconventional data sources for trading edge',
      icon: Globe,
      duration: '6-8 weeks',
      lessons: 8,
      color: 'from-rose-500/20 to-rose-600/10',
      borderColor: 'border-rose-500/30',
      lessons_list: [
        'Satellite Data and Economic Intelligence',
        'Social Media Sentiment Analysis',
        'Patent and R&D Data Analysis',
        'Supply Chain and Logistics Data',
        'Weather and Agricultural Data',
        'ESG and Sustainability Metrics',
        'News Flow and NLP Processing',
        'Alternative Data Integration Strategies'
      ]
    },
    {
      id: 'behavioral-finance-advanced',
      title: 'Advanced Behavioral Finance',
      description: 'Exploit market psychology and behavioral biases',
      icon: Lightbulb,
      duration: '7-9 weeks',
      lessons: 9,
      color: 'from-amber-500/20 to-amber-600/10',
      borderColor: 'border-amber-500/30',
      lessons_list: [
        'Cognitive Biases in Market Participants',
        'Herding Behavior and Market Bubbles',
        'Overconfidence and Attribution Bias',
        'Anchoring and Adjustment Heuristics',
        'Loss Aversion and Prospect Theory',
        'Momentum and Contrarian Strategies',
        'Behavioral Risk Management',
        'Market Sentiment Indicators',
        'Exploiting Behavioral Inefficiencies'
      ]
    },
    {
      id: 'quantitative-portfolio-management',
      title: 'Quantitative Portfolio Management',
      description: 'Advanced portfolio theory and systematic investment strategies',
      icon: Award,
      duration: '9-11 weeks',
      lessons: 11,
      color: 'from-slate-500/20 to-slate-600/10',
      borderColor: 'border-slate-500/30',
      lessons_list: [
        'Modern Portfolio Theory Advanced',
        'Factor Models and Multi-Factor Analysis',
        'Alpha Generation and Attribution',
        'Risk Parity and Alternative Weighting',
        'Long-Short Equity Strategies',
        'Systematic Trading Rules',
        'Portfolio Rebalancing Algorithms',
        'Transaction Cost Analysis',
        'Performance Attribution Analysis',
        'Regime Detection and Adaptation',
        'Alternative Investment Integration'
      ]
    }
  ]
};

const SKILL_LEVELS = [
  { 
    id: 'beginner', 
    name: 'Beginner', 
    description: 'New to trading and financial markets',
    icon: BookOpen,
    color: 'from-blue-500 to-blue-600'
  },
  { 
    id: 'intermediate', 
    name: 'Intermediate', 
    description: 'Have basic knowledge, ready to advance',
    icon: Target,
    color: 'from-purple-500 to-purple-600'
  },
  { 
    id: 'advanced', 
    name: 'Advanced', 
    description: 'Experienced trader seeking mastery',
    icon: Brain,
    color: 'from-emerald-500 to-emerald-600'
  }
];

interface ModuleCardProps {
  module: any;
  skillLevel: string;
}

const ModuleCard = ({ module, skillLevel }: ModuleCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = module.icon;

  return (
    <div className={`bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6 hover:border-[#0FF1CE]/50 transition-all duration-300 group`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center border ${module.borderColor} group-hover:scale-110 transition-transform duration-300`}>
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#0FF1CE] transition-colors">
            {module.title}
          </h3>
          <p className="text-gray-400 text-sm mb-3 leading-relaxed">
            {module.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{module.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <PlayCircle className="w-3 h-3" />
              <span>{module.lessons} lessons</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-[#151515]/50 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/50 hover:border-[#0FF1CE]/50 transition-all duration-300 mb-4"
      >
        <span className="text-white font-medium">View Course Outline</span>
        <ChevronRight className={`w-4 h-4 text-[#0FF1CE] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="space-y-2 mb-4 bg-[#0D0D0D]/40 rounded-lg p-4 border border-[#2F2F2F]/30">
          {module.lessons_list.map((lesson: string, index: number) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1A1A1A]/30 transition-colors">
              <div className="w-6 h-6 rounded-full bg-[#0FF1CE]/10 border border-[#0FF1CE]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-[#0FF1CE] text-xs font-medium">{index + 1}</span>
              </div>
              <span className="text-gray-300 text-sm">{lesson}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black px-4 py-3 rounded-lg font-bold hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          Start Learning
        </button>
        <button className="px-4 py-3 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] rounded-lg hover:bg-[#0FF1CE]/10 transition-all duration-300">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function EducationHub() {
  const [activeLevel, setActiveLevel] = useState('beginner');

  const activeModules = EDUCATION_MODULES[activeLevel as keyof typeof EDUCATION_MODULES];

  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Content - Blurred when coming soon */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 blur-sm pointer-events-none">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 flex items-center justify-center border border-[#0FF1CE]/20">
              <BookOpen className="w-6 h-6 text-[#0FF1CE]" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">Educational Hub</h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto leading-relaxed">
            Master trading with our comprehensive education program. From fundamentals to advanced strategies, 
            learn at your own pace with expert-designed modules and real-world applications.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:mb-12">
          {[
            { label: 'Education Modules', value: '15', icon: BookOpen },
            { label: 'Total Lessons', value: '127', icon: PlayCircle },
            { label: 'Learning Hours', value: '200+', icon: Clock },
            { label: 'Success Rate', value: '94%', icon: Star }
          ].map((stat, index) => (
            <div key={index} className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-4 sm:p-6 text-center hover:border-[#0FF1CE]/50 transition-all duration-300">
              <div className="flex justify-center mb-3">
                <stat.icon className="w-6 h-6 text-[#0FF1CE]" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-400 text-xs sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Skill Level Selector */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-6 text-center">Choose Your Learning Path</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {SKILL_LEVELS.map((level) => {
              const IconComponent = level.icon;
              const isActive = activeLevel === level.id;
              
              return (
                <button
                  key={level.id}
                  onClick={() => setActiveLevel(level.id)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${
                    isActive 
                      ? 'border-[#0FF1CE] bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 shadow-[0_0_20px_rgba(15,241,206,0.3)]' 
                      : 'border-[#2F2F2F] bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm hover:border-[#0FF1CE]/50'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isActive 
                        ? 'bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 border border-[#0FF1CE]/30' 
                        : 'bg-gradient-to-br from-[#2F2F2F]/50 to-[#1A1A1A]/50 border border-[#2F2F2F]/30 group-hover:border-[#0FF1CE]/30'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${isActive ? 'text-[#0FF1CE]' : 'text-gray-400 group-hover:text-[#0FF1CE]'}`} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${isActive ? 'text-[#0FF1CE]' : 'text-white'}`}>
                        {level.name}
                      </h3>
                      <p className="text-gray-400 text-sm">{level.description}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2 text-[#0FF1CE] text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>Active Learning Path</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Level Modules */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">
              {SKILL_LEVELS.find(level => level.id === activeLevel)?.name} Modules
            </h2>
            <div className="text-gray-400 text-sm">
              {activeModules.length} modules • {activeModules.reduce((total, module) => total + module.lessons, 0)} lessons
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {activeModules.map((module) => (
              <ModuleCard key={module.id} module={module} skillLevel={activeLevel} />
            ))}
          </div>
        </div>

        {/* Learning Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6 sm:p-8 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 flex items-center justify-center border border-[#0FF1CE]/20">
                <FileText className="w-6 h-6 text-[#0FF1CE]" />
              </div>
              <h3 className="text-xl font-bold text-white">Learning Resources</h3>
            </div>
            <div className="space-y-3">
              {[
                'Trading eBooks and PDFs',
                'Market Analysis Templates',
                'Risk Management Calculators',
                'Strategy Backtesting Guides',
                'Trading Journal Templates'
              ].map((resource, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#1A1A1A]/40 rounded-lg hover:bg-[#1A1A1A]/60 transition-colors">
                  <Download className="w-4 h-4 text-[#0FF1CE]" />
                  <span className="text-gray-300">{resource}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6 sm:p-8 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 flex items-center justify-center border border-[#0FF1CE]/20">
                <Users className="w-6 h-6 text-[#0FF1CE]" />
              </div>
              <h3 className="text-xl font-bold text-white">Community Learning</h3>
            </div>
            <div className="space-y-3">
              {[
                'Live Trading Sessions',
                'Weekly Market Reviews',
                'Q&A with Experts',
                'Peer Discussion Forums',
                'Strategy Sharing Groups'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#1A1A1A]/40 rounded-lg hover:bg-[#1A1A1A]/60 transition-colors">
                  <ArrowRight className="w-4 h-4 text-[#0FF1CE]" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Success Stories */}
        <div className="bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 backdrop-blur-sm border border-[#0FF1CE]/20 rounded-2xl p-6 sm:p-8 mb-8" style={{ boxShadow: '0 0 20px rgba(15, 241, 206, 0.1)' }}>
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-2">Student Success Stories</h2>
            <p className="text-gray-400">Real results from our education program</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah M.', achievement: 'Achieved 85% win rate', time: '6 months', level: 'Beginner to Intermediate' },
              { name: 'Mike R.', achievement: 'Built profitable algo system', time: '8 months', level: 'Intermediate to Advanced' },
              { name: 'Lisa K.', achievement: 'Consistent monthly profits', time: '4 months', level: 'Beginner to Profitable' }
            ].map((story, index) => (
              <div key={index} className="bg-[#0D0D0D]/60 rounded-xl p-6 border border-[#0FF1CE]/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-[#0FF1CE]" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{story.name}</div>
                    <div className="text-gray-400 text-xs">{story.level}</div>
                  </div>
                </div>
                <div className="text-[#0FF1CE] font-medium mb-1">{story.achievement}</div>
                <div className="text-gray-400 text-sm">in {story.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-8 sm:p-12 hover:border-[#0FF1CE]/50 transition-all duration-300">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-4">Ready to Start Your Trading Journey?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of successful traders who started with our comprehensive education program. 
              Begin with any skill level and progress at your own pace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="px-8 py-4 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Start Learning Now
              </button>
              <button className="px-8 py-4 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] font-bold rounded-xl hover:bg-[#0FF1CE]/10 transition-all duration-300">
                Download Curriculum
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-start justify-center pt-12 sm:pt-16 lg:pt-20">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#0FF1CE]/20 to-[#0FF1CE]/10 flex items-center justify-center border border-[#0FF1CE]/30">
            <Lock className="w-10 h-10 text-[#0FF1CE]" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-4">Educational Hub</h2>
          <h3 className="text-xl font-semibold text-[#0FF1CE] mb-4">Coming Soon</h3>
          <p className="text-gray-400 leading-relaxed mb-6">
            We're building something amazing! Our comprehensive educational platform with expert-designed modules, 
            interactive lessons, and real-world trading strategies is currently in development.
          </p>
          <div className="bg-[#0D0D0D]/60 border border-[#0FF1CE]/20 rounded-xl p-4">
            <p className="text-sm text-gray-300">
              Get notified when we launch and be among the first to access our premium trading education content.
            </p>
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