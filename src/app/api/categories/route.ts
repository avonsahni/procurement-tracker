import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { CategoryCreateSchema, parseBody } from '@/lib/validation';

export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('categories').select('name').order('name');
  return NextResponse.json((data || []).map(r => r.name));
}

export async function POST(req: NextRequest) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(req, CategoryCreateSchema);
  if (!parsed.ok) return parsed.response;
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('categories')
    .insert({ user_id: auth.id, name: parsed.data.name });
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
