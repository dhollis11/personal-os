'use client';

import { Label } from './ui';
import type { CalendarEvent } from '@/types';

// Events per weekday, computed from the event list (simple: all on today for stub)
export function WeekView({
  now,
  events,
}: {
  now: Date;
  events: CalendarEvent[];
}) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const day = (today.getDay() + 6) % 7; // 0 = Mon
  monday.setDate(today.getDate() - day);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.getTime() === today.getTime();
    // Stub load: real events count on today, zero elsewhere.
    // When a real calendar is wired, this becomes a per-day count.
    const load = isToday ? events.length : 0;
    return {
      d: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3),
      date: d.getDate(),
      today: isToday,
      load,
    };
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => (
        <div
          key={i}
          className="rounded-[10px] p-2.5 min-h-[86px]"
          style={{
            background: d.today
              ? 'linear-gradient(180deg, #1a1e26, #222836)'
              : '#1a1e26',
            border: `1px solid ${d.today ? '#a7f3b4' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <div className="flex justify-between items-baseline">
            <Label color={d.today ? '#a7f3b4' : undefined}>{d.d}</Label>
            <div className="font-mono text-[16px] font-semibold">{d.date}</div>
          </div>
          <div className="mt-2.5 flex gap-[3px] items-end h-5">
            {Array.from({ length: 7 }, (_, j) => {
              const filled = j < d.load;
              return (
                <div
                  key={j}
                  className="flex-1 rounded-sm"
                  style={{
                    height: filled ? `${60 + j * 6}%` : '4px',
                    background: filled
                      ? d.today
                        ? '#a7f3b4'
                        : '#7db6ff'
                      : 'rgba(255,255,255,0.06)',
                  }}
                />
              );
            })}
          </div>
          <div className="font-mono text-[10px] text-inkDim mt-1.5">
            {d.load} event{d.load === 1 ? '' : 's'}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MonthView({ now }: { now: Date }) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (firstDay.getDay() + 6) % 7; // Mon-first
  const todayDate = now.getDate();

  type Cell = { date: number | null; today?: boolean; events?: number };
  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    // Synthetic event counts — replace when real calendar is wired
    const events = ((d * 7 + month * 3) % 5) + (d % 7 === 0 ? 0 : 1);
    cells.push({ date: d, today: d === todayDate, events });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const headers = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {headers.map((h, i) => (
          <div
            key={i}
            className="text-center font-mono text-[10px] text-inkDim"
          >
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => (
          <div
            key={i}
            className="rounded-lg min-h-[62px] p-1.5"
            style={{
              background: c.today
                ? 'rgba(167,243,180,0.08)'
                : c.date
                  ? '#1a1e26'
                  : 'transparent',
              border: `1px solid ${c.today ? '#a7f3b4' : c.date ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
            }}
          >
            {c.date && (
              <>
                <div
                  className="font-mono text-[12px]"
                  style={{
                    fontWeight: c.today ? 700 : 500,
                    color: c.today ? '#a7f3b4' : '#e6e8ed',
                  }}
                >
                  {c.date}
                </div>
                <div className="mt-1.5 flex gap-0.5 flex-wrap">
                  {Array.from({ length: Math.min(c.events ?? 0, 5) }, (_, j) => {
                    const cnt = c.events ?? 0;
                    const color = cnt >= 5 ? '#ff8a7a' : cnt >= 3 ? '#ffd27a' : '#7db6ff';
                    return (
                      <span
                        key={j}
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ background: color }}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Quote({ text, author }: { text: string; author: string }) {
  return (
    <div>
      <Label>Quote · Daily</Label>
      <div className="text-[16px] mt-1.5 leading-snug font-medium">
        &ldquo;{text}&rdquo;
      </div>
      <div className="text-inkDim text-[11px] mt-2 font-mono tracking-label">
        — {author.toUpperCase()}
      </div>
    </div>
  );
}
