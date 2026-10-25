'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  BarChart2,
  ChevronDown,
  ClipboardList,
  History,
  LayoutList,
  Newspaper,
  RefreshCw,
  Settings,
  Wifi,
  X,
} from 'lucide-react';
import ShockwaveXChart from '../../components/ShockwaveXChart';

const SYMBOLS = [
  { label: 'EURUSD', tv: 'FX:EURUSD', binance: 'EURUSDT', type: 'forex' as const, pipSize: 0.0001, contractSize: 100000, digits: 5, spread: 0.00012, seed: 1.085 },
  { label: 'GBPUSD', tv: 'FX:GBPUSD', binance: 'GBPUSDT', type: 'forex' as const, pipSize: 0.0001, contractSize: 100000, digits: 5, spread: 0.00016, seed: 1.275 },
  { label: 'USDJPY', tv: 'FX:USDJPY', binance: null, type: 'forex' as const, pipSize: 0.01, contractSize: 100000, digits: 3, spread: 0.012, seed: 149.52 },
  { label: 'XAUUSD', tv: 'OANDA:XAUUSD', binance: 'XAUUSDT', type: 'commodity' as const, pipSize: 0.01, contractSize: 100, digits: 2, spread: 0.12, seed: 2650 },
  { label: 'BTCUSD', tv: 'BINANCE:BTCUSDT', binance: 'BTCUSDT', type: 'crypto' as const, pipSize: 0.1, contractSize: 1, digits: 2, spread: 8, seed: 64000 },
] as const;

const ACCOUNTS = [
  { id: 'std-100', name: '100K SHOCKWAVE CHALLENGE', start: 100000, dailyPct: 0.08, maxDdPct: 0.15, targetPct: 0.1 },
  { id: 'std-50', name: '50K SHOCKWAVE CHALLENGE', start: 50000, dailyPct: 0.08, maxDdPct: 0.15, targetPct: 0.1 },
  { id: 'onestep-100', name: '100K SHOCKWAVE 1-STEP', start: 100000, dailyPct: 0.04, maxDdPct: 0.08, targetPct: 0.1 },
  { id: 'instant-25', name: '25K SHOCKWAVE INSTANT', start: 25000, dailyPct: 0.04, maxDdPct: 0.04, targetPct: 0.12 },
  { id: 'gauntlet-100', name: '100K SHOCKWAVE GAUNTLET', start: 100000, dailyPct: 0.08, maxDdPct: 0.15, targetPct: 0.1 },
] as const;

const ORDER_TYPES = ['Market', 'Limit', 'Stop'] as const;
const LOT_PRESETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1];
const BOTTOM_TABS = ['Accounts', 'Positions', 'Orders', 'Trades', 'Quotes'] as const;

type SymbolSpec = (typeof SYMBOLS)[number];
type OrderType = (typeof ORDER_TYPES)[number];
type BottomTab = (typeof BOTTOM_TABS)[number];
type Side = 'buy' | 'sell';

type MockPosition = {
  id: string;
  time: string;
  symbol: string;
  lots: number;
  entryPrice: number;
};

type MockOrder = {
  id: string;
  time: string;
  symbol: string;
  side: Side;
  lots: number;
  type: OrderType;
  price: number;
  status: string;
};

type MockTrade = {
  id: string;
  time: string;
  symbol: string;
  side: Side;
  lots: number;
  price: number;
  pnl: number;
};

const money = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const signedMoney = (value: number) =>
  `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPrice = (value: number, digits: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatLots = (value: number) => value.toFixed(2);

const nowTime = () =>
  new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

const positionPnl = (position: MockPosition, spec: SymbolSpec, bid: number, ask: number) => {
  const mark = position.lots > 0 ? bid : ask;
  const movement = position.lots > 0 ? mark - position.entryPrice : position.entryPrice - mark;
  return movement * Math.abs(position.lots) * spec.contractSize;
};

const positionPips = (position: MockPosition, spec: SymbolSpec, bid: number, ask: number) => {
  const mark = position.lots > 0 ? bid : ask;
  const movement = position.lots > 0 ? mark - position.entryPrice : position.entryPrice - mark;
  return movement / spec.pipSize;
};

export default function ShockwaveXPage() {
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [accountId, setAccountId] = useState<(typeof ACCOUNTS)[number]['id']>('std-100');
  const [orderType, setOrderType] = useState<OrderType>('Market');
  const [lots, setLots] = useState<number>(0.1);
  const [bid, setBid] = useState<number>(SYMBOLS[0].seed);
  const [ask, setAsk] = useState<number>(SYMBOLS[0].seed + SYMBOLS[0].spread);
  const [quotes, setQuotes] = useState<Record<string, { bid: number; ask: number }>>({
    EURUSD: { bid: SYMBOLS[0].seed, ask: SYMBOLS[0].seed + SYMBOLS[0].spread },
  });
  const [activeTool, setActiveTool] = useState('chart');
  const [bottomTab, setBottomTab] = useState<BottomTab>('Positions');
  const [limitPrice, setLimitPrice] = useState<number>(SYMBOLS[0].seed);
  const [notice, setNotice] = useState('Preview only — ShockwaveX is coming soon.');
  const [clock, setClock] = useState('--:--:--');
  const [positions, setPositions] = useState<MockPosition[]>([]);
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [trades, setTrades] = useState<MockTrade[]>([]);
  const [realizedPnl, setRealizedPnl] = useState(0);

  const spec = SYMBOLS[symbolIndex];
  const account = ACCOUNTS.find((item) => item.id === accountId) ?? ACCOUNTS[0];
  const bidRef = useRef(bid);
  bidRef.current = bid;
  const workingPrice = orderType === 'Market' ? ask : limitPrice;
  const markPrice = (bid + ask) / 2;

  const quoteFor = (symbol: string) => quotes[symbol] ?? { bid, ask };
  const symbolPositions = positions.filter((position) => position.symbol === spec.label);
  const unrealizedPnl = positions.reduce((sum, position) => {
    const positionSpec = SYMBOLS.find((item) => item.label === position.symbol) ?? spec;
    const quote = quoteFor(position.symbol);
    return sum + positionPnl(position, positionSpec, quote.bid, quote.ask);
  }, 0);
  const equity = account.start + realizedPnl + unrealizedPnl;
  const maxLossLevel = account.start * (1 - account.maxDdPct);
  const dailyLimit = account.start * account.dailyPct;
  const profitTarget = account.start * account.targetPct;
  const dailyPnl = realizedPnl + unrealizedPnl;
  const dailyLossUsed = Math.max(0, -Math.min(0, dailyPnl));
  const goalProgress = Math.max(0, (realizedPnl + unrealizedPnl) / profitTarget);
  const netLots = symbolPositions.reduce((sum, position) => sum + position.lots, 0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setClock(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    setClock(
      new Date().toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyQuote = (nextBid: number, nextAsk: number) => {
      if (cancelled) return;
      setBid(nextBid);
      setAsk(nextAsk);
      setQuotes((current) => ({ ...current, [spec.label]: { bid: nextBid, ask: nextAsk } }));
    };

    const loadQuote = async () => {
      if (spec.binance) {
        try {
          const response = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${spec.binance}`);
          if (!response.ok) throw new Error('quote failed');
          const data = await response.json();
          const nextBid = Number(data.bidPrice);
          const nextAsk = Number(data.askPrice);
          if (nextBid && nextAsk) {
            applyQuote(nextBid, nextAsk);
            return;
          }
        } catch {
          // Fall through to a local tick so the mock still moves.
        }
      }

      const step = spec.pipSize * (Math.random() > 0.5 ? 1 : -1);
      const nextBid = Math.max(spec.pipSize, bidRef.current + step);
      applyQuote(nextBid, nextBid + spec.spread);
    };

    applyQuote(spec.seed, spec.seed + spec.spread);
    setLimitPrice(spec.seed);
    void loadQuote();
    const id = window.setInterval(() => {
      void loadQuote();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [spec]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const flash = (message: string) => setNotice(message);

  const closePositionById = useCallback((id: string) => {
    const target = positions.find((position) => position.id === id);
    if (!target) return;
    const positionSpec = SYMBOLS.find((item) => item.label === target.symbol) ?? SYMBOLS[0];
    const quote = quotes[target.symbol] ?? { bid: bidRef.current, ask };
    const pnl = positionPnl(target, positionSpec, quote.bid, quote.ask);
    setPositions((current) => current.filter((position) => position.id !== id));
    setRealizedPnl((value) => value + pnl);
    setTrades((existing) => [
      {
        id: `${id}-close`,
        time: nowTime(),
        symbol: target.symbol,
        side: target.lots > 0 ? 'sell' : 'buy',
        lots: Math.abs(target.lots),
        price: target.lots > 0 ? quote.bid : quote.ask,
        pnl,
      },
      ...existing,
    ]);
    flash(`Closed ${formatLots(Math.abs(target.lots))} lots ${target.symbol} · ${signedMoney(pnl)}`);
  }, [ask, positions, quotes]);

  const placeOrder = (side: Side) => {
    const qty = Math.max(0.01, Number(lots.toFixed(2)));
    const price = orderType === 'Market' ? (side === 'buy' ? ask : bid) : limitPrice;
    const signedLots = side === 'buy' ? qty : -qty;
    const time = nowTime();
    const id = `${Date.now()}-${side}`;

    if (orderType === 'Market') {
      setPositions((current) => [
        {
          id,
          time,
          symbol: spec.label,
          lots: signedLots,
          entryPrice: price,
        },
        ...current,
      ]);
      setTrades((current) => [
        { id, time, symbol: spec.label, side, lots: qty, price, pnl: 0 },
        ...current,
      ]);
      setBottomTab('Positions');
      flash(`${side === 'buy' ? 'Bought' : 'Sold'} ${formatLots(qty)} lots ${spec.label} @ ${formatPrice(price, spec.digits)}`);
      return;
    }

    setOrders((current) => [
      {
        id,
        time,
        symbol: spec.label,
        side,
        lots: qty,
        type: orderType,
        price,
        status: 'Working',
      },
      ...current,
    ]);
    setBottomTab('Orders');
    flash(`${orderType} ${side.toUpperCase()} ${formatLots(qty)} lots ${spec.label} queued`);
  };

  const flattenAll = () => {
    let realized = 0;
    const closeTrades: MockTrade[] = [];
    positions.forEach((position) => {
      const positionSpec = SYMBOLS.find((item) => item.label === position.symbol) ?? spec;
      const quote = quoteFor(position.symbol);
      const pnl = positionPnl(position, positionSpec, quote.bid, quote.ask);
      realized += pnl;
      closeTrades.push({
        id: `${position.id}-flat`,
        time: nowTime(),
        symbol: position.symbol,
        side: position.lots > 0 ? 'sell' : 'buy',
        lots: Math.abs(position.lots),
        price: position.lots > 0 ? quote.bid : quote.ask,
        pnl,
      });
    });
    setRealizedPnl((value) => value + realized);
    setTrades((current) => [...closeTrades, ...current]);
    setPositions([]);
    setOrders([]);
    flash('All simulated positions flattened.');
  };

  const closeCurrentSymbol = () => {
    if (symbolPositions.length === 0) {
      flash('No open position on this symbol.');
      return;
    }
    symbolPositions.forEach((position) => closePositionById(position.id));
  };

  const reverseCurrentSymbol = () => {
    if (symbolPositions.length === 0) {
      flash('No open position to reverse.');
      return;
    }
    const net = symbolPositions.reduce((sum, position) => sum + position.lots, 0);
    let realized = 0;
    const closeTrades: MockTrade[] = [];
    symbolPositions.forEach((position) => {
      const quote = quoteFor(position.symbol);
      const pnl = positionPnl(position, spec, quote.bid, quote.ask);
      realized += pnl;
      closeTrades.push({
        id: `${position.id}-rev`,
        time: nowTime(),
        symbol: position.symbol,
        side: position.lots > 0 ? 'sell' : 'buy',
        lots: Math.abs(position.lots),
        price: position.lots > 0 ? quote.bid : quote.ask,
        pnl,
      });
    });
    const ids = new Set(symbolPositions.map((position) => position.id));
    setRealizedPnl((value) => value + realized);
    setTrades((current) => [...closeTrades, ...current]);
    setPositions((current) => {
      const remaining = current.filter((position) => !ids.has(position.id));
      if (Math.abs(net) < 0.01) return remaining;
      const side: Side = net > 0 ? 'sell' : 'buy';
      const qty = Math.abs(net);
      const price = side === 'buy' ? ask : bid;
      return [
        {
          id: `${Date.now()}-rev`,
          time: nowTime(),
          symbol: spec.label,
          lots: side === 'buy' ? qty : -qty,
          entryPrice: price,
        },
        ...remaining,
      ];
    });
    flash(`Reversed into ${net > 0 ? 'SELL' : 'BUY'} ${formatLots(Math.abs(net))} lots @ ${formatPrice(net > 0 ? bid : ask, spec.digits)}`);
  };

  const tools = [
    { id: 'chart', icon: BarChart2, label: 'Chart', action: () => setActiveTool('chart') },
    { id: 'positions', icon: LayoutList, label: 'Positions', action: () => { setActiveTool('positions'); setBottomTab('Positions'); } },
    { id: 'orders', icon: ClipboardList, label: 'Orders', action: () => { setActiveTool('orders'); setBottomTab('Orders'); } },
    { id: 'trades', icon: History, label: 'Trades', action: () => { setActiveTool('trades'); setBottomTab('Trades'); } },
    { id: 'quotes', icon: Activity, label: 'Quotes', action: () => { setActiveTool('quotes'); setBottomTab('Quotes'); } },
    { id: 'news', icon: Newspaper, label: 'News', action: () => flash('News desk coming soon.') },
  ];

  return (
    <div className="h-full w-full bg-[#0A0A0A] text-white overflow-y-auto md:overflow-hidden">
      <div className="h-full min-h-full grid grid-cols-1 grid-rows-[auto_minmax(280px,46vh)_auto_auto] md:grid-cols-[52px_minmax(0,1fr)_280px] md:grid-rows-[auto_minmax(0,1fr)_200px] md:h-full">
        <header className="col-span-1 md:col-span-3 md:col-start-1 md:row-start-1 border-b border-[#2F2F2F] bg-[#101010] px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black text-[11px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-md shadow-[0_0_12px_rgba(15,241,206,0.28)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-[0.18em] bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent">
              SHOCKWAVEX
            </span>
            <span className="text-[9px] uppercase tracking-[0.16em] text-gray-500">coming soon</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
            <select
              value={account.id}
              onChange={(event) => {
                setAccountId(event.target.value as (typeof ACCOUNTS)[number]['id']);
                setPositions([]);
                setOrders([]);
                setTrades([]);
                setRealizedPnl(0);
              }}
              className="bg-[#161616] border border-[#2F2F2F] rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#0FF1CE]"
            >
              {ACCOUNTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Stat label="BAL" value={money(equity)} />
            <Stat label="MLL" value={money(maxLossLevel)} />
            <Stat label="RP&L" value={signedMoney(realizedPnl)} accent={realizedPnl > 0 ? 'positive' : realizedPnl < 0 ? 'negative' : undefined} />
            <Stat label="UP&L" value={signedMoney(unrealizedPnl)} accent={unrealizedPnl > 0 ? 'positive' : unrealizedPnl < 0 ? 'negative' : undefined} />
            <Stat label="DLL" value={`${money(dailyLossUsed)} / ${money(dailyLimit)}`} accent={dailyLossUsed > 0 ? 'negative' : undefined} />
          </div>

          <div className="flex items-center gap-2 min-w-[140px] flex-1">
            <span className="text-[10px] text-gray-500 whitespace-nowrap">Target</span>
            <div className="flex-1 max-w-[180px] h-1.5 rounded-full bg-[#2F2F2F] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF]"
                style={{ width: `${Math.min(100, goalProgress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-[#0FF1CE]">{money(profitTarget)}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto text-[11px] text-gray-400">
            <button
              type="button"
              onClick={() => flash('Price data refresh queued.')}
              className="inline-flex items-center gap-1 hover:text-[#0FF1CE] transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <Wifi size={14} className="text-[#0FF1CE]" />
            <span className="px-2 py-1 rounded border border-[#2F2F2F] bg-[#161616]">MT5 CFD</span>
          </div>
        </header>

        <aside className="hidden md:flex md:col-start-1 md:row-start-2 md:row-span-2 flex-col items-center gap-1 py-3 border-r border-[#2F2F2F] bg-[#0D0D0D]">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                onClick={tool.action}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-[#0FF1CE]/15 text-[#0FF1CE] border border-[#0FF1CE]/30'
                    : 'text-gray-500 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 border border-transparent'
                }`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </aside>

        <section className="relative min-h-[280px] md:min-h-0 md:col-start-2 md:row-start-2 bg-[#0D0D0D] border-b md:border-b-0 border-[#2F2F2F]">
          <ShockwaveXChart
            key={spec.tv}
            symbol={spec.tv}
            priceDigits={spec.digits}
            currentPrice={markPrice}
            positions={symbolPositions.map((position) => ({
              id: position.id,
              lots: position.lots,
              entryPrice: position.entryPrice,
              pnl: positionPnl(position, spec, bid, ask),
              pips: positionPips(position, spec, bid, ask),
            }))}
            onClosePosition={closePositionById}
          />
        </section>

        <aside className="md:col-start-3 md:row-start-2 md:row-span-2 border-t md:border-t-0 md:border-l border-[#2F2F2F] bg-[#101010] flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2F2F2F]">
            <span className="text-sm font-semibold">Order</span>
            <div className="flex items-center gap-2 text-gray-500">
              <Settings size={14} />
              <X size={14} />
            </div>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {notice && (
              <p className="text-[10px] text-[#0FF1CE] bg-[#0FF1CE]/10 border border-[#0FF1CE]/20 rounded px-2 py-1.5">
                {notice}
              </p>
            )}

            <SelectField
              label="Symbol"
              value={spec.label}
              options={SYMBOLS.map((item) => item.label)}
              onChange={(value) => {
                const index = SYMBOLS.findIndex((item) => item.label === value);
                setSymbolIndex(Math.max(0, index));
              }}
            />

            <SelectField
              label="Order Type"
              value={orderType}
              options={[...ORDER_TYPES]}
              onChange={(value) => setOrderType(value as OrderType)}
            />

            <label className="block">
              <span className="text-[11px] text-gray-400">Number of lots</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={lots}
                onChange={(event) => setLots(Math.max(0.01, Number(Number(event.target.value).toFixed(2)) || 0.01))}
                className="mt-1 w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0FF1CE]"
              />
            </label>

            {orderType !== 'Market' && (
              <label className="block">
                <span className="text-[11px] text-gray-400">Price</span>
                <input
                  type="number"
                  step={spec.pipSize}
                  value={limitPrice}
                  onChange={(event) => setLimitPrice(Number(event.target.value) || 0)}
                  className="mt-1 w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0FF1CE]"
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-[#0D0D0D] border border-[#2F2F2F] py-2">
                <div className="text-[10px] text-gray-400">Bid</div>
                <div className="text-sm font-semibold text-red-400">{formatPrice(bid, spec.digits)}</div>
              </div>
              <div className="rounded-md bg-[#0D0D0D] border border-[#2F2F2F] py-2">
                <div className="text-[10px] text-gray-400">Ask</div>
                <div className="text-sm font-semibold text-[#0FF1CE]">{formatPrice(ask, spec.digits)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              {LOT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLots(preset)}
                  className={`w-9 h-9 rounded-full text-[10px] font-semibold border transition-colors ${
                    Math.abs(lots - preset) < 0.001
                      ? 'bg-[#0FF1CE] text-black border-[#0FF1CE]'
                      : 'bg-[#161616] text-gray-300 border-[#2F2F2F] hover:border-[#0FF1CE]/40'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLots((current) => Number((current + 0.01).toFixed(2)))}
                className="w-9 h-9 rounded-full text-xs font-semibold bg-[#161616] text-gray-300 border border-[#2F2F2F] hover:border-[#0FF1CE]/40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => placeOrder('buy')}
              className="w-full bg-[#16a34a] hover:bg-[#22c55e] text-white font-bold py-3 rounded-md transition-colors"
            >
              BUY +{formatLots(lots)} @ {orderType === 'Market' ? 'MARKET' : formatPrice(workingPrice, spec.digits)}
            </button>
            <button
              type="button"
              onClick={() => placeOrder('sell')}
              className="w-full bg-[#dc2626] hover:bg-[#ef4444] text-white font-bold py-3 rounded-md transition-colors"
            >
              SELL -{formatLots(lots)} @ {orderType === 'Market' ? 'MARKET' : formatPrice(limitPrice, spec.digits)}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <ActionButton label="JOIN BID" onClick={() => { setOrderType('Limit'); setLimitPrice(bid); flash('Limit joined to bid.'); }} />
              <ActionButton label="JOIN ASK" onClick={() => { setOrderType('Limit'); setLimitPrice(ask); flash('Limit joined to ask.'); }} />
              <ActionButton label="CLOSE POSITION" onClick={closeCurrentSymbol} />
              <ActionButton label="REVERSE POSITION" onClick={reverseCurrentSymbol} />
              <ActionButton label="CANCEL ORDERS" onClick={() => { setOrders([]); flash('Working orders cancelled.'); }} />
              <ActionButton label="FLATTEN ALL" onClick={flattenAll} />
              <ActionButton label="CANCEL ALL" className="col-span-2" onClick={() => { setOrders([]); flash('All simulated orders cancelled.'); }} />
            </div>
          </div>
        </aside>

        <section className="md:col-start-2 md:row-start-3 border-t border-[#2F2F2F] bg-[#0F0F0F] flex flex-col min-h-[180px]">
          <div className="flex items-center gap-1 overflow-x-auto px-2 pt-2 border-b border-[#2F2F2F]">
            {BOTTOM_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBottomTab(tab)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-t-md ${
                  bottomTab === tab
                    ? 'text-[#0FF1CE] border border-[#2F2F2F] border-b-transparent bg-[#151515]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {bottomTab === 'Accounts' && (
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr className="border-b border-[#2F2F2F]">
                    <Th>Account</Th>
                    <Th>Balance</Th>
                    <Th>MLL</Th>
                    <Th>RP&L</Th>
                    <Th>UP&L</Th>
                    <Th>Target</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-200">
                    <Td>{account.name}</Td>
                    <Td>{money(equity)}</Td>
                    <Td>{money(maxLossLevel)}</Td>
                    <Td className={realizedPnl > 0 ? 'text-[#0FF1CE]' : realizedPnl < 0 ? 'text-red-400' : ''}>{signedMoney(realizedPnl)}</Td>
                    <Td className={unrealizedPnl > 0 ? 'text-[#0FF1CE]' : unrealizedPnl < 0 ? 'text-red-400' : ''}>{signedMoney(unrealizedPnl)}</Td>
                    <Td className="text-[#0FF1CE]">{money(profitTarget)}</Td>
                  </tr>
                </tbody>
              </table>
            )}

            {bottomTab === 'Positions' && (
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr className="border-b border-[#2F2F2F]">
                    <Th>Time</Th>
                    <Th>Symbol</Th>
                    <Th>Lots</Th>
                    <Th>Entry</Th>
                    <Th>Mark</Th>
                    <Th>P&L</Th>
                    <Th>Pips</Th>
                    <Th>Close</Th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <EmptyRow text="No open positions" cols={8} />
                  ) : (
                    positions.map((position) => {
                      const positionSpec = SYMBOLS.find((item) => item.label === position.symbol) ?? spec;
                      const quote = quoteFor(position.symbol);
                      const mark = position.lots > 0 ? quote.bid : quote.ask;
                      const pnl = positionPnl(position, positionSpec, quote.bid, quote.ask);
                      const pips = positionPips(position, positionSpec, quote.bid, quote.ask);
                      return (
                        <tr key={position.id} className="border-b border-[#2F2F2F]/70 text-gray-200">
                          <Td>{position.time}</Td>
                          <Td>{position.symbol}</Td>
                          <Td className={position.lots > 0 ? 'text-[#0FF1CE]' : 'text-red-400'}>
                            {position.lots > 0 ? '+' : ''}{formatLots(position.lots)}
                          </Td>
                          <Td>{formatPrice(position.entryPrice, positionSpec.digits)}</Td>
                          <Td>{formatPrice(mark, positionSpec.digits)}</Td>
                          <Td className={pnl > 0 ? 'text-[#0FF1CE]' : pnl < 0 ? 'text-red-400' : ''}>{signedMoney(pnl)}</Td>
                          <Td>{pips >= 0 ? '+' : ''}{pips.toFixed(1)}</Td>
                          <Td>
                            <button
                              type="button"
                              onClick={() => closePositionById(position.id)}
                              className="text-[10px] text-red-400 hover:text-red-300"
                            >
                              Close
                            </button>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {bottomTab === 'Orders' && (
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr className="border-b border-[#2F2F2F]">
                    <Th>Time</Th>
                    <Th>Symbol</Th>
                    <Th>Side</Th>
                    <Th>Lots</Th>
                    <Th>Type</Th>
                    <Th>Price</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <EmptyRow text="No working orders" cols={7} />
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="border-b border-[#2F2F2F]/70 text-gray-200">
                        <Td>{order.time}</Td>
                        <Td>{order.symbol}</Td>
                        <Td className={order.side === 'buy' ? 'text-[#0FF1CE]' : 'text-red-400'}>{order.side.toUpperCase()}</Td>
                        <Td>{formatLots(order.lots)}</Td>
                        <Td>{order.type}</Td>
                        <Td>{formatPrice(order.price, spec.digits)}</Td>
                        <Td>{order.status}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {bottomTab === 'Trades' && (
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr className="border-b border-[#2F2F2F]">
                    <Th>Time</Th>
                    <Th>Symbol</Th>
                    <Th>Side</Th>
                    <Th>Lots</Th>
                    <Th>Price</Th>
                    <Th>P&L</Th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <EmptyRow text="No fills yet" cols={6} />
                  ) : (
                    trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-[#2F2F2F]/70 text-gray-200">
                        <Td>{trade.time}</Td>
                        <Td>{trade.symbol}</Td>
                        <Td className={trade.side === 'buy' ? 'text-[#0FF1CE]' : 'text-red-400'}>{trade.side.toUpperCase()}</Td>
                        <Td>{formatLots(trade.lots)}</Td>
                        <Td>{formatPrice(trade.price, spec.digits)}</Td>
                        <Td className={trade.pnl > 0 ? 'text-[#0FF1CE]' : trade.pnl < 0 ? 'text-red-400' : ''}>{signedMoney(trade.pnl)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {bottomTab === 'Quotes' && (
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr className="border-b border-[#2F2F2F]">
                    <Th>Symbol</Th>
                    <Th>Bid</Th>
                    <Th>Ask</Th>
                    <Th>Spread</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-200">
                    <Td>{spec.label}</Td>
                    <Td className="text-red-400">{formatPrice(bid, spec.digits)}</Td>
                    <Td className="text-[#0FF1CE]">{formatPrice(ask, spec.digits)}</Td>
                    <Td>{((ask - bid) / spec.pipSize).toFixed(1)} pips</Td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#2F2F2F] text-[10px] text-gray-500">
            <span>{clock} UTC</span>
            <span>Net {netLots >= 0 ? '+' : ''}{formatLots(netLots)} lots · {spec.label}</span>
            <span>ShockwaveX preview v0.2</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'positive' | 'negative';
}) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-gray-500 mr-1">{label}:</span>
      <span className={accent === 'positive' ? 'text-[#0FF1CE]' : accent === 'negative' ? 'text-red-400' : 'text-gray-200'}>
        {value}
      </span>
    </span>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-gray-400">{label}</span>
      <div className="relative mt-1">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-[#0D0D0D] border border-[#2F2F2F] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0FF1CE]"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  className = '',
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-[#1A1A1A] hover:bg-[#222] border border-[#2F2F2F] text-[10px] font-semibold tracking-wide text-gray-200 py-2 rounded-md transition-colors ${className}`}
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2 whitespace-nowrap">{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 whitespace-nowrap ${className}`}>{children}</td>;
}

function EmptyRow({ text, cols }: { text: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-gray-500">
        {text}
      </td>
    </tr>
  );
}
