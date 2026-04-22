import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';
import { SEED_OCCASIONS } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

// GET /api/occasions — list user's occasions, sorted by next occurrence
export async function GET() {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ occasions: SEED_OCCASIONS, source: 'seed' });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ occasions: SEED_OCCASIONS, source: 'seed' });

  const { data, error } = await sb
    .from('occasions')
    .select('*')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ occasions: data ?? [], source: 'supabase' });
}

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
    who: String(body.who ?? '').slice(0, 200),
    when_label: String(body.when_label ?? ''),
    when_date: body.when_date ?? null,
    kind: (body.kind ?? 'birthday') as 'birthday' | 'anniv',
  };
  if (!insert.who || !insert.when_date) {
    return NextResponse.json({ error: 'who and when_date required' }, { status: 400 });
  }

  const { data, error } = await sb.from('occasions').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ occasion: data });
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('occasions').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
