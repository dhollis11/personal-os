'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Card, Label } from '@/components/ui';
import { Header, type View } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Agenda } from '@/components/Agenda';
import { Tasks } from '@/components/Tasks';
import { Weather } from '@/components/Weather';
import { Fx } from '@/components/Fx';
import { News } from '@/components/News';
import { Occasions } from '@/components/Occasions';
import { WeekView, MonthView, Quote } from '@/components/CalendarViews';
import {
  SEED_EVENTS, SEED_TASKS, SEED_OCCASIONS, SEED_NEWS, SEED_QUOTE,
} from '@/lib/seed-data';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';
import type { Task, TaskList, Occasion, NewsItem, Quote as QuoteType } from '@/types';

export function Dashboard() {
  const [view, setView] = useState<View>('Day');
  const [now, setNow] = useState(() => new Date());
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>(SEED_OCCASIONS);
  const [news, setNews] = useState<NewsItem[]>(SEED_NEWS);
  const [quote, setQuote] = useState<QuoteType>(SEED_QUOTE);

  // Tick the clock every 15s so the "NOW" marker and greeting stay accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Fetch live news (RSS) and quote on mount — no auth required.
  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => {
        if (d?.news?.length) setNews(d.news);
      })
      .catch(() => {});
    fetch('/api/quote')
      .then((r) => r.json())
      .then((d) => {
        if (d?.quote?.text) setQuote(d.quote);
      })
      .catch(() => {});
  }, []);

  // Auth state + signed-in data fetch
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getBrowserSupabase();
    sb.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load user's data once we know who they are
  useEffect(() => {
    if (!user) return;
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((d) => {
        if (d.tasks && d.source === 'supabase') setTasks(d.tasks);
      })
      .catch(() => {});
    fetch('/api/task-lists')
      .then((r) => r.json())
      .then((d) => {
        if (d.lists && d.source === 'supabase') setLists(d.lists);
      })
      .catch(() => {});
    fetch('/api/occasions')
      .then((r) => r.json())
      .then((d) => {
        if (d.occasions && d.source === 'supabase') setOccasions(d.occasions);
      })
      .catch(() => {});
  }, [user]);

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await getBrowserSupabase().auth.signOut();
    setTasks(SEED_TASKS);
    setLists([]);
    setOccasions(SEED_OCCASIONS);
  }

  const canEdit = !!user;

  return (
    <div className="max-w-[1440px] mx-auto">
      <Header
        view={view}
        onView={setView}
        now={now}
        user={user}
        onSignOut={signOut}
      />

      <div className="p-3 md:p-4 flex flex-col gap-3 md:gap-4">
        {view === 'Day' && (
          <>
            <Hero now={now} events={SEED_EVENTS} />

            {/* Desktop: 3-column grid. Mobile/tablet: stacked. */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1.1fr_1.1fr] gap-3 md:gap-4">
              {/* Column 1: Agenda */}
              <Card className="flex flex-col">
                <Label>Today · Agenda</Label>
                <div className="mt-2.5 flex-1 min-h-0">
                  <Agenda events={SEED_EVENTS} now={now} />
                </div>
              </Card>

              {/* Column 2: Weather, FX, Tasks */}
              <div className="flex flex-col gap-3 md:gap-4">
                <Card><Weather /></Card>
                <Card><Fx /></Card>
                <Card className="flex-1 min-h-0">
                  <Label>Tasks</Label>
                  <div className="mt-2.5">
                    <Tasks
                      tasks={tasks}
                      lists={lists}
                      canEdit={canEdit}
                      onTasksChange={setTasks}
                      onListsChange={setLists}
                    />
                  </div>
                  {!canEdit && (
                    <div className="mt-3 text-[10px] text-inkDim font-mono tracking-label">
                      {isSupabaseConfigured
                        ? 'Sign in to edit tasks →'
                        : 'Demo mode — add Supabase env vars to enable editing'}
                    </div>
                  )}
                </Card>
              </div>

              {/* Column 3: News, Occasions, Quote */}
              <div className="flex flex-col gap-3 md:gap-4">
                <Card>
                  <Label>Feed · Curated</Label>
                  <div className="mt-2.5">
                    <News items={news} limit={5} />
                  </div>
                </Card>
                <Card>
                  <Label>Upcoming</Label>
                  <div className="mt-2.5">
                    <Occasions items={occasions} />
                  </div>
                </Card>
                <Card>
                  <Quote text={quote.text} author={quote.author} />
                </Card>
              </div>
            </div>
          </>
        )}

        {view === 'Week' && (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 md:gap-4">
            <Card>
              <Label>This Week</Label>
              <div className="mt-3">
                <WeekView now={now} events={SEED_EVENTS} />
              </div>
            </Card>
            <div className="flex flex-col gap-3 md:gap-4">
              <Card>
                <Label>Upcoming</Label>
                <div className="mt-2.5">
                  <Occasions items={occasions} />
                </div>
              </Card>
              <Card>
                <Label>Feed</Label>
                <div className="mt-2.5">
                  <News items={news} limit={4} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === 'Month' && (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 md:gap-4">
            <Card>
              <Label>
                {now.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Label>
              <div className="mt-3">
                <MonthView now={now} />
              </div>
            </Card>
            <div className="flex flex-col gap-3 md:gap-4">
              <Card>
                <Label>Birthdays & anniversaries</Label>
                <div className="mt-2.5">
                  <Occasions items={occasions} />
                </div>
              </Card>
              <Card>
                <Quote text={quote.text} author={quote.author} />
              </Card>
              <Card>
                <Label>Feed</Label>
                <div className="mt-2.5">
                  <News items={news} limit={3} />
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
