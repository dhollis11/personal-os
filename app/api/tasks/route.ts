import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';
import { SEED_TASKS } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

// GET /api/tasks — list the current user's tasks
export async function GET() {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ tasks: SEED_TASKS, source: 'seed' });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    // Unauthenticated visitors get seed data to preview the UI.
    return NextResponse.json({ tasks: SEED_TASKS, source: 'seed' });
  }

  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('done', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
  const insert = {
    user_id: user.id,
    list_name: body.list_name ?? 'Inbox',
    title: String(body.title ?? '').slice(0, 500),
    due: body.due ?? null,
    due_at: body.due_at ?? null,
    priority: (body.priority ?? 'M') as 'H' | 'M' | 'L',
    done: false,
  };
  if (!insert.title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const { data, error } = await sb.from('tasks').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

// PATCH /api/tasks — toggle / edit an existing task
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Whitelist fields users can patch, so clients can't set user_id etc.
  const patch: Record<string, unknown> = {};
  for (const k of ['title', 'list_name', 'due', 'due_at', 'priority', 'done'] as const) {
    if (k in body) patch[k] = body[k];
  }

  const { data, error } = await sb
    .from('tasks')
    .update(patch)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

// DELETE /api/tasks?id=... — remove a task
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('tasks').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
