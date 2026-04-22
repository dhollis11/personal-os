import { NextResponse } from 'next/server';
import type { Weather } from '@/types';
import { SEED_WEATHER } from '@/lib/seed-data';

// The three cities from the original design — configurable via env later.
const LOCATIONS = [
  { city: 'Columbus, OH',  code: 'CMH', lat: 39.9612, lon: -82.9988, tz: 'America/New_York', unit: 'fahrenheit' as const },
  { city: 'Delaware, OH',  code: 'DLO', lat: 40.2986, lon: -83.0678, tz: 'America/New_York', unit: 'fahrenheit' as const },
  { city: 'Cebu City, PH', code: 'CEB', lat: 10.3157, lon: 123.8854, tz: 'Asia/Manila',     unit: 'fahrenheit' as const },
];

// Open-Meteo's weather_code to a short condition string.
// Reference: https://open-meteo.com/en/docs (WMO weather codes)
function codeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return '—';
}

function tzAbbrev(tz: string, date: Date): string {
  // Try to pull the tz abbreviation via Intl. Falls back gracefully.
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value ?? tz;
  } catch {
    return tz;
  }
}

async function fetchOne(loc: (typeof LOCATIONS)[number]): Promise<Weather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(loc.lat));
  url.searchParams.set('longitude', String(loc.lon));
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('temperature_unit', loc.unit);
  url.searchParams.set('timezone', loc.tz);
  url.searchParams.set('forecast_days', '1');

  const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const data = await res.json();

  return {
    city: loc.city,
    code: loc.code,
    temp: Math.round(data.current.temperature_2m),
    hi:   Math.round(data.daily.temperature_2m_max?.[0] ?? 0),
    lo:   Math.round(data.daily.temperature_2m_min?.[0] ?? 0),
    cond: codeToCondition(data.current.weather_code),
    tz:   tzAbbrev(loc.tz, new Date()),
  };
}

export async function GET() {
  try {
    const results = await Promise.all(LOCATIONS.map(fetchOne));
    return NextResponse.json({ weather: results, source: 'open-meteo' });
  } catch (err) {
    // If anything blows up, hand back seed data so the UI keeps rendering.
    console.error('[weather] fallback to seed:', err);
    return NextResponse.json({ weather: SEED_WEATHER, source: 'seed' });
  }
}
