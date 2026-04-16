import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token) as any;
  if (!decoded) return null;
  
  const user = db.prepare('SELECT id, username, full_name, role, can_edit FROM users WHERE id = ?').get(decoded.id) as any;
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    canEdit: user.can_edit === 1
  };
}
