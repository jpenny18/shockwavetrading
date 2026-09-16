import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CryptoPrices = {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
};

let priceCache: { data: CryptoPrices | null; lastUpdated: number } = {
  data: null,
  lastUpdated: 0
};

const CACHE_DURATION = 60 * 1000; // 1 minute — keep quotes fresh without hammering APIs
const REQUEST_TIMEOUT_MS = 5000;

const toPositiveNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const fetchWithTimeout = async (url: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchCoinbase = async (): Promise<Partial<CryptoPrices> | null> => {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
      fetchWithTimeout('https://api.coinbase.com/v2/prices/ETH-USD/spot')
    ]);

    if (!btcRes.ok || !ethRes.ok) return null;

    const [btcData, ethData] = await Promise.all([btcRes.json(), ethRes.json()]);
    const BTC = toPositiveNumber(btcData?.data?.amount);
    const ETH = toPositiveNumber(ethData?.data?.amount);
    if (!BTC || !ETH) return null;

    return { BTC, ETH, USDT: 1, USDC: 1 };
  } catch (error) {
    console.error('Coinbase price fetch failed:', error);
    return null;
  }
};

const fetchBinance = async (): Promise<Partial<CryptoPrices> | null> => {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetchWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
      fetchWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
    ]);

    if (!btcRes.ok || !ethRes.ok) return null;

    const [btcData, ethData] = await Promise.all([btcRes.json(), ethRes.json()]);
    const BTC = toPositiveNumber(btcData?.price);
    const ETH = toPositiveNumber(ethData?.price);
    if (!BTC || !ETH) return null;

    return { BTC, ETH, USDT: 1, USDC: 1 };
  } catch (error) {
    console.error('Binance price fetch failed:', error);
    return null;
  }
};

const fetchCoinGecko = async (): Promise<Partial<CryptoPrices> | null> => {
  try {
    const response = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=usd',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Shockwave Capital/1.0.0'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const BTC = toPositiveNumber(data?.bitcoin?.usd);
    const ETH = toPositiveNumber(data?.ethereum?.usd);
    if (!BTC || !ETH) return null;

    return {
      BTC,
      ETH,
      USDT: toPositiveNumber(data?.tether?.usd) || 1,
      USDC: toPositiveNumber(data?.['usd-coin']?.usd) || 1
    };
  } catch (error) {
    console.error('CoinGecko price fetch failed:', error);
    return null;
  }
};

const combineQuotes = (quotes: Partial<CryptoPrices>[]): CryptoPrices | null => {
  const btcQuotes = quotes.map((quote) => quote.BTC).filter((value): value is number => Boolean(value));
  const ethQuotes = quotes.map((quote) => quote.ETH).filter((value): value is number => Boolean(value));

  if (!btcQuotes.length || !ethQuotes.length) return null;

  const usdtQuotes = quotes.map((quote) => quote.USDT).filter((value): value is number => Boolean(value));
  const usdcQuotes = quotes.map((quote) => quote.USDC).filter((value): value is number => Boolean(value));

  return {
    BTC: Number(median(btcQuotes).toFixed(2)),
    ETH: Number(median(ethQuotes).toFixed(2)),
    USDT: Number((usdtQuotes.length ? median(usdtQuotes) : 1).toFixed(4)),
    USDC: Number((usdcQuotes.length ? median(usdcQuotes) : 1).toFixed(4))
  };
};

export async function GET() {
  const now = Date.now();

  if (priceCache.data && now - priceCache.lastUpdated < CACHE_DURATION) {
    return NextResponse.json(priceCache.data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  }

  const quotes = (await Promise.all([fetchCoinbase(), fetchBinance(), fetchCoinGecko()]))
    .filter((quote): quote is Partial<CryptoPrices> => Boolean(quote));

  const prices = combineQuotes(quotes);

  if (prices) {
    priceCache = { data: prices, lastUpdated: now };
    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  }

  if (priceCache.data) {
    console.log('Live quotes unavailable, using cached crypto prices');
    return NextResponse.json(priceCache.data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  }

  console.log('Live quotes unavailable and no cache, returning last-known fallbacks');
  return NextResponse.json(
    {
      BTC: 108531,
      ETH: 2553,
      USDT: 1,
      USDC: 1
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
