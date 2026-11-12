import { listResetCatalog, type ResetCatalogEntry } from '@/lib/reset-price-config';

export const TEST_CHALLENGE_TYPES = ['standard', '1-step', 'instant', 'gauntlet', 'vip'] as const;
export type TestChallengeType = (typeof TEST_CHALLENGE_TYPES)[number];

export function isTestChallengeType(value: string): value is TestChallengeType {
  return (TEST_CHALLENGE_TYPES as readonly string[]).includes(value);
}

export function testSizeChoices(accountType: string, funded: boolean): ResetCatalogEntry[] {
  const catalog = listResetCatalog();
  if (accountType === 'vip') return catalog.filter((row) => row.category === 'vip');
  if (funded) return catalog.filter((row) => row.category === 'funded');
  return catalog.filter((row) => row.category === 'challenge' && row.accountType === accountType);
}

export function resolveTestAccountShape(input: {
  accountType: TestChallengeType;
  accountSize: number;
  funded: boolean;
  failed: boolean;
}): { ok: true; funded: boolean; status: 'active' | 'funded' | 'failed'; step: number; testActiveStatus: 'active' | 'funded' } | { ok: false; error: string } {
  const funded = input.accountType === 'vip' ? false : input.funded;
  const choices = testSizeChoices(input.accountType, funded);
  if (!choices.some((row) => row.accountSize === input.accountSize)) {
    return { ok: false, error: 'Choose a size that exists for this challenge type.' };
  }
  const testActiveStatus = input.accountType !== 'vip' && funded ? 'funded' : 'active';
  return {
    ok: true,
    funded,
    status: input.failed ? 'failed' : testActiveStatus,
    step: input.accountType !== 'vip' && funded ? 3 : 1,
    testActiveStatus,
  };
}

export function buildTestMetricNumbers(accountSize: number, failed: boolean, platform: 'mt4' | 'mt5') {
  const balance = failed ? Math.round(accountSize * 0.88) : Math.round(accountSize * 1.035);
  const profit = balance - accountSize;
  const maxDrawdown = failed ? 12 : 2.4;
  const dailyDrawdown = failed ? 5.5 : 0.8;
  const now = Date.now();
  const lastEquityChart = [6, 4, 2, 0].map((daysAgo, index) => {
    const pointBalance = Math.round(accountSize + (profit * index) / 3);
    return {
      date: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      balance: pointBalance,
      equity: pointBalance,
    };
  });

  return {
    balance,
    equity: balance,
    averageProfit: Math.round(Math.abs(profit) / 4),
    averageLoss: Math.round(accountSize * (failed ? 0.012 : 0.004)),
    numberOfTrades: 12,
    averageRRR: failed ? 0.8 : 1.5,
    lots: 1.1,
    expectancy: Math.round(profit / 12),
    winRate: failed ? 38 : 64,
    profitFactor: failed ? 0.7 : 1.7,
    maxDrawdown,
    dailyDrawdown,
    maxDailyDrawdown: dailyDrawdown,
    currentProfit: profit,
    tradingDays: 4,
    wonTrades: failed ? 4 : 8,
    lostTrades: failed ? 8 : 4,
    lastTrades: [] as unknown[],
    lastEquityChart,
    accountName: 'Test account',
    broker: 'Shockwave Test',
    server: platform === 'mt4' ? 'Shockwave-Test-MT4' : 'Shockwave-Test-MT5',
  };
}
