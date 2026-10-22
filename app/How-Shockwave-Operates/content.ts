export type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'steps'; items: { title: string; text: string }[] }
  | { type: 'callout'; tone: 'warning' | 'info' | 'danger'; title?: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  blocks: Block[];
};

export type CollectionIcon = 'globe' | 'wallet' | 'shield' | 'folder' | 'target' | 'clock' | 'users' | 'scale';

export type Collection = {
  slug: string;
  title: string;
  description: string;
  icon: CollectionIcon;
  articles: Article[];
};

export const collections: Collection[] = [
  {
    slug: 'how-we-operate',
    title: 'How We Operate',
    description: 'How Shockwave is funded, how accounts move to live capital, and what makes the model different.',
    icon: 'globe',
    articles: [
      {
        slug: 'our-business-model',
        title: 'Our business model',
        description: 'Challenge fees, the reserve, funded accounts, and live copy trading.',
        blocks: [
          {
            type: 'p',
            text: 'Challenge fees fund operations and our growing reserve pool (currently $800k+). After you pass, you trade a funded account and those trades are copied to live capital accounts backed by us. Payouts come from live profits or the reserve if needed — rarely from new challenges.',
          },
        ],
      },
      {
        slug: 'challenge-fees',
        title: 'Challenge fees',
        description: 'What the upfront evaluation fee pays for, and what it is not used for.',
        blocks: [
          {
            type: 'p',
            text: 'We charge an upfront fee for each evaluation challenge. These are not used to pay trader profits directly — they fund our business operations and contribute to a growing reserve pool.',
          },
        ],
      },
      {
        slug: 'the-reserve-pool',
        title: 'The reserve pool',
        description: 'The dedicated reserve that currently sits at $800,000 and climbing.',
        blocks: [
          {
            type: 'p',
            text: 'We maintain a dedicated reserve for trader payouts — currently sitting at $800,000 and climbing. This is not a marketing number. It exists to ensure we rarely rely on new challenge fees to pay current traders.',
          },
        ],
      },
      {
        slug: 'simulated-funded-trading',
        title: 'Funded trading',
        description: 'What happens after you pass, including the move to live copy trading.',
        blocks: [
          {
            type: 'p',
            text: "Upon successfully completing your challenge, you'll trade a funded account. Payouts are on demand. After consistent performance, our risk management team can review your strategy and move you into Live Copy Trading. Payouts are paid from live profits or our reserve.",
          },
        ],
      },
      {
        slug: 'live-copy-trading',
        title: 'Live copy trading',
        description: 'How funded-account trades are copied 1:1 onto live capital accounts.',
        blocks: [
          {
            type: 'p',
            text: 'Trades on your funded account are copied 1:1 to live capital accounts. Profits from those live trades cover payouts. This is how we scale and sustain — live capital, live profits.',
          },
        ],
      },
      {
        slug: 'execution-logic',
        title: 'Execution logic',
        description: 'How funded-account fills track live prime-brokerage conditions.',
        blocks: [
          {
            type: 'p',
            text: 'Funded accounts use live market data. Execution latency and slippage follow live prime brokerage conditions. This keeps copy trading smooth, honest, and predictable.',
          },
        ],
      },
      {
        slug: 'no-hidden-rules',
        title: 'No hidden rules',
        description: 'Every restriction we enforce is explained.',
        blocks: [
          {
            type: 'p',
            text: "We justify every rule. If we impose a restriction, we explain it. Trust comes from transparency — and we don't expect it, we earn it.",
          },
          {
            type: 'p',
            text: "Here's something no other firm does: we explain every rule we enforce. If we ask you not to trade during NFP, you'll see why. Standard, 1-Step, and Instant accounts have no minimum trading days and no minimum profitable days.",
          },
          { type: 'h3', text: 'We thoroughly break down:' },
          {
            type: 'ul',
            items: [
              'Challenge Rules',
              'Funded Account Requirements',
              'Copy Trading Constraints',
              'Risk/Execution Logic',
            ],
          },
          {
            type: 'quote',
            text: '"The moment a firm hides its rules, it\'s no longer a partner — it\'s a trap." — Shockwave',
          },
        ],
      },
      {
        slug: 'why-were-different',
        title: "Why we're different",
        description: 'How Shockwave compares with other firms on copy trading, rules, and payouts.',
        blocks: [
          {
            type: 'table',
            headers: ['Topic', 'Shockwave', 'Other Firms'],
            rows: [
              ['Copy Trades to Live Capital', '✓ Yes', '✗ Rare'],
              ['Explain Every Rule', '✓ Full Justification', '✗ Vague/Hidden'],
              ['Reserve-Backed Payouts', '✓ $800k+', '✗ Fee-Driven'],
              ['No Gimmicks', '✓ Straight Talk', '✗ Gamified'],
              ['Long-Term Trader Model', '✓ Sustainable', '✗ Churn & Burn'],
            ],
          },
        ],
      },
      {
        slug: 'transparency-in-action',
        title: 'Transparency in action',
        description: 'What we publish so the model stays visible.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Reserve balance reports',
              'Payout receipt snapshots',
              'Performance metrics from copy trading',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'payouts-and-withdrawals',
    title: 'Payouts and Withdrawals',
    description: 'On-demand payouts, the $50 minimum, and the methods we pay in.',
    icon: 'wallet',
    articles: [
      {
        slug: 'how-payouts-work',
        title: 'How payouts work',
        description: 'From a funded profit to a payout, and where the money comes from.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Trader generates profits on a funded account',
              'We pay from live profits or reserve',
              'Fast, clean, reliable payouts',
              'We always pay out our traders from the live profits generated or from our reserve. We rarely use new challenge fees to pay existing traders. Period.',
            ],
          },
          { type: 'h3', text: 'Payouts are funded by:' },
          {
            type: 'ul',
            items: [
              'Profits from live capital (copy trading)',
              "Shockwave's reserve pool",
              'Rarely directly from new challenge fees',
            ],
          },
          {
            type: 'p',
            text: 'This means your payout is earned, not borrowed from the next guy.',
          },
        ],
      },
      {
        slug: 'withdrawal-overview',
        title: 'Withdrawal overview',
        description: 'When a funded account can request a payout.',
        blocks: [
          {
            type: 'p',
            text: 'You can request a payout at any time, on weekdays or weekends, as long as you have no open positions and have not breached your account. The first withdrawal is on demand, 24/7. There is no minimum trading day requirement and no minimum profitable day requirement on Standard, 1-Step, or Instant accounts.',
          },
          {
            type: 'ul',
            items: [
              'Submit a payout request for at least $50 after Shockwave\'s performance-split percentage.',
              'The requested amount is deducted from your account balance immediately. You can keep trading the same account while the payout is processed.',
              'A breached funded account cannot receive a payout.',
              'Payout methods are USDC on the ERC-20 network, USDT on Tron, or USDT on Solana.',
            ],
          },
        ],
      },
      {
        slug: 'discounted-challenge-policy',
        title: 'Discounted challenge policy',
        description: 'Discounted challenges use the same on-demand payout rules.',
        blocks: [
          {
            type: 'callout',
            tone: 'info',
            title: 'Discounted challenges',
            text: 'Discounted and promotional challenges follow the same payout rules. The first withdrawal is on demand, 24/7. There is no extra waiting period.',
          },
        ],
      },
      {
        slug: 'simulated-funded-withdrawals',
        title: 'On-demand payouts',
        description: 'The $50 minimum, same-account trading, and payout methods.',
        blocks: [
          {
            type: 'steps',
            items: [
              {
                title: 'Request any day',
                text: 'Request a payout on a weekday or weekend, including the first withdrawal, as long as you have no open positions and have not breached the funded account.',
              },
              {
                title: '$50 after the split',
                text: 'The minimum payout is $50 after Shockwave\'s performance-split percentage. Requests below that amount are not processed.',
              },
              {
                title: 'Balance is reduced immediately',
                text: 'The requested amount is deducted from your account balance as soon as you submit it. You can keep trading that same account while the payout is processed.',
              },
              {
                title: 'How you get paid',
                text: 'Payouts are sent as USDC on the ERC-20 network, USDT on Tron, or USDT on Solana.',
              },
            ],
          },
          {
            type: 'callout',
            tone: 'danger',
            title: 'Breached accounts',
            text: 'A breached funded account cannot receive a payout.',
          },
        ],
      },
      {
        slug: 'live-copy-trading-withdrawals',
        title: 'Live account payouts',
        description: 'The same on-demand rules apply once you are on a live account.',
        blocks: [
          {
            type: 'p',
            text: 'Live accounts use the same payout rules. Request a payout any day if you have no open positions and have not breached. The minimum is $50 after the performance split, the amount leaves your balance immediately, and you can keep trading while it is processed.',
          },
          {
            type: 'ul',
            items: [
              'First withdrawal is on demand, 24/7',
              'No minimum trading days and no minimum profitable days',
              'USDC on ERC-20, or USDT on Tron or Solana',
              'Breached funded accounts cannot be paid',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'universal-rules',
    title: 'Universal Rules',
    description: 'Rules that apply across every Shockwave challenge, including how days and drawdowns are counted.',
    icon: 'shield',
    articles: [
      {
        slug: 'account-limit',
        title: 'Account limit',
        description: 'How many challenge accounts you can have active at once.',
        blocks: [
          {
            type: 'p',
            text: 'Maximum of **5 active challenge accounts** per trader at any time across all challenge types.',
          },
        ],
      },
      {
        slug: 'minimum-trading-days',
        title: 'Minimum trading days',
        description: 'Standard, 1-Step, and Instant have none.',
        blocks: [
          {
            type: 'p',
            text: 'Standard, 1-Step, and Instant accounts have **no minimum trading days**. You do not need to trade a set number of days to pass or to request a payout.',
          },
        ],
      },
      {
        slug: 'minimum-profitable-days',
        title: 'Minimum profitable days',
        description: 'There is no minimum profitable day requirement.',
        blocks: [
          {
            type: 'p',
            text: 'Shockwave no longer requires minimum profitable days. A payout does not depend on a number of green days.',
          },
        ],
      },
      {
        slug: 'why-risk-controls-exist',
        title: 'Why risk controls exist',
        description: 'Drawdowns and strategy limits.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Drawdowns: Protect live capital and reflect live market constraints',
              'Select strategy bans: Prevent reckless or system-abusive strategies',
            ],
          },
        ],
      },
      {
        slug: 'how-drawdowns-are-calculated',
        title: 'How drawdowns are calculated',
        description: 'Balance, floating equity, and open trades.',
        blocks: [
          {
            type: 'callout',
            tone: 'warning',
            title: 'Important',
            text: 'All drawdown calculations are based off of balance and/or floating equity if there are open trades.',
          },
        ],
      },
    ],
  },
  {
    slug: 'shockwave-challenge',
    title: 'Shockwave Challenge',
    description: 'Objectives for the two-phase Shockwave Challenge, and why each limit exists.',
    icon: 'folder',
    articles: [
      {
        slug: 'challenge-objectives',
        title: 'Challenge objectives',
        description: 'Drawdown, leverage, and the 10% / 5% profit targets.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Minimum trading days: none',
              'Unlimited trading period — removes pressure, focuses on skill',
              'Max drawdown: 15% — generous but realistic, mirrors live tolerance',
              'Max daily drawdown: 8% — safeguards against blowups',
              'Leverage 1:200 — gives room for strategies without being overkill',
              'Profit target 10%/5% — aggressive but achievable with smart risk',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'shockwave-1-step',
    title: 'Shockwave 1-Step',
    description: 'The single-phase path to a funded account.',
    icon: 'target',
    articles: [
      {
        slug: 'one-step-objectives',
        title: '1-Step objectives',
        description: '8% max drawdown, 4% daily drawdown, and a 10% target.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Minimum trading days: none',
              'Unlimited trading period — removes pressure, focuses on skill',
              'Max drawdown: 8% — balanced risk tolerance for single-phase challenge',
              'Max daily drawdown: 4% — tighter daily control for streamlined process',
              'Leverage 1:200 — gives room for strategies without being overkill',
              'Profit target: 10% — single phase to funded account',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'shockwave-instant',
    title: 'Shockwave Instant',
    description: 'The 30-day instant challenge, from the 12% target to the free reset.',
    icon: 'clock',
    articles: [
      {
        slug: 'instant-overview',
        title: 'Instant challenge overview',
        description: 'One phase, 30 days, and the objectives you have to hit.',
        blocks: [
          {
            type: 'p',
            text: "Our Instant Challenge is a single phase. Once you pass, the first payout is on demand, 24/7. There is no minimum trading day requirement and no minimum profitable day requirement. Here are the rules you must meet to pass.",
          },
          {
            type: 'ul',
            items: [
              'Trading period: 30 days — balances urgency with opportunity',
              'Minimum profitable days: none',
              'Minimum trading days: none',
              'Max drawdown: 4% — slightly tighter, aligns with instant funding risk',
              'Max daily loss: N/A — no daily loss limit',
              'Profit target: 12% — reflects no evaluation phase',
            ],
          },
        ],
      },
      {
        slug: 'time-target-and-profitable-days',
        title: 'Time and profit target',
        description: 'The 30-day window and the 12% target.',
        blocks: [
          { type: 'h3', text: 'Trading Period' },
          {
            type: 'p',
            text: 'You have exactly **30 calendar days** from activation to complete all objectives. This timeframe is fixed and cannot be extended.',
          },
          { type: 'h3', text: 'Profit Target' },
          {
            type: 'p',
            text: 'Achieve a **12% profit** from your starting balance. This target must be reached within the 30-day period while maintaining all risk parameters.',
          },
          { type: 'h3', text: 'No minimum days' },
          {
            type: 'p',
            text: 'There is **no minimum profitable day** requirement and **no minimum trading day** requirement.',
          },
        ],
      },
      {
        slug: 'drawdown-daily-loss-and-reset',
        title: 'Drawdown, daily loss, and the free reset',
        description: 'The 4% maximum drawdown, no daily loss limit, and what a free reset does.',
        blocks: [
          { type: 'h3', text: 'Maximum Drawdown' },
          {
            type: 'p',
            text: 'Never exceed **4% drawdown** from your highest balance and/or equity achieved. This is calculated from your peak balance/equity, not your starting balance.',
          },
          { type: 'h3', text: 'Maximum Daily Loss' },
          {
            type: 'p',
            text: 'There is no daily loss limit.',
          },
          { type: 'h3', text: 'Free Reset Policy' },
          {
            type: 'p',
            text: 'Your **free reset resets your account balance to the starting amount** but does NOT reset the 30-day timer. Use it wisely as it\'s a balance reset, not a time extension.',
          },
        ],
      },
      {
        slug: 'differences-from-the-standard-challenge',
        title: 'Differences from the standard challenge',
        description: 'How Instant compares with the two-phase Shockwave Challenge.',
        blocks: [
          { type: 'h3', text: 'Key differences from the standard challenge' },
          {
            type: 'ul',
            items: [
              'Payouts are on demand, 24/7, after you pass',
              'Immediate funding instead of two phases',
              'Higher profit target (12% vs 10% + 5%)',
              'Stricter drawdown limits (4% vs 15%)',
              'Fixed 30-day timeframe with no extensions',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'funded-accounts',
    title: 'Funded Accounts',
    description: 'Risk rules once you are trading a funded account copied to live capital.',
    icon: 'users',
    articles: [
      {
        slug: 'funded-account-overview',
        title: 'Funded account overview',
        description: 'Why funded rules exist, and what they are protecting.',
        blocks: [
          {
            type: 'p',
            text: 'Your funded-account trades are copied to live capital. Rules exist so your strategy scales, protects capital, and matches what a live account can support. We want you funded long-term, not temporarily.',
          },
        ],
      },
      {
        slug: 'core-risk-limits',
        title: 'Core risk limits',
        description: 'Daily drawdown, total drawdown, and the 2% open-risk cap.',
        blocks: [
          {
            type: 'ul',
            items: [
              '**Max Daily Drawdown:** 8% of account balance',
              '**Max Total Drawdown:** 15% of account balance',
              '**Max Total Risk Exposure at Any Time:** 2% of initial account balance, spread across all open positions combined',
              '**Stop Loss & Take Profit:** Highly recommended but not enforced — you are fully responsible for managing your total open risk at all times.',
              '**Responsibility:** You must trade conservatively enough to absorb real-world execution factors, including spread, slippage, commissions, swaps, and unexpected price movements.',
            ],
          },
        ],
      },
      {
        slug: 'how-open-risk-works',
        title: 'How the 2% rule works in practice',
        description: 'Open risk versus daily drawdown, and what counts as a breach.',
        blocks: [
          { type: 'p', text: 'In practice:' },
          {
            type: 'ul',
            items: [
              'You can open a trade(s) with up to **2% risk**, close it, and later open another trade(s) with up to **2% risk** again — as long as you never have more than **2% total open risk at the same time**.',
              'However, please keep in mind that if your open trades are affected by real-world market conditions such as slippage, gaps, spread widening, liquidity or illiquidity, swaps, or commission costs — and the resulting total loss from those positions exceeds the 2% risk limit — this will be treated as a violation.',
              'This policy exists to ensure that traders remain fully responsible for execution realities and true market conditions, just as they would be when managing actual live capital.',
              'Therefore, while you can theoretically risk up to 2% per trade, we strongly recommend using a slight risk buffer to account for these variables and avoid unintentional breaches.',
              'You may lose up to your allowed daily drawdown limit of 8%. The 2% risk limit applies to exposure at a given moment, whereas the daily drawdown limit covers your total realized losses within a trading day.',
            ],
          },
          {
            type: 'callout',
            tone: 'danger',
            text: 'Your funding may be restricted or terminated if you breach this limit, regardless of how the loss occurs.',
          },
          { type: 'h3', text: 'Key takeaway' },
          {
            type: 'p',
            text: '**Your total combined risk across all open trades must never exceed 2% of your account balance.** You are fully responsible for managing your lot sizes, stop levels, and trade timing to keep your exposure within this limit.',
          },
          {
            type: 'p',
            text: 'If you lose more than 2% in a single day, our risk advisors will closely monitor all positions taken on your account going forward to ensure strict compliance with our risk exposure rules.',
          },
        ],
      },
      {
        slug: 'examples-and-edge-cases',
        title: 'Examples and edge cases',
        description: 'Stops, gaps, news, liquidity, and stacked trades.',
        blocks: [
          {
            type: 'table',
            headers: ['Scenario', 'How it affects your risk exposure'],
            rows: [
              [
                'No Stop Loss Used',
                'If you do not use stop losses, your open positions can run well past your intended risk amount. This easily leads to exceeding the 2% risk exposure rule.',
              ],
              [
                'Market Gaps / Slippage',
                'Sudden price jumps (e.g., news releases) can cause orders to fill worse than expected, turning a properly sized trade into an oversized risk. If your total risk exposure was too tight to begin with, this can push actual losses beyond what is allowed.',
              ],
              [
                'Swaps, Commissions, Spreads',
                'Holding trades overnight or during volatile periods can incur swap fees and higher spreads, increasing your realized loss beyond your planned risk. You must leave buffer room within your 2% total risk to account for these costs.',
              ],
              [
                'Major News Events',
                'Trading during high-impact economic news can create huge spikes and fast moves that cause unexpected losses. If your total open risk is too high, a sudden move can lead to a loss far above 2% before you can react.',
              ],
              [
                'Low Liquidity / Illiquid Sessions',
                'Trading during quiet times (late night, holidays, weekends) often leads to wider spreads and bigger gaps. This can magnify losses if you are near your total risk limit.',
              ],
              [
                'Stacking Multiple Trades',
                'Opening many small trades can quietly add up to more than 2% total risk. If the market turns, you can lose more than allowed in a single move.',
              ],
              [
                'Not Actively Managing Trades',
                'Leaving trades unattended or relying solely on manual closure increases the chance of your losses exceeding the 2% total risk you are allowed.',
              ],
              [
                'No Take Profit',
                'Not setting take profits can cause you to miss opportunities to lock in profits — and if the trade reverses, your open risk remains active, counting towards your total allowed exposure.',
              ],
            ],
          },
        ],
      },
      {
        slug: 'best-practices',
        title: 'Best practices',
        description: 'Stops, buffers, news, and staying with the trade.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Always use a stop loss and take profit on every trade.',
              'Keep total risk below 2% to leave room for fees and slippage.',
              'Avoid trading during high-impact news or illiquid times unless you fully understand the risk.',
              'Monitor your trades actively — do not leave positions unmanaged.',
              'Trade conservatively to protect your funded capital and qualify for payouts.',
            ],
          },
        ],
      },
      {
        slug: 'monitoring-and-enforcement',
        title: 'How we monitor and enforce',
        description: 'What happens if open risk, the daily loss, or the 8% drawdown is breached.',
        blocks: [
          {
            type: 'p',
            text: 'We track your open risk and your daily drawdown in real time.',
          },
          {
            type: 'ul',
            items: [
              'If your total open risk exceeds 2% across all trades, you are in violation.',
              'If you lose 2% or more in a single day, our risk team will closely monitor and review all subsequent trades to ensure no positions exceed the 2% maximum risk exposure.',
              'If you hit the 8% daily drawdown limit, your account will be breached immediately.',
            ],
          },
          {
            type: 'callout',
            tone: 'danger',
            text: 'Violations may result in account restrictions, termination of funding, and forfeiture of any fees paid. No exceptions will be made due to market conditions.',
          },
          {
            type: 'callout',
            tone: 'info',
            text: 'Stay disciplined, manage your exposure wisely, and protect your funded account to keep earning payouts like a professional.',
          },
        ],
      },
    ],
  },
  {
    slug: 'legal',
    title: 'Legal and Disclaimers',
    description: 'Discretionary authority, what these programs are, and what participation does not guarantee.',
    icon: 'scale',
    articles: [
      {
        slug: 'legal-disclaimer',
        title: 'Legal disclaimer and risk authority',
        description: 'Compliance discretion, compensation, and the nature of the programs.',
        blocks: [
          {
            type: 'p',
            text: '**Discretionary Authority:** Shockwave Capital reserves the absolute and sole discretion to determine compliance with all trading rules, risk management protocols, and operational guidelines. Our risk management team maintains final authority over all trading activity assessments, account status determinations, and monetization decisions.',
          },
          {
            type: 'p',
            text: '**No Guarantee of Compensation:** Participation in our evaluation programs and funded trading opportunities does not constitute a guarantee of compensation, profit sharing, or continued account funding. All trading activities are subject to our comprehensive risk assessment and compliance review processes.',
          },
          {
            type: 'p',
            text: '**Not Investment Products:** Our challenge programs and funded trading accounts are not investment products, securities, or financial instruments. Participants do not hold an ownership interest in the firm.',
          },
          {
            type: 'quote',
            text: 'This discretionary authority framework is standard practice across the proprietary trading industry. Shockwave Capital distinguishes itself by providing transparent disclosure of these policies, unlike many competitors who maintain similar authority without explicit communication to participants.',
          },
          {
            type: 'p',
            text: 'By participating in our programs, you acknowledge and accept these terms, our comprehensive risk management framework, and all trading rules, objectives, and operational guidelines outlined herein.',
          },
        ],
      },
    ],
  },
];

export function findCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug);
}

export function findArticle(collection: Collection, slug: string) {
  return collection.articles.find((article) => article.slug === slug);
}

function blockText(block: Block): string {
  switch (block.type) {
    case 'p':
    case 'h3':
    case 'quote':
      return block.text;
    case 'ul':
      return block.items.join(' ');
    case 'steps':
      return block.items.map((item) => `${item.title} ${item.text}`).join(' ');
    case 'callout':
      return `${block.title ?? ''} ${block.text}`;
    case 'table':
      return [...block.headers, ...block.rows.flat()].join(' ');
    default:
      return '';
  }
}

export function articlePlainText(article: Article) {
  return [article.title, article.description, ...article.blocks.map(blockText)].join(' ');
}

export type SearchHit = {
  collection: Collection;
  article: Article;
};

function matchesQuery(haystack: string, needle: string) {
  if (!/\d/.test(needle)) return haystack.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.])${escaped}`, 'i').test(haystack);
}

export function searchArticles(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const hits: SearchHit[] = [];
  for (const collection of collections) {
    for (const article of collection.articles) {
      const haystack = `${collection.title} ${articlePlainText(article)}`.toLowerCase();
      if (matchesQuery(haystack, needle)) {
        hits.push({ collection, article });
      }
    }
  }
  return hits;
}
