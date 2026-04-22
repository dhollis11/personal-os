'use client';

import { useEffect, useState } from 'react';
import { Label } from './ui';
import type { Weather as W } from '@/types';
import { SEED_WEATHER } from '@/lib/seed-data';

export function Weather() {
  const [list, setList] = useState<W[]>(SEED_WEATHER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/weather')
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.weather) return;
        setList(d.weather);
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex gap-2">
      {list.map((w) => (
        <div
          key={w.code}
          className="flex-1 min-w-0 px-3 py-2.5 bg-panelHi rounded-[10px] border border-rule"
        >
          <div className="flex justify-between items-baseline gap-2">
            <Label>{w.code}</Label>
            <div className="font-mono text-[9px] text-inkDim shrink-0">{w.tz}</div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <div className="text-[28px] font-medium leading-none">{w.temp}°</div>
            <div className="text-inkDim text-[10px] shrink-0">
              {w.hi}/{w.lo}
            </div>
          </div>
          <div className="text-[11px] text-inkMid mt-1 truncate">
            {w.city.split(',')[0]}
          </div>
          <div className="text-[10px] text-inkDim truncate">{w.cond}</div>
        </div>
      ))}
      {!loaded && (
        <span className="sr-only" aria-live="polite">
          Loading weather
        </span>
      )}
    </div>
  );
}
