'use client';

import { useEffect, useState } from 'react';
import { Label } from './ui';
import type { FxQuote } from '@/types';
import { SEED_FX } from '@/lib/seed-data';
import { fmt } from '@/lib/utils';

function Sparkline({
  data,
  color,
  width = 260,
  height = 36,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = (max - min) * 0.2 || 0.05;
  const lo = min - pad;
  const hi = max + pad;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - lo) / (hi - lo)) * height;
    return [x, y] as const;
  });
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity="0.25" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Fx() {
  const [q, setQ] = useState<FxQuote>(SEED_FX);
  // User can invert the pair or change the "from" amount.
  const [amount, setAmount] = useState(1000);
  const [inverted, setInverted] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/fx')
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.fx) return;
        setQ(d.fx);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const up = q.change >= 0;
  const color = up ? '#a7f3b4' : '#ff8a7a';

  // Direction toggle: USD→PHP or PHP→USD
  const fromSym = inverted ? '₱' : '$';
  const toSym = inverted ? '$' : '₱';
  const pairLabel = inverted ? 'PHP / USD' : 'USD / PHP';
  const effectiveRate = inverted ? 1 / q.rate : q.rate;
  const converted = amount * effectiveRate;
  const rateLabel = inverted
    ? `1 ₱ = $${fmt(1 / q.rate, 6)}`
    : `1 $ = ₱${fmt(q.rate, 4)}`;

  return (
    <div>
      <div className="flex justify-between items-baseline gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setInverted((i) => !i)}
            title="Flip pair"
            className="clabel hover:text-ink transition-colors"
          >
            {pairLabel} ⇄
          </button>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="font-mono text-[14px] text-inkDim">{fromSym}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="w-[72px] bg-transparent border-b border-rule text-ink font-mono text-[14px] outline-none focus:border-inkDim"
            />
            <span className="font-mono text-[14px] text-inkDim">=</span>
            <span className="text-[22px] sm:text-[24px] font-semibold tracking-tight">
              {toSym}
              {fmt(converted, 2)}
            </span>
          </div>
        </div>
        <div
          className="px-2 py-0.5 rounded-full font-mono text-[11px] whitespace-nowrap shrink-0"
          style={{
            background: up ? 'rgba(167,243,180,0.12)' : 'rgba(255,138,122,0.12)',
            color,
          }}
        >
          {up ? '↑' : '↓'} {up ? '+' : ''}
          {q.pct.toFixed(2)}%
        </div>
      </div>
      <div className="mt-2">
        <Sparkline data={q.spark} color={color} />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-inkDim mt-1 gap-2">
        <span className="truncate">{rateLabel}</span>
        <span className="shrink-0">
          24h {up ? '+' : ''}
          {q.change.toFixed(2)}
        </span>
        <span className="truncate text-right">{q.asof}</span>
      </div>
    </div>
  );
}
