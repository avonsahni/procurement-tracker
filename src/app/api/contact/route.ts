import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sendContactNotification } from '@/lib/email';

export async function POST(req: NextRequest) {
  // Rate limit: 3 submissions per IP per hour
  const ip = getClientIp(req);
  if (!checkRateLimit(`contact:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, email, phone, company, message } = body;

  if (!name?.trim())    return NextResponse.json({ error: 'Name is required' },    { status: 400 });
  if (!email?.trim())   return NextResponse.json({ error: 'Email is required' },   { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Use admin client — table has no public RLS
  const admin = createAdminSupabase();
  const { error } = await admin.from('contact_messages').insert({
    name:    name.trim().slice(0, 200),
    email:   email.trim().toLowerCase().slice(0, 200),
    phone:   phone?.trim().slice(0, 50) || null,
    company: company?.trim().slice(0, 200) || null,
    message: message.trim().slice(0, 5000),
  });

  if (error) {
    console.error('[contact] insert error:', error.message);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }

  // Send email — await so errors are visible in the response for debugging
  try {
    const result = await sendContactNotification({
      name:    name.trim(),
      email:   email.trim(),
      phone:   phone?.trim() || null,
      company: company?.trim() || null,
      message: message.trim(),
    });
    console.log('[contact] email result:', JSON.stringify(result));
  } catch (err: any) {
    console.error('[contact] email error:', err);
    return NextResponse.json({ ok: true, emailError: err?.message ?? String(err) });
  }

  return NextResponse.json({ ok: true });
}
