import { NextResponse } from 'next/server';
import type { NewsItem, NewsCategory } from '@/types';
import { SEED_NEWS } from '@/lib/seed-data';

// To swap feeds, edit this list. Categories must match the colors defined in
// components/News.tsx (DISC GOLF / BLUE JACKETS / US / MOVIES / TECH).
//
// You can have multiple feeds per category — they get merged and sorted by
// publication date. Useful for resilience: if one source is down, the category
// still has fresh items from the other.
const FEEDS: Array<{
  cat: NewsCategory;
  src: string;
  url: string;
}> = [
  { cat: 'DISC GOLF',    src: 'Ultiworld',  url: 'https://discgolf.ultiworld.com/feed/' },
  { cat: 'BLUE JACKETS', src: 'Cannon',     url: 'https://www.jacketscannon.com/rss/current' },
  { cat: 'US',           src: 'NPR',        url: 'https://feeds.npr.org/1001/rss.xml' },
  { cat: 'MOVIES',       src: 'IndieWire',  url: 'https://www.indiewire.com/feed' },
  { cat: 'TECH',         src: 'HN',         url: 'https://news.ycombinator.com/rss' },
  { cat: 'TECH',         src: 'The Verge',  url: 'https://www.theverge.com/rss/index.xml' },
];

export const revalidate = 900; // cache 15 minutes
export const dynamic = 'force-dynamic';

// Pull a single tag's inner text from a chunk of XML — accepts both
// <tag>value</tag> and <tag><![CDATA[value]]></tag> forms.
function extract(xml: string, tag: string): string {
  // CDATA variant first
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i').exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  if (plain) return plain[1].trim();
  return '';
}

// Strip HTML tags and decode the most common entities for clean snippet text.
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Both RSS 2.0 and Atom are out there. Detect, extract item-like blocks.
function parseFeed(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: Date;
}> {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const itemTag = isAtom ? 'entry' : 'item';
  const blocks = xml.split(new RegExp(`</${itemTag}>`, 'i')).slice(0, -1);

  return blocks
    .map((block) => {
      const title = stripHtml(extract(block, 'title'));

      // Atom uses <link href="..."/>; RSS uses <link>...</link>
      let link = '';
      const atomLink = /<link[^>]*href="([^"]+)"/i.exec(block);
      if (atomLink) link = atomLink[1];
      else link = stripHtml(extract(block, 'link'));

      // Description fallbacks: description → content:encoded → summary → content
      const description = stripHtml(
        extract(block, 'description') ||
          extract(block, 'content:encoded') ||
          extract(block, 'summary') ||
          extract(block, 'content'),
      ).slice(0, 240);

      const dateStr =
        extract(block, 'pubDate') ||
        extract(block, 'published') ||
        extract(block, 'updated') ||
        extract(block, 'dc:date');
      const pubDate = dateStr ? new Date(dateStr) : new Date();

      return { title, link, description, pubDate };
    })
    .filter((x) => x.title && x.link);
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: 900 },
      headers: {
        // A few RSS hosts 403 the default Node UA. Pretend to be a browser.
        'User-Agent': 'Mozilla/5.0 (compatible; PersonalOS/1.0; +https://example.com)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml; q=0.9, */*; q=0.8',
      },
    });
    if (!res.ok) throw new Error(`${feed.src} ${res.status}`);
    const xml = await res.text();
    const items = parseFeed(xml);

    return items.slice(0, 4).map((it, i) => ({
      id: `${feed.cat}-${i}-${it.pubDate.getTime()}`,
      cat: feed.cat,
      src: feed.src,
      time: it.pubDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      title: it.title.slice(0, 200),
      summary: it.description,
      url: it.link,
      pubDate: it.pubDate.toISOString(),
    })) as (NewsItem & { pubDate: string })[];
  } catch (err) {
    console.error(`[news] feed failed (${feed.src}):`, err);
    return [];
  }
}

export async function GET() {
  try {
    const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();

    if (all.length === 0) {
      return NextResponse.json({ news: SEED_NEWS, source: 'seed' });
    }

    // Sort newest first across all sources
    all.sort((a, b) => {
      const aT = new Date((a as NewsItem & { pubDate: string }).pubDate).getTime();
      const bT = new Date((b as NewsItem & { pubDate: string }).pubDate).getTime();
      return bT - aT;
    });

    // Strip the pubDate field — type is internal — and cap at 12 items.
    const news: NewsItem[] = all.slice(0, 12).map(({ id, cat, src, time, title, summary, url }) => ({
      id, cat, src, time, title, summary, url,
    }));

    return NextResponse.json({ news, source: 'rss' });
  } catch (err) {
    console.error('[news] fallback to seed:', err);
    return NextResponse.json({ news: SEED_NEWS, source: 'seed' });
  }
}
