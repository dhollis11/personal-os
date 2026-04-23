import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';
import { SEED_TASKS } from '@/lib/seed-data';
import { nextOccurrence } from '@/lib/task-utils';
import type { Recurrence, Task } from '@/types';

export const dynamic = 'force-dynamic';

// Fields a client is allowed to patch on a task. Other DB columns (user_id,
// parent_id, created_at) are never writeable via this endpoint.
const EDITABLE_FIELDS = [
  'title',
  'list_id',
  'list_name',
  'due',
  'due_at',
  'priority',
  'done',
  'notes',
  'sort_order',
  'recurrence',
] as const;

// GET /api/tasks — list the current user's tasks
export async function GET() {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ tasks: SEED_TASKS, source: 'seed' });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ tasks: SEED_TASKS, source: 'seed' });
  }

  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [], source: 'supabase' });
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  const title = String(body.title ?? '').slice(0, 500).trim();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const insert = {
    user_id: user.id,
    list_id: body.list_id ?? null,
    list_name: body.list_name ?? 'Inbox',
    title,
    notes: body.notes ?? null,
    due: body.due ?? null,
    due_at: body.due_at ?? null,
    priority: (body.priority ?? 'M') as 'H' | 'M' | 'L',
    done: false,
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    recurrence: body.recurrence ?? null,
  };

  const { data, error } = await sb.from('tasks').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

// PATCH /api/tasks — edit an existing task.
// Special behavior: when toggling a recurring task to done=true, we also create
// the next occurrence in a single atomic response so the client updates once.
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE_FIELDS) {
    if (k in body) patch[k] = body[k];
  }

  // Fetch current state (needed to know recurrence + avoid double-spawn)
  const { data: before, error: fetchErr } = await sb
    .from('tasks')
    .select('*')
    .eq('id', body.id)
    .eq('user_id', user.id)
    .single();
  if (fetchErr || !before) {
    return NextResponse.json({ error: fetchErr?.message ?? 'Not found' }, { status: 404 });
  }

  const { data: updated, error } = await sb
    .from('tasks')
    .update(patch)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recurrence regeneration: if we just flipped a non-done recurring task
  // to done, spawn the next occurrence.
  let spawned: Task | null = null;
  const becameDone = patch.done === true && before.done === false;
  const rule: Recurrence | null = (before.recurrence as Recurrence | null) ?? null;
  if (becameDone && rule) {
    const baseISO = before.due_at || new Date().toISOString().slice(0, 10);
    const nextISO = nextOccurrence(rule, baseISO);
    if (nextISO) {
      const { data: spawn } = await sb
        .from('tasks')
        .insert({
          user_id: user.id,
          list_id: before.list_id,
          list_name: before.list_name,
          title: before.title,
          notes: before.notes,
          due: null,
          due_at: nextISO,
          priority: before.priority,
          done: false,
          sort_order: before.sort_order,
          recurrence: before.recurrence,
          parent_id: before.parent_id ?? before.id,
        })
        .select()
        .single();
      spawned = spawn as Task | null;
    }
  }

  return NextResponse.json({ task: updated, spawned });
}

// DELETE /api/tasks?id=...&mode=single|all_future
//   single     → delete just this one task
//   all_future → delete this + all other instances sharing this parent_id
//                (or, if this IS the parent, delete the parent + all children)
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const mode = req.nextUrl.searchParams.get('mode') ?? 'single';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (mode === 'all_future') {
    // Find the "template" ID — if this task has a parent_id, that's the template.
    const { data: task } = await sb
      .from('tasks')
      .select('id, parent_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    const templateId = task?.parent_id ?? task?.id ?? id;

    // Delete the template AND all descendants (including this one).
    const { error } = await sb
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .or(`id.eq.${templateId},parent_id.eq.${templateId}`);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mode: 'all_future' });
  }

  // Default: single delete
  const { error } = await sb.from('tasks').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mode: 'single' });
}
