import { apiClient } from './client';
import { deviceHeaders } from '@/lib/device';
import { ApiError } from '@/lib/errors';

export interface HandoffTarget {
  kind: 'builder' | 'agent';
  id: string;
  title: string;
  path: string;
}

export interface LinkedDevice {
  id: string;
  name: string;
  platform: 'web' | 'ios' | 'android' | 'other';
  linkedVia: 'handoff' | 'session';
  lastActiveAt: string;
  createdAt: string;
  revoked: boolean;
  current: boolean;
}

export interface SyncEvent {
  seq: number;
  type: string;
  data: any;
  at: string;
  self: boolean;
}

const CODE_RE = /handoff\/([A-Za-z0-9-]{8,12})/;

/** Accepts "ABCD-2345", a scanned https://aimarkets.vn/handoff/… or aimarkets://handoff/… URL. */
export function parseHandoffCode(input: string): string {
  let s = String(input || '').trim();
  const m = s.match(CODE_RE);
  if (m) s = m[1];
  s = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? s : '';
}

/** API error envelope is { error: { code, message } }. */
export function handoffError(e: unknown, fallback: string): { code: string; message: string } {
  if (e instanceof ApiError) {
    const env = (e.details?.error || {}) as { code?: string; message?: string };
    return { code: env.code || e.code, message: env.message || fallback };
  }
  return { code: 'UNKNOWN', message: fallback };
}

async function req<T>(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: unknown, timeoutMs?: number) {
  return apiClient.request<T>(endpoint, { method, body, timeoutMs, headers: await deviceHeaders() });
}

export const handoffApi = {
  create: (kind: HandoffTarget['kind'], id: string) =>
    req<{ code: string; expiresAt: string; url: string; deepLink: string; target: HandoffTarget }>('/handoff', 'POST', { kind, id }),
  claim: (code: string) => req<{ ok: boolean; target: HandoffTarget }>('/handoff/claim', 'POST', { code }),
  devices: () => req<{ devices: LinkedDevice[] }>('/handoff/devices'),
  register: () => req<{ cursor: string }>('/handoff/devices', 'POST', {}),
  revoke: (id: string) => req<{ ok: boolean }>(`/handoff/devices/${id}`, 'DELETE'),
  sync: (since: string, wait = 25) =>
    req<{ cursor: string; reset: boolean; events: SyncEvent[] }>(`/handoff/sync?wait=${wait}&since=${encodeURIComponent(since)}`, 'GET', undefined, (wait + 10) * 1000),
};
