'use client';

import { Card, Label } from './ui';
import type { CalendarEvent } from '@/types';
import { hhmmToMin, dayOfYear, isoWeek } from '@/lib/utils';

export function Hero({ now, events }: { now: Date; events: CalendarEvent[] }) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextEvt = events.find((e) => hhmmToMin(e.start) > nowMin);
  const minsToNext = nextEvt ? hhmmToMin(nextEvt.start) - nowMin : 0;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const wk = isoWeek(now);
  const doy = dayOfYear(now);

  return (
    <Card hero>
      <div className="flex items-baseline gap-4 flex-wrap">
        <div className="font-mono text-[44px] sm:text-[56px] leading-none font-medium tracking-tight">
          {hh}
          <span className="text-inkDim">:</span>
          {mm}
        </div>
        <div>
          <Label color="#a7f3b4">
            {now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
          </Label>
          <div className="text-base sm:text-lg font-semibold mt-0.5">
            {now.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <div className="text-inkDim text-[11px]">
            Week {wk} · Day {doy} of 365
          </div>
        </div>
        <div className="flex-1" />
        {nextEvt && (
          <div className="text-right shrink-0">
            <Label>Next up · in {minsToNext} min</Label>
            <div className="text-sm font-semibold mt-0.5">{nextEvt.title}</div>
            <div className="text-inkDim text-[11px]">
              {nextEvt.start} → {nextEvt.end} · {nextEvt.where}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
