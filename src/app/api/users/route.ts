import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';

// In the per-user-workspace model, each user only sees themselves.
// POST is disabled — signups happen via /api/auth/signup.
export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json([{
    id: auth.id,
    username: auth.email,
    fullName: auth.fullName,
    role: auth.role,
    canEdit: auth.canEdit,
  }]);
}

export async function POST() {
  return NextResponse.json(
    { error: 'Direct user creation disabled. Use /api/auth/signup.' },
    { status: 501 }
  );
}
