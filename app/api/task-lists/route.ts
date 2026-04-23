import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';
import type { ListColor } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_COLORS: ListColor[] = ['green', 'blue', 'amber', 'pink'];

// GET /api/task-lists — list the user's task lists
export async function GET() {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ lists: [], source: 'seed' });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ lists: [], source: 'seed' });

  const { data, error } = await sb
    .from('task_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lists: data ?? [], source: 'supabase' });
}

// POST /api/task-lists — create a new list
export async function POST(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? '').slice(0, 80).trim();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const color: ListColor = VALID_COLORS.includes(body.color) ? body.color : 'green';

  const { data, error } = await sb
    .from('task_lists')
    .insert({
      user_id: user.id,
      name,
      color,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ list: data });
}

// PATCH /api/task-lists — rename or recolor a list
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
  if (typeof body.name === 'string') patch.name = body.name.slice(0, 80).trim();
  if (VALID_COLORS.includes(body.color)) patch.color = body.color;
  if (typeof body.sort_order === 'number') patch.sort_order = body.sort_order;

  const { data, error } = await sb
    .from('task_lists')
    .update(patch)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ list: data });
}

// DELETE /api/task-lists?id=... — delete a list. Tasks inside keep their
// list_name text but lose list_id (set to null by the FK cascade rule).
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('task_lists').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
