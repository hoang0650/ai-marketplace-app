import type { User, UserRole } from '@/api/types';

export function decodeJwt(token: string): {
  exp?: number;
  role?: string;
  email?: string;
  userId?: string;
  sub?: string;
} | null {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    return JSON.parse(json) as { exp?: number; role?: string; email?: string; userId?: string; sub?: string };
  } catch {
    return null;
  }
}

export function tokenUnexpired(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 > Date.now() + 5000;
}

export function stubUserFromToken(token: string): User | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const id = String(payload.userId || payload.sub || '');
  if (!id && !payload.email) return null;
  return {
    id,
    email: String(payload.email || ''),
    name: String(payload.email || 'Member').split('@')[0],
    role: ((payload.role as UserRole) || 'buyer'),
  };
}
