import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { tokenUnexpired } from '@/lib/jwt';
import { playSound } from '@/services/sound';

const POLL_MS = 45_000;

/**
 * Chimes when a new unread notification arrives. Shares the `['notifications']`
 * cache with the notifications screen; the first load only sets the baseline.
 */
export function NotificationSoundWatcher() {
  const token = useAuthStore((s) => s.token);
  const authed = tokenUnexpired(token);
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: authed,
    refetchInterval: authed ? POLL_MS : false,
  });
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    seen.current = null;
  }, [token]);

  useEffect(() => {
    const list = notifications.data;
    if (!list) return;
    if (!seen.current) {
      seen.current = new Set(list.map((n) => n.id));
      return;
    }
    const known = seen.current;
    const fresh = list.filter((n) => !n.read && !known.has(n.id));
    list.forEach((n) => known.add(n.id));
    if (fresh.length) playSound('notification');
  }, [notifications.data]);

  return null;
}
