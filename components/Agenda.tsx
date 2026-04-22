'use client';

import type { CalendarEvent } from '@/types';
import { EVENT_COLORS, hhmmToMin } from '@/lib/utils';

export function Agenda({
  events,
  now,
  compact = false,
}: {
  events: CalendarEvent[];
  now: Date;
  compact?: boolean;
}) {
  const startH = 7;
  const endH = 22;
  const totalMin = (endH - startH) * 60;
  const nowMin = (now.getHours() - startH) * 60 + now.getMinutes();
  const nowPct = Math.max(0, Math.min(100, (nowMin / totalMin) * 100));
  const nowVisible = nowMin >= 0 && nowMin <= totalMin;

  const nowAbsMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div>
      {!compact && (
        <div className="relative h-[34px] mb-3 bg-panelHi rounded-lg border border-rule">
          {events.map((e) => {
            const sm = hhmmToMin(e.start) - startH * 60;
            const em = hhmmToMin(e.end) - startH * 60;
            const left = Math.max(0, (sm / totalMin) * 100);
            const width = Math.max(0.5, ((em - sm) / totalMin) * 100);
            return (
              <div
                key={e.id}
                title={`${e.title} · ${e.start}–${e.end}`}
                className="absolute top-[5px] bottom-[5px] rounded-[4px] opacity-85"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: EVENT_COLORS[e.color],
                }}
              />
            );
          })}
          {nowVisible && (
            <>
              <div
                className="absolute top-0 bottom-0 w-[1.5px] bg-ink"
                style={{ left: `${nowPct}%` }}
              />
              <div
                className="absolute -top-[14px] font-mono text-[9px] text-ink"
                style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
              >
                NOW
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {events.map((e, i) => {
          const past = hhmmToMin(e.end) < nowAbsMin;
          return (
            <div
              key={e.id}
              className={`grid gap-2.5 items-center py-1.5 ${
                i < events.length - 1 ? 'border-b border-rule' : ''
              }`}
              style={{
                gridTemplateColumns: '56px 4px 1fr auto',
                opacity: past ? 0.45 : 1,
              }}
            >
              <div className="font-mono text-[11px] text-inkDim">{e.start}</div>
              <div
                className="w-[3px] h-6 rounded-sm"
                style={{ background: EVENT_COLORS[e.color] }}
              />
              <div className="min-w-0">
                <div
                  className={`text-[12px] font-medium truncate ${
                    past ? 'text-inkDim line-through' : 'text-ink'
                  }`}
                >
                  {e.title}
                </div>
                {!compact && (
                  <div className="text-inkDim text-[11px] truncate">{e.where}</div>
                )}
              </div>
              <div className="font-mono text-[10px] text-inkDim">{e.end}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
