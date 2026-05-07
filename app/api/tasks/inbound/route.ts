import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/tasks/inbound
//
// Lets external services (HTTP Shortcuts on your phone, Make.com, IFTTT,
// curl, etc.) create tasks in your dashboard without needing a browser
// session. Auth is by bearer token in the Authorization header.
//
// Required env vars on Vercel:
//   INBOUND_TOKEN          — a long random secret you generate
//   INBOUND_USER_ID        — the Supabase user UUID that owns the created tasks
//   SUPABASE_SERVICE_ROLE_KEY — the secret service-role key (NOT the anon key)
//   NEXT_PUBLIC_SUPABASE_URL — already set
//
// Body (JSON):
//   { "title": "review PR", "list_name": "Work", "due_at": "2026-05-08" }
// All fields except `title` are optional.
//
// The list_name can also be embedded in the title with a colon prefix:
//   { "title": "work: review PR" }   →  list "Work", title "review PR"
//
// Plain text bodies are also accepted — useful for tools that can't easily
// build JSON. The body is treated as the title.

export const dynamic = 'force-dynamic';

const VALID_LIST_COLORS = ['green', 'blue', 'amber', 'pink'] as const;

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const expected = process.env.INBOUND_TOKEN;
  const userId = process.env.INBOUND_USER_ID;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!expected || !userId || !serviceKey || !supabaseUrl) {
    // Don't leak which env var is missing — keep the response generic.
    return NextResponse.json({ error: 'Endpoint not configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const presented = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!presented || presented !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body — accept JSON or plain text ───────────────────
  const contentType = req.headers.get('content-type') ?? '';
  let title = '';
  let listName: string | null = null;
  let dueAt: string | null = null;
  let priority: 'H' | 'M' | 'L' = 'M';
  let notes: string | null = null;

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    title = String(body.title ?? '').trim();
    if (typeof body.list_name === 'string' && body.list_name.trim()) {
      listName = body.list_name.trim();
    }
    if (typeof body.due_at === 'string') dueAt = body.due_at;
    if (body.priority === 'H' || body.priority === 'L') priority = body.priority;
    if (typeof body.notes === 'string') notes = body.notes;
  } else {
    title = (await req.text()).trim();
  }

  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  // ── Extract list prefix from title if no explicit list given ─
  // "work: review PR" → list "Work", title "review PR"
  // Accepts dash too: "work - review PR"
  if (!listName) {
    const m = /^([a-z][a-z0-9 _-]{0,40}?)\s*[:\-]\s+(.+)$/i.exec(title);
    if (m) {
      listName = m[1].trim();
      title = m[2].trim();
    }
  }

  if (title.length > 500) title = title.slice(0, 500);

  // ── Create Supabase admin client (bypasses RLS) ──────────────
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Resolve the target list ──────────────────────────────────
  // Try to match an existing list (case-insensitive). If none and a name
  // was provided, create one. Otherwise fall back to "Inbox" (creating it
  // if it doesn't exist).
  let listId: string | null = null;
  let resolvedListName = listName ?? 'Inbox';

  const { data: existingLists, error: listFetchErr } = await sb
    .from('task_lists')
    .select('id, name, color')
    .eq('user_id', userId);

  if (listFetchErr) {
    return NextResponse.json({ error: listFetchErr.message }, { status: 500 });
  }

  const lists = existingLists ?? [];
  const match = lists.find(
    (l) => l.name.trim().toLowerCase() === resolvedListName.trim().toLowerCase(),
  );

  if (match) {
    listId = match.id;
    resolvedListName = match.name; // preserve the user's casing
  } else {
    // Pick a color that's not already used (so a new list looks distinct).
    const usedColors = new Set(lists.map((l) => l.color));
    const colorOrder = VALID_LIST_COLORS as readonly string[];
    const color = colorOrder.find((c) => !usedColors.has(c)) ?? 'green';

    const { data: createdList, error: listCreateErr } = await sb
      .from('task_lists')
      .insert({
        user_id: userId,
        name: resolvedListName,
        color,
        sort_order: lists.length,
      })
      .select()
      .single();

    if (listCreateErr) {
      return NextResponse.json({ error: listCreateErr.message }, { status: 500 });
    }
    listId = createdList.id;
  }

  // ── Create the task ─────────────────────────────────────────
  const { data: task, error: taskErr } = await sb
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: listId,
      list_name: resolvedListName,
      title,
      notes,
      due: null,
      due_at: dueAt,
      priority,
      done: false,
      sort_order: 0,
    })
    .select()
    .single();

  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    task: {
      id: task.id,
      title: task.title,
      list: resolvedListName,
      due_at: task.due_at,
      priority: task.priority,
    },
  });
}

// GET returns a tiny status page so you can verify the endpoint is live by
// just visiting it in a browser. Returns 200 if env vars are configured,
// 503 if not. Never reveals the token.
export async function GET() {
  const configured =
    !!process.env.INBOUND_TOKEN &&
    !!process.env.INBOUND_USER_ID &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  return NextResponse.json(
    { configured, message: configured ? 'POST a task here.' : 'Set env vars.' },
    { status: configured ? 200 : 503 },
  );
}
