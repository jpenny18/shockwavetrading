'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export type ChartPositionOverlay = {
  id: string;
  lots: number;
  entryPrice: number;
  pnl: number;
  pips: number;
};

type ShockwaveXChartProps = {
  symbol?: string;
  priceDigits?: number;
  currentPrice?: number;
  positions?: ChartPositionOverlay[];
  onClosePosition?: (id: string) => void;
};

const money = (value: number) =>
  `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ShockwaveXChart({
  symbol = 'FX:EURUSD',
  priceDigits = 5,
  currentPrice = 0,
  positions = [],
  onClosePosition,
}: ShockwaveXChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [priceWindow, setPriceWindow] = useState<number[]>([]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    setReady(false);
    host.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '5',
      timezone: 'America/Chicago',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(13, 13, 13, 1)',
      gridColor: 'rgba(47, 47, 47, 0.55)',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: window.innerWidth < 768,
      allow_symbol_change: true,
      withdateranges: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(widget);
    widgetContainer.appendChild(script);
    host.appendChild(widgetContainer);

    const readyCheck = window.setInterval(() => {
      if (host.querySelector('iframe')) {
        setReady(true);
        window.clearInterval(readyCheck);
      }
    }, 250);

    return () => {
      window.clearInterval(readyCheck);
      host.innerHTML = '';
    };
  }, [symbol]);

  useEffect(() => {
    if (!currentPrice) return;
    setPriceWindow((windowPrices) => {
      const next = [...windowPrices, currentPrice];
      return next.length > 120 ? next.slice(-120) : next;
    });
  }, [currentPrice]);

  const overlayRange = useMemo(() => {
    const entries = positions.map((position) => position.entryPrice);
    const samples = [...priceWindow, currentPrice, ...entries].filter((value) => value > 0);
    if (samples.length === 0) return null;
    const high = Math.max(...samples);
    const low = Math.min(...samples);
    const pad = Math.max((high - low) * 0.18, currentPrice * 0.0008, 0.0001);
    return { high: high + pad, low: low - pad };
  }, [currentPrice, positions, priceWindow]);

  const hideSideToolbar = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="relative h-full w-full min-h-[280px] bg-[#0D0D0D]">
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0D0D0D]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#0FF1CE]/20 border-t-[#0FF1CE] animate-spin" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#0FF1CE]/80">Loading chart</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full shockwavex-tv" />

      {overlayRange && positions.length > 0 && (
        <div
          className="absolute z-20 pointer-events-none overflow-hidden"
          style={{
            top: 46,
            bottom: 30,
            left: hideSideToolbar ? 8 : 54,
            right: 62,
          }}
        >
          {positions.map((position) => {
            const y = ((overlayRange.high - position.entryPrice) / (overlayRange.high - overlayRange.low)) * 100;
            const clampedY = Math.min(92, Math.max(8, y));
            const isLong = position.lots > 0;
            const accent = isLong ? '#0FF1CE' : '#ef4444';
            return (
              <div
                key={position.id}
                className="absolute left-0 right-0"
                style={{ top: `${clampedY}%` }}
              >
                <div className="h-px w-full opacity-80" style={{ backgroundColor: accent }} />
                <div
                  className="absolute right-0 -translate-y-1/2 pointer-events-auto flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold shadow-lg"
                  style={{ backgroundColor: accent, color: isLong ? '#0D0D0D' : '#fff' }}
                >
                  <span>
                    {isLong ? 'BUY' : 'SELL'} {Math.abs(position.lots).toFixed(2)} @ {position.entryPrice.toFixed(priceDigits)}
                  </span>
                  <span className="opacity-90">{money(position.pnl)}</span>
                  <button
                    type="button"
                    onClick={() => onClosePosition?.(position.id)}
                    className="ml-0.5 rounded-sm bg-black/20 px-1 leading-none hover:bg-black/35"
                    aria-label="Close position"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .shockwavex-tv,
        .shockwavex-tv .tradingview-widget-container,
        .shockwavex-tv .tradingview-widget-container__widget,
        .shockwavex-tv iframe {
          height: 100% !important;
          width: 100% !important;
          background: #0d0d0d !important;
        }
      `}</style>
    </div>
  );
}
