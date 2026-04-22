import type {
  Task, Occasion, CalendarEvent, NewsItem, Quote, Weather, FxQuote,
} from '@/types';

// These match the content in the original design mock so the UI lands
// looking identical to what you approved. Real data replaces them as we
// wire integrations.

export const SEED_EVENTS: CalendarEvent[] = [
  { id: 'e1', start: '08:30', end: '09:00', title: 'Standup — Platform', where: 'Teams', type: 'meeting', color: 'amber', source: 'stub' },
  { id: 'e2', start: '10:00', end: '10:45', title: '1:1 w/ Priya',       where: 'Room 4B', type: 'meeting', color: 'amber', source: 'stub' },
  { id: 'e3', start: '11:30', end: '12:15', title: 'Design review',     where: 'Zoom', type: 'meeting', color: 'green', source: 'stub' },
  { id: 'e4', start: '13:00', end: '13:30', title: 'Lunch — Sonia',      where: 'North Market', type: 'personal', color: 'cyan', source: 'stub' },
  { id: 'e5', start: '14:30', end: '15:30', title: 'Quarterly planning', where: 'Boardroom', type: 'focus', color: 'amber', source: 'stub' },
  { id: 'e6', start: '16:00', end: '16:30', title: 'Vendor call',        where: 'Phone', type: 'meeting', color: 'amber', source: 'stub' },
  { id: 'e7', start: '19:15', end: '21:00', title: 'Blue Jackets vs Rangers', where: 'Nationwide Arena', type: 'personal', color: 'red', source: 'stub' },
];

export const SEED_TASKS: Task[] = [
  { id: 't1', list_name: 'Work', title: 'Finalize Q2 roadmap deck',      due: 'Today', due_at: null, done: false, priority: 'H', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't2', list_name: 'Work', title: 'Review PR #3421 — auth layer',  due: 'Today', due_at: null, done: false, priority: 'M', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't3', list_name: 'Work', title: 'Draft vendor comparison memo',  due: 'Thu',   due_at: null, done: false, priority: 'M', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't4', list_name: 'Work', title: 'Send offer — S. Patel',         due: 'Mon',   due_at: null, done: true,  priority: 'H', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't5', list_name: 'Work', title: 'Book flight ORD → MNL',         due: 'Fri',   due_at: null, done: false, priority: 'L', user_id: 'seed', created_at: '', updated_at: '' },

  { id: 't6', list_name: 'Home', title: 'Pick up dry cleaning',          due: 'Today', due_at: null, done: false, priority: 'L', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't7', list_name: 'Home', title: 'Pay electric bill',             due: 'Apr 28', due_at: null, done: false, priority: 'M', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't8', list_name: 'Home', title: 'Call mom',                      due: 'Today', due_at: null, done: false, priority: 'H', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't9', list_name: 'Home', title: 'Replace furnace filter',        due: 'Apr 30', due_at: null, done: false, priority: 'L', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't10', list_name: 'Home', title: "RSVP — Jake's wedding",        due: 'May 2', due_at: null, done: true,  priority: 'M', user_id: 'seed', created_at: '', updated_at: '' },

  { id: 't11', list_name: 'Disc Golf', title: 'Restring putters',        due: 'Sat', due_at: null, done: false, priority: 'L', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't12', list_name: 'Disc Golf', title: 'Register — Delaware Open', due: 'May 10', due_at: null, done: false, priority: 'M', user_id: 'seed', created_at: '', updated_at: '' },
  { id: 't13', list_name: 'Disc Golf', title: 'New midrange — Buzzz vs Mako3', due: '—', due_at: null, done: false, priority: 'L', user_id: 'seed', created_at: '', updated_at: '' },
];

export const SEED_OCCASIONS: Occasion[] = [
  { id: 'o1', who: 'Sonia R.',         when_label: 'Apr 24', when_date: '2026-04-24', kind: 'birthday', user_id: 'seed', created_at: '' },
  { id: 'o2', who: 'Anniv · Mom+Dad',  when_label: 'Apr 29', when_date: '2026-04-29', kind: 'anniv',    user_id: 'seed', created_at: '' },
  { id: 'o3', who: 'Marcus T.',        when_label: 'May 03', when_date: '2026-05-03', kind: 'birthday', user_id: 'seed', created_at: '' },
  { id: 'o4', who: 'Lita (Lola)',      when_label: 'May 11', when_date: '2026-05-11', kind: 'birthday', user_id: 'seed', created_at: '' },
];

export const SEED_NEWS: NewsItem[] = [
  { id: 'n1', cat: 'DISC GOLF',    src: 'UDisc',        time: '06:42', title: 'Buhr extends PDGA points lead after Texas States sweep', summary: 'Back-to-back wins push Buhr clear of the field.' },
  { id: 'n2', cat: 'BLUE JACKETS', src: 'The Athletic', time: '06:18', title: 'CBJ clinch wild card spot with OT win over Devils',      summary: 'First playoff berth since 2020 locked in.' },
  { id: 'n3', cat: 'US',           src: 'NYT',          time: '05:55', title: 'Fed holds rates steady, signals two cuts later this year', summary: 'Markets price in first cut by September.' },
  { id: 'n4', cat: 'MOVIES',       src: 'Variety',      time: '05:30', title: "Villeneuve's next set for 2027 — A24 boards",             summary: 'Original sci-fi, shooting in Iceland and Morocco this fall.' },
  { id: 'n5', cat: 'DISC GOLF',    src: 'DGPT',         time: '04:50', title: 'Discraft unveils limited ESP Buzzz run for Ledgestone',    summary: 'Tour-only release; pros get first crack at Waco.' },
  { id: 'n6', cat: 'US',           src: 'AP',           time: '04:12', title: 'Midwest storm system dumps record April snow',            summary: '10–13 inches reported across the Iron Range.' },
  { id: 'n7', cat: 'BLUE JACKETS', src: 'Jackets Cannon', time: '03:48', title: 'Laine skates in full gear for first time since injury', summary: 'Coach Evason calls it a "real good sign."' },
  { id: 'n8', cat: 'MOVIES',       src: 'IndieWire',    time: '03:10', title: 'Cannes 2026 lineup leaks ahead of Thursday reveal',       summary: 'Palme d\'Or race looks stacked.' },
];

export const SEED_QUOTE: Quote = {
  text: 'The best way out is always through.',
  author: 'Robert Frost',
};

// Fallbacks used only when the live APIs are unreachable. The real
// values come from /api/weather and /api/fx at runtime.
export const SEED_WEATHER: Weather[] = [
  { city: 'Columbus, OH',  code: 'CMH', temp: 58, hi: 64, lo: 44, cond: 'Partly cloudy',  tz: 'EDT' },
  { city: 'Delaware, OH',  code: 'DLO', temp: 56, hi: 63, lo: 42, cond: 'Partly cloudy',  tz: 'EDT' },
  { city: 'Cebu City, PH', code: 'CEB', temp: 88, hi: 92, lo: 79, cond: 'Thunderstorms',  tz: 'PHT' },
];

export const SEED_FX: FxQuote = {
  pair: 'USD / PHP',
  rate: 57.42,
  prev: 57.28,
  change: 0.14,
  pct: 0.24,
  asof: '—',
  spark: [57.18, 57.22, 57.19, 57.25, 57.28, 57.26, 57.31, 57.35, 57.33, 57.38, 57.40, 57.42],
};
